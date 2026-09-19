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
      let data = '';
      const isPdf = res.headers['content-type'] === 'application/pdf';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (isPdf) {
          resolve({
            status: res.statusCode,
            isPdf: true,
            contentType: res.headers['content-type'],
            length: data.length,
          });
          return;
        }
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body);

// Safe normalizer
const normalizeList = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

async function runTests() {
  console.log('========================================================================');
  console.log('🚀 PHASE 13 — VENDOR BILL DROPDOWNS & CONCURRENT QUERY TEST SUITE 🚀');
  console.log('========================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, label, details = '') {
    if (condition) {
      console.log(`[PASS] ${label}`);
      passed++;
    } else {
      console.error(`[FAIL] ${label} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await get('/health');
    assert(health.status === 200 && health.data?.status === 'UP', '1. Backend Health Check (200 UP)');

    // 2. High-concurrency test: Simulate Payables page simultaneous Promise.allSettled query burst
    console.log('[INFO] Simulating Payables initial page load with 9 concurrent queries...');
    const startTime = Date.now();
    const concurrentResults = await Promise.all([
      get('/payables/stats'),
      get('/payables/bills'),
      get('/payables/expenses'),
      get('/payables/payments'),
      get('/payables/aging'),
      get('/payables/categories'),
      get('/suppliers'),
      get('/purchase-orders'),
      get('/employees'),
    ]);
    const duration = Date.now() - startTime;

    const allSuccessful = concurrentResults.every((r) => r.status === 200);
    assert(
      allSuccessful,
      `2. High-Concurrency Query Burst (All 9 endpoints 200 OK in ${duration}ms, no pool timeout)`,
    );

    // 3. Normalize and verify Suppliers
    const rawSuppliers = concurrentResults[6].data;
    const suppliers = normalizeList(rawSuppliers);
    assert(
      suppliers.length > 0 && suppliers[0].companyName && suppliers[0].supplierCode,
      '3. Supplier Master Discovery & Normalization',
      `Found ${suppliers.length} active suppliers. Sample: "${suppliers[0].companyName}" (${suppliers[0].supplierCode})`,
    );

    // 4. Normalize and verify Purchase Orders
    const rawPOs = concurrentResults[7].data;
    const purchaseOrders = normalizeList(rawPOs);
    assert(
      purchaseOrders.length > 0 && purchaseOrders[0].poNumber,
      '4. Purchase Order Master Discovery & Normalization',
      `Found ${purchaseOrders.length} POs. Sample: "${purchaseOrders[0].poNumber}" (₹${purchaseOrders[0].totalAmount})`,
    );

    // 5. Test Supplier-to-PO Filtering
    const samplePo = purchaseOrders[0];
    const poSupplier = suppliers.find((s) => s.id === samplePo.supplierId) || suppliers[0];
    const supplierPOs = purchaseOrders.filter(
      (po) => po.supplierId === poSupplier.id && po.status !== 'CANCELLED',
    );
    assert(
      supplierPOs.length > 0,
      `5. Supplier-to-PO Dynamic Filtering (Supplier "${poSupplier.companyName}" has ${supplierPOs.length} linked POs)`,
    );

    // 6. Test Create Vendor Bill with Linked PO & Autofilled Line Items
    const linkedPoInvoiceNum = `INV-PO-${Date.now().toString().slice(-6)}`;
    const linkedBillPayload = {
      supplierId: poSupplier.id,
      purchaseOrderId: samplePo.id,
      vendorInvoiceNumber: linkedPoInvoiceNum,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: (samplePo.items && samplePo.items.length > 0)
        ? samplePo.items.map((it) => ({
            productId: it.productId || null,
            description: it.product?.name || it.description || 'Auto-filled PO Item',
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 1000,
            taxRate: Number(it.taxRate) || 18,
          }))
        : [
            {
              description: 'Autofilled Compressor Parts',
              quantity: 2,
              unitPrice: 12000,
              taxRate: 18,
            },
          ],
      notes: `Billed against Purchase Order ${samplePo.poNumber}`,
    };

    const linkedBillRes = await post('/payables/bills', linkedBillPayload);
    assert(
      linkedBillRes.status === 201 &&
        linkedBillRes.data?.data?.billNumber?.startsWith('VB-2026-') &&
        linkedBillRes.data?.data?.purchaseOrderId === samplePo.id,
      '6. Create Vendor Bill with Linked Purchase Order (HTTP 201 & PO Linked)',
      `Bill: ${linkedBillRes.data?.data?.billNumber}`,
    );
    const linkedBillId = linkedBillRes.data?.data?.id;

    // 7. Verify 3-Way Reconciliation on Linked Bill
    const linkedBillDetails = await get(`/payables/bills/${linkedBillId}`);
    assert(
      linkedBillDetails.status === 200 &&
        linkedBillDetails.data?.data?.reconciliation?.poNumber === samplePo.poNumber,
      '7. 3-Way PO Reconciliation Data Verification',
      `Reconciled with PO ${samplePo.poNumber}`,
    );

    // 8. Test Create Direct Vendor Bill (-- Direct Bill / No PO --)
    const directInvoiceNum = `INV-DIR-${Date.now().toString().slice(-6)}`;
    const directBillPayload = {
      supplierId: poSupplier.id,
      purchaseOrderId: '', // No PO selected
      vendorInvoiceNumber: directInvoiceNum,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        {
          description: 'Emergency On-Site Refrigerant Gas R410A Refill Can',
          quantity: 4,
          unitPrice: 3500,
          taxRate: 18,
        },
      ],
      notes: 'Direct supplier purchase without formal PO',
    };

    const directBillRes = await post('/payables/bills', directBillPayload);
    assert(
      directBillRes.status === 201 &&
        directBillRes.data?.data?.billNumber?.startsWith('VB-2026-') &&
        directBillRes.data?.data?.purchaseOrderId === null &&
        directBillRes.data?.data?.totalAmount === 16520,
      '8. Create Direct Vendor Bill without PO (HTTP 201 & null purchaseOrderId)',
      `Bill: ${directBillRes.data?.data?.billNumber}, Total: ₹${directBillRes.data?.data?.totalAmount}`,
    );

    // 9. Full ERP 27-Endpoint Regression Suite
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
      `9. Full ERP Regression Suite (${erpPassed}/${erpEndpoints.length} endpoints 200 OK)`,
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
