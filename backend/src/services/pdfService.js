const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function generateInvoicePDF(invoiceData, resStream) {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });

  doc.pipe(resStream);

  // Outer Border Box (Document 1 Parity)
  doc.rect(30, 30, 535, 750).stroke('#000000');

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
    path.join(__dirname, '../../../frontend/public/Logo.png'),
    path.join(__dirname, '../../../../frontend/public/Logo.png'),
  ];

  let logoPath = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      logoPath = p;
      break;
    }
  }

  // Embed Brand Logo (Document 1 Exact Layout)
  if (logoPath) {
    try {
      doc.image(logoPath, 42, 40, { width: 50, height: 50 });
    } catch (err) {
      // Continue gracefully if image rendering fails
    }
  }

  const textStartX = logoPath ? 98 : 42;

  // Header Section - Left Brand Details
  doc.fillColor('#2F612F')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text('FREEZE TECHNOLOGY', textStartX, 42, { underline: true });

  doc.fillColor('#333333')
     .fontSize(8.5)
     .font('Helvetica-Bold')
     .text('Air Conditioning & Refrigeration Sales & Service', textStartX, 64);

  doc.fillColor('#000000')
     .fontSize(8)
     .font('Helvetica-Bold')
     .text('GSTIN: 33BKCPD7319A2ZU', textStartX, 77);

  // Panasonic Right Logo/Tagline (Aligned within outer box with 15pt right margin)
  doc.fillColor('#0000d0')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text('Panasonic', 365, 42, { width: 185, align: 'right' });

  doc.fillColor('#000000')
     .fontSize(8.5)
     .font('Helvetica-Bold')
     .text('Authorised Sales & Service', 365, 65, { width: 185, align: 'right' });

  // INVOICE Bar
  doc.rect(30, 100, 535, 22).fillAndStroke('#FFFFFF', '#000000');
  doc.fillColor('#000000')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('INVOICE', 30, 106, { align: 'center', width: 535 });

  // To & Meta Box Grid
  doc.lineCap('butt')
     .moveTo(300, 122)
     .lineTo(300, 210)
     .stroke('#000000');

  doc.moveTo(30, 210)
     .lineTo(565, 210)
     .stroke('#000000');

  // Customer Address Left
  doc.fontSize(9).font('Helvetica-Bold').text('To:', 40, 130);
  doc.fontSize(9).font('Helvetica-Bold').text(invoiceData.customerName || 'M/s. Mebacare Naturals Salon', 65, 130);
  doc.fontSize(8).font('Helvetica').text(invoiceData.customerAddress || 'No.25/3 East Mada Street,\nThiruvanmiyur, Chennai 600041.', 65, 145);

  // Invoice Meta Right
  doc.fontSize(9).font('Helvetica-Bold').text('Invoice No   :', 310, 130);
  doc.font('Helvetica').text(invoiceData.invoiceNo || 'FT/2026/0713', 380, 130);

  doc.font('Helvetica-Bold').text('Date            :', 310, 145);
  doc.font('Helvetica').text(invoiceData.date || '13/07/2026', 380, 145);

  doc.font('Helvetica-Bold').text('Customer GSTIN :', 310, 160);
  doc.font('Helvetica').text(invoiceData.customerGstin || '', 400, 160);

  // Table Headers
  const tableTop = 210;
  doc.rect(30, tableTop, 535, 20).stroke('#000000');
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('S.N.', 35, tableTop + 6, { width: 30, align: 'center' });
  doc.text('Description', 70, tableTop + 6, { width: 250, align: 'left' });
  doc.text('Qty', 320, tableTop + 6, { width: 40, align: 'center' });
  doc.text('GST', 370, tableTop + 6, { width: 40, align: 'center' });
  doc.text('Rate', 420, tableTop + 6, { width: 60, align: 'right' });
  doc.text('Amount', 490, tableTop + 6, { width: 65, align: 'right' });

  // Table Rows
  let y = tableTop + 20;
  const items = invoiceData.items || [
    { sn: 1, description: 'General checking and air filter cleaning work', qty: 1, gst: '18%', rate: 400, amount: 400.00 },
    { sn: 2, description: 'Water wash work', qty: 4, gst: '18%', rate: 1500, amount: 6000.00 },
    { sn: 3, description: 'Wiring problem', qty: 1, gst: '18%', rate: 600, amount: 600.00 }
  ];

  items.forEach(item => {
    doc.rect(30, y, 535, 22).stroke('#000000');
    doc.fontSize(8.5).font('Helvetica');
    doc.text(item.sn.toString(), 35, y + 6, { width: 30, align: 'center' });
    doc.text(item.description, 70, y + 6, { width: 250 });
    doc.text(item.qty.toString(), 320, y + 6, { width: 40, align: 'center' });
    doc.text(item.gst, 370, y + 6, { width: 40, align: 'center' });
    doc.text(item.rate.toLocaleString('en-IN'), 420, y + 6, { width: 60, align: 'right' });
    doc.text(item.amount.toFixed(2), 490, y + 6, { width: 65, align: 'right' });
    y += 22;
  });

  // GST 18% Extra & Grand Total Row
  doc.rect(30, y, 535, 22).stroke('#000000');
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('GST 18% EXTRA', 200, y + 6);
  doc.text('Grand Total', 410, y + 6);
  doc.text((invoiceData.grandTotal || 7000.00).toFixed(2), 490, y + 6, { width: 65, align: 'right' });

  y += 40;

  // Bank Details Left & Signatory Right
  doc.fontSize(9).font('Helvetica-Bold').text('Bank Name   :', 40, y);
  doc.font('Helvetica').text('Axis Bank', 110, y);

  doc.font('Helvetica-Bold').text('Branch         :', 40, y + 14);
  doc.font('Helvetica').text('Thoraipakkam', 110, y + 14);

  doc.font('Helvetica-Bold').text('Account No :', 40, y + 28);
  doc.font('Helvetica').text('915020010100166', 110, y + 28);

  doc.font('Helvetica-Bold').text('IFSC Code   :', 40, y + 42);
  doc.font('Helvetica').text('UTIB0001566', 110, y + 42);

  // Signatory (Aligned within outer box with 15pt right margin)
  doc.fillColor('#2F612F')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('For FREEZE TECHNOLOGY', 350, y, { width: 200, align: 'right' });

  doc.fillColor('#000000')
     .fontSize(8)
     .font('Helvetica')
     .text('Authorised Signatory', 350, y + 45, { width: 200, align: 'right' });

  // Regd Footer
  doc.fontSize(7.5).font('Helvetica').fillColor('#444444');
  doc.text('Regd Office: C15, 1st Cross Street, PTC Quarters, Thoraipakkam, OMR, Chennai - 600 097.', 30, 755, { align: 'center', width: 535 });
  doc.text('Phone No: 044-35723836, Cell: 9884955011, Email: freezetechnology.ft@gmail.com', 30, 765, { align: 'center', width: 535 });

  doc.end();
}

module.exports = { generateInvoicePDF };
