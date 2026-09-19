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
  console.log('FREEZE TECHNOLOGY ERP — PHASE 6 AUTOMATED TEST SUITE');
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

    // 2. Technicians list
    const techRes = await request('GET', '/services/technicians');
    assert(
      techRes.status === 200 && Array.isArray(techRes.data?.data) && techRes.data.data.length >= 4,
      'Get Active Technicians from PostgreSQL Employee Table',
      `Count: ${techRes.data?.data?.length}`
    );
    const tech = techRes.data.data[0];

    // 3. Customers list
    const custRes = await request('GET', '/customers');
    assert(custRes.status === 200 && custRes.data?.data?.length > 0, 'Get Existing Customers for Service Request');
    const customer = custRes.data.data[0];

    // 4. Products list
    const prodRes = await request('GET', '/products');
    assert(prodRes.status === 200 && prodRes.data?.data?.length > 0, 'Get Existing Products/Equipment');
    const product = prodRes.data.data[0];

    // 5. Initial stats
    const statsRes = await request('GET', '/services/stats');
    assert(statsRes.status === 200 && typeof statsRes.data?.data?.total === 'number', 'Get Service KPI Stats');

    // 6. Create Service Request / Job Card
    const createRes = await request('POST', '/services', {
      customerId: customer.id,
      productId: product.id,
      complaintDescription: 'AC not cooling properly and indoor coil leaking water',
      priority: 'High',
      serviceType: 'Breakdown',
      estimatedCost: 2000,
      notes: 'Customer requested evening visit',
    });
    assert(
      createRes.status === 201 &&
        createRes.data?.success &&
        createRes.data?.data?.jobNumber?.startsWith('JC-') &&
        createRes.data?.data?.complaint?.complaintNumber?.startsWith('CMP-'),
      'Create Service Job Card (PostgreSQL Persistence)',
      JSON.stringify(createRes.data)
    );
    const createdJob = createRes.data?.data;

    // 7. Negative Test: Invalid customer
    const negCust = await request('POST', '/services', {
      customerId: '00000000-0000-0000-0000-000000000000',
      complaintDescription: 'Invalid customer test',
    });
    assert(negCust.status === 404, 'Negative Test: Invalid Customer ID rejected with 404');

    // 8. Negative Test: Invalid technician assignment
    const negTech = await request('PATCH', `/services/${createdJob.id}/assign`, {
      technicianId: '00000000-0000-0000-0000-000000000000',
    });
    assert(negTech.status === 404, 'Negative Test: Invalid Technician ID rejected with 404');

    // 9. Get Service Detail by ID
    const detailRes = await request('GET', `/services/${createdJob.id}`);
    assert(
      detailRes.status === 200 &&
        detailRes.data?.data?.jobNumber === createdJob.jobNumber &&
        detailRes.data?.data?.complaint?.customer?.customerCode === customer.customerCode,
      'Retrieve Service Job Card Detail with Relations'
    );

    // 10. Assign Technician
    const assignRes = await request('PATCH', `/services/${createdJob.id}/assign`, {
      technicianId: tech.id,
      visitDate: new Date().toISOString(),
      notes: 'Assigned to senior technician for immediate dispatch',
    });
    assert(
      assignRes.status === 200 &&
        assignRes.data?.data?.technicianId === tech.id &&
        assignRes.data?.data?.status === 'Assigned',
      'Assign Technician & Auto-Transition Status to Assigned'
    );

    // 11. Update Status to In Progress
    const statusRes = await request('PATCH', `/services/${createdJob.id}/status`, {
      status: 'In Progress',
      remarks: 'Technician reached site and begun coil diagnosis',
    });
    assert(
      statusRes.status === 200 && statusRes.data?.data?.status === 'In Progress',
      'Update Status to In Progress & Record Status Log'
    );

    // 12. Negative Test: Invalid status transition directly to Completed
    const negStatus = await request('PATCH', `/services/${createdJob.id}/status`, {
      status: 'Completed',
    });
    assert(negStatus.status === 400, 'Negative Test: Arbitrary transition to Completed without work details rejected (400)');

    // 13. Complete Service
    const completeRes = await request('PATCH', `/services/${createdJob.id}/complete`, {
      workDone: 'High pressure water jet coil cleaning, flare nut tightening, and gas top-up (R32)',
      sparePartsUsed: '1/4 inch copper flare nut, R32 refrigerant (300g)',
      actualCost: 2400,
      customerSignature: 'Mr. Ashok (Manager Signoff)',
      notes: 'Cooling verified at 16°C. Customer satisfied.',
    });
    assert(
      completeRes.status === 200 &&
        completeRes.data?.data?.status === 'Completed' &&
        completeRes.data?.data?.actualCost === 2400 &&
        completeRes.data?.data?.serviceHistory?.length > 0,
      'Complete Service Job Card (Records ServiceHistory, Actual Cost, and Closes Complaint)'
    );

    // 14. Negative Test: Complete already completed job
    const negComplete = await request('PATCH', `/services/${createdJob.id}/complete`, {
      workDone: 'Duplicate complete attempt',
    });
    assert(negComplete.status === 400, 'Negative Test: Completing already completed job rejected (400)');

    // 15. Create Invoice from Completed Service Job
    const invoiceRes = await request('POST', `/services/${createdJob.id}/create-invoice`);
    assert(
      invoiceRes.status === 201 &&
        invoiceRes.data?.data?.invoiceNumber?.startsWith('FT/') &&
        invoiceRes.data?.data?.subtotal === 2400 &&
        invoiceRes.data?.data?.gstAmount === 432 &&
        invoiceRes.data?.data?.grandTotal === 2832,
      'Generate GST Invoice from Completed Job Card (₹2,400 + 18% GST ₹432 = ₹2,832)'
    );
    const invoiceId = invoiceRes.data?.data?.id;

    // 16. Duplicate Invoice Protection
    const dupInvoice = await request('POST', `/services/${createdJob.id}/create-invoice`);
    assert(dupInvoice.status === 409, 'Negative Test: Duplicate Invoice Creation for same Job Card rejected (409 Conflict)');

    // 17. Verify Document 1 PDF
    const pdfRes = await request('GET', `/invoices/${invoiceId}/pdf`);
    assert(
      pdfRes.status === 200 && pdfRes.headers['content-type'] === 'application/pdf',
      'Generate Document 1 PDF for Service-Derived Invoice'
    );

    // 18. Legacy API Compatibility
    const legacyJobs = await request('GET', '/jobcards');
    assert(
      legacyJobs.status === 200 && Array.isArray(legacyJobs.data?.data) && legacyJobs.data.data.length > 0,
      'Legacy /api/jobcards endpoint backward compatibility'
    );

    // 19. Phase 2–5 Regressions
    const regQuots = await request('GET', '/quotations');
    const regInvs = await request('GET', '/invoices');
    const regPays = await request('GET', '/payments');
    assert(
      regQuots.status === 200 && regInvs.status === 200 && regPays.status === 200,
      'Phase 2–5 Regressions (Quotations, Invoices, Payments OK)'
    );

    console.log(`\n====================================================`);
    console.log(`TEST SUMMARY: Passed ${passed} / ${total} tests`);
    console.log(`====================================================\n`);

    if (passed === total) {
      console.log('🎉 ALL PHASE 6 AUTOMATED API TESTS PASSED SUCCESSFULLY!');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected test error:', err);
    process.exit(1);
  }
}

runTests();
