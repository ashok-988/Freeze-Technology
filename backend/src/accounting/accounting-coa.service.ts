import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto, QueryAccountDto } from './dto/account.dto';

export interface StandardAccountDef {
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  accountGroup: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  description: string;
  allowPosting: boolean;
  isSystemAccount: boolean;
  parentCode?: string;
}

export const STANDARD_COA: StandardAccountDef[] = [
  // 1. ASSETS (1000 - 1999)
  { accountCode: '1000', accountName: 'Current Assets', accountType: 'ASSET', accountGroup: 'OTHER_CURRENT_ASSETS', normalBalance: 'DEBIT', description: 'Control Account for Current Assets', allowPosting: false, isSystemAccount: true },
  { accountCode: '1010', accountName: 'Cash in Hand', accountType: 'ASSET', accountGroup: 'CASH', normalBalance: 'DEBIT', description: 'Physical cash for daily operations & petty cash', allowPosting: true, isSystemAccount: true, parentCode: '1000' },
  { accountCode: '1020', accountName: 'HDFC Bank Account', accountType: 'ASSET', accountGroup: 'BANK', normalBalance: 'DEBIT', description: 'Primary operational bank account', allowPosting: true, isSystemAccount: true, parentCode: '1000' },
  { accountCode: '1025', accountName: 'Axis Bank Account', accountType: 'ASSET', accountGroup: 'BANK', normalBalance: 'DEBIT', description: 'Secondary bank account', allowPosting: true, isSystemAccount: true, parentCode: '1000' },
  { accountCode: '1030', accountName: 'Accounts Receivable (Trade Debtors)', accountType: 'ASSET', accountGroup: 'RECEIVABLES', normalBalance: 'DEBIT', description: 'Customer invoices balance receivable', allowPosting: true, isSystemAccount: true, parentCode: '1000' },
  { accountCode: '1040', accountName: 'Stock / Inventory in Hand', accountType: 'ASSET', accountGroup: 'INVENTORY', normalBalance: 'DEBIT', description: 'Valuation of raw materials, units and spare parts', allowPosting: true, isSystemAccount: true, parentCode: '1000' },
  { accountCode: '1050', accountName: 'Input CGST (Tax Receivable)', accountType: 'ASSET', accountGroup: 'OTHER_CURRENT_ASSETS', normalBalance: 'DEBIT', description: 'Input Central GST paid on purchases', allowPosting: true, isSystemAccount: true, parentCode: '1000' },
  { accountCode: '1051', accountName: 'Input SGST (Tax Receivable)', accountType: 'ASSET', accountGroup: 'OTHER_CURRENT_ASSETS', normalBalance: 'DEBIT', description: 'Input State GST paid on purchases', allowPosting: true, isSystemAccount: true, parentCode: '1000' },
  { accountCode: '1052', accountName: 'Input IGST (Tax Receivable)', accountType: 'ASSET', accountGroup: 'OTHER_CURRENT_ASSETS', normalBalance: 'DEBIT', description: 'Input Integrated GST paid on inter-state purchases', allowPosting: true, isSystemAccount: true, parentCode: '1000' },

  { accountCode: '1500', accountName: 'Fixed Assets', accountType: 'ASSET', accountGroup: 'FIXED_ASSETS', normalBalance: 'DEBIT', description: 'Long-term operational physical assets', allowPosting: false, isSystemAccount: true },
  { accountCode: '1510', accountName: 'Plant & Service Machinery', accountType: 'ASSET', accountGroup: 'FIXED_ASSETS', normalBalance: 'DEBIT', description: 'Testing rigs, vacuum pumps and heavy tools', allowPosting: true, isSystemAccount: true, parentCode: '1500' },
  { accountCode: '1520', accountName: 'Service Vehicles & Logistics', accountType: 'ASSET', accountGroup: 'FIXED_ASSETS', normalBalance: 'DEBIT', description: 'Service vans and delivery two-wheelers', allowPosting: true, isSystemAccount: true, parentCode: '1500' },
  { accountCode: '1530', accountName: 'Office & IT Equipment', accountType: 'ASSET', accountGroup: 'FIXED_ASSETS', normalBalance: 'DEBIT', description: 'Computers, office HVAC and electronic hardware', allowPosting: true, isSystemAccount: true, parentCode: '1500' },

  // 2. LIABILITIES (2000 - 2999)
  { accountCode: '2000', accountName: 'Current Liabilities', accountType: 'LIABILITY', accountGroup: 'OTHER_CURRENT_LIABILITIES', normalBalance: 'CREDIT', description: 'Control account for current liabilities', allowPosting: false, isSystemAccount: true },
  { accountCode: '2010', accountName: 'Accounts Payable (Trade Creditors)', accountType: 'LIABILITY', accountGroup: 'PAYABLES', normalBalance: 'CREDIT', description: 'Vendor bills payable for procurement and services', allowPosting: true, isSystemAccount: true, parentCode: '2000' },
  { accountCode: '2020', accountName: 'Output CGST (Tax Payable)', accountType: 'LIABILITY', accountGroup: 'GST_PAYABLE', normalBalance: 'CREDIT', description: 'Central GST collected on sales and services', allowPosting: true, isSystemAccount: true, parentCode: '2000' },
  { accountCode: '2021', accountName: 'Output SGST (Tax Payable)', accountType: 'LIABILITY', accountGroup: 'GST_PAYABLE', normalBalance: 'CREDIT', description: 'State GST collected on sales and services', allowPosting: true, isSystemAccount: true, parentCode: '2000' },
  { accountCode: '2022', accountName: 'Output IGST (Tax Payable)', accountType: 'LIABILITY', accountGroup: 'GST_PAYABLE', normalBalance: 'CREDIT', description: 'Integrated GST collected on inter-state sales', allowPosting: true, isSystemAccount: true, parentCode: '2000' },
  { accountCode: '2030', accountName: 'Net GST Clearing / Payable', accountType: 'LIABILITY', accountGroup: 'GST_PAYABLE', normalBalance: 'CREDIT', description: 'Net GST liability payable to government', allowPosting: true, isSystemAccount: true, parentCode: '2000' },
  { accountCode: '2040', accountName: 'Salary & Wages Payable', accountType: 'LIABILITY', accountGroup: 'OTHER_CURRENT_LIABILITIES', normalBalance: 'CREDIT', description: 'Accrued employee payroll pending disbursement', allowPosting: true, isSystemAccount: true, parentCode: '2000' },
  { accountCode: '2050', accountName: 'TDS Payable', accountType: 'LIABILITY', accountGroup: 'TDS_PAYABLE', normalBalance: 'CREDIT', description: 'Tax deducted at source from vendors and contractors', allowPosting: true, isSystemAccount: true, parentCode: '2000' },

  // 3. EQUITY (3000 - 3999)
  { accountCode: '3010', accountName: 'Owner / Partners Capital', accountType: 'EQUITY', accountGroup: 'CAPITAL', normalBalance: 'CREDIT', description: 'Owner initial investment and capital contribution', allowPosting: true, isSystemAccount: true },
  { accountCode: '3020', accountName: 'Retained Earnings', accountType: 'EQUITY', accountGroup: 'RETAINED_EARNINGS', normalBalance: 'CREDIT', description: 'Accumulated net profits from prior financial years', allowPosting: true, isSystemAccount: true },
  { accountCode: '3030', accountName: 'Current Year Profit / Loss', accountType: 'EQUITY', accountGroup: 'CURRENT_YEAR_PL', normalBalance: 'CREDIT', description: 'Net operating result for current active financial year', allowPosting: true, isSystemAccount: true },

  // 4. REVENUE (4000 - 4999)
  { accountCode: '4010', accountName: 'Product Sales - AC & Refrigeration Units', accountType: 'REVENUE', accountGroup: 'PRODUCT_SALES', normalBalance: 'CREDIT', description: 'Revenue from sale of commercial and retail HVAC units', allowPosting: true, isSystemAccount: true },
  { accountCode: '4020', accountName: 'Sales - Spare Parts & Materials', accountType: 'REVENUE', accountGroup: 'PRODUCT_SALES', normalBalance: 'CREDIT', description: 'Revenue from sales of compressor parts, refrigerants and copper tubes', allowPosting: true, isSystemAccount: true },
  { accountCode: '4030', accountName: 'Service & Labor Revenue', accountType: 'REVENUE', accountGroup: 'SERVICE_REVENUE', normalBalance: 'CREDIT', description: 'Revenue from repair and preventive maintenance services', allowPosting: true, isSystemAccount: true },
  { accountCode: '4040', accountName: 'AMC Annual Contract Revenue', accountType: 'REVENUE', accountGroup: 'AMC_REVENUE', normalBalance: 'CREDIT', description: 'Recurring revenue recognized from AMC agreements', allowPosting: true, isSystemAccount: true },
  { accountCode: '4090', accountName: 'Other Operating Income', accountType: 'REVENUE', accountGroup: 'OTHER_INCOME', normalBalance: 'CREDIT', description: 'Scrap sales, interest and miscellaneous receipts', allowPosting: true, isSystemAccount: true },

  // 5. EXPENSES (5000 - 5999)
  { accountCode: '5010', accountName: 'Cost of Goods Sold (COGS - Purchases)', accountType: 'EXPENSE', accountGroup: 'COGS', normalBalance: 'DEBIT', description: 'Direct purchase cost of units, materials and parts', allowPosting: true, isSystemAccount: true },
  { accountCode: '5020', accountName: 'Salaries & Staff Wages', accountType: 'EXPENSE', accountGroup: 'SALARIES', normalBalance: 'DEBIT', description: 'Employee gross salaries, allowances and incentives', allowPosting: true, isSystemAccount: true },
  { accountCode: '5030', accountName: 'Workshop & Office Rent', accountType: 'EXPENSE', accountGroup: 'RENT', normalBalance: 'DEBIT', description: 'Rent for PTC Quarters and service workshop', allowPosting: true, isSystemAccount: true },
  { accountCode: '5040', accountName: 'Electricity & Utilities', accountType: 'EXPENSE', accountGroup: 'UTILITIES', normalBalance: 'DEBIT', description: 'Power, water and workshop utility bills', allowPosting: true, isSystemAccount: true },
  { accountCode: '5050', accountName: 'Vehicle Fuel & Travel Expense', accountType: 'EXPENSE', accountGroup: 'FUEL', normalBalance: 'DEBIT', description: 'Field technicians fuel and travel allowances', allowPosting: true, isSystemAccount: true },
  { accountCode: '5060', accountName: 'Equipment & Tool Repairs', accountType: 'EXPENSE', accountGroup: 'REPAIRS', normalBalance: 'DEBIT', description: 'Maintenance of service tools and logistics vehicles', allowPosting: true, isSystemAccount: true },
  { accountCode: '5070', accountName: 'Office & Administrative Expenses', accountType: 'EXPENSE', accountGroup: 'ADMIN', normalBalance: 'DEBIT', description: 'Stationery, software subscriptions, communication and admin', allowPosting: true, isSystemAccount: true },
  { accountCode: '5080', accountName: 'Depreciation Expense', accountType: 'EXPENSE', accountGroup: 'DEPRECIATION', normalBalance: 'DEBIT', description: 'Wear and tear write-down of fixed assets', allowPosting: true, isSystemAccount: true },
  { accountCode: '5090', accountName: 'Miscellaneous Operating Expenses', accountType: 'EXPENSE', accountGroup: 'OTHER_OPERATING_EXPENSES', normalBalance: 'DEBIT', description: 'Bank charges, courier and general operational expenses', allowPosting: true, isSystemAccount: true },
];

@Injectable()
export class AccountingCoaService implements OnModuleInit {
  private readonly logger = new Logger(AccountingCoaService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.bootstrapStandardChartOfAccounts().catch((err) => {
      this.logger.error('Error bootstrapping standard Chart of Accounts', err);
    });
  }

  /**
   * Bootstraps the standard Chart of Accounts idempotently.
   */
  async bootstrapStandardChartOfAccounts(): Promise<void> {
    this.logger.log('Checking and bootstrapping standard Chart of Accounts...');

    // 1. Ensure default open financial year period exists
    const now = new Date();
    const currentMonth = now.getMonth();
    const fyStartYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyEndYear = fyStartYear + 1;
    const fyCode = `${fyStartYear}-${fyEndYear.toString().slice(-2)}`;

    let defaultPeriod = await this.prisma.accountingPeriod.findFirst({
      where: { financialYear: fyCode },
    });

    if (!defaultPeriod) {
      defaultPeriod = await this.prisma.accountingPeriod.create({
        data: {
          financialYear: fyCode,
          periodName: `FY ${fyCode} (Annual)`,
          startDate: new Date(fyStartYear, 3, 1, 0, 0, 0, 0), // 1 April
          endDate: new Date(fyEndYear, 2, 31, 23, 59, 59, 999), // 31 March
          status: 'OPEN',
        },
      });
      this.logger.log(`Created default accounting period: FY ${fyCode}`);
    }

    // 2. Insert parent control accounts first
    for (const acc of STANDARD_COA.filter((a) => !a.parentCode)) {
      const existing = await this.prisma.account.findUnique({
        where: { accountCode: acc.accountCode },
      });
      if (!existing) {
        await this.prisma.account.create({
          data: {
            accountCode: acc.accountCode,
            accountName: acc.accountName,
            accountType: acc.accountType,
            accountGroup: acc.accountGroup,
            normalBalance: acc.normalBalance,
            description: acc.description,
            allowPosting: acc.allowPosting,
            isSystemAccount: acc.isSystemAccount,
          },
        });
      }
    }

    // 3. Insert child accounts with parent references
    for (const acc of STANDARD_COA.filter((a) => a.parentCode)) {
      const existing = await this.prisma.account.findUnique({
        where: { accountCode: acc.accountCode },
      });
      if (!existing) {
        let parentId: string | undefined;
        if (acc.parentCode) {
          const parent = await this.prisma.account.findUnique({
            where: { accountCode: acc.parentCode },
          });
          parentId = parent?.id;
        }

        await this.prisma.account.create({
          data: {
            accountCode: acc.accountCode,
            accountName: acc.accountName,
            accountType: acc.accountType,
            accountGroup: acc.accountGroup,
            normalBalance: acc.normalBalance,
            description: acc.description,
            allowPosting: acc.allowPosting,
            isSystemAccount: acc.isSystemAccount,
            parentId,
          },
        });
      }
    }

    this.logger.log('Chart of Accounts bootstrap complete.');
  }

  /**
   * Retrieves all accounts with computed live balances.
   */
  async getAccounts(query: QueryAccountDto) {
    const where: any = {};
    if (query.type) where.accountType = query.type.toUpperCase();
    if (query.group) where.accountGroup = query.group.toUpperCase();
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.search) {
      where.OR = [
        { accountCode: { contains: query.search, mode: 'insensitive' } },
        { accountName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const accounts = await this.prisma.account.findMany({
      where,
      include: {
        parent: { select: { id: true, accountCode: true, accountName: true } },
        children: { select: { id: true, accountCode: true, accountName: true } },
        journalLines: {
          where: { journalEntry: { status: 'POSTED' } },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { accountCode: 'asc' },
    });

    return accounts.map((acc) => {
      const totalDebits = acc.journalLines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
      const totalCredits = acc.journalLines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
      const openBal = Number(acc.openingBalance || 0);

      let currentBalance = 0;
      if (acc.normalBalance === 'DEBIT') {
        currentBalance = openBal + totalDebits - totalCredits;
      } else {
        currentBalance = openBal + totalCredits - totalDebits;
      }

      return {
        id: acc.id,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountType: acc.accountType,
        accountGroup: acc.accountGroup,
        parentId: acc.parentId,
        parent: acc.parent,
        description: acc.description,
        normalBalance: acc.normalBalance,
        isSystemAccount: acc.isSystemAccount,
        isActive: acc.isActive,
        allowPosting: acc.allowPosting,
        openingBalance: openBal,
        openingBalanceDate: acc.openingBalanceDate,
        totalDebits,
        totalCredits,
        currentBalance,
        childCount: acc.children.length,
        createdAt: acc.createdAt,
      };
    });
  }

  /**
   * Retrieves single account by ID with ledger details.
   */
  async getAccountById(id: string) {
    const acc = await this.prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        journalLines: {
          where: { journalEntry: { status: 'POSTED' } },
          include: {
            journalEntry: {
              select: {
                id: true,
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
    });

    if (!acc) throw new NotFoundException(`Account with ID "${id}" not found.`);

    const totalDebits = acc.journalLines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
    const totalCredits = acc.journalLines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
    const openBal = Number(acc.openingBalance || 0);

    let currentBalance = 0;
    if (acc.normalBalance === 'DEBIT') {
      currentBalance = openBal + totalDebits - totalCredits;
    } else {
      currentBalance = openBal + totalCredits - totalDebits;
    }

    return {
      ...acc,
      totalDebits,
      totalCredits,
      currentBalance,
    };
  }

  /**
   * Creates a new user-defined account.
   */
  async createAccount(dto: CreateAccountDto) {
    const existing = await this.prisma.account.findUnique({
      where: { accountCode: dto.accountCode },
    });
    if (existing) {
      throw new BadRequestException(`Account code "${dto.accountCode}" is already in use.`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.account.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException(`Parent account with ID "${dto.parentId}" does not exist.`);
    }

    const normalBal =
      dto.normalBalance ||
      (['ASSET', 'EXPENSE'].includes(dto.accountType) ? 'DEBIT' : 'CREDIT');

    return this.prisma.account.create({
      data: {
        accountCode: dto.accountCode,
        accountName: dto.accountName,
        accountType: dto.accountType,
        accountGroup: dto.accountGroup,
        parentId: dto.parentId || null,
        description: dto.description || null,
        normalBalance: normalBal,
        isSystemAccount: false,
        allowPosting: dto.allowPosting !== undefined ? dto.allowPosting : true,
        openingBalance: Number(dto.openingBalance || 0),
        openingBalanceDate: dto.openingBalanceDate ? new Date(dto.openingBalanceDate) : null,
      },
    });
  }

  /**
   * Updates an existing account.
   */
  async updateAccount(id: string, dto: UpdateAccountDto) {
    const acc = await this.prisma.account.findUnique({ where: { id } });
    if (!acc) throw new NotFoundException(`Account with ID "${id}" not found.`);

    return this.prisma.account.update({
      where: { id },
      data: {
        accountName: dto.accountName !== undefined ? dto.accountName : acc.accountName,
        accountGroup: dto.accountGroup !== undefined ? dto.accountGroup : acc.accountGroup,
        parentId: dto.parentId !== undefined ? dto.parentId : acc.parentId,
        description: dto.description !== undefined ? dto.description : acc.description,
        isActive: dto.isActive !== undefined ? dto.isActive : acc.isActive,
        allowPosting: dto.allowPosting !== undefined ? dto.allowPosting : acc.allowPosting,
        openingBalance: dto.openingBalance !== undefined ? Number(dto.openingBalance) : acc.openingBalance,
        openingBalanceDate: dto.openingBalanceDate ? new Date(dto.openingBalanceDate) : acc.openingBalanceDate,
      },
    });
  }

  /**
   * Deactivates or removes an account safely.
   */
  async deleteAccount(id: string) {
    const acc = await this.prisma.account.findUnique({
      where: { id },
      include: {
        journalLines: { select: { id: true } },
        children: { select: { id: true } },
      },
    });

    if (!acc) throw new NotFoundException(`Account with ID "${id}" not found.`);

    if (acc.isSystemAccount) {
      throw new BadRequestException(`Cannot delete protected system account "${acc.accountName}".`);
    }

    if (acc.journalLines.length > 0) {
      throw new BadRequestException(
        `Cannot delete account "${acc.accountName}" because it has ${acc.journalLines.length} posted transaction(s). You may deactivate it instead.`,
      );
    }

    if (acc.children.length > 0) {
      throw new BadRequestException(
        `Cannot delete account "${acc.accountName}" because it contains ${acc.children.length} sub-account(s).`,
      );
    }

    return this.prisma.account.delete({ where: { id } });
  }

  /**
   * Returns hierarchical tree representation of COA.
   */
  async getAccountTree() {
    const accounts = await this.getAccounts({});
    const map = new Map<string, any>();
    const roots: any[] = [];

    accounts.forEach((acc) => {
      map.set(acc.id, { ...acc, children: [] });
    });

    accounts.forEach((acc) => {
      if (acc.parentId && map.has(acc.parentId)) {
        map.get(acc.parentId).children.push(map.get(acc.id));
      } else {
        roots.push(map.get(acc.id));
      }
    });

    return roots;
  }
}
