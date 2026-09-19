const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('FREEZE TECHNOLOGY ERP — PHASE 9 AUTOMATED TEST SUITE');
  console.log('Inventory & Stock Management Vertical Slice');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] Test ${total}: ${testName}`);
    } else {
      console.error(`❌ [FAIL] Test ${total}: ${testName} - ${details}`);
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.data?.status === 'UP', 'Backend Health Check');

    // 2. Initial Inventory Stats
    const statsRes = await request('GET', '/inventory/stats');
    assert(
      statsRes.status === 200 &&
        typeof statsRes.data?.data?.totalSKUs === 'number' &&
        typeof statsRes.data?.data?.totalUnits === 'number' &&
        typeof statsRes.data?.data?.stockValue === 'number',
      'Inventory KPI Stats from PostgreSQL',
      JSON.stringify(statsRes.data)
    );

    // 3. Initial Inventory Listing
    const listRes = await request('GET', '/inventory');
    assert(
      listRes.status === 200 && Array.isArray(listRes.data?.data) && listRes.data?.data?.length > 0,
      'Inventory Listing from Database'
    );
    const testProduct = listRes.data.data[0];
    const initialQty = testProduct.stockQuantity;

    // 4. Product stock baseline verification
    const prodBaseline = await request('GET', `/products/${testProduct.id}`);
    assert(
      prodBaseline.status === 200 &&
        prodBaseline.data?.data?.stockQuantity === initialQty,
      'Product Baseline Stock Verification'
    );

    // 5. Stock Receipt (Inward)
    const receiptQty = 10;
    const receiptRes = await request('POST', '/inventory/receipts', {
      productId: testProduct.id,
      quantity: receiptQty,
      unitCost: testProduct.unitCost || 38000,
      warehouseName: 'Main Warehouse - Thoraipakkam',
      reference: 'PO-2026-TEST-01',
      notes: 'Automated test stock receipt',
    });
    assert(
      receiptRes.status === 201 &&
        receiptRes.data?.success &&
        receiptRes.data?.data?.resultingQuantity === initialQty + receiptQty,
      'Stock Receipt (Inward +10 Units) Atomically Committed'
    );

    // 6. Stock Receipt Persistence & Product Consistency
    const prodAfterReceipt = await request('GET', `/products/${testProduct.id}`);
    const invAfterReceipt = await request('GET', `/inventory/${testProduct.id}`);
    assert(
      prodAfterReceipt.data?.data?.stockQuantity === initialQty + receiptQty &&
        invAfterReceipt.data?.data?.stockQuantity === initialQty + receiptQty,
      'Single Source of Truth Consistency between /api/products and /api/inventory'
    );

    // 7. Stock Issue (Outward)
    const issueQty = 3;
    const issueRes = await request('POST', '/inventory/issues', {
      productId: testProduct.id,
      quantity: issueQty,
      reason: 'Installation',
      reference: 'INST-2026-0001',
      notes: 'Automated test stock issue',
    });
    assert(
      issueRes.status === 201 &&
        issueRes.data?.success &&
        issueRes.data?.data?.resultingQuantity === initialQty + receiptQty - issueQty,
      'Stock Issue (Outward -3 Units) Atomically Committed'
    );

    // 8. Negative Test: Insufficient Stock Rejection
    const negStock = await request('POST', '/inventory/issues', {
      productId: testProduct.id,
      quantity: 999999,
      reason: 'Testing insufficient stock',
    });
    assert(
      negStock.status === 400,
      'Negative Test: Insufficient Stock Request Rejected with HTTP 400'
    );

    // 9. Negative Test: Zero quantity rejection
    const negZero = await request('POST', '/inventory/receipts', {
      productId: testProduct.id,
      quantity: 0,
    });
    assert(
      negZero.status === 400,
      'Negative Test: Zero Quantity Receipt Rejected with HTTP 400'
    );

    // 10. Negative Test: Negative quantity rejection
    const negNegative = await request('POST', '/inventory/receipts', {
      productId: testProduct.id,
      quantity: -5,
    });
    assert(
      negNegative.status === 400,
      'Negative Test: Negative Quantity Receipt Rejected with HTTP 400'
    );

    // 11. Stock Adjustment (Physical Audit)
    const targetAuditQty = 25;
    const adjustRes = await request('POST', '/inventory/adjustments', {
      productId: testProduct.id,
      newQuantity: targetAuditQty,
      reason: 'Physical Stock Audit Verification',
      reference: 'AUDIT-2026-01',
      notes: 'Set to 25 units during physical count',
    });
    assert(
      adjustRes.status === 201 &&
        adjustRes.data?.success &&
        adjustRes.data?.data?.resultingQuantity === targetAuditQty,
      'Physical Stock Adjustment (Set Stock = 25 Units)'
    );

    // 12. Negative Test: Negative Stock Adjustment Rejection
    const negAdjust = await request('POST', '/inventory/adjustments', {
      productId: testProduct.id,
      newQuantity: -10,
      reason: 'Invalid negative test',
    });
    assert(
      negAdjust.status === 400,
      'Negative Test: Negative Stock Adjustment Rejected with HTTP 400'
    );

    // 13. Stock Transfer between Warehouses
    const transferRes = await request('POST', '/inventory/transfers', {
      productId: testProduct.id,
      quantity: 2,
      fromWarehouse: 'Main Warehouse - Thoraipakkam',
      toWarehouse: 'Service Van 1 - Suresh V',
      reference: 'TRF-2026-TEST',
      notes: 'Transfer 2 units for technician van stock',
    });
    assert(
      transferRes.status === 201 && transferRes.data?.success,
      'Stock Transfer between Multi-Warehouse Locations'
    );

    // 14. Negative Test: Same Source & Destination Transfer Rejection
    const negTransfer = await request('POST', '/inventory/transfers', {
      productId: testProduct.id,
      quantity: 2,
      fromWarehouse: 'Main Warehouse - Thoraipakkam',
      toWarehouse: 'Main Warehouse - Thoraipakkam',
    });
    assert(
      negTransfer.status === 400,
      'Negative Test: Same Source & Destination Warehouse Rejected with HTTP 400'
    );

    // 15. Transaction History Retrieval & Filtering
    const txRes = await request('GET', `/inventory/transactions?productId=${testProduct.id}`);
    assert(
      txRes.status === 200 &&
        Array.isArray(txRes.data?.data) &&
        txRes.data?.data?.length >= 4,
      'Retrieve Filtered Stock Movement Audit Ledger'
    );

    // 16. Low Stock Calculation & Filtering
    const lowStockRes = await request('GET', '/inventory/low-stock');
    assert(
      lowStockRes.status === 200 && Array.isArray(lowStockRes.data?.data),
      'Low Stock Items Endpoint (/api/inventory/low-stock)'
    );

    // 17. Server-side Stock Valuation Precision
    const itemDetail = await request('GET', `/inventory/${testProduct.id}`);
    const expectedValuation = Number((targetAuditQty * testProduct.unitCost).toFixed(2));
    assert(
      itemDetail.status === 200 &&
        itemDetail.data?.data?.stockQuantity === targetAuditQty &&
        itemDetail.data?.data?.stockValue === expectedValuation,
      'Server-Side Accurate Stock Valuation Calculation'
    );

    // 18. Installation Integration (Stock Issue with Reference)
    const installIssueRes = await request('POST', '/inventory/issues', {
      productId: testProduct.id,
      quantity: 1,
      reason: 'Installation',
      reference: 'INST-2026-0001',
      notes: 'Equipment consumed for installation job',
    });
    assert(
      installIssueRes.status === 201 &&
        installIssueRes.data?.data?.movement?.referenceType === 'Installation',
      'Phase 8 Installation Material Consumption Integration'
    );

    // 19. Service / JobCard Integration (Stock Issue with Reference)
    const serviceIssueRes = await request('POST', '/inventory/issues', {
      productId: testProduct.id,
      quantity: 1,
      reason: 'Service',
      reference: 'JC-2026-0001',
      notes: 'Spare part/equipment consumed for service visit',
    });
    assert(
      serviceIssueRes.status === 201 &&
        serviceIssueRes.data?.data?.movement?.referenceType === 'Service',
      'Phase 6 Service Job Card Material Consumption Integration'
    );

    // 20. Search & Filter Queries
    const searchRes = await request('GET', `/inventory?search=${testProduct.sku}`);
    assert(
      searchRes.status === 200 &&
        searchRes.data?.data?.some((i) => i.sku === testProduct.sku),
      'Search Inventory by SKU / Product Name'
    );

    const statusRes = await request('GET', '/inventory?status=InStock');
    assert(
      statusRes.status === 200 &&
        statusRes.data?.data?.every((i) => i.status === 'InStock'),
      'Filter Inventory by Status = InStock'
    );

    // 21. Phase 2 Regression (Customers)
    const regCust = await request('GET', '/customers');
    assert(regCust.status === 200 && regCust.data?.data?.length > 0, 'Phase 2 Regression: Customers OK');

    // 22. Phase 3 Regression (Products)
    const regProd = await request('GET', '/products');
    assert(regProd.status === 200 && regProd.data?.data?.length > 0, 'Phase 3 Regression: Products OK');

    // 23. Phase 4 Regression (Quotations)
    const regQuots = await request('GET', '/quotations');
    assert(regQuots.status === 200 && Array.isArray(regQuots.data?.data), 'Phase 4 Regression: Quotations OK');

    // 24. Phase 5 Regression (Payments & Invoices)
    const regInvs = await request('GET', '/invoices');
    const regPays = await request('GET', '/payments');
    assert(
      regInvs.status === 200 && regPays.status === 200,
      'Phase 5 Regression: Invoices & Payments OK'
    );

    // 25. Phase 6 Regression (Services & Job Cards)
    const regSrvs = await request('GET', '/services');
    assert(regSrvs.status === 200 && Array.isArray(regSrvs.data?.data), 'Phase 6 Regression: Services OK');

    // 26. Phase 7 Regression (AMC)
    const regAmc = await request('GET', '/amc');
    assert(regAmc.status === 200 && Array.isArray(regAmc.data?.data), 'Phase 7 Regression: AMC OK');

    // 27. Phase 8 Regression (Installations)
    const regInst = await request('GET', '/installations');
    assert(regInst.status === 200 && Array.isArray(regInst.data?.data), 'Phase 8 Regression: Installations OK');

    console.log(`\n====================================================`);
    console.log(`TEST SUMMARY: Passed ${passed} / ${total} tests`);
    console.log(`====================================================\n`);

    if (passed === total) {
      console.log('🎉 ALL PHASE 9 AUTOMATED API TESTS PASSED SUCCESSFULLY!');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected test error:', err);
    process.exit(1);
  }
}

runTests();
