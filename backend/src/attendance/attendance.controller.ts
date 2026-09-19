import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  async findAll(@Query() query: AttendanceQueryDto) {
    const data = await this.attendanceService.findAll(query);
    return {
      success: true,
      data,
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.attendanceService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.attendanceService.findById(id);
    return {
      success: true,
      data,
    };
  }

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  async checkIn(@Body() checkInDto: CheckInDto) {
    const data = await this.attendanceService.checkIn(checkInDto);
    return {
      success: true,
      message: `Check-in recorded for ${data.employee.fullName} at ${new Date(data.checkIn).toLocaleTimeString('en-GB')}.`,
      data,
    };
  }

  @Patch(':id/check-out')
  async checkOut(
    @Param('id') id: string,
    @Body() checkOutDto: CheckOutDto,
  ) {
    const data = await this.attendanceService.checkOut(id, checkOutDto);
    return {
      success: true,
      message: `Check-out recorded for ${data.employee.fullName}. Working Duration: ${Math.floor((data.totalWorkingMinutes || 0) / 60)}h ${(data.totalWorkingMinutes || 0) % 60}m.`,
      data,
    };
  }

  @Post('mark')
  @HttpCode(HttpStatus.CREATED)
  async markAttendance(@Body() markAttendanceDto: MarkAttendanceDto) {
    const data = await this.attendanceService.markAttendance(markAttendanceDto);
    return {
      success: true,
      message: `Attendance status marked as ${data.attendanceStatus} for ${data.employee.fullName}.`,
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    const data = await this.attendanceService.update(id, updateAttendanceDto);
    return {
      success: true,
      message: 'Attendance record updated successfully.',
      data,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.attendanceService.delete(id);
  }
}
