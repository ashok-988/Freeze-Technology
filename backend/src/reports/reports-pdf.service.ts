import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class ReportsPdfService {
  private formatCurrency(amount: number): string {
    return `Rs. ${(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private drawHeader(doc: any, title: string, subtitle: string, dateRangeText: string): void {
    // Outer border
    doc.rect(30, 30, 535, 750).stroke('#1e293b');

    // Company Header
    doc.fillColor('#2F612F')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('FREEZE TECHNOLOGY', 45, 42);

    doc.fillColor('#334155')
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('Air Conditioning & Refrigeration Sales & Service', 45, 62);

    doc.fillColor('#64748b')
      .fontSize(7.5)
      .font('Helvetica')
      .text('GSTIN: 33BKCPD7319A2ZU  |  PTC Quarters, Thoraipakkam, OMR, Chennai - 600 097', 45, 73);

    // Right Branding
    doc.fillColor('#0000d0')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Panasonic', 380, 42, { align: 'right' });

    doc.fillColor('#475569')
      .fontSize(7.5)
      .font('Helvetica')
      .text('Authorised Sales & Service', 380, 60, { align: 'right' });

    doc.fillColor('#64748b')
      .fontSize(7)
      .font('Helvetica')
      .text(`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, 380, 73, { align: 'right' });

    doc.moveTo(30, 88).lineTo(565, 88).stroke('#cbd5e1');

    // Title Bar
    doc.rect(30, 88, 535, 24).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(title.toUpperCase(), 30, 94, {
        align: 'center',
        width: 535,
      });

    // Subtitle & Date range strip
    doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold').text(`Period: ${dateRangeText}`, 45, 118);
    if (subtitle) {
      doc.font('Helvetica').fillColor('#64748b').text(subtitle, 300, 118, { align: 'right', width: 250 });
    }

    doc.moveTo(30, 130).lineTo(565, 130).stroke('#e2e8f0');
  }

  private drawFooter(doc: any, note: string): void {
    const sigY = 735;
    doc.moveTo(30, sigY - 15).lineTo(565, sigY - 15).stroke('#cbd5e1');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('Prepared By: System Generated', 45, sigY);
    doc.text('Verified By: Finance / Management', 380, sigY, { align: 'right' });

    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
    doc.text(`Freeze Technology ERP — Enterprise Analytics & Reporting Engine  |  ${note || 'Confidential & Proprietary'}`, 30, 762, {
      align: 'center',
      width: 535,
    });
  }

  // 1. Management Dashboard PDF
  generateDashboardPdf(data: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    this.drawHeader(doc, 'Management Executive Analytics & KPI Report', 'Executive Summary', data.periodLabel || 'Current FY');

    let currentY = 140;

    // KPI Cards Grid (4 boxes)
    const kpis = [
      { label: 'Total Revenue', value: this.formatCurrency(data.kpis?.totalRevenue), sub: `${data.kpis?.totalInvoicesCount || 0} Invoices` },
      { label: 'Cash Collections', value: this.formatCurrency(data.kpis?.totalCollections), sub: `${data.kpis?.totalPaymentsCount || 0} Payments` },
      { label: 'Outstanding Receivables', value: this.formatCurrency(data.kpis?.outstandingReceivables), sub: 'Unpaid Customer Balance' },
      { label: 'Outstanding Payables', value: this.formatCurrency(data.kpis?.outstandingPayables), sub: 'Unsettled Vendor Bills' },
      { label: 'Operating Expenses', value: this.formatCurrency(data.kpis?.totalExpenses), sub: 'Operational Spend' },
      { label: 'Payroll Outflow', value: this.formatCurrency(data.kpis?.payrollCost), sub: 'Staff Salary Disbursements' },
      { label: 'Inventory Valuation', value: this.formatCurrency(data.kpis?.inventoryValuation), sub: `${data.kpis?.totalSkus || 0} Products in Stock` },
      { label: 'Estimated Net GST', value: this.formatCurrency(data.kpis?.netGstLiability), sub: `Output - Input ITC` },
    ];

    const boxW = 120;
    const boxH = 46;
    kpis.forEach((k, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const x = 40 + col * (boxW + 12);
      const y = currentY + row * (boxH + 8);

      doc.rect(x, y, boxW, boxH).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text(k.label.toUpperCase(), x + 6, y + 6);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(k.value, x + 6, y + 18, { width: boxW - 12 });
      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text(k.sub, x + 6, y + 32, { width: boxW - 12, ellipsis: true });
    });

    currentY += 115;

    // Management Financial Summary Box
    doc.rect(40, currentY, 515, 120).fillAndStroke('#ffffff', '#2F612F');
    doc.rect(40, currentY, 515, 20).fillAndStroke('#2F612F', '#2F612F');
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('MANAGEMENT FINANCIAL SUMMARY', 50, currentY + 5);

    const finRows = [
      { label: 'A. Gross Revenue (Invoiced Sales)', value: this.formatCurrency(data.financials?.grossRevenue || data.kpis?.totalRevenue), isBold: false },
      { label: 'B. Direct Purchases / Procurement COGS', value: `- ${this.formatCurrency(data.financials?.cogs || data.kpis?.purchaseValue)}`, isBold: false },
      { label: 'C. Gross Management Margin (A - B)', value: this.formatCurrency(data.financials?.grossProfit || (data.kpis?.totalRevenue - (data.financials?.cogs || 0))), isBold: true },
      { label: 'D. Operating Expenses (Admin, Fuel, Spares)', value: `- ${this.formatCurrency(data.financials?.operatingExpenses || data.kpis?.totalExpenses)}`, isBold: false },
      { label: 'E. Payroll & Workforce Cost', value: `- ${this.formatCurrency(data.financials?.payrollCost || data.kpis?.payrollCost)}`, isBold: false },
      { label: 'F. Net Operating Surplus / Result (C - D - E)', value: this.formatCurrency(data.financials?.netResult || 0), isBold: true, color: '#166534' },
    ];

    let finY = currentY + 24;
    finRows.forEach((r) => {
      doc.fillColor(r.color || '#1e293b').fontSize(7.5).font(r.isBold ? 'Helvetica-Bold' : 'Helvetica').text(r.label, 50, finY);
      doc.text(r.value, 400, finY, { align: 'right', width: 145 });
      finY += 15;
    });

    currentY += 135;

    // GST & Operations Snapshot
    doc.rect(40, currentY, 250, 110).fillAndStroke('#ffffff', '#cbd5e1');
    doc.rect(40, currentY, 250, 18).fillAndStroke('#e2e8f0', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text('GST Tax Summary', 48, currentY + 4);

    let gstY = currentY + 24;
    [
      { label: 'Output GST Collected (Sales):', val: this.formatCurrency(data.gst?.outputTax || 0) },
      { label: 'Input Tax Credit (Purchases/Bills):', val: this.formatCurrency(data.gst?.inputTax || 0) },
      { label: 'Eligible Expense ITC:', val: this.formatCurrency(data.gst?.expenseInputTax || 0) },
      { label: 'Estimated Net GST Payable:', val: this.formatCurrency(data.gst?.netPayable || 0), bold: true },
    ].forEach((g) => {
      doc.fillColor('#334155').fontSize(7).font(g.bold ? 'Helvetica-Bold' : 'Helvetica').text(g.label, 48, gstY);
      doc.text(g.val, 180, gstY, { align: 'right', width: 100 });
      gstY += 18;
    });

    // Operations Snapshot
    doc.rect(305, currentY, 250, 110).fillAndStroke('#ffffff', '#cbd5e1');
    doc.rect(305, currentY, 250, 18).fillAndStroke('#e2e8f0', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text('Operations & Field Snapshot', 313, currentY + 4);

    let opsY = currentY + 24;
    [
      { label: 'Active Job Cards / Service Requests:', val: `${data.operations?.activeJobCards || 0}` },
      { label: 'Completed Service Jobs:', val: `${data.operations?.completedJobCards || 0}` },
      { label: 'Active AMC Contracts:', val: `${data.operations?.activeAmcCount || 0}` },
      { label: 'Scheduled Installations:', val: `${data.operations?.scheduledInstallations || 0}` },
    ].forEach((o) => {
      doc.fillColor('#334155').fontSize(7).font('Helvetica').text(o.label, 313, opsY);
      doc.font('Helvetica-Bold').text(o.val, 480, opsY, { align: 'right', width: 65 });
      opsY += 18;
    });

    this.drawFooter(doc, 'Management Review Document — Not a Statutory Filing');
    doc.end();
  }

  // 2. Sales Report PDF
  generateSalesPdf(data: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    this.drawHeader(doc, 'Sales & Revenue Analysis Report', `Invoices: ${data.totalCount || data.items?.length || 0}`, data.periodLabel || 'Selected Range');

    // Summary Strip
    doc.rect(40, 135, 515, 36).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold');
    doc.text(`Total Invoiced: ${this.formatCurrency(data.summary?.totalGrandTotal || 0)}`, 48, 142);
    doc.text(`Taxable Subtotal: ${this.formatCurrency(data.summary?.totalSubtotal || 0)}`, 200, 142);
    doc.text(`GST Collected: ${this.formatCurrency(data.summary?.totalGst || 0)}`, 380, 142);

    doc.text(`Discounts: ${this.formatCurrency(data.summary?.totalDiscount || 0)}`, 48, 156);
    doc.text(`Paid Collections: ${this.formatCurrency(data.summary?.totalPaid || 0)}`, 200, 156);
    doc.text(`Outstanding Balance: ${this.formatCurrency(data.summary?.totalOutstanding || 0)}`, 380, 156);

    // Table Header
    const tableTop = 180;
    doc.rect(40, tableTop, 515, 18).fillAndStroke('#2F612F', '#2F612F');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('Invoice #', 45, tableTop + 5);
    doc.text('Date', 120, tableTop + 5);
    doc.text('Customer', 180, tableTop + 5);
    doc.text('Subtotal', 330, tableTop + 5, { width: 55, align: 'right' });
    doc.text('GST (18%)', 390, tableTop + 5, { width: 50, align: 'right' });
    doc.text('Grand Total', 445, tableTop + 5, { width: 55, align: 'right' });
    doc.text('Status', 505, tableTop + 5, { width: 45, align: 'center' });

    let currentY = tableTop + 18;
    const items = (data.items || []).slice(0, 26); // fit on one page
    items.forEach((it: any, idx: number) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, currentY, 515, 17).fillAndStroke(bg, '#f1f5f9');

      doc.fillColor('#0f172a').fontSize(7).font('Helvetica');
      doc.text(it.invoiceNumber || '-', 45, currentY + 4, { width: 72, ellipsis: true });
      doc.text(new Date(it.invoiceDate).toLocaleDateString('en-GB'), 120, currentY + 4);
      doc.text(it.customer?.companyName || it.customer?.customerName || '-', 180, currentY + 4, { width: 145, ellipsis: true });
      doc.text(this.formatCurrency(it.subtotal), 330, currentY + 4, { width: 55, align: 'right' });
      doc.text(this.formatCurrency(it.gstAmount), 390, currentY + 4, { width: 50, align: 'right' });
      doc.font('Helvetica-Bold').text(this.formatCurrency(it.grandTotal), 445, currentY + 4, { width: 55, align: 'right' });
      doc.font('Helvetica').text(it.paymentStatus || 'Pending', 505, currentY + 4, { width: 45, align: 'center' });

      currentY += 17;
    });

    this.drawFooter(doc, 'Sales Ledger & Revenue Reconciliation');
    doc.end();
  }

  // 3. GST Report PDF
  generateGstPdf(data: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    this.drawHeader(doc, 'GST Compliance & Tax Computation Report', 'GSTR-1 / GSTR-3B Summary', data.periodLabel || 'Current Period');

    let currentY = 135;

    // GST Computation Table
    doc.rect(40, currentY, 515, 20).fillAndStroke('#2F612F', '#2F612F');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold').text('GST LIABILITY & INPUT TAX CREDIT COMPUTATION (RS)', 48, currentY + 5);

    currentY += 20;

    const compRows = [
      { tax: 'A. Outward Taxable Supplies (Sales)', taxVal: this.formatCurrency(data.summary?.outwardTaxable || 0), cgst: this.formatCurrency(data.summary?.outwardCgst || 0), sgst: this.formatCurrency(data.summary?.outwardSgst || 0), igst: this.formatCurrency(data.summary?.outwardIgst || 0), total: this.formatCurrency(data.summary?.totalOutputTax || 0), isHeader: false },
      { tax: 'B. Inward Eligible Supplies (Vendor Bills)', taxVal: this.formatCurrency(data.summary?.inwardBillsTaxable || 0), cgst: this.formatCurrency(data.summary?.inwardBillsCgst || 0), sgst: this.formatCurrency(data.summary?.inwardBillsSgst || 0), igst: this.formatCurrency(data.summary?.inwardBillsIgst || 0), total: this.formatCurrency(data.summary?.inwardBillsTax || 0), isHeader: false },
      { tax: 'C. Operating Expenses Tax (Vouchers)', taxVal: this.formatCurrency(data.summary?.inwardExpenseTaxable || 0), cgst: this.formatCurrency(data.summary?.inwardExpenseCgst || 0), sgst: this.formatCurrency(data.summary?.inwardExpenseSgst || 0), igst: this.formatCurrency(data.summary?.inwardExpenseIgst || 0), total: this.formatCurrency(data.summary?.inwardExpenseTax || 0), isHeader: false },
      { tax: 'D. Total Input Tax Credit (ITC = B + C)', taxVal: '-', cgst: this.formatCurrency(data.summary?.totalInputCgst || 0), sgst: this.formatCurrency(data.summary?.totalInputSgst || 0), igst: this.formatCurrency(data.summary?.totalInputIgst || 0), total: this.formatCurrency(data.summary?.totalInputTax || 0), isHeader: true, bg: '#f0fdf4' },
      { tax: 'E. NET ESTIMATED GST LIABILITY (A - D)', taxVal: '-', cgst: this.formatCurrency(data.summary?.netCgst || 0), sgst: this.formatCurrency(data.summary?.netSgst || 0), igst: this.formatCurrency(data.summary?.netIgst || 0), total: this.formatCurrency(data.summary?.netGstLiability || 0), isHeader: true, bg: '#fef2f2', color: '#991b1b' },
    ];

    compRows.forEach((r) => {
      doc.rect(40, currentY, 515, 20).fillAndStroke(r.bg || '#ffffff', '#cbd5e1');
      doc.fillColor(r.color || '#0f172a').fontSize(7.5).font(r.isHeader ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(r.tax, 45, currentY + 5, { width: 175 });
      doc.text(r.taxVal, 220, currentY + 5, { width: 65, align: 'right' });
      doc.text(r.cgst, 290, currentY + 5, { width: 55, align: 'right' });
      doc.text(r.sgst, 350, currentY + 5, { width: 55, align: 'right' });
      doc.text(r.igst, 410, currentY + 5, { width: 55, align: 'right' });
      doc.font('Helvetica-Bold').text(r.total, 470, currentY + 5, { width: 80, align: 'right' });
      currentY += 20;
    });

    currentY += 15;

    // Outward Supplies Section
    doc.rect(40, currentY, 515, 18).fillAndStroke('#334155', '#334155');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('OUTWARD TAX INVOICES (GSTR-1 REFERENCE)', 45, currentY + 5);

    currentY += 18;
    doc.rect(40, currentY, 515, 16).fillAndStroke('#e2e8f0', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold');
    doc.text('Invoice #', 45, currentY + 4);
    doc.text('Date', 115, currentY + 4);
    doc.text('Customer Name & GSTIN', 170, currentY + 4);
    doc.text('Type', 320, currentY + 4);
    doc.text('Taxable (Rs)', 365, currentY + 4, { width: 60, align: 'right' });
    doc.text('GST (Rs)', 430, currentY + 4, { width: 55, align: 'right' });
    doc.text('Total (Rs)', 490, currentY + 4, { width: 60, align: 'right' });

    currentY += 16;
    const outward = (data.outwardInvoices || []).slice(0, 16);
    outward.forEach((inv: any, idx: number) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, currentY, 515, 16).fillAndStroke(bg, '#f1f5f9');
      doc.fillColor('#0f172a').fontSize(6.5).font('Helvetica');
      doc.text(inv.invoiceNumber, 45, currentY + 4);
      doc.text(new Date(inv.invoiceDate).toLocaleDateString('en-GB'), 115, currentY + 4);
      doc.text(`${inv.customerName} ${inv.gstin ? `(${inv.gstin})` : ''}`, 170, currentY + 4, { width: 145, ellipsis: true });
      doc.text(inv.isB2B ? 'B2B' : 'B2C', 320, currentY + 4);
      doc.text(this.formatCurrency(inv.taxableValue), 365, currentY + 4, { width: 60, align: 'right' });
      doc.text(this.formatCurrency(inv.gstAmount), 430, currentY + 4, { width: 55, align: 'right' });
      doc.font('Helvetica-Bold').text(this.formatCurrency(inv.totalValue), 490, currentY + 4, { width: 60, align: 'right' });
      currentY += 16;
    });

    this.drawFooter(doc, 'Internal Tax Analytics — Non-Governmental GST Calculation Document');
    doc.end();
  }

  // 4. Receivables Aging Report PDF
  generateReceivablesPdf(data: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    this.drawHeader(doc, 'Accounts Receivable & Customer Aging Analysis', `Total Open: ${this.formatCurrency(data.summary?.totalReceivables || 0)}`, data.periodLabel || 'As of Today');

    // Aging Buckets Summary Banner
    doc.rect(40, 135, 515, 36).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold');
    doc.text(`Total Due: ${this.formatCurrency(data.summary?.totalReceivables || 0)}`, 48, 142);
    doc.text(`Current (Not Due): ${this.formatCurrency(data.summary?.current || 0)}`, 200, 142);
    doc.text(`1–30 Days Overdue: ${this.formatCurrency(data.summary?.days1to30 || 0)}`, 380, 142);

    doc.text(`31–60 Days: ${this.formatCurrency(data.summary?.days31to60 || 0)}`, 48, 156);
    doc.text(`61–90 Days: ${this.formatCurrency(data.summary?.days61to90 || 0)}`, 200, 156);
    doc.fillColor('#991b1b').text(`90+ Days: ${this.formatCurrency(data.summary?.days90plus || 0)}`, 380, 156);

    // Table
    const tableTop = 180;
    doc.rect(40, tableTop, 515, 18).fillAndStroke('#2F612F', '#2F612F');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('Customer Name', 45, tableTop + 5);
    doc.text('Phone', 190, tableTop + 5);
    doc.text('Current', 260, tableTop + 5, { width: 55, align: 'right' });
    doc.text('1–30d', 320, tableTop + 5, { width: 50, align: 'right' });
    doc.text('31–60d', 375, tableTop + 5, { width: 50, align: 'right' });
    doc.text('61–90d', 430, tableTop + 5, { width: 50, align: 'right' });
    doc.text('Total Bal (Rs)', 485, tableTop + 5, { width: 65, align: 'right' });

    let currentY = tableTop + 18;
    const customers = (data.customerAging || []).slice(0, 26);
    customers.forEach((c: any, idx: number) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, currentY, 515, 17).fillAndStroke(bg, '#f1f5f9');

      doc.fillColor('#0f172a').fontSize(7).font('Helvetica');
      doc.text(c.customerName || '-', 45, currentY + 4, { width: 140, ellipsis: true });
      doc.text(c.mobile || '-', 190, currentY + 4, { width: 65 });
      doc.text(this.formatCurrency(c.current), 260, currentY + 4, { width: 55, align: 'right' });
      doc.text(this.formatCurrency(c.days1to30), 320, currentY + 4, { width: 50, align: 'right' });
      doc.text(this.formatCurrency(c.days31to60), 375, currentY + 4, { width: 50, align: 'right' });
      doc.text(this.formatCurrency(c.days61to90), 430, currentY + 4, { width: 50, align: 'right' });
      doc.font('Helvetica-Bold').fillColor(c.totalOutstanding > 0 ? '#b91c1c' : '#166534').text(this.formatCurrency(c.totalOutstanding), 485, currentY + 4, { width: 65, align: 'right' });

      currentY += 17;
    });

    this.drawFooter(doc, 'Accounts Receivable Ledger & Aging Statement');
    doc.end();
  }

  // 5. Payables Aging Report PDF
  generatePayablesPdf(data: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    this.drawHeader(doc, 'Accounts Payable & Supplier Aging Analysis', `Total Due: ${this.formatCurrency(data.summary?.totalPayables || 0)}`, data.periodLabel || 'As of Today');

    doc.rect(40, 135, 515, 36).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold');
    doc.text(`Total Due: ${this.formatCurrency(data.summary?.totalPayables || 0)}`, 48, 142);
    doc.text(`Current (Not Due): ${this.formatCurrency(data.summary?.current || 0)}`, 200, 142);
    doc.text(`1–30 Days Overdue: ${this.formatCurrency(data.summary?.days1to30 || 0)}`, 380, 142);

    doc.text(`31–60 Days: ${this.formatCurrency(data.summary?.days31to60 || 0)}`, 48, 156);
    doc.text(`61–90 Days: ${this.formatCurrency(data.summary?.days61to90 || 0)}`, 200, 156);
    doc.fillColor('#991b1b').text(`90+ Days: ${this.formatCurrency(data.summary?.days90plus || 0)}`, 380, 156);

    const tableTop = 180;
    doc.rect(40, tableTop, 515, 18).fillAndStroke('#2F612F', '#2F612F');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('Supplier / Vendor', 45, tableTop + 5);
    doc.text('Contact', 200, tableTop + 5);
    doc.text('Current', 260, tableTop + 5, { width: 55, align: 'right' });
    doc.text('1–30d', 320, tableTop + 5, { width: 50, align: 'right' });
    doc.text('31–60d', 375, tableTop + 5, { width: 50, align: 'right' });
    doc.text('61–90d', 430, tableTop + 5, { width: 50, align: 'right' });
    doc.text('Total Bal (Rs)', 485, tableTop + 5, { width: 65, align: 'right' });

    let currentY = tableTop + 18;
    const suppliers = (data.supplierAging || []).slice(0, 26);
    suppliers.forEach((s: any, idx: number) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, currentY, 515, 17).fillAndStroke(bg, '#f1f5f9');

      doc.fillColor('#0f172a').fontSize(7).font('Helvetica');
      doc.text(s.supplierName || '-', 45, currentY + 4, { width: 150, ellipsis: true });
      doc.text(s.phone || s.contactPerson || '-', 200, currentY + 4, { width: 55, ellipsis: true });
      doc.text(this.formatCurrency(s.current), 260, currentY + 4, { width: 55, align: 'right' });
      doc.text(this.formatCurrency(s.days1to30), 320, currentY + 4, { width: 50, align: 'right' });
      doc.text(this.formatCurrency(s.days31to60), 375, currentY + 4, { width: 50, align: 'right' });
      doc.text(this.formatCurrency(s.days61to90), 430, currentY + 4, { width: 50, align: 'right' });
      doc.font('Helvetica-Bold').fillColor(s.totalOutstanding > 0 ? '#b91c1c' : '#166534').text(this.formatCurrency(s.totalOutstanding), 485, currentY + 4, { width: 65, align: 'right' });

      currentY += 17;
    });

    this.drawFooter(doc, 'Accounts Payable Ledger & Supplier Aging Statement');
    doc.end();
  }

  // 6. Inventory Valuation Report PDF
  generateInventoryPdf(data: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    this.drawHeader(doc, 'Inventory Stock Valuation & Movement Report', `SKUs: ${data.summary?.totalSkus || 0}  |  Valuation: ${this.formatCurrency(data.summary?.totalValuation || 0)}`, data.periodLabel || 'As of Today');

    doc.rect(40, 135, 515, 24).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold');
    doc.text(`Total Inventory Value: ${this.formatCurrency(data.summary?.totalValuation || 0)}`, 48, 143);
    doc.text(`Low Stock Items: ${data.summary?.lowStockCount || 0}`, 260, 143);
    doc.text(`Out of Stock: ${data.summary?.outOfStockCount || 0}`, 420, 143);

    const tableTop = 168;
    doc.rect(40, tableTop, 515, 18).fillAndStroke('#2F612F', '#2F612F');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('SKU', 45, tableTop + 5);
    doc.text('Product Name & Model', 115, tableTop + 5);
    doc.text('Category', 260, tableTop + 5);
    doc.text('Stock', 340, tableTop + 5, { width: 35, align: 'center' });
    doc.text('Unit Cost', 380, tableTop + 5, { width: 55, align: 'right' });
    doc.text('Sell Price', 440, tableTop + 5, { width: 55, align: 'right' });
    doc.text('Total Val (Rs)', 500, tableTop + 5, { width: 50, align: 'right' });

    let currentY = tableTop + 18;
    const products = (data.items || []).slice(0, 27);
    products.forEach((p: any, idx: number) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, currentY, 515, 17).fillAndStroke(bg, '#f1f5f9');

      doc.fillColor('#0f172a').fontSize(7).font('Helvetica');
      doc.text(p.sku || '-', 45, currentY + 4, { width: 65, ellipsis: true });
      doc.text(p.productName || '-', 115, currentY + 4, { width: 140, ellipsis: true });
      doc.text(p.category?.categoryName || '-', 260, currentY + 4, { width: 75, ellipsis: true });
      doc.font(p.stockQuantity <= 5 ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(p.stockQuantity <= 0 ? '#b91c1c' : p.stockQuantity <= 5 ? '#d97706' : '#0f172a')
        .text(String(p.stockQuantity || 0), 340, currentY + 4, { width: 35, align: 'center' });
      doc.fillColor('#0f172a').font('Helvetica').text(this.formatCurrency(p.purchasePrice), 380, currentY + 4, { width: 55, align: 'right' });
      doc.text(this.formatCurrency(p.sellingPrice), 440, currentY + 4, { width: 55, align: 'right' });
      doc.font('Helvetica-Bold').text(this.formatCurrency(p.stockQuantity * p.purchasePrice), 500, currentY + 4, { width: 50, align: 'right' });

      currentY += 17;
    });

    this.drawFooter(doc, 'Warehouse & Stock Inventory Ledger');
    doc.end();
  }
}
