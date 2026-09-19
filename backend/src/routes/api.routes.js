const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateInvoicePDF } = require('../services/pdfService');
const { generateSalesExcelReport } = require('../services/excelService');

// Mock in-memory database fallback for seamless server execution
const mockStore = {
  invoices: [
    {
      id: 'INV-2026-0713',
      invoiceNo: 'FT/2026/0713',
      date: '13/07/2026',
      customerName: 'M/s. Mebacare Naturals Salon',
      customerAddress: 'No.25/3 East Mada Street, Thiruvanmiyur, Chennai 600041.',
      customerGstin: '',
      items: [
        { sn: 1, description: 'General checking and air filter cleaning work', qty: 1, gst: '18%', rate: 400, amount: 400.00 },
        { sn: 2, description: 'Water wash work', qty: 4, gst: '18%', rate: 1500, amount: 6000.00 },
        { sn: 3, description: 'Wiring problem', qty: 1, gst: '18%', rate: 600, amount: 600.00 }
      ],
      grandTotal: 7000.00,
      paymentStatus: 'Paid',
      paymentMethod: 'UPI'
    }
  ],
  customers: [
    { id: 'CUST-001', name: 'M/s. Mebacare Naturals Salon', type: 'Commercial', mobile: '9840123456', gstin: '33AAACM1234F1Z5', address: 'No.25/3 East Mada Street, Thiruvanmiyur' }
  ],
  products: [
    { id: 'PROD-001', sku: 'AC-PAN-15T', name: 'Panasonic 1.5 Ton 5 Star Inverter Split AC', category: 'AC', sellingPrice: 42500, stockQuantity: 14 }
  ],
  jobCards: [
    { id: 'JOB-042', jobNumber: 'JC-9042', customerName: 'M/s. Mebacare Naturals Salon', product: 'Panasonic 1.5T AC', complaint: 'Cooling insufficient', technicianName: 'Suresh V', priority: 'High', status: 'In Progress' }
  ]
};

// 1. AUTH ROUTES
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  res.json({
    success: true,
    token: 'mock-jwt-token-freeze-tech-2026',
    user: { id: 'usr-admin-01', fullName: 'Ashok Kumar', email: 'admin@freezetechnology.in', role: 'Admin' }
  });
});

// 2. CUSTOMER ROUTES
router.get('/customers', authenticateToken, (req, res) => {
  res.json({ success: true, data: mockStore.customers });
});

router.post('/customers', authenticateToken, (req, res) => {
  const newCust = { id: 'CUST-' + Date.now(), ...req.body };
  mockStore.customers.unshift(newCust);
  res.status(201).json({ success: true, data: newCust });
});

// 3. PRODUCT & CATALOG ROUTES
router.get('/products', authenticateToken, (req, res) => {
  res.json({ success: true, data: mockStore.products });
});

// 4. INVOICE & BILLING ROUTES
router.get('/invoices', authenticateToken, (req, res) => {
  res.json({ success: true, data: mockStore.invoices });
});

router.post('/invoices', authenticateToken, (req, res) => {
  const newInv = { id: 'INV-' + Date.now(), ...req.body };
  mockStore.invoices.unshift(newInv);
  res.status(201).json({ success: true, data: newInv });
});

// PDF Invoice Generation Endpoint (Document 1 Visual Parity)
router.get('/invoices/:id/pdf', (req, res) => {
  const inv = mockStore.invoices.find(i => i.id === req.params.id) || mockStore.invoices[0];
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=${inv.invoiceNo.replace(/\//g, '_')}.pdf`);
  delete require.cache[require.resolve('../services/pdfService')];
  const { generateInvoicePDF } = require('../services/pdfService');
  generateInvoicePDF(inv, res);
});

// 5. SERVICE & JOB CARD ROUTES
router.get('/jobcards', authenticateToken, (req, res) => {
  res.json({ success: true, data: mockStore.jobCards });
});

// 6. REPORTS & EXCEL EXPORT ROUTES
router.get('/reports/sales/excel', authenticateToken, async (req, res) => {
  await generateSalesExcelReport(mockStore.invoices, res);
});

module.exports = router;
