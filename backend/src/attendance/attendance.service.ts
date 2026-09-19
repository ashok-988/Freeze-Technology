import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private getDayRange(dateInput?: string | Date) {
    const target = dateInput ? new Date(dateInput) : new Date();
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);

    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    return { start, end, date: target };
  }

  async findAll(query: AttendanceQueryDto) {
    const { date, startDate, endDate, employeeId, department, status, search } = query;

    const where: any = {};

    if (employeeId && employeeId !== 'All') {
      where.employeeId = employeeId;
    }

    if (status && status !== 'All') {
      where.attendanceStatus = status;
    }

    if (department && department !== 'All') {
      where.employee = {
        ...(where.employee || {}),
        department,
      };
    }

    if (date) {
      const { start, end } = this.getDayRange(date);
      where.attendanceDate = {
        gte: start,
        lte: end,
      };
    } else if (startDate || endDate) {
      where.attendanceDate = {};
      if (startDate) {
        const { start } = this.getDayRange(startDate);
        where.attendanceDate.gte = start;
      }
      if (endDate) {
        const { end } = this.getDayRange(endDate);
        where.attendanceDate.lte = end;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.employee = {
        ...(where.employee || {}),
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { employeeCode: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    return await this.prisma.attendance.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: [
        { attendanceDate: 'desc' },
        { checkIn: 'desc' },
      ],
    });
  }

  async findById(id: string) {
    const record = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: true,
      },
    });

    if (!record) {
      throw new NotFoundException(`Attendance record with ID "${id}" not found.`);
    }

    return record;
  }

  async getStats() {
    const { start: todayStart, end: todayEnd } = this.getDayRange();

    const todayRecords = await this.prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: { employee: true },
    });

    const activeEmployeesCount = await this.prisma.employee.count({
      where: { deletedAt: null, status: 'ACTIVE' },
    });

    const presentToday = todayRecords.filter((r) =>
      ['Present', 'Late', 'On Duty'].includes(r.attendanceStatus),
    ).length;

    const absentToday = todayRecords.filter(
      (r) => r.attendanceStatus === 'Absent',
    ).length;

    const lateToday = todayRecords.filter(
      (r) => r.attendanceStatus === 'Late',
    ).length;

    const onLeaveToday = todayRecords.filter(
      (r) => r.attendanceStatus === 'Leave',
    ).length;

    const halfDayToday = todayRecords.filter(
      (r) => r.attendanceStatus === 'Half Day',
    ).length;

    const checkedInNow = todayRecords.filter(
      (r) => r.checkIn !== null && r.checkOut === null,
    ).length;

    // Completed records with working hours
    const completedRecords = todayRecords.filter(
      (r) => typeof r.workingHours === 'number' && r.workingHours > 0,
    );

    const totalHoursToday = completedRecords.reduce(
      (sum, r) => sum + (r.workingHours || 0),
      0,
    );

    const avgWorkingHours =
      completedRecords.length > 0
        ? Number((totalHoursToday / completedRecords.length).toFixed(1))
        : 0;

    const totalOvertimeMinutes = todayRecords.reduce(
      (sum, r) => sum + (r.overtimeMinutes || 0),
      0,
    );
    const totalOvertimeHours = Number((totalOvertimeMinutes / 60).toFixed(1));

    return {
      activeEmployeesCount,
      presentToday,
      absentToday,
      lateToday,
      onLeaveToday,
      halfDayToday,
      checkedInNow,
      avgWorkingHours,
      totalOvertimeHours,
      todayRecordsCount: todayRecords.length,
    };
  }

  async checkIn(dto: CheckInDto, userId?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee || employee.deletedAt) {
      throw new NotFoundException(`Employee with ID "${dto.employeeId}" not found.`);
    }

    if (employee.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot check in: Employee "${employee.fullName}" is currently INACTIVE.`,
      );
    }

    const { start, end, date } = this.getDayRange(dto.attendanceDate);

    // Check duplicate check-in / record on the same calendar day
    const existing = await this.prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        attendanceDate: {
          gte: start,
          lte: end,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Employee "${employee.fullName}" (${employee.employeeCode}) already has an attendance record (${existing.attendanceStatus}) for ${start.toLocaleDateString('en-GB')}.`,
      );
    }

    const checkInTime = new Date();

    const record = await this.prisma.attendance.create({
      data: {
        employeeId: employee.id,
        attendanceDate: date,
        checkIn: checkInTime,
        attendanceStatus: 'Present',
        remarks: dto.remarks?.trim() || 'Biometric / Web Check-In',
      },
      include: {
        employee: true,
      },
    });

    // Audit Log
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
            moduleName: 'Attendance',
            action: 'CHECK_IN',
            recordId: record.id,
          },
        });
      } catch {}
    }

    return record;
  }

  async checkOut(id: string, dto: CheckOutDto, userId?: string) {
    const record = await this.prisma.attendance.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!record) {
      throw new NotFoundException(`Attendance record with ID "${id}" not found.`);
    }

    if (!record.checkIn) {
      throw new BadRequestException(
        `Cannot check out: Record does not have a recorded check-in time.`,
      );
    }

    if (record.checkOut) {
      throw new ConflictException(
        `Employee "${record.employee.fullName}" has already checked out at ${new Date(record.checkOut).toLocaleTimeString('en-GB')}.`,
      );
    }

    const checkOutTime = new Date();
    const durationMs = checkOutTime.getTime() - new Date(record.checkIn).getTime();

    if (durationMs < 0) {
      throw new BadRequestException(
        `Check-out time cannot be earlier than check-in time.`,
      );
    }

    const totalWorkingMinutes = Math.max(0, Math.round(durationMs / (1000 * 60)));
    const workingHours = Number((totalWorkingMinutes / 60).toFixed(2));
    const overtimeMinutes = Math.max(0, totalWorkingMinutes - 480); // standard 8-hour shift = 480 mins

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        checkOut: checkOutTime,
        totalWorkingMinutes,
        workingHours,
        overtimeMinutes,
        remarks: dto.remarks
          ? `${record.remarks ? record.remarks + ' | ' : ''}${dto.remarks.trim()}`
          : record.remarks,
      },
      include: { employee: true },
    });

    // Audit Log
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
            moduleName: 'Attendance',
            action: 'CHECK_OUT',
            recordId: updated.id,
          },
        });
      } catch {}
    }

    return updated;
  }

  async markAttendance(dto: MarkAttendanceDto, userId?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee || employee.deletedAt) {
      throw new NotFoundException(`Employee with ID "${dto.employeeId}" not found.`);
    }

    if (employee.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot mark attendance: Employee "${employee.fullName}" is INACTIVE.`,
      );
    }

    const { start, end, date } = this.getDayRange(dto.attendanceDate);

    // Duplicate check for this employee on same date
    const existing = await this.prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        attendanceDate: {
          gte: start,
          lte: end,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Employee "${employee.fullName}" already has an attendance record for ${start.toLocaleDateString('en-GB')}. Please update the existing record instead.`,
      );
    }

    let checkInTime: Date | null = dto.checkIn ? new Date(dto.checkIn) : null;
    let checkOutTime: Date | null = dto.checkOut ? new Date(dto.checkOut) : null;
    let totalWorkingMinutes: number | null = null;
    let workingHours: number | null = null;
    let overtimeMinutes = 0;

    if (checkInTime && checkOutTime) {
      const durationMs = checkOutTime.getTime() - checkInTime.getTime();
      if (durationMs < 0) {
        throw new BadRequestException(
          `Check-out time cannot be earlier than check-in time.`,
        );
      }
      totalWorkingMinutes = Math.max(0, Math.round(durationMs / (1000 * 60)));
      workingHours = Number((totalWorkingMinutes / 60).toFixed(2));
      overtimeMinutes = Math.max(0, totalWorkingMinutes - 480);
    } else if (dto.attendanceStatus === 'Present' && !checkInTime) {
      // Default standard 9:00 AM checkIn if manually marking full Present
      checkInTime = new Date(date);
      checkInTime.setHours(9, 0, 0, 0);
    }

    const record = await this.prisma.attendance.create({
      data: {
        employeeId: employee.id,
        attendanceDate: date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        totalWorkingMinutes,
        workingHours,
        overtimeMinutes,
        attendanceStatus: dto.attendanceStatus,
        leaveReason: dto.leaveReason?.trim() || null,
        remarks: dto.remarks?.trim() || 'Manual HR Entry',
      },
      include: { employee: true },
    });

    // Audit Log
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
            moduleName: 'Attendance',
            action: 'MARK_ATTENDANCE',
            recordId: record.id,
          },
        });
      } catch {}
    }

    return record;
  }

  async update(id: string, dto: UpdateAttendanceDto, userId?: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existing) {
      throw new NotFoundException(`Attendance record with ID "${id}" not found.`);
    }

    const checkInTime = dto.checkIn ? new Date(dto.checkIn) : existing.checkIn;
    const checkOutTime = dto.checkOut ? new Date(dto.checkOut) : existing.checkOut;
    let totalWorkingMinutes = existing.totalWorkingMinutes;
    let workingHours = existing.workingHours;
    let overtimeMinutes = existing.overtimeMinutes || 0;

    if (checkInTime && checkOutTime) {
      const durationMs = checkOutTime.getTime() - checkInTime.getTime();
      if (durationMs < 0) {
        throw new BadRequestException(
          `Check-out time cannot be earlier than check-in time.`,
        );
      }
      totalWorkingMinutes = Math.max(0, Math.round(durationMs / (1000 * 60)));
      workingHours = Number((totalWorkingMinutes / 60).toFixed(2));
      overtimeMinutes = Math.max(0, totalWorkingMinutes - 480);
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        attendanceStatus: dto.attendanceStatus !== undefined ? dto.attendanceStatus : undefined,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        totalWorkingMinutes,
        workingHours,
        overtimeMinutes,
        leaveReason: dto.leaveReason !== undefined ? (dto.leaveReason?.trim() || null) : undefined,
        remarks: dto.remarks !== undefined ? (dto.remarks?.trim() || null) : undefined,
      },
      include: { employee: true },
    });

    // Audit Log
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
            moduleName: 'Attendance',
            action: 'UPDATE',
            recordId: updated.id,
          },
        });
      } catch {}
    }

    return updated;
  }

  async delete(id: string, userId?: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existing) {
      throw new NotFoundException(`Attendance record with ID "${id}" not found.`);
    }

    await this.prisma.attendance.delete({
      where: { id },
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
            moduleName: 'Attendance',
            action: 'DELETE',
            recordId: id,
          },
        });
      } catch {}
    }

    return {
      success: true,
      message: `Attendance record for "${existing.employee.fullName}" deleted successfully.`,
    };
  }
}
