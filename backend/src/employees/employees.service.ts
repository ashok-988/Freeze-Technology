import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  // Generate next sequential employee code: EMP-2026-0001
  private async generateEmployeeCode(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EMP-${year}-`;

    const lastEmployee = await tx.employee.findFirst({
      where: {
        employeeCode: {
          startsWith: prefix,
        },
      },
      orderBy: {
        employeeCode: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastEmployee?.employeeCode) {
      const parts = lastEmployee.employeeCode.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  private parseJoiningDate(dateStr?: string | Date): Date {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string') {
      const trimmed = dateStr.trim();
      const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (ddmmyyyy) {
        const [, d, m, y] = ddmmyyyy;
        return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      }
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }

  async findAll(query: EmployeeQueryDto) {
    const { search, department, designation, employmentType, status } = query;

    const where: any = {
      deletedAt: null,
    };

    if (status && status !== 'All') {
      where.status = status;
    }

    if (department && department !== 'All') {
      where.department = department;
    }

    if (designation && designation !== 'All') {
      where.designation = designation;
    }

    if (employmentType && employmentType !== 'All') {
      where.employmentType = employmentType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { employeeCode: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.employee.findMany({
      where,
      include: {
        _count: {
          select: {
            jobCards: true,
            amcVisits: true,
            installations: true,
            attendance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTechnicians() {
    return await this.prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        OR: [
          { designation: { contains: 'Technician', mode: 'insensitive' } },
          { designation: { contains: 'Specialist', mode: 'insensitive' } },
          { designation: { contains: 'Engineer', mode: 'insensitive' } },
          { department: { contains: 'Service', mode: 'insensitive' } },
          { department: { contains: 'Operations', mode: 'insensitive' } },
        ],
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async getStats() {
    const totalEmployees = await this.prisma.employee.count({
      where: { deletedAt: null },
    });

    const activeEmployees = await this.prisma.employee.count({
      where: { deletedAt: null, status: 'ACTIVE' },
    });

    const inactiveEmployees = await this.prisma.employee.count({
      where: { deletedAt: null, status: 'INACTIVE' },
    });

    const techniciansCount = await this.prisma.employee.count({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        OR: [
          { designation: { contains: 'Technician', mode: 'insensitive' } },
          { designation: { contains: 'Specialist', mode: 'insensitive' } },
          { designation: { contains: 'Engineer', mode: 'insensitive' } },
          { department: { contains: 'Service', mode: 'insensitive' } },
          { department: { contains: 'Operations', mode: 'insensitive' } },
        ],
      },
    });

    const departmentsGroup = await this.prisma.employee.groupBy({
      by: ['department'],
      where: { deletedAt: null },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await this.prisma.employee.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startOfMonth },
      },
    });

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      techniciansCount,
      departmentsCount: departmentsGroup.length,
      newThisMonth,
    };
  }

  async findById(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeCode: id }],
        deletedAt: null,
      },
      include: {
        attendance: {
          take: 30,
          orderBy: { attendanceDate: 'desc' },
        },
        jobCards: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            complaint: {
              include: { customer: true, product: true },
            },
          },
        },
        amcVisits: {
          take: 10,
          orderBy: { scheduledDate: 'desc' },
          include: {
            amcContract: {
              include: { customer: true, product: true },
            },
          },
        },
        installations: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { customer: true, product: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID or code "${id}" not found.`);
    }

    return employee;
  }

  async create(dto: CreateEmployeeDto, userId?: string) {
    return await this.prisma.$transaction(
      async (tx) => {
        // Check phone duplicate
        if (dto.phone) {
          const existingPhone = await tx.employee.findFirst({
            where: {
              phone: dto.phone.trim(),
              deletedAt: null,
            },
          });
          if (existingPhone) {
            throw new ConflictException(
              `An employee with phone number "${dto.phone}" already exists (${existingPhone.fullName} - ${existingPhone.employeeCode}).`,
            );
          }
        }

        // Check email duplicate if provided
        if (dto.email && dto.email.trim()) {
          const existingEmail = await tx.employee.findFirst({
            where: {
              email: dto.email.trim(),
              deletedAt: null,
            },
          });
          if (existingEmail) {
            throw new ConflictException(
              `An employee with email "${dto.email}" already exists (${existingEmail.fullName} - ${existingEmail.employeeCode}).`,
            );
          }
        }

        const employeeCode = await this.generateEmployeeCode(tx);

        const rawSalary = dto.salary !== undefined ? dto.salary : (dto as any).monthlySalary;
        const effectiveSalary =
          typeof rawSalary === 'number' && !isNaN(rawSalary)
            ? rawSalary
            : typeof rawSalary === 'string' && !isNaN(parseFloat(rawSalary))
              ? parseFloat(rawSalary)
              : 25000;

        const employee = await tx.employee.create({
          data: {
            employeeCode,
            fullName: dto.fullName.trim(),
            designation: dto.designation.trim(),
            department: dto.department?.trim() || 'Service & Operations',
            employmentType: dto.employmentType || 'Full-Time',
            phone: dto.phone.trim(),
            email: dto.email?.trim() || null,
            address: dto.address?.trim() || null,
            salary: effectiveSalary,
            joiningDate: this.parseJoiningDate(dto.joiningDate),
            status: dto.status || 'ACTIVE',
          },
        });

        // Audit Log
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
                moduleName: 'Employees',
                action: 'CREATE',
                recordId: employee.id,
              },
            });
          } catch {}
        }

        return employee;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async update(id: string, dto: UpdateEmployeeDto, userId?: string) {
    const existing = await this.prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeCode: id }],
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID "${id}" not found.`);
    }

    return await this.prisma.$transaction(
      async (tx) => {
        // Phone uniqueness check if changed
        if (dto.phone && dto.phone.trim() !== existing.phone) {
          const dupPhone = await tx.employee.findFirst({
            where: {
              phone: dto.phone.trim(),
              deletedAt: null,
              id: { not: existing.id },
            },
          });
          if (dupPhone) {
            throw new ConflictException(
              `An employee with phone "${dto.phone}" already exists (${dupPhone.fullName} - ${dupPhone.employeeCode}).`,
            );
          }
        }

        // Email uniqueness check if changed
        if (dto.email && dto.email.trim() && dto.email.trim() !== existing.email) {
          const dupEmail = await tx.employee.findFirst({
            where: {
              email: dto.email.trim(),
              deletedAt: null,
              id: { not: existing.id },
            },
          });
          if (dupEmail) {
            throw new ConflictException(
              `An employee with email "${dto.email}" already exists (${dupEmail.fullName} - ${dupEmail.employeeCode}).`,
            );
          }
        }

        const rawSalary = dto.salary !== undefined ? dto.salary : (dto as any).monthlySalary;
        const effectiveSalary =
          rawSalary !== undefined
            ? typeof rawSalary === 'number' && !isNaN(rawSalary)
              ? rawSalary
              : typeof rawSalary === 'string' && !isNaN(parseFloat(rawSalary))
                ? parseFloat(rawSalary)
                : undefined
            : undefined;

        const updated = await tx.employee.update({
          where: { id: existing.id },
          data: {
            fullName: dto.fullName !== undefined ? dto.fullName.trim() : undefined,
            designation: dto.designation !== undefined ? dto.designation.trim() : undefined,
            department: dto.department !== undefined ? dto.department.trim() : undefined,
            employmentType: dto.employmentType !== undefined ? dto.employmentType : undefined,
            phone: dto.phone !== undefined ? dto.phone.trim() : undefined,
            email: dto.email !== undefined ? (dto.email?.trim() || null) : undefined,
            address: dto.address !== undefined ? (dto.address?.trim() || null) : undefined,
            salary: effectiveSalary,
            joiningDate: dto.joiningDate ? this.parseJoiningDate(dto.joiningDate) : undefined,
            status: dto.status !== undefined ? dto.status : undefined,
          },
        });

        // Audit Log
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
                moduleName: 'Employees',
                action: 'UPDATE',
                recordId: updated.id,
              },
            });
          } catch {}
        }

        return updated;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async deactivate(id: string, userId?: string) {
    const existing = await this.prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeCode: id }],
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID "${id}" not found.`);
    }

    const updated = await this.prisma.employee.update({
      where: { id: existing.id },
      data: {
        status: existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
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
            moduleName: 'Employees',
            action: updated.status === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE',
            recordId: updated.id,
          },
        });
      } catch {}
    }

    return {
      success: true,
      message: `Employee "${updated.fullName}" (${updated.employeeCode}) status changed to ${updated.status}.`,
      data: updated,
    };
  }
}
