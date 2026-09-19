import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationQueryDto } from './dto/quotation-query.dto';

@Injectable()
export class QuotationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: QuotationQueryDto) {
    const search = query?.search?.trim();
    const status = query?.status?.trim();
    const customerId = query?.customerId?.trim();

    const whereClause: any = {
      deletedAt: null,
    };

    if (status && status !== 'All') {
      if (status === 'Converted') {
        whereClause.invoice = { isNot: null };
      } else {
        whereClause.status = status;
      }
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (search) {
      whereClause.OR = [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { customer: { customerName: { contains: search, mode: 'insensitive' } } },
        { customer: { customerCode: { contains: search, mode: 'insensitive' } } },
        { customer: { mobile: { contains: search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return await this.prisma.quotation.findMany({
      where: whereClause,
      include: {
        customer: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            paymentStatus: true,
            grandTotal: true,
          },
        },
      },
      orderBy: { quotationDate: 'desc' },
    });
  }

  async findById(id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        OR: [{ id }, { quotationNumber: id }],
        deletedAt: null,
      },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
        invoice: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with identifier "${id}" was not found.`);
    }

    return quotation;
  }

  async create(dto: CreateQuotationDto, userId?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Quotation must contain at least one item.');
    }

    // 1. Verify Customer exists and is active
    const customer = await this.prisma.customer.findFirst({
      where: {
        OR: [{ id: dto.customerId }, { customerCode: dto.customerId }],
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${dto.customerId}" not found or inactive.`);
    }

    // 2. Resolve default createdBy User if not supplied
    const effectiveUserId = await this.resolveUserId(userId);

    // 3. Validate products and calculate authoritative financials
    const processedItems: {
      productId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      taxAmount: number;
      total: number;
    }[] = [];

    let subtotal = 0;
    let totalTax = 0;

    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: {
          OR: [{ id: item.productId }, { sku: item.productId }],
          deletedAt: null,
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID "${item.productId}" not found or inactive.`);
      }

      const unitPrice =
        item.unitPrice !== undefined && item.unitPrice >= 0
          ? Number(item.unitPrice)
          : Number(product.sellingPrice);

      const qty = Number(item.quantity);
      if (qty <= 0) {
        throw new BadRequestException(`Quantity for product "${product.productName}" must be at least 1.`);
      }

      const itemDiscount = item.discount ? Number(item.discount) : 0;
      const lineSubtotal = Math.max(0, qty * unitPrice - itemDiscount);
      const taxRate = Number(product.taxRate || 18.0);
      const lineTax = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
      const lineTotal = Number((lineSubtotal + lineTax).toFixed(2));

      subtotal += qty * unitPrice;
      totalTax += lineTax;

      processedItems.push({
        productId: product.id,
        quantity: qty,
        unitPrice,
        discount: itemDiscount,
        taxAmount: lineTax,
        total: lineTotal,
      });
    }

    const quotationDiscount = dto.discount ? Number(dto.discount) : 0;
    const roundedSubtotal = Number(subtotal.toFixed(2));
    const roundedTax = Number(totalTax.toFixed(2));
    const grandTotal = Number(
      Math.max(0, roundedSubtotal - quotationDiscount + roundedTax).toFixed(2),
    );

    // 4. Generate Quotation Number
    const quotationNumber = await this.generateQuotationNumber();

    // 5. Expiry Date (default 30 days ahead)
    const quotationDate = new Date();
    const expiryDate = dto.expiryDate
      ? new Date(dto.expiryDate)
      : new Date(quotationDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 6. Transactional Creation
    return await this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: customer.id,
          quotationDate,
          expiryDate,
          subtotal: roundedSubtotal,
          discount: quotationDiscount,
          gstAmount: roundedTax,
          grandTotal,
          status: dto.status || 'Draft',
          createdById: effectiveUserId,
          items: {
            create: processedItems.map((pi) => ({
              productId: pi.productId,
              quantity: pi.quantity,
              unitPrice: pi.unitPrice,
              discount: pi.discount,
              taxAmount: pi.taxAmount,
              total: pi.total,
            })),
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      return quotation;
    });
  }

  async update(id: string, dto: UpdateQuotationDto) {
    const existing = await this.prisma.quotation.findFirst({
      where: {
        OR: [{ id }, { quotationNumber: id }],
        deletedAt: null,
      },
      include: {
        invoice: true,
        items: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Quotation with identifier "${id}" was not found.`);
    }

    // Protect historical billing data if quotation is already converted
    if (existing.invoice && dto.items) {
      throw new BadRequestException(
        `Cannot modify items on a quotation that has already been converted to invoice ${existing.invoice.invoiceNumber}.`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      let subtotal = existing.subtotal;
      let gstAmount = existing.gstAmount;
      let discount = dto.discount !== undefined ? Number(dto.discount) : existing.discount;

      // Recalculate if items changed
      if (dto.items && dto.items.length > 0) {
        // Delete previous items
        await tx.quotationItem.deleteMany({
          where: { quotationId: existing.id },
        });

        subtotal = 0;
        gstAmount = 0;

        for (const item of dto.items) {
          const product = await tx.product.findFirst({
            where: {
              OR: [{ id: item.productId }, { sku: item.productId }],
              deletedAt: null,
            },
          });

          if (!product) {
            throw new NotFoundException(`Product "${item.productId}" not found.`);
          }

          const unitPrice =
            item.unitPrice !== undefined && item.unitPrice >= 0
              ? Number(item.unitPrice)
              : Number(product.sellingPrice);

          const qty = Number(item.quantity);
          const itemDiscount = item.discount ? Number(item.discount) : 0;
          const lineSubtotal = Math.max(0, qty * unitPrice - itemDiscount);
          const taxRate = Number(product.taxRate || 18.0);
          const lineTax = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
          const lineTotal = Number((lineSubtotal + lineTax).toFixed(2));

          subtotal += qty * unitPrice;
          gstAmount += lineTax;

          await tx.quotationItem.create({
            data: {
              quotationId: existing.id,
              productId: product.id,
              quantity: qty,
              unitPrice,
              discount: itemDiscount,
              taxAmount: lineTax,
              total: lineTotal,
            },
          });
        }
      }

      const grandTotal = Number(
        Math.max(0, subtotal - discount + gstAmount).toFixed(2),
      );

      const updated = await tx.quotation.update({
        where: { id: existing.id },
        data: {
          customerId: dto.customerId || existing.customerId,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : existing.expiryDate,
          discount,
          subtotal: Number(subtotal.toFixed(2)),
          gstAmount: Number(gstAmount.toFixed(2)),
          grandTotal,
          status: dto.status || existing.status,
        },
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
          invoice: true,
        },
      });

      return updated;
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.quotation.findFirst({
      where: {
        OR: [{ id }, { quotationNumber: id }],
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Quotation with identifier "${id}" was not found.`);
    }

    await this.prisma.quotation.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: `Quotation ${existing.quotationNumber} soft-deleted successfully.`,
    };
  }

  async convertToInvoice(id: string, userId?: string) {
    // 1. Fetch Quotation with relations
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        OR: [{ id }, { quotationNumber: id }],
        deletedAt: null,
      },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        invoice: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with identifier "${id}" was not found.`);
    }

    // 2. Strict Duplicate Protection Check
    if (quotation.invoice) {
      throw new ConflictException(
        `Quotation ${quotation.quotationNumber} has already been converted to Invoice ${quotation.invoice.invoiceNumber}.`,
      );
    }

    // Verify existing invoice by quotationId
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { quotationId: quotation.id },
    });

    if (existingInvoice) {
      throw new ConflictException(
        `Quotation ${quotation.quotationNumber} is already linked to Invoice ${existingInvoice.invoiceNumber}.`,
      );
    }

    const effectiveUserId = await this.resolveUserId(userId || quotation.createdById);

    // 3. Generate sequential Invoice Number matching Freeze Technology format
    const invoiceNumber = await this.generateInvoiceNumber();

    // 4. Atomic Transaction: Create Invoice + Invoice Items + Update Quotation Status
    return await this.prisma.$transaction(async (tx) => {
      // Re-verify inside transaction for concurrency safety
      const checkInside = await tx.invoice.findUnique({
        where: { quotationId: quotation.id },
      });
      if (checkInside) {
        throw new ConflictException(
          `Quotation ${quotation.quotationNumber} has just been converted by a concurrent request.`,
        );
      }

      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          quotationId: quotation.id,
          customerId: quotation.customerId,
          invoiceDate: new Date(),
          subtotal: quotation.subtotal,
          discount: quotation.discount,
          gstAmount: quotation.gstAmount,
          grandTotal: quotation.grandTotal,
          paymentStatus: 'Pending',
          paymentMethod: 'Bank Transfer',
          createdById: effectiveUserId,
          items: {
            create: quotation.items.map((qi) => ({
              productId: qi.productId,
              description: qi.product.productName,
              quantity: qi.quantity,
              sellingPrice: qi.unitPrice,
              taxAmount: qi.taxAmount,
              total: qi.total,
            })),
          },
        },
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
          quotation: true,
        },
      });

      // Update quotation status to Approved
      await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          status: 'Approved',
        },
      });

      return createdInvoice;
    });
  }

  async getStats() {
    const all = await this.prisma.quotation.findMany({
      where: { deletedAt: null },
      include: { invoice: true },
    });

    const total = all.length;
    const draft = all.filter((q) => q.status === 'Draft').length;
    const sent = all.filter((q) => q.status === 'Sent').length;
    const approved = all.filter((q) => q.status === 'Approved').length;
    const rejected = all.filter((q) => q.status === 'Rejected').length;
    const converted = all.filter((q) => !!q.invoice).length;
    const totalPipelineValue = all.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    return {
      total,
      draft,
      sent,
      approved,
      rejected,
      converted,
      totalPipelineValue,
    };
  }

  private async generateQuotationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.quotation.count();
    const nextSeq = (count + 1).toString().padStart(4, '0');
    return `QT-${year}-${nextSeq}`;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count();
    const nextSeq = (count + 1).toString().padStart(4, '0');
    return `FT/${year}/${nextSeq}`;
  }

  private async resolveUserId(userId?: string): Promise<string> {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) return user.id;
    }

    const defaultAdmin = await this.prisma.user.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (defaultAdmin) return defaultAdmin.id;

    throw new BadRequestException('No active system user available to associate with this record.');
  }
}
