import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class AmcPdfService {
  private formatCurrency(amount: number): string {
    return `Rs. ${(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  generateAmcContractPDF(contract: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    // Border
    doc.rect(30, 30, 535, 760).stroke('#1e293b');

    // Header
    doc.fillColor('#2F612F')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('FREEZE TECHNOLOGY', 45, 45);

    doc.fillColor('#334155')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Annual Maintenance Contract (AMC) Agreement', 45, 68);

    doc.fillColor('#64748b')
      .fontSize(8)
      .font('Helvetica')
      .text('GSTIN: 33BKCPD7319A2ZU  |  OMR, Chennai - 600097  |  Ph: +91 98400 12345', 45, 80);

    // Right Branding
    doc.fillColor('#0000d0')
      .fontSize(15)
      .font('Helvetica-Bold')
      .text('Panasonic', 380, 45, { align: 'right' });

    doc.fillColor('#475569')
      .fontSize(8)
      .font('Helvetica')
      .text('Authorised HVAC Service Partner', 380, 63, { align: 'right' });

    doc.moveTo(30, 95).lineTo(565, 95).stroke('#cbd5e1');

    // Title Bar
    doc.rect(30, 95, 535, 24).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#0f172a')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`AMC CONTRACT NO: ${contract.amcNumber || 'AMC-RECORD'}`, 30, 102, {
        align: 'center',
        width: 535,
      });

    // Customer & Contract Details
    let y = 128;
    doc.rect(40, y, 250, 115).stroke('#e2e8f0');
    doc.rect(295, y, 260, 115).stroke('#e2e8f0');

    // Left: Customer details
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text('CLIENT INFORMATION', 48, y + 8);
    doc.font('Helvetica').fontSize(8);
    doc.text(`Customer Name: ${contract.customer?.customerName || 'N/A'}`, 48, y + 24);
    doc.text(`Company: ${contract.customer?.companyName || 'Individual / Retail'}`, 48, y + 38);
    doc.text(`Customer Code: ${contract.customer?.customerCode || 'N/A'}`, 48, y + 52);
    doc.text(`Contact: ${contract.customer?.mobile || 'N/A'}`, 48, y + 66);
    doc.text(`Site Address: ${contract.customer?.address || 'N/A'}, ${contract.customer?.city || 'Chennai'}`, 48, y + 80, { width: 235 });

    // Right: Contract Details
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text('CONTRACT SPECIFICATIONS', 303, y + 8);
    doc.font('Helvetica').fontSize(8);
    const startStr = contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : 'N/A';
    const endStr = contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : 'N/A';
    doc.text(`Contract Period: ${startStr} to ${endStr}`, 303, y + 24);
    doc.text(`Contract Type: ${contract.contractType || 'COMPREHENSIVE'}`, 303, y + 38);
    doc.text(`Service Frequency: ${contract.serviceFrequency || 'QUARTERLY'} (${contract.totalVisits || 4} Visits)`, 303, y + 52);
    doc.text(`Contract Status: ${contract.status || 'Active'}`, 303, y + 66);
    doc.text(`Assigned Tech: ${contract.assignedTechnician?.fullName || 'Assigned to Service Team'}`, 303, y + 80);

    // Financial Value & Billing Summary Strip
    y = 250;
    doc.rect(40, y, 515, 46).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold');
    doc.text('COMMERCIAL VALUE & TAX SUMMARY', 48, y + 6);
    doc.font('Helvetica').fontSize(8);

    const val = contract.contractValue || contract.taxableAmount || 0;
    const gstRate = contract.gstRate || 18.0;
    const gstAmt = contract.gstAmount || (val * gstRate / 100);
    const total = contract.totalAmount || (val + gstAmt);

    doc.text(`Taxable Value: ${this.formatCurrency(val)}`, 48, y + 24);
    doc.text(`GST (${gstRate}%): ${this.formatCurrency(gstAmt)}`, 220, y + 24);
    doc.text(`Total Contract Amount: ${this.formatCurrency(total)}`, 380, y + 24);

    // Equipment Covered Table
    y = 305;
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('COVERED ASSETS & EQUIPMENT', 40, y);
    y += 14;

    doc.rect(40, y, 515, 18).fillAndStroke('#334155', '#334155');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('ASSET NO / PRODUCT', 45, y + 5);
    doc.text('MODEL / SPECIFICATION', 240, y + 5);
    doc.text('SERIAL NO', 380, y + 5);
    doc.text('LOCATION', 470, y + 5);

    y += 18;
    doc.font('Helvetica').fontSize(7.5);

    const covered = contract.coveredAssets || [];
    if (covered.length === 0) {
      doc.rect(40, y, 515, 18).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#0f172a');
      doc.text(contract.product?.productName || 'AC Equipment', 45, y + 5);
      doc.text(contract.product?.model || 'Split AC', 240, y + 5);
      doc.text('Primary Unit', 380, y + 5);
      doc.text('Customer Facility', 470, y + 5);
      y += 18;
    } else {
      covered.forEach((ca: any, idx: number) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, y, 515, 18).fillAndStroke(bg, '#e2e8f0');
        doc.fillColor('#0f172a');
        doc.text(`${ca.asset?.assetNumber || 'AST'} - ${ca.asset?.product?.productName || ''}`, 45, y + 5, { width: 190, ellipsis: true });
        doc.text(ca.asset?.modelNumber || ca.asset?.capacitySpec || 'Split AC', 240, y + 5);
        doc.text(ca.asset?.serialNumber || '—', 380, y + 5);
        doc.text(ca.asset?.location || 'Main Office', 470, y + 5, { width: 80, ellipsis: true });
        y += 18;
      });
    }

    // Billing Schedules Table
    y += 8;
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('BILLING SCHEDULE & INVOICE TRACKING', 40, y);
    y += 14;

    doc.rect(40, y, 515, 18).fillAndStroke('#334155', '#334155');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('PERIOD', 45, y + 5);
    doc.text('DUE DATE', 180, y + 5);
    doc.text('TAXABLE', 260, y + 5, { align: 'right' });
    doc.text('GST', 340, y + 5, { align: 'right' });
    doc.text('TOTAL', 420, y + 5, { align: 'right' });
    doc.text('STATUS / INVOICE', 470, y + 5);

    y += 18;
    doc.font('Helvetica').fontSize(7.5);

    const schedules = contract.billingSchedules || [];
    if (schedules.length === 0) {
      doc.rect(40, y, 515, 18).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#64748b').text('Annual single invoice generated upon contract execution.', 48, y + 5);
      y += 18;
    } else {
      schedules.forEach((bs: any, idx: number) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, y, 515, 18).fillAndStroke(bg, '#e2e8f0');
        doc.fillColor('#0f172a');
        doc.text(bs.periodLabel || `Period ${bs.billingPeriodNumber}`, 45, y + 5);
        doc.text(bs.dueDate ? new Date(bs.dueDate).toISOString().split('T')[0] : 'N/A', 180, y + 5);
        doc.text(this.formatCurrency(bs.taxableAmount || 0), 220, y + 5, { align: 'right', width: 60 });
        doc.text(this.formatCurrency(bs.gstAmount || 0), 300, y + 5, { align: 'right', width: 60 });
        doc.text(this.formatCurrency(bs.totalAmount || 0), 380, y + 5, { align: 'right', width: 60 });
        doc.text(`${bs.status || 'PENDING'} ${bs.invoice?.invoiceNumber ? `(${bs.invoice.invoiceNumber})` : ''}`, 470, y + 5, { width: 80, ellipsis: true });
        y += 18;
      });
    }

    // Terms & Conditions
    y += 8;
    doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('TERMS & CONDITIONS', 40, y);
    y += 12;

    doc.rect(40, y, 515, 60).stroke('#e2e8f0');
    doc.fillColor('#475569').fontSize(7).font('Helvetica');
    const terms = contract.terms || '1. Preventive maintenance visits will be conducted as per schedule.\n2. Breakdown calls will be attended within 4 hours during business hours.\n3. Spare parts replaced outside comprehensive terms will be billed separately with prior approval.\n4. Payments are due within 15 days of invoice date.';
    doc.text(terms, 48, y + 8, { width: 495, lineGap: 2 });

    // Signatures
    doc.rect(40, 720, 240, 55).stroke('#cbd5e1');
    doc.rect(315, 720, 240, 55).stroke('#cbd5e1');

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
    doc.text('AUTHORISED SIGNATORY (FREEZE TECHNOLOGY)', 48, 726);
    doc.text('CUSTOMER ACCEPTANCE & SIGNATURE', 323, 726);

    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
    doc.text('Freeze Technology Commercial Sales', 48, 762);
    doc.text('Accepted terms and service schedule', 323, 762);

    doc.end();
  }

  generateAmcRenewalPDF(contract: any, resStream: Response): void {
    this.generateAmcContractPDF(contract, resStream);
  }

  generateAmcRevenueReportPDF(contracts: any[], resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(resStream);

    // Border (841.89 x 595.28)
    doc.rect(30, 30, 782, 535).stroke('#1e293b');

    // Header
    doc.fillColor('#2F612F')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('FREEZE TECHNOLOGY — AMC REVENUE & CONTRACT PORTFOLIO REPORT', 45, 45);

    doc.fillColor('#64748b')
      .fontSize(8)
      .font('Helvetica')
      .text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}  |  Total Contracts: ${contracts.length}`, 45, 65);

    doc.fillColor('#0000d0')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Panasonic Service Contracts', 600, 45, { align: 'right' });

    doc.moveTo(30, 80).lineTo(812, 80).stroke('#cbd5e1');

    // Table Header
    let y = 90;
    doc.rect(40, y, 762, 20).fillAndStroke('#1e293b', '#1e293b');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('AMC NO', 45, y + 6);
    doc.text('CUSTOMER', 135, y + 6);
    doc.text('TYPE', 260, y + 6);
    doc.text('PERIOD', 345, y + 6);
    doc.text('CONTRACT VALUE', 455, y + 6, { align: 'right' });
    doc.text('GST (18%)', 545, y + 6, { align: 'right' });
    doc.text('TOTAL AMOUNT', 635, y + 6, { align: 'right' });
    doc.text('STATUS', 735, y + 6);

    y += 20;
    doc.font('Helvetica').fontSize(7);

    let sumTaxable = 0;
    let sumGst = 0;
    let sumTotal = 0;

    contracts.slice(0, 18).forEach((c: any, idx: number) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, y, 762, 20).fillAndStroke(bg, '#e2e8f0');
      doc.fillColor('#0f172a');
      doc.text(c.amcNumber || 'N/A', 45, y + 6);
      doc.text(c.customer?.customerName || 'N/A', 135, y + 6, { width: 120, ellipsis: true });
      doc.text(c.contractType || 'COMPREHENSIVE', 260, y + 6);
      
      const s = c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '';
      const e = c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '';
      doc.text(`${s} to ${e}`, 345, y + 6);

      const val = c.contractValue || c.taxableAmount || 0;
      const gst = c.gstAmount || (val * 0.18);
      const tot = c.totalAmount || (val + gst);

      sumTaxable += val;
      sumGst += gst;
      sumTotal += tot;

      doc.text(this.formatCurrency(val), 430, y + 6, { align: 'right', width: 80 });
      doc.text(this.formatCurrency(gst), 520, y + 6, { align: 'right', width: 80 });
      doc.text(this.formatCurrency(tot), 610, y + 6, { align: 'right', width: 80 });
      doc.text(c.status || 'Active', 735, y + 6);
      y += 20;
    });

    // Summary Footer
    doc.rect(40, 515, 762, 40).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold');
    doc.text(`PORTFOLIO TOTAL: ${contracts.length} Contracts`, 50, 528);
    doc.text(`Taxable: ${this.formatCurrency(sumTaxable)}`, 260, 528);
    doc.text(`GST: ${this.formatCurrency(sumGst)}`, 440, 528);
    doc.text(`Gross Revenue: ${this.formatCurrency(sumTotal)}`, 620, 528);

    doc.end();
  }
}
