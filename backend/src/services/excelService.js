const ExcelJS = require('exceljs');

async function generateSalesExcelReport(invoices, resStream) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Freeze Tech Sales Report');

  worksheet.columns = [
    { header: 'Invoice No', key: 'invoiceNo', width: 20 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Customer Name', key: 'customerName', width: 30 },
    { header: 'GSTIN', key: 'customerGstin', width: 20 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
    { header: 'Payment Method', key: 'paymentMethod', width: 18 },
    { header: 'Grand Total (₹)', key: 'grandTotal', width: 18 }
  ];

  // Header styling
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '2F612F' }
  };

  invoices.forEach(inv => {
    worksheet.addRow({
      invoiceNo: inv.invoiceNo,
      date: inv.date,
      customerName: inv.customerName,
      customerGstin: inv.customerGstin || 'N/A',
      paymentStatus: inv.paymentStatus,
      paymentMethod: inv.paymentMethod || '-',
      grandTotal: inv.grandTotal
    });
  });

  resStream.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  resStream.setHeader('Content-Disposition', 'attachment; filename=FreezeTech_Sales_Report.xlsx');

  await workbook.xlsx.write(resStream);
}

module.exports = { generateSalesExcelReport };
