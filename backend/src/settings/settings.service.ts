import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateCompanySettingsDto,
  UpdateSystemSettingDto,
  AuditLogQueryDto,
} from './dto/settings.dto';

export const DEFAULT_SYSTEM_SETTINGS = [
  // 1. COMPANY
  { key: 'COMPANY_LEGAL_NAME', value: 'FREEZE TECHNOLOGY', category: 'COMPANY', description: 'Registered Enterprise Trade Name', dataType: 'STRING' },
  { key: 'COMPANY_BRAND_AUTH', value: 'Panasonic Authorised Sales & Service', category: 'COMPANY', description: 'OEM Authorization text displayed on invoices and quotes', dataType: 'STRING' },
  { key: 'COMPANY_GSTIN', value: '33BKCPD7319A2ZU', category: 'COMPANY', description: 'Primary GST Identification Number', dataType: 'STRING' },
  { key: 'COMPANY_PAN', value: 'BKCPD7319A', category: 'COMPANY', description: 'Permanent Account Number', dataType: 'STRING' },
  { key: 'COMPANY_EMAIL', value: 'freezetechnology.ft@gmail.com', category: 'COMPANY', description: 'Primary business email for communications', dataType: 'STRING' },
  { key: 'COMPANY_PHONE', value: '044-35723836', category: 'COMPANY', description: 'Office Landline Telephone', dataType: 'STRING' },
  { key: 'COMPANY_MOBILE', value: '9884955011', category: 'COMPANY', description: 'Support and Escalation Mobile', dataType: 'STRING' },
  { key: 'COMPANY_ADDRESS', value: 'C15, 1st Cross Street, PTC Quarters, Thoraipakkam, OMR, Chennai - 600 097', category: 'COMPANY', description: 'Registered Office Address', dataType: 'STRING' },

  // 2. FINANCE
  { key: 'FINANCE_CURRENCY_SYMBOL', value: '₹', category: 'FINANCE', description: 'Currency Symbol (INR)', dataType: 'STRING' },
  { key: 'FINANCE_CURRENCY_CODE', value: 'INR', category: 'FINANCE', description: 'ISO Currency Code', dataType: 'STRING' },
  { key: 'FINANCE_PAYMENT_TERMS_DAYS', value: '15', category: 'FINANCE', description: 'Standard Invoice Payment Term in days', dataType: 'NUMBER' },
  { key: 'FINANCE_BANK_NAME', value: 'Axis Bank', category: 'FINANCE', description: 'Default Settlement Bank', dataType: 'STRING' },
  { key: 'FINANCE_BANK_BRANCH', value: 'Thoraipakkam', category: 'FINANCE', description: 'Bank Branch Location', dataType: 'STRING' },
  { key: 'FINANCE_BANK_ACCOUNT_NO', value: '915020010100166', category: 'FINANCE', description: 'Current Bank Account Number', dataType: 'STRING' },
  { key: 'FINANCE_BANK_IFSC', value: 'UTIB0001566', category: 'FINANCE', description: 'NEFT/RTGS IFSC Code', dataType: 'STRING' },

  // 3. TAX
  { key: 'TAX_DEFAULT_GST_RATE', value: '18', category: 'TAX', description: 'Default GST Percentage for HVAC Services & Equipment', dataType: 'NUMBER' },
  { key: 'TAX_HSN_AC_SERVICES', value: '998719', category: 'TAX', description: 'Default SAC code for HVAC Maintenance & Repair', dataType: 'STRING' },
  { key: 'TAX_HSN_AC_PRODUCTS', value: '8415', category: 'TAX', description: 'Default HSN code for Air Conditioners & Compressors', dataType: 'STRING' },

  // 4. PAYROLL
  { key: 'PAYROLL_STANDARD_HOURS_PER_DAY', value: '8', category: 'PAYROLL', description: 'Standard Daily Shift Duration (Hours)', dataType: 'NUMBER' },
  { key: 'PAYROLL_OVERTIME_RATE_MULTIPLIER', value: '1.5', category: 'PAYROLL', description: 'Overtime Hourly Rate Multiplier', dataType: 'NUMBER' },
  { key: 'PAYROLL_CUTOFF_DAY_OF_MONTH', value: '25', category: 'PAYROLL', description: 'Monthly Attendance Cutoff Date', dataType: 'NUMBER' },

  // 5. INVENTORY
  { key: 'INVENTORY_DEFAULT_REORDER_LEVEL', value: '5', category: 'INVENTORY', description: 'Default low stock warning threshold', dataType: 'NUMBER' },
  { key: 'INVENTORY_AUTO_DEDUCT_ON_PM', value: 'true', category: 'INVENTORY', description: 'Deduct spare parts atomically upon PM visit completion', dataType: 'BOOLEAN' },

  // 6. NOTIFICATIONS
  { key: 'NOTIFICATIONS_AUTO_EVALUATE_DAILY', value: 'true', category: 'NOTIFICATIONS', description: 'Run automated alert checks on business events', dataType: 'BOOLEAN' },
  { key: 'NOTIFICATIONS_AMC_EXPIRY_WARNING_DAYS', value: '30', category: 'NOTIFICATIONS', description: 'Days before AMC expiration to trigger renewal alert', dataType: 'NUMBER' },
  { key: 'NOTIFICATIONS_WARRANTY_EXPIRY_DAYS', value: '30', category: 'NOTIFICATIONS', description: 'Days before OEM warranty expiry to trigger alert', dataType: 'NUMBER' },

  // 7. SECURITY
  { key: 'SECURITY_SESSION_TIMEOUT_MINUTES', value: '60', category: 'SECURITY', description: 'Idle JWT session expiry timeout in minutes', dataType: 'NUMBER' },
  { key: 'SECURITY_PASSWORD_MIN_LENGTH', value: '6', category: 'SECURITY', description: 'Minimum password character length', dataType: 'NUMBER' },

  // 8. DOCUMENTS
  { key: 'DOC_INVOICE_PREFIX', value: 'FT/YYYY/', category: 'DOCUMENTS', description: 'Tax Invoice prefix pattern', dataType: 'STRING' },
  { key: 'DOC_QUOTATION_PREFIX', value: 'QTN-YYYY-', category: 'DOCUMENTS', description: 'Sales Quotation prefix pattern', dataType: 'STRING' },
  { key: 'DOC_AMC_PREFIX', value: 'AMC-YYYY-', category: 'DOCUMENTS', description: 'AMC Contract prefix pattern', dataType: 'STRING' },
  { key: 'DOC_PM_PREFIX', value: 'PM-YYYY-', category: 'DOCUMENTS', description: 'Preventive Maintenance Schedule prefix pattern', dataType: 'STRING' },
  { key: 'DOC_ASSET_PREFIX', value: 'AST-YYYY-', category: 'DOCUMENTS', description: 'Customer Asset prefix pattern', dataType: 'STRING' },
  { key: 'DOC_PURCHASE_ORDER_PREFIX', value: 'PO-YYYY-', category: 'DOCUMENTS', description: 'Purchase Order prefix pattern', dataType: 'STRING' },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.bootstrapDefaultSystemSettings().catch((err) =>
      this.logger.error('Background System Settings bootstrap failed', err),
    );
  }

  /**
   * Initializes default system settings in PostgreSQL.
   */
  async bootstrapDefaultSystemSettings() {
    try {
      // 1. Initialize CompanySettings table
      const company = await this.prisma.companySettings.findFirst();
      if (!company) {
        await this.prisma.companySettings.create({
          data: {
            companyName: 'FREEZE TECHNOLOGY',
            subTitle: 'Air Conditioning & Refrigeration Sales & Service',
            gstNumber: '33BKCPD7319A2ZU',
            brandAuth: 'Panasonic Authorised Sales & Service',
            regdOffice: 'C15, 1st Cross Street, PTC Quarters, Thoraipakkam, OMR, Chennai - 600 097',
            phone: '044-35723836',
            cell: '9884955011',
            email: 'freezetechnology.ft@gmail.com',
            bankName: 'Axis Bank',
            bankBranch: 'Thoraipakkam',
            bankAccountNo: '915020010100166',
            ifscCode: 'UTIB0001566',
          },
        });
      }

      // 2. Initialize SystemSettings table
      const existingSettingCount = await this.prisma.systemSetting.count();
      if (existingSettingCount < DEFAULT_SYSTEM_SETTINGS.length) {
        for (const s of DEFAULT_SYSTEM_SETTINGS) {
          await this.prisma.systemSetting.upsert({
            where: { key: s.key },
            update: {
              category: s.category,
              description: s.description,
              dataType: s.dataType,
            },
            create: {
              key: s.key,
              value: s.value,
              category: s.category,
              description: s.description,
              dataType: s.dataType,
              isSensitive: false,
              isEditable: true,
            },
          });
        }
      }

      this.logger.log('System settings verified.');
    } catch (err) {
      this.logger.error('Error bootstrapping system settings', err);
    }
  }

  async getCompanySettings() {
    let company = await this.prisma.companySettings.findFirst();
    if (!company) {
      company = await this.prisma.companySettings.create({
        data: {
          companyName: 'FREEZE TECHNOLOGY',
          subTitle: 'Air Conditioning & Refrigeration Sales & Service',
          gstNumber: '33BKCPD7319A2ZU',
          brandAuth: 'Panasonic Authorised Sales & Service',
          regdOffice: 'C15, 1st Cross Street, PTC Quarters, Thoraipakkam, OMR, Chennai - 600 097',
          phone: '044-35723836',
          cell: '9884955011',
          email: 'freezetechnology.ft@gmail.com',
          bankName: 'Axis Bank',
          bankBranch: 'Thoraipakkam',
          bankAccountNo: '915020010100166',
          ifscCode: 'UTIB0001566',
        },
      });
    }
    return company;
  }

  async updateCompanySettings(dto: UpdateCompanySettingsDto, userId?: string) {
    let company = await this.prisma.companySettings.findFirst();
    if (!company) {
      company = await this.prisma.companySettings.create({ data: dto as any });
    } else {
      company = await this.prisma.companySettings.update({
        where: { id: company.id },
        data: dto,
      });
    }

    // Record AuditLog
    try {
      const actorId = await this.resolveUserId(userId);
      await this.prisma.auditLog.create({
        data: {
          userId: actorId,
          moduleName: 'SETTINGS',
          action: 'UPDATE_COMPANY',
          recordId: company.id,
          details: JSON.stringify(dto),
        },
      });
    } catch {}

    return company;
  }

  async getAllSystemSettings() {
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};
    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push({
        id: s.id,
        key: s.key,
        value: s.value,
        category: s.category,
        description: s.description,
        dataType: s.dataType,
        isSensitive: s.isSensitive,
        isEditable: s.isEditable,
        updatedAt: s.updatedAt,
      });
    }

    return {
      total: settings.length,
      grouped,
      settings,
    };
  }

  async getSystemSettingsByCategory(category: string) {
    const settings = await this.prisma.systemSetting.findMany({
      where: { category: category.toUpperCase() },
      orderBy: { key: 'asc' },
    });

    return settings;
  }

  async updateSystemSetting(key: string, dto: UpdateSystemSettingDto, userId?: string) {
    const existing = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Setting with key "${key}" was not found.`);
    }

    if (!existing.isEditable) {
      throw new BadRequestException(`Setting "${key}" is read-only and cannot be modified.`);
    }

    const updated = await this.prisma.systemSetting.update({
      where: { key },
      data: {
        value: dto.value,
        ...(dto.description && { description: dto.description }),
        updatedById: userId || null,
      },
    });

    // Record AuditLog
    try {
      const actorId = await this.resolveUserId(userId);
      await this.prisma.auditLog.create({
        data: {
          userId: actorId,
          moduleName: 'SETTINGS',
          action: 'UPDATE_SYSTEM_SETTING',
          recordId: updated.id,
          details: JSON.stringify({
            key,
            previousValue: existing.value,
            newValue: updated.value,
          }),
        },
      });
    } catch {}

    return updated;
  }

  async getAuditLogs(query: AuditLogQueryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '25', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.moduleName) {
      where.moduleName = { equals: query.moduleName.toUpperCase() };
    }
    if (query.action) {
      where.action = { equals: query.action.toUpperCase() };
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { moduleName: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: { select: { roleName: true } },
            },
          },
        },
      }),
    ]);

    return {
      items: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSystemDiagnostics() {
    const [
      usersCount,
      rolesCount,
      permissionsCount,
      customersCount,
      productsCount,
      invoicesCount,
      assetsCount,
      amcCount,
      auditLogsCount,
      notificationsCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.role.count(),
      this.prisma.permission.count(),
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.invoice.count(),
      this.prisma.asset.count(),
      this.prisma.aMCContract.count(),
      this.prisma.auditLog.count(),
      this.prisma.notification.count(),
    ]);

    return {
      databaseStatus: 'CONNECTED',
      databaseProvider: 'PostgreSQL / Supabase',
      serverTime: new Date().toISOString(),
      activeCounts: {
        users: usersCount,
        roles: rolesCount,
        permissions: permissionsCount,
        customers: customersCount,
        products: productsCount,
        invoices: invoicesCount,
        assets: assetsCount,
        amcContracts: amcCount,
        auditLogs: auditLogsCount,
        notifications: notificationsCount,
      },
    };
  }

  private async resolveUserId(userId?: string): Promise<string> {
    if (userId) {
      const exists = await this.prisma.user.findUnique({ where: { id: userId } });
      if (exists) return userId;
    }
    const admin = await this.prisma.user.findFirst({
      where: { email: 'admin@freezetechnology.in' },
    });
    if (admin) return admin.id;
    const first = await this.prisma.user.findFirst();
    return first?.id || 'system-admin';
  }
}
