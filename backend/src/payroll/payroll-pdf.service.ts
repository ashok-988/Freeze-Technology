import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class PayrollPdfService {
  private formatCurrency(amount: number): string {
    return `Rs. ${(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private numberToWords(num: number): string {
    const a = [
      '',
      'One ',
      'Two ',
      'Three ',
      'Four ',
      'Five ',
      'Six ',
      'Seven ',
      'Eight ',
      'Nine ',
      'Ten ',
      'Eleven ',
      'Twelve ',
      'Thirteen ',
      'Fourteen ',
      'Fifteen ',
      'Sixteen ',
      'Seventeen ',
      'Eighteen ',
      'Nineteen ',
    ];
    const b = [
      '',
      '',
      'Twenty',
      'Thirty',
      'Forty',
      'Fifty',
      'Sixty',
      'Seventy',
      'Eighty',
      'Ninety',
    ];

    const n = Math.floor(Math.abs(num));
    if (n === 0) return 'Zero Rupees Only';

    function inWords(nStr: number): string {
      if (nStr < 20) return a[nStr];
      if (nStr < 100) return b[Math.floor(nStr / 10)] + (nStr % 10 !== 0 ? ' ' + a[nStr % 10] : ' ');
      if (nStr < 1000)
        return (
          a[Math.floor(nStr / 100)] +
          'Hundred ' +
          (nStr % 100 !== 0 ? inWords(nStr % 100) : '')
        );
      if (nStr < 100000)
        return (
          inWords(Math.floor(nStr / 1000)) +
          'Thousand ' +
          (nStr % 1000 !== 0 ? inWords(nStr % 1000) : '')
        );
      if (nStr < 10000000)
        return (
          inWords(Math.floor(nStr / 100000)) +
          'Lakh ' +
          (nStr % 100000 !== 0 ? inWords(nStr % 100000) : '')
        );
      return (
        inWords(Math.floor(nStr / 10000000)) +
        'Crore ' +
        (nStr % 10000000 !== 0 ? inWords(nStr % 10000000) : '')
      );
    }

    return `${inWords(n).trim()} Rupees Only`;
  }

  generatePayslipPDF(record: any, period: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    doc.pipe(resStream);

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const monthName = monthNames[(period.month || 1) - 1] || 'Month';

    // Outer Border
    doc.rect(30, 30, 535, 750).stroke('#1e293b');

    // Header Section
    doc.fillColor('#2F612F')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('FREEZE TECHNOLOGY', 40, 45);

    doc.fillColor('#334155')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Air Conditioning & Refrigeration Sales & Service', 40, 68);

    doc.fillColor('#64748b')
      .fontSize(8)
      .font('Helvetica')
      .text('GSTIN: 33BKCPD7319A2ZU  |  Regd. Office: Thoraipakkam, OMR, Chennai - 600097', 40, 80);

    // Right Branding
    doc.fillColor('#0000d0')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Panasonic', 380, 45, { align: 'right' });

    doc.fillColor('#475569')
      .fontSize(8)
      .font('Helvetica')
      .text('Authorised Sales & Service', 380, 65, { align: 'right' });

    // Header dividing line
    doc.moveTo(30, 95).lineTo(565, 95).stroke('#cbd5e1');

    // Title Bar
    doc.rect(30, 95, 535, 26).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`PAYSLIP FOR ${monthName.toUpperCase()} ${period.year}`, 30, 102, {
        align: 'center',
        width: 535,
      });

    // Employee Meta Grid (Left & Right)
    doc.fillColor('#0f172a');

    // Left Column
    doc.fontSize(8).font('Helvetica-Bold').text('Employee Code:', 45, 130);
    doc.font('Helvetica').text(record.employeeCode || '-', 135, 130);

    doc.font('Helvetica-Bold').text('Employee Name:', 45, 145);
    doc.font('Helvetica').text(record.employeeName || '-', 135, 145);

    doc.font('Helvetica-Bold').text('Designation:', 45, 160);
    doc.font('Helvetica').text(record.designation || '-', 135, 160);

    doc.font('Helvetica-Bold').text('Department:', 45, 175);
    doc.font('Helvetica').text(record.department || '-', 135, 175);

    // Right Column
    doc.font('Helvetica-Bold').text('Payroll Ref No:', 320, 130);
    doc.font('Helvetica').text(period.payrollNumber || '-', 410, 130);

    doc.font('Helvetica-Bold').text('Payment Status:', 320, 145);
    doc.font('Helvetica-Bold')
      .fillColor(record.paymentStatus === 'PAID' ? '#166534' : '#b45309')
      .text(record.paymentStatus || 'PENDING', 410, 145);
    doc.fillColor('#0f172a');

    doc.font('Helvetica-Bold').text('Payment Method:', 320, 160);
    doc.font('Helvetica').text(period.paymentMethod || 'Bank Transfer / NEFT', 410, 160);

    doc.font('Helvetica-Bold').text('Generated Date:', 320, 175);
    doc.font('Helvetica').text(new Date().toLocaleDateString('en-IN'), 410, 175);

    // Divider
    doc.moveTo(30, 195).lineTo(565, 195).stroke('#cbd5e1');

    // Attendance Summary Bar
    doc.rect(30, 195, 535, 20).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#1e293b')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('ATTENDANCE SUMMARY', 45, 201);

    const attY = 222;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Total Days:', 45, attY);
    doc.font('Helvetica').text(`${record.workingDays || 26}`, 105, attY);

    doc.font('Helvetica-Bold').text('Present Days:', 140, attY);
    doc.font('Helvetica').text(`${record.presentDays || 0}`, 210, attY);

    doc.font('Helvetica-Bold').text('Paid Leaves:', 245, attY);
    doc.font('Helvetica').text(`${record.leaveDays || 0}`, 305, attY);

    doc.font('Helvetica-Bold').text('Absent (LOP):', 345, attY);
    doc.font('Helvetica').text(`${record.absentDays || 0}`, 415, attY);

    doc.font('Helvetica-Bold').text('Overtime:', 450, attY);
    doc.font('Helvetica').text(`${record.overtimeHours || 0}h`, 505, attY);

    // Divider
    doc.moveTo(30, 240).lineTo(565, 240).stroke('#cbd5e1');

    // Table Header: Earnings vs Deductions
    doc.rect(30, 240, 267.5, 22).fillAndStroke('#2F612F', '#2F612F');
    doc.rect(297.5, 240, 267.5, 22).fillAndStroke('#334155', '#334155');

    doc.fillColor('#FFFFFF')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('EARNINGS & ALLOWANCES', 45, 246)
      .text('AMOUNT (₹)', 210, 246, { align: 'right', width: 75 })
      .text('DEDUCTIONS & RECOVERIES', 310, 246)
      .text('AMOUNT (₹)', 475, 246, { align: 'right', width: 75 });

    // Table Rows
    const rows = [
      {
        earnLabel: 'Basic Salary',
        earnVal: this.formatCurrency(record.basicSalary),
        dedLabel: 'Loss of Pay (LOP)',
        dedVal: this.formatCurrency(record.lossOfPay),
      },
      {
        earnLabel: 'House Rent Allowance (HRA)',
        earnVal: this.formatCurrency(record.hra),
        dedLabel: 'Advance Deduction',
        dedVal: this.formatCurrency(record.advanceDeduction),
      },
      {
        earnLabel: 'Conveyance Allowance',
        earnVal: this.formatCurrency(record.conveyance),
        dedLabel: 'Loan Recovery / EMI',
        dedVal: this.formatCurrency(record.loanDeduction),
      },
      {
        earnLabel: 'Special Allowance',
        earnVal: this.formatCurrency(record.specialAllowance),
        dedLabel: 'Other Deductions',
        dedVal: this.formatCurrency(record.otherDeduction),
      },
      {
        earnLabel: 'Other Allowance',
        earnVal: this.formatCurrency(record.otherAllowance),
        dedLabel: '',
        dedVal: '',
      },
      {
        earnLabel: `Overtime Pay (${record.overtimeHours || 0} hrs)`,
        earnVal: this.formatCurrency(record.overtimeAmount),
        dedLabel: '',
        dedVal: '',
      },
    ];

    let currentY = 265;
    rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#f8fafc';
      doc.rect(30, currentY, 535, 20).fillAndStroke(bg, '#f1f5f9');

      doc.fillColor('#0f172a').fontSize(8);

      // Earnings
      doc.font('Helvetica').text(r.earnLabel, 45, currentY + 5);
      doc.font('Helvetica-Bold').text(r.earnVal, 210, currentY + 5, { align: 'right', width: 75 });

      // Deductions
      if (r.dedLabel) {
        doc.font('Helvetica').text(r.dedLabel, 310, currentY + 5);
        doc.font('Helvetica-Bold').text(r.dedVal, 475, currentY + 5, { align: 'right', width: 75 });
      }

      currentY += 20;
    });

    // Vertical Divider down table
    doc.moveTo(297.5, 240).lineTo(297.5, currentY).stroke('#cbd5e1');

    // Totals Row
    doc.rect(30, currentY, 535, 24).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');

    doc.text('TOTAL GROSS SALARY:', 45, currentY + 6);
    doc.text(this.formatCurrency(record.grossSalary), 210, currentY + 6, { align: 'right', width: 75 });

    doc.text('TOTAL DEDUCTIONS:', 310, currentY + 6);
    doc.text(this.formatCurrency(record.totalDeductions), 475, currentY + 6, { align: 'right', width: 75 });

    currentY += 34;

    // NET TAKE HOME PAY BOX (Highlighted)
    doc.rect(30, currentY, 535, 45).fillAndStroke('#f0fdf4', '#86efac');
    doc.fillColor('#166534')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('NET SALARY PAYABLE (TAKE HOME):', 45, currentY + 10);

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .text(this.formatCurrency(record.netSalary), 380, currentY + 8, {
        align: 'right',
        width: 170,
      });

    doc.fillColor('#334155')
      .fontSize(8)
      .font('Helvetica-Oblique')
      .text(`In Words: ${this.numberToWords(record.netSalary)}`, 45, currentY + 28);

    // Remarks Section
    currentY += 55;
    if (record.remarks || period.remarks) {
      doc.fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#475569')
        .text('Notes / Remarks:', 45, currentY);
      doc.font('Helvetica')
        .text(record.remarks || period.remarks || '-', 125, currentY, { width: 420 });
      currentY += 20;
    }

    // Signatures / Stamp Section
    const sigY = 700;
    doc.moveTo(30, sigY - 20).lineTo(565, sigY - 20).stroke('#cbd5e1');

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('Employee Signature', 80, sigY);
    doc.text('Authorised Signatory', 410, sigY);

    doc.fontSize(7).font('Helvetica').fillColor('#64748b');
    doc.text('This is a system-generated payslip from Freeze Technology ERP.', 30, 755, {
      align: 'center',
      width: 535,
    });

    doc.end();
  }
}
