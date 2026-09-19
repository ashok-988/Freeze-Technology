import { Controller, Get, Query, Res, Req, UseGuards, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { ExecutiveDashboardPdfService } from './executive-dashboard-pdf.service';
import { ExecutiveDashboardQueryDto, parseDateRange } from './dto/executive-dashboard-query.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('executive-dashboard')
export class ExecutiveDashboardController {
  private readonly logger = new Logger(ExecutiveDashboardController.name);

  constructor(
    private readonly dashboardService: ExecutiveDashboardService,
    private readonly pdfService: ExecutiveDashboardPdfService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Complete consolidated Executive Dashboard payload.
   */
  @Get()
  async getDashboard(@Query() query: ExecutiveDashboardQueryDto) {
    return this.dashboardService.getExecutiveDashboard(query);
  }

  @Get('summary')
  async getSummary(@Query() query: ExecutiveDashboardQueryDto) {
    return this.dashboardService.getExecutiveDashboard(query);
  }

  @Get('kpis')
  async getKPIs(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    const [revenue, collections, receivables, payables, expenses, payroll, inventory, gst] =
      await Promise.all([
        this.dashboardService.getRevenueMetrics(range),
        this.dashboardService.getCollectionsMetrics(range),
        this.dashboardService.getReceivablesMetrics(),
        this.dashboardService.getPayablesMetrics(),
        this.dashboardService.getExpensesMetrics(range),
        this.dashboardService.getPayrollMetrics(range),
        this.dashboardService.getInventoryMetrics(),
        this.dashboardService.getGSTMetrics(range),
      ]);
    return {
      revenue,
      collections,
      receivables,
      payables,
      expenses,
      payroll,
      inventory,
      gst,
    };
  }

  @Get('trends')
  async getTrends() {
    return this.dashboardService.getMonthlyTrends();
  }

  @Get('profitability')
  async getProfitability(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    return this.dashboardService.getProfitabilityMetrics(range);
  }

  @Get('aging')
  async getAging() {
    const [receivables, payables] = await Promise.all([
      this.dashboardService.getReceivablesMetrics(),
      this.dashboardService.getPayablesMetrics(),
    ]);
    return {
      receivablesAging: receivables.aging,
      payablesAging: payables.aging,
      topDebtors: receivables.topDebtors,
      topCreditors: payables.topCreditors,
    };
  }

  @Get('exceptions')
  async getExceptions() {
    return this.dashboardService.getManagementExceptions();
  }

  @Get('revenue')
  async getRevenue(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    return this.dashboardService.getRevenueMetrics(range);
  }

  @Get('collections')
  async getCollections(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    return this.dashboardService.getCollectionsMetrics(range);
  }

  @Get('receivables')
  async getReceivables() {
    return this.dashboardService.getReceivablesMetrics();
  }

  @Get('payables')
  async getPayables() {
    return this.dashboardService.getPayablesMetrics();
  }

  @Get('expenses')
  async getExpenses(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    return this.dashboardService.getExpensesMetrics(range);
  }

  @Get('payroll')
  async getPayroll(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    return this.dashboardService.getPayrollMetrics(range);
  }

  @Get('inventory')
  async getInventory() {
    return this.dashboardService.getInventoryMetrics();
  }

  @Get('procurement')
  async getProcurement(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    return this.dashboardService.getProcurementMetrics(range);
  }

  @Get('service')
  async getServices(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    return this.dashboardService.getServicesMetrics(range);
  }

  @Get('amc')
  async getAMC(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    return this.dashboardService.getAMCMetrics(range);
  }

  @Get('assets')
  async getAssets() {
    return this.dashboardService.getAssetsMetrics();
  }

  @Get('preventive-maintenance')
  async getPM(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    return this.dashboardService.getPMMetrics(range);
  }

  @Get('gst')
  async getGST(@Query() query: ExecutiveDashboardQueryDto) {
    const range = parseDateRange(query);
    return this.dashboardService.getGSTMetrics(range);
  }

  /**
   * PDF Generation & Download with AuditLog capture.
   */
  @Get('pdf')
  async downloadPdf(
    @Query() query: ExecutiveDashboardQueryDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const data = await this.dashboardService.getExecutiveDashboard(query);

    // Record AuditLog
    try {
      let actorId = (req as any).user?.id || (req as any).user?.userId;
      if (!actorId) {
        const firstUser = await this.prisma.user.findFirst();
        actorId = firstUser?.id;
      }

      if (actorId) {
        await this.prisma.auditLog.create({
          data: {
            userId: actorId,
            moduleName: 'EXECUTIVE_DASHBOARD',
            action: 'EXPORT_PDF',
            details: JSON.stringify({
              period: query.period || 'current_fy',
              dateRange: data.dateRange,
            }),
          },
        });
      }
    } catch (auditErr) {
      this.logger.warn(`Could not log PDF export: ${auditErr.message}`);
    }

    return this.pdfService.generateExecutiveReportPdf(data, res);
  }
}
