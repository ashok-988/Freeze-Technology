import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from './dto/role.dto';

export const SYSTEM_PERMISSIONS = [
  // 1. CRM
  { code: 'customers.view', moduleName: 'CRM', action: 'view', description: 'View customer accounts and directories' },
  { code: 'customers.create', moduleName: 'CRM', action: 'create', description: 'Create new customer accounts' },
  { code: 'customers.update', moduleName: 'CRM', action: 'update', description: 'Edit existing customer accounts' },
  { code: 'customers.delete', moduleName: 'CRM', action: 'delete', description: 'Delete or archive customer accounts' },

  // 2. Products
  { code: 'products.view', moduleName: 'Products', action: 'view', description: 'View product catalog and pricing' },
  { code: 'products.create', moduleName: 'Products', action: 'create', description: 'Add new products and spare parts' },
  { code: 'products.update', moduleName: 'Products', action: 'update', description: 'Update product specifications and pricing' },
  { code: 'products.delete', moduleName: 'Products', action: 'delete', description: 'Archive products' },

  // 3. Quotations
  { code: 'quotations.view', moduleName: 'Quotations', action: 'view', description: 'View sales quotations' },
  { code: 'quotations.create', moduleName: 'Quotations', action: 'create', description: 'Create sales quotations' },
  { code: 'quotations.update', moduleName: 'Quotations', action: 'update', description: 'Edit sales quotations' },
  { code: 'quotations.approve', moduleName: 'Quotations', action: 'approve', description: 'Approve and convert quotations to invoices' },

  // 4. Invoices
  { code: 'invoices.view', moduleName: 'Invoices', action: 'view', description: 'View GST tax invoices' },
  { code: 'invoices.create', moduleName: 'Invoices', action: 'create', description: 'Generate GST tax invoices' },
  { code: 'invoices.update', moduleName: 'Invoices', action: 'update', description: 'Edit draft invoices' },
  { code: 'invoices.cancel', moduleName: 'Invoices', action: 'cancel', description: 'Cancel or void tax invoices' },

  // 5. Payments
  { code: 'payments.view', moduleName: 'Payments', action: 'view', description: 'View customer payment receipts' },
  { code: 'payments.create', moduleName: 'Payments', action: 'create', description: 'Record customer payment collections' },
  { code: 'payments.update', moduleName: 'Payments', action: 'update', description: 'Edit payment allocations' },

  // 6. Services
  { code: 'services.view', moduleName: 'Services', action: 'view', description: 'View service job cards' },
  { code: 'services.create', moduleName: 'Services', action: 'create', description: 'Create service complaints and jobs' },
  { code: 'services.update', moduleName: 'Services', action: 'update', description: 'Update job card progress' },
  { code: 'services.assign', moduleName: 'Services', action: 'assign', description: 'Assign field technicians to jobs' },
  { code: 'services.complete', moduleName: 'Services', action: 'complete', description: 'Complete job cards with spare consumption' },

  // 7. AMC
  { code: 'amc.view', moduleName: 'AMC', action: 'view', description: 'View AMC contracts and schedules' },
  { code: 'amc.create', moduleName: 'AMC', action: 'create', description: 'Create new AMC contracts' },
  { code: 'amc.update', moduleName: 'AMC', action: 'update', description: 'Edit AMC contracts' },
  { code: 'amc.approve', moduleName: 'AMC', action: 'approve', description: 'Renew and activate AMC contracts' },
  { code: 'amc.billing', moduleName: 'AMC', action: 'billing', description: 'Generate recurring AMC billing invoices' },

  // 8. Installations
  { code: 'installations.view', moduleName: 'Installations', action: 'view', description: 'View HVAC installation projects' },
  { code: 'installations.create', moduleName: 'Installations', action: 'create', description: 'Create installation requests' },
  { code: 'installations.update', moduleName: 'Installations', action: 'update', description: 'Update installation progress' },
  { code: 'installations.complete', moduleName: 'Installations', action: 'complete', description: 'Commission and complete installations' },

  // 9. Inventory
  { code: 'inventory.view', moduleName: 'Inventory', action: 'view', description: 'View warehouse stock and ledger' },
  { code: 'inventory.create', moduleName: 'Inventory', action: 'create', description: 'Receive incoming stock' },
  { code: 'inventory.update', moduleName: 'Inventory', action: 'update', description: 'Edit stock records' },
  { code: 'inventory.adjust', moduleName: 'Inventory', action: 'adjust', description: 'Perform manual stock adjustments' },

  // 10. Suppliers & Purchase Orders
  { code: 'suppliers.view', moduleName: 'Suppliers', action: 'view', description: 'View vendor and supplier directory' },
  { code: 'suppliers.create', moduleName: 'Suppliers', action: 'create', description: 'Register new suppliers' },
  { code: 'suppliers.update', moduleName: 'Suppliers', action: 'update', description: 'Edit supplier profiles' },
  { code: 'suppliers.deactivate', moduleName: 'Suppliers', action: 'deactivate', description: 'Deactivate vendor accounts' },
  { code: 'purchase_orders.view', moduleName: 'Procurement', action: 'view', description: 'View purchase orders' },
  { code: 'purchase_orders.create', moduleName: 'Procurement', action: 'create', description: 'Create purchase orders' },
  { code: 'purchase_orders.submit', moduleName: 'Procurement', action: 'submit', description: 'Submit PO for approval' },
  { code: 'purchase_orders.approve', moduleName: 'Procurement', action: 'approve', description: 'Approve vendor purchase orders' },
  { code: 'purchase_orders.receive', moduleName: 'Procurement', action: 'receive', description: 'Receive Goods Receipt Note (GRN)' },

  // 11. HR, Attendance & Payroll
  { code: 'employees.view', moduleName: 'HR', action: 'view', description: 'View employee directory' },
  { code: 'employees.create', moduleName: 'HR', action: 'create', description: 'Onboard new staff & technicians' },
  { code: 'employees.update', moduleName: 'HR', action: 'update', description: 'Update employee profiles' },
  { code: 'employees.deactivate', moduleName: 'HR', action: 'deactivate', description: 'Deactivate employee records' },
  { code: 'attendance.view', moduleName: 'Attendance', action: 'view', description: 'View daily attendance logs' },
  { code: 'attendance.create', moduleName: 'Attendance', action: 'create', description: 'Log employee attendance punches' },
  { code: 'attendance.update', moduleName: 'Attendance', action: 'update', description: 'Edit attendance records' },
  { code: 'attendance.approve', moduleName: 'Attendance', action: 'approve', description: 'Approve monthly attendance sheets' },
  { code: 'payroll.view', moduleName: 'Payroll', action: 'view', description: 'View payroll periods and salary records' },
  { code: 'payroll.calculate', moduleName: 'Payroll', action: 'calculate', description: 'Run payroll calculation engine' },
  { code: 'payroll.review', moduleName: 'Payroll', action: 'review', description: 'Review monthly payroll statements' },
  { code: 'payroll.approve', moduleName: 'Payroll', action: 'approve', description: 'Approve payroll for disbursement' },
  { code: 'payroll.pay', moduleName: 'Payroll', action: 'pay', description: 'Mark payroll disbursed & record payment' },

  // 12. Payables & Expenses
  { code: 'payables.view', moduleName: 'Payables', action: 'view', description: 'View vendor bills and expenses' },
  { code: 'payables.create', moduleName: 'Payables', action: 'create', description: 'Record vendor bills & expenses' },
  { code: 'payables.update', moduleName: 'Payables', action: 'update', description: 'Edit vendor bills & expenses' },
  { code: 'payables.approve', moduleName: 'Payables', action: 'approve', description: 'Approve vendor payments & expenses' },
  { code: 'payables.pay', moduleName: 'Payables', action: 'pay', description: 'Disburse supplier payments' },

  // 13. Reports
  { code: 'reports.view', moduleName: 'Reports', action: 'view', description: 'View executive management & financial reports' },
  { code: 'reports.export', moduleName: 'Reports', action: 'export', description: 'Export PDF & Excel analytical statements' },

  // 14. Asset Management & Preventive Maintenance
  { code: 'assets.view', moduleName: 'Assets', action: 'view', description: 'View installed customer assets register' },
  { code: 'assets.create', moduleName: 'Assets', action: 'create', description: 'Register customer equipment and QR tracking' },
  { code: 'assets.update', moduleName: 'Assets', action: 'update', description: 'Update asset details and warranty' },
  { code: 'assets.deactivate', moduleName: 'Assets', action: 'deactivate', description: 'Decommission installed assets' },
  { code: 'preventive_maintenance.view', moduleName: 'Preventive Maintenance', action: 'view', description: 'View PM schedules' },
  { code: 'preventive_maintenance.create', moduleName: 'Preventive Maintenance', action: 'create', description: 'Schedule preventive maintenance visits' },
  { code: 'preventive_maintenance.complete', moduleName: 'Preventive Maintenance', action: 'complete', description: 'Execute PM visit with checklist' },

  // 15. Notifications
  { code: 'notifications.view', moduleName: 'Notifications', action: 'view', description: 'View notifications and communication center' },
  { code: 'notifications.manage', moduleName: 'Notifications', action: 'manage', description: 'Run automated scanners & mark read/archive' },
  { code: 'notifications.preferences', moduleName: 'Notifications', action: 'preferences', description: 'Customize notification alerts' },

  // 16. System Administration & RBAC
  { code: 'settings.view', moduleName: 'Settings', action: 'view', description: 'View company settings and system parameters' },
  { code: 'settings.update', moduleName: 'Settings', action: 'update', description: 'Update company profile & system defaults' },
  { code: 'users.view', moduleName: 'Administration', action: 'view', description: 'View ERP user directory' },
  { code: 'users.create', moduleName: 'Administration', action: 'create', description: 'Create user logins' },
  { code: 'users.update', moduleName: 'Administration', action: 'update', description: 'Update user profiles' },
  { code: 'users.deactivate', moduleName: 'Administration', action: 'deactivate', description: 'Activate or deactivate users' },
  { code: 'users.assign_role', moduleName: 'Administration', action: 'assign_role', description: 'Assign roles to users' },
  { code: 'roles.view', moduleName: 'Administration', action: 'view', description: 'View RBAC roles' },
  { code: 'roles.create', moduleName: 'Administration', action: 'create', description: 'Create custom roles' },
  { code: 'roles.update', moduleName: 'Administration', action: 'update', description: 'Edit custom role profiles' },
  { code: 'roles.manage_permissions', moduleName: 'Administration', action: 'manage_permissions', description: 'Configure role permission matrix' },
  { code: 'audit_logs.view', moduleName: 'Administration', action: 'view', description: 'View security & transaction audit logs' },
  { code: 'audit_logs.export', moduleName: 'Administration', action: 'export', description: 'Export audit logs' },
];

export const SYSTEM_ROLES_DEFAULT = [
  {
    code: 'SUPER_ADMIN',
    roleName: 'Super Administrator',
    description: 'Unrestricted full access to all system modules, user administration, and system settings.',
    isSystemRole: true,
    permissionPattern: '*',
  },
  {
    code: 'ADMIN',
    roleName: 'Administrator',
    description: 'System administration, user operations, and broad enterprise access.',
    isSystemRole: true,
    permissionPattern: 'all_except_super_admin',
  },
  {
    code: 'MANAGER',
    roleName: 'Operations Manager',
    description: 'Operational management across Sales, Services, Inventory, AMC, and Reports.',
    isSystemRole: true,
    permissionPattern: 'operations',
  },
  {
    code: 'ACCOUNTS',
    roleName: 'Accountant',
    description: 'Finance, Invoicing, Payments, Vendor Payables, Payroll, and GST Reports.',
    isSystemRole: true,
    permissionPattern: 'finance',
  },
  {
    code: 'HR',
    roleName: 'HR Specialist',
    description: 'Employee lifecycle, daily attendance, and payroll review.',
    isSystemRole: true,
    permissionPattern: 'hr',
  },
  {
    code: 'PROCUREMENT',
    roleName: 'Procurement Officer',
    description: 'Supplier registration, purchase order workflow, and stock replenishment.',
    isSystemRole: true,
    permissionPattern: 'procurement',
  },
  {
    code: 'SERVICE_MANAGER',
    roleName: 'Service Manager',
    description: 'Field service complaints, AMC contract tracker, PM schedules, and asset maintenance.',
    isSystemRole: true,
    permissionPattern: 'services',
  },
  {
    code: 'FIELD_TECHNICIAN',
    roleName: 'Field Technician',
    description: 'Assigned service job cards, PM visits, and installation commissions.',
    isSystemRole: true,
    permissionPattern: 'technician',
  },
  {
    code: 'VIEWER',
    roleName: 'Viewer',
    description: 'Read-only access to operational dashboards and reports.',
    isSystemRole: true,
    permissionPattern: 'viewer',
  },
];

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.bootstrapDefaultRolesAndPermissions().catch((err) =>
      this.logger.error('Background RBAC bootstrap failed', err),
    );
  }

  /**
   * Initializes or updates system permissions and roles cleanly in database.
   */
  async bootstrapDefaultRolesAndPermissions() {
    try {
      const existingPermCount = await this.prisma.permission.count();
      if (existingPermCount < SYSTEM_PERMISSIONS.length) {
        // Upsert all normalized permissions
        for (const p of SYSTEM_PERMISSIONS) {
          await this.prisma.permission.upsert({
            where: { code: p.code },
            update: {
              moduleName: p.moduleName,
              action: p.action,
              description: p.description,
            },
            create: {
              code: p.code,
              moduleName: p.moduleName,
              action: p.action,
              description: p.description,
            },
          });
        }
      }

      const allPermissions = await this.prisma.permission.findMany();
      const permMap = new Map<string, string>();
      for (const p of allPermissions) {
        if (p.code) permMap.set(p.code, p.id);
      }

      // 2. Upsert default system roles
      for (const r of SYSTEM_ROLES_DEFAULT) {
        try {
          const role = await this.prisma.role.upsert({
            where: { roleName: r.roleName },
            update: {
              code: r.code,
              description: r.description,
              isSystemRole: true,
              isActive: true,
            },
            create: {
              roleName: r.roleName,
              code: r.code,
              description: r.description,
              isSystemRole: true,
              isActive: true,
            },
          });

          // Map role permissions
          let targetCodes: string[] = [];
          if (r.permissionPattern === '*') {
            targetCodes = SYSTEM_PERMISSIONS.map((p) => p.code);
          } else if (r.permissionPattern === 'all_except_super_admin') {
            targetCodes = SYSTEM_PERMISSIONS.map((p) => p.code);
          } else if (r.permissionPattern === 'operations') {
            targetCodes = SYSTEM_PERMISSIONS.filter((p) =>
              ['CRM', 'Products', 'Quotations', 'Invoices', 'Services', 'AMC', 'Installations', 'Inventory', 'Assets', 'Preventive Maintenance', 'Reports', 'Notifications'].includes(p.moduleName)
            ).map((p) => p.code);
          } else if (r.permissionPattern === 'finance') {
            targetCodes = SYSTEM_PERMISSIONS.filter((p) =>
              ['Invoices', 'Payments', 'Payroll', 'Payables', 'Reports', 'Notifications'].includes(p.moduleName)
            ).map((p) => p.code);
          } else if (r.permissionPattern === 'hr') {
            targetCodes = SYSTEM_PERMISSIONS.filter((p) =>
              ['HR', 'Attendance', 'Payroll', 'Notifications'].includes(p.moduleName)
            ).map((p) => p.code);
          } else if (r.permissionPattern === 'procurement') {
            targetCodes = SYSTEM_PERMISSIONS.filter((p) =>
              ['Suppliers', 'Procurement', 'Inventory', 'Notifications'].includes(p.moduleName)
            ).map((p) => p.code);
          } else if (r.permissionPattern === 'services') {
            targetCodes = SYSTEM_PERMISSIONS.filter((p) =>
              ['Services', 'AMC', 'Installations', 'Assets', 'Preventive Maintenance', 'Inventory', 'Notifications'].includes(p.moduleName)
            ).map((p) => p.code);
          } else if (r.permissionPattern === 'technician') {
            targetCodes = [
              'services.view', 'services.update', 'services.complete',
              'installations.view', 'installations.update', 'installations.complete',
              'preventive_maintenance.view', 'preventive_maintenance.complete',
              'assets.view', 'notifications.view',
            ];
          } else if (r.permissionPattern === 'viewer') {
            targetCodes = SYSTEM_PERMISSIONS.filter((p) => p.action === 'view').map((p) => p.code);
          }

          const targetPermIds = targetCodes.map((c) => permMap.get(c)).filter(Boolean) as string[];

          // Sync role permissions
          for (const permId of targetPermIds) {
            await this.prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: role.id,
                  permissionId: permId,
                },
              },
              update: {},
              create: {
                roleId: role.id,
                permissionId: permId,
              },
            });
          }
        } catch (roleErr) {
          this.logger.warn(`Could not bootstrap role "${r.roleName}": ${roleErr.message}`);
        }
      }

      // Also ensure legacy role 'Admin' is updated
      const legacyAdmin = await this.prisma.role.findUnique({ where: { roleName: 'Admin' } });
      if (legacyAdmin && !legacyAdmin.code) {
        await this.prisma.role.update({
          where: { id: legacyAdmin.id },
          data: {
            code: 'ADMIN',
            isSystemRole: true,
          },
        });
      }

      this.logger.log('RBAC default roles and permissions verified successfully.');
    } catch (err) {
      this.logger.error('Error bootstrapping default RBAC data', err);
    }
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        _count: {
          select: {
            users: true,
            rolePermissions: true,
          },
        },
        rolePermissions: {
          include: { permission: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id,
      roleName: r.roleName,
      code: r.code,
      description: r.description,
      isSystemRole: r.isSystemRole,
      isActive: r.isActive,
      userCount: r._count.users,
      permissionCount: r._count.rolePermissions,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      permissions: r.rolePermissions.map((rp) => rp.permission),
    }));
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" was not found.`);
    }

    return {
      id: role.id,
      roleName: role.roleName,
      code: role.code,
      description: role.description,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      userCount: role._count.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp) => rp.permission),
    };
  }

  async createRole(dto: CreateRoleDto, userId?: string) {
    const existing = await this.prisma.role.findFirst({
      where: {
        OR: [
          { roleName: { equals: dto.roleName, mode: 'insensitive' } },
          dto.code ? { code: { equals: dto.code, mode: 'insensitive' } } : {},
        ],
      },
    });

    if (existing) {
      throw new ConflictException(`A role with name "${dto.roleName}" or code already exists.`);
    }

    const code = dto.code || dto.roleName.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    const created = await this.prisma.role.create({
      data: {
        roleName: dto.roleName,
        code,
        description: dto.description || null,
        isSystemRole: dto.isSystemRole ?? false,
        isActive: true,
      },
    });

    // Record AuditLog
    try {
      const actorId = await this.resolveUserId(userId);
      await this.prisma.auditLog.create({
        data: {
          userId: actorId,
          moduleName: 'ROLES',
          action: 'CREATE',
          recordId: created.id,
          details: JSON.stringify({ roleName: created.roleName, code: created.code }),
        },
      });
    } catch {}

    return created;
  }

  async updateRole(id: string, dto: UpdateRoleDto, userId?: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" was not found.`);
    }

    if (role.isSystemRole && dto.isActive === false) {
      throw new BadRequestException(`System role "${role.roleName}" cannot be deactivated.`);
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.roleName && { roleName: dto.roleName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    // Record AuditLog
    try {
      const actorId = await this.resolveUserId(userId);
      await this.prisma.auditLog.create({
        data: {
          userId: actorId,
          moduleName: 'ROLES',
          action: 'UPDATE',
          recordId: updated.id,
          details: JSON.stringify({ roleName: updated.roleName, changes: dto }),
        },
      });
    } catch {}

    return updated;
  }

  async deleteRole(id: string, userId?: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" was not found.`);
    }

    if (role.isSystemRole) {
      throw new BadRequestException(`System role "${role.roleName}" is protected and cannot be deleted.`);
    }

    if (role._count.users > 0) {
      throw new BadRequestException(`Cannot delete role "${role.roleName}" because ${role._count.users} user(s) are assigned to it.`);
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });

    // Record AuditLog
    try {
      const actorId = await this.resolveUserId(userId);
      await this.prisma.auditLog.create({
        data: {
          userId: actorId,
          moduleName: 'ROLES',
          action: 'DELETE',
          recordId: id,
          details: JSON.stringify({ roleName: role.roleName }),
        },
      });
    } catch {}

    return { success: true, message: `Role "${role.roleName}" was deleted.` };
  }

  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" was not found.`);
    }

    return role.rolePermissions.map((rp) => rp.permission);
  }

  async updateRolePermissions(roleId: string, dto: UpdateRolePermissionsDto, userId?: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" was not found.`);
    }

    // Safety: prevent stripping permissions from SUPER_ADMIN
    if (role.code === 'SUPER_ADMIN' && dto.permissionIds.length < 5) {
      throw new BadRequestException('Cannot remove core permissions from Super Administrator.');
    }

    // Atomic transaction to replace permissions
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      if (dto.permissionIds && dto.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    });

    // Record AuditLog
    try {
      const actorId = await this.resolveUserId(userId);
      await this.prisma.auditLog.create({
        data: {
          userId: actorId,
          moduleName: 'ROLES',
          action: 'UPDATE_PERMISSIONS',
          recordId: roleId,
          details: JSON.stringify({
            roleName: role.roleName,
            assignedPermissionCount: dto.permissionIds.length,
          }),
        },
      });
    } catch {}

    return {
      success: true,
      message: `Updated permissions for role "${role.roleName}". Assigned: ${dto.permissionIds.length} permission(s).`,
      roleId,
      assignedCount: dto.permissionIds.length,
    };
  }

  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ moduleName: 'asc' }, { code: 'asc' }],
    });

    // Group by moduleName
    const grouped: Record<string, any[]> = {};
    for (const p of permissions) {
      if (!grouped[p.moduleName]) {
        grouped[p.moduleName] = [];
      }
      grouped[p.moduleName].push(p);
    }

    return {
      total: permissions.length,
      grouped,
      permissions,
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
