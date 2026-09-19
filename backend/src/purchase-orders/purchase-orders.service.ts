import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceiveStockPoDto } from './dto/receive-stock-po.dto';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PurchaseOrderQueryDto) {
    const { search, supplierId, status } = query;

    const where: any = {};

    if (supplierId && supplierId !== 'All') {
      where.supplierId = supplierId;
    }

    if (status && status !== 'All') {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { poNumber: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { supplier: { companyName: { contains: q, mode: 'insensitive' } } },
        { supplier: { supplierCode: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return await this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            product: {
              include: { category: true, brand: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: {
        OR: [{ id }, { poNumber: id }],
      },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            product: {
              include: { category: true, brand: true },
            },
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order "${id}" not found.`);
    }

    return po;
  }

  async getStats() {
    const pos = await this.prisma.purchaseOrder.findMany({
      include: { items: true },
    });

    const totalPOs = pos.length;
    let draftPOs = 0;
    let submittedPOs = 0;
    let approvedPOs = 0;
    let partiallyReceivedPOs = 0;
    let receivedPOs = 0;
    let cancelledPOs = 0;
    let totalSpend = 0;

    for (const po of pos) {
      if (po.status === 'Draft') draftPOs++;
      else if (po.status === 'Submitted') submittedPOs++;
      else if (po.status === 'Approved') approvedPOs++;
      else if (po.status === 'Partially Received') partiallyReceivedPOs++;
      else if (po.status === 'Received') receivedPOs++;
      else if (po.status === 'Cancelled') cancelledPOs++;

      if (po.status !== 'Cancelled') {
        totalSpend += po.totalAmount || 0;
      }
    }

    return {
      totalPOs,
      draftPOs,
      submittedPOs,
      approvedPOs,
      partiallyReceivedPOs,
      receivedPOs,
      cancelledPOs,
      totalSpend: Number(totalSpend.toFixed(2)),
    };
  }

  async create(dto: CreatePurchaseOrderDto, userId?: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, deletedAt: null },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier "${dto.supplierId}" not found or inactive.`);
    }

    const effectiveUserId = await this.resolveUserId(userId);

    // Verify all products exist
    for (const item of dto.items) {
      const prod = await this.prisma.product.findFirst({
        where: { id: item.productId, deletedAt: null },
      });
      if (!prod) {
        throw new NotFoundException(`Product "${item.productId}" not found.`);
      }
    }

    return await this.prisma.$transaction(
      async (tx) => {
        const poNumber = await this.generatePoNumber(tx);

        let subtotal = 0;
        let gstAmount = 0;

        const preparedItems: any[] = [];

        for (const item of dto.items) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          const lineSubtotal = item.quantity * item.unitPrice;
          const taxRate = prod?.taxRate || 18;
          const lineTax = item.taxAmount !== undefined
            ? item.taxAmount
            : Number(((lineSubtotal * taxRate) / 100).toFixed(2));
          const lineTotal = lineSubtotal + lineTax;

          subtotal += lineSubtotal;
          gstAmount += lineTax;

          preparedItems.push({
            productId: item.productId,
            quantity: item.quantity,
            receivedQuantity: 0,
            unitPrice: item.unitPrice,
            taxAmount: lineTax,
            total: lineTotal,
          });
        }

        const totalAmount = Number((subtotal + gstAmount).toFixed(2));

        const po = await tx.purchaseOrder.create({
          data: {
            poNumber,
            supplierId: dto.supplierId,
            purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : new Date(),
            expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
            subtotal: Number(subtotal.toFixed(2)),
            gstAmount: Number(gstAmount.toFixed(2)),
            totalAmount,
            status: 'Draft',
            paymentStatus: 'Pending',
            notes: dto.notes ? dto.notes.trim() : null,
            createdById: effectiveUserId,
            items: {
              create: preparedItems,
            },
          },
          include: {
            supplier: true,
            items: { include: { product: true } },
            createdBy: { select: { id: true, fullName: true, email: true } },
          },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'PurchaseOrders',
                action: 'CREATE',
                recordId: po.id,
              },
            });
          } catch {}
        }

        return po;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, userId?: string) {
    const po = await this.findById(id);

    if (po.status !== 'Draft') {
      throw new BadRequestException(
        `Only Draft purchase orders can be edited. Current status is "${po.status}".`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        let updateData: any = {
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : po.notes,
          paymentStatus: dto.paymentStatus || po.paymentStatus,
        };

        if (dto.supplierId) {
          const supplier = await tx.supplier.findFirst({
            where: { id: dto.supplierId, deletedAt: null },
          });
          if (!supplier) throw new NotFoundException(`Supplier "${dto.supplierId}" not found.`);
          updateData.supplierId = dto.supplierId;
        }

        if (dto.purchaseDate) {
          updateData.purchaseDate = new Date(dto.purchaseDate);
        }
        if (dto.expectedDeliveryDate) {
          updateData.expectedDeliveryDate = new Date(dto.expectedDeliveryDate);
        }

        if (dto.items && dto.items.length > 0) {
          // Delete existing items and recreate
          await tx.purchaseItem.deleteMany({
            where: { purchaseOrderId: po.id },
          });

          let subtotal = 0;
          let gstAmount = 0;
          const preparedItems: any[] = [];

          for (const item of dto.items) {
            const prod = await tx.product.findUnique({ where: { id: item.productId } });
            const lineSubtotal = item.quantity * item.unitPrice;
            const taxRate = prod?.taxRate || 18;
            const lineTax = item.taxAmount !== undefined
              ? item.taxAmount
              : Number(((lineSubtotal * taxRate) / 100).toFixed(2));
            const lineTotal = lineSubtotal + lineTax;

            subtotal += lineSubtotal;
            gstAmount += lineTax;

            preparedItems.push({
              productId: item.productId,
              quantity: item.quantity,
              receivedQuantity: 0,
              unitPrice: item.unitPrice,
              taxAmount: lineTax,
              total: lineTotal,
            });
          }

          updateData.subtotal = Number(subtotal.toFixed(2));
          updateData.gstAmount = Number(gstAmount.toFixed(2));
          updateData.totalAmount = Number((subtotal + gstAmount).toFixed(2));
          updateData.items = { create: preparedItems };
        }

        const updated = await tx.purchaseOrder.update({
          where: { id: po.id },
          data: updateData,
          include: {
            supplier: true,
            items: { include: { product: true } },
            createdBy: { select: { id: true, fullName: true, email: true } },
          },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'PurchaseOrders',
                action: 'UPDATE',
                recordId: updated.id,
              },
            });
          } catch {}
        }

        return updated;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async submit(id: string, userId?: string) {
    const po = await this.findById(id);

    if (po.status !== 'Draft') {
      throw new BadRequestException(
        `Only Draft purchase orders can be submitted. Current status is "${po.status}".`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'Submitted' },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    if (effectiveUserId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: effectiveUserId,
            moduleName: 'PurchaseOrders',
            action: 'SUBMIT_FOR_APPROVAL',
            recordId: po.id,
          },
        });
      } catch {}
    }

    return updated;
  }

  async approve(id: string, userId?: string) {
    const po = await this.findById(id);

    if (po.status !== 'Submitted' && po.status !== 'Draft') {
      throw new BadRequestException(
        `Only Submitted or Draft purchase orders can be approved. Current status is "${po.status}".`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'Approved' },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    if (effectiveUserId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: effectiveUserId,
            moduleName: 'PurchaseOrders',
            action: 'APPROVE',
            recordId: po.id,
          },
        });
      } catch {}
    }

    return updated;
  }

  async receiveStock(id: string, dto: ReceiveStockPoDto, userId?: string) {
    const po = await this.findById(id);

    if (po.status !== 'Approved' && po.status !== 'Partially Received') {
      throw new BadRequestException(
        `Cannot receive stock for purchase order with status "${po.status}". Must be "Approved" or "Partially Received".`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);
    const warehouse = dto.warehouseName || 'Main Warehouse - Thoraipakkam';

    return await this.prisma.$transaction(
      async (tx) => {
        const itemMap = new Map(po.items.map((i) => [i.id, i]));

        // Validate each item
        for (const rItem of dto.items) {
          const poItem = itemMap.get(rItem.purchaseItemId);
          if (!poItem) {
            throw new NotFoundException(
              `Purchase Item "${rItem.purchaseItemId}" does not belong to Purchase Order "${po.poNumber}".`,
            );
          }

          const remaining = poItem.quantity - poItem.receivedQuantity;
          if (rItem.receivedQuantity > remaining) {
            throw new BadRequestException(
              `Cannot receive ${rItem.receivedQuantity} units for product "${poItem.product.productName}". Remaining quantity to receive is ${remaining}.`,
            );
          }
          if (rItem.receivedQuantity <= 0) {
            throw new BadRequestException(`Received quantity must be at least 1 unit.`);
          }
        }

        // Process receiving
        for (const rItem of dto.items) {
          const poItem = itemMap.get(rItem.purchaseItemId)!;
          const newReceivedQty = poItem.receivedQuantity + rItem.receivedQuantity;

          // 1. Update PurchaseItem.receivedQuantity
          await tx.purchaseItem.update({
            where: { id: poItem.id },
            data: { receivedQuantity: newReceivedQty },
          });

          // 2. Fetch Product & calculate stock transition
          const product = await tx.product.findUnique({
            where: { id: poItem.productId },
            include: { inventory: true },
          });

          if (!product) {
            throw new NotFoundException(`Product "${poItem.productId}" not found.`);
          }

          const previousQuantity = product.stockQuantity;
          const resultingQuantity = previousQuantity + rItem.receivedQuantity;

          // 3. Atomically update Product.stockQuantity
          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: resultingQuantity },
          });

          // 4. Update or create Inventory record
          if (product.inventory.length > 0) {
            await tx.inventory.update({
              where: { id: product.inventory[0].id },
              data: { availableStock: resultingQuantity },
            });
          } else {
            await tx.inventory.create({
              data: {
                productId: product.id,
                warehouseName: warehouse,
                availableStock: resultingQuantity,
                reservedStock: 0,
                minimumStock: 5,
              },
            });
          }

          // 5. Create auditable StockMovement record
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              movementType: 'IN',
              referenceType: 'Purchase',
              referenceId: po.poNumber,
              quantity: rItem.receivedQuantity,
              previousQuantity,
              resultingQuantity,
              unitCost: poItem.unitPrice,
              remarks: `Inward stock received against ${po.poNumber} (${po.supplier.companyName})${
                dto.notes ? ' - ' + dto.notes.trim() : ''
              }`,
              createdById: effectiveUserId,
            },
          });
        }

        // 6. Check overall fulfillment across all items in PO
        const allItems = await tx.purchaseItem.findMany({
          where: { purchaseOrderId: po.id },
        });

        const allFulfilled = allItems.every((item) => item.receivedQuantity >= item.quantity);
        const anyReceived = allItems.some((item) => item.receivedQuantity > 0);

        let newStatus = po.status;
        if (allFulfilled) {
          newStatus = 'Received';
        } else if (anyReceived) {
          newStatus = 'Partially Received';
        }

        const updatedPo = await tx.purchaseOrder.update({
          where: { id: po.id },
          data: {
            status: newStatus,
            receivedDate: allFulfilled ? new Date() : po.receivedDate,
          },
          include: {
            supplier: true,
            items: {
              include: {
                product: { include: { category: true, brand: true } },
              },
            },
          },
        });

        // 7. Audit Log
        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'PurchaseOrders',
                action: 'RECEIVE_STOCK',
                recordId: po.id,
              },
            });
          } catch {}
        }

        return {
          success: true,
          message: `Stock intake processed for ${po.poNumber}. Status: ${newStatus}`,
          purchaseOrder: updatedPo,
        };
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async cancel(id: string, userId?: string) {
    const po = await this.findById(id);

    if (po.status === 'Received' || po.status === 'Partially Received') {
      throw new BadRequestException(
        `Cannot cancel purchase order "${po.poNumber}" because stock has already been received.`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'Cancelled' },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    if (effectiveUserId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: effectiveUserId,
            moduleName: 'PurchaseOrders',
            action: 'CANCEL',
            recordId: po.id,
          },
        });
      } catch {}
    }

    return updated;
  }

  private async generatePoNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const last = await tx.purchaseOrder.findFirst({
      where: { poNumber: { startsWith: `PO-${year}-` } },
      orderBy: { poNumber: 'desc' },
      select: { poNumber: true },
    });
    if (!last || !last.poNumber) return `PO-${year}-0001`;
    const parts = last.poNumber.split('-');
    const seq = parseInt(parts[2] || '0', 10) + 1;
    return `PO-${year}-${String(seq).padStart(4, '0')}`;
  }

  private async resolveUserId(userId?: string): Promise<string> {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) return user.id;
    }
    const admin = await this.prisma.user.findFirst({ where: { status: 'ACTIVE' } });
    return admin?.id || 'usr-admin-01';
  }
}
