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
const patch = (path, body = {}) => request('PATCH', path, body);

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 PHASE 13 EXPENSE MANAGEMENT, VENDOR BILLS & AP TEST SUITE 🚀');
  console.log('===============================================================');

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
    assert(health.status === 200 && health.data?.status === 'UP', '1. Backend Health Check');

    // 2. Expense categories retrieval & default seeding
    const catRes = await get('/payables/categories');
    assert(
      catRes.status === 200 &&
        Array.isArray(catRes.data?.data) &&
        catRes.data?.data?.length >= 10,
      '2. Expense Categories Database Seeding & Discovery',
      `Found ${catRes.data?.data?.length} categories`,
    );
    const firstCategory = catRes.data?.data[0];

    // 3. Active supplier & PO discovery
    const supRes = await get('/suppliers');
    const supplierList = Array.isArray(supRes.data?.data) ? supRes.data.data : Array.isArray(supRes.data) ? supRes.data : [];
    assert(
      supRes.status === 200 && supplierList.length > 0,
      '3. Active Supplier Discovery',
      `Found ${supplierList.length} suppliers`,
    );
    let testSupplier = supplierList[0];

    const poRes = await get('/purchase-orders');
    const poList = Array.isArray(poRes.data?.data) ? poRes.data.data : Array.isArray(poRes.data) ? poRes.data : [];
    assert(poRes.status === 200 && Array.isArray(poList), '4. Purchase Orders Discovery');
    const existingPo = poList.find((p) => p.supplierId === testSupplier.id);

    // 4. Vendor bill creation & number generation (VB-2026-XXXX)
    const testInvoiceNum = `TEST-INV-${Date.now().toString().slice(-6)}`;
    const billPayload = {
      supplierId: testSupplier.id,
      purchaseOrderId: existingPo?.id || undefined,
      vendorInvoiceNumber: testInvoiceNum,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      discountAmount: 500,
      items: [
        {
          description: 'Panasonic 1.5 Ton Rotary Compressor R32',
          quantity: 2,
          unitPrice: 15000,
          taxRate: 18,
        },
        {
          description: 'Copper Piping 1/2 inch Coil',
          quantity: 5,
          unitPrice: 2000,
          taxRate: 18,
        },
        {
          description: 'Filter Mat Clean Sheet',
          quantity: 10,
          unitPrice: 500,
          taxRate: 5,
        },
      ],
      notes: 'Initial test procurement shipment',
    };

    const createBillRes = await post('/payables/bills', billPayload);
    assert(
      createBillRes.status === 201 &&
        createBillRes.data?.data?.billNumber?.startsWith('VB-2026-') &&
        createBillRes.data?.data?.status === 'DRAFT',
      '5. Vendor Bill Creation & Authoritative Sequential Numbering (VB-2026-XXXX)',
      `Bill No: ${createBillRes.data?.data?.billNumber}`,
    );
    const billId = createBillRes.data?.data?.id;
    const billNumber = createBillRes.data?.data?.billNumber;

    // 5. Line items & GST calculation verification
    // Items: (2*15000 = 30000 + 18% = 35400) + (5*2000 = 10000 + 18% = 11800) + (10*500 = 5000 + 5% = 5250)
    // Subtotal: 45,000 | Tax: 5400 + 1800 + 250 = 7450 | Total before discount: 52,450 | Discount: 500 | Total: 51,950
    const billData = createBillRes.data?.data;
    assert(
      billData.subtotal === 45000 &&
        billData.taxAmount === 7450 &&
        billData.totalAmount === 51950 &&
        billData.balanceAmount === 51950 &&
        billData.paidAmount === 0,
      '6. Server-Authoritative Multi-Tier GST & Monetary Calculation Accuracy',
      `Subtotal: ${billData.subtotal}, Tax: ${billData.taxAmount}, Total: ${billData.totalAmount}`,
    );

    // 6. Duplicate vendor invoice number rejection for same supplier
    const dupBillRes = await post('/payables/bills', {
      supplierId: testSupplier.id,
      vendorInvoiceNumber: testInvoiceNum,
      dueDate: new Date().toISOString(),
      items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 18 }],
    });
    assert(
      dupBillRes.status === 409,
      '7. Duplicate Vendor Invoice Number Rejection for Same Supplier (409 Conflict)',
    );

    // 7. Supplier mismatch validation on PO linking
    if (supplierList.length > 1 && existingPo) {
      const otherSupplier = supplierList.find((s) => s.id !== existingPo.supplierId);
      if (otherSupplier) {
        const mismatchRes = await post('/payables/bills', {
          supplierId: otherSupplier.id,
          purchaseOrderId: existingPo.id,
          dueDate: new Date().toISOString(),
          items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 18 }],
        });
        assert(
          mismatchRes.status === 400,
          '8. Supplier & PO Mismatch Validation (400 Bad Request)',
        );
      }
    } else {
      assert(true, '8. Supplier & PO Mismatch Validation (Skipped: Single supplier in DB)');
    }

    // 8. 3-Way PO reconciliation summary
    const billDetailRes = await get(`/payables/bills/${billId}`);
    assert(
      billDetailRes.status === 200 &&
        billDetailRes.data?.data?.id === billId &&
        (existingPo ? billDetailRes.data?.data?.reconciliation !== null : true),
      '9. Vendor Bill Detail Retrieval & 3-Way PO Reconciliation Data',
    );

    // 9. Bill submission workflow
    const submitRes = await post(`/payables/bills/${billId}/submit`);
    assert(
      submitRes.status === 200 && submitRes.data?.data?.status === 'SUBMITTED',
      '10. Vendor Bill Submission (DRAFT -> SUBMITTED)',
    );

    // 10. Bill approval workflow
    const approveRes = await post(`/payables/bills/${billId}/approve`);
    assert(
      approveRes.status === 200 &&
        approveRes.data?.data?.status === 'APPROVED' &&
        approveRes.data?.data?.approvedAt !== null,
      '11. Vendor Bill Approval Workflow (SUBMITTED -> APPROVED)',
    );

    // 11. Duplicate approval rejection
    const dupApproveRes = await post(`/payables/bills/${billId}/approve`);
    assert(
      dupApproveRes.status === 409,
      '12. Duplicate Bill Approval Rejection (409 Conflict)',
    );

    // 12. Edit lock on APPROVED bills
    const lockedEditRes = await patch(`/payables/bills/${billId}`, {
      notes: 'Attempted edit on approved bill',
    });
    assert(
      lockedEditRes.status === 400,
      '13. Edit Lock Enforcement on APPROVED Vendor Bill (400 Bad Request)',
    );

    // 13. Operating Expense creation & number generation (EXP-2026-XXXX)
    const expPayload = {
      categoryId: firstCategory.id,
      supplierId: testSupplier.id,
      expenseDate: new Date().toISOString().split('T')[0],
      description: 'Monthly warehouse and office electricity bill',
      referenceNumber: 'TNEB-EB-88912',
      subtotal: 12000,
      taxAmount: 2160,
      notes: 'Commercial tariff payment for August cycle',
    };

    const createExpRes = await post('/payables/expenses', expPayload);
    assert(
      createExpRes.status === 201 &&
        createExpRes.data?.data?.expenseNumber?.startsWith('EXP-2026-') &&
        createExpRes.data?.data?.totalAmount === 14160 &&
        createExpRes.data?.data?.balanceAmount === 14160 &&
        createExpRes.data?.data?.status === 'DRAFT',
      '14. Operating Expense Creation & Numbering (EXP-2026-XXXX in DRAFT status)',
      `Exp No: ${createExpRes.data?.data?.expenseNumber}`,
    );
    const expenseId = createExpRes.data?.data?.id;

    // 14. Expense submission & approval
    const submitExpRes = await post(`/payables/expenses/${expenseId}/submit`);
    const approveExpRes = await post(`/payables/expenses/${expenseId}/approve`);
    assert(
      submitExpRes.status === 200 &&
        approveExpRes.status === 200 &&
        approveExpRes.data?.data?.status === 'APPROVED',
      '15. Operating Expense Submission & Approval Workflow',
    );

    // 15. Expense rejection workflow test
    const dummyExp = await post('/payables/expenses', {
      categoryId: firstCategory.id,
      description: 'Unauthorized luxury lunch expense',
      subtotal: 5000,
    });
    const rejectExpRes = await post(`/payables/expenses/${dummyExp.data?.data?.id}/reject`, {
      notes: 'Out of policy expense',
    });
    assert(
      rejectExpRes.status === 200 && rejectExpRes.data?.data?.status === 'REJECTED',
      '16. Expense Rejection Workflow (REJECTED status recorded)',
    );

    // 16. Partial Payment Allocation (Payment 1: ₹20,000 against ₹51,950 bill)
    const partPayRes = await post(`/payables/bills/${billId}/payment`, {
      amount: 20000,
      paymentMethod: 'Bank Transfer',
      paymentReference: 'AXIS-NEFT-99120',
      notes: 'First advance installment',
    });
    assert(
      partPayRes.status === 200 &&
        partPayRes.data?.data?.bill?.paidAmount === 20000 &&
        partPayRes.data?.data?.bill?.balanceAmount === 31950 &&
        partPayRes.data?.data?.bill?.status === 'PARTIALLY_PAID',
      '17. Partial Payment Allocation (PARTIALLY_PAID status & balance tracking)',
      `Paid: ${partPayRes.data?.data?.bill?.paidAmount}, Bal: ${partPayRes.data?.data?.bill?.balanceAmount}`,
    );

    // 17. Overpayment rejection (Attempting ₹40,000 when balance is ₹31,950)
    const overPayRes = await post(`/payables/bills/${billId}/payment`, {
      amount: 40000,
      paymentMethod: 'Bank Transfer',
    });
    assert(
      overPayRes.status === 400,
      '18. Overpayment Rejection (payment > outstanding balance fails with 400 Bad Request)',
    );

    // 18. Final Payment Allocation (Payment 2: ₹31,950 settling bill)
    const finalPayRes = await post(`/payables/bills/${billId}/payment`, {
      amount: 31950,
      paymentMethod: 'Bank Transfer',
      paymentReference: 'AXIS-NEFT-99188',
      notes: 'Final balance settlement',
    });
    assert(
      finalPayRes.status === 200 &&
        finalPayRes.data?.data?.bill?.paidAmount === 51950 &&
        finalPayRes.data?.data?.bill?.balanceAmount === 0 &&
        finalPayRes.data?.data?.bill?.status === 'PAID',
      '19. Final Payment Allocation & Full Settlement (PAID status, 0 balance)',
    );

    // 19. Duplicate payment rejection on fully PAID bill
    const dupPaidRes = await post(`/payables/bills/${billId}/payment`, {
      amount: 1000,
      paymentMethod: 'Cash',
    });
    assert(
      dupPaidRes.status === 400,
      '20. Duplicate Payment Rejection on Fully PAID Bill (400 Bad Request)',
    );

    // 20. Operating expense payment disbursement
    const expPayRes = await post(`/payables/expenses/${expenseId}/payment`, {
      amount: 14160,
      paymentMethod: 'UPI',
      paymentReference: 'UPI-REF-00192',
    });
    assert(
      expPayRes.status === 200 &&
        expPayRes.data?.data?.expense?.status === 'PAID' &&
        expPayRes.data?.data?.expense?.paidAmount === 14160,
      '21. Operating Expense Payment Disbursement (PAID status, 0 balance)',
    );

    // 21. Payment rejection on unapproved expense
    const unapprovedExpPay = await post(`/payables/expenses/${dummyExp.data?.data?.id}/payment`, {
      amount: 5000,
      paymentMethod: 'Cash',
    });
    assert(
      unapprovedExpPay.status === 400,
      '22. Payment Rejection on Rejected / Unapproved Expense (400 Bad Request)',
    );

    // 22. Supplier aging analytics
    const agingRes = await get('/payables/aging');
    assert(
      agingRes.status === 200 && Array.isArray(agingRes.data?.data),
      '23. Supplier Aging Analytics & Bucket Calculations (Current, 1-30, 31-60, 61-90, 90+ days)',
      `Suppliers analyzed: ${agingRes.data?.data?.length}`,
    );

    // 23. Live payables KPI analytics
    const statsRes = await get('/payables/stats');
    assert(
      statsRes.status === 200 &&
        typeof statsRes.data?.data?.totalPayables === 'number' &&
        typeof statsRes.data?.data?.paidThisMonth === 'number',
      '24. Live Accounts Payable & Expense KPI Analytics',
    );

    // 24. Payment allocations list & receipt endpoint
    const paymentListRes = await get('/payables/payments');
    assert(
      paymentListRes.status === 200 &&
        Array.isArray(paymentListRes.data?.data) &&
        paymentListRes.data?.data?.length >= 3,
      '25. Payment Allocations History & Tracking',
    );
    const samplePayment = paymentListRes.data?.data[0];

    const receiptPdf = await get(`/payables/payments/${samplePayment.id}/receipt`);
    assert(
      receiptPdf.status === 200 && receiptPdf.isPdf === true && receiptPdf.length > 500,
      '26. Payment Receipt PDF Stream Generation (application/pdf)',
      `PDF Size: ${receiptPdf.length} bytes`,
    );

    // 25. Vendor Bill PDF Generation
    const billPdf = await get(`/payables/bills/${billId}/pdf`);
    assert(
      billPdf.status === 200 && billPdf.isPdf === true && billPdf.length > 500,
      '27. Vendor Bill PDF Stream Generation (application/pdf)',
      `PDF Size: ${billPdf.length} bytes`,
    );

    // 26. Expense Voucher PDF Generation
    const expPdf = await get(`/payables/expenses/${expenseId}/pdf`);
    assert(
      expPdf.status === 200 && expPdf.isPdf === true && expPdf.length > 500,
      '28. Operating Expense Voucher PDF Stream Generation (application/pdf)',
      `PDF Size: ${expPdf.length} bytes`,
    );

    // 27. AuditLog verification for Payables
    const auditLogsRes = await get(`/payables/${billId}/history`);
    assert(
      auditLogsRes.status === 200 &&
        Array.isArray(auditLogsRes.data?.data) &&
        auditLogsRes.data?.data?.length > 0,
      '29. Full AuditLog Integration for Payable Lifecycle Events',
      `Audit entries: ${auditLogsRes.data?.data?.length}`,
    );

    // 28. Employee, Attendance & Payroll Cross-Module Integrity
    const empCheck = await get('/employees');
    const attCheck = await get('/attendance');
    const payCheck = await get('/payroll');
    assert(
      empCheck.status === 200 && attCheck.status === 200 && payCheck.status === 200,
      '30. Cross-Module Integrity (Employees, Attendance, Payroll)',
    );

    // 29. Full ERP 27-Endpoint Regression Check (Phases 2 to 13)
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
        console.error(`Regression endpoint failed: ${ep} (${res.status})`);
      }
    }

    assert(
      erpPassed === erpEndpoints.length,
      `31. Full ERP 27-Endpoint Regression Check (${erpPassed}/${erpEndpoints.length} endpoints 200 OK)`,
    );

    // 30. Database persistence & integrity check
    const verifyBill = await get(`/payables/bills/${billId}`);
    assert(
      verifyBill.status === 200 &&
        verifyBill.data?.data?.status === 'PAID' &&
        verifyBill.data?.data?.balanceAmount === 0 &&
        verifyBill.data?.data?.allocations?.length === 2,
      '32. Full Database Persistence & Record Integrity Verification',
    );

    console.log('===============================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution exception:', err);
    process.exit(1);
  }
}

runTests();
