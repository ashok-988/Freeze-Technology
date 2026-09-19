import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { UpdatePayrollRecordDto } from './dto/update-payroll-record.dto';
import { ApprovePayrollDto } from './dto/approve-payroll.dto';
import { MarkPayrollPaidDto } from './dto/mark-payroll-paid.dto';
import { PayrollQueryDto } from './dto/payroll-query.dto';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // Generate next sequential payroll number: PAY-2026-0001
  private async generatePayrollNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;

    const lastPayroll = await tx.payrollPeriod.findFirst({
      where: {
        payrollNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        payrollNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastPayroll?.payrollNumber) {
      const parts = lastPayroll.payrollNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  // Get date range for a given month and year
  private getMonthDateRange(month: number, year: number) {
    const periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return { periodStart, periodEnd };
  }

  async getPeriods(query: PayrollQueryDto) {
    const { year, month, status, search } = query;

    const where: any = {};

    if (year) where.year = year;
    if (month) where.month = month;
    if (status && status !== 'All') where.status = status;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { payrollNumber: { contains: q, mode: 'insensitive' } },
        { remarks: { contains: q, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.payrollPeriod.findMany({
      where,
      include: {
        _count: {
          select: { records: true },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getStats() {
    const totalPeriods = await this.prisma.payrollPeriod.count();
    const draftPeriods = await this.prisma.payrollPeriod.count({
      where: { status: { in: ['DRAFT', 'CALCULATED', 'REVIEW'] } },
    });
    const approvedPeriods = await this.prisma.payrollPeriod.count({
      where: { status: 'APPROVED' },
    });
    const paidPeriods = await this.prisma.payrollPeriod.count({
      where: { status: 'PAID' },
    });

    const activeEmployeesCount = await this.prisma.employee.count({
      where: { deletedAt: null, status: 'ACTIVE' },
    });

    const paidAggregates = await this.prisma.payrollPeriod.aggregate({
      _sum: {
        totalGrossSalary: true,
        totalDeductions: true,
        totalNetSalary: true,
      },
      where: { status: 'PAID' },
    });

    return {
      totalPeriods,
      draftPeriods,
      approvedPeriods,
      paidPeriods,
      activeEmployeesCount,
      totalGrossPaidAllTime: Number((paidAggregates._sum.totalGrossSalary || 0).toFixed(2)),
      totalDeductionsAllTime: Number((paidAggregates._sum.totalDeductions || 0).toFixed(2)),
      totalNetPaidAllTime: Number((paidAggregates._sum.totalNetSalary || 0).toFixed(2)),
    };
  }

  async getPeriodById(id: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: {
        OR: [{ id }, { payrollNumber: id }],
      },
      include: {
        records: {
          include: {
            employee: true,
          },
          orderBy: { employeeName: 'asc' },
        },
      },
    });

    if (!period) {
      throw new NotFoundException(`Payroll period "${id}" not found.`);
    }

    return period;
  }

  async getRecords(periodId: string, search?: string, department?: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: {
        OR: [{ id: periodId }, { payrollNumber: periodId }],
      },
    });

    if (!period) {
      throw new NotFoundException(`Payroll period "${periodId}" not found.`);
    }

    const where: any = {
      payrollPeriodId: period.id,
    };

    if (department && department !== 'All') {
      where.department = department;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { employeeName: { contains: q, mode: 'insensitive' } },
        { employeeCode: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.payrollRecord.findMany({
      where,
      include: { employee: true },
      orderBy: { employeeName: 'asc' },
    });
  }

  async getRecordById(periodId: string, employeeId: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: {
        OR: [{ id: periodId }, { payrollNumber: periodId }],
      },
    });

    if (!period) {
      throw new NotFoundException(`Payroll period "${periodId}" not found.`);
    }

    const record = await this.prisma.payrollRecord.findFirst({
      where: {
        payrollPeriodId: period.id,
        OR: [{ employeeId }, { employeeCode: employeeId }],
      },
      include: {
        employee: true,
        payrollPeriod: true,
      },
    });

    if (!record) {
      throw new NotFoundException(
        `Payroll record for employee "${employeeId}" not found in period "${period.payrollNumber}".`,
      );
    }

    return record;
  }

  async createPeriod(dto: CreatePayrollPeriodDto, userId?: string) {
    return await this.prisma.$transaction(
      async (tx) => {
        // Prevent duplicate non-cancelled payroll period for the exact same month/year
        const existing = await tx.payrollPeriod.findFirst({
          where: {
            month: dto.month,
            year: dto.year,
            status: { not: 'CANCELLED' },
          },
        });

        if (existing) {
          throw new ConflictException(
            `A payroll period already exists for ${dto.month}/${dto.year} (${existing.payrollNumber} - ${existing.status}).`,
          );
        }

        const { periodStart, periodEnd } = this.getMonthDateRange(dto.month, dto.year);

        const payrollNumber = await this.generatePayrollNumber(tx);

        const period = await tx.payrollPeriod.create({
          data: {
            payrollNumber,
            month: dto.month,
            year: dto.year,
            periodStart: dto.periodStart ? new Date(dto.periodStart) : periodStart,
            periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : periodEnd,
            status: 'DRAFT',
            remarks: dto.remarks?.trim() || null,
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
                moduleName: 'Payroll',
                action: 'PAYROLL_CREATED',
                recordId: period.id,
              },
            });
          } catch {}
        }

        return period;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async calculatePayroll(periodId: string, dto: CalculatePayrollDto, userId?: string) {
    return await this.prisma.$transaction(
      async (tx) => {
        const period = await tx.payrollPeriod.findFirst({
          where: {
            OR: [{ id: periodId }, { payrollNumber: periodId }],
          },
          include: { records: true },
        });

        if (!period) {
          throw new NotFoundException(`Payroll period "${periodId}" not found.`);
        }

        if (['APPROVED', 'PAID'].includes(period.status)) {
          throw new BadRequestException(
            `Cannot recalculate payroll: Period "${period.payrollNumber}" is already ${period.status}.`,
          );
        }

        // 1. Load active employees
        const activeEmployees = await tx.employee.findMany({
          where: {
            deletedAt: null,
            status: 'ACTIVE',
          },
          orderBy: { fullName: 'asc' },
        });

        if (activeEmployees.length === 0) {
          throw new BadRequestException(
            `Cannot calculate payroll: No active employees found in the system.`,
          );
        }

        // 2. Load attendance for this payroll date window
        const attendanceRecords = await tx.attendance.findMany({
          where: {
            attendanceDate: {
              gte: period.periodStart,
              lte: period.periodEnd,
            },
          },
        });

        const standardWorkingDays = dto.standardWorkingDays || 26;

        let totalGrossSum = 0;
        let totalDeductionSum = 0;
        let totalNetSum = 0;

        // Map existing manual adjustments so they are preserved upon recalculation
        const existingRecordsMap = new Map<string, any>();
        for (const r of period.records) {
          existingRecordsMap.set(r.employeeId, r);
        }

        for (const emp of activeEmployees) {
          const monthlySalary = typeof emp.salary === 'number' && emp.salary > 0 ? emp.salary : 25000;

          // Standard salary components breakdown (rounded to 2 decimals)
          const basicSalary = Number((monthlySalary * 0.50).toFixed(2));
          const hra = Number((monthlySalary * 0.25).toFixed(2));
          const conveyance = Number((monthlySalary * 0.10).toFixed(2));
          const specialAllowance = Number((monthlySalary * 0.15).toFixed(2));

          // Attendance analysis
          const empAttendance = attendanceRecords.filter((a) => a.employeeId === emp.id);

          const presentDays = empAttendance.filter((a) =>
            ['Present', 'Late', 'On Duty'].includes(a.attendanceStatus),
          ).length;

          const halfDays = empAttendance.filter(
            (a) => a.attendanceStatus === 'Half Day',
          ).length;

          const leaveDays = empAttendance.filter(
            (a) => a.attendanceStatus === 'Leave',
          ).length;

          const absentDays = empAttendance.filter(
            (a) => a.attendanceStatus === 'Absent',
          ).length;

          const paidDays = Number((presentDays + halfDays * 0.5 + leaveDays).toFixed(1));

          const totalOvertimeMinutes = empAttendance.reduce(
            (sum, a) => sum + (a.overtimeMinutes || 0),
            0,
          );
          const overtimeHours = Number((totalOvertimeMinutes / 60).toFixed(2));

          // Overtime Amount: 1.5x hourly rate
          const hourlyRate = monthlySalary / (standardWorkingDays * 8);
          const overtimeAmount = Number((overtimeHours * hourlyRate * 1.5).toFixed(2));

          // Loss of Pay (LOP) for unexcused/absent days
          const dailyRate = monthlySalary / standardWorkingDays;
          const lossOfPay = Number((dailyRate * absentDays).toFixed(2));

          // Preserve manual adjustments from previous calculate/edit if available
          const existing = existingRecordsMap.get(emp.id);
          const otherAllowance = existing?.otherAllowance || 0;
          const advanceDeduction = existing?.advanceDeduction || 0;
          const loanDeduction = existing?.loanDeduction || 0;
          const otherDeduction = existing?.otherDeduction || 0;
          const remarks = existing?.remarks || null;

          const grossSalary = Number(
            (basicSalary + hra + conveyance + specialAllowance + otherAllowance + overtimeAmount).toFixed(2),
          );

          const totalDeductions = Number(
            (lossOfPay + advanceDeduction + loanDeduction + otherDeduction).toFixed(2),
          );

          const netSalary = Math.max(0, Number((grossSalary - totalDeductions).toFixed(2)));

          totalGrossSum += grossSalary;
          totalDeductionSum += totalDeductions;
          totalNetSum += netSalary;

          await tx.payrollRecord.upsert({
            where: {
              payrollPeriodId_employeeId: {
                payrollPeriodId: period.id,
                employeeId: emp.id,
              },
            },
            create: {
              payrollPeriodId: period.id,
              employeeId: emp.id,
              employeeCode: emp.employeeCode,
              employeeName: emp.fullName,
              designation: emp.designation,
              department: emp.department,
              workingDays: standardWorkingDays,
              presentDays,
              absentDays,
              leaveDays,
              halfDays,
              paidDays,
              overtimeMinutes: totalOvertimeMinutes,
              overtimeHours,
              overtimeAmount,
              basicSalary,
              hra,
              conveyance,
              specialAllowance,
              otherAllowance,
              grossSalary,
              lossOfPay,
              advanceDeduction,
              loanDeduction,
              otherDeduction,
              totalDeductions,
              netSalary,
              paymentStatus: 'PENDING',
              remarks,
            },
            update: {
              employeeCode: emp.employeeCode,
              employeeName: emp.fullName,
              designation: emp.designation,
              department: emp.department,
              workingDays: standardWorkingDays,
              presentDays,
              absentDays,
              leaveDays,
              halfDays,
              paidDays,
              overtimeMinutes: totalOvertimeMinutes,
              overtimeHours,
              overtimeAmount,
              basicSalary,
              hra,
              conveyance,
              specialAllowance,
              otherAllowance,
              grossSalary,
              lossOfPay,
              advanceDeduction,
              loanDeduction,
              otherDeduction,
              totalDeductions,
              netSalary,
              remarks,
            },
          });
        }

        const updatedPeriod = await tx.payrollPeriod.update({
          where: { id: period.id },
          data: {
            status: 'CALCULATED',
            totalEmployees: activeEmployees.length,
            totalGrossSalary: Number(totalGrossSum.toFixed(2)),
            totalDeductions: Number(totalDeductionSum.toFixed(2)),
            totalNetSalary: Number(totalNetSum.toFixed(2)),
          },
          include: {
            records: {
              include: { employee: true },
              orderBy: { employeeName: 'asc' },
            },
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
                moduleName: 'Payroll',
                action: 'PAYROLL_CALCULATED',
                recordId: period.id,
              },
            });
          } catch {}
        }

        return updatedPeriod;
      },
      { timeout: 25000, maxWait: 10000 },
    );
  }

  async updateRecord(
    periodId: string,
    employeeId: string,
    dto: UpdatePayrollRecordDto,
    userId?: string,
  ) {
    return await this.prisma.$transaction(
      async (tx) => {
        const period = await tx.payrollPeriod.findFirst({
          where: {
            OR: [{ id: periodId }, { payrollNumber: periodId }],
          },
        });

        if (!period) {
          throw new NotFoundException(`Payroll period "${periodId}" not found.`);
        }

        if (['APPROVED', 'PAID'].includes(period.status)) {
          throw new BadRequestException(
            `Cannot modify payroll record: Period "${period.payrollNumber}" is already ${period.status}.`,
          );
        }

        const record = await tx.payrollRecord.findFirst({
          where: {
            payrollPeriodId: period.id,
            OR: [{ employeeId }, { employeeCode: employeeId }],
          },
        });

        if (!record) {
          throw new NotFoundException(
            `Payroll record for employee "${employeeId}" not found in period "${period.payrollNumber}".`,
          );
        }

        const otherAllowance =
          dto.otherAllowance !== undefined ? dto.otherAllowance : record.otherAllowance;
        const advanceDeduction =
          dto.advanceDeduction !== undefined ? dto.advanceDeduction : record.advanceDeduction;
        const loanDeduction =
          dto.loanDeduction !== undefined ? dto.loanDeduction : record.loanDeduction;
        const otherDeduction =
          dto.otherDeduction !== undefined ? dto.otherDeduction : record.otherDeduction;
        const remarks = dto.remarks !== undefined ? dto.remarks : record.remarks;

        const grossSalary = Number(
          (
            record.basicSalary +
            record.hra +
            record.conveyance +
            record.specialAllowance +
            otherAllowance +
            record.overtimeAmount
          ).toFixed(2),
        );

        const totalDeductions = Number(
          (
            record.lossOfPay +
            advanceDeduction +
            loanDeduction +
            otherDeduction
          ).toFixed(2),
        );

        const netSalary = Math.max(0, Number((grossSalary - totalDeductions).toFixed(2)));

        const updatedRecord = await tx.payrollRecord.update({
          where: { id: record.id },
          data: {
            otherAllowance,
            advanceDeduction,
            loanDeduction,
            otherDeduction,
            grossSalary,
            totalDeductions,
            netSalary,
            remarks: remarks?.trim() || null,
          },
          include: { employee: true },
        });

        // Recalculate Period Totals
        const allRecords = await tx.payrollRecord.findMany({
          where: { payrollPeriodId: period.id },
        });

        const totalGrossSum = allRecords.reduce((sum, r) => sum + r.grossSalary, 0);
        const totalDeductionSum = allRecords.reduce((sum, r) => sum + r.totalDeductions, 0);
        const totalNetSum = allRecords.reduce((sum, r) => sum + r.netSalary, 0);

        await tx.payrollPeriod.update({
          where: { id: period.id },
          data: {
            totalGrossSalary: Number(totalGrossSum.toFixed(2)),
            totalDeductions: Number(totalDeductionSum.toFixed(2)),
            totalNetSalary: Number(totalNetSum.toFixed(2)),
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
                moduleName: 'Payroll',
                action: 'PAYROLL_UPDATED',
                recordId: updatedRecord.id,
              },
            });
          } catch {}
        }

        return updatedRecord;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async approvePayroll(periodId: string, dto: ApprovePayrollDto, userId?: string) {
    return await this.prisma.$transaction(
      async (tx) => {
        const period = await tx.payrollPeriod.findFirst({
          where: {
            OR: [{ id: periodId }, { payrollNumber: periodId }],
          },
          include: {
            _count: { select: { records: true } },
          },
        });

        if (!period) {
          throw new NotFoundException(`Payroll period "${periodId}" not found.`);
        }

        if (period.status === 'APPROVED') {
          throw new ConflictException(
            `Payroll period "${period.payrollNumber}" is already APPROVED.`,
          );
        }

        if (period.status === 'PAID') {
          throw new BadRequestException(
            `Payroll period "${period.payrollNumber}" is already PAID.`,
          );
        }

        if (period._count.records === 0) {
          throw new BadRequestException(
            `Cannot approve payroll: Period has not been calculated yet.`,
          );
        }

        let effectiveUserId = userId;
        if (!effectiveUserId) {
          const adminUser = await tx.user.findFirst();
          effectiveUserId = adminUser?.id;
        }

        const approved = await tx.payrollPeriod.update({
          where: { id: period.id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedById: effectiveUserId || null,
            remarks: dto.remarks
              ? `${period.remarks ? period.remarks + ' | ' : ''}${dto.remarks.trim()}`
              : period.remarks,
          },
          include: {
            records: {
              include: { employee: true },
              orderBy: { employeeName: 'asc' },
            },
          },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Payroll',
                action: 'PAYROLL_APPROVED',
                recordId: approved.id,
              },
            });
          } catch {}
        }

        return approved;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async markPayrollPaid(periodId: string, dto: MarkPayrollPaidDto, userId?: string) {
    return await this.prisma.$transaction(
      async (tx) => {
        const period = await tx.payrollPeriod.findFirst({
          where: {
            OR: [{ id: periodId }, { payrollNumber: periodId }],
          },
        });

        if (!period) {
          throw new NotFoundException(`Payroll period "${periodId}" not found.`);
        }

        if (period.status !== 'APPROVED') {
          throw new BadRequestException(
            `Cannot mark salary paid: Period "${period.payrollNumber}" must be APPROVED first (current status: ${period.status}).`,
          );
        }

        const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

        let effectiveUserId = userId;
        if (!effectiveUserId) {
          const adminUser = await tx.user.findFirst();
          effectiveUserId = adminUser?.id;
        }

        // Update all employee records to PAID
        await tx.payrollRecord.updateMany({
          where: { payrollPeriodId: period.id },
          data: {
            paymentStatus: 'PAID',
            paymentReference: dto.paymentReference?.trim() || null,
            paidAt,
          },
        });

        const updatedPeriod = await tx.payrollPeriod.update({
          where: { id: period.id },
          data: {
            status: 'PAID',
            paidAt,
            paidById: effectiveUserId || null,
            paymentMethod: dto.paymentMethod,
            paymentReference: dto.paymentReference?.trim() || null,
            remarks: dto.remarks
              ? `${period.remarks ? period.remarks + ' | ' : ''}${dto.remarks.trim()}`
              : period.remarks,
          },
          include: {
            records: {
              include: { employee: true },
              orderBy: { employeeName: 'asc' },
            },
          },
        });

        if (effectiveUserId) {
          try {
            await tx.auditLog.create({
              data: {
                userId: effectiveUserId,
                moduleName: 'Payroll',
                action: 'PAYROLL_MARKED_PAID',
                recordId: updatedPeriod.id,
              },
            });
          } catch {}
        }

        return updatedPeriod;
      },
      { timeout: 20000, maxWait: 10000 },
    );
  }

  async cancelPayroll(periodId: string, userId?: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: {
        OR: [{ id: periodId }, { payrollNumber: periodId }],
      },
    });

    if (!period) {
      throw new NotFoundException(`Payroll period "${periodId}" not found.`);
    }

    if (period.status === 'PAID') {
      throw new BadRequestException(
        `Cannot cancel payroll period "${period.payrollNumber}" because it is already marked as PAID.`,
      );
    }

    const cancelled = await this.prisma.payrollPeriod.update({
      where: { id: period.id },
      data: {
        status: 'CANCELLED',
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
            moduleName: 'Payroll',
            action: 'PAYROLL_CANCELLED',
            recordId: cancelled.id,
          },
        });
      } catch {}
    }

    return {
      success: true,
      message: `Payroll period "${period.payrollNumber}" has been cancelled.`,
      data: cancelled,
    };
  }
}
