import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async resolveUserId(userId?: string): Promise<string> {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) return user.id;
    }
    const admin = await this.prisma.user.findFirst({ where: { status: 'ACTIVE' } });
    return admin?.id || 'usr-admin-01';
  }

  private async generateNotificationNumber(tx?: any): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();
    const prefix = `NOTIF-${year}-`;

    const last = await client.notification.findFirst({
      where: { notificationNumber: { startsWith: prefix } },
      orderBy: { notificationNumber: 'desc' },
    });

    let nextSeq = 1;
    if (last?.notificationNumber) {
      const parts = last.notificationNumber.split('-');
      const num = parseInt(parts[2], 10);
      if (!isNaN(num)) nextSeq = num + 1;
    }

    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  async create(dto: CreateNotificationDto, requestUserId?: string) {
    const effectiveUserId = dto.userId || (await this.resolveUserId(requestUserId));

    // Check idempotency if eventKey is provided
    if (dto.eventKey) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          eventKey: dto.eventKey,
          userId: effectiveUserId,
        },
      });
      if (existing) {
        return existing;
      }
    }

    // Check User Preferences (Allow CRITICAL priority to bypass category suppression)
    const priority = dto.priority || 'NORMAL';
    const category = dto.category || 'SYSTEM';

    if (priority !== 'CRITICAL') {
      const prefs = await this.getPreferences(effectiveUserId);
      if (prefs) {
        // Check priority threshold
        const priorityOrder = { LOW: 1, NORMAL: 2, HIGH: 3, CRITICAL: 4 };
        const minVal = priorityOrder[prefs.minPriority] || 1;
        const currentVal = priorityOrder[priority] || 2;
        if (currentVal < minVal) {
          return null; // Suppressed by minimum priority preference
        }

        // Check category suppression
        const categoryMap = {
          SALES: prefs.salesAlerts,
          PAYMENTS: prefs.paymentAlerts,
          INVENTORY: prefs.inventoryAlerts,
          PROCUREMENT: prefs.procurementAlerts,
          PAYABLES: prefs.payablesAlerts,
          PAYROLL: prefs.payrollAlerts,
          EMPLOYEE: prefs.employeeAlerts,
          ATTENDANCE: prefs.attendanceAlerts,
          SERVICE: prefs.serviceAlerts,
          AMC: prefs.amcAlerts,
          ASSET: prefs.assetAlerts,
          PREVENTIVE_MAINTENANCE: prefs.pmAlerts,
          SYSTEM: prefs.systemAlerts,
        };

        if (categoryMap[category] === false) {
          return null; // Suppressed by user category preference
        }
      }
    }

    const notificationNumber = await this.generateNotificationNumber();

    const notifType =
      dto.notificationType ||
      (priority === 'CRITICAL'
        ? 'Error'
        : priority === 'HIGH'
        ? 'Warning'
        : 'Info');

    const notification = await this.prisma.notification.create({
      data: {
        notificationNumber,
        userId: effectiveUserId,
        title: dto.title,
        message: dto.message,
        notificationType: notifType,
        category,
        priority,
        sourceModule: dto.sourceModule || null,
        sourceEntityId: dto.sourceEntityId || null,
        sourceReference: dto.sourceReference || null,
        actionUrl: dto.actionUrl || null,
        eventKey: dto.eventKey || null,
        metadata: dto.metadata || null,
        isRead: false,
        isArchived: false,
      },
    });

    // Record AuditLog
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: effectiveUserId,
          moduleName: 'NOTIFICATIONS',
          action: 'CREATE',
          recordId: notification.id,
        },
      });
    } catch {}

    return notification;
  }

  async findAll(query: NotificationQueryDto, requestUserId?: string) {
    const effectiveUserId = await this.resolveUserId(requestUserId);
    const {
      category,
      priority,
      sourceModule,
      status,
      isRead,
      isArchived,
      search,
      from,
      to,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {
      userId: effectiveUserId,
    };

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (sourceModule && sourceModule !== 'ALL') {
      where.sourceModule = sourceModule;
    }

    // Status Tab mapping
    if (status === 'UNREAD') {
      where.isRead = false;
      where.isArchived = false;
    } else if (status === 'READ') {
      where.isRead = true;
      where.isArchived = false;
    } else if (status === 'ARCHIVED') {
      where.isArchived = true;
    } else if (status === 'CRITICAL') {
      where.priority = 'CRITICAL';
      where.isArchived = false;
    } else if (status === 'ALL') {
      where.isArchived = false;
    } else {
      if (isRead !== undefined) where.isRead = isRead;
      if (isArchived !== undefined) {
        where.isArchived = isArchived;
      } else {
        where.isArchived = false;
      }
    }

    if (search && search.trim() !== '') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { sourceReference: { contains: search, mode: 'insensitive' } },
        { notificationNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  async getStats(requestUserId?: string) {
    const effectiveUserId = await this.resolveUserId(requestUserId);

    const allUserNotifs = await this.prisma.notification.findMany({
      where: { userId: effectiveUserId, isArchived: false },
    });

    const total = allUserNotifs.length;
    const unread = allUserNotifs.filter((n) => !n.isRead).length;
    const read = allUserNotifs.filter((n) => n.isRead).length;
    const critical = allUserNotifs.filter((n) => n.priority === 'CRITICAL' && !n.isRead).length;
    const high = allUserNotifs.filter((n) => n.priority === 'HIGH' && !n.isRead).length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const dueToday = allUserNotifs.filter((n) => {
      const created = new Date(n.createdAt);
      return created >= todayStart && created <= todayEnd && !n.isRead;
    }).length;

    const overdueAlerts = allUserNotifs.filter((n) => {
      return (
        !n.isRead &&
        (n.title.toLowerCase().includes('overdue') ||
          n.message.toLowerCase().includes('overdue') ||
          n.title.toLowerCase().includes('expired') ||
          n.message.toLowerCase().includes('expired'))
      );
    }).length;

    const archivedCount = await this.prisma.notification.count({
      where: { userId: effectiveUserId, isArchived: true },
    });

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    for (const n of allUserNotifs) {
      categoryBreakdown[n.category] = (categoryBreakdown[n.category] || 0) + 1;
    }

    return {
      total,
      unread,
      read,
      critical,
      high,
      dueToday,
      overdueAlerts,
      archivedCount,
      categoryBreakdown,
    };
  }

  async getUnreadCount(requestUserId?: string) {
    const effectiveUserId = await this.resolveUserId(requestUserId);
    const count = await this.prisma.notification.count({
      where: {
        userId: effectiveUserId,
        isRead: false,
        isArchived: false,
      },
    });
    return { unreadCount: count };
  }

  async findById(id: string, requestUserId?: string) {
    const effectiveUserId = await this.resolveUserId(requestUserId);
    const notif = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notif) {
      throw new NotFoundException(`Notification with ID "${id}" was not found.`);
    }

    if (notif.userId !== effectiveUserId) {
      // Return if authorized user or admin
      const user = await this.prisma.user.findUnique({
        where: { id: effectiveUserId },
        include: { role: true },
      });
      if (user?.role?.roleName !== 'Admin' && user?.role?.roleName !== 'Manager') {
        throw new NotFoundException(`Notification with ID "${id}" was not found.`);
      }
    }

    return notif;
  }

  async markAsRead(id: string, requestUserId?: string) {
    const notif = await this.findById(id, requestUserId);
    return await this.prisma.notification.update({
      where: { id: notif.id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAsUnread(id: string, requestUserId?: string) {
    const notif = await this.findById(id, requestUserId);
    return await this.prisma.notification.update({
      where: { id: notif.id },
      data: { isRead: false, readAt: null },
    });
  }

  async markAllAsRead(requestUserId?: string) {
    const effectiveUserId = await this.resolveUserId(requestUserId);
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: effectiveUserId,
        isRead: false,
        isArchived: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: effectiveUserId,
          moduleName: 'NOTIFICATIONS',
          action: 'READ_ALL',
        },
      });
    } catch {}

    return { success: true, count: result.count };
  }

  async archive(id: string, requestUserId?: string) {
    const notif = await this.findById(id, requestUserId);
    return await this.prisma.notification.update({
      where: { id: notif.id },
      data: { isArchived: true, archivedAt: new Date() },
    });
  }

  async archiveAll(requestUserId?: string) {
    const effectiveUserId = await this.resolveUserId(requestUserId);
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: effectiveUserId,
        isRead: true,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: effectiveUserId,
          moduleName: 'NOTIFICATIONS',
          action: 'ARCHIVE_ALL',
        },
      });
    } catch {}

    return { success: true, count: result.count };
  }

  async remove(id: string, requestUserId?: string) {
    const notif = await this.findById(id, requestUserId);
    await this.prisma.notification.delete({
      where: { id: notif.id },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: notif.userId,
          moduleName: 'NOTIFICATIONS',
          action: 'DELETE',
          recordId: id,
        },
      });
    } catch {}

    return { success: true, message: 'Notification deleted successfully.' };
  }

  async getPreferences(requestUserId?: string) {
    const effectiveUserId = await this.resolveUserId(requestUserId);
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId: effectiveUserId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: {
          userId: effectiveUserId,
          salesAlerts: true,
          paymentAlerts: true,
          inventoryAlerts: true,
          procurementAlerts: true,
          payablesAlerts: true,
          payrollAlerts: true,
          employeeAlerts: true,
          attendanceAlerts: true,
          serviceAlerts: true,
          amcAlerts: true,
          assetAlerts: true,
          pmAlerts: true,
          systemAlerts: true,
          minPriority: 'LOW',
        },
      });
    }

    return prefs;
  }

  async updatePreferences(dto: UpdatePreferencesDto, requestUserId?: string) {
    const effectiveUserId = await this.resolveUserId(requestUserId);
    await this.getPreferences(effectiveUserId); // Ensure exists

    const updated = await this.prisma.notificationPreference.update({
      where: { userId: effectiveUserId },
      data: {
        ...dto,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: effectiveUserId,
          moduleName: 'NOTIFICATIONS',
          action: 'UPDATE_PREFERENCES',
        },
      });
    } catch {}

    return updated;
  }

  /**
   * Evaluates business rules across ERP modules and generates deduplicated server-authoritative alerts.
   */
  async evaluateAutomatedRules(requestUserId?: string) {
    const effectiveUserId = await this.resolveUserId(requestUserId);
    const today = new Date().toISOString().split('T')[0];
    const createdAlerts: any[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 1. INVENTORY: Low Stock & Out of Stock
    try {
      const products = await this.prisma.product.findMany({
        where: { deletedAt: null },
      });
      for (const p of products) {
        if (p.stockQuantity === 0) {
          const notif = await this.create({
            userId: effectiveUserId,
            title: `Out of Stock: ${p.productName}`,
            message: `Product "${p.productName}" (SKU: ${p.sku}) has reached 0 units in warehouse stock. Immediate replenishment required.`,
            category: 'INVENTORY',
            priority: 'CRITICAL',
            sourceModule: 'INVENTORY',
            sourceEntityId: p.id,
            sourceReference: p.sku,
            actionUrl: '/inventory',
            eventKey: `RULE:OUT_OF_STOCK:${p.id}:${today}`,
          });
          if (notif) createdAlerts.push(notif);
        } else if (p.stockQuantity <= 5) {
          const notif = await this.create({
            userId: effectiveUserId,
            title: `Low Stock Alert: ${p.productName}`,
            message: `Stock level for "${p.productName}" is down to ${p.stockQuantity} (Reorder threshold: 5 units).`,
            category: 'INVENTORY',
            priority: 'HIGH',
            sourceModule: 'INVENTORY',
            sourceEntityId: p.id,
            sourceReference: p.sku,
            actionUrl: '/inventory',
            eventKey: `RULE:LOW_STOCK:${p.id}:${today}`,
          });
          if (notif) createdAlerts.push(notif);
        }
      }
    } catch (e) {
      this.logger.error('Error evaluating inventory rules', e);
    }

    // 2. PAYABLES: Overdue Vendor Bills & Bills Due Soon
    try {
      const vendorBills = await this.prisma.vendorBill.findMany({
        where: {
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        include: { supplier: true },
      });
      for (const vb of vendorBills) {
        const due = new Date(vb.dueDate);
        if (due < now) {
          const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          const notif = await this.create({
            userId: effectiveUserId,
            title: `Vendor Bill Overdue: ${vb.billNumber}`,
            message: `Vendor Bill ${vb.billNumber} from ${vb.supplier?.companyName || 'Supplier'} (Balance: ₹${vb.balanceAmount?.toFixed(2) || '0.00'}) is overdue by ${daysOverdue} day(s).`,
            category: 'PAYABLES',
            priority: 'HIGH',
            sourceModule: 'PAYABLES',
            sourceEntityId: vb.id,
            sourceReference: vb.billNumber,
            actionUrl: '/payables',
            eventKey: `RULE:OVERDUE_VB:${vb.id}:${today}`,
          });
          if (notif) createdAlerts.push(notif);
        }
      }
    } catch (e) {
      this.logger.error('Error evaluating payables rules', e);
    }

    // 3. INVOICES: Pending Customer Invoices
    try {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          paymentStatus: { in: ['Pending', 'Partial', 'Unpaid', 'Partially Paid'] },
        },
        include: { customer: true, payments: true },
      });
      for (const inv of invoices) {
        const paidTotal = inv.payments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0;
        const balance = Math.max(0, inv.grandTotal - paidTotal);
        if (balance > 0) {
          const notif = await this.create({
            userId: effectiveUserId,
            title: `Unpaid Customer Invoice: ${inv.invoiceNumber}`,
            message: `Invoice ${inv.invoiceNumber} for ${inv.customer?.companyName || inv.customer?.customerName || 'Customer'} has an outstanding balance of ₹${balance.toFixed(2)}.`,
            category: 'SALES',
            priority: 'NORMAL',
            sourceModule: 'INVOICES',
            sourceEntityId: inv.id,
            sourceReference: inv.invoiceNumber,
            actionUrl: '/invoices',
            eventKey: `RULE:UNPAID_INV:${inv.id}:${today}`,
          });
          if (notif) createdAlerts.push(notif);
        }
      }
    } catch (e) {
      this.logger.error('Error evaluating invoices rules', e);
    }

    // 4. AMC: Expiring AMC Contracts
    try {
      const amcs = await this.prisma.aMCContract.findMany({
        where: {
          status: { in: ['Active', 'ACTIVE', 'Expiring Soon'] },
        },
        include: { customer: true },
      });
      for (const amc of amcs) {
        const end = new Date(amc.endDate);
        if (end <= now) {
          const notif = await this.create({
            userId: effectiveUserId,
            title: `AMC Contract Expired: ${amc.amcNumber}`,
            message: `AMC Contract ${amc.amcNumber} for ${amc.customer?.companyName || amc.customer?.customerName} expired on ${end.toLocaleDateString('en-IN')}. Renewal required.`,
            category: 'AMC',
            priority: 'HIGH',
            sourceModule: 'AMC',
            sourceEntityId: amc.id,
            sourceReference: amc.amcNumber,
            actionUrl: '/amc',
            eventKey: `RULE:EXPIRED_AMC:${amc.id}:${today}`,
          });
          if (notif) createdAlerts.push(notif);
        } else if (end <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const notif = await this.create({
            userId: effectiveUserId,
            title: `AMC Contract Expiring Soon: ${amc.amcNumber}`,
            message: `AMC Contract ${amc.amcNumber} for ${amc.customer?.companyName || amc.customer?.customerName} will expire in ${daysLeft} days (${end.toLocaleDateString('en-IN')}).`,
            category: 'AMC',
            priority: 'NORMAL',
            sourceModule: 'AMC',
            sourceEntityId: amc.id,
            sourceReference: amc.amcNumber,
            actionUrl: '/amc',
            eventKey: `RULE:EXPIRING_AMC:${amc.id}:${today}`,
          });
          if (notif) createdAlerts.push(notif);
        }
      }
    } catch (e) {
      this.logger.error('Error evaluating AMC rules', e);
    }

    // 5. PREVENTIVE MAINTENANCE: Overdue PM Visits
    try {
      const pmSchedules = await this.prisma.preventiveMaintenanceSchedule.findMany({
        where: { status: { in: ['SCHEDULED', 'ASSIGNED'] } },
        include: { customer: true, asset: true, technician: true },
      });
      for (const pm of pmSchedules) {
        const planned = new Date(pm.plannedDate);
        if (planned < now) {
          const notif = await this.create({
            userId: effectiveUserId,
            title: `Overdue Preventive Maintenance: ${pm.pmNumber}`,
            message: `PM Visit ${pm.pmNumber} for Asset ${pm.asset?.assetNumber || ''} (${pm.customer?.companyName || pm.customer?.customerName}) planned on ${planned.toLocaleDateString('en-IN')} is overdue.`,
            category: 'PREVENTIVE_MAINTENANCE',
            priority: 'HIGH',
            sourceModule: 'PREVENTIVE_MAINTENANCE',
            sourceEntityId: pm.id,
            sourceReference: pm.pmNumber,
            actionUrl: '/preventive-maintenance',
            eventKey: `RULE:OVERDUE_PM:${pm.id}:${today}`,
          });
          if (notif) createdAlerts.push(notif);
        }
      }
    } catch (e) {
      this.logger.error('Error evaluating PM rules', e);
    }

    // 6. ASSETS: Warranty Expiry
    try {
      const assets = await this.prisma.asset.findMany({
        where: { status: 'ACTIVE', warrantyEndDate: { not: null } },
        include: { customer: true },
      });
      for (const a of assets) {
        if (a.warrantyEndDate) {
          const wEnd = new Date(a.warrantyEndDate);
          if (wEnd <= now) {
            const notif = await this.create({
              userId: effectiveUserId,
              title: `Asset Warranty Expired: ${a.assetNumber}`,
              message: `OEM Warranty for ${a.brandName} ${a.modelNumber} (${a.assetNumber}) installed at ${a.customer?.companyName || a.customer?.customerName} has expired. Offer AMC contract.`,
              category: 'ASSET',
              priority: 'NORMAL',
              sourceModule: 'ASSET',
              sourceEntityId: a.id,
              sourceReference: a.assetNumber,
              actionUrl: '/assets',
              eventKey: `RULE:EXPIRED_WARRANTY:${a.id}:${today}`,
            });
            if (notif) createdAlerts.push(notif);
          } else if (wEnd <= thirtyDaysFromNow) {
            const daysLeft = Math.ceil((wEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const notif = await this.create({
              userId: effectiveUserId,
              title: `Asset Warranty Expiring: ${a.assetNumber}`,
              message: `Warranty for ${a.brandName} ${a.modelNumber} (${a.assetNumber}) will expire in ${daysLeft} days.`,
              category: 'ASSET',
              priority: 'LOW',
              sourceModule: 'ASSET',
              sourceEntityId: a.id,
              sourceReference: a.assetNumber,
              actionUrl: '/assets',
              eventKey: `RULE:EXPIRING_WARRANTY:${a.id}:${today}`,
            });
            if (notif) createdAlerts.push(notif);
          }
        }
      }
    } catch (e) {
      this.logger.error('Error evaluating asset warranty rules', e);
    }

    // 7. PAYROLL: Pending Payroll Periods
    try {
      const payrollPeriods = await this.prisma.payrollPeriod.findMany({
        where: { status: { in: ['DRAFT', 'CALCULATED', 'REVIEW', 'Pending Review', 'Draft'] } },
      });
      for (const pp of payrollPeriods) {
        const notif = await this.create({
          userId: effectiveUserId,
          title: `Payroll Period Pending: ${pp.month}/${pp.year}`,
          message: `Payroll period for month ${pp.month}/${pp.year} (Status: ${pp.status}) requires review and approval.`,
          category: 'PAYROLL',
          priority: 'HIGH',
          sourceModule: 'PAYROLL',
          sourceEntityId: pp.id,
          sourceReference: `${pp.month}/${pp.year}`,
          actionUrl: '/payroll',
          eventKey: `RULE:PAYROLL_PENDING:${pp.id}:${today}`,
        });
        if (notif) createdAlerts.push(notif);
      }
    } catch (e) {
      this.logger.error('Error evaluating payroll rules', e);
    }

    return {
      success: true,
      message: `Automated rule evaluation completed. ${createdAlerts.length} new alert(s) generated.`,
      newAlertsCount: createdAlerts.length,
    };
  }
}
