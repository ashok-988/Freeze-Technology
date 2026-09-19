import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ExecutiveDashboardPdfService {
  private readonly logger = new Logger(ExecutiveDashboardPdfService.name);

  private formatCurrency(amount: number): string {
    return `Rs. ${(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Generates a professional Executive Intelligence Management PDF Report.
   */
  async generateExecutiveReportPdf(data: any, res: Response): Promise<void> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 30,
      bufferPages: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Executive_Management_Report_${Date.now()}.pdf`,
    );

    doc.pipe(res);

    // Header & Company Branding
    doc.rect(30, 30, 535, 760).stroke('#1e293b');

    // Resolve Logo Path
    const candidatePaths = [
      path.join(__dirname, '../../assets/Logo.png'),
      path.join(__dirname, '../../assets/logo.png'),
      path.join(__dirname, '../../../assets/logo.png'),
      path.join(__dirname, '../../../../assets/logo.png'),
      path.join(process.cwd(), 'assets/Logo.png'),
      path.join(process.cwd(), 'assets/logo.png'),
      path.join(process.cwd(), '../assets/logo.png'),
      path.join(process.cwd(), '../frontend/public/Logo.png'),
      path.join(process.cwd(), 'frontend/public/Logo.png'),
    ];

    let logoPath: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        logoPath = p;
        break;
      }
    }

    if (logoPath) {
      try {
        doc.image(logoPath, 40, 38, { width: 44, height: 44 });
      } catch (err) {
        // Continue gracefully
      }
    }

    const textStartX = logoPath ? 92 : 45;

    // Title & Logo Header
    doc.fillColor('#2F612F')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('FREEZE TECHNOLOGY', textStartX, 40);

    doc.fillColor('#334155')
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .text('Air Conditioning & Refrigeration Sales & Service', textStartX, 58);

    doc.fillColor('#64748b')
      .fontSize(7.5)
      .font('Helvetica')
      .text('GSTIN: 33BKCPD7319A2ZU  |  PTC Quarters, Thoraipakkam, OMR, Chennai - 600 097', textStartX, 70);

    // Panasonic Right Tagline (Aligned within outer box with 15pt right margin)
    doc.fillColor('#0000d0')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Panasonic', 365, 40, { width: 185, align: 'right' });

    doc.fillColor('#475569')
      .fontSize(7.5)
      .font('Helvetica')
      .text('Authorised Sales & Service', 365, 55, { width: 185, align: 'right' });

    doc.fillColor('#64748b')
      .fontSize(7)
      .font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString('en-GB')}`, 365, 68, { width: 185, align: 'right' });

    doc.moveTo(30, 88).lineTo(565, 88).stroke('#cbd5e1');

    // Title Bar
    doc.rect(30, 88, 535, 24).fillAndStroke('#0f172a', '#0f172a');
    doc.fillColor('#ffffff')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`EXECUTIVE BUSINESS INTELLIGENCE REPORT — ${data.dateRange?.label?.toUpperCase() || 'CURRENT FY'}`, 30, 95, {
        align: 'center',
        width: 535,
      });

    let y = 122;

    // SECTION 1: KEY PERFORMANCE INDICATORS (4-COLUMN KPI GRID)
    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('1. EXECUTIVE FINANCIAL & OPERATIONAL KPIS', 45, y);
    y += 15;

    const kpis = data.kpis || {};
    const kpiBoxes = [
      { label: 'GROSS REVENUE', value: this.formatCurrency(kpis.revenue?.grossSales), sub: `${kpis.revenue?.invoiceCount || 0} Invoices` },
      { label: 'COLLECTIONS', value: this.formatCurrency(kpis.collections?.totalCollections), sub: `Rate: ${kpis.collections?.collectionRate || 0}%` },
      { label: 'RECEIVABLES', value: this.formatCurrency(kpis.receivables?.totalReceivables), sub: `Overdue: ${this.formatCurrency(kpis.receivables?.overdueReceivables)}` },
      { label: 'PAYABLES', value: this.formatCurrency(kpis.payables?.totalPayables), sub: `Overdue: ${this.formatCurrency(kpis.payables?.overduePayables)}` },
    ];

    const boxW = 120;
    const boxH = 44;
    kpiBoxes.forEach((b, idx) => {
      const bx = 45 + idx * 128;
      doc.rect(bx, y, boxW, boxH).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(6.5).font('Helvetica-Bold').text(b.label, bx + 6, y + 6);
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(b.value, bx + 6, y + 18);
      doc.fillColor('#475569').fontSize(6.5).font('Helvetica').text(b.sub, bx + 6, y + 31);
    });

    y += 54;

    const kpiBoxes2 = [
      { label: 'OPERATING EXPENSES', value: this.formatCurrency(kpis.expenses?.totalExpenses), sub: `${kpis.expenses?.expenseCount || 0} Records` },
      { label: 'PAYROLL COST', value: this.formatCurrency(kpis.payroll?.totalGrossPayroll), sub: `${kpis.payroll?.employeeCount || 0} Employees` },
      { label: 'INVENTORY VALUATION', value: this.formatCurrency(kpis.inventory?.totalStockValuation), sub: `${kpis.inventory?.totalSKUs || 0} SKUs` },
      { label: 'EST. NET GST LIABILITY', value: this.formatCurrency(kpis.gst?.netGSTLiability), sub: `Out: ${this.formatCurrency(kpis.gst?.outputGST)}` },
    ];

    kpiBoxes2.forEach((b, idx) => {
      const bx = 45 + idx * 128;
      doc.rect(bx, y, boxW, boxH).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(6.5).font('Helvetica-Bold').text(b.label, bx + 6, y + 6);
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(b.value, bx + 6, y + 18);
      doc.fillColor('#475569').fontSize(6.5).font('Helvetica').text(b.sub, bx + 6, y + 31);
    });

    y += 58;

    // SECTION 2: MANAGEMENT PROFITABILITY STATEMENT
    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('2. MANAGEMENT PROFITABILITY & MARGINS', 45, y);
    y += 14;

    const prof = kpis.profitability || {};
    doc.rect(45, y, 505, 58).fillAndStroke('#f1f5f9', '#cbd5e1');

    doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
    doc.text(`Gross Revenue: ${this.formatCurrency(prof.grossRevenue)}`, 55, y + 8);
    doc.text(`Direct Purchases (COGS): - ${this.formatCurrency(prof.directPurchasesCOGS)}`, 55, y + 20);
    doc.fillColor('#0f172a').font('Helvetica-Bold')
      .text(`= GROSS MARGIN: ${this.formatCurrency(prof.grossMargin)} (${prof.grossMarginPercent || 0}%)`, 55, y + 36);

    doc.fillColor('#334155').font('Helvetica');
    doc.text(`Operating Expenses: - ${this.formatCurrency(prof.operatingExpenses)}`, 280, y + 8);
    doc.text(`Payroll Cost: - ${this.formatCurrency(prof.payrollCost)}`, 280, y + 20);
    doc.fillColor(prof.netOperatingResult >= 0 ? '#166534' : '#991b1b').font('Helvetica-Bold')
      .text(`= NET OPERATING RESULT: ${this.formatCurrency(prof.netOperatingResult)} (${prof.operatingMarginPercent || 0}%)`, 280, y + 36);

    y += 70;

    // SECTION 3: AGING MATRICES (RECEIVABLES & PAYABLES)
    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('3. WORKING CAPITAL & AGING ANALYSIS', 45, y);
    y += 14;

    // Table Headers
    doc.rect(45, y, 245, 18).fillAndStroke('#e2e8f0', '#cbd5e1');
    doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold').text('Customer Receivables Aging', 52, y + 5);

    doc.rect(305, y, 245, 18).fillAndStroke('#e2e8f0', '#cbd5e1');
    doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold').text('Vendor Payables Aging', 312, y + 5);

    y += 18;

    const rAging = kpis.receivables?.aging || {};
    const pAging = kpis.payables?.aging || {};

    const agingRows = [
      { label: 'Current (Not Overdue)', rVal: rAging.current, pVal: pAging.current },
      { label: '1 - 30 Days Overdue', rVal: rAging.days1To30, pVal: pAging.days1To30 },
      { label: '31 - 60 Days Overdue', rVal: rAging.days31To60, pVal: pAging.days31To60 },
      { label: '61 - 90 Days Overdue', rVal: rAging.days61To90, pVal: pAging.days61To90 },
      { label: '90+ Days Overdue', rVal: rAging.days90Plus, pVal: pAging.days90Plus },
    ];

    agingRows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(45, y, 245, 14).fillAndStroke(bg, '#e2e8f0');
      doc.rect(305, y, 245, 14).fillAndStroke(bg, '#e2e8f0');

      doc.fillColor('#475569').fontSize(6.5).font('Helvetica').text(row.label, 52, y + 3.5);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(this.formatCurrency(row.rVal), 195, y + 3.5, { align: 'right', width: 90 });

      doc.fillColor('#475569').fontSize(6.5).font('Helvetica').text(row.label, 312, y + 3.5);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(this.formatCurrency(row.pVal), 455, y + 3.5, { align: 'right', width: 90 });

      y += 14;
    });

    y += 12;

    // SECTION 4: OPERATIONAL HEALTH & ASSET FLEET SUMMARY
    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('4. SERVICE OPERATIONS & ASSET FLEET HEALTH', 45, y);
    y += 14;

    doc.rect(45, y, 505, 42).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica');

    doc.text(`Active AMC Contracts: ${kpis.amc?.activeContractsCount || 0} (Portfolio: ${this.formatCurrency(kpis.amc?.totalPortfolioValue)})`, 55, y + 6);
    doc.text(`Expiring AMCs (30 Days): ${kpis.amc?.expiringWithin30Days || 0}`, 55, y + 18);
    doc.text(`Preventive Maintenance: ${kpis.preventiveMaintenance?.completed || 0} completed (${kpis.preventiveMaintenance?.completionRate || 0}%)`, 55, y + 30);

    doc.text(`Service Tickets: ${kpis.services?.totalTickets || 0} total (${kpis.services?.openTickets || 0} open, ${kpis.services?.completedTickets || 0} done)`, 280, y + 6);
    doc.text(`Total Installed Assets: ${kpis.assets?.totalAssets || 0} (${kpis.assets?.activeAssets || 0} active)`, 280, y + 18);
    doc.text(`Warranty Active: ${kpis.assets?.warrantyActive || 0} | Expired: ${kpis.assets?.warrantyExpired || 0}`, 280, y + 30);

    y += 54;

    // SECTION 5: TOP MANAGEMENT EXCEPTIONS & ALERTS
    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('5. CRITICAL MANAGEMENT EXCEPTIONS & ALERTS', 45, y);
    y += 14;

    const exceptions = (data.exceptions || []).slice(0, 4);
    if (exceptions.length === 0) {
      doc.rect(45, y, 505, 24).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#166534').fontSize(8).font('Helvetica-Bold').text('✓ All operational and financial parameters are within normal thresholds.', 55, y + 8);
    } else {
      exceptions.forEach((exc) => {
        doc.rect(45, y, 505, 18).fillAndStroke(exc.severity === 'CRITICAL' ? '#fef2f2' : '#fffbeb', '#cbd5e1');
        doc.fillColor(exc.severity === 'CRITICAL' ? '#991b1b' : '#b45309')
          .fontSize(7)
          .font('Helvetica-Bold')
          .text(`[${exc.severity}] ${exc.title}:`, 52, y + 5);

        doc.fillColor('#334155').font('Helvetica').text(exc.description, 200, y + 5, { width: 345, ellipsis: true });
        y += 20;
      });
    }

    // Footer
    doc.fontSize(6.5)
      .fillColor('#64748b')
      .font('Helvetica')
      .text('Confidential — For Internal Management Use Only. Generated by Freeze Technology ERP Executive Engine.', 45, 775, {
        align: 'center',
        width: 505,
      });

    doc.end();
  }
}
