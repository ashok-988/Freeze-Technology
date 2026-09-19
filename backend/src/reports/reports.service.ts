import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // 1. DATE RANGE ENGINE (Server-Authoritative, Asia/Kolkata)
  // -------------------------------------------------------------
  public parseDateRange(query: ReportQueryDto): {
    startDate: Date;
    endDate: Date;
    prevStartDate: Date;
    prevEndDate: Date;
    label: string;
  } {
    const now = new Date();
    const range = (query.range || 'this_month').toLowerCase();

    let startDate: Date;
    let endDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;
    let label = 'Custom Period';

    if (query.from && query.to) {
      startDate = new Date(`${query.from}T00:00:00.000Z`);
      endDate = new Date(`${query.to}T23:59:59.999Z`);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
      }
      if (startDate > endDate) {
        throw new BadRequestException('"from" date must be earlier than or equal to "to" date.');
      }
      const diffMs = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(prevEndDate.getTime() - diffMs);
      label = `${query.from} to ${query.to}`;
      return { startDate, endDate, prevStartDate, prevEndDate, label };
    }

    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    const dayOfWeek = now.getDay(); // 0 = Sun

    switch (range) {
      case 'today': {
        startDate = new Date(year, month, date, 0, 0, 0, 0);
        endDate = new Date(year, month, date, 23, 59, 59, 999);
        prevStartDate = new Date(year, month, date - 1, 0, 0, 0, 0);
        prevEndDate = new Date(year, month, date - 1, 23, 59, 59, 999);
        label = `Today (${now.toLocaleDateString('en-GB')})`;
        break;
      }
      case 'yesterday': {
        startDate = new Date(year, month, date - 1, 0, 0, 0, 0);
        endDate = new Date(year, month, date - 1, 23, 59, 59, 999);
        prevStartDate = new Date(year, month, date - 2, 0, 0, 0, 0);
        prevEndDate = new Date(year, month, date - 2, 23, 59, 59, 999);
        label = `Yesterday (${startDate.toLocaleDateString('en-GB')})`;
        break;
      }
      case 'this_week': {
        const startDay = date - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Mon
        startDate = new Date(year, month, startDay, 0, 0, 0, 0);
        endDate = new Date(year, month, startDay + 6, 23, 59, 59, 999);
        prevStartDate = new Date(year, month, startDay - 7, 0, 0, 0, 0);
        prevEndDate = new Date(year, month, startDay - 1, 23, 59, 59, 999);
        label = 'This Week';
        break;
      }
      case 'prev_month': {
        startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
        prevStartDate = new Date(year, month - 2, 1, 0, 0, 0, 0);
        prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);
        label = startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        break;
      }
      case 'this_quarter': {
        const qMonth = Math.floor(month / 3) * 3;
        startDate = new Date(year, qMonth, 1, 0, 0, 0, 0);
        endDate = new Date(year, qMonth + 3, 0, 23, 59, 59, 999);
        prevStartDate = new Date(year, qMonth - 3, 1, 0, 0, 0, 0);
        prevEndDate = new Date(year, qMonth, 0, 23, 59, 59, 999);
        label = `Q${Math.floor(month / 3) + 1} ${year}`;
        break;
      }
      case 'this_fy': {
        // Indian Financial Year: April 1 to March 31
        const fyStartYear = month >= 3 ? year : year - 1;
        startDate = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
        endDate = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
        prevStartDate = new Date(fyStartYear - 1, 3, 1, 0, 0, 0, 0);
        prevEndDate = new Date(fyStartYear, 2, 31, 23, 59, 59, 999);
        label = `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
        break;
      }
      case 'this_month':
      default: {
        startDate = new Date(year, month, 1, 0, 0, 0, 0);
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        prevStartDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        prevEndDate = new Date(year, month, 0, 23, 59, 59, 999);
        label = startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        break;
      }
    }

    return { startDate, endDate, prevStartDate, prevEndDate, label };
  }

  // -------------------------------------------------------------
  // 2. MANAGEMENT DASHBOARD & EXECUTIVE KPIS
  // -------------------------------------------------------------
  async getDashboard(query: ReportQueryDto) {
    const { startDate, endDate, prevStartDate, prevEndDate, label } = this.parseDateRange(query);

    // Fault-Isolated Domain Metric Aggregation
    // 1. Invoices & Revenue
    let invoices: any[] = [];
    let prevInvoices: any[] = [];
    let revenueError: string | null = null;
    try {
      [invoices, prevInvoices] = await Promise.all([
        this.prisma.invoice.findMany({
          where: { invoiceDate: { gte: startDate, lte: endDate }, deletedAt: null },
        }),
        this.prisma.invoice.findMany({
          where: { invoiceDate: { gte: prevStartDate, lte: prevEndDate }, deletedAt: null },
        }),
      ]);
    } catch (e: any) {
      revenueError = e.message || 'Unable to calculate revenue';
    }

    // 2. Payments & Collections
    let payments: any[] = [];
    let prevPayments: any[] = [];
    let collectionsError: string | null = null;
    try {
      [payments, prevPayments] = await Promise.all([
        this.prisma.payment.findMany({
          where: { paymentDate: { gte: startDate, lte: endDate } },
        }),
        this.prisma.payment.findMany({
          where: { paymentDate: { gte: prevStartDate, lte: prevEndDate } },
        }),
      ]);
    } catch (e: any) {
      collectionsError = e.message || 'Unable to calculate collections';
    }

    // 3. Open Invoices (Receivables)
    let allOpenInvoices: any[] = [];
    let receivablesError: string | null = null;
    try {
      allOpenInvoices = await this.prisma.invoice.findMany({
        where: { deletedAt: null, paymentStatus: { not: 'Paid' } },
      });
    } catch (e: any) {
      receivablesError = e.message || 'Unable to calculate receivables';
    }

    // 4. Vendor Bills & Purchases (Payables)
    let vendorBills: any[] = [];
    let allOpenBills: any[] = [];
    let purchaseOrders: any[] = [];
    let payablesError: string | null = null;
    try {
      [vendorBills, allOpenBills, purchaseOrders] = await Promise.all([
        this.prisma.vendorBill.findMany({
          where: { billDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
        }),
        this.prisma.vendorBill.findMany({
          where: { status: { not: 'CANCELLED' }, balanceAmount: { gt: 0 } },
        }),
        this.prisma.purchaseOrder.findMany({
          where: { purchaseDate: { gte: startDate, lte: endDate }, status: { not: 'Cancelled' } },
        }),
      ]);
    } catch (e: any) {
      payablesError = e.message || 'Unable to calculate payables';
    }

    // 5. Operating Expenses
    let expenses: any[] = [];
    let expensesError: string | null = null;
    try {
      expenses = await this.prisma.expense.findMany({
        where: {
          expenseDate: { gte: startDate, lte: endDate },
          status: { notIn: ['REJECTED', 'CANCELLED'] },
        },
      });
    } catch (e: any) {
      expensesError = e.message || 'Unable to calculate expenses';
    }

    // 6. Payroll
    let payrollPeriods: any[] = [];
    let payrollError: string | null = null;
    try {
      payrollPeriods = await this.prisma.payrollPeriod.findMany({
        where: {
          periodStart: { lte: endDate },
          periodEnd: { gte: startDate },
          status: { not: 'CANCELLED' },
        },
      });
    } catch (e: any) {
      payrollError = e.message || 'Unable to calculate payroll';
    }

    // 7. Inventory & Products
    let products: any[] = [];
    let inventoryError: string | null = null;
    try {
      products = await this.prisma.product.findMany({ where: { deletedAt: null } });
    } catch (e: any) {
      inventoryError = e.message || 'Unable to calculate inventory value';
    }

    // 8. Field Operations & Services
    let complaints: any[] = [];
    let jobCards: any[] = [];
    let amcContracts: any[] = [];
    let installations: any[] = [];
    try {
      [complaints, jobCards, amcContracts, installations] = await Promise.all([
        this.prisma.complaint.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        this.prisma.jobCard.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        this.prisma.aMCContract.findMany(),
        this.prisma.installation.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
      ]);
    } catch (e: any) {
      // Fallback empty operations
    }

    // Metric Calculations
    const totalRevenue = revenueError ? null : Number(invoices.reduce((s, i) => s + (i.grandTotal || 0), 0).toFixed(2));
    const prevTotalRevenue = Number(prevInvoices.reduce((s, i) => s + (i.grandTotal || 0), 0).toFixed(2));
    const revenueGrowth = prevTotalRevenue > 0 && totalRevenue !== null
      ? Number((((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100).toFixed(1))
      : (totalRevenue && totalRevenue > 0) ? 100 : 0;

    const totalCollections = collectionsError ? null : Number(payments.reduce((s, p) => s + (p.amount || 0), 0).toFixed(2));
    const prevCollections = Number(prevPayments.reduce((s, p) => s + (p.amount || 0), 0).toFixed(2));
    const collectionsGrowth = prevCollections > 0 && totalCollections !== null
      ? Number((((totalCollections - prevCollections) / prevCollections) * 100).toFixed(1))
      : (totalCollections && totalCollections > 0) ? 100 : 0;

    const totalInvoicesSubtotal = Number(invoices.reduce((s, i) => s + (i.subtotal || 0), 0).toFixed(2));
    const totalOutputGst = Number(invoices.reduce((s, i) => s + (i.gstAmount || 0), 0).toFixed(2));

    const totalBillsValue = Number(vendorBills.reduce((s, b) => s + (b.totalAmount || 0), 0).toFixed(2));
    const totalBillsTax = Number(vendorBills.reduce((s, b) => s + (b.taxAmount || 0), 0).toFixed(2));

    const totalExpenses = expensesError ? null : Number(expenses.reduce((s, e) => s + (e.totalAmount || 0), 0).toFixed(2));
    const totalExpenseTax = Number(expenses.reduce((s, e) => s + (e.taxAmount || 0), 0).toFixed(2));

    const totalInputGst = Number((totalBillsTax + totalExpenseTax).toFixed(2));
    const netGstLiability = Number((totalOutputGst - totalInputGst).toFixed(2));

    const totalPayroll = payrollError ? null : Number(payrollPeriods.reduce((s, p) => s + (p.totalNetSalary || 0), 0).toFixed(2));

    const outstandingReceivables = receivablesError ? null : Number(
      allOpenInvoices.reduce((s, i) => s + ((i.grandTotal || 0) - (i.paymentStatus === 'Paid' ? (i.grandTotal || 0) : 0)), 0).toFixed(2),
    );
    const outstandingPayables = payablesError ? null : Number(allOpenBills.reduce((s, b) => s + (b.balanceAmount || 0), 0).toFixed(2));

    const inventoryValuation = inventoryError ? null : Number(
      products.reduce((s, p) => s + (p.stockQuantity || 0) * (p.purchasePrice || 0), 0).toFixed(2),
    );
    const lowStockCount = products.filter((p) => (p.stockQuantity || 0) <= 5).length;
    const outOfStockCount = products.filter((p) => (p.stockQuantity || 0) <= 0).length;

    const cogs = totalBillsValue || Number(purchaseOrders.reduce((s, p) => s + (p.totalAmount || 0), 0).toFixed(2));
    const grossProfit = totalRevenue !== null ? Number((totalRevenue - cogs).toFixed(2)) : null;
    const grossMarginPercent = (totalRevenue && totalRevenue > 0 && grossProfit !== null)
      ? Number(((grossProfit / totalRevenue) * 100).toFixed(1))
      : 0;
    const netOperatingResult = (grossProfit !== null && totalExpenses !== null && totalPayroll !== null)
      ? Number((grossProfit - totalExpenses - totalPayroll).toFixed(2))
      : null;

    const activeJobCards = jobCards.filter((j) => ['Assigned', 'In Progress', 'Pending'].includes(j.status)).length;
    const completedJobCards = jobCards.filter((j) => j.status === 'Completed').length;
    const activeAmcCount = amcContracts.filter((a) => a.status === 'Active').length;
    const scheduledInstallations = installations.filter((i) => ['Assigned', 'Scheduled', 'In Progress'].includes(i.installationStatus)).length;

    return {
      success: true,
      periodLabel: label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      kpis: {
        // Primary and canonical naming
        totalRevenue: totalRevenue ?? 0,
        revenue: totalRevenue ?? 0,
        revenueGrowth,
        totalCollections: totalCollections ?? 0,
        collections: totalCollections ?? 0,
        collectionsGrowth,
        outstandingReceivables: outstandingReceivables ?? 0,
        receivables: outstandingReceivables ?? 0,
        outstandingPayables: outstandingPayables ?? 0,
        payables: outstandingPayables ?? 0,
        purchaseValue: cogs,
        totalExpenses: totalExpenses ?? 0,
        expenses: totalExpenses ?? 0,
        payrollCost: totalPayroll ?? 0,
        payroll: totalPayroll ?? 0,
        grossMargin: grossProfit ?? 0,
        grossMarginPercent,
        inventoryValuation: inventoryValuation ?? 0,
        inventory: inventoryValuation ?? 0,
        totalSkus: products.length,
        lowStockCount,
        outOfStockCount,
        outputGst: totalOutputGst,
        inputGst: totalInputGst,
        netGstLiability,
        netGst: netGstLiability,
        totalInvoicesCount: invoices.length,
        totalPaymentsCount: payments.length,
        errors: {
          revenue: revenueError,
          collections: collectionsError,
          receivables: receivablesError,
          payables: payablesError,
          expenses: expensesError,
          payroll: payrollError,
          inventory: inventoryError,
        },
      },
      financials: {
        grossRevenue: totalRevenue ?? 0,
        cogs,
        grossProfit: grossProfit ?? 0,
        grossMarginPercent,
        operatingExpenses: totalExpenses ?? 0,
        payrollCost: totalPayroll ?? 0,
        netResult: netOperatingResult ?? 0,
      },
      gst: {
        outputTax: totalOutputGst,
        inputTax: totalBillsTax,
        expenseInputTax: totalExpenseTax,
        totalInputTax: totalInputGst,
        netPayable: netGstLiability,
      },
      operations: {
        activeJobCards,
        completedJobCards,
        totalComplaints: complaints.length,
        activeAmcCount,
        totalAmcContracts: amcContracts.length,
        scheduledInstallations,
        totalInstallations: installations.length,
      },
    };
  }

  // -------------------------------------------------------------
  // 3. SALES & REVENUE REPORT
  // -------------------------------------------------------------
  async getSalesReport(query: ReportQueryDto) {
    const { startDate, endDate, label } = this.parseDateRange(query);
    const { customerId, status, search } = query;

    const where: any = {
      invoiceDate: { gte: startDate, lte: endDate },
      deletedAt: null,
    };

    if (customerId && customerId !== 'All') {
      where.customerId = customerId;
    }

    if (status && status !== 'All') {
      where.paymentStatus = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { customer: { customerName: { contains: q, mode: 'insensitive' } } },
        { customer: { companyName: { contains: q, mode: 'insensitive' } } },
        { customer: { mobile: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const totalGrandTotal = Number(invoices.reduce((s, i) => s + i.grandTotal, 0).toFixed(2));
    const totalSubtotal = Number(invoices.reduce((s, i) => s + i.subtotal, 0).toFixed(2));
    const totalGst = Number(invoices.reduce((s, i) => s + i.gstAmount, 0).toFixed(2));
    const totalDiscount = Number(invoices.reduce((s, i) => s + i.discount, 0).toFixed(2));

    // Calculate Paid and Outstanding per invoice
    const formattedInvoices = invoices.map((inv) => {
      const paid = Number(inv.payments.reduce((s, p) => s + p.amount, 0).toFixed(2));
      const outstanding = Number(Math.max(0, inv.grandTotal - paid).toFixed(2));
      return {
        ...inv,
        paidAmount: paid,
        balanceAmount: outstanding,
      };
    });

    const totalPaid = Number(formattedInvoices.reduce((s, i) => s + i.paidAmount, 0).toFixed(2));
    const totalOutstanding = Number(formattedInvoices.reduce((s, i) => s + i.balanceAmount, 0).toFixed(2));

    return {
      success: true,
      periodLabel: label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalInvoices: invoices.length,
        totalGrandTotal,
        totalSubtotal,
        totalGst,
        totalDiscount,
        totalPaid,
        totalOutstanding,
      },
      items: formattedInvoices,
    };
  }

  // -------------------------------------------------------------
  // 4. RECEIVABLES & CUSTOMER AGING REPORT
  // -------------------------------------------------------------
  async getReceivablesReport(query: ReportQueryDto) {
    const { startDate, endDate, label } = this.parseDateRange(query);
    const { search } = query;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        deletedAt: null,
        paymentStatus: { not: 'Paid' },
      },
      include: {
        customer: true,
        payments: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const now = new Date();
    const customerMap = new Map<string, any>();

    let totalReceivables = 0;
    let currentTotal = 0;
    let days1to30Total = 0;
    let days31to60Total = 0;
    let days61to90Total = 0;
    let days90plusTotal = 0;

    for (const inv of invoices) {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const balance = Number(Math.max(0, inv.grandTotal - paid).toFixed(2));

      if (balance <= 0) continue;

      const dueDate = new Date(inv.invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days credit default
      const diffMs = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      totalReceivables += balance;

      if (!customerMap.has(inv.customerId)) {
        customerMap.set(inv.customerId, {
          customerId: inv.customerId,
          customerName: inv.customer?.companyName || inv.customer?.customerName || 'Customer',
          customerCode: inv.customer?.customerCode || 'CUST',
          mobile: inv.customer?.mobile || '-',
          email: inv.customer?.email || '',
          openInvoicesCount: 0,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          days90plus: 0,
          totalOutstanding: 0,
        });
      }

      const entry = customerMap.get(inv.customerId);
      entry.openInvoicesCount += 1;
      entry.totalOutstanding += balance;

      if (daysOverdue <= 0) {
        entry.current += balance;
        currentTotal += balance;
      } else if (daysOverdue <= 30) {
        entry.days1to30 += balance;
        days1to30Total += balance;
      } else if (daysOverdue <= 60) {
        entry.days31to60 += balance;
        days31to60Total += balance;
      } else if (daysOverdue <= 90) {
        entry.days61to90 += balance;
        days61to90Total += balance;
      } else {
        entry.days90plus += balance;
        days90plusTotal += balance;
      }
    }

    let customerAging = Array.from(customerMap.values()).map((c) => ({
      ...c,
      current: Number(c.current.toFixed(2)),
      days1to30: Number(c.days1to30.toFixed(2)),
      days31to60: Number(c.days31to60.toFixed(2)),
      days61to90: Number(c.days61to90.toFixed(2)),
      days90plus: Number(c.days90plus.toFixed(2)),
      totalOutstanding: Number(c.totalOutstanding.toFixed(2)),
    }));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      customerAging = customerAging.filter(
        (c) =>
          c.customerName?.toLowerCase().includes(q) ||
          c.customerCode?.toLowerCase().includes(q) ||
          c.mobile?.includes(q),
      );
    }

    customerAging.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    return {
      success: true,
      periodLabel: label,
      summary: {
        totalReceivables: Number(totalReceivables.toFixed(2)),
        current: Number(currentTotal.toFixed(2)),
        days1to30: Number(days1to30Total.toFixed(2)),
        days31to60: Number(days31to60Total.toFixed(2)),
        days61to90: Number(days61to90Total.toFixed(2)),
        days90plus: Number(days90plusTotal.toFixed(2)),
        totalCustomersWithDues: customerAging.length,
      },
      customerAging,
    };
  }

  // -------------------------------------------------------------
  // 5. PROCUREMENT & PURCHASE ORDERS REPORT
  // -------------------------------------------------------------
  async getProcurementReport(query: ReportQueryDto) {
    const { startDate, endDate, label } = this.parseDateRange(query);
    const { supplierId, status, search } = query;

    const where: any = {
      purchaseDate: { gte: startDate, lte: endDate },
    };

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
        { supplier: { companyName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const pos = await this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    const totalPoValue = Number(pos.reduce((s, p) => s + p.totalAmount, 0).toFixed(2));
    const approvedPoValue = Number(
      pos.filter((p) => ['Approved', 'Received', 'Partially Received'].includes(p.status))
        .reduce((s, p) => s + p.totalAmount, 0)
        .toFixed(2),
    );
    const receivedPoValue = Number(
      pos.filter((p) => p.status === 'Received')
        .reduce((s, p) => s + p.totalAmount, 0)
        .toFixed(2),
    );
    const pendingPoValue = Number(
      pos.filter((p) => ['Draft', 'Submitted'].includes(p.status))
        .reduce((s, p) => s + p.totalAmount, 0)
        .toFixed(2),
    );
    const cancelledPoValue = Number(
      pos.filter((p) => p.status === 'Cancelled')
        .reduce((s, p) => s + p.totalAmount, 0)
        .toFixed(2),
    );

    return {
      success: true,
      periodLabel: label,
      summary: {
        totalCount: pos.length,
        totalPoValue,
        approvedPoValue,
        receivedPoValue,
        pendingPoValue,
        cancelledPoValue,
      },
      items: pos,
    };
  }

  // -------------------------------------------------------------
  // 6. ACCOUNTS PAYABLE & SUPPLIER AGING REPORT
  // -------------------------------------------------------------
  async getPayablesReport(query: ReportQueryDto) {
    const { label } = this.parseDateRange(query);
    const { search } = query;

    const openBills = await this.prisma.vendorBill.findMany({
      where: {
        status: { not: 'CANCELLED' },
        balanceAmount: { gt: 0 },
      },
      include: {
        supplier: true,
        purchaseOrder: true,
        allocations: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const supplierMap = new Map<string, any>();

    let totalPayables = 0;
    let currentTotal = 0;
    let days1to30Total = 0;
    let days31to60Total = 0;
    let days61to90Total = 0;
    let days90plusTotal = 0;

    for (const bill of openBills) {
      const bal = bill.balanceAmount;
      if (bal <= 0) continue;

      const diffMs = now.getTime() - new Date(bill.dueDate).getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      totalPayables += bal;

      if (!supplierMap.has(bill.supplierId)) {
        supplierMap.set(bill.supplierId, {
          supplierId: bill.supplierId,
          supplierName: bill.supplier?.companyName || 'Supplier',
          supplierCode: bill.supplier?.supplierCode || 'SUP',
          contactPerson: bill.supplier?.contactPerson || '',
          phone: bill.supplier?.phone || '',
          openBillsCount: 0,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          days90plus: 0,
          totalOutstanding: 0,
        });
      }

      const entry = supplierMap.get(bill.supplierId);
      entry.totalOutstanding += bal;
      entry.openBillsCount += 1;

      if (daysOverdue <= 0) {
        entry.current += bal;
        currentTotal += bal;
      } else if (daysOverdue <= 30) {
        entry.days1to30 += bal;
        days1to30Total += bal;
      } else if (daysOverdue <= 60) {
        entry.days31to60 += bal;
        days31to60Total += bal;
      } else if (daysOverdue <= 90) {
        entry.days61to90 += bal;
        days61to90Total += bal;
      } else {
        entry.days90plus += bal;
        days90plusTotal += bal;
      }
    }

    let supplierAging = Array.from(supplierMap.values()).map((s) => ({
      ...s,
      current: Number(s.current.toFixed(2)),
      days1to30: Number(s.days1to30.toFixed(2)),
      days31to60: Number(s.days31to60.toFixed(2)),
      days61to90: Number(s.days61to90.toFixed(2)),
      days90plus: Number(s.days90plus.toFixed(2)),
      totalOutstanding: Number(s.totalOutstanding.toFixed(2)),
    }));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      supplierAging = supplierAging.filter(
        (s) =>
          s.supplierName?.toLowerCase().includes(q) ||
          s.supplierCode?.toLowerCase().includes(q) ||
          s.phone?.includes(q),
      );
    }

    supplierAging.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    return {
      success: true,
      periodLabel: label,
      summary: {
        totalPayables: Number(totalPayables.toFixed(2)),
        current: Number(currentTotal.toFixed(2)),
        days1to30: Number(days1to30Total.toFixed(2)),
        days31to60: Number(days31to60Total.toFixed(2)),
        days61to90: Number(days61to90Total.toFixed(2)),
        days90plus: Number(days90plusTotal.toFixed(2)),
        totalSuppliersWithDues: supplierAging.length,
      },
      supplierAging,
      openBills,
    };
  }

  // -------------------------------------------------------------
  // 7. OPERATING EXPENSE REPORT
  // -------------------------------------------------------------
  async getExpenseReport(query: ReportQueryDto) {
    const { startDate, endDate, label } = this.parseDateRange(query);
    const { categoryId, status, search } = query;

    const where: any = {
      expenseDate: { gte: startDate, lte: endDate },
      status: { notIn: ['REJECTED', 'CANCELLED'] },
    };

    if (categoryId && categoryId !== 'All') {
      where.categoryId = categoryId;
    }

    if (status && status !== 'All') {
      where.paymentStatus = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { expenseNumber: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        category: true,
        supplier: true,
        employee: true,
        allocations: true,
      },
      orderBy: { expenseDate: 'desc' },
    });

    const totalExpenses = Number(expenses.reduce((s, e) => s + e.totalAmount, 0).toFixed(2));
    const totalSubtotal = Number(expenses.reduce((s, e) => s + e.subtotal, 0).toFixed(2));
    const totalTax = Number(expenses.reduce((s, e) => s + e.taxAmount, 0).toFixed(2));
    const totalPaid = Number(expenses.reduce((s, e) => s + e.paidAmount, 0).toFixed(2));
    const totalBalance = Number(expenses.reduce((s, e) => s + e.balanceAmount, 0).toFixed(2));

    // Category Breakdown
    const catMap = new Map<string, number>();
    expenses.forEach((e) => {
      const cName = e.category?.name || 'General';
      catMap.set(cName, (catMap.get(cName) || 0) + e.totalAmount);
    });

    const categoryBreakdown = Array.from(catMap.entries()).map(([name, amount]) => ({
      name,
      amount: Number(amount.toFixed(2)),
      percentage: totalExpenses > 0 ? Number(((amount / totalExpenses) * 100).toFixed(1)) : 0,
    }));

    return {
      success: true,
      periodLabel: label,
      summary: {
        totalCount: expenses.length,
        totalExpenses,
        totalSubtotal,
        totalTax,
        totalPaid,
        totalBalance,
      },
      categoryBreakdown,
      items: expenses,
    };
  }

  // -------------------------------------------------------------
  // 8. INVENTORY VALUATION & STOCK REPORT
  // -------------------------------------------------------------
  async getInventoryReport(query: ReportQueryDto) {
    const { label } = this.parseDateRange(query);
    const { categoryId, brandId, search } = query;

    const where: any = { deletedAt: null };

    if (categoryId && categoryId !== 'All') {
      where.categoryId = categoryId;
    }

    if (brandId && brandId !== 'All') {
      where.brandId = brandId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { productName: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [products, stockMovements] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          inventory: true,
        },
        orderBy: { stockQuantity: 'asc' },
      }),
      this.prisma.stockMovement.findMany({
        take: 50,
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalValuation = Number(
      products.reduce((s, p) => s + (p.stockQuantity || 0) * (p.purchasePrice || 0), 0).toFixed(2),
    );
    const totalUnits = products.reduce((s, p) => s + (p.stockQuantity || 0), 0);
    const lowStockCount = products.filter((p) => (p.stockQuantity || 0) <= 5).length;
    const outOfStockCount = products.filter((p) => (p.stockQuantity || 0) <= 0).length;

    return {
      success: true,
      periodLabel: label,
      summary: {
        totalSkus: products.length,
        totalUnits,
        totalValuation,
        lowStockCount,
        outOfStockCount,
      },
      items: products,
      recentMovements: stockMovements,
    };
  }

  // -------------------------------------------------------------
  // 9. GST ANALYTICS & STATUTORY COMPUTATION
  // -------------------------------------------------------------
  async getGstSummary(query: ReportQueryDto) {
    const { startDate, endDate, label } = this.parseDateRange(query);

    const [invoices, vendorBills, expenses] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { invoiceDate: { gte: startDate, lte: endDate }, deletedAt: null },
        include: { customer: true, items: true },
      }),
      this.prisma.vendorBill.findMany({
        where: {
          billDate: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' },
        },
        include: { supplier: true, items: true },
      }),
      this.prisma.expense.findMany({
        where: {
          expenseDate: { gte: startDate, lte: endDate },
          status: { notIn: ['REJECTED', 'CANCELLED'] },
        },
        include: { category: true, supplier: true },
      }),
    ]);

    // Outward GST (Sales Invoices)
    const outwardTaxable = Number(invoices.reduce((s, i) => s + i.subtotal, 0).toFixed(2));
    const outwardGst = Number(invoices.reduce((s, i) => s + i.gstAmount, 0).toFixed(2));
    const outwardCgst = Number((outwardGst / 2).toFixed(2));
    const outwardSgst = Number((outwardGst / 2).toFixed(2));
    const outwardIgst = 0; // Intra-state Tamil Nadu POS

    // Inward GST (Vendor Bills)
    const inwardBillsTaxable = Number(vendorBills.reduce((s, b) => s + b.subtotal, 0).toFixed(2));
    const inwardBillsTax = Number(vendorBills.reduce((s, b) => s + b.taxAmount, 0).toFixed(2));
    const inwardBillsCgst = Number((inwardBillsTax / 2).toFixed(2));
    const inwardBillsSgst = Number((inwardBillsTax / 2).toFixed(2));
    const inwardBillsIgst = 0;

    // Inward GST (Operating Expenses)
    const inwardExpenseTaxable = Number(expenses.reduce((s, e) => s + e.subtotal, 0).toFixed(2));
    const inwardExpenseTax = Number(expenses.reduce((s, e) => s + e.taxAmount, 0).toFixed(2));
    const inwardExpenseCgst = Number((inwardExpenseTax / 2).toFixed(2));
    const inwardExpenseSgst = Number((inwardExpenseTax / 2).toFixed(2));
    const inwardExpenseIgst = 0;

    // Total Input Tax Credit
    const totalInputTax = Number((inwardBillsTax + inwardExpenseTax).toFixed(2));
    const totalInputCgst = Number((inwardBillsCgst + inwardExpenseCgst).toFixed(2));
    const totalInputSgst = Number((inwardBillsSgst + inwardExpenseSgst).toFixed(2));
    const totalInputIgst = 0;

    // Net Estimated GST Liability
    const netGstLiability = Number((outwardGst - totalInputTax).toFixed(2));
    const netCgst = Number((outwardCgst - totalInputCgst).toFixed(2));
    const netSgst = Number((outwardSgst - totalInputSgst).toFixed(2));
    const netIgst = 0;

    // Outward Invoices Breakdown (B2B vs B2C)
    const outwardInvoices = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customerName: inv.customer?.companyName || inv.customer?.customerName || 'Customer',
      gstin: inv.customer?.gstNumber || '',
      isB2B: !!(inv.customer?.gstNumber && inv.customer.gstNumber.trim().length >= 10),
      placeOfSupply: '33-Tamil Nadu',
      taxableValue: inv.subtotal,
      taxRate: 18,
      cgst: Number((inv.gstAmount / 2).toFixed(2)),
      sgst: Number((inv.gstAmount / 2).toFixed(2)),
      igst: 0,
      gstAmount: inv.gstAmount,
      totalValue: inv.grandTotal,
    }));

    // Inward Purchases Breakdown
    const inwardPurchases = [
      ...vendorBills.map((b) => ({
        id: b.id,
        refNumber: b.billNumber,
        vendorInvoiceNumber: b.vendorInvoiceNumber || '-',
        type: 'VENDOR_BILL',
        date: b.billDate,
        partyName: b.supplier?.companyName || 'Vendor',
        partyGstin: b.supplier?.gstNumber || b.gstNumber || '',
        taxableValue: b.subtotal,
        cgst: Number((b.taxAmount / 2).toFixed(2)),
        sgst: Number((b.taxAmount / 2).toFixed(2)),
        igst: 0,
        taxAmount: b.taxAmount,
        totalValue: b.totalAmount,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        refNumber: e.expenseNumber,
        vendorInvoiceNumber: e.referenceNumber || '-',
        type: 'EXPENSE',
        date: e.expenseDate,
        partyName: e.supplier?.companyName || e.category?.name || 'General Expense',
        partyGstin: e.supplier?.gstNumber || '',
        taxableValue: e.subtotal,
        cgst: Number((e.taxAmount / 2).toFixed(2)),
        sgst: Number((e.taxAmount / 2).toFixed(2)),
        igst: 0,
        taxAmount: e.taxAmount,
        totalValue: e.totalAmount,
      })),
    ];

    return {
      success: true,
      periodLabel: label,
      summary: {
        outwardTaxable,
        outwardCgst,
        outwardSgst,
        outwardIgst,
        totalOutputTax: outwardGst,
        inwardBillsTaxable,
        inwardBillsTax,
        inwardBillsCgst,
        inwardBillsSgst,
        inwardBillsIgst,
        inwardExpenseTaxable,
        inwardExpenseTax,
        inwardExpenseCgst,
        inwardExpenseSgst,
        inwardExpenseIgst,
        totalInputTax,
        totalInputCgst,
        totalInputSgst,
        totalInputIgst,
        netGstLiability,
        netCgst,
        netSgst,
        netIgst,
      },
      outwardInvoices,
      inwardPurchases,
    };
  }

  // -------------------------------------------------------------
  // 10. OPERATIONS & FIELD SERVICES REPORT
  // -------------------------------------------------------------
  async getOperationsReport(query: ReportQueryDto) {
    const { startDate, endDate, label } = this.parseDateRange(query);

    const [complaints, jobCards, amcContracts, amcVisits, installations, employees] =
      await Promise.all([
        this.prisma.complaint.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          include: { customer: true, product: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.jobCard.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          include: {
            complaint: { include: { customer: true, product: true } },
            technician: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.aMCContract.findMany({
          include: { customer: true, product: true },
        }),
        this.prisma.aMCVisit.findMany({
          where: { scheduledDate: { gte: startDate, lte: endDate } },
          include: { amcContract: { include: { customer: true } }, technician: true },
        }),
        this.prisma.installation.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          include: { customer: true, product: true, technician: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.employee.findMany({ where: { deletedAt: null } }),
      ]);

    const completedJobs = jobCards.filter((j) => j.status === 'Completed').length;
    const pendingJobs = jobCards.filter((j) => ['Assigned', 'In Progress', 'Pending'].includes(j.status)).length;
    const activeAmc = amcContracts.filter((a) => a.status === 'Active').length;
    const expiringAmc = amcContracts.filter((a) => a.status === 'Expiring Soon').length;
    const completedInstallations = installations.filter((i) => i.installationStatus === 'Completed').length;
    const pendingInstallations = installations.filter((i) => i.installationStatus !== 'Completed').length;

    return {
      success: true,
      periodLabel: label,
      summary: {
        totalComplaints: complaints.length,
        totalJobCards: jobCards.length,
        completedJobs,
        pendingJobs,
        activeAmc,
        expiringAmc,
        totalAmcVisits: amcVisits.length,
        completedInstallations,
        pendingInstallations,
        totalTechnicians: employees.filter((e) => e.designation?.toLowerCase().includes('technician')).length,
      },
      jobCards,
      amcContracts,
      installations,
    };
  }

  // -------------------------------------------------------------
  // 11. WORKFORCE & PAYROLL REPORT
  // -------------------------------------------------------------
  async getWorkforceReport(query: ReportQueryDto) {
    const { startDate, endDate, label } = this.parseDateRange(query);

    const [employees, attendanceList, payrollPeriods] = await Promise.all([
      this.prisma.employee.findMany({ where: { deletedAt: null } }),
      this.prisma.attendance.findMany({
        where: { attendanceDate: { gte: startDate, lte: endDate } },
        include: { employee: true },
      }),
      this.prisma.payrollPeriod.findMany({
        where: {
          periodStart: { lte: endDate },
          periodEnd: { gte: startDate },
          status: { not: 'CANCELLED' },
        },
        include: { records: true },
      }),
    ]);

    const activeEmployees = employees.filter((e) => e.status === 'ACTIVE').length;
    const technicians = employees.filter((e) => e.designation?.toLowerCase().includes('technician')).length;

    const presentCount = attendanceList.filter((a) => ['Present', 'On Duty'].includes(a.attendanceStatus)).length;
    const absentCount = attendanceList.filter((a) => a.attendanceStatus === 'Absent').length;
    const leaveCount = attendanceList.filter((a) => a.attendanceStatus === 'Leave').length;

    const attendanceRate = attendanceList.length > 0
      ? Number(((presentCount / attendanceList.length) * 100).toFixed(1))
      : 100;

    const totalGross = Number(payrollPeriods.reduce((s, p) => s + p.totalGrossSalary, 0).toFixed(2));
    const totalDeductions = Number(payrollPeriods.reduce((s, p) => s + p.totalDeductions, 0).toFixed(2));
    const totalNet = Number(payrollPeriods.reduce((s, p) => s + p.totalNetSalary, 0).toFixed(2));

    return {
      success: true,
      periodLabel: label,
      summary: {
        totalEmployees: employees.length,
        activeEmployees,
        technicians,
        attendanceRate,
        presentCount,
        absentCount,
        leaveCount,
        totalGrossPayroll: totalGross,
        totalDeductions,
        totalNetPayroll: totalNet,
        payrollRunsCount: payrollPeriods.length,
      },
      payrollPeriods,
    };
  }

  // -------------------------------------------------------------
  // 12. CSV EXPORT GENERATOR
  // -------------------------------------------------------------
  async generateCsv(reportType: string, query: ReportQueryDto): Promise<{ filename: string; csv: string }> {
    const sanitize = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    switch (reportType) {
      case 'sales': {
        const data = await this.getSalesReport(query);
        const headers = ['Invoice Number', 'Invoice Date', 'Customer Name', 'Mobile', 'GSTIN', 'Subtotal (Rs)', 'GST Amount (Rs)', 'Grand Total (Rs)', 'Paid Amount (Rs)', 'Balance Due (Rs)', 'Payment Status'];
        const rows = (data.items || []).map((inv: any) => [
          sanitize(inv.invoiceNumber),
          sanitize(new Date(inv.invoiceDate).toLocaleDateString('en-GB')),
          sanitize(inv.customer?.companyName || inv.customer?.customerName),
          sanitize(inv.customer?.mobile),
          sanitize(inv.customer?.gstNumber),
          inv.subtotal,
          inv.gstAmount,
          inv.grandTotal,
          inv.paidAmount,
          inv.balanceAmount,
          sanitize(inv.paymentStatus),
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return { filename: `report-sales-${Date.now()}.csv`, csv };
      }

      case 'receivables': {
        const data = await this.getReceivablesReport(query);
        const headers = ['Customer Code', 'Customer Name', 'Mobile', 'Open Invoices', 'Current (Rs)', '1-30 Days (Rs)', '31-60 Days (Rs)', '61-90 Days (Rs)', '90+ Days (Rs)', 'Total Outstanding (Rs)'];
        const rows = (data.customerAging || []).map((c: any) => [
          sanitize(c.customerCode),
          sanitize(c.customerName),
          sanitize(c.mobile),
          c.openInvoicesCount,
          c.current,
          c.days1to30,
          c.days31to60,
          c.days61to90,
          c.days90plus,
          c.totalOutstanding,
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return { filename: `report-receivables-${Date.now()}.csv`, csv };
      }

      case 'payables': {
        const data = await this.getPayablesReport(query);
        const headers = ['Supplier Code', 'Supplier Name', 'Contact Person', 'Phone', 'Open Bills', 'Current (Rs)', '1-30 Days (Rs)', '31-60 Days (Rs)', '61-90 Days (Rs)', '90+ Days (Rs)', 'Total Outstanding (Rs)'];
        const rows = (data.supplierAging || []).map((s: any) => [
          sanitize(s.supplierCode),
          sanitize(s.supplierName),
          sanitize(s.contactPerson),
          sanitize(s.phone),
          s.openBillsCount,
          s.current,
          s.days1to30,
          s.days31to60,
          s.days61to90,
          s.days90plus,
          s.totalOutstanding,
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return { filename: `report-payables-${Date.now()}.csv`, csv };
      }

      case 'procurement': {
        const data = await this.getProcurementReport(query);
        const headers = ['PO Number', 'Purchase Date', 'Supplier', 'Status', 'Payment Status', 'Subtotal (Rs)', 'GST (Rs)', 'Total Amount (Rs)'];
        const rows = (data.items || []).map((po: any) => [
          sanitize(po.poNumber),
          sanitize(new Date(po.purchaseDate).toLocaleDateString('en-GB')),
          sanitize(po.supplier?.companyName),
          sanitize(po.status),
          sanitize(po.paymentStatus),
          po.subtotal,
          po.gstAmount,
          po.totalAmount,
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return { filename: `report-procurement-${Date.now()}.csv`, csv };
      }

      case 'expenses': {
        const data = await this.getExpenseReport(query);
        const headers = ['Expense Number', 'Date', 'Category', 'Paid To', 'Description', 'Subtotal (Rs)', 'GST (Rs)', 'Total Amount (Rs)', 'Status', 'Payment Status'];
        const rows = (data.items || []).map((e: any) => [
          sanitize(e.expenseNumber),
          sanitize(new Date(e.expenseDate).toLocaleDateString('en-GB')),
          sanitize(e.category?.name),
          sanitize(e.supplier?.companyName || e.employee?.fullName || 'Direct'),
          sanitize(e.description),
          e.subtotal,
          e.taxAmount,
          e.totalAmount,
          sanitize(e.status),
          sanitize(e.paymentStatus),
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return { filename: `report-expenses-${Date.now()}.csv`, csv };
      }

      case 'inventory': {
        const data = await this.getInventoryReport(query);
        const headers = ['SKU', 'Product Name', 'Model', 'Category', 'Brand', 'Stock Quantity', 'Purchase Price (Rs)', 'Selling Price (Rs)', 'Total Valuation (Rs)'];
        const rows = (data.items || []).map((p: any) => [
          sanitize(p.sku),
          sanitize(p.productName),
          sanitize(p.model),
          sanitize(p.category?.categoryName),
          sanitize(p.brand?.brandName),
          p.stockQuantity,
          p.purchasePrice,
          p.sellingPrice,
          Number((p.stockQuantity * p.purchasePrice).toFixed(2)),
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return { filename: `report-inventory-${Date.now()}.csv`, csv };
      }

      case 'gst':
      default: {
        const data = await this.getGstSummary(query);
        const headers = ['Invoice / Ref #', 'Date', 'Type (B2B/B2C)', 'Party Name', 'Party GSTIN', 'Place of Supply', 'Taxable Value (Rs)', 'CGST (Rs)', 'SGST (Rs)', 'IGST (Rs)', 'Total GST (Rs)', 'Total Value (Rs)'];
        const rows = (data.outwardInvoices || []).map((inv: any) => [
          sanitize(inv.invoiceNumber),
          sanitize(new Date(inv.invoiceDate).toLocaleDateString('en-GB')),
          sanitize(inv.isB2B ? 'B2B' : 'B2C'),
          sanitize(inv.customerName),
          sanitize(inv.gstin),
          sanitize(inv.placeOfSupply),
          inv.taxableValue,
          inv.cgst,
          inv.sgst,
          inv.igst,
          inv.gstAmount,
          inv.totalValue,
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return { filename: `report-gst-outward-${Date.now()}.csv`, csv };
      }
    }
  }

  // -------------------------------------------------------------
  // 12. PHASE 15 — ASSETS, AMC & PREVENTIVE MAINTENANCE REPORTS
  // -------------------------------------------------------------
  async getAssetsReport(query: ReportQueryDto) {
    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [assets, stats] = await Promise.all([
      this.prisma.asset.findMany({
        where: { deletedAt: null },
        include: {
          customer: true,
          product: { include: { brand: true, category: true } },
          technician: true,
          amcContractAssets: { include: { amcContract: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.asset.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
    ]);

    const totalAssets = assets.length;
    const activeAssets = assets.filter((a) => a.status === 'ACTIVE').length;
    const underService = assets.filter((a) => a.status === 'UNDER_SERVICE').length;
    const breakdown = assets.filter((a) => a.status === 'BREAKDOWN').length;
    const inactive = assets.filter((a) => a.status === 'INACTIVE' || a.status === 'SCRAPPED').length;
    const amcCovered = assets.filter((a) => a.amcStatus === 'COVERED').length;
    const warrantyExpiring30 = assets.filter(
      (a) => a.warrantyEndDate && a.warrantyEndDate >= now && a.warrantyEndDate <= in30Days,
    ).length;

    // Group by Brand/Category
    const brandMap: Record<string, number> = {};
    const customerMap: Record<string, number> = {};
    for (const a of assets) {
      const b = a.brandName || a.product?.brand?.brandName || 'Generic';
      brandMap[b] = (brandMap[b] || 0) + 1;
      const c = a.customer?.customerName || 'Other';
      customerMap[c] = (customerMap[c] || 0) + 1;
    }

    return {
      summary: {
        totalAssets,
        activeAssets,
        underService,
        breakdown,
        inactive,
        amcCovered,
        warrantyExpiring30,
      },
      brandDistribution: Object.entries(brandMap).map(([brand, count]) => ({ brand, count })),
      customerDistribution: Object.entries(customerMap).map(([customer, count]) => ({ customer, count })),
      items: assets,
    };
  }

  async getAmcReport(query: ReportQueryDto) {
    const contracts = await this.prisma.aMCContract.findMany({
      include: {
        customer: true,
        product: true,
        assignedTechnician: true,
        coveredAssets: { include: { asset: true } },
        billingSchedules: { include: { invoice: { include: { payments: true } } } },
      },
      orderBy: { startDate: 'desc' },
    });

    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let totalContractValue = 0;
    let billedValue = 0;
    let collectedValue = 0;
    let activeContracts = 0;
    let expiring30Days = 0;
    let expiredContracts = 0;

    for (const c of contracts) {
      const isAct = c.status === 'Active';
      if (isAct) activeContracts++;
      if (c.endDate && c.endDate < now) expiredContracts++;
      else if (c.endDate && c.endDate >= now && c.endDate <= in30Days) expiring30Days++;

      totalContractValue += c.totalAmount || c.contractValue || 0;
      for (const bs of c.billingSchedules || []) {
        if (bs.status === 'INVOICED' && bs.invoice) {
          billedValue += bs.totalAmount || bs.invoice.grandTotal || 0;
          for (const p of bs.invoice.payments || []) {
            collectedValue += p.amount || 0;
          }
        }
      }
    }

    const unbilledValue = Math.max(0, totalContractValue - billedValue);
    const outstandingReceivables = Math.max(0, billedValue - collectedValue);

    return {
      summary: {
        totalContracts: contracts.length,
        activeContracts,
        expiring30Days,
        expiredContracts,
        totalContractValue,
        billedValue,
        collectedValue,
        unbilledValue,
        outstandingReceivables,
      },
      items: contracts,
    };
  }

  async getPreventiveMaintenanceReport(query: ReportQueryDto) {
    const schedules = await this.prisma.preventiveMaintenanceSchedule.findMany({
      include: {
        asset: { include: { product: true } },
        customer: true,
        technician: true,
        amcContract: true,
        partsConsumed: { include: { product: true } },
      },
      orderBy: { plannedDate: 'desc' },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = schedules.length;
    const scheduled = schedules.filter((s) => s.status === 'SCHEDULED' || s.status === 'ASSIGNED').length;
    const completed = schedules.filter((s) => s.status === 'COMPLETED').length;
    const completedThisMonth = schedules.filter(
      (s) => s.status === 'COMPLETED' && s.completionDate && s.completionDate >= startOfMonth,
    ).length;
    const overdue = schedules.filter(
      (s) => (s.status === 'SCHEDULED' || s.status === 'ASSIGNED') && s.plannedDate < startOfToday,
    ).length;
    const missed = schedules.filter((s) => s.status === 'MISSED').length;

    // Technician breakdown
    const techPerformance: Record<string, { name: string; completed: number; scheduled: number }> = {};
    for (const s of schedules) {
      const tName = s.technician?.fullName || 'Unassigned';
      if (!techPerformance[tName]) {
        techPerformance[tName] = { name: tName, completed: 0, scheduled: 0 };
      }
      if (s.status === 'COMPLETED') techPerformance[tName].completed++;
      else techPerformance[tName].scheduled++;
    }

    return {
      summary: {
        totalSchedules: total,
        scheduled,
        completed,
        completedThisMonth,
        overdue,
        missed,
      },
      technicianPerformance: Object.values(techPerformance),
      items: schedules,
    };
  }
}
