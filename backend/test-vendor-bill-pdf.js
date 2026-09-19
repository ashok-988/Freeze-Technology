const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (dataString) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }
    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        const contentDisposition = res.headers['content-disposition'] || '';
        const isPdf = contentType.includes('application/pdf') || buf.slice(0, 4).toString('utf-8') === '%PDF';

        if (isPdf) {
          resolve({
            status: res.statusCode,
            isPdf: true,
            contentType,
            contentDisposition,
            bufferLength: buf.length,
            headerMagic: buf.slice(0, 4).toString('utf-8'),
          });
          return;
        }

        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(buf.toString('utf-8')),
            contentType,
          });
        } catch {
          resolve({
            status: res.statusCode,
            raw: buf.toString('utf-8'),
            contentType,
          });
        }
      });
    });
    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

const get = (path) => request('GET', path);

async function runTests() {
  console.log('========================================================================');
  console.log('📄 PHASE 13 — VENDOR BILL PDF DOWNLOAD & INTEGRATION TEST SUITE 📄');
  console.log('========================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, label, details = '') {
    if (condition) {
      console.log(`[PASS] ${label}`);
      if (details) console.log(`       └─ ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${label}`);
      if (details) console.error(`       └─ ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await get('/health');
    assert(health.status === 200 && health.data?.status === 'UP', '1. Backend Health Check (200 UP)');

    // 2. Discover existing bills
    const billsRes = await get('/payables/bills');
    assert(billsRes.status === 200 && Array.isArray(billsRes.data?.data), '2. Fetch Vendor Bills from Database');
    const bills = billsRes.data?.data || [];
    console.log(`[INFO] Found ${bills.length} vendor bills in database.`);

    // 3. Find VB-2026-0006
    const targetBill = bills.find((b) => b.billNumber === 'VB-2026-0006') || bills[0];
    assert(!!targetBill, `3. Target Vendor Bill Located (${targetBill.billNumber})`, `ID: ${targetBill.id}, Supplier: ${targetBill.supplier?.companyName}`);

    // 4. Test PDF Generation for VB-2026-0006 using Database UUID
    const pdfByUuidRes = await get(`/payables/bills/${targetBill.id}/pdf`);
    assert(
      pdfByUuidRes.status === 200 &&
        pdfByUuidRes.contentType.includes('application/pdf') &&
        pdfByUuidRes.headerMagic === '%PDF' &&
        pdfByUuidRes.bufferLength > 1000,
      `4. Download Vendor Bill PDF by UUID (/api/payables/bills/${targetBill.id}/pdf)`,
      `Status: ${pdfByUuidRes.status}, Content-Type: ${pdfByUuidRes.contentType}, Disposition: ${pdfByUuidRes.contentDisposition}, Size: ${pdfByUuidRes.bufferLength} bytes`,
    );

    // 5. Test PDF Generation for VB-2026-0006 using Bill Number
    const pdfByNumRes = await get(`/payables/bills/${targetBill.billNumber}/pdf`);
    assert(
      pdfByNumRes.status === 200 &&
        pdfByNumRes.contentType.includes('application/pdf') &&
        pdfByNumRes.headerMagic === '%PDF',
      `5. Download Vendor Bill PDF by Bill Number (/api/payables/bills/${targetBill.billNumber}/pdf)`,
      `Status: ${pdfByNumRes.status}, Content-Type: ${pdfByNumRes.contentType}, Size: ${pdfByNumRes.bufferLength} bytes`,
    );

    // 6. Test Direct Vendor Bill PDF (Without PO, e.g. VB-2026-0005)
    const directBill = bills.find((b) => !b.purchaseOrderId) || bills[1] || targetBill;
    const directPdfRes = await get(`/payables/bills/${directBill.id}/pdf`);
    assert(
      directPdfRes.status === 200 &&
        directPdfRes.contentType.includes('application/pdf') &&
        directPdfRes.headerMagic === '%PDF',
      `6. Download Direct Vendor Bill PDF without PO (${directBill.billNumber})`,
      `Status: ${directPdfRes.status}, Size: ${directPdfRes.bufferLength} bytes (purchaseOrderId: ${directBill.purchaseOrderId || 'null/direct'})`,
    );

    // 7. Test Operating Expense PDF Voucher
    const expensesRes = await get('/payables/expenses');
    const expenses = expensesRes.data?.data || [];
    if (expenses.length > 0) {
      const sampleExpense = expenses[0];
      const expensePdfRes = await get(`/payables/expenses/${sampleExpense.id}/pdf`);
      assert(
        expensePdfRes.status === 200 &&
          expensePdfRes.contentType.includes('application/pdf') &&
          expensePdfRes.headerMagic === '%PDF',
        `7. Download Operating Expense Voucher PDF (${sampleExpense.expenseNumber})`,
        `Status: ${expensePdfRes.status}, Size: ${expensePdfRes.bufferLength} bytes`,
      );
    } else {
      console.log('[SKIP] 7. Operating Expense Voucher PDF (No expenses in DB)');
    }

    // 8. Test Payment Receipt PDF Voucher
    const paymentsRes = await get('/payables/payments');
    const payments = paymentsRes.data?.data || [];
    if (payments.length > 0) {
      const samplePayment = payments[0];
      const paymentPdfRes = await get(`/payables/payments/${samplePayment.id}/receipt`);
      assert(
        paymentPdfRes.status === 200 &&
          paymentPdfRes.contentType.includes('application/pdf') &&
          paymentPdfRes.headerMagic === '%PDF',
        `8. Download Payment Allocation Receipt PDF (${samplePayment.id.slice(0, 8)})`,
        `Status: ${paymentPdfRes.status}, Size: ${paymentPdfRes.bufferLength} bytes`,
      );
    } else {
      console.log('[SKIP] 8. Payment Receipt PDF (No payments in DB)');
    }

    // 9. Test Non-Existent Bill returns 404 cleanly
    const notFoundRes = await get('/payables/bills/non-existent-id-9999/pdf');
    assert(
      notFoundRes.status === 404,
      '9. Non-existent Bill returns 404 API error without server crash',
      `Status: ${notFoundRes.status}`,
    );

    // 10. Full ERP 27-Endpoint Regression Suite
    console.log('[INFO] Running 27-endpoint ERP regression check...');
    const erpEndpoints = [
      '/customers',
      '/customers/stats',
      '/products',
      '/products/stats',
      '/quotations',
      '/quotations/stats',
      '/payments',
      '/payments/stats',
      '/services',
      '/services/stats',
      '/amc',
      '/amc/stats',
      '/installations',
      '/installations/stats',
      '/inventory',
      '/inventory/stats',
      '/suppliers',
      '/suppliers/stats',
      '/purchase-orders',
      '/purchase-orders/stats',
      '/employees',
      '/employees/stats',
      '/attendance',
      '/attendance/stats',
      '/payroll',
      '/payroll/stats',
      '/payables/stats',
    ];

    let erpPassed = 0;
    for (const ep of erpEndpoints) {
      const res = await get(ep);
      if (res.status >= 200 && res.status < 300) {
        erpPassed++;
      } else {
        console.error(`[ERROR] Endpoint ${ep} failed with ${res.status}`);
      }
    }

    assert(
      erpPassed === erpEndpoints.length,
      `10. Full ERP Regression Suite (${erpPassed}/${erpEndpoints.length} endpoints 200 OK)`,
    );

    console.log('========================================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
