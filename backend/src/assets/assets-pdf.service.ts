import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class AssetsPdfService {
  private formatCurrency(amount: number): string {
    return `Rs. ${(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  generateAssetCardPDF(asset: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    // Outer Border
    doc.rect(30, 30, 535, 760).stroke('#1e293b');

    // Header
    doc.fillColor('#2F612F')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('FREEZE TECHNOLOGY', 45, 45);

    doc.fillColor('#334155')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Installed Asset Card & Service Lifecycle Ledger', 45, 68);

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
      .text('Authorised Sales & Service Partner', 380, 63, { align: 'right' });

    doc.moveTo(30, 95).lineTo(565, 95).stroke('#cbd5e1');

    // Title Bar
    doc.rect(30, 95, 535, 24).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#0f172a')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`ASSET IDENTIFICATION: ${asset.assetNumber || 'N/A'}`, 30, 102, {
        align: 'center',
        width: 535,
      });

    // Asset & Customer Info Grid
    let y = 128;
    doc.rect(40, y, 250, 120).stroke('#e2e8f0');
    doc.rect(295, y, 260, 120).stroke('#e2e8f0');

    // Left: Asset details
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text('EQUIPMENT SPECIFICATIONS', 48, y + 8);
    doc.font('Helvetica').fontSize(8);
    doc.text(`Product: ${asset.product?.productName || 'N/A'}`, 48, y + 24);
    doc.text(`Brand / Model: ${asset.brandName || asset.product?.brand?.brandName || 'N/A'} / ${asset.modelNumber || asset.product?.model || 'N/A'}`, 48, y + 38);
    doc.text(`Serial Number: ${asset.serialNumber || 'N/A'}`, 48, y + 52);
    doc.text(`Capacity / Type: ${asset.capacitySpec || 'N/A'}`, 48, y + 66);
    doc.text(`Asset Status: ${asset.status || 'ACTIVE'}`, 48, y + 80);
    doc.text(`Installation Date: ${asset.installationDate ? new Date(asset.installationDate).toISOString().split('T')[0] : 'N/A'}`, 48, y + 94);

    // Right: Customer & Location
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text('CUSTOMER & LOCATION', 303, y + 8);
    doc.font('Helvetica').fontSize(8);
    doc.text(`Customer: ${asset.customer?.customerName || 'N/A'} (${asset.customer?.customerCode || ''})`, 303, y + 24);
    doc.text(`Company: ${asset.customer?.companyName || 'Individual / Retail'}`, 303, y + 38);
    doc.text(`Contact: ${asset.customer?.mobile || 'N/A'} | ${asset.customer?.email || 'N/A'}`, 303, y + 52);
    doc.text(`Site Address: ${asset.siteAddress || asset.customer?.address || 'N/A'}`, 303, y + 66, { width: 245 });
    doc.text(`Floor / Area: ${asset.location || asset.floorArea || 'Main Facility'}`, 303, y + 94);

    // Warranty & AMC Summary Strip
    y = 256;
    doc.rect(40, y, 515, 52).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold');
    doc.text('WARRANTY & AMC COVERAGE', 48, y + 6);
    doc.font('Helvetica').fontSize(8);
    
    const wStart = asset.warrantyStartDate ? new Date(asset.warrantyStartDate).toISOString().split('T')[0] : 'N/A';
    const wEnd = asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : 'N/A';
    doc.text(`Warranty Period: ${wStart} to ${wEnd}`, 48, y + 20);
    doc.text(`AMC Coverage: ${asset.amcStatus || 'NONE'}`, 48, y + 34);

    const techName = asset.technician?.fullName || 'Assigned on Dispatch';
    doc.text(`Assigned Technician: ${techName}`, 303, y + 20);
    const nextService = asset.nextServiceDate ? new Date(asset.nextServiceDate).toISOString().split('T')[0] : 'Scheduled by AMC';
    doc.text(`Next Service Due: ${nextService}`, 303, y + 34);

    // Service History Table
    y = 318;
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('SERVICE & BREAKDOWN HISTORY', 40, y);
    y += 14;

    doc.rect(40, y, 515, 18).fillAndStroke('#334155', '#334155');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('DATE', 45, y + 5);
    doc.text('TYPE', 105, y + 5);
    doc.text('JOB / REF', 180, y + 5);
    doc.text('DIAGNOSIS / WORK DONE', 260, y + 5);
    doc.text('TECHNICIAN', 450, y + 5);
    doc.text('COST', 515, y + 5, { align: 'right' });

    y += 18;
    doc.font('Helvetica').fontSize(7.5);

    const historyItems = asset.serviceHistories || [];
    if (historyItems.length === 0) {
      doc.rect(40, y, 515, 18).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#64748b').text('No service or breakdown incidents recorded for this equipment.', 48, y + 5);
      y += 18;
    } else {
      historyItems.slice(0, 8).forEach((item: any, idx: number) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, y, 515, 18).fillAndStroke(bg, '#e2e8f0');
        doc.fillColor('#0f172a');
        doc.text(item.serviceDate ? new Date(item.serviceDate).toISOString().split('T')[0] : 'N/A', 45, y + 5);
        doc.text(item.serviceType || 'PREVENTIVE', 105, y + 5);
        doc.text(item.jobCard?.jobNumber || 'DIRECT', 180, y + 5);
        doc.text(item.workDone || item.resolution || item.complaint || 'Standard Check', 260, y + 5, { width: 180, ellipsis: true });
        doc.text(item.technician?.fullName || 'Technician', 450, y + 5, { width: 60, ellipsis: true });
        doc.text(this.formatCurrency(item.cost || 0), 485, y + 5, { align: 'right', width: 65 });
        y += 18;
      });
    }

    // Preventive Maintenance Schedule Table
    y += 10;
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('PREVENTIVE MAINTENANCE SCHEDULES', 40, y);
    y += 14;

    doc.rect(40, y, 515, 18).fillAndStroke('#334155', '#334155');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('PM NUMBER', 45, y + 5);
    doc.text('FREQUENCY', 130, y + 5);
    doc.text('PLANNED DATE', 210, y + 5);
    doc.text('STATUS', 300, y + 5);
    doc.text('COMPLETED DATE', 380, y + 5);
    doc.text('TECHNICIAN', 470, y + 5);

    y += 18;
    doc.font('Helvetica').fontSize(7.5);

    const pmItems = asset.pmSchedules || [];
    if (pmItems.length === 0) {
      doc.rect(40, y, 515, 18).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#64748b').text('No preventive maintenance schedules assigned.', 48, y + 5);
      y += 18;
    } else {
      pmItems.slice(0, 6).forEach((pm: any, idx: number) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, y, 515, 18).fillAndStroke(bg, '#e2e8f0');
        doc.fillColor('#0f172a');
        doc.text(pm.pmNumber || 'PM-N/A', 45, y + 5);
        doc.text(pm.frequency || 'QUARTERLY', 130, y + 5);
        doc.text(pm.plannedDate ? new Date(pm.plannedDate).toISOString().split('T')[0] : 'N/A', 210, y + 5);
        doc.text(pm.status || 'SCHEDULED', 300, y + 5);
        doc.text(pm.completionDate ? new Date(pm.completionDate).toISOString().split('T')[0] : '—', 380, y + 5);
        doc.text(pm.technician?.fullName || 'Unassigned', 470, y + 5, { width: 80, ellipsis: true });
        y += 18;
      });
    }

    // Signatures / Footer
    doc.rect(40, 720, 240, 55).stroke('#cbd5e1');
    doc.rect(315, 720, 240, 55).stroke('#cbd5e1');

    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
    doc.text('SERVICE SUPERVISOR SIGNATURE', 48, 726);
    doc.text('CUSTOMER VERIFICATION / STAMP', 323, 726);

    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
    doc.text('Freeze Technology Operations Support', 48, 762);
    doc.text('Equipment Received & Serviced in Good Order', 323, 762);

    doc.end();
  }

  generateAssetRegisterPDF(assets: any[], resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(resStream);

    // Outer Border (Landscape: 841.89 x 595.28)
    doc.rect(30, 30, 782, 535).stroke('#1e293b');

    // Header
    doc.fillColor('#2F612F')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('FREEZE TECHNOLOGY — INSTALLED ASSET REGISTER', 45, 45);

    doc.fillColor('#64748b')
      .fontSize(8)
      .font('Helvetica')
      .text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}  |  Total Equipment: ${assets.length}`, 45, 65);

    doc.fillColor('#0000d0')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Panasonic Authorised Partner', 600, 45, { align: 'right' });

    doc.moveTo(30, 80).lineTo(812, 80).stroke('#cbd5e1');

    // Table Header
    let y = 90;
    doc.rect(40, y, 762, 20).fillAndStroke('#1e293b', '#1e293b');
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
    doc.text('ASSET NO', 45, y + 6);
    doc.text('CUSTOMER', 125, y + 6);
    doc.text('PRODUCT / MODEL', 245, y + 6);
    doc.text('SERIAL NO', 385, y + 6);
    doc.text('INSTALL DATE', 480, y + 6);
    doc.text('WARRANTY END', 555, y + 6);
    doc.text('AMC STATUS', 635, y + 6);
    doc.text('STATUS', 715, y + 6);

    y += 20;
    doc.font('Helvetica').fontSize(7);

    assets.slice(0, 18).forEach((ast: any, idx: number) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, y, 762, 20).fillAndStroke(bg, '#e2e8f0');
      doc.fillColor('#0f172a');
      doc.text(ast.assetNumber || 'N/A', 45, y + 6);
      doc.text(ast.customer?.customerName || 'N/A', 125, y + 6, { width: 115, ellipsis: true });
      doc.text(`${ast.product?.productName || ''} (${ast.modelNumber || ast.product?.model || 'N/A'})`, 245, y + 6, { width: 135, ellipsis: true });
      doc.text(ast.serialNumber || '—', 385, y + 6, { width: 90, ellipsis: true });
      doc.text(ast.installationDate ? new Date(ast.installationDate).toISOString().split('T')[0] : '—', 480, y + 6);
      doc.text(ast.warrantyEndDate ? new Date(ast.warrantyEndDate).toISOString().split('T')[0] : '—', 555, y + 6);
      doc.text(ast.amcStatus || 'NONE', 635, y + 6);
      doc.text(ast.status || 'ACTIVE', 715, y + 6);
      y += 20;
    });

    // Summary Footer
    doc.rect(40, 520, 762, 35).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold');
    doc.text(`Register Records: ${assets.length} items | Certified by Freeze Technology Asset Management Module`, 50, 532);

    doc.end();
  }
}
