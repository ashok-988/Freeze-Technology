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
import { PayablesService } from './payables.service';
import { PayablesPdfService } from './payables-pdf.service';
import { CreateVendorBillDto } from './dto/create-vendor-bill.dto';
import { UpdateVendorBillDto } from './dto/update-vendor-bill.dto';
import { RecordVendorPaymentDto } from './dto/record-vendor-payment.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { RecordExpensePaymentDto } from './dto/record-expense-payment.dto';
import { PayablesQueryDto } from './dto/payables-query.dto';

@Controller('payables')
export class PayablesController {
  constructor(
    private readonly payablesService: PayablesService,
    private readonly payablesPdfService: PayablesPdfService,
  ) {}

  @Get()
  async getOverview() {
    const stats = await this.payablesService.getStats();
    return { success: true, data: stats };
  }

  @Get('stats')
  async getStats() {
    const data = await this.payablesService.getStats();
    return { success: true, data };
  }

  @Get('categories')
  async getCategories() {
    const data = await this.payablesService.getCategories();
    return { success: true, data };
  }

  @Get('aging')
  async getAging() {
    const data = await this.payablesService.getAging();
    return { success: true, data };
  }

  // ==========================================
  // VENDOR BILLS
  // ==========================================

  @Get('bills')
  async getBills(@Query() query: PayablesQueryDto) {
    const data = await this.payablesService.getBills(query);
    return { success: true, data };
  }

  @Get('bills/:id')
  async getBillById(@Param('id') id: string) {
    const data = await this.payablesService.getBillById(id);
    return { success: true, data };
  }

  @Get('bills/:id/pdf')
  async downloadBillPdf(@Param('id') id: string, @Res() res: Response) {
    const bill = await this.payablesService.getBillById(id);
    const safeFilename = `Bill_${bill.billNumber}_${(bill.supplier?.companyName || 'Supplier').replace(/\s+/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    this.payablesPdfService.generateVendorBillPDF(bill, res);
  }

  @Post('bills')
  @HttpCode(HttpStatus.CREATED)
  async createBill(@Body() dto: CreateVendorBillDto) {
    const data = await this.payablesService.createBill(dto);
    return {
      success: true,
      message: `Vendor bill "${data.billNumber}" created successfully.`,
      data,
    };
  }

  @Patch('bills/:id')
  async updateBill(@Param('id') id: string, @Body() dto: UpdateVendorBillDto) {
    const data = await this.payablesService.updateBill(id, dto);
    return {
      success: true,
      message: `Vendor bill "${data.billNumber}" updated successfully.`,
      data,
    };
  }

  @Post('bills/:id/submit')
  @HttpCode(HttpStatus.OK)
  async submitBill(@Param('id') id: string) {
    const data = await this.payablesService.submitBill(id);
    return {
      success: true,
      message: `Vendor bill "${data.billNumber}" submitted for review.`,
      data,
    };
  }

  @Post('bills/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveBill(@Param('id') id: string) {
    const data = await this.payablesService.approveBill(id);
    return {
      success: true,
      message: `Vendor bill "${data.billNumber}" has been APPROVED.`,
      data,
    };
  }

  @Post('bills/:id/payment')
  @HttpCode(HttpStatus.OK)
  async recordVendorPayment(
    @Param('id') id: string,
    @Body() dto: RecordVendorPaymentDto,
  ) {
    const data = await this.payablesService.recordVendorPayment(id, dto);
    return {
      success: true,
      message: `Payment of ₹${dto.amount} recorded for bill "${data.bill.billNumber}". Status: ${data.bill.status}.`,
      data,
    };
  }

  @Post('bills/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBill(@Param('id') id: string) {
    const data = await this.payablesService.cancelBill(id);
    return {
      success: true,
      message: `Vendor bill "${data.billNumber}" has been cancelled.`,
      data,
    };
  }

  // ==========================================
  // OPERATING EXPENSES
  // ==========================================

  @Get('expenses')
  async getExpenses(@Query() query: PayablesQueryDto) {
    const data = await this.payablesService.getExpenses(query);
    return { success: true, data };
  }

  @Get('expenses/:id')
  async getExpenseById(@Param('id') id: string) {
    const data = await this.payablesService.getExpenseById(id);
    return { success: true, data };
  }

  @Get('expenses/:id/pdf')
  async downloadExpensePdf(@Param('id') id: string, @Res() res: Response) {
    const expense = await this.payablesService.getExpenseById(id);
    const safeFilename = `Expense_${expense.expenseNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    this.payablesPdfService.generateExpenseVoucherPDF(expense, res);
  }

  @Post('expenses')
  @HttpCode(HttpStatus.CREATED)
  async createExpense(@Body() dto: CreateExpenseDto) {
    const data = await this.payablesService.createExpense(dto);
    return {
      success: true,
      message: `Expense "${data.expenseNumber}" created successfully.`,
      data,
    };
  }

  @Patch('expenses/:id')
  async updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    const data = await this.payablesService.updateExpense(id, dto);
    return {
      success: true,
      message: `Expense "${data.expenseNumber}" updated successfully.`,
      data,
    };
  }

  @Post('expenses/:id/submit')
  @HttpCode(HttpStatus.OK)
  async submitExpense(@Param('id') id: string) {
    const data = await this.payablesService.submitExpense(id);
    return {
      success: true,
      message: `Expense "${data.expenseNumber}" submitted for approval.`,
      data,
    };
  }

  @Post('expenses/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveExpense(@Param('id') id: string) {
    const data = await this.payablesService.approveExpense(id);
    return {
      success: true,
      message: `Expense "${data.expenseNumber}" has been APPROVED.`,
      data,
    };
  }

  @Post('expenses/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectExpense(
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    const data = await this.payablesService.rejectExpense(id, notes);
    return {
      success: true,
      message: `Expense "${data.expenseNumber}" has been REJECTED.`,
      data,
    };
  }

  @Post('expenses/:id/payment')
  @HttpCode(HttpStatus.OK)
  async recordExpensePayment(
    @Param('id') id: string,
    @Body() dto: RecordExpensePaymentDto,
  ) {
    const data = await this.payablesService.recordExpensePayment(id, dto);
    return {
      success: true,
      message: `Payment of ₹${dto.amount} disbursed for expense "${data.expense.expenseNumber}". Status: PAID.`,
      data,
    };
  }

  @Post('expenses/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelExpense(@Param('id') id: string) {
    const data = await this.payablesService.cancelExpense(id);
    return {
      success: true,
      message: `Expense "${data.expenseNumber}" has been cancelled.`,
      data,
    };
  }

  // ==========================================
  // PAYMENTS & AUDIT HISTORY
  // ==========================================

  @Get('payments')
  async getPayments(@Query() query: any) {
    const data = await this.payablesService.getPayments(query);
    return { success: true, data };
  }

  @Get('payments/:id/receipt')
  async downloadPaymentReceipt(@Param('id') id: string, @Res() res: Response) {
    const payment = await this.payablesService.getPaymentById(id);
    const safeFilename = `Payment_Receipt_${payment.id.slice(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    this.payablesPdfService.generatePaymentReceiptPDF(payment, res);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    const data = await this.payablesService.getHistory(id);
    return { success: true, data };
  }
}
