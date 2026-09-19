const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateInvoicePDF } = require('../services/pdfService');
const { generateSalesExcelReport } = require('../services/excelService');

// In-memory store initialized with empty arrays
const mockStore = {
  invoices: [],
  customers: [],
  products: [],
  jobCards: []
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
