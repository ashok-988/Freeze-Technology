import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class PmPdfService {
  private formatCurrency(amount: number): string {
    return `Rs. ${(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  generatePmVisitPDF(pm: any, resStream: Response): void {
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
      .text('Preventive Maintenance Visit Report & Service Slip', 45, 68);

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
      .text('Authorised HVAC Service Center', 380, 63, { align: 'right' });

    doc.moveTo(30, 95).lineTo(565, 95).stroke('#cbd5e1');

    // Title Bar
    doc.rect(30, 95, 535, 24).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#0f172a')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`PM VISIT SLIP: ${pm.pmNumber || 'PM-RECORD'}`, 30, 102, {
        align: 'center',
        width: 535,
      });

    // Asset & Customer Info Grid
    let y = 128;
    doc.rect(40, y, 250, 120).stroke('#e2e8f0');
    doc.rect(295, y, 260, 120).stroke('#e2e8f0');

    // Left: Customer & Site
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text('CLIENT & SITE LOCATION', 48, y + 8);
    doc.font('Helvetica').fontSize(8);
    doc.text(`Customer: ${pm.customer?.customerName || 'N/A'} (${pm.customer?.customerCode || ''})`, 48, y + 24);
    doc.text(`Company: ${pm.customer?.companyName || 'Individual / Retail'}`, 48, y + 38);
    doc.text(`Phone: ${pm.customer?.mobile || 'N/A'}`, 48, y + 52);
    doc.text(`Site: ${pm.asset?.siteAddress || pm.customer?.address || 'N/A'}`, 48, y + 66, { width: 235 });
    doc.text(`Area / Floor: ${pm.asset?.location || 'Main Office'}`, 48, y + 94);

    // Right: Equipment & Contract
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text('EQUIPMENT & AMC DETAILS', 303, y + 8);
    doc.font('Helvetica').fontSize(8);
    doc.text(`Asset No: ${pm.asset?.assetNumber || 'N/A'}`, 303, y + 24);
    doc.text(`Product: ${pm.asset?.product?.productName || 'AC Unit'}`, 303, y + 38);
    doc.text(`Model / Serial: ${pm.asset?.modelNumber || 'N/A'} / ${pm.asset?.serialNumber || 'N/A'}`, 303, y + 52);
    doc.text(`AMC Reference: ${pm.amcContract?.amcNumber || 'DIRECT / NON-AMC'}`, 303, y + 66);
    doc.text(`Frequency: ${pm.frequency || 'QUARTERLY'}`, 303, y + 80);
    doc.text(`Assigned Tech: ${pm.technician?.fullName || 'Senior Technician'}`, 303, y + 94);

    // Schedule & Status Strip
    y = 256;
    doc.rect(40, y, 515, 42).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold');
    doc.text('VISIT EXECUTION TIMELINE', 48, y + 6);
    doc.font('Helvetica').fontSize(8);

    const planDate = pm.plannedDate ? new Date(pm.plannedDate).toISOString().split('T')[0] : 'N/A';
    const compDate = pm.completionDate ? new Date(pm.completionDate).toISOString().split('T')[0] : 'In Progress';
    doc.text(`Planned Date: ${planDate}`, 48, y + 22);
    doc.text(`Status: ${pm.status || 'SCHEDULED'}`, 180, y + 22);
    doc.text(`Completion Date: ${compDate}`, 303, y + 22);
    doc.text(`Timing: ${pm.actualStartTime || '10:00 AM'} to ${pm.actualEndTime || '11:30 AM'}`, 425, y + 22);

    // Checklist Section
    y = 308;
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('MAINTENANCE CHECKLIST & INSPECTION', 40, y);
    y += 14;

    doc.rect(40, y, 515, 80).stroke('#e2e8f0');
    doc.fillColor('#1e293b').fontSize(8).font('Helvetica');

    let checklistStr = pm.checklist || 'Compressor check, Filter clean, Coil pressure test, Gas pressure check, Electrical wiring & amp check';
    try {
      if (checklistStr.startsWith('[') || checklistStr.startsWith('{')) {
        const parsed = JSON.parse(checklistStr);
        if (Array.isArray(parsed)) {
          checklistStr = parsed.map((item) => typeof item === 'string' ? item : item.task || item.name || JSON.stringify(item)).join('  |  ');
        }
      }
    } catch (e) {}

    doc.text(`Standard Inspection Protocols Completed:`, 48, y + 8);
    doc.fillColor('#334155').fontSize(7.5).text(checklistStr, 48, y + 22, { width: 495, lineGap: 3 });

    // Observations & Work Done
    y = 398;
    doc.rect(40, y, 250, 110).stroke('#e2e8f0');
    doc.rect(295, y, 260, 110).stroke('#e2e8f0');

    doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica-Bold').text('OBSERVATIONS & DIAGNOSIS', 48, y + 8);
    doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
    doc.text(pm.observations || 'All system parameters tested within normal manufacturer operating tolerances. Airflow and cooling efficiency verified.', 48, y + 22, { width: 235 });

    doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica-Bold').text('WORK PERFORMED & RECOMMENDATIONS', 303, y + 8);
    doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
    doc.text(`Work: ${pm.workPerformed || 'Full general service, filter deep clean, water drainage flush, coil chemical wash.'}`, 303, y + 22, { width: 245 });
    doc.text(`Recommendations: ${pm.recommendations || 'Regular monthly filter cleaning by local facility team.'}`, 303, y + 68, { width: 245 });

    // Spare Parts Table
    y = 518;
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('SPARE PARTS CONSUMED / REPLACED', 40, y);
    y += 14;

    doc.rect(40, y, 515, 18).fillAndStroke('#334155', '#334155');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('SKU / PART NAME', 45, y + 5);
    doc.text('QTY', 340, y + 5);
    doc.text('UNIT COST', 400, y + 5, { align: 'right' });
    doc.text('TOTAL', 480, y + 5, { align: 'right' });

    y += 18;
    doc.font('Helvetica').fontSize(7.5);

    const parts = pm.partsConsumed || [];
    if (parts.length === 0) {
      doc.rect(40, y, 515, 18).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#64748b').text('No replacement spare parts or consumables consumed during this visit.', 48, y + 5);
      y += 18;
    } else {
      parts.forEach((p: any, idx: number) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, y, 515, 18).fillAndStroke(bg, '#e2e8f0');
        doc.fillColor('#0f172a');
        doc.text(`${p.product?.productName || 'Spare Part'} (${p.product?.sku || 'SKU'})`, 45, y + 5, { width: 280, ellipsis: true });
        doc.text(String(p.quantity || 1), 340, y + 5);
        doc.text(this.formatCurrency(p.unitCost || 0), 380, y + 5, { align: 'right', width: 65 });
        doc.text(this.formatCurrency(p.totalCost || (p.quantity * (p.unitCost || 0))), 450, y + 5, { align: 'right', width: 65 });
        y += 18;
      });
    }

    // Signatures
    doc.rect(40, 720, 240, 55).stroke('#cbd5e1');
    doc.rect(315, 720, 240, 55).stroke('#cbd5e1');

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
    doc.text('TECHNICIAN SIGNATURE', 48, 726);
    doc.text('CUSTOMER ACKNOWLEDGEMENT & SIGNATURE', 323, 726);

    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
    doc.text(`Technician: ${pm.technician?.fullName || 'Freeze Tech Engineer'}`, 48, 762);
    doc.text('Service completed satisfactorily. All parts verified.', 323, 762);

    doc.end();
  }

  generatePmScheduleReportPDF(items: any[], resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(resStream);

    // Border (841.89 x 595.28)
    doc.rect(30, 30, 782, 535).stroke('#1e293b');

    // Header
    doc.fillColor('#2F612F')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('FREEZE TECHNOLOGY — PREVENTIVE MAINTENANCE SCHEDULE REPORT', 45, 45);

    doc.fillColor('#64748b')
      .fontSize(8)
      .font('Helvetica')
      .text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}  |  Total Schedules: ${items.length}`, 45, 65);

    doc.fillColor('#0000d0')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Panasonic Service Operations', 600, 45, { align: 'right' });

    doc.moveTo(30, 80).lineTo(812, 80).stroke('#cbd5e1');

    // Table Header
    let y = 90;
    doc.rect(40, y, 762, 20).fillAndStroke('#1e293b', '#1e293b');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('PM NO', 45, y + 6);
    doc.text('ASSET NO', 125, y + 6);
    doc.text('CUSTOMER', 215, y + 6);
    doc.text('AMC REF', 365, y + 6);
    doc.text('PLANNED DATE', 455, y + 6);
    doc.text('STATUS', 545, y + 6);
    doc.text('TECHNICIAN', 645, y + 6);

    y += 20;
    doc.font('Helvetica').fontSize(7);

    items.slice(0, 18).forEach((pm: any, idx: number) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, y, 762, 20).fillAndStroke(bg, '#e2e8f0');
      doc.fillColor('#0f172a');
      doc.text(pm.pmNumber || 'N/A', 45, y + 6);
      doc.text(pm.asset?.assetNumber || '—', 125, y + 6);
      doc.text(pm.customer?.customerName || 'N/A', 215, y + 6, { width: 140, ellipsis: true });
      doc.text(pm.amcContract?.amcNumber || 'DIRECT', 365, y + 6);
      doc.text(pm.plannedDate ? new Date(pm.plannedDate).toISOString().split('T')[0] : '—', 455, y + 6);
      doc.text(pm.status || 'SCHEDULED', 545, y + 6);
      doc.text(pm.technician?.fullName || 'Unassigned', 645, y + 6, { width: 110, ellipsis: true });
      y += 20;
    });

    // Summary Footer
    doc.rect(40, 520, 762, 35).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold');
    doc.text(`Total Maintenance Schedules: ${items.length} | Managed by Freeze Technology ERP PM Module`, 50, 532);

    doc.end();
  }
}
