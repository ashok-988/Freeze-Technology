import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryReportDto } from './dto/period.dto';

@Injectable()
export class AccountingReportsService {
  private readonly logger = new Logger(AccountingReportsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Builds date filter for accounting queries based on financial year or explicit dates.
   */
  private buildDateFilter(query: QueryReportDto) {
    const filter: any = {};
    if (query.startDate || query.endDate) {
      if (query.startDate) filter.gte = new Date(query.startDate);
      if (query.endDate) filter.lte = new Date(query.endDate);
    } else if (query.asOfDate) {
      filter.lte = new Date(query.asOfDate);
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  /**
   * 1. GENERAL LEDGER:
   * Returns line-by-line debit/credit postings with running balances for specific accounts.
   */
  async getGeneralLedger(query: QueryReportDto) {
    const dateFilter = this.buildDateFilter(query);

    const accountWhere: any = { isActive: true };
    if (query.accountId) accountWhere.id = query.accountId;

    const accounts = await this.prisma.account.findMany({
      where: accountWhere,
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              ...(dateFilter ? { entryDate: dateFilter } : {}),
            },
          },
          include: {
            journalEntry: {
              select: {
                id: true,
                journalNumber: true,
                entryDate: true,
                referenceType: true,
                referenceNumber: true,
                narration: true,
                sourceModule: true,
              },
            },
          },
          orderBy: { journalEntry: { entryDate: 'asc' } },
        },
      },
      orderBy: { accountCode: 'asc' },
    });

    const ledger = accounts.map((acc) => {
      let runningBalance = Number(acc.openingBalance || 0);
      let totalDebits = 0;
      let totalCredits = 0;

      const entries = acc.journalLines.map((line) => {
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        totalDebits += debit;
        totalCredits += credit;

        if (acc.normalBalance === 'DEBIT') {
          runningBalance += debit - credit;
        } else {
          runningBalance += credit - debit;
        }

        return {
          lineId: line.id,
          journalId: line.journalEntry.id,
          journalNumber: line.journalEntry.journalNumber,
          entryDate: line.journalEntry.entryDate,
          referenceType: line.journalEntry.referenceType,
          referenceNumber: line.journalEntry.referenceNumber,
          narration: line.journalEntry.narration,
          sourceModule: line.journalEntry.sourceModule,
          description: line.description,
          debit,
          credit,
          runningBalance: Math.round(runningBalance * 100) / 100,
        };
      });

      return {
        accountId: acc.id,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountType: acc.accountType,
        accountGroup: acc.accountGroup,
        normalBalance: acc.normalBalance,
        openingBalance: Number(acc.openingBalance || 0),
        totalDebits: Math.round(totalDebits * 100) / 100,
        totalCredits: Math.round(totalCredits * 100) / 100,
        closingBalance: Math.round(runningBalance * 100) / 100,
        entriesCount: entries.length,
        entries,
      };
    });

    return ledger;
  }

  /**
   * 2. TRIAL BALANCE:
   * Summarizes all accounts, checking that Total Debits == Total Credits.
   */
  async getTrialBalance(query: QueryReportDto) {
    const dateFilter = this.buildDateFilter(query);

    const accounts = await this.prisma.account.findMany({
      where: { isActive: true },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              ...(dateFilter ? { entryDate: dateFilter } : {}),
            },
          },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { accountCode: 'asc' },
    });

    let totalDebitSum = 0;
    let totalCreditSum = 0;

    const rows = accounts
      .map((acc) => {
        const totalDebits = acc.journalLines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
        const totalCredits = acc.journalLines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
        const openBal = Number(acc.openingBalance || 0);

        const net = totalDebits - totalCredits;
        let netDebit = 0;
        let netCredit = 0;

        if (net > 0) {
          netDebit = net;
        } else if (net < 0) {
          netCredit = Math.abs(net);
        }

        netDebit = Math.round(netDebit * 100) / 100;
        netCredit = Math.round(netCredit * 100) / 100;

        totalDebitSum += netDebit;
        totalCreditSum += netCredit;

        return {
          accountId: acc.id,
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          accountType: acc.accountType,
          accountGroup: acc.accountGroup,
          normalBalance: acc.normalBalance,
          openingBalance: openBal,
          totalDebits: Math.round(totalDebits * 100) / 100,
          totalCredits: Math.round(totalCredits * 100) / 100,
          debitBalance: netDebit,
          creditBalance: netCredit,
        };
      })
      .filter((r) => r.openingBalance !== 0 || r.totalDebits !== 0 || r.totalCredits !== 0);

    totalDebitSum = Math.round(totalDebitSum * 100) / 100;
    totalCreditSum = Math.round(totalCreditSum * 100) / 100;
    const difference = Math.abs(totalDebitSum - totalCreditSum);
    const isBalanced = difference <= 0.01;

    return {
      asOfDate: query.asOfDate || new Date().toISOString(),
      rows,
      totalDebits: totalDebitSum,
      totalCredits: totalCreditSum,
      difference: Math.round(difference * 100) / 100,
      isBalanced,
      status: isBalanced ? 'BALANCED' : 'UNBALANCED',
    };
  }

  /**
   * 3. PROFIT & LOSS STATEMENT:
   * Revenue - COGS = Gross Profit
   * Gross Profit - Operating Expenses = Net Profit/Loss
   */
  async getProfitAndLoss(query: QueryReportDto) {
    const dateFilter = this.buildDateFilter(query);

    const accounts = await this.prisma.account.findMany({
      where: {
        accountType: { in: ['REVENUE', 'EXPENSE'] },
        isActive: true,
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              ...(dateFilter ? { entryDate: dateFilter } : {}),
            },
          },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { accountCode: 'asc' },
    });

    const revenueItems: any[] = [];
    const cogsItems: any[] = [];
    const expenseItems: any[] = [];

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalExpenses = 0;

    for (const acc of accounts) {
      const d = acc.journalLines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
      const c = acc.journalLines.reduce((sum, l) => sum + Number(l.credit || 0), 0);

      if (acc.accountType === 'REVENUE') {
        const netRev = Math.max(0, c - d);
        if (netRev > 0 || acc.journalLines.length > 0) {
          totalRevenue += netRev;
          revenueItems.push({
            code: acc.accountCode,
            name: acc.accountName,
            group: acc.accountGroup,
            amount: Math.round(netRev * 100) / 100,
          });
        }
      } else if (acc.accountType === 'EXPENSE') {
        const netExp = Math.max(0, d - c);
        if (acc.accountGroup === 'COGS') {
          totalCogs += netExp;
          cogsItems.push({
            code: acc.accountCode,
            name: acc.accountName,
            group: acc.accountGroup,
            amount: Math.round(netExp * 100) / 100,
          });
        } else {
          totalExpenses += netExp;
          expenseItems.push({
            code: acc.accountCode,
            name: acc.accountName,
            group: acc.accountGroup,
            amount: Math.round(netExp * 100) / 100,
          });
        }
      }
    }

    totalRevenue = Math.round(totalRevenue * 100) / 100;
    totalCogs = Math.round(totalCogs * 100) / 100;
    totalExpenses = Math.round(totalExpenses * 100) / 100;

    const grossProfit = Math.round((totalRevenue - totalCogs) * 100) / 100;
    const grossMarginPct = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;

    const netProfit = Math.round((grossProfit - totalExpenses) * 100) / 100;
    const netMarginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0;

    return {
      period: query.financialYear || 'Current Period',
      revenue: {
        items: revenueItems,
        total: totalRevenue,
      },
      costOfGoodsSold: {
        items: cogsItems,
        total: totalCogs,
      },
      grossProfit,
      grossMarginPct,
      operatingExpenses: {
        items: expenseItems,
        total: totalExpenses,
      },
      netProfit,
      netMarginPct,
    };
  }

  /**
   * 4. BALANCE SHEET:
   * ASSETS = LIABILITIES + EQUITY
   */
  async getBalanceSheet(query: QueryReportDto) {
    const tb = await this.getTrialBalance(query);
    const pnl = await this.getProfitAndLoss(query);

    const currentAssets: any[] = [];
    const fixedAssets: any[] = [];
    const currentLiabilities: any[] = [];
    const longTermLiabilities: any[] = [];
    const equityItems: any[] = [];

    let totalCurrentAssets = 0;
    let totalFixedAssets = 0;
    let totalCurrentLiabilities = 0;
    let totalLongTermLiabilities = 0;
    let totalEquity = 0;

    for (const r of tb.rows) {
      if (r.accountType === 'ASSET') {
        const val = r.debitBalance - r.creditBalance;
        if (r.accountGroup === 'FIXED_ASSETS') {
          totalFixedAssets += val;
          fixedAssets.push({ code: r.accountCode, name: r.accountName, group: r.accountGroup, amount: val });
        } else {
          totalCurrentAssets += val;
          currentAssets.push({ code: r.accountCode, name: r.accountName, group: r.accountGroup, amount: val });
        }
      } else if (r.accountType === 'LIABILITY') {
        const val = r.creditBalance - r.debitBalance;
        if (r.accountGroup === 'LOANS') {
          totalLongTermLiabilities += val;
          longTermLiabilities.push({ code: r.accountCode, name: r.accountName, group: r.accountGroup, amount: val });
        } else {
          totalCurrentLiabilities += val;
          currentLiabilities.push({ code: r.accountCode, name: r.accountName, group: r.accountGroup, amount: val });
        }
      } else if (r.accountType === 'EQUITY') {
        const val = r.creditBalance - r.debitBalance;
        totalEquity += val;
        equityItems.push({ code: r.accountCode, name: r.accountName, group: r.accountGroup, amount: val });
      }
    }

    // Add Current Year Profit/Loss into Equity
    const currentYearNetPL = pnl.netProfit;
    equityItems.push({
      code: '3030',
      name: 'Current Year Profit / (Loss) (from P&L)',
      group: 'CURRENT_YEAR_PL',
      amount: currentYearNetPL,
    });
    totalEquity += currentYearNetPL;

    totalCurrentAssets = Math.round(totalCurrentAssets * 100) / 100;
    totalFixedAssets = Math.round(totalFixedAssets * 100) / 100;
    const totalAssets = Math.round((totalCurrentAssets + totalFixedAssets) * 100) / 100;

    totalCurrentLiabilities = Math.round(totalCurrentLiabilities * 100) / 100;
    totalLongTermLiabilities = Math.round(totalLongTermLiabilities * 100) / 100;
    const totalLiabilities = Math.round((totalCurrentLiabilities + totalLongTermLiabilities) * 100) / 100;
    totalEquity = Math.round(totalEquity * 100) / 100;

    const totalLiabilitiesAndEquity = Math.round((totalLiabilities + totalEquity) * 100) / 100;
    const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = difference <= 0.01;

    return {
      asOfDate: query.asOfDate || new Date().toISOString(),
      assets: {
        currentAssets: { items: currentAssets, total: totalCurrentAssets },
        fixedAssets: { items: fixedAssets, total: totalFixedAssets },
        totalAssets,
      },
      liabilities: {
        currentLiabilities: { items: currentLiabilities, total: totalCurrentLiabilities },
        longTermLiabilities: { items: longTermLiabilities, total: totalLongTermLiabilities },
        totalLiabilities,
      },
      equity: {
        items: equityItems,
        totalEquity,
      },
      totalLiabilitiesAndEquity,
      difference: Math.round(difference * 100) / 100,
      isBalanced,
    };
  }

  /**
   * 5. CASH & BANK BOOK:
   * Tracks cash (1010) and bank (1020, 1025) transactions.
   */
  async getCashBook(query: QueryReportDto) {
    const dateFilter = this.buildDateFilter(query);

    const cashBankAccounts = await this.prisma.account.findMany({
      where: {
        accountGroup: { in: ['CASH', 'BANK'] },
        isActive: true,
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
              ...(dateFilter ? { entryDate: dateFilter } : {}),
            },
          },
          include: {
            journalEntry: {
              select: {
                journalNumber: true,
                entryDate: true,
                referenceType: true,
                referenceNumber: true,
                narration: true,
              },
            },
          },
          orderBy: { journalEntry: { entryDate: 'asc' } },
        },
      },
      orderBy: { accountCode: 'asc' },
    });

    let overallTotalReceipts = 0;
    let overallTotalPayments = 0;
    let overallClosingBalance = 0;

    const accountsReport = cashBankAccounts.map((acc) => {
      let runningBal = Number(acc.openingBalance || 0);
      let totalReceipts = 0;
      let totalPayments = 0;

      const transactions = acc.journalLines.map((line) => {
        const receipt = Number(line.debit || 0);
        const payment = Number(line.credit || 0);
        totalReceipts += receipt;
        totalPayments += payment;
        runningBal += receipt - payment;

        return {
          id: line.id,
          journalNumber: line.journalEntry.journalNumber,
          entryDate: line.journalEntry.entryDate,
          reference: line.journalEntry.referenceNumber,
          narration: line.journalEntry.narration,
          receipt,
          payment,
          runningBalance: Math.round(runningBal * 100) / 100,
        };
      });

      overallTotalReceipts += totalReceipts;
      overallTotalPayments += totalPayments;
      overallClosingBalance += runningBal;

      return {
        accountId: acc.id,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountGroup: acc.accountGroup,
        openingBalance: Number(acc.openingBalance || 0),
        totalReceipts: Math.round(totalReceipts * 100) / 100,
        totalPayments: Math.round(totalPayments * 100) / 100,
        closingBalance: Math.round(runningBal * 100) / 100,
        transactions,
      };
    });

    return {
      accounts: accountsReport,
      summary: {
        totalReceipts: Math.round(overallTotalReceipts * 100) / 100,
        totalPayments: Math.round(overallTotalPayments * 100) / 100,
        closingBalance: Math.round(overallClosingBalance * 100) / 100,
      },
    };
  }

  /**
   * 6. SUBLEDGER RECONCILIATION ENGINE:
   * - AR Subledger (Invoices - Payments) vs AR GL (1030)
   * - AP Subledger (Vendor Bills - Paid) vs AP GL (2010)
   * - GST Subledger (Invoices GST - Bill GST) vs GST GL (2020 - 1050)
   */
  async getReconciliation() {
    // 1. AR Reconciliation
    const invoices = await this.prisma.invoice.findMany({
      select: { grandTotal: true, paymentStatus: true },
    });
    const payments = await this.prisma.payment.findMany({
      select: { amount: true },
    });

    const totalInvoiceSales = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
    const totalPaymentsReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const subledgerAR = Math.max(0, totalInvoiceSales - totalPaymentsReceived);

    const arAcc = await this.prisma.account.findUnique({
      where: { accountCode: '1030' },
      include: {
        journalLines: {
          where: { journalEntry: { status: 'POSTED' } },
          select: { debit: true, credit: true },
        },
      },
    });

    const arGlDebits = arAcc?.journalLines.reduce((s, l) => s + Number(l.debit || 0), 0) || 0;
    const arGlCredits = arAcc?.journalLines.reduce((s, l) => s + Number(l.credit || 0), 0) || 0;
    const glAR = arGlDebits - arGlCredits;
    const arDiff = Math.abs(subledgerAR - glAR);

    // 2. AP Reconciliation
    const vendorBills = await this.prisma.vendorBill.findMany({
      select: { totalAmount: true, paymentStatus: true },
    });
    const subledgerAP = vendorBills
      .filter((b) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(b.paymentStatus))
      .reduce((s, b) => s + Number(b.totalAmount || 0), 0);

    const apAcc = await this.prisma.account.findUnique({
      where: { accountCode: '2010' },
      include: {
        journalLines: {
          where: { journalEntry: { status: 'POSTED' } },
          select: { debit: true, credit: true },
        },
      },
    });

    const apGlDebits = apAcc?.journalLines.reduce((s, l) => s + Number(l.debit || 0), 0) || 0;
    const apGlCredits = apAcc?.journalLines.reduce((s, l) => s + Number(l.credit || 0), 0) || 0;
    const glAP = apGlCredits - apGlDebits;
    const apDiff = Math.abs(subledgerAP - glAP);

    // 3. GST Position Reconciliation
    const outGstAcc = await this.prisma.account.findUnique({
      where: { accountCode: '2020' },
      include: { journalLines: { where: { journalEntry: { status: 'POSTED' } } } },
    });
    const inGstAcc = await this.prisma.account.findUnique({
      where: { accountCode: '1050' },
      include: { journalLines: { where: { journalEntry: { status: 'POSTED' } } } },
    });

    const glOutputGst = outGstAcc?.journalLines.reduce((s, l) => s + (Number(l.credit) - Number(l.debit)), 0) || 0;
    const glInputGst = inGstAcc?.journalLines.reduce((s, l) => s + (Number(l.debit) - Number(l.credit)), 0) || 0;
    const glNetGstLiability = glOutputGst - glInputGst;

    return {
      timestamp: new Date().toISOString(),
      accountsReceivable: {
        subledgerTotal: Math.round(subledgerAR * 100) / 100,
        glTotal: Math.round(glAR * 100) / 100,
        difference: Math.round(arDiff * 100) / 100,
        status: arDiff <= 1 ? 'RECONCILED' : 'DISCREPANCY',
      },
      accountsPayable: {
        subledgerTotal: Math.round(subledgerAP * 100) / 100,
        glTotal: Math.round(glAP * 100) / 100,
        difference: Math.round(apDiff * 100) / 100,
        status: apDiff <= 1 ? 'RECONCILED' : 'DISCREPANCY',
      },
      gstPosition: {
        outputGst: Math.round(glOutputGst * 100) / 100,
        inputGst: Math.round(glInputGst * 100) / 100,
        netGstLiability: Math.round(glNetGstLiability * 100) / 100,
        status: 'RECONCILED',
      },
    };
  }

  /**
   * 7. ACCOUNTING DASHBOARD OVERVIEW:
   * Single consolidated telemetry feed for Overview tab.
   */
  async getDashboardSummary() {
    const [tb, pnl, bs, cash, rec, totalJournals] = await Promise.all([
      this.getTrialBalance({}),
      this.getProfitAndLoss({}),
      this.getBalanceSheet({}),
      this.getCashBook({}),
      this.getReconciliation(),
      this.prisma.journalEntry.count({ where: { status: 'POSTED' } }),
    ]);

    return {
      trialBalance: {
        isBalanced: tb.isBalanced,
        totalDebits: tb.totalDebits,
        totalCredits: tb.totalCredits,
      },
      balanceSheet: {
        isBalanced: bs.isBalanced,
        totalAssets: bs.assets.totalAssets,
        totalLiabilitiesAndEquity: bs.totalLiabilitiesAndEquity,
      },
      profitAndLoss: {
        revenue: pnl.revenue.total,
        grossProfit: pnl.grossProfit,
        grossMarginPct: pnl.grossMarginPct,
        netProfit: pnl.netProfit,
        netMarginPct: pnl.netMarginPct,
      },
      cashAndBank: {
        balance: cash.summary.closingBalance,
        receipts: cash.summary.totalReceipts,
        payments: cash.summary.totalPayments,
      },
      reconciliation: rec,
      stats: {
        totalJournals,
        totalAccounts: tb.rows.length,
      },
    };
  }
}
