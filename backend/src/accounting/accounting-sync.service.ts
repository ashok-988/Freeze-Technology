import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingJournalService } from './accounting-journal.service';
import { CreateJournalEntryDto } from './dto/journal.dto';

@Injectable()
export class AccountingSyncService {
  private readonly logger = new Logger(AccountingSyncService.name);

  // Cached standard account IDs
  private accountMap = new Map<string, string>(); // code -> id

  constructor(
    private prisma: PrismaService,
    private journalService: AccountingJournalService,
  ) {}

  /**
   * Helper to resolve account ID by account code.
   */
  async getAccountIdByCode(code: string): Promise<string> {
    if (this.accountMap.has(code)) {
      return this.accountMap.get(code)!;
    }
    const acc = await this.prisma.account.findUnique({ where: { accountCode: code } });
    if (!acc) {
      throw new Error(`Critical standard accounting account code "${code}" not found.`);
    }
    this.accountMap.set(code, acc.id);
    return acc.id;
  }

  /**
   * Idempotency Check: Returns existing posted journal entry for this source entity if present.
   */
  async findExistingJournal(sourceModule: string, sourceEntityId: string, referenceType: string) {
    return this.prisma.journalEntry.findFirst({
      where: {
        sourceModule,
        sourceEntityId,
        referenceType,
        status: 'POSTED',
      },
      include: { lines: true },
    });
  }

  /**
   * 1. INVOICE AUTO-POSTING:
   * DR Accounts Receivable (1030)
   * CR Sales Revenue (4010)
   * CR Output GST (2020)
   */
  async postInvoiceJournal(invoiceId: string, userId?: string) {
    const existing = await this.findExistingJournal('INVOICES', invoiceId, 'INVOICE');
    if (existing) return existing;

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, items: true },
    });
    if (!invoice) return null;

    const arAccId = await this.getAccountIdByCode('1030'); // Accounts Receivable
    const salesAccId = await this.getAccountIdByCode('4010'); // Product Sales
    const outputGstAccId = await this.getAccountIdByCode('2020'); // Output GST

    const total = Number(invoice.grandTotal || 0);
    const gst = Math.min(Number(invoice.gstAmount || 0), total);
    const revenue = Math.round((total - gst) * 100) / 100;

    if (total <= 0) return null;

    const lines = [
      {
        accountId: arAccId,
        debit: total,
        credit: 0,
        description: `Receivable from ${invoice.customer?.companyName || invoice.customer?.customerName || 'Customer'}`,
        reference: invoice.invoiceNumber,
      },
    ];

    if (revenue > 0) {
      lines.push({
        accountId: salesAccId,
        debit: 0,
        credit: revenue,
        description: `Sales revenue for Invoice #${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
      });
    }

    if (gst > 0) {
      lines.push({
        accountId: outputGstAccId,
        debit: 0,
        credit: gst,
        description: `Output GST on Invoice #${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
      });
    }

    // Balance verification
    const dto: CreateJournalEntryDto = {
      entryDate: invoice.invoiceDate.toISOString(),
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      referenceNumber: invoice.invoiceNumber,
      narration: `Automated Invoice Posting for ${invoice.customer?.customerName || 'Customer'} (#${invoice.invoiceNumber})`,
      sourceModule: 'INVOICES',
      sourceEntityId: invoice.id,
      status: 'POSTED',
      lines,
    };

    return this.journalService.createJournalEntry(dto, userId);
  }

  /**
   * 2. CUSTOMER PAYMENT AUTO-POSTING:
   * DR Cash (1010) / Bank (1020)
   * CR Accounts Receivable (1030)
   */
  async postPaymentJournal(paymentId: string, userId?: string) {
    const existing = await this.findExistingJournal('PAYMENTS', paymentId, 'PAYMENT');
    if (existing) return existing;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true, customer: true },
    });
    if (!payment) return null;

    const amount = Number(payment.amount || 0);
    if (amount <= 0) return null;

    const isCash = (payment.paymentMethod || '').toUpperCase().includes('CASH');
    const cashBankAccId = isCash
      ? await this.getAccountIdByCode('1010') // Cash in Hand
      : await this.getAccountIdByCode('1020'); // HDFC Bank

    const arAccId = await this.getAccountIdByCode('1030'); // Accounts Receivable

    const lines = [
      {
        accountId: cashBankAccId,
        debit: amount,
        credit: 0,
        description: `Payment receipt via ${payment.paymentMethod || 'Bank'}`,
        reference: payment.paymentReference || payment.invoice?.invoiceNumber,
      },
      {
        accountId: arAccId,
        debit: 0,
        credit: amount,
        description: `Clearance of AR for ${payment.customer?.customerName || 'Customer'}`,
        reference: payment.invoice?.invoiceNumber,
      },
    ];

    const dto: CreateJournalEntryDto = {
      entryDate: payment.paymentDate.toISOString(),
      referenceType: 'PAYMENT',
      referenceId: payment.id,
      referenceNumber: payment.paymentReference || `PMT-${payment.id.slice(0, 8)}`,
      narration: `Payment received from ${payment.customer?.customerName || 'Customer'} (Ref: ${payment.paymentReference || 'N/A'})`,
      sourceModule: 'PAYMENTS',
      sourceEntityId: payment.id,
      status: 'POSTED',
      lines,
    };

    return this.journalService.createJournalEntry(dto, userId);
  }

  /**
   * 3. VENDOR BILL AUTO-POSTING:
   * DR COGS / Purchases (5010)
   * DR Input GST (1050)
   * CR Accounts Payable (2010)
   */
  async postVendorBillJournal(vendorBillId: string, userId?: string) {
    const existing = await this.findExistingJournal('PAYABLES', vendorBillId, 'VENDOR_BILL');
    if (existing) return existing;

    const bill = await this.prisma.vendorBill.findUnique({
      where: { id: vendorBillId },
      include: { supplier: true },
    });
    if (!bill) return null;

    const total = Number(bill.totalAmount || 0);
    const gst = Math.min(Number(bill.taxAmount || 0), total);
    const cogs = Math.round((total - gst) * 100) / 100;

    if (total <= 0) return null;

    const cogsAccId = await this.getAccountIdByCode('5010'); // Cost of Goods Sold
    const inputGstAccId = await this.getAccountIdByCode('1050'); // Input GST
    const apAccId = await this.getAccountIdByCode('2010'); // Accounts Payable

    const lines = [];

    if (cogs > 0) {
      lines.push({
        accountId: cogsAccId,
        debit: cogs,
        credit: 0,
        description: `Purchases/Materials from ${bill.supplier?.companyName || 'Supplier'}`,
        reference: bill.billNumber,
      });
    }

    if (gst > 0) {
      lines.push({
        accountId: inputGstAccId,
        debit: gst,
        credit: 0,
        description: `Input GST on Vendor Bill #${bill.billNumber}`,
        reference: bill.billNumber,
      });
    }

    lines.push({
      accountId: apAccId,
      debit: 0,
      credit: total,
      description: `Payable to ${bill.supplier?.companyName || 'Supplier'} for Bill #${bill.billNumber}`,
      reference: bill.billNumber,
    });

    const dto: CreateJournalEntryDto = {
      entryDate: bill.billDate.toISOString(),
      referenceType: 'VENDOR_BILL',
      referenceId: bill.id,
      referenceNumber: bill.billNumber,
      narration: `Vendor Bill #${bill.billNumber} from ${bill.supplier?.companyName || 'Supplier'}`,
      sourceModule: 'PAYABLES',
      sourceEntityId: bill.id,
      status: 'POSTED',
      lines,
    };

    return this.journalService.createJournalEntry(dto, userId);
  }

  /**
   * 4. OPERATING EXPENSE AUTO-POSTING:
   * DR Operating Expense (5030-5090)
   * DR Input GST (1050)
   * CR Cash (1010) / Bank (1020) / Accounts Payable (2010)
   */
  async postExpenseJournal(expenseId: string, userId?: string) {
    const existing = await this.findExistingJournal('EXPENSES', expenseId, 'EXPENSE');
    if (existing) return existing;

    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: { category: true, supplier: true },
    });
    if (!expense) return null;

    const total = Number(expense.totalAmount || 0);
    const gst = Math.min(Number(expense.taxAmount || 0), total);
    const netExp = Math.round((total - gst) * 100) / 100;

    if (total <= 0) return null;

    // Resolve specific expense account by category
    let expAccCode = '5090'; // Default Misc
    const catName = (expense.category?.name || '').toUpperCase();
    if (catName.includes('RENT')) expAccCode = '5030';
    else if (catName.includes('UTIL') || catName.includes('ELEC')) expAccCode = '5040';
    else if (catName.includes('FUEL') || catName.includes('TRAVEL')) expAccCode = '5050';
    else if (catName.includes('REPAIR') || catName.includes('TOOL')) expAccCode = '5060';
    else if (catName.includes('ADMIN') || catName.includes('OFFICE')) expAccCode = '5070';

    const expAccId = await this.getAccountIdByCode(expAccCode);
    const inputGstAccId = await this.getAccountIdByCode('1050');

    // Credit account: Cash, Bank, or AP
    let creditAccCode = '1020'; // Bank default
    if (expense.paymentStatus === 'UNPAID') {
      creditAccCode = '2010'; // Accounts Payable
    } else if ((expense.paymentMethod || '').toUpperCase().includes('CASH')) {
      creditAccCode = '1010'; // Cash in hand
    }

    const creditAccId = await this.getAccountIdByCode(creditAccCode);

    const lines = [];

    if (netExp > 0) {
      lines.push({
        accountId: expAccId,
        debit: netExp,
        credit: 0,
        description: expense.description || `Expense: ${expense.category?.name || 'General'}`,
        reference: expense.expenseNumber,
      });
    }

    if (gst > 0) {
      lines.push({
        accountId: inputGstAccId,
        debit: gst,
        credit: 0,
        description: `Input GST on Expense #${expense.expenseNumber}`,
        reference: expense.expenseNumber,
      });
    }

    lines.push({
      accountId: creditAccId,
      debit: 0,
      credit: total,
      description: `Payment/Accrual for Expense #${expense.expenseNumber}`,
      reference: expense.expenseNumber,
    });

    const dto: CreateJournalEntryDto = {
      entryDate: expense.expenseDate.toISOString(),
      referenceType: 'EXPENSE',
      referenceId: expense.id,
      referenceNumber: expense.expenseNumber,
      narration: `Operating Expense #${expense.expenseNumber}: ${expense.description}`,
      sourceModule: 'EXPENSES',
      sourceEntityId: expense.id,
      status: 'POSTED',
      lines,
    };

    return this.journalService.createJournalEntry(dto, userId);
  }

  /**
   * 5. PAYROLL DISBURSEMENT AUTO-POSTING:
   * DR Salary Expense (5020)
   * CR Salary Payable (2040)
   */
  async postPayrollJournal(payrollPeriodId: string, userId?: string) {
    const existing = await this.findExistingJournal('PAYROLL', payrollPeriodId, 'PAYROLL');
    if (existing) return existing;

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
      include: { records: true },
    });
    if (!period) return null;

    const gross = Number(period.totalGrossSalary || 0);
    const net = Number(period.totalNetSalary || 0);

    if (gross <= 0 && net <= 0) return null;

    const salaryExpAccId = await this.getAccountIdByCode('5020'); // Salaries
    const salaryPayableAccId = await this.getAccountIdByCode('2040'); // Salary Payable
    const bankAccId = await this.getAccountIdByCode('1020'); // Bank

    // If period is approved/draft -> Accrue
    const lines = [
      {
        accountId: salaryExpAccId,
        debit: gross || net,
        credit: 0,
        description: `Gross Salary for month ${period.month}/${period.year}`,
        reference: period.payrollNumber,
      },
      {
        accountId: period.status === 'PAID' ? bankAccId : salaryPayableAccId,
        debit: 0,
        credit: gross || net,
        description: `Salary payable/disbursed for ${period.month}/${period.year}`,
        reference: period.payrollNumber,
      },
    ];

    const dto: CreateJournalEntryDto = {
      entryDate: period.periodEnd.toISOString(),
      referenceType: 'PAYROLL',
      referenceId: period.id,
      referenceNumber: period.payrollNumber,
      narration: `Payroll Posting for ${period.month}/${period.year} (${period.totalEmployees || 0} Staff)`,
      sourceModule: 'PAYROLL',
      sourceEntityId: period.id,
      status: 'POSTED',
      lines,
    };

    return this.journalService.createJournalEntry(dto, userId);
  }

  /**
   * Bulk Sync Routine: Syncs all unposted legacy/active transactions into the General Ledger.
   */
  async syncAllErpTransactions(userId?: string) {
    this.logger.log('Starting bulk ERP transaction sync to General Ledger...');
    let invoiceCount = 0;
    let paymentCount = 0;
    let vendorBillCount = 0;
    let expenseCount = 0;
    let payrollCount = 0;

    // Preload existing posted journals into key set
    const postedJournals = await this.prisma.journalEntry.findMany({
      where: { status: 'POSTED' },
      select: { sourceModule: true, sourceEntityId: true, referenceType: true },
    });
    const existingKeySet = new Set(
      postedJournals.map((j) => `${j.sourceModule}:${j.sourceEntityId}:${j.referenceType}`),
    );

    // 1. Invoices
    const invoices = await this.prisma.invoice.findMany({
      where: { grandTotal: { gt: 0 } },
      select: { id: true },
    });
    for (const inv of invoices) {
      if (existingKeySet.has(`INVOICES:${inv.id}:INVOICE`)) continue;
      try {
        const j = await this.postInvoiceJournal(inv.id, userId);
        if (j) {
          invoiceCount++;
          existingKeySet.add(`INVOICES:${inv.id}:INVOICE`);
        }
      } catch (e) {
        this.logger.warn(`Invoice ${inv.id} sync skipped/failed: ${e.message}`);
      }
    }

    // 2. Payments
    const payments = await this.prisma.payment.findMany({
      where: { amount: { gt: 0 } },
      select: { id: true },
    });
    for (const p of payments) {
      if (existingKeySet.has(`PAYMENTS:${p.id}:PAYMENT`)) continue;
      try {
        const j = await this.postPaymentJournal(p.id, userId);
        if (j) {
          paymentCount++;
          existingKeySet.add(`PAYMENTS:${p.id}:PAYMENT`);
        }
      } catch (e) {
        this.logger.warn(`Payment ${p.id} sync skipped/failed: ${e.message}`);
      }
    }

    // 3. Vendor Bills
    const bills = await this.prisma.vendorBill.findMany({
      where: { totalAmount: { gt: 0 } },
      select: { id: true },
    });
    for (const b of bills) {
      if (existingKeySet.has(`PAYABLES:${b.id}:VENDOR_BILL`)) continue;
      try {
        const j = await this.postVendorBillJournal(b.id, userId);
        if (j) {
          vendorBillCount++;
          existingKeySet.add(`PAYABLES:${b.id}:VENDOR_BILL`);
        }
      } catch (e) {
        this.logger.warn(`Vendor Bill ${b.id} sync skipped/failed: ${e.message}`);
      }
    }

    // 4. Expenses
    const expenses = await this.prisma.expense.findMany({
      where: { totalAmount: { gt: 0 } },
      select: { id: true },
    });
    for (const exp of expenses) {
      if (existingKeySet.has(`EXPENSES:${exp.id}:EXPENSE`)) continue;
      try {
        const j = await this.postExpenseJournal(exp.id, userId);
        if (j) {
          expenseCount++;
          existingKeySet.add(`EXPENSES:${exp.id}:EXPENSE`);
        }
      } catch (e) {
        this.logger.warn(`Expense ${exp.id} sync skipped/failed: ${e.message}`);
      }
    }

    // 5. Payroll
    const payrolls = await this.prisma.payrollPeriod.findMany({
      where: { status: { in: ['APPROVED', 'PAID', 'REVIEW', 'CALCULATED'] } },
      select: { id: true },
    });
    for (const pr of payrolls) {
      if (existingKeySet.has(`PAYROLL:${pr.id}:PAYROLL`)) continue;
      try {
        const j = await this.postPayrollJournal(pr.id, userId);
        if (j) {
          payrollCount++;
          existingKeySet.add(`PAYROLL:${pr.id}:PAYROLL`);
        }
      } catch (e) {
        this.logger.warn(`Payroll ${pr.id} sync skipped/failed: ${e.message}`);
      }
    }

    this.logger.log(
      `Bulk sync complete. Invoices: ${invoiceCount}, Payments: ${paymentCount}, Bills: ${vendorBillCount}, Expenses: ${expenseCount}, Payrolls: ${payrollCount}.`,
    );

    return {
      syncedCounts: {
        invoices: invoiceCount,
        payments: paymentCount,
        vendorBills: vendorBillCount,
        expenses: expenseCount,
        payrolls: payrollCount,
        totalSyncedJournals: invoiceCount + paymentCount + vendorBillCount + expenseCount + payrollCount,
      },
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    };
  }
}
