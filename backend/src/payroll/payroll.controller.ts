import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { PayrollPdfService } from './payroll-pdf.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { UpdatePayrollRecordDto } from './dto/update-payroll-record.dto';
import { ApprovePayrollDto } from './dto/approve-payroll.dto';
import { MarkPayrollPaidDto } from './dto/mark-payroll-paid.dto';
import { PayrollQueryDto } from './dto/payroll-query.dto';

@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly payrollPdfService: PayrollPdfService,
  ) {}

  @Get()
  async getPeriods(@Query() query: PayrollQueryDto) {
    const data = await this.payrollService.getPeriods(query);
    return {
      success: true,
      data,
    };
  }

  @Get('periods')
  async getPeriodsAlias(@Query() query: PayrollQueryDto) {
    const data = await this.payrollService.getPeriods(query);
    return {
      success: true,
      data,
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.payrollService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async getPeriodById(@Param('id') id: string) {
    const data = await this.payrollService.getPeriodById(id);
    return {
      success: true,
      data,
    };
  }

  @Get(':id/records')
  async getRecords(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('department') department?: string,
  ) {
    const data = await this.payrollService.getRecords(id, search, department);
    return {
      success: true,
      data,
    };
  }

  @Get(':id/records/:employeeId')
  async getRecordById(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ) {
    const data = await this.payrollService.getRecordById(id, employeeId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id/records/:employeeId/payslip')
  async downloadPayslip(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Res() res: Response,
  ) {
    const record = await this.payrollService.getRecordById(id, employeeId);
    const period = await this.payrollService.getPeriodById(id);

    const safeFilename = `Payslip_${record.employeeCode}_${period.payrollNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

    this.payrollPdfService.generatePayslipPDF(record, period, res);
  }

  @Post('periods')
  @HttpCode(HttpStatus.CREATED)
  async createPeriod(@Body() dto: CreatePayrollPeriodDto) {
    const data = await this.payrollService.createPeriod(dto);
    return {
      success: true,
      message: `Payroll period "${data.payrollNumber}" for ${data.month}/${data.year} created successfully.`,
      data,
    };
  }

  @Post(':id/calculate')
  @HttpCode(HttpStatus.OK)
  async calculatePayroll(
    @Param('id') id: string,
    @Body() dto: CalculatePayrollDto,
  ) {
    const data = await this.payrollService.calculatePayroll(id, dto);
    return {
      success: true,
      message: `Payroll calculation completed for ${data.totalEmployees} employees in period "${data.payrollNumber}".`,
      data,
    };
  }

  @Patch(':id/records/:employeeId')
  async updateRecord(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdatePayrollRecordDto,
  ) {
    const data = await this.payrollService.updateRecord(id, employeeId, dto);
    return {
      success: true,
      message: `Payroll adjustments updated for employee "${data.employeeName}".`,
      data,
    };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approvePayroll(
    @Param('id') id: string,
    @Body() dto: ApprovePayrollDto,
  ) {
    const data = await this.payrollService.approvePayroll(id, dto);
    return {
      success: true,
      message: `Payroll period "${data.payrollNumber}" has been APPROVED.`,
      data,
    };
  }

  @Post(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markPayrollPaid(
    @Param('id') id: string,
    @Body() dto: MarkPayrollPaidDto,
  ) {
    const data = await this.payrollService.markPayrollPaid(id, dto);
    return {
      success: true,
      message: `Payroll "${data.payrollNumber}" marked as PAID. All ${data.records?.length || 0} employee records updated.`,
      data,
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPayroll(@Param('id') id: string) {
    return await this.payrollService.cancelPayroll(id);
  }
}
