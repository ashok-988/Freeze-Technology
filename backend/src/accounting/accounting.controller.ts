import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingCoaService } from './accounting-coa.service';
import { AccountingJournalService } from './accounting-journal.service';
import { AccountingSyncService } from './accounting-sync.service';
import { AccountingReportsService } from './accounting-reports.service';
import { AccountingPdfService } from './accounting-pdf.service';
import { CreateAccountDto, UpdateAccountDto, QueryAccountDto } from './dto/account.dto';
import { CreateJournalEntryDto, QueryJournalDto, ReverseJournalDto } from './dto/journal.dto';
import { CreateAccountingPeriodDto, ClosePeriodDto, QueryReportDto } from './dto/period.dto';

@Controller('accounting')
export class AccountingController {
  private readonly logger = new Logger(AccountingController.name);

  constructor(
    private prisma: PrismaService,
    private coaService: AccountingCoaService,
    private journalService: AccountingJournalService,
    private syncService: AccountingSyncService,
    private reportsService: AccountingReportsService,
    private pdfService: AccountingPdfService,
  ) {}

  private async logAudit(action: string, details?: any) {
    try {
      const user = await this.prisma.user.findFirst({ select: { id: true } });
      if (user) {
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            moduleName: 'ACCOUNTING',
            action,
            details: details ? JSON.stringify(details) : undefined,
          },
        });
      }
    } catch {}
  }

  // 1. Dashboard Overview
  @Get('dashboard')
  async getDashboard() {
    return this.reportsService.getDashboardSummary();
  }

  // 2. Chart of Accounts
  @Get('accounts')
  async getAccounts(@Query() query: QueryAccountDto) {
    return this.coaService.getAccounts(query);
  }

  @Get('accounts/tree')
  async getAccountTree() {
    return this.coaService.getAccountTree();
  }

  @Get('accounts/:id')
  async getAccountById(@Param('id') id: string) {
    return this.coaService.getAccountById(id);
  }

  @Post('accounts')
  async createAccount(@Body() dto: CreateAccountDto) {
    const acc = await this.coaService.createAccount(dto);
    await this.logAudit('ACCOUNT_CREATED', { accountCode: acc.accountCode, accountName: acc.accountName });
    return acc;
  }

  @Patch('accounts/:id')
  async updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    const acc = await this.coaService.updateAccount(id, dto);
    await this.logAudit('ACCOUNT_UPDATED', { accountId: id, accountName: acc.accountName });
    return acc;
  }

  @Delete('accounts/:id')
  async deleteAccount(@Param('id') id: string) {
    const result = await this.coaService.deleteAccount(id);
    await this.logAudit('ACCOUNT_DELETED', { accountId: id });
    return { message: 'Account successfully removed.', result };
  }

  // 3. Journal Entries
  @Get('journals')
  async getJournals(@Query() query: QueryJournalDto) {
    return this.journalService.getJournalEntries(query);
  }

  @Get('journals/:id')
  async getJournalById(@Param('id') id: string) {
    return this.journalService.getJournalEntryById(id);
  }

  @Post('journals')
  async createJournal(@Body() dto: CreateJournalEntryDto) {
    const user = await this.prisma.user.findFirst({ select: { id: true } });
    const entry = await this.journalService.createJournalEntry(dto, user?.id);
    await this.logAudit('JOURNAL_CREATED', { journalNumber: entry.journalNumber, total: entry.totalDebit });
    return entry;
  }

  @Post('journals/:id/reverse')
  async reverseJournal(@Param('id') id: string, @Body() dto: ReverseJournalDto) {
    const user = await this.prisma.user.findFirst({ select: { id: true } });
    const reversing = await this.journalService.reverseJournalEntry(id, dto, user?.id);
    await this.logAudit('JOURNAL_REVERSED', { originalId: id, reversingNumber: reversing.journalNumber });
    return reversing;
  }

  // 4. Financial Statements & Reports
  @Get('ledger')
  async getLedger(@Query() query: QueryReportDto) {
    return this.reportsService.getGeneralLedger(query);
  }

  @Get('trial-balance')
  async getTrialBalance(@Query() query: QueryReportDto) {
    return this.reportsService.getTrialBalance(query);
  }

  @Get('profit-and-loss')
  async getProfitAndLoss(@Query() query: QueryReportDto) {
    return this.reportsService.getProfitAndLoss(query);
  }

  @Get('balance-sheet')
  async getBalanceSheet(@Query() query: QueryReportDto) {
    return this.reportsService.getBalanceSheet(query);
  }

  @Get('cash-book')
  async getCashBook(@Query() query: QueryReportDto) {
    return this.reportsService.getCashBook(query);
  }

  @Get('reconciliation')
  async getReconciliation() {
    await this.logAudit('RECONCILIATION_RUN');
    return this.reportsService.getReconciliation();
  }

  // 5. Automatic ERP Sync
  @Post('sync-erp')
  async syncErpTransactions() {
    const user = await this.prisma.user.findFirst({ select: { id: true } });
    const result = await this.syncService.syncAllErpTransactions(user?.id);
    await this.logAudit('ACCOUNTING_ERP_SYNC', result);
    return result;
  }

  // 6. Accounting Periods
  @Get('periods')
  async getPeriods() {
    return this.prisma.accountingPeriod.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { journalEntries: true } },
      },
    });
  }

  @Post('periods')
  async createPeriod(@Body() dto: CreateAccountingPeriodDto) {
    const period = await this.prisma.accountingPeriod.create({
      data: {
        financialYear: dto.financialYear,
        periodName: dto.periodName,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status || 'OPEN',
      },
    });
    await this.logAudit('PERIOD_OPENED', { periodName: period.periodName });
    return period;
  }

  @Patch('periods/:id/close')
  async closePeriod(@Param('id') id: string, @Body() dto: ClosePeriodDto) {
    const period = await this.prisma.accountingPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException(`Accounting period with ID "${id}" not found.`);

    const user = await this.prisma.user.findFirst({ select: { id: true } });
    const updated = await this.prisma.accountingPeriod.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: user?.id,
      },
    });
    await this.logAudit('PERIOD_CLOSED', { periodName: updated.periodName, remarks: dto.remarks });
    return updated;
  }

  @Patch('periods/:id/reopen')
  async reopenPeriod(@Param('id') id: string) {
    const period = await this.prisma.accountingPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException(`Accounting period with ID "${id}" not found.`);

    const updated = await this.prisma.accountingPeriod.update({
      where: { id },
      data: {
        status: 'OPEN',
        closedAt: null,
        closedById: null,
      },
    });
    await this.logAudit('PERIOD_REOPENED', { periodName: updated.periodName });
    return updated;
  }

  // 7. PDF Reports
  @Get('pdf/coa')
  async downloadCoaPdf(@Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateCoaPdf();
    await this.logAudit('ACCOUNTING_EXPORT_PDF', { type: 'CHART_OF_ACCOUNTS' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Chart_of_Accounts_FreezeTech.pdf"');
    res.send(pdfBuffer);
  }

  @Get('pdf/trial-balance')
  async downloadTrialBalancePdf(@Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateTrialBalancePdf();
    await this.logAudit('ACCOUNTING_EXPORT_PDF', { type: 'TRIAL_BALANCE' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Trial_Balance_FreezeTech.pdf"');
    res.send(pdfBuffer);
  }

  @Get('pdf/profit-and-loss')
  async downloadProfitAndLossPdf(@Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateProfitAndLossPdf();
    await this.logAudit('ACCOUNTING_EXPORT_PDF', { type: 'PROFIT_AND_LOSS' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Profit_and_Loss_FreezeTech.pdf"');
    res.send(pdfBuffer);
  }

  @Get('pdf/balance-sheet')
  async downloadBalanceSheetPdf(@Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateBalanceSheetPdf();
    await this.logAudit('ACCOUNTING_EXPORT_PDF', { type: 'BALANCE_SHEET' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Balance_Sheet_FreezeTech.pdf"');
    res.send(pdfBuffer);
  }

  @Get('pdf/ledger')
  async downloadLedgerPdf(@Query('accountId') accountId: string, @Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateGeneralLedgerPdf(accountId);
    await this.logAudit('ACCOUNTING_EXPORT_PDF', { type: 'GENERAL_LEDGER', accountId });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="General_Ledger_FreezeTech.pdf"');
    res.send(pdfBuffer);
  }

  @Get('pdf/cash-book')
  async downloadCashBookPdf(@Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateCashBookPdf();
    await this.logAudit('ACCOUNTING_EXPORT_PDF', { type: 'CASH_BOOK' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Cash_Book_FreezeTech.pdf"');
    res.send(pdfBuffer);
  }

  @Get('pdf/journal-register')
  async downloadJournalRegisterPdf(@Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateJournalRegisterPdf();
    await this.logAudit('ACCOUNTING_EXPORT_PDF', { type: 'JOURNAL_REGISTER' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Journal_Register_FreezeTech.pdf"');
    res.send(pdfBuffer);
  }

  @Get('pdf/reconciliation')
  async downloadReconciliationPdf(@Res() res: Response) {
    const pdfBuffer = await this.pdfService.generateReconciliationPdf();
    await this.logAudit('ACCOUNTING_EXPORT_PDF', { type: 'RECONCILIATION' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Accounting_Reconciliation_FreezeTech.pdf"');
    res.send(pdfBuffer);
  }
}
