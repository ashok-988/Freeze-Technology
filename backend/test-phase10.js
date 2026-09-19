/**
 * FREEZE TECHNOLOGY ERP — PHASE 10 AUTOMATED TEST SUITE
 * Procurement, Suppliers, Purchase Orders & Inward Stock Receiving Slice
 */

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ [PASS] ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('FREEZE TECHNOLOGY ERP — PHASE 10 AUTOMATED TEST SUITE');
  console.log('Suppliers, Purchase Orders & Stock Intake Vertical Slice');
  console.log('====================================================\n');

  let passed = 0;

  try {
    // 1. Health Check
    const health = await request('/health');
    assert(health.status === 200 && (health.data?.status === 'UP' || health.data?.status === 'ok'), 'Test 1: Backend Health Check');
    passed++;

    // 2. Suppliers Stats & Listing
    const supStats = await request('/suppliers/stats');
    assert(supStats.status === 200 && typeof supStats.data?.totalSuppliers === 'number', 'Test 2: Supplier Stats OK');
    passed++;

    // 3. Create Supplier
    const newSupPayload = {
      companyName: `Daikin Airconditioning India ${Date.now()}`,
      contactPerson: 'Sunil Narang',
      phone: `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `procurement-${Date.now()}@daikin-india.com`,
      gstNumber: '33AAACD1234F1Z5',
      address: 'Ambattur Industrial Estate, 3rd Main Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600058',
    };
    const createSupRes = await request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(newSupPayload),
    });
    assert(createSupRes.status === 201 && createSupRes.data?.supplierCode?.startsWith('SUP-'), 'Test 3: Create Supplier with Auto-Sequence Code');
    const createdSupplier = createSupRes.data;
    passed++;

    // 4. Update Supplier
    const updateSupRes = await request(`/suppliers/${createdSupplier.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ contactPerson: 'Sunil Narang (Senior VP)' }),
    });
    assert(updateSupRes.status === 200 && updateSupRes.data?.contactPerson.includes('Senior VP'), 'Test 4: Update Supplier Details');
    passed++;

    // 5. Fetch Products to use for PO
    const productsRes = await request('/products');
    const productList = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.data || [];
    assert(productsRes.status === 200 && productList.length > 0, 'Test 5: Products Available for PO');
    const targetProduct = productList[0];
    const initialProductStock = targetProduct.stockQuantity || 0;
    passed++;

    // 6. Create Draft Purchase Order with line items
    const poPayload = {
      supplierId: createdSupplier.id,
      notes: 'Urgent order for upcoming commercial installation projects.',
      items: [
        {
          productId: targetProduct.id,
          quantity: 10,
          unitPrice: targetProduct.purchasePrice || 12000,
        },
      ],
    };
    const createPoRes = await request('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(poPayload),
    });
    assert(
      createPoRes.status === 201 &&
      createPoRes.data?.poNumber?.startsWith('PO-') &&
      createPoRes.data?.status === 'Draft' &&
      createPoRes.data?.items?.length === 1,
      'Test 6: Create Draft Purchase Order with Auto-Sequence PO Number',
    );
    const createdPo = createPoRes.data;
    const poItemId = createdPo.items[0].id;
    passed++;

    // 7. Verify Server-side Financial Calculations (Subtotal, GST 18%, Grand Total)
    const expectedSubtotal = 10 * (targetProduct.purchasePrice || 12000);
    const expectedTax = (expectedSubtotal * 18) / 100;
    const expectedTotal = expectedSubtotal + expectedTax;
    assert(
      Math.abs(createdPo.subtotal - expectedSubtotal) < 1 &&
      Math.abs(createdPo.totalAmount - expectedTotal) < 1,
      'Test 7: Server-side Accurate PO Financial Calculations (Subtotal + 18% GST = Total)',
    );
    passed++;

    // 8. Negative Test: Receive stock on Draft PO rejected
    const invalidReceiveDraft = await request(`/purchase-orders/${createdPo.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({
        items: [{ purchaseItemId: poItemId, receivedQuantity: 5 }],
      }),
    });
    assert(invalidReceiveDraft.status === 400, 'Test 8: Negative Test: Cannot Receive Stock on Draft PO (HTTP 400)');
    passed++;

    // 9. Submit PO for Approval
    const submitRes = await request(`/purchase-orders/${createdPo.id}/submit`, {
      method: 'PATCH',
    });
    assert(submitRes.status === 200 && submitRes.data?.status === 'Submitted', 'Test 9: Submit PO for Approval (Draft -> Submitted)');
    passed++;

    // 10. Negative Test: Receive stock on Submitted PO rejected
    const invalidReceiveSubmitted = await request(`/purchase-orders/${createdPo.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({
        items: [{ purchaseItemId: poItemId, receivedQuantity: 5 }],
      }),
    });
    assert(invalidReceiveSubmitted.status === 400, 'Test 10: Negative Test: Cannot Receive Stock on Submitted PO (HTTP 400)');
    passed++;

    // 11. Approve PO
    const approveRes = await request(`/purchase-orders/${createdPo.id}/approve`, {
      method: 'PATCH',
    });
    assert(approveRes.status === 200 && approveRes.data?.status === 'Approved', 'Test 11: Approve PO (Submitted -> Approved)');
    passed++;

    // 12. Negative Test: Receive 0 quantity rejected
    const invalidZeroReceive = await request(`/purchase-orders/${createdPo.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({
        items: [{ purchaseItemId: poItemId, receivedQuantity: 0 }],
      }),
    });
    assert(invalidZeroReceive.status === 400, 'Test 12: Negative Test: Zero Received Quantity Rejected (HTTP 400)');
    passed++;

    // 13. Negative Test: Receive more than ordered quantity rejected (ordered: 10, receiving: 15)
    const invalidOverReceive = await request(`/purchase-orders/${createdPo.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({
        items: [{ purchaseItemId: poItemId, receivedQuantity: 15 }],
      }),
    });
    assert(invalidOverReceive.status === 400, 'Test 13: Negative Test: Over-receiving Beyond PO Quantity Rejected (HTTP 400)');
    passed++;

    // 14. Partial Stock Receiving (Receive 4 of 10 units)
    const partialReceiveRes = await request(`/purchase-orders/${createdPo.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({
        items: [{ purchaseItemId: poItemId, receivedQuantity: 4 }],
        warehouseName: 'Main Warehouse - Thoraipakkam',
        notes: 'First partial batch received via DC-101.',
      }),
    });
    assert(
      partialReceiveRes.status === 201 &&
      partialReceiveRes.data?.purchaseOrder?.status === 'Partially Received' &&
      partialReceiveRes.data?.purchaseOrder?.items[0]?.receivedQuantity === 4,
      'Test 14: Partial Stock Intake (4/10 units received -> PO Status: Partially Received)',
    );
    passed++;

    // 15. Verify Product.stockQuantity increased by 4
    const productAfterPartial = await request(`/products/${targetProduct.id}`);
    const prodPartialData = productAfterPartial.data?.data || productAfterPartial.data;
    assert(
      productAfterPartial.status === 200 &&
      prodPartialData?.stockQuantity === initialProductStock + 4,
      'Test 15: Product.stockQuantity Atomically Increased by 4 units',
    );
    passed++;

    // 16. Verify Single Source of Truth via /api/inventory
    const inventoryAfterPartial = await request(`/inventory/${targetProduct.id}`);
    const invPartialData = inventoryAfterPartial.data?.data || inventoryAfterPartial.data;
    assert(
      inventoryAfterPartial.status === 200 &&
      invPartialData?.stockQuantity === initialProductStock + 4,
      'Test 16: /api/inventory Synchronized and Consistent with Product Stock',
    );
    passed++;

    // 17. Verify StockMovement Logged for Partial Intake
    const movementsRes = await request('/inventory/transactions');
    const movementsList = Array.isArray(movementsRes.data) ? movementsRes.data : movementsRes.data?.data || [];
    const recentMovement = movementsList.find(
      (m) => m.referenceType === 'Purchase' && m.referenceId === createdPo.poNumber,
    );
    assert(
      recentMovement &&
      recentMovement.movementType === 'IN' &&
      recentMovement.quantity === 4,
      'Test 17: Auditable StockMovement (IN, Purchase) Created in Transaction Ledger',
    );
    passed++;

    // 18. Full Remaining Stock Receiving (Receive remaining 6 of 10 units)
    const fullReceiveRes = await request(`/purchase-orders/${createdPo.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({
        items: [{ purchaseItemId: poItemId, receivedQuantity: 6 }],
        warehouseName: 'Main Warehouse - Thoraipakkam',
        notes: 'Final batch received via DC-102.',
      }),
    });
    assert(
      fullReceiveRes.status === 201 &&
      fullReceiveRes.data?.purchaseOrder?.status === 'Received' &&
      fullReceiveRes.data?.purchaseOrder?.items[0]?.receivedQuantity === 10,
      'Test 18: Full Remaining Stock Intake (6/6 units -> PO Status: Received)',
    );
    passed++;

    // 19. Verify Final Product.stockQuantity
    const productAfterFull = await request(`/products/${targetProduct.id}`);
    const prodFullData = productAfterFull.data?.data || productAfterFull.data;
    assert(
      productAfterFull.status === 200 &&
      prodFullData?.stockQuantity === initialProductStock + 10,
      'Test 19: Product.stockQuantity Correctly Reflects Full +10 Units',
    );
    passed++;

    // 20. PO Stats Update Verification
    const poStatsFinal = await request('/purchase-orders/stats');
    assert(
      poStatsFinal.status === 200 &&
      poStatsFinal.data?.receivedPOs >= 1 &&
      poStatsFinal.data?.totalSpend >= expectedTotal,
      'Test 20: Purchase Order Stats Reflected Real-time in PostgreSQL',
    );
    passed++;

    // 21. Search Purchase Orders by PO Number
    const searchPoRes = await request(`/purchase-orders?search=${createdPo.poNumber}`);
    const searchPoList = Array.isArray(searchPoRes.data) ? searchPoRes.data : searchPoRes.data?.data || [];
    assert(
      searchPoRes.status === 200 &&
      searchPoList.some((p) => p.poNumber === createdPo.poNumber),
      'Test 21: Search Purchase Orders by PO Number',
    );
    passed++;

    // 22. Filter Purchase Orders by Status
    const filterPoRes = await request('/purchase-orders?status=Received');
    const filterPoList = Array.isArray(filterPoRes.data) ? filterPoRes.data : filterPoRes.data?.data || [];
    assert(
      filterPoRes.status === 200 &&
      filterPoList.every((p) => p.status === 'Received'),
      'Test 22: Filter Purchase Orders by Status = Received',
    );
    passed++;

    // 23. Phase 2 Regression: Customers Module OK
    const custRes = await request('/customers');
    assert(custRes.status === 200 && (Array.isArray(custRes.data) || Array.isArray(custRes.data?.data)), 'Test 23: Phase 2 Regression: Customers OK');
    passed++;

    // 24. Phase 3 Regression: Products Module OK
    const prodRes = await request('/products');
    assert(prodRes.status === 200 && (Array.isArray(prodRes.data) || Array.isArray(prodRes.data?.data)), 'Test 24: Phase 3 Regression: Products OK');
    passed++;

    // 25. Phase 4 Regression: Quotations Module OK
    const quotRes = await request('/quotations');
    assert(quotRes.status === 200 && (Array.isArray(quotRes.data) || Array.isArray(quotRes.data?.data)), 'Test 25: Phase 4 Regression: Quotations OK');
    passed++;

    // 26. Phase 5 Regression: Payments Module OK
    const payRes = await request('/payments');
    assert(payRes.status === 200 && (Array.isArray(payRes.data) || Array.isArray(payRes.data?.data)), 'Test 26: Phase 5 Regression: Payments OK');
    passed++;

    // 27. Phase 6 Regression: Services Module OK
    const srvRes = await request('/services');
    assert(srvRes.status === 200 && (Array.isArray(srvRes.data) || Array.isArray(srvRes.data?.data)), 'Test 27: Phase 6 Regression: Services OK');
    passed++;

    // 28. Phase 7 Regression: AMC Module OK
    const amcRes = await request('/amc');
    assert(amcRes.status === 200 && (Array.isArray(amcRes.data) || Array.isArray(amcRes.data?.data)), 'Test 28: Phase 7 Regression: AMC OK');
    passed++;

    // 29. Phase 8 Regression: Installations Module OK
    const instRes = await request('/installations');
    const instList = Array.isArray(instRes.data) ? instRes.data : instRes.data?.data || [];
    assert(instRes.status === 200 && Array.isArray(instList), 'Test 29: Phase 8 Regression: Installations OK');
    passed++;

    // 30. Phase 9 Regression: Inventory Module OK
    const invRes = await request('/inventory');
    assert(invRes.status === 200 && (Array.isArray(invRes.data) || Array.isArray(invRes.data?.data)), 'Test 30: Phase 9 Regression: Inventory OK');
    passed++;

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: Passed ${passed} / 30 tests`);
    console.log('====================================================\n');
    console.log('🎉 ALL PHASE 10 AUTOMATED API TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ Test Suite Failed with error:', error.message);
    process.exit(1);
  }
}

runTests();
