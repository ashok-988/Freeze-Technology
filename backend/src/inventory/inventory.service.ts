import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockReceiptDto } from './dto/create-stock-receipt.dto';
import { CreateStockIssueDto } from './dto/create-stock-issue.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: InventoryQueryDto) {
    const { search, category, brand, status, warehouse } = query;

    const where: any = {
      deletedAt: null,
    };

    if (category && category !== 'All') {
      where.OR = [
        { categoryId: category },
        { category: { categoryName: category } },
      ];
    }

    if (brand && brand !== 'All') {
      where.OR = [
        { brandId: brand },
        { brand: { brandName: brand } },
      ];
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { productName: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        inventory: true,
      },
      orderBy: { productName: 'asc' },
    });

    const items = products.map((prod) => {
      const inv = prod.inventory[0];
      const reorderLevel = inv?.minimumStock || 5;
      const currentStock = prod.stockQuantity || 0;
      const unitCost = prod.purchasePrice || 0;
      const stockValue = Number((currentStock * unitCost).toFixed(2));
      const location = inv?.warehouseName || 'Main Warehouse - Thoraipakkam';

      let stockStatus = 'InStock';
      if (currentStock === 0) {
        stockStatus = 'OutOfStock';
      } else if (currentStock <= reorderLevel) {
        stockStatus = 'LowStock';
      }

      return {
        id: prod.id,
        sku: prod.sku,
        productName: prod.productName,
        model: prod.model,
        category: prod.category,
        brand: prod.brand,
        stockQuantity: currentStock,
        reservedStock: inv?.reservedStock || 0,
        reorderLevel,
        unitCost,
        sellingPrice: prod.sellingPrice,
        stockValue,
        status: stockStatus,
        warehouse: location,
        createdAt: prod.createdAt,
      };
    });

    if (status && status !== 'All') {
      return items.filter((i) => i.status.toLowerCase() === status.toLowerCase());
    }

    return items;
  }

  async findById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id }, { sku: id }],
        deletedAt: null,
      },
      include: {
        category: true,
        brand: true,
        inventory: true,
        stockMovements: {
          include: { createdBy: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product / Inventory item "${id}" not found.`);
    }

    const inv = product.inventory[0];
    const reorderLevel = inv?.minimumStock || 5;
    const currentStock = product.stockQuantity || 0;
    const unitCost = product.purchasePrice || 0;
    const stockValue = Number((currentStock * unitCost).toFixed(2));

    let stockStatus = 'InStock';
    if (currentStock === 0) {
      stockStatus = 'OutOfStock';
    } else if (currentStock <= reorderLevel) {
      stockStatus = 'LowStock';
    }

    return {
      id: product.id,
      sku: product.sku,
      productName: product.productName,
      model: product.model,
      serialNumber: product.serialNumber,
      category: product.category,
      brand: product.brand,
      stockQuantity: currentStock,
      reservedStock: inv?.reservedStock || 0,
      reorderLevel,
      unitCost,
      sellingPrice: product.sellingPrice,
      taxRate: product.taxRate,
      stockValue,
      status: stockStatus,
      warehouse: inv?.warehouseName || 'Main Warehouse - Thoraipakkam',
      stockMovements: product.stockMovements,
    };
  }

  async getStats() {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: { inventory: true },
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const movementsThisMonth = await this.prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: firstDayOfMonth },
      },
    });

    let totalUnits = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const qty = p.stockQuantity || 0;
      const cost = p.purchasePrice || 0;
      const minStock = p.inventory[0]?.minimumStock || 5;

      totalUnits += qty;
      totalStockValue += qty * cost;

      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= minStock) {
        lowStockCount++;
      }
    }

    const receivedThisMonth = movementsThisMonth
      .filter((m) => m.movementType === 'IN')
      .reduce((sum, m) => sum + m.quantity, 0);

    const issuedThisMonth = movementsThisMonth
      .filter((m) => m.movementType === 'OUT')
      .reduce((sum, m) => sum + m.quantity, 0);

    return {
      totalSKUs: products.length,
      totalUnits,
      lowStockItems: lowStockCount,
      outOfStockItems: outOfStockCount,
      stockValue: Number(totalStockValue.toFixed(2)),
      stockReceivedThisMonth: receivedThisMonth,
      stockIssuedThisMonth: issuedThisMonth,
    };
  }

  async getTransactions(query?: { productId?: string; search?: string; type?: string }) {
    const where: any = {};

    if (query?.productId) {
      where.productId = query.productId;
    }

    if (query?.type && query.type !== 'All') {
      where.movementType = query.type;
    }

    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { remarks: { contains: q, mode: 'insensitive' } },
        { referenceId: { contains: q, mode: 'insensitive' } },
        { referenceType: { contains: q, mode: 'insensitive' } },
        { product: { productName: { contains: q, mode: 'insensitive' } } },
        { product: { sku: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return await this.prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          include: { category: true, brand: true },
        },
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createReceipt(dto: CreateStockReceiptDto, userId?: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: dto.productId }, { sku: dto.productId }],
        deletedAt: null,
      },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" not found.`);
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException('Receipt quantity must be greater than 0.');
    }

    const effectiveUserId = await this.resolveUserId(userId);
    const warehouseName = dto.warehouseName || product.inventory[0]?.warehouseName || 'Main Warehouse - Thoraipakkam';

    return await this.prisma.$transaction(
      async (tx) => {
        const previousQuantity = product.stockQuantity;
        const resultingQuantity = previousQuantity + dto.quantity;
        const unitCost = dto.unitCost || product.purchasePrice;

        // 1. Update Product stockQuantity
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: resultingQuantity,
            purchasePrice: dto.unitCost ? dto.unitCost : product.purchasePrice,
          },
          include: { category: true, brand: true },
        });

        // 2. Update or Create Inventory record
        if (product.inventory.length > 0) {
          await tx.inventory.update({
            where: { id: product.inventory[0].id },
            data: {
              availableStock: resultingQuantity,
              warehouseName,
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: product.id,
              warehouseName,
              availableStock: resultingQuantity,
              reservedStock: 0,
              minimumStock: 5,
            },
          });
        }

        // 3. Create StockMovement record
        const movement = await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: 'IN',
            referenceType: dto.reference ? 'Purchase' : 'Receipt',
            referenceId: dto.reference || null,
            quantity: dto.quantity,
            previousQuantity,
            resultingQuantity,
            unitCost,
            remarks: dto.notes ? dto.notes.trim() : `Stock receipt of ${dto.quantity} units`,
            createdById: effectiveUserId,
          },
          include: { product: true, createdBy: true },
        });

        // 4. Record Audit Log
        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Inventory',
                action: 'STOCK_RECEIPT',
                recordId: movement.id,
              },
            });
          } catch {}
        }

        return {
          product: updatedProduct,
          movement,
          previousQuantity,
          resultingQuantity,
        };
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async createIssue(dto: CreateStockIssueDto, userId?: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: dto.productId }, { sku: dto.productId }],
        deletedAt: null,
      },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" not found.`);
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException('Issue quantity must be greater than 0.');
    }

    if (product.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock for "${product.productName}". Available: ${product.stockQuantity}, Requested: ${dto.quantity}.`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const previousQuantity = product.stockQuantity;
        const resultingQuantity = previousQuantity - dto.quantity;

        // 1. Update Product stockQuantity
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: resultingQuantity,
          },
          include: { category: true, brand: true },
        });

        // 2. Update Inventory record
        if (product.inventory.length > 0) {
          await tx.inventory.update({
            where: { id: product.inventory[0].id },
            data: {
              availableStock: resultingQuantity,
            },
          });
        }

        // 3. Create StockMovement record
        const movement = await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: 'OUT',
            referenceType: dto.reason || 'Issue',
            referenceId: dto.reference || null,
            quantity: dto.quantity,
            previousQuantity,
            resultingQuantity,
            unitCost: product.purchasePrice,
            remarks: dto.notes ? dto.notes.trim() : `Stock issue of ${dto.quantity} units for ${dto.reason}`,
            createdById: effectiveUserId,
          },
          include: { product: true, createdBy: true },
        });

        // 4. Record Audit Log
        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Inventory',
                action: 'STOCK_ISSUE',
                recordId: movement.id,
              },
            });
          } catch {}
        }

        return {
          product: updatedProduct,
          movement,
          previousQuantity,
          resultingQuantity,
        };
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async createAdjustment(dto: CreateStockAdjustmentDto, userId?: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: dto.productId }, { sku: dto.productId }],
        deletedAt: null,
      },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" not found.`);
    }

    if (dto.newQuantity < 0) {
      throw new BadRequestException('Stock quantity cannot be adjusted to a negative value.');
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const previousQuantity = product.stockQuantity;
        const resultingQuantity = dto.newQuantity;
        const diff = resultingQuantity - previousQuantity;
        const movementType = diff >= 0 ? 'IN' : 'OUT';

        // 1. Update Product stockQuantity
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: resultingQuantity,
          },
          include: { category: true, brand: true },
        });

        // 2. Update Inventory record
        if (product.inventory.length > 0) {
          await tx.inventory.update({
            where: { id: product.inventory[0].id },
            data: {
              availableStock: resultingQuantity,
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: product.id,
              warehouseName: 'Main Warehouse - Thoraipakkam',
              availableStock: resultingQuantity,
              reservedStock: 0,
              minimumStock: 5,
            },
          });
        }

        // 3. Create StockMovement record
        const movement = await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: 'ADJUSTMENT',
            referenceType: 'Adjustment',
            referenceId: dto.reference || null,
            quantity: Math.abs(diff),
            previousQuantity,
            resultingQuantity,
            unitCost: product.purchasePrice,
            remarks: `Stock adjustment: ${dto.reason}${dto.notes ? ' - ' + dto.notes.trim() : ''}`,
            createdById: effectiveUserId,
          },
          include: { product: true, createdBy: true },
        });

        // 4. Record Audit Log
        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Inventory',
                action: 'STOCK_ADJUSTMENT',
                recordId: movement.id,
              },
            });
          } catch {}
        }

        return {
          product: updatedProduct,
          movement,
          previousQuantity,
          resultingQuantity,
          diff,
        };
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async createTransfer(dto: CreateStockTransferDto, userId?: string) {
    if (dto.fromWarehouse === dto.toWarehouse) {
      throw new BadRequestException('Source and destination warehouses cannot be the same.');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: dto.productId }, { sku: dto.productId }],
        deletedAt: null,
      },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" not found.`);
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException('Transfer quantity must be greater than 0.');
    }

    if (product.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock for transfer. Available: ${product.stockQuantity}, Requested: ${dto.quantity}.`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(
      async (tx) => {
        const movement = await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: 'TRANSFER',
            referenceType: 'Transfer',
            referenceId: dto.reference || null,
            quantity: dto.quantity,
            previousQuantity: product.stockQuantity,
            resultingQuantity: product.stockQuantity,
            unitCost: product.purchasePrice,
            remarks: `Transferred ${dto.quantity} units from "${dto.fromWarehouse}" to "${dto.toWarehouse}"${
              dto.notes ? ' - ' + dto.notes.trim() : ''
            }`,
            createdById: effectiveUserId,
          },
          include: { product: true, createdBy: true },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Inventory',
                action: 'STOCK_TRANSFER',
                recordId: movement.id,
              },
            });
          } catch {}
        }

        return {
          success: true,
          message: `Stock transfer of ${dto.quantity} units from ${dto.fromWarehouse} to ${dto.toWarehouse} recorded.`,
          movement,
        };
      },
      { timeout: 20000, maxWait: 10000 },
    );
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
