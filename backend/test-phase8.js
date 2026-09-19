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
  console.log('FREEZE TECHNOLOGY ERP — PHASE 8 AUTOMATED TEST SUITE');
  console.log('Installation Management & Commissioning');
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

    // 2. Fetch Customer, Product, Technician from DB
    const custRes = await request('GET', '/customers');
    assert(custRes.status === 200 && custRes.data?.data?.length > 0, 'Fetch Customer for Installation');
    const customer = custRes.data.data[0];

    const prodRes = await request('GET', '/products');
    assert(prodRes.status === 200 && prodRes.data?.data?.length > 0, 'Fetch Equipment / Product for Installation');
    const product = prodRes.data.data[0];

    const techRes = await request('GET', '/services/technicians');
    assert(techRes.status === 200 && techRes.data?.data?.length > 0, 'Fetch Active Technicians for Installation');
    const tech = techRes.data.data[0];

    // 3. Initial stats
    const statsRes = await request('GET', '/installations/stats');
    assert(statsRes.status === 200 && typeof statsRes.data?.data?.total === 'number', 'Get Installation KPI Stats');

    // 4. Initial listing
    const listRes = await request('GET', '/installations');
    assert(listRes.status === 200 && Array.isArray(listRes.data?.data), 'Get Installation Listings');

    // 5. Create Installation Request
    const instDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const createRes = await request('POST', '/installations', {
      customerId: customer.id,
      productId: product.id,
      notes: 'New 1.5 Ton Split AC installation on 1st floor office',
    });
    assert(
      createRes.status === 201 &&
        createRes.data?.success &&
        createRes.data?.data?.installationNumber?.startsWith('INST-') &&
        createRes.data?.data?.installationStatus === 'Pending',
      'Create Installation Request in PostgreSQL',
      JSON.stringify(createRes.data)
    );
    const createdInst = createRes.data?.data;

    // 6. Negative Test: Invalid customer ID rejected
    const negCust = await request('POST', '/installations', {
      customerId: '00000000-0000-0000-0000-000000000000',
      productId: product.id,
    });
    assert(negCust.status === 404, 'Negative Test: Invalid Customer ID rejected with 404');

    // 7. Negative Test: Invalid product ID rejected
    const negProd = await request('POST', '/installations', {
      customerId: customer.id,
      productId: '00000000-0000-0000-0000-000000000000',
    });
    assert(negProd.status === 404, 'Negative Test: Invalid Product ID rejected with 404');

    // 8. Retrieve Installation Detail
    const detailRes = await request('GET', `/installations/${createdInst.id}`);
    assert(
      detailRes.status === 200 &&
        detailRes.data?.data?.installationNumber === createdInst.installationNumber &&
        detailRes.data?.data?.customer?.customerCode === customer.customerCode,
      'Retrieve Installation Detail with Customer & Equipment Relations'
    );

    // 9. Assign Technician and Schedule Date
    const assignRes = await request('PATCH', `/installations/${createdInst.id}/assign`, {
      technicianId: tech.id,
      scheduledDate: instDate,
      instructions: 'Carry outdoor unit wall mounting frame and 4m copper kit',
    });
    assert(
      assignRes.status === 200 &&
        assignRes.data?.data?.technicianId === tech.id &&
        assignRes.data?.data?.installationStatus === 'Scheduled',
      'Assign Lead Technician and Schedule Site Visit Date'
    );

    // 10. Negative Test: Assign invalid technician ID
    const negTech = await request('PATCH', `/installations/${createdInst.id}/assign`, {
      technicianId: '00000000-0000-0000-0000-000000000000',
    });
    assert(negTech.status === 404, 'Negative Test: Invalid Technician ID rejected with 404');

    // 11. Valid Status Transition: Scheduled -> In Progress
    const progressRes = await request('PATCH', `/installations/${createdInst.id}/status`, {
      status: 'In Progress',
      notes: 'Technician reached customer premises and began mounting work',
    });
    assert(
      progressRes.status === 200 && progressRes.data?.data?.installationStatus === 'In Progress',
      'Valid Status Transition (Scheduled -> In Progress)'
    );

    // 12. Negative Test: Invalid status transition (In Progress -> Pending)
    const negTrans = await request('PATCH', `/installations/${createdInst.id}/status`, {
      status: 'Pending',
    });
    assert(negTrans.status === 400, 'Negative Test: Invalid Status Transition rejected with 400');

    // 13. Complete & Commission Installation
    const completeRes = await request('PATCH', `/installations/${createdInst.id}/complete`, {
      completedDate: new Date().toISOString(),
      customerVerified: true,
      commissioningNotes: 'Indoor & outdoor units mounted, vacuum test passed, cooling verified at 18°C',
      technicianRemarks: 'Demo given, remote handed over to customer',
      actualCost: 2500,
    });
    assert(
      completeRes.status === 200 &&
        completeRes.data?.data?.installationStatus === 'Completed' &&
        completeRes.data?.data?.customerVerified === true &&
        completeRes.data?.data?.completedDate !== null,
      'Commission & Complete Installation with Customer Verification'
    );

    // 14. Negative Test: Duplicate completion of already completed installation
    const negComp = await request('PATCH', `/installations/${createdInst.id}/complete`, {
      commissioningNotes: 'Duplicate attempt',
    });
    assert(negComp.status === 400, 'Negative Test: Duplicate completion attempt rejected (400)');

    // 15. Negative Test: Status transition on Completed installation rejected
    const negStatusComp = await request('PATCH', `/installations/${createdInst.id}/status`, {
      status: 'In Progress',
    });
    assert(negStatusComp.status === 400, 'Negative Test: Status change on Completed installation rejected (400)');

    // 16. Generate 1-Click GST Invoice for Installation
    const invoiceRes = await request('POST', `/installations/${createdInst.id}/create-invoice`);
    assert(
      invoiceRes.status === 201 &&
        invoiceRes.data?.data?.invoiceNumber?.startsWith('FT/') &&
        invoiceRes.data?.data?.subtotal === 2500 &&
        invoiceRes.data?.data?.gstAmount === 450 &&
        invoiceRes.data?.data?.grandTotal === 2950,
      'Generate 1-Click GST Invoice for Installation (₹2,500 + 18% GST ₹450 = ₹2,950)'
    );
    const invoiceId = invoiceRes.data?.data?.id;

    // 17. Negative Test: Duplicate invoice generation rejected
    const dupInv = await request('POST', `/installations/${createdInst.id}/create-invoice`);
    assert(dupInv.status === 409, 'Negative Test: Duplicate Invoice for same installation rejected (409 Conflict)');

    // 18. Generate Document 1 PDF for the Installation Invoice
    const pdfRes = await request('GET', `/invoices/${invoiceId}/pdf`);
    assert(
      pdfRes.status === 200 && pdfRes.headers['content-type'] === 'application/pdf',
      'Generate Document 1 PDF for Installation Invoice'
    );

    // 19. Create and Cancel secondary installation (soft delete test)
    const inst2 = await request('POST', '/installations', {
      customerId: customer.id,
      productId: product.id,
      notes: 'Installation to be cancelled',
    });
    const cancelRes = await request('DELETE', `/installations/${inst2.data?.data?.id}`);
    assert(
      cancelRes.status === 200 && cancelRes.data?.success,
      'Cancel / Soft Delete Installation Record'
    );

    const checkCancel = await request('GET', `/installations/${inst2.data?.data?.id}`);
    assert(
      checkCancel.status === 200 && checkCancel.data?.data?.installationStatus === 'Cancelled',
      'Verify Cancelled Record Preserved in PostgreSQL Without Physical Row Loss'
    );

    // 20. Filter and Search query tests
    const searchRes = await request('GET', `/installations?search=${createdInst.installationNumber}`);
    assert(
      searchRes.status === 200 && searchRes.data?.data?.length > 0,
      'Filter / Search by Installation Number'
    );

    const statusFilterRes = await request('GET', '/installations?status=Completed');
    assert(
      statusFilterRes.status === 200 &&
        statusFilterRes.data?.data?.every((x) => x.installationStatus === 'Completed'),
      'Filter by Status = Completed'
    );

    // 21. Phase 2–7 Regressions
    const regQuots = await request('GET', '/quotations');
    const regInvs = await request('GET', '/invoices');
    const regPays = await request('GET', '/payments');
    const regSrvs = await request('GET', '/services');
    const regAmc = await request('GET', '/amc');
    assert(
      regQuots.status === 200 &&
        regInvs.status === 200 &&
        regPays.status === 200 &&
        regSrvs.status === 200 &&
        regAmc.status === 200,
      'Phase 2–7 Regression Checks (Quotations, Invoices, Payments, Services, AMC OK)'
    );

    console.log(`\n====================================================`);
    console.log(`TEST SUMMARY: Passed ${passed} / ${total} tests`);
    console.log(`====================================================\n`);

    if (passed === total) {
      console.log('🎉 ALL PHASE 8 AUTOMATED API TESTS PASSED SUCCESSFULLY!');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected test error:', err);
    process.exit(1);
  }
}

runTests();
