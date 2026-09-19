import {
  Controller,
  Get,
  Query,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportsPdfService } from './reports-pdf.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsPdfService: ReportsPdfService,
  ) {}

  // 1. Management Dashboard
  @Get('dashboard')
  async getDashboard(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getDashboard(query);
    return { success: true, data };
  }

  @Get('dashboard/pdf')
  async getDashboardPdf(@Query() query: ReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getDashboard(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Management_Dashboard_${Date.now()}.pdf"`);
    this.reportsPdfService.generateDashboardPdf(data, res);
  }

  // 2. Sales & Revenue
  @Get('sales')
  async getSales(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getSalesReport(query);
    return { success: true, data };
  }

  @Get('sales/export')
  async exportSalesCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const { filename, csv } = await this.reportsService.generateCsv('sales', query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }

  @Get('sales/pdf')
  async getSalesPdf(@Query() query: ReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getSalesReport(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Sales_Report_${Date.now()}.pdf"`);
    this.reportsPdfService.generateSalesPdf(data, res);
  }

  // 3. Receivables & Aging
  @Get('receivables')
  async getReceivables(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getReceivablesReport(query);
    return { success: true, data };
  }

  @Get('receivables/export')
  async exportReceivablesCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const { filename, csv } = await this.reportsService.generateCsv('receivables', query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }

  @Get('receivables/pdf')
  async getReceivablesPdf(@Query() query: ReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getReceivablesReport(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Receivables_Aging_${Date.now()}.pdf"`);
    this.reportsPdfService.generateReceivablesPdf(data, res);
  }

  // 4. Procurement & POs
  @Get('procurement')
  async getProcurement(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getProcurementReport(query);
    return { success: true, data };
  }

  @Get('procurement/export')
  async exportProcurementCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const { filename, csv } = await this.reportsService.generateCsv('procurement', query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }

  // 5. Payables & Supplier Aging
  @Get('payables')
  async getPayables(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getPayablesReport(query);
    return { success: true, data };
  }

  @Get('payables/export')
  async exportPayablesCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const { filename, csv } = await this.reportsService.generateCsv('payables', query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }

  @Get('payables/pdf')
  async getPayablesPdf(@Query() query: ReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getPayablesReport(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Payables_Aging_${Date.now()}.pdf"`);
    this.reportsPdfService.generatePayablesPdf(data, res);
  }

  // 6. Operating Expenses
  @Get('expenses')
  async getExpenses(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getExpenseReport(query);
    return { success: true, data };
  }

  @Get('expenses/export')
  async exportExpensesCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const { filename, csv } = await this.reportsService.generateCsv('expenses', query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }

  // 7. Inventory Stock & Valuation
  @Get('inventory')
  async getInventory(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getInventoryReport(query);
    return { success: true, data };
  }

  @Get('inventory/export')
  async exportInventoryCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const { filename, csv } = await this.reportsService.generateCsv('inventory', query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }

  @Get('inventory/pdf')
  async getInventoryPdf(@Query() query: ReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getInventoryReport(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Inventory_Valuation_${Date.now()}.pdf"`);
    this.reportsPdfService.generateInventoryPdf(data, res);
  }

  // 8. GST Reports & Returns
  @Get('gst/summary')
  async getGstSummary(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getGstSummary(query);
    return { success: true, data };
  }

  @Get('gst/outward')
  async getGstOutward(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getGstSummary(query);
    return { success: true, data: data.outwardInvoices };
  }

  @Get('gst/inward')
  async getGstInward(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getGstSummary(query);
    return { success: true, data: data.inwardPurchases };
  }

  @Get('gst/export')
  async exportGstCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const { filename, csv } = await this.reportsService.generateCsv('gst', query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }

  @Get('gst/pdf')
  async getGstPdf(@Query() query: ReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getGstSummary(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="GST_Computation_${Date.now()}.pdf"`);
    this.reportsPdfService.generateGstPdf(data, res);
  }

  // 9. Financial Summary
  @Get('financial-summary')
  async getFinancialSummary(@Query() query: ReportQueryDto) {
    const dashboard = await this.reportsService.getDashboard(query);
    return {
      success: true,
      periodLabel: dashboard.periodLabel,
      financials: dashboard.financials,
    };
  }

  // 10. Operations & Field Services
  @Get('operations')
  async getOperations(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getOperationsReport(query);
    return { success: true, data };
  }

  // 11. Workforce & Payroll
  @Get('workforce')
  async getWorkforce(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getWorkforceReport(query);
    return { success: true, data };
  }

  // 12. Phase 15 — Assets, AMC & Preventive Maintenance
  @Get('assets')
  async getAssets(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getAssetsReport(query);
    return { success: true, data };
  }

  @Get('amc')
  async getAmc(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getAmcReport(query);
    return { success: true, data };
  }

  @Get('preventive-maintenance')
  async getPreventiveMaintenance(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getPreventiveMaintenanceReport(query);
    return { success: true, data };
  }
}
