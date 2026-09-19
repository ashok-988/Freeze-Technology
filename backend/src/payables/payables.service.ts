import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorBillDto } from './dto/create-vendor-bill.dto';
import { UpdateVendorBillDto } from './dto/update-vendor-bill.dto';
import { RecordVendorPaymentDto } from './dto/record-vendor-payment.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { RecordExpensePaymentDto } from './dto/record-expense-payment.dto';
import { PayablesQueryDto } from './dto/payables-query.dto';

@Injectable()
export class PayablesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultCategories();
  }

  // Seed standard database-driven expense categories if table is empty
  async seedDefaultCategories() {
    try {
      const count = await this.prisma.expenseCategory.count();
      if (count === 0) {
        const defaultCategories = [
          { name: 'Rent', code: 'RENT', description: 'Office and warehouse lease rentals' },
          { name: 'Electricity', code: 'ELEC', description: 'Commercial power and utility bills' },
          { name: 'Internet', code: 'INET', description: 'Broadband and fiber connectivity' },
          { name: 'Telephone', code: 'TEL', description: 'Office and mobile communications' },
          { name: 'Office Supplies', code: 'OFF_SUP', description: 'Stationery and consumables' },
          { name: 'Travel', code: 'TRAV', description: 'Employee transportation and lodging' },
          { name: 'Fuel', code: 'FUEL', description: 'Vehicle and generator fuel expenses' },
          { name: 'Vehicle Maintenance', code: 'VEH_MAINT', description: 'Service van repairs and upkeep' },
          { name: 'Repairs & Maintenance', code: 'REP_MAINT', description: 'Office tools and machinery servicing' },
          { name: 'Software / Subscriptions', code: 'SW_SUB', description: 'Cloud tools and licenses' },
          { name: 'Professional Fees', code: 'PROF_FEES', description: 'Auditor and legal consultant fees' },
          { name: 'Insurance', code: 'INS', description: 'Business asset and transit insurance' },
          { name: 'Marketing', code: 'MKTG', description: 'Promotions and local advertising' },
          { name: 'Utilities', code: 'UTIL', description: 'Water and sanitation utilities' },
          { name: 'Miscellaneous', code: 'MISC', description: 'General operational overheads' },
        ];

        for (const cat of defaultCategories) {
          await this.prisma.expenseCategory.upsert({
            where: { name: cat.name },
            create: cat,
            update: {},
          });
        }
      }
    } catch (e) {
      console.warn('Expense category seed warning:', e.message);
    }
  }

  // Number generator for Vendor Bills: VB-2026-0001
  private async generateBillNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `VB-${year}-`;

    const lastBill = await tx.vendorBill.findFirst({
      where: { billNumber: { startsWith: prefix } },
      orderBy: { billNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastBill?.billNumber) {
      const parts = lastBill.billNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNumber = lastSeq + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  // Number generator for Operating Expenses: EXP-2026-0001
  private async generateExpenseNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;

    const lastExp = await tx.expense.findFirst({
      where: { expenseNumber: { startsWith: prefix } },
      orderBy: { expenseNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastExp?.expenseNumber) {
      const parts = lastExp.expenseNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNumber = lastSeq + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  async getCategories() {
    return await this.prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getStats() {
    const bills = await this.prisma.vendorBill.findMany({
      where: { status: { not: 'CANCELLED' } },
    });

    const expenses = await this.prisma.expense.findMany({
      where: { status: { notIn: ['CANCELLED', 'REJECTED'] } },
    });

    const totalBillPayables = bills.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalExpPayables = expenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const totalPayables = Number((totalBillPayables + totalExpPayables).toFixed(2));

    const outstandingBillPayables = bills.reduce((sum, b) => sum + b.balanceAmount, 0);
    const outstandingExpPayables = expenses.reduce((sum, e) => sum + e.balanceAmount, 0);
    const outstandingPayables = Number((outstandingBillPayables + outstandingExpPayables).toFixed(2));

    const now = new Date();
    const overdueBills = bills.filter((b) => b.balanceAmount > 0 && new Date(b.dueDate) < now);
    const overdueAmount = Number(
      overdueBills.reduce((sum, b) => sum + b.balanceAmount, 0).toFixed(2),
    );

    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dueThisWeekBills = bills.filter(
      (b) =>
        b.balanceAmount > 0 &&
        new Date(b.dueDate) >= now &&
        new Date(b.dueDate) <= weekFromNow,
    );
    const dueThisWeek = Number(
      dueThisWeekBills.reduce((sum, b) => sum + b.balanceAmount, 0).toFixed(2),
    );

    const pendingApprovalBillsCount = bills.filter((b) =>
      ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'].includes(b.status),
    ).length;
    const pendingApprovalExpensesCount = expenses.filter((e) =>
      ['DRAFT', 'SUBMITTED'].includes(e.status),
    ).length;
    const pendingApproval = pendingApprovalBillsCount + pendingApprovalExpensesCount;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expensesThisMonthSum = expenses
      .filter((e) => new Date(e.expenseDate) >= startOfMonth)
      .reduce((sum, e) => sum + e.totalAmount, 0);
    const expensesThisMonth = Number(expensesThisMonthSum.toFixed(2));

    const allocations = await this.prisma.paymentAllocation.findMany({
      where: { paymentDate: { gte: startOfMonth } },
    });
    const paidThisMonth = Number(
      allocations.reduce((sum, a) => sum + a.amount, 0).toFixed(2),
    );

    return {
      totalPayables,
      outstandingPayables,
      overdueAmount,
      dueThisWeek,
      pendingApproval,
      expensesThisMonth,
      paidThisMonth,
      totalBillsCount: bills.length,
      totalExpensesCount: expenses.length,
    };
  }

  async getAging() {
    const openBills = await this.prisma.vendorBill.findMany({
      where: {
        status: { not: 'CANCELLED' },
        balanceAmount: { gt: 0 },
      },
      include: {
        supplier: true,
      },
    });

    const now = new Date();
    const supplierMap = new Map<string, any>();

    for (const bill of openBills) {
      const supplierId = bill.supplierId;
      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplierId: bill.supplierId,
          supplierName: bill.supplier?.companyName || 'Unknown Supplier',
          contactPerson: bill.supplier?.contactPerson,
          phone: bill.supplier?.phone,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          days90plus: 0,
          totalOutstanding: 0,
          openBillsCount: 0,
        });
      }

      const entry = supplierMap.get(supplierId);
      const diffMs = now.getTime() - new Date(bill.dueDate).getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const bal = bill.balanceAmount;

      entry.totalOutstanding += bal;
      entry.openBillsCount += 1;

      if (daysOverdue <= 0) {
        entry.current += bal;
      } else if (daysOverdue <= 30) {
        entry.days1to30 += bal;
      } else if (daysOverdue <= 60) {
        entry.days31to60 += bal;
      } else if (daysOverdue <= 90) {
        entry.days61to90 += bal;
      } else {
        entry.days90plus += bal;
      }
    }

    const agingList = Array.from(supplierMap.values()).map((s) => ({
      ...s,
      current: Number(s.current.toFixed(2)),
      days1to30: Number(s.days1to30.toFixed(2)),
      days31to60: Number(s.days31to60.toFixed(2)),
      days61to90: Number(s.days61to90.toFixed(2)),
      days90plus: Number(s.days90plus.toFixed(2)),
      totalOutstanding: Number(s.totalOutstanding.toFixed(2)),
    }));

    agingList.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    return agingList;
  }

  // ==========================================
  // VENDOR BILLS
  // ==========================================

  async getBills(query: PayablesQueryDto) {
    const { supplierId, status, paymentStatus, search } = query;
    const where: any = {};

    if (supplierId && supplierId !== 'All') where.supplierId = supplierId;
    if (status && status !== 'All') where.status = status;
    if (paymentStatus && paymentStatus !== 'All') where.paymentStatus = paymentStatus;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { billNumber: { contains: q, mode: 'insensitive' } },
        { vendorInvoiceNumber: { contains: q, mode: 'insensitive' } },
        { supplier: { companyName: { contains: q, mode: 'insensitive' } } },
        { purchaseOrder: { poNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return await this.prisma.vendorBill.findMany({
      where,
      include: {
        supplier: true,
        purchaseOrder: true,
        items: { include: { product: true } },
        allocations: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getBillById(id: string) {
    const bill = await this.prisma.vendorBill.findFirst({
      where: { OR: [{ id }, { billNumber: id }] },
      include: {
        supplier: true,
        purchaseOrder: {
          include: {
            items: { include: { product: true } },
          },
        },
        items: { include: { product: true } },
        allocations: {
          include: { createdBy: true },
          orderBy: { paymentDate: 'desc' },
        },
        createdBy: true,
        approvedBy: true,
      },
    });

    if (!bill) {
      throw new NotFoundException(`Vendor bill "${id}" not found.`);
    }

    // Calculate 3-way reconciliation summary if PO is linked
    let reconciliation: any = null;
    if (bill.purchaseOrder) {
      const poItems = bill.purchaseOrder.items || [];
      const billItems = bill.items || [];

      const itemComparisons = poItems.map((poi) => {
        const matchingBillItem = billItems.find((bi) => bi.productId === poi.productId);
        const billedQty = matchingBillItem ? matchingBillItem.quantity : 0;
        const orderedQty = poi.quantity;
        const receivedQty = poi.receivedQuantity || 0;
        const pendingQty = Math.max(0, orderedQty - receivedQty);

        let mismatchWarning = null;
        if (billedQty > receivedQty && receivedQty > 0) {
          mismatchWarning = `Billed qty (${billedQty}) exceeds received stock (${receivedQty})`;
        } else if (billedQty > orderedQty) {
          mismatchWarning = `Billed qty (${billedQty}) exceeds ordered PO qty (${orderedQty})`;
        }

        return {
          productId: poi.productId,
          productName: poi.product?.productName || 'Product',
          sku: poi.product?.sku,
          orderedQty,
          receivedQty,
          billedQty,
          pendingQty,
          mismatchWarning,
        };
      });

      reconciliation = {
        poNumber: bill.purchaseOrder.poNumber,
        poTotal: bill.purchaseOrder.totalAmount,
        billTotal: bill.totalAmount,
        difference: Number((bill.totalAmount - bill.purchaseOrder.totalAmount).toFixed(2)),
        items: itemComparisons,
      };
    }

    return { ...bill, reconciliation };
  }

  async createBill(dto: CreateVendorBillDto, userId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new NotFoundException(`Supplier with ID "${dto.supplierId}" not found.`);
      }

      let linkedPo: any = null;
      if (dto.purchaseOrderId) {
        linkedPo = await tx.purchaseOrder.findUnique({
          where: { id: dto.purchaseOrderId },
        });

        if (!linkedPo) {
          throw new NotFoundException(`Purchase Order "${dto.purchaseOrderId}" not found.`);
        }

        if (linkedPo.status === 'Cancelled') {
          throw new BadRequestException(`Cannot link to cancelled Purchase Order "${linkedPo.poNumber}".`);
        }

        if (linkedPo.supplierId !== dto.supplierId) {
          throw new BadRequestException(
            `Supplier mismatch: Purchase Order belongs to a different supplier.`,
          );
        }
      }

      // Check duplicate vendor invoice number for the same supplier
      if (dto.vendorInvoiceNumber && dto.vendorInvoiceNumber.trim()) {
        const existingInvoice = await tx.vendorBill.findFirst({
          where: {
            supplierId: dto.supplierId,
            vendorInvoiceNumber: dto.vendorInvoiceNumber.trim(),
            status: { not: 'CANCELLED' },
          },
        });

        if (existingInvoice) {
          throw new ConflictException(
            `Vendor invoice "${dto.vendorInvoiceNumber}" already exists for this supplier (${existingInvoice.billNumber}).`,
          );
        }
      }

      const billNumber = await this.generateBillNumber(tx);

      // Calculate Line Items and Totals
      let subtotalSum = 0;
      let taxSum = 0;

      const processedItems = (dto.items || []).map((item) => {
        const qty = item.quantity || 1;
        const price = item.unitPrice || 0;
        const taxRate = item.taxRate !== undefined ? item.taxRate : 18;

        const lineSubtotal = Number((qty * price).toFixed(2));
        const taxAmount = Number((lineSubtotal * (taxRate / 100)).toFixed(2));
        const lineTotal = Number((lineSubtotal + taxAmount).toFixed(2));

        subtotalSum += lineSubtotal;
        taxSum += taxAmount;

        return {
          productId: item.productId || null,
          description: item.description,
          quantity: qty,
          unitPrice: price,
          taxRate,
          taxAmount,
          lineSubtotal,
          lineTotal,
        };
      });

      const discount = dto.discountAmount || 0;
      const subtotal = Number(subtotalSum.toFixed(2));
      const taxAmount = Number(taxSum.toFixed(2));
      const totalAmount = Math.max(0, Number((subtotal + taxAmount - discount).toFixed(2)));

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const adminUser = await tx.user.findFirst();
        effectiveUserId = adminUser?.id;
      }

      const bill = await tx.vendorBill.create({
        data: {
          billNumber,
          supplierId: dto.supplierId,
          purchaseOrderId: dto.purchaseOrderId || null,
          vendorInvoiceNumber: dto.vendorInvoiceNumber?.trim() || null,
          vendorInvoiceDate: dto.vendorInvoiceDate ? new Date(dto.vendorInvoiceDate) : null,
          billDate: dto.billDate ? new Date(dto.billDate) : new Date(),
          dueDate: new Date(dto.dueDate),
          status: dto.status || 'DRAFT',
          paymentStatus: 'UNPAID',
          subtotal,
          taxAmount,
          discountAmount: discount,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          gstNumber: dto.gstNumber?.trim() || supplier.gstNumber || null,
          notes: dto.notes?.trim() || null,
          createdById: effectiveUserId || null,
          items: {
            create: processedItems,
          },
        },
        include: {
          supplier: true,
          purchaseOrder: true,
          items: true,
        },
      });

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payables',
              action: 'VENDOR_BILL_CREATED',
              recordId: bill.id,
            },
          });
        } catch {}
      }

      return bill;
    });
  }

  async updateBill(id: string, dto: UpdateVendorBillDto, userId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const bill = await tx.vendorBill.findFirst({
        where: { OR: [{ id }, { billNumber: id }] },
        include: { items: true },
      });

      if (!bill) throw new NotFoundException(`Vendor bill "${id}" not found.`);

      if (['APPROVED', 'PARTIALLY_PAID', 'PAID'].includes(bill.status)) {
        throw new BadRequestException(
          `Cannot edit vendor bill "${bill.billNumber}" because it is already ${bill.status}.`,
        );
      }

      let subtotal = bill.subtotal;
      let taxAmount = bill.taxAmount;
      let discount = dto.discountAmount !== undefined ? dto.discountAmount : bill.discountAmount;

      if (dto.items && dto.items.length > 0) {
        await tx.vendorBillItem.deleteMany({
          where: { vendorBillId: bill.id },
        });

        let subtotalSum = 0;
        let taxSum = 0;

        const newItems = dto.items.map((item) => {
          const qty = item.quantity || 1;
          const price = item.unitPrice || 0;
          const taxRate = item.taxRate !== undefined ? item.taxRate : 18;

          const lineSubtotal = Number((qty * price).toFixed(2));
          const lineTax = Number((lineSubtotal * (taxRate / 100)).toFixed(2));
          const lineTotal = Number((lineSubtotal + lineTax).toFixed(2));

          subtotalSum += lineSubtotal;
          taxSum += lineTax;

          return {
            vendorBillId: bill.id,
            productId: item.productId || null,
            description: item.description,
            quantity: qty,
            unitPrice: price,
            taxRate,
            taxAmount: lineTax,
            lineSubtotal,
            lineTotal,
          };
        });

        await tx.vendorBillItem.createMany({ data: newItems });

        subtotal = Number(subtotalSum.toFixed(2));
        taxAmount = Number(taxSum.toFixed(2));
      }

      const totalAmount = Math.max(0, Number((subtotal + taxAmount - discount).toFixed(2)));
      const balanceAmount = Number((totalAmount - bill.paidAmount).toFixed(2));

      const updated = await tx.vendorBill.update({
        where: { id: bill.id },
        data: {
          supplierId: dto.supplierId || bill.supplierId,
          purchaseOrderId: dto.purchaseOrderId !== undefined ? dto.purchaseOrderId : bill.purchaseOrderId,
          vendorInvoiceNumber: dto.vendorInvoiceNumber !== undefined ? dto.vendorInvoiceNumber?.trim() : bill.vendorInvoiceNumber,
          vendorInvoiceDate: dto.vendorInvoiceDate ? new Date(dto.vendorInvoiceDate) : bill.vendorInvoiceDate,
          billDate: dto.billDate ? new Date(dto.billDate) : bill.billDate,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : bill.dueDate,
          subtotal,
          taxAmount,
          discountAmount: discount,
          totalAmount,
          balanceAmount,
          gstNumber: dto.gstNumber !== undefined ? dto.gstNumber?.trim() : bill.gstNumber,
          notes: dto.notes !== undefined ? dto.notes?.trim() : bill.notes,
          status: dto.status || bill.status,
        },
        include: {
          supplier: true,
          purchaseOrder: true,
          items: true,
        },
      });

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const adminUser = await tx.user.findFirst();
        effectiveUserId = adminUser?.id;
      }

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payables',
              action: 'VENDOR_BILL_UPDATED',
              recordId: updated.id,
            },
          });
        } catch {}
      }

      return updated;
    });
  }

  async submitBill(id: string, userId?: string) {
    const bill = await this.prisma.vendorBill.findFirst({
      where: { OR: [{ id }, { billNumber: id }] },
    });

    if (!bill) throw new NotFoundException(`Vendor bill "${id}" not found.`);

    if (bill.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT bills can be submitted (current: ${bill.status}).`);
    }

    const updated = await this.prisma.vendorBill.update({
      where: { id: bill.id },
      data: { status: 'SUBMITTED' },
    });

    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const adminUser = await this.prisma.user.findFirst();
      effectiveUserId = adminUser?.id;
    }

    if (effectiveUserId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: effectiveUserId,
            moduleName: 'Payables',
            action: 'VENDOR_BILL_SUBMITTED',
            recordId: updated.id,
          },
        });
      } catch {}
    }

    return updated;
  }

  async approveBill(id: string, userId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const bill = await tx.vendorBill.findFirst({
        where: { OR: [{ id }, { billNumber: id }] },
      });

      if (!bill) throw new NotFoundException(`Vendor bill "${id}" not found.`);

      if (bill.status === 'APPROVED' || bill.status === 'PAID') {
        throw new ConflictException(`Vendor bill "${bill.billNumber}" is already ${bill.status}.`);
      }

      if (bill.status === 'CANCELLED') {
        throw new BadRequestException(`Cannot approve cancelled vendor bill.`);
      }

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const adminUser = await tx.user.findFirst();
        effectiveUserId = adminUser?.id;
      }

      const updated = await tx.vendorBill.update({
        where: { id: bill.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedById: effectiveUserId || null,
        },
        include: { supplier: true, items: true },
      });

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payables',
              action: 'VENDOR_BILL_APPROVED',
              recordId: updated.id,
            },
          });
        } catch {}
      }

      return updated;
    });
  }

  async recordVendorPayment(id: string, dto: RecordVendorPaymentDto, userId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const bill = await tx.vendorBill.findFirst({
        where: { OR: [{ id }, { billNumber: id }] },
      });

      if (!bill) throw new NotFoundException(`Vendor bill "${id}" not found.`);

      if (!['APPROVED', 'PARTIALLY_PAID'].includes(bill.status)) {
        throw new BadRequestException(
          `Cannot record payment: Vendor bill "${bill.billNumber}" must be APPROVED first (current status: ${bill.status}).`,
        );
      }

      if (bill.status === 'PAID' || bill.balanceAmount <= 0) {
        throw new BadRequestException(`Vendor bill "${bill.billNumber}" is already fully paid.`);
      }

      if (dto.amount <= 0) {
        throw new BadRequestException(`Payment amount must be greater than zero.`);
      }

      if (dto.amount > bill.balanceAmount + 0.01) {
        throw new BadRequestException(
          `Payment amount (₹${dto.amount}) exceeds outstanding balance (₹${bill.balanceAmount}). Overpayment is not permitted.`,
        );
      }

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const adminUser = await tx.user.findFirst();
        effectiveUserId = adminUser?.id;
      }

      const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

      // 1. Create Allocation Record
      const allocation = await tx.paymentAllocation.create({
        data: {
          allocationType: 'VENDOR_BILL',
          vendorBillId: bill.id,
          paymentDate,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference?.trim() || null,
          amount: dto.amount,
          notes: dto.notes?.trim() || null,
          createdById: effectiveUserId || null,
        },
      });

      // 2. Update Bill Balances & Status
      const newPaidAmount = Number((bill.paidAmount + dto.amount).toFixed(2));
      const newBalanceAmount = Math.max(0, Number((bill.totalAmount - newPaidAmount).toFixed(2)));
      const isFullyPaid = newBalanceAmount <= 0.01;
      const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

      const updatedBill = await tx.vendorBill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
          paymentStatus: newStatus,
          paidAt: isFullyPaid ? paymentDate : bill.paidAt,
        },
        include: {
          supplier: true,
          items: true,
          allocations: true,
        },
      });

      // 3. Audit Log
      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payables',
              action: isFullyPaid ? 'VENDOR_BILL_PAID' : 'VENDOR_PAYMENT_RECORDED',
              recordId: bill.id,
            },
          });
        } catch {}
      }

      return {
        bill: updatedBill,
        allocation,
      };
    });
  }

  async cancelBill(id: string, userId?: string) {
    const bill = await this.prisma.vendorBill.findFirst({
      where: { OR: [{ id }, { billNumber: id }] },
    });

    if (!bill) throw new NotFoundException(`Vendor bill "${id}" not found.`);

    if (bill.status === 'PAID' || bill.status === 'PARTIALLY_PAID') {
      throw new BadRequestException(
        `Cannot cancel vendor bill "${bill.billNumber}" because payments have already been allocated.`,
      );
    }

    const updated = await this.prisma.vendorBill.update({
      where: { id: bill.id },
      data: { status: 'CANCELLED' },
    });

    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const adminUser = await this.prisma.user.findFirst();
      effectiveUserId = adminUser?.id;
    }

    if (effectiveUserId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: effectiveUserId,
            moduleName: 'Payables',
            action: 'VENDOR_BILL_CANCELLED',
            recordId: updated.id,
          },
        });
      } catch {}
    }

    return updated;
  }

  // ==========================================
  // OPERATING EXPENSES
  // ==========================================

  async getExpenses(query: PayablesQueryDto) {
    const { categoryId, status, paymentStatus, search } = query;
    const where: any = {};

    if (categoryId && categoryId !== 'All') where.categoryId = categoryId;
    if (status && status !== 'All') where.status = status;
    if (paymentStatus && paymentStatus !== 'All') where.paymentStatus = paymentStatus;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { expenseNumber: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { category: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return await this.prisma.expense.findMany({
      where,
      include: {
        category: true,
        supplier: true,
        employee: true,
        allocations: true,
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getExpenseById(id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { OR: [{ id }, { expenseNumber: id }] },
      include: {
        category: true,
        supplier: true,
        employee: true,
        allocations: { include: { createdBy: true } },
        approvedBy: true,
        createdBy: true,
      },
    });

    if (!expense) throw new NotFoundException(`Expense "${id}" not found.`);
    return expense;
  }

  async createExpense(dto: CreateExpenseDto, userId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const category = await tx.expenseCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException(`Expense category "${dto.categoryId}" not found.`);

      const expenseNumber = await this.generateExpenseNumber(tx);

      const subtotal = Number((dto.subtotal || 0).toFixed(2));
      const taxAmount = Number((dto.taxAmount || 0).toFixed(2));
      const totalAmount = dto.totalAmount !== undefined ? dto.totalAmount : Number((subtotal + taxAmount).toFixed(2));

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const adminUser = await tx.user.findFirst();
        effectiveUserId = adminUser?.id;
      }

      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          categoryId: dto.categoryId,
          supplierId: dto.supplierId || null,
          employeeId: dto.employeeId || null,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          description: dto.description.trim(),
          referenceNumber: dto.referenceNumber?.trim() || null,
          subtotal,
          taxAmount,
          totalAmount,
          status: dto.status || 'DRAFT',
          paymentStatus: 'UNPAID',
          paidAmount: 0,
          balanceAmount: totalAmount,
          notes: dto.notes?.trim() || null,
          createdById: effectiveUserId || null,
        },
        include: {
          category: true,
          supplier: true,
          employee: true,
        },
      });

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payables',
              action: 'EXPENSE_CREATED',
              recordId: expense.id,
            },
          });
        } catch {}
      }

      return expense;
    });
  }

  async updateExpense(id: string, dto: UpdateExpenseDto, userId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirst({
        where: { OR: [{ id }, { expenseNumber: id }] },
      });
      if (!expense) throw new NotFoundException(`Expense "${id}" not found.`);

      if (['APPROVED', 'PAID'].includes(expense.status)) {
        throw new BadRequestException(
          `Cannot edit expense "${expense.expenseNumber}" because it is already ${expense.status}.`,
        );
      }

      const subtotal = dto.subtotal !== undefined ? Number(dto.subtotal.toFixed(2)) : expense.subtotal;
      const taxAmount = dto.taxAmount !== undefined ? Number(dto.taxAmount.toFixed(2)) : expense.taxAmount;
      const totalAmount = dto.totalAmount !== undefined ? dto.totalAmount : Number((subtotal + taxAmount).toFixed(2));
      const balanceAmount = Number((totalAmount - expense.paidAmount).toFixed(2));

      const updated = await tx.expense.update({
        where: { id: expense.id },
        data: {
          categoryId: dto.categoryId || expense.categoryId,
          supplierId: dto.supplierId !== undefined ? dto.supplierId : expense.supplierId,
          employeeId: dto.employeeId !== undefined ? dto.employeeId : expense.employeeId,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : expense.expenseDate,
          description: dto.description !== undefined ? dto.description.trim() : expense.description,
          referenceNumber: dto.referenceNumber !== undefined ? dto.referenceNumber?.trim() : expense.referenceNumber,
          subtotal,
          taxAmount,
          totalAmount,
          balanceAmount,
          notes: dto.notes !== undefined ? dto.notes?.trim() : expense.notes,
          status: dto.status || expense.status,
        },
        include: {
          category: true,
          supplier: true,
          employee: true,
        },
      });

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const adminUser = await tx.user.findFirst();
        effectiveUserId = adminUser?.id;
      }

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payables',
              action: 'EXPENSE_UPDATED',
              recordId: updated.id,
            },
          });
        } catch {}
      }

      return updated;
    });
  }

  async submitExpense(id: string, userId?: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { OR: [{ id }, { expenseNumber: id }] },
    });
    if (!expense) throw new NotFoundException(`Expense "${id}" not found.`);

    if (expense.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT expenses can be submitted.`);
    }

    return await this.prisma.expense.update({
      where: { id: expense.id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approveExpense(id: string, userId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirst({
        where: { OR: [{ id }, { expenseNumber: id }] },
      });
      if (!expense) throw new NotFoundException(`Expense "${id}" not found.`);

      if (expense.status === 'APPROVED' || expense.status === 'PAID') {
        throw new ConflictException(`Expense "${expense.expenseNumber}" is already ${expense.status}.`);
      }

      if (expense.status === 'CANCELLED' || expense.status === 'REJECTED') {
        throw new BadRequestException(`Cannot approve cancelled or rejected expense.`);
      }

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const adminUser = await tx.user.findFirst();
        effectiveUserId = adminUser?.id;
      }

      const updated = await tx.expense.update({
        where: { id: expense.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedById: effectiveUserId || null,
        },
        include: { category: true, supplier: true, employee: true },
      });

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payables',
              action: 'EXPENSE_APPROVED',
              recordId: updated.id,
            },
          });
        } catch {}
      }

      return updated;
    });
  }

  async rejectExpense(id: string, notes?: string, userId?: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { OR: [{ id }, { expenseNumber: id }] },
    });
    if (!expense) throw new NotFoundException(`Expense "${id}" not found.`);

    if (expense.status === 'PAID') {
      throw new BadRequestException(`Cannot reject a paid expense.`);
    }

    const updated = await this.prisma.expense.update({
      where: { id: expense.id },
      data: {
        status: 'REJECTED',
        notes: notes ? `${expense.notes ? expense.notes + ' | ' : ''}Rejected: ${notes}` : expense.notes,
      },
    });

    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const adminUser = await this.prisma.user.findFirst();
      effectiveUserId = adminUser?.id;
    }

    if (effectiveUserId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: effectiveUserId,
            moduleName: 'Payables',
            action: 'EXPENSE_REJECTED',
            recordId: updated.id,
          },
        });
      } catch {}
    }

    return updated;
  }

  async recordExpensePayment(id: string, dto: RecordExpensePaymentDto, userId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirst({
        where: { OR: [{ id }, { expenseNumber: id }] },
      });
      if (!expense) throw new NotFoundException(`Expense "${id}" not found.`);

      if (!['APPROVED', 'PARTIALLY_PAID'].includes(expense.status)) {
        throw new BadRequestException(
          `Cannot disburse payment: Expense "${expense.expenseNumber}" must be APPROVED first (current: ${expense.status}).`,
        );
      }

      if (expense.balanceAmount <= 0) {
        throw new BadRequestException(`Expense "${expense.expenseNumber}" is already fully paid.`);
      }

      if (dto.amount > expense.balanceAmount + 0.01) {
        throw new BadRequestException(
          `Payment amount (₹${dto.amount}) exceeds outstanding balance (₹${expense.balanceAmount}).`,
        );
      }

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const adminUser = await tx.user.findFirst();
        effectiveUserId = adminUser?.id;
      }

      const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

      const allocation = await tx.paymentAllocation.create({
        data: {
          allocationType: 'EXPENSE',
          expenseId: expense.id,
          paymentDate,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference?.trim() || null,
          amount: dto.amount,
          notes: dto.notes?.trim() || null,
          createdById: effectiveUserId || null,
        },
      });

      const newPaidAmount = Number((expense.paidAmount + dto.amount).toFixed(2));
      const newBalanceAmount = Math.max(0, Number((expense.totalAmount - newPaidAmount).toFixed(2)));
      const isFullyPaid = newBalanceAmount <= 0.01;
      const newPaymentStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

      const updatedExpense = await tx.expense.update({
        where: { id: expense.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          paymentStatus: newPaymentStatus,
          status: isFullyPaid ? 'PAID' : expense.status,
          paidAt: isFullyPaid ? paymentDate : expense.paidAt,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference?.trim() || expense.paymentReference,
        },
        include: {
          category: true,
          supplier: true,
          employee: true,
          allocations: true,
        },
      });

      if (effectiveUserId) {
        try {
          await tx.auditLog.create({
            data: {
              userId: effectiveUserId,
              moduleName: 'Payables',
              action: 'EXPENSE_PAYMENT_RECORDED',
              recordId: expense.id,
            },
          });
        } catch {}
      }

      return {
        expense: updatedExpense,
        allocation,
      };
    });
  }

  async cancelExpense(id: string, userId?: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { OR: [{ id }, { expenseNumber: id }] },
    });
    if (!expense) throw new NotFoundException(`Expense "${id}" not found.`);

    if (expense.status === 'PAID' || expense.paidAmount > 0) {
      throw new BadRequestException(
        `Cannot cancel expense "${expense.expenseNumber}" because payment has already been disbursed.`,
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id: expense.id },
      data: { status: 'CANCELLED' },
    });

    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const adminUser = await this.prisma.user.findFirst();
      effectiveUserId = adminUser?.id;
    }

    if (effectiveUserId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: effectiveUserId,
            moduleName: 'Payables',
            action: 'EXPENSE_CANCELLED',
            recordId: updated.id,
          },
        });
      } catch {}
    }

    return updated;
  }

  // ==========================================
  // PAYMENT ALLOCATIONS & AUDIT HISTORY
  // ==========================================

  async getPayments(query: any = {}) {
    return await this.prisma.paymentAllocation.findMany({
      include: {
        vendorBill: { include: { supplier: true } },
        expense: { include: { category: true, supplier: true, employee: true } },
        createdBy: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async getPaymentById(id: string) {
    const payment = await this.prisma.paymentAllocation.findUnique({
      where: { id },
      include: {
        vendorBill: { include: { supplier: true, items: true } },
        expense: { include: { category: true, supplier: true, employee: true } },
        createdBy: true,
      },
    });

    if (!payment) throw new NotFoundException(`Payment allocation "${id}" not found.`);
    return payment;
  }

  async getHistory(recordId: string) {
    return await this.prisma.auditLog.findMany({
      where: {
        moduleName: 'Payables',
        recordId,
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
