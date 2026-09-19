import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class PayablesPdfService {
  private formatCurrency(amount: number): string {
    return `Rs. ${(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  generateVendorBillPDF(bill: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    // Border
    doc.rect(30, 30, 535, 750).stroke('#1e293b');

    // Header
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
      .text('GSTIN: 33BKCPD7319A2ZU  |  OMR, Chennai - 600097', 40, 80);

    // Right Branding
    doc.fillColor('#0000d0')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Panasonic', 380, 45, { align: 'right' });

    doc.fillColor('#475569')
      .fontSize(8)
      .font('Helvetica')
      .text('Authorised Sales & Service', 380, 65, { align: 'right' });

    doc.moveTo(30, 95).lineTo(565, 95).stroke('#cbd5e1');

    // Title Bar
    doc.rect(30, 95, 535, 26).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('ACCOUNTS PAYABLE — VENDOR BILL', 30, 102, {
        align: 'center',
        width: 535,
      });

    // Supplier & Bill Meta
    doc.fillColor('#0f172a');
    doc.fontSize(8).font('Helvetica-Bold').text('Vendor / Supplier:', 45, 130);
    doc.font('Helvetica').text(bill.supplier?.companyName || '-', 140, 130);

    doc.font('Helvetica-Bold').text('Contact Person:', 45, 145);
    doc.font('Helvetica').text(bill.supplier?.contactPerson || '-', 140, 145);

    doc.font('Helvetica-Bold').text('Supplier Phone / Email:', 45, 160);
    doc.font('Helvetica').text(`${bill.supplier?.phone || '-'}  ${bill.supplier?.email ? '| ' + bill.supplier.email : ''}`, 140, 160);

    doc.font('Helvetica-Bold').text('Vendor Invoice No:', 45, 175);
    doc.font('Helvetica').text(bill.vendorInvoiceNumber || '-', 140, 175);

    // Right Side Meta
    doc.font('Helvetica-Bold').text('Bill Reference:', 320, 130);
    doc.font('Helvetica').text(bill.billNumber, 420, 130);

    doc.font('Helvetica-Bold').text('Purchase Order:', 320, 145);
    doc.font('Helvetica').text(bill.purchaseOrder?.poNumber || 'Direct Bill', 420, 145);

    doc.font('Helvetica-Bold').text('Bill Date / Due Date:', 320, 160);
    doc.font('Helvetica').text(
      `${new Date(bill.billDate).toLocaleDateString('en-GB')} / ${new Date(bill.dueDate).toLocaleDateString('en-GB')}`,
      420,
      160,
    );

    doc.font('Helvetica-Bold').text('Payment Status:', 320, 175);
    doc.font('Helvetica-Bold')
      .fillColor(bill.paymentStatus === 'PAID' ? '#166534' : '#b45309')
      .text(bill.paymentStatus, 420, 175);
    doc.fillColor('#0f172a');

    // Table Header
    const tableTop = 205;
    doc.rect(30, tableTop, 535, 20).fillAndStroke('#2F612F', '#2F612F');
    doc.fillColor('#FFFFFF')
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('Item Description', 40, tableTop + 5)
      .text('Qty', 260, tableTop + 5, { width: 35, align: 'center' })
      .text('Unit Price', 305, tableTop + 5, { width: 65, align: 'right' })
      .text('GST Rate', 380, tableTop + 5, { width: 45, align: 'center' })
      .text('Tax (Rs)', 435, tableTop + 5, { width: 55, align: 'right' })
      .text('Total (Rs)', 500, tableTop + 5, { width: 55, align: 'right' });

    let currentY = tableTop + 20;
    (bill.items || []).forEach((item: any, idx: number) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#f8fafc';
      doc.rect(30, currentY, 535, 18).fillAndStroke(bg, '#f1f5f9');

      doc.fillColor('#0f172a').fontSize(8);
      doc.font('Helvetica').text(item.description, 40, currentY + 4, { width: 215, ellipsis: true });
      doc.text(String(item.quantity), 260, currentY + 4, { width: 35, align: 'center' });
      doc.text(this.formatCurrency(item.unitPrice), 305, currentY + 4, { width: 65, align: 'right' });
      doc.text(`${item.taxRate}%`, 380, currentY + 4, { width: 45, align: 'center' });
      doc.text(this.formatCurrency(item.taxAmount), 435, currentY + 4, { width: 55, align: 'right' });
      doc.font('Helvetica-Bold').text(this.formatCurrency(item.lineTotal), 500, currentY + 4, { width: 55, align: 'right' });

      currentY += 18;
    });

    // Summary Box
    currentY += 10;
    doc.rect(320, currentY, 245, 95).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(8);

    doc.font('Helvetica').text('Subtotal:', 330, currentY + 8);
    doc.font('Helvetica-Bold').text(this.formatCurrency(bill.subtotal), 440, currentY + 8, { align: 'right', width: 115 });

    doc.font('Helvetica').text('Tax Amount (GST):', 330, currentY + 22);
    doc.font('Helvetica-Bold').text(this.formatCurrency(bill.taxAmount), 440, currentY + 22, { align: 'right', width: 115 });

    if (bill.discountAmount > 0) {
      doc.font('Helvetica').text('Discount:', 330, currentY + 36);
      doc.font('Helvetica-Bold').text(`- ${this.formatCurrency(bill.discountAmount)}`, 440, currentY + 36, { align: 'right', width: 115 });
    }

    doc.moveTo(320, currentY + 50).lineTo(565, currentY + 50).stroke('#cbd5e1');

    doc.font('Helvetica-Bold').fontSize(9).text('Total Bill Amount:', 330, currentY + 56);
    doc.text(this.formatCurrency(bill.totalAmount), 440, currentY + 56, { align: 'right', width: 115 });

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#166534').text('Paid Amount:', 330, currentY + 70);
    doc.text(this.formatCurrency(bill.paidAmount), 440, currentY + 70, { align: 'right', width: 115 });

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#b91c1c').text('Balance Due:', 330, currentY + 83);
    doc.text(this.formatCurrency(bill.balanceAmount), 440, currentY + 83, { align: 'right', width: 115 });

    // Signatures
    const sigY = 700;
    doc.moveTo(30, sigY - 20).lineTo(565, sigY - 20).stroke('#cbd5e1');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('Prepared By', 80, sigY);
    doc.text('Verified & Approved By', 400, sigY);

    doc.fontSize(7).font('Helvetica').fillColor('#64748b');
    doc.text('Freeze Technology ERP — Accounts Payable Voucher', 30, 755, {
      align: 'center',
      width: 535,
    });

    doc.end();
  }

  generateExpenseVoucherPDF(expense: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    doc.rect(30, 30, 535, 750).stroke('#1e293b');

    // Header
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
      .text('GSTIN: 33BKCPD7319A2ZU  |  OMR, Chennai - 600097', 40, 80);

    doc.moveTo(30, 95).lineTo(565, 95).stroke('#cbd5e1');

    // Title Bar
    doc.rect(30, 95, 535, 26).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('OPERATING EXPENSE VOUCHER', 30, 102, {
        align: 'center',
        width: 535,
      });

    // Details Grid
    doc.fillColor('#0f172a');
    doc.fontSize(8).font('Helvetica-Bold').text('Expense Number:', 45, 135);
    doc.font('Helvetica').text(expense.expenseNumber, 150, 135);

    doc.font('Helvetica-Bold').text('Expense Category:', 45, 155);
    doc.font('Helvetica').text(expense.category?.name || 'General', 150, 155);

    doc.font('Helvetica-Bold').text('Beneficiary / Paid To:', 45, 175);
    doc.font('Helvetica').text(
      expense.supplier?.companyName || expense.employee?.fullName || 'Direct Expense',
      150,
      175,
    );

    doc.font('Helvetica-Bold').text('Expense Date:', 320, 135);
    doc.font('Helvetica').text(new Date(expense.expenseDate).toLocaleDateString('en-GB'), 420, 135);

    doc.font('Helvetica-Bold').text('Approval Status:', 320, 155);
    doc.font('Helvetica-Bold')
      .fillColor(expense.status === 'APPROVED' ? '#166534' : '#0f172a')
      .text(expense.status, 420, 155);
    doc.fillColor('#0f172a');

    doc.font('Helvetica-Bold').text('Payment Status:', 320, 175);
    doc.font('Helvetica-Bold')
      .fillColor(expense.paymentStatus === 'PAID' ? '#166534' : '#b45309')
      .text(expense.paymentStatus, 420, 175);
    doc.fillColor('#0f172a');

    // Description Block
    doc.rect(30, 205, 535, 60).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text('Description / Purpose:', 45, 215);
    doc.font('Helvetica').text(expense.description || '-', 45, 230, { width: 505 });

    // Financial Box
    const finY = 280;
    doc.rect(30, finY, 535, 50).fillAndStroke('#f0fdf4', '#86efac');
    doc.fillColor('#166534').fontSize(11).font('Helvetica-Bold').text('EXPENSE AMOUNT:', 45, finY + 18);
    doc.fontSize(16).text(this.formatCurrency(expense.totalAmount), 350, finY + 14, { align: 'right', width: 200 });

    if (expense.notes) {
      doc.fillColor('#475569').fontSize(8).font('Helvetica').text(`Notes: ${expense.notes}`, 45, finY + 65);
    }

    const sigY = 700;
    doc.moveTo(30, sigY - 20).lineTo(565, sigY - 20).stroke('#cbd5e1');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('Claimed By', 80, sigY);
    doc.text('Authorized Approver', 400, sigY);

    doc.end();
  }

  generatePaymentReceiptPDF(payment: any, resStream: Response): void {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(resStream);

    doc.rect(30, 30, 535, 750).stroke('#1e293b');

    // Header
    doc.fillColor('#2F612F')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('FREEZE TECHNOLOGY', 40, 45);

    doc.fillColor('#334155')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Air Conditioning & Refrigeration Sales & Service', 40, 68);

    doc.moveTo(30, 95).lineTo(565, 95).stroke('#cbd5e1');

    // Title Bar
    doc.rect(30, 95, 535, 26).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('PAYMENT VOUCHER & DISBURSEMENT RECEIPT', 30, 102, {
        align: 'center',
        width: 535,
      });

    doc.fillColor('#0f172a');
    doc.fontSize(8).font('Helvetica-Bold').text('Disbursement Date:', 45, 140);
    doc.font('Helvetica').text(new Date(payment.paymentDate).toLocaleDateString('en-GB'), 150, 140);

    doc.font('Helvetica-Bold').text('Payment Method:', 45, 160);
    doc.font('Helvetica').text(payment.paymentMethod || 'Bank Transfer', 150, 160);

    doc.font('Helvetica-Bold').text('Reference / UTR:', 45, 180);
    doc.font('Helvetica').text(payment.paymentReference || '-', 150, 180);

    doc.font('Helvetica-Bold').text('Allocation Target:', 320, 140);
    doc.font('Helvetica').text(
      payment.vendorBill?.billNumber
        ? `Vendor Bill ${payment.vendorBill.billNumber}`
        : payment.expense?.expenseNumber
          ? `Expense ${payment.expense.expenseNumber}`
          : 'General Payment',
      420,
      140,
    );

    const finY = 220;
    doc.rect(30, finY, 535, 50).fillAndStroke('#f0fdf4', '#86efac');
    doc.fillColor('#166534').fontSize(11).font('Helvetica-Bold').text('DISBURSED AMOUNT:', 45, finY + 18);
    doc.fontSize(16).text(this.formatCurrency(payment.amount), 350, finY + 14, { align: 'right', width: 200 });

    const sigY = 700;
    doc.moveTo(30, sigY - 20).lineTo(565, sigY - 20).stroke('#cbd5e1');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('Accountant Signature', 80, sigY);
    doc.text('Authorized Signatory', 400, sigY);

    doc.end();
  }
}
