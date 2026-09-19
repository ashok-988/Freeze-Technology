import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: PaymentQueryDto) {
    const search = query?.search?.trim();
    const invoiceId = query?.invoiceId?.trim();
    const customerId = query?.customerId?.trim();
    const paymentMethod = query?.paymentMethod?.trim();
    const status = query?.status?.trim();

    const whereClause: any = {};

    if (invoiceId) {
      whereClause.invoiceId = invoiceId;
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (paymentMethod && paymentMethod !== 'All') {
      whereClause.paymentMethod = paymentMethod;
    }

    if (status && status !== 'All') {
      whereClause.invoice = { paymentStatus: status };
    }

    if (search) {
      whereClause.OR = [
        { paymentReference: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
        { invoice: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
        { customer: { customerName: { contains: search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { customerCode: { contains: search, mode: 'insensitive' } } },
        { customer: { mobile: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return await this.prisma.payment.findMany({
      where: whereClause,
      include: {
        customer: true,
        invoice: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: {
          include: {
            items: true,
            payments: {
              orderBy: { paymentDate: 'desc' },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" was not found.`);
    }

    return payment;
  }

  async create(dto: CreatePaymentDto, userId?: string) {
    const amount = Number(dto.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0.');
    }

    // 1. Verify target invoice exists and is active
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        OR: [{ id: dto.invoiceId }, { invoiceNumber: dto.invoiceId }],
        deletedAt: null,
      },
      include: {
        payments: true,
        customer: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with identifier "${dto.invoiceId}" not found or inactive.`);
    }

    const effectiveUserId = await this.resolveUserId(userId || invoice.createdById);

    // 2. Transactional payment creation and authoritative invoice balance update
    return await this.prisma.$transaction(async (tx) => {
      // Re-load invoice with lock/latest payments inside transaction
      const currentInvoice = await tx.invoice.findUnique({
        where: { id: invoice.id },
        include: { payments: true },
      });

      if (!currentInvoice) {
        throw new NotFoundException(`Invoice "${dto.invoiceId}" not found.`);
      }

      const totalPaidAlready = currentInvoice.payments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0,
      );
      const outstandingBalance = Number(
        Math.max(0, currentInvoice.grandTotal - totalPaidAlready).toFixed(2),
      );

      // Overpayment guard
      if (amount > outstandingBalance + 0.01) {
        throw new BadRequestException(
          `Payment amount ₹${amount.toLocaleString('en-IN')} exceeds the outstanding balance of ₹${outstandingBalance.toLocaleString('en-IN')} for invoice ${currentInvoice.invoiceNumber}.`,
        );
      }

      // Create Payment Record
      const createdPayment = await tx.payment.create({
        data: {
          invoiceId: currentInvoice.id,
          customerId: currentInvoice.customerId,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference?.trim() || null,
          amount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          remarks: dto.remarks?.trim() || null,
        },
        include: {
          customer: true,
          invoice: true,
        },
      });

      // Recalculate resulting status
      const newTotalPaid = Number((totalPaidAlready + amount).toFixed(2));
      let newPaymentStatus = 'Pending';
      if (newTotalPaid >= currentInvoice.grandTotal - 0.01) {
        newPaymentStatus = 'Paid';
      } else if (newTotalPaid > 0) {
        newPaymentStatus = 'Partial';
      }

      // Update invoice status atomically
      await tx.invoice.update({
        where: { id: currentInvoice.id },
        data: {
          paymentStatus: newPaymentStatus,
          paymentMethod: dto.paymentMethod,
        },
      });

      // Audit Log
      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payments',
              action: 'CREATE',
              recordId: createdPayment.id,
            },
          });
        } catch {}
      }

      return createdPayment;
    });
  }

  async update(id: string, dto: UpdatePaymentDto, userId?: string) {
    const existing = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: { payments: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Payment with ID "${id}" was not found.`);
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(async (tx) => {
      let newAmount = existing.amount;

      if (dto.amount !== undefined) {
        newAmount = Number(dto.amount);
        if (isNaN(newAmount) || newAmount <= 0) {
          throw new BadRequestException('Payment amount must be greater than 0.');
        }

        // Calculate other payments on same invoice
        const otherPaymentsTotal = existing.invoice.payments
          .filter((p) => p.id !== existing.id)
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const availableBalance = Number(
          Math.max(0, existing.invoice.grandTotal - otherPaymentsTotal).toFixed(2),
        );

        if (newAmount > availableBalance + 0.01) {
          throw new BadRequestException(
            `Updated amount ₹${newAmount.toLocaleString('en-IN')} exceeds the available invoice limit of ₹${availableBalance.toLocaleString('en-IN')}.`,
          );
        }
      }

      const updatedPayment = await tx.payment.update({
        where: { id: existing.id },
        data: {
          amount: newAmount,
          paymentMethod: dto.paymentMethod || existing.paymentMethod,
          paymentReference:
            dto.paymentReference !== undefined
              ? dto.paymentReference?.trim() || null
              : existing.paymentReference,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : existing.paymentDate,
          remarks: dto.remarks !== undefined ? dto.remarks?.trim() || null : existing.remarks,
        },
        include: {
          customer: true,
          invoice: true,
        },
      });

      // Recalculate invoice status
      const allPayments = await tx.payment.findMany({
        where: { invoiceId: existing.invoiceId },
      });
      const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      let newStatus = 'Pending';
      if (totalPaid >= existing.invoice.grandTotal - 0.01) {
        newStatus = 'Paid';
      } else if (totalPaid > 0) {
        newStatus = 'Partial';
      }

      await tx.invoice.update({
        where: { id: existing.invoiceId },
        data: {
          paymentStatus: newStatus,
          paymentMethod: dto.paymentMethod || existing.invoice.paymentMethod,
        },
      });

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payments',
              action: 'UPDATE',
              recordId: updatedPayment.id,
            },
          });
        } catch {}
      }

      return updatedPayment;
    });
  }

  async remove(id: string, userId?: string) {
    const existing = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Payment with ID "${id}" was not found.`);
    }

    const effectiveUserId = await this.resolveUserId(userId);

    return await this.prisma.$transaction(async (tx) => {
      await tx.payment.delete({
        where: { id: existing.id },
      });

      // Recalculate invoice status after deletion
      const remainingPayments = await tx.payment.findMany({
        where: { invoiceId: existing.invoiceId },
      });
      const totalPaid = remainingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      let newStatus = 'Pending';
      if (totalPaid >= existing.invoice.grandTotal - 0.01) {
        newStatus = 'Paid';
      } else if (totalPaid > 0) {
        newStatus = 'Partial';
      }

      await tx.invoice.update({
        where: { id: existing.invoiceId },
        data: { paymentStatus: newStatus },
      });

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payments',
              action: 'DELETE',
              recordId: existing.id,
            },
          });
        } catch {}
      }

      return {
        success: true,
        message: `Payment of ₹${existing.amount.toLocaleString('en-IN')} removed and invoice status updated to ${newStatus}.`,
      };
    });
  }

  async getStats() {
    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { deletedAt: null },
        include: { payments: true },
      }),
      this.prisma.payment.findMany(),
    ]);

    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);

    const paidInvoicesCount = invoices.filter((inv) => inv.paymentStatus === 'Paid').length;
    const partialInvoicesCount = invoices.filter((inv) => inv.paymentStatus === 'Partial').length;
    const pendingInvoicesCount = invoices.filter((inv) => inv.paymentStatus === 'Pending').length;

    const collectionRate =
      totalInvoiced > 0 ? Number(((totalCollected / totalInvoiced) * 100).toFixed(1)) : 0;

    return {
      totalInvoiced: Number(totalInvoiced.toFixed(2)),
      totalCollected: Number(totalCollected.toFixed(2)),
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      totalPaymentsCount: payments.length,
      paidInvoicesCount,
      partialInvoicesCount,
      pendingInvoicesCount,
      collectionRate,
    };
  }

  private async resolveUserId(userId?: string): Promise<string | null> {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) return user.id;
    }

    const defaultAdmin = await this.prisma.user.findFirst({
      where: { status: 'ACTIVE' },
    });

    return defaultAdmin?.id || null;
  }
}
