import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutiveDashboardQueryDto, parseDateRange, DateRange } from './dto/executive-dashboard-query.dto';

@Injectable()
export class ExecutiveDashboardService {
  private readonly logger = new Logger(ExecutiveDashboardService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Complete consolidated Executive Dashboard payload.
   */
  async getExecutiveDashboard(dto: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(dto);

    const [
      revenueData,
      collectionsData,
      receivablesData,
      payablesData,
      expensesData,
      payrollData,
      inventoryData,
      procurementData,
      servicesData,
      amcData,
      assetsData,
      pmData,
      gstData,
      profitabilityData,
      trendsData,
      exceptionsData,
    ] = await Promise.all([
      this.getRevenueMetrics(range),
      this.getCollectionsMetrics(range),
      this.getReceivablesMetrics(),
      this.getPayablesMetrics(),
      this.getExpensesMetrics(range),
      this.getPayrollMetrics(range),
      this.getInventoryMetrics(),
      this.getProcurementMetrics(range),
      this.getServicesMetrics(range),
      this.getAMCMetrics(range),
      this.getAssetsMetrics(),
      this.getPMMetrics(range),
      this.getGSTMetrics(range),
      this.getProfitabilityMetrics(range),
      this.getMonthlyTrends(),
      this.getManagementExceptions(),
    ]);

    return {
      period: dto.period || 'current_fy',
      dateRange: {
        startDate: range.startDate.toISOString(),
        endDate: range.endDate.toISOString(),
        label: range.label,
      },
      lastRefreshed: new Date().toISOString(),
      kpis: {
        revenue: revenueData,
        collections: collectionsData,
        receivables: receivablesData,
        payables: payablesData,
        expenses: expensesData,
        payroll: payrollData,
        inventory: inventoryData,
        procurement: procurementData,
        services: servicesData,
        amc: amcData,
        assets: assetsData,
        preventiveMaintenance: pmData,
        gst: gstData,
        profitability: profitabilityData,
      },
      trends: trendsData,
      exceptions: exceptionsData,
    };
  }

  /**
   * 1. REVENUE & SALES METRICS
   */
  async getRevenueMetrics(range: DateRange) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        invoiceDate: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
      select: {
        grandTotal: true,
        gstAmount: true,
        subtotal: true,
        paymentStatus: true,
      },
    });

    const grossSales = invoices.reduce((acc, inv) => acc + Number(inv.grandTotal || 0), 0);
    const outputGst = invoices.reduce((acc, inv) => acc + Number(inv.gstAmount || 0), 0);
    const netTaxableSales = invoices.reduce((acc, inv) => acc + Number(inv.subtotal || 0), 0);
    const invoiceCount = invoices.length;
    const avgInvoiceValue = invoiceCount > 0 ? grossSales / invoiceCount : 0;

    // Previous period comparison for growth
    let growthVsPrevious = 0;
    if (range.previousStartDate && range.previousEndDate) {
      const prevInvoices = await this.prisma.invoice.findMany({
        where: {
          invoiceDate: {
            gte: range.previousStartDate,
            lte: range.previousEndDate,
          },
        },
        select: { grandTotal: true },
      });
      const prevGross = prevInvoices.reduce((acc, inv) => acc + Number(inv.grandTotal || 0), 0);
      if (prevGross > 0) {
        growthVsPrevious = Number((((grossSales - prevGross) / prevGross) * 100).toFixed(2));
      }
    }

    return {
      grossSales,
      netTaxableSales,
      outputGst,
      invoiceCount,
      avgInvoiceValue,
      growthVsPrevious,
    };
  }

  /**
   * 2. COLLECTIONS & CASH INFLOW
   */
  async getCollectionsMetrics(range: DateRange) {
    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
      select: {
        amount: true,
        paymentMethod: true,
      },
    });

    const totalCollections = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

    const modeBreakdown: Record<string, number> = {};
    for (const p of payments) {
      const mode = p.paymentMethod || 'OTHER';
      modeBreakdown[mode] = (modeBreakdown[mode] || 0) + Number(p.amount || 0);
    }

    const revenue = await this.getRevenueMetrics(range);
    const collectionRate = revenue.grossSales > 0
      ? Number(((totalCollections / revenue.grossSales) * 100).toFixed(1))
      : totalCollections > 0 ? 100 : 0;

    return {
      totalCollections,
      paymentCount: payments.length,
      collectionRate,
      modeBreakdown,
    };
  }

  /**
   * 3. RECEIVABLES & AGING ANALYSIS
   */
  async getReceivablesMetrics() {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: {
        paymentStatus: { in: ['Pending', 'Partial', 'PENDING', 'PARTIAL'] },
      },
      include: {
        customer: { select: { id: true, customerName: true, companyName: true, mobile: true } },
        payments: { select: { amount: true } },
      },
    });

    let totalReceivables = 0;
    let overdueReceivables = 0;

    const aging = {
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
    };

    const customerMap = new Map<string, { name: string; amount: number; invoiceCount: number }>();

    for (const inv of invoices) {
      const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balance = Math.max(0, Number(inv.grandTotal || 0) - paid);
      if (balance <= 0) continue;

      totalReceivables += balance;

      const dueDate = new Date(inv.invoiceDate);
      dueDate.setDate(dueDate.getDate() + 15); // Standard 15 days credit

      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        aging.current += balance;
      } else {
        overdueReceivables += balance;
        if (diffDays <= 30) aging.days1To30 += balance;
        else if (diffDays <= 60) aging.days31To60 += balance;
        else if (diffDays <= 90) aging.days61To90 += balance;
        else aging.days90Plus += balance;
      }

      const custId = inv.customerId;
      const custName = inv.customer?.companyName || inv.customer?.customerName || 'Unknown Customer';
      if (!customerMap.has(custId)) {
        customerMap.set(custId, { name: custName, amount: 0, invoiceCount: 0 });
      }
      const c = customerMap.get(custId)!;
      c.amount += balance;
      c.invoiceCount += 1;
    }

    const topDebtors = Array.from(customerMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalReceivables,
      overdueReceivables,
      unpaidInvoicesCount: invoices.length,
      aging,
      topDebtors,
    };
  }

  /**
   * 4. PAYABLES & VENDOR BILLS AGING
   */
  async getPayablesMetrics() {
    const now = new Date();
    const unpaidBills = await this.prisma.vendorBill.findMany({
      where: {
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'PENDING'] },
      },
      include: {
        supplier: { select: { id: true, companyName: true, gstNumber: true } },
      },
    });

    let totalPayables = 0;
    let overduePayables = 0;

    const aging = {
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
    };

    const supplierMap = new Map<string, { name: string; amount: number; billCount: number }>();

    for (const bill of unpaidBills) {
      const balance = Number(bill.balanceAmount ?? bill.totalAmount ?? 0);
      if (balance <= 0) continue;

      totalPayables += balance;

      const dueDate = bill.dueDate ? new Date(bill.dueDate) : new Date(bill.billDate);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        aging.current += balance;
      } else {
        overduePayables += balance;
        if (diffDays <= 30) aging.days1To30 += balance;
        else if (diffDays <= 60) aging.days31To60 += balance;
        else if (diffDays <= 90) aging.days61To90 += balance;
        else aging.days90Plus += balance;
      }

      const suppId = bill.supplierId;
      const suppName = bill.supplier?.companyName || 'Unknown Supplier';
      if (!supplierMap.has(suppId)) {
        supplierMap.set(suppId, { name: suppName, amount: 0, billCount: 0 });
      }
      const s = supplierMap.get(suppId)!;
      s.amount += balance;
      s.billCount += 1;
    }

    const topCreditors = Array.from(supplierMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalPayables,
      overduePayables,
      unpaidBillsCount: unpaidBills.length,
      aging,
      topCreditors,
    };
  }

  /**
   * 5. OPERATING EXPENSES
   */
  async getExpensesMetrics(range: DateRange) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
      include: {
        category: { select: { name: true } },
      },
    });

    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.totalAmount || 0), 0);
    const categoryBreakdown: Record<string, number> = {};

    for (const e of expenses) {
      const cat = e.category?.name || 'General';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(e.totalAmount || 0);
    }

    return {
      totalExpenses,
      expenseCount: expenses.length,
      categoryBreakdown,
    };
  }

  /**
   * 6. PAYROLL & WORKFORCE
   */
  async getPayrollMetrics(range: DateRange) {
    const [periods, activeEmployees] = await Promise.all([
      this.prisma.payrollPeriod.findMany({
        where: {
          periodStart: { gte: range.startDate },
          periodEnd: { lte: range.endDate },
        },
        select: {
          totalGrossSalary: true,
          totalNetSalary: true,
          status: true,
        },
      }),
      this.prisma.employee.count({
        where: { status: 'ACTIVE' },
      }),
    ]);

    let totalGrossPayroll = 0;
    let totalNetPayroll = 0;
    let paidPayroll = 0;
    let pendingPayroll = 0;

    for (const period of periods) {
      totalGrossPayroll += Number(period.totalGrossSalary || 0);
      totalNetPayroll += Number(period.totalNetSalary || 0);

      if (period.status === 'PAID') {
        paidPayroll += Number(period.totalNetSalary || 0);
      } else {
        pendingPayroll += Number(period.totalNetSalary || 0);
      }
    }

    const revenue = await this.getRevenueMetrics(range);
    const payrollPercentOfRevenue = revenue.grossSales > 0
      ? Number(((totalGrossPayroll / revenue.grossSales) * 100).toFixed(1))
      : 0;

    const revenuePerEmployee = activeEmployees > 0
      ? Math.round(revenue.grossSales / activeEmployees)
      : 0;

    return {
      totalGrossPayroll,
      totalNetPayroll,
      paidPayroll,
      pendingPayroll,
      employeeCount: activeEmployees,
      payrollPercentOfRevenue,
      revenuePerEmployee,
    };
  }

  /**
   * 7. INVENTORY VALUATION & REORDER ALERTS
   */
  async getInventoryMetrics() {
    const products = await this.prisma.product.findMany({
      select: {
        id: true,
        productName: true,
        stockQuantity: true,
        purchasePrice: true,
        sellingPrice: true,
        category: { select: { categoryName: true } },
      },
    });

    let totalStockValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const categoryValuation: Record<string, { count: number; value: number }> = {};

    for (const p of products) {
      const stock = p.stockQuantity || 0;
      const cost = Number(p.purchasePrice || p.sellingPrice || 0);
      const val = stock * cost;

      totalStockValuation += val;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= 5) {
        lowStockCount++;
      }

      const cat = p.category?.categoryName || 'General';
      if (!categoryValuation[cat]) {
        categoryValuation[cat] = { count: 0, value: 0 };
      }
      categoryValuation[cat].count += 1;
      categoryValuation[cat].value += val;
    }

    return {
      totalStockValuation,
      totalSKUs: products.length,
      lowStockCount,
      outOfStockCount,
      categoryValuation,
    };
  }

  /**
   * 8. PROCUREMENT & SUPPLIER ORDERS
   */
  async getProcurementMetrics(range: DateRange) {
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        purchaseDate: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
      select: {
        totalAmount: true,
        status: true,
      },
    });

    const totalPOValue = purchaseOrders.reduce((acc, po) => acc + Number(po.totalAmount || 0), 0);
    const pendingPOs = purchaseOrders.filter((po) => ['Draft', 'Submitted', 'Pending'].includes(po.status)).length;
    const receivedPOs = purchaseOrders.filter((po) => ['Received', 'Partially Received', 'Completed'].includes(po.status)).length;

    return {
      totalPOValue,
      totalPOCount: purchaseOrders.length,
      pendingPOs,
      receivedPOs,
    };
  }

  /**
   * 9. FIELD SERVICES & TECHNICAL WORKLOAD
   */
  async getServicesMetrics(range: DateRange) {
    const [complaints, jobCards] = await Promise.all([
      this.prisma.complaint.findMany({
        where: { createdAt: { gte: range.startDate, lte: range.endDate } },
        select: { status: true, priority: true },
      }),
      this.prisma.jobCard.findMany({
        where: { createdAt: { gte: range.startDate, lte: range.endDate } },
        select: { status: true, actualCost: true, estimatedCost: true },
      }),
    ]);

    const totalTickets = complaints.length;
    const openTickets = complaints.filter((c) => c.status === 'Open' || c.status === 'In Progress').length;
    const completedTickets = complaints.filter((c) => c.status === 'Closed').length;
    const criticalTickets = complaints.filter((c) => c.priority === 'High' || c.priority === 'Critical').length;

    return {
      totalTickets,
      openTickets,
      completedTickets,
      criticalTickets,
      jobCardsCount: jobCards.length,
    };
  }

  /**
   * 10. AMC CONTRACTS & RECURRING REVENUE
   */
  async getAMCMetrics(range: DateRange) {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [allContracts, expiringContracts] = await Promise.all([
      this.prisma.aMCContract.findMany({
        where: { status: 'ACTIVE' },
        select: { contractValue: true, startDate: true, endDate: true },
      }),
      this.prisma.aMCContract.count({
        where: {
          status: 'ACTIVE',
          endDate: { gte: now, lte: in30Days },
        },
      }),
    ]);

    const activeCount = allContracts.length;
    const totalPortfolioValue = allContracts.reduce((acc, c) => acc + Number(c.contractValue || 0), 0);

    return {
      activeContractsCount: activeCount,
      totalPortfolioValue,
      expiringWithin30Days: expiringContracts,
    };
  }

  /**
   * 11. ASSETS & WARRANTY STATUS
   */
  async getAssetsMetrics() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const assets = await this.prisma.asset.findMany({
      select: {
        id: true,
        status: true,
        warrantyEndDate: true,
        amcStatus: true,
      },
    });

    let totalAssets = assets.length;
    let activeAssets = 0;
    let warrantyActive = 0;
    let warrantyExpiring = 0;
    let warrantyExpired = 0;
    let amcCovered = 0;

    for (const a of assets) {
      if (a.status === 'ACTIVE' || a.status === 'OPERATIONAL') activeAssets++;
      if (a.amcStatus === 'COVERED' || a.amcStatus === 'ACTIVE') amcCovered++;

      if (a.warrantyEndDate) {
        const wEnd = new Date(a.warrantyEndDate);
        if (wEnd < now) {
          warrantyExpired++;
        } else if (wEnd <= in30Days) {
          warrantyExpiring++;
        } else {
          warrantyActive++;
        }
      }
    }

    return {
      totalAssets,
      activeAssets,
      warrantyActive,
      warrantyExpiring,
      warrantyExpired,
      amcCovered,
    };
  }

  /**
   * 12. PREVENTIVE MAINTENANCE
   */
  async getPMMetrics(range: DateRange) {
    const visits = await this.prisma.preventiveMaintenanceSchedule.findMany({
      where: {
        plannedDate: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
      select: {
        status: true,
        plannedDate: true,
      },
    });

    const now = new Date();
    const totalScheduled = visits.length;
    const completed = visits.filter((v) => v.status === 'COMPLETED').length;
    const overdue = visits.filter((v) => v.status !== 'COMPLETED' && new Date(v.plannedDate) < now).length;
    const pending = visits.filter((v) => v.status === 'SCHEDULED' || v.status === 'ASSIGNED').length;

    const completionRate = totalScheduled > 0
      ? Number(((completed / totalScheduled) * 100).toFixed(1))
      : 100;

    return {
      totalScheduled,
      completed,
      overdue,
      pending,
      completionRate,
    };
  }

  /**
   * 13. GST & TAX LIABILITIES
   */
  async getGSTMetrics(range: DateRange) {
    const [invoices, vendorBills] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { invoiceDate: { gte: range.startDate, lte: range.endDate } },
        select: { subtotal: true, gstAmount: true, grandTotal: true },
      }),
      this.prisma.vendorBill.findMany({
        where: { billDate: { gte: range.startDate, lte: range.endDate } },
        select: { subtotal: true, taxAmount: true, totalAmount: true },
      }),
    ]);

    const taxableSales = invoices.reduce((acc, i) => acc + Number(i.subtotal || 0), 0);
    const outputGST = invoices.reduce((acc, i) => acc + Number(i.gstAmount || 0), 0);

    const taxablePurchases = vendorBills.reduce((acc, b) => acc + Number(b.subtotal || 0), 0);
    const inputGST = vendorBills.reduce((acc, b) => acc + Number(b.taxAmount || 0), 0);

    const netGSTLiability = Math.max(0, outputGST - inputGST);

    return {
      outputGST,
      inputGST,
      netGSTLiability,
      taxableSales,
      taxablePurchases,
      invoicesCount: invoices.length,
      vendorBillsCount: vendorBills.length,
    };
  }

  /**
   * 14. MANAGEMENT PROFITABILITY STATEMENT
   */
  async getProfitabilityMetrics(range: DateRange) {
    const [revenue, vendorBills, expenses, payroll] = await Promise.all([
      this.getRevenueMetrics(range),
      this.prisma.vendorBill.findMany({
        where: { billDate: { gte: range.startDate, lte: range.endDate } },
        select: { subtotal: true },
      }),
      this.getExpensesMetrics(range),
      this.getPayrollMetrics(range),
    ]);

    const grossRevenue = revenue.grossSales;
    const directPurchasesCOGS = vendorBills.reduce((acc, b) => acc + Number(b.subtotal || 0), 0);

    const grossMargin = grossRevenue - directPurchasesCOGS;
    const grossMarginPercent = grossRevenue > 0
      ? Number(((grossMargin / grossRevenue) * 100).toFixed(2))
      : 0;

    const operatingExpenses = expenses.totalExpenses;
    const payrollCost = payroll.totalGrossPayroll;

    const netOperatingResult = grossMargin - operatingExpenses - payrollCost;
    const operatingMarginPercent = grossRevenue > 0
      ? Number(((netOperatingResult / grossRevenue) * 100).toFixed(2))
      : 0;

    return {
      grossRevenue,
      directPurchasesCOGS,
      grossMargin,
      grossMarginPercent,
      operatingExpenses,
      payrollCost,
      netOperatingResult,
      operatingMarginPercent,
    };
  }

  /**
   * 15. MONTHLY 12-MONTH HISTORICAL TRENDS
   */
  async getMonthlyTrends() {
    const now = new Date();
    const months: { year: number; month: number; label: string; start: Date; end: Date }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        start,
        end,
      });
    }

    const trends = await Promise.all(
      months.map(async (m) => {
        const [invoices, payments, expenses, bills] = await Promise.all([
          this.prisma.invoice.findMany({
            where: { invoiceDate: { gte: m.start, lte: m.end } },
            select: { grandTotal: true },
          }),
          this.prisma.payment.findMany({
            where: { paymentDate: { gte: m.start, lte: m.end } },
            select: { amount: true },
          }),
          this.prisma.expense.findMany({
            where: { expenseDate: { gte: m.start, lte: m.end } },
            select: { totalAmount: true },
          }),
          this.prisma.vendorBill.findMany({
            where: { billDate: { gte: m.start, lte: m.end } },
            select: { totalAmount: true },
          }),
        ]);

        const revenue = invoices.reduce((acc, i) => acc + Number(i.grandTotal || 0), 0);
        const collections = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const expense = expenses.reduce((acc, e) => acc + Number(e.totalAmount || 0), 0);
        const purchases = bills.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0);

        return {
          month: m.label,
          revenue,
          collections,
          expense,
          purchases,
          grossMargin: revenue - purchases,
        };
      }),
    );

    return trends;
  }

  /**
   * 16. MANAGEMENT EXCEPTIONS & CRITICAL ACTIONS
   */
  async getManagementExceptions() {
    const now = new Date();
    const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const [
      unpaidInvoices,
      overduePayables,
      lowStockProducts,
      expiringAMCs,
      overduePMs,
      unapprovedPayroll,
    ] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          paymentStatus: { in: ['Pending', 'Partial', 'PENDING', 'PARTIAL'] },
        },
        include: {
          customer: { select: { customerName: true, companyName: true } },
          payments: { select: { amount: true } },
        },
        take: 5,
      }),
      this.prisma.vendorBill.findMany({
        where: {
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
          dueDate: { lt: now },
        },
        include: { supplier: { select: { companyName: true } } },
        take: 5,
      }),
      this.prisma.product.findMany({
        where: {
          stockQuantity: { lte: 3 },
        },
        select: { id: true, productName: true, stockQuantity: true },
        take: 5,
      }),
      this.prisma.aMCContract.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { gte: now, lte: in15Days },
        },
        include: { customer: { select: { customerName: true, companyName: true } } },
        take: 5,
      }),
      this.prisma.preventiveMaintenanceSchedule.findMany({
        where: {
          status: { in: ['SCHEDULED', 'ASSIGNED', 'PENDING'] },
          plannedDate: { lt: now },
        },
        include: { asset: { select: { assetNumber: true, modelNumber: true, brandName: true } } },
        take: 5,
      }),
      this.prisma.payrollPeriod.findMany({
        where: {
          status: 'DRAFT',
        },
        select: { id: true, month: true, year: true },
        take: 3,
      }),
    ]);

    const exceptions: Array<{
      id: string;
      category: string;
      severity: 'CRITICAL' | 'WARNING' | 'ATTENTION';
      title: string;
      description: string;
      amount?: number;
      actionUrl?: string;
    }> = [];

    // Overdue receivables
    for (const inv of unpaidInvoices) {
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const balance = Math.max(0, Number(inv.grandTotal || 0) - paid);
      if (balance > 0) {
        exceptions.push({
          id: `rec-${inv.id}`,
          category: 'RECEIVABLES',
          severity: balance > 50000 ? 'CRITICAL' : 'WARNING',
          title: `Unpaid Invoice #${inv.invoiceNumber}`,
          description: `${inv.customer?.companyName || inv.customer?.customerName}: Rs. ${balance.toLocaleString('en-IN')} pending since ${new Date(inv.invoiceDate).toLocaleDateString('en-GB')}`,
          amount: balance,
          actionUrl: '/invoices',
        });
      }
    }

    // Overdue payables
    for (const bill of overduePayables) {
      const balance = Number(bill.balanceAmount ?? bill.totalAmount ?? 0);
      exceptions.push({
        id: `pay-${bill.id}`,
        category: 'PAYABLES',
        severity: balance > 50000 ? 'CRITICAL' : 'WARNING',
        title: `Overdue Vendor Bill #${bill.billNumber}`,
        description: `${bill.supplier?.companyName || 'Vendor'}: Rs. ${balance.toLocaleString('en-IN')} overdue`,
        amount: balance,
        actionUrl: '/payables',
      });
    }

    // Low stock
    for (const p of lowStockProducts) {
      exceptions.push({
        id: `stock-${p.id}`,
        category: 'INVENTORY',
        severity: p.stockQuantity === 0 ? 'CRITICAL' : 'WARNING',
        title: `Critical Stock: ${p.productName}`,
        description: `Current quantity: ${p.stockQuantity} units in stock`,
        actionUrl: '/inventory',
      });
    }

    // Expiring AMC
    for (const amc of expiringAMCs) {
      exceptions.push({
        id: `amc-${amc.id}`,
        category: 'AMC',
        severity: 'ATTENTION',
        title: `AMC Expiring Soon: ${amc.customer?.companyName || amc.customer?.customerName}`,
        description: `Contract #${amc.amcNumber} expires on ${new Date(amc.endDate).toLocaleDateString('en-GB')}`,
        actionUrl: '/amc',
      });
    }

    // Overdue PMs
    for (const pm of overduePMs) {
      exceptions.push({
        id: `pm-${pm.id}`,
        category: 'MAINTENANCE',
        severity: 'WARNING',
        title: `Overdue PM: ${pm.asset?.brandName || 'HVAC'} ${pm.asset?.modelNumber || pm.asset?.assetNumber || ''}`,
        description: `Scheduled on ${new Date(pm.plannedDate).toLocaleDateString('en-GB')} not yet completed`,
        actionUrl: '/preventive-maintenance',
      });
    }

    // Unapproved payroll
    for (const pr of unapprovedPayroll) {
      exceptions.push({
        id: `pr-${pr.id}`,
        category: 'PAYROLL',
        severity: 'ATTENTION',
        title: `Pending Payroll Approval`,
        description: `Payroll period for month ${pr.month}/${pr.year} is in DRAFT state awaiting approval`,
        actionUrl: '/payroll',
      });
    }

    return exceptions;
  }
}
