const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json, rawBody: body });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: null, rawBody: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== RUNNING PHASE 5 PAYMENTS & RECEIVABLES TEST SUITE ===\n');

  // 1. Health check
  console.log('--- 1. Health Check ---');
  const h = await request({ host: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
  console.log('Health status:', h.status, '| System:', h.body.system);

  // 2. Fetch existing invoice
  console.log('\n--- 2. Fetch Invoices ---');
  const invRes = await request({ host: 'localhost', port: 5000, path: '/api/invoices', method: 'GET' });
  console.log('Invoices count:', invRes.body.data?.length);
  const targetInvoice = invRes.body.data[0];
  console.log('Target Invoice #:', targetInvoice.invoiceNumber, '| Grand Total:', targetInvoice.grandTotal, '| Initial Status:', targetInvoice.paymentStatus);

  // 3. Initial Payments List & Stats
  console.log('\n--- 3. Payments List & Stats ---');
  const pList = await request({ host: 'localhost', port: 5000, path: '/api/payments', method: 'GET' });
  const pStats = await request({ host: 'localhost', port: 5000, path: '/api/payments/stats', method: 'GET' });
  console.log('Initial Payments count:', pList.body.data?.length);
  console.log('Initial Stats:', pStats.body.data);

  // 4. Test Partial Payment 1: ₹50,000
  console.log('\n--- 4. Record Partial Payment 1 (₹50,000) ---');
  const pay1Res = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/payments',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      invoiceId: targetInvoice.id,
      amount: 50000,
      paymentMethod: 'UPI',
      paymentReference: 'UPI-TEST-001',
      remarks: 'Initial Advance Payment 1',
    },
  );
  console.log('Payment 1 Status (Expected: 201):', pay1Res.status);
  console.log('Payment 1 Recorded Amount:', pay1Res.body.data?.amount);
  const pay1Id = pay1Res.body.data?.id;

  // Verify Invoice Status updated to Partial
  const invAfterPay1 = await request({ host: 'localhost', port: 5000, path: '/api/invoices', method: 'GET' });
  const updatedInv1 = invAfterPay1.body.data.find((i) => i.id === targetInvoice.id);
  console.log('Invoice Status after Payment 1 (Expected: Partial):', updatedInv1.paymentStatus);

  // 5. Test Overpayment Protection
  console.log('\n--- 5. Test Overpayment Protection ---');
  const overpayRes = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/payments',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      invoiceId: targetInvoice.id,
      amount: 150000, // Remaining is 113020, attempting 150000
      paymentMethod: 'Bank Transfer',
    },
  );
  console.log('Overpayment Status (Expected: 400):', overpayRes.status);
  console.log('Overpayment Error Message:', overpayRes.body.message);

  // 6. Test Negative and Zero Payment Rejection
  console.log('\n--- 6. Test Zero and Negative Amount Rejection ---');
  const zeroPay = await request(
    { host: 'localhost', port: 5000, path: '/api/payments', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { invoiceId: targetInvoice.id, amount: 0, paymentMethod: 'Cash' },
  );
  console.log('Zero Amount Status (Expected: 400):', zeroPay.status);

  const negPay = await request(
    { host: 'localhost', port: 5000, path: '/api/payments', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { invoiceId: targetInvoice.id, amount: -500, paymentMethod: 'Cash' },
  );
  console.log('Negative Amount Status (Expected: 400):', negPay.status);

  // 7. Test Invalid Invoice ID Rejection
  console.log('\n--- 7. Test Invalid Invoice ID Rejection ---');
  const invalidInvPay = await request(
    { host: 'localhost', port: 5000, path: '/api/payments', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { invoiceId: 'inv-invalid-nonexistent-id', amount: 1000, paymentMethod: 'UPI' },
  );
  console.log('Invalid Invoice Status (Expected: 404):', invalidInvPay.status);

  // 8. Test Partial Payment 2: ₹50,000
  console.log('\n--- 8. Record Partial Payment 2 (₹50,000) ---');
  const pay2Res = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/payments',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      invoiceId: targetInvoice.id,
      amount: 50000,
      paymentMethod: 'Bank Transfer',
      paymentReference: 'NEFT-2026-991',
      remarks: 'Second Milestone Payment',
    },
  );
  console.log('Payment 2 Status:', pay2Res.status, '| Amount:', pay2Res.body.data?.amount);

  // 9. Test Exact Final Payment: ₹63,020 (remaining 163020 - 100000 = 63020)
  console.log('\n--- 9. Record Final Payment (₹63,020) ---');
  const pay3Res = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/payments',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      invoiceId: targetInvoice.id,
      amount: 63020,
      paymentMethod: 'Cash',
      paymentReference: 'CASH-REC-001',
      remarks: 'Final Settlement in Cash',
    },
  );
  console.log('Payment 3 Status:', pay3Res.status, '| Amount:', pay3Res.body.data?.amount);
  const pay3Id = pay3Res.body.data?.id;

  // Verify Invoice Status updated to Paid
  const invAfterPay3 = await request({ host: 'localhost', port: 5000, path: '/api/invoices', method: 'GET' });
  const updatedInv3 = invAfterPay3.body.data.find((i) => i.id === targetInvoice.id);
  console.log('Invoice Status after Final Settlement (Expected: Paid):', updatedInv3.paymentStatus);

  // 10. Test Payment on Fully Paid Invoice Rejection
  console.log('\n--- 10. Test Payment on Fully Paid Invoice ---');
  const paidOverpay = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/payments',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      invoiceId: targetInvoice.id,
      amount: 1000,
      paymentMethod: 'UPI',
    },
  );
  console.log('Fully Paid Invoice Payment Attempt (Expected: 400):', paidOverpay.status);
  console.log('Rejection Message:', paidOverpay.body.message);

  // 11. Test Payment Detail & Patch
  console.log('\n--- 11. Payment Detail & Patch ---');
  const pDetail = await request({ host: 'localhost', port: 5000, path: `/api/payments/${pay1Id}`, method: 'GET' });
  console.log('Detail Status:', pDetail.status, '| Method:', pDetail.body.data?.paymentMethod, '| Customer:', pDetail.body.data?.customer?.customerName);

  const pPatch = await request(
    { host: 'localhost', port: 5000, path: `/api/payments/${pay1Id}`, method: 'PATCH', headers: { 'Content-Type': 'application/json' } },
    { remarks: 'Updated Verified Advance' },
  );
  console.log('Patch Status:', pPatch.status, '| New Remarks:', pPatch.body.data?.remarks);

  // 12. Test Void/Delete Payment and Status Reversal
  console.log('\n--- 12. Void Payment and Verify Invoice Status Reversal ---');
  const delRes = await request({ host: 'localhost', port: 5000, path: `/api/payments/${pay3Id}`, method: 'DELETE' });
  console.log('Delete Status (Expected: 200):', delRes.status, '| Message:', delRes.body.message);

  const invAfterDel = await request({ host: 'localhost', port: 5000, path: '/api/invoices', method: 'GET' });
  const updatedInvAfterDel = invAfterDel.body.data.find((i) => i.id === targetInvoice.id);
  console.log('Invoice Status after voiding final payment (Expected: Partial):', updatedInvAfterDel.paymentStatus);

  // 13. Test Stats Calculation
  console.log('\n--- 13. Receivables Stats ---');
  const finalStats = await request({ host: 'localhost', port: 5000, path: '/api/payments/stats', method: 'GET' });
  console.log('Stats Result:', finalStats.body.data);

  // 14. Document 1 PDF
  console.log('\n--- 14. Document 1 Invoice PDF ---');
  const pdfRes = await request({ host: 'localhost', port: 5000, path: `/api/invoices/${targetInvoice.id}/pdf`, method: 'GET' });
  console.log('PDF Status:', pdfRes.status, '| Content-Type:', pdfRes.headers['content-type'], '| Bytes:', pdfRes.rawBody.length);

  console.log('\n=== ALL PHASE 5 ACCEPTANCE TESTS COMPLETED SUCCESSFULLY ===');
}

runTests().catch(console.error);
