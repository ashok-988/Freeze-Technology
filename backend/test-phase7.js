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
  console.log('FREEZE TECHNOLOGY ERP — PHASE 7 AUTOMATED TEST SUITE');
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

    // 2. Fetch Customer, Product, Technician
    const custRes = await request('GET', '/customers');
    assert(custRes.status === 200 && custRes.data?.data?.length > 0, 'Fetch Customer for AMC Contract');
    const customer = custRes.data.data[0];

    const prodRes = await request('GET', '/products');
    assert(prodRes.status === 200 && prodRes.data?.data?.length > 0, 'Fetch Equipment / Product for AMC');
    const product = prodRes.data.data[0];

    const techRes = await request('GET', '/services/technicians');
    assert(techRes.status === 200 && techRes.data?.data?.length > 0, 'Fetch Active Technicians for AMC Visits');
    const tech = techRes.data.data[0];

    // 3. Initial stats
    const statsRes = await request('GET', '/amc/stats');
    assert(statsRes.status === 200 && typeof statsRes.data?.data?.total === 'number', 'Get AMC KPI Stats');

    // 4. Create AMC Contract
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const createRes = await request('POST', '/amc', {
      customerId: customer.id,
      productId: product.id,
      startDate,
      endDate,
      totalVisits: 4,
      contractValue: 6500,
      notes: 'Comprehensive 4-Visit Annual Maintenance Contract',
    });
    assert(
      createRes.status === 201 &&
        createRes.data?.success &&
        createRes.data?.data?.amcNumber?.startsWith('AMC-') &&
        createRes.data?.data?.totalVisits === 4 &&
        createRes.data?.data?.remainingVisits === 4 &&
        createRes.data?.data?.status === 'Active',
      'Create AMC Contract in PostgreSQL',
      JSON.stringify(createRes.data)
    );
    const createdAmc = createRes.data?.data;

    // 5. Negative Test: End date before start date
    const negDate = await request('POST', '/amc', {
      customerId: customer.id,
      productId: product.id,
      startDate: endDate,
      endDate: startDate,
    });
    assert(negDate.status === 400, 'Negative Test: End date before start date rejected with 400');

    // 6. Negative Test: Invalid customer
    const negCust = await request('POST', '/amc', {
      customerId: '00000000-0000-0000-0000-000000000000',
      productId: product.id,
      startDate,
      endDate,
    });
    assert(negCust.status === 404, 'Negative Test: Invalid Customer ID rejected with 404');

    // 7. Negative Test: Invalid product
    const negProd = await request('POST', '/amc', {
      customerId: customer.id,
      productId: '00000000-0000-0000-0000-000000000000',
      startDate,
      endDate,
    });
    assert(negProd.status === 404, 'Negative Test: Invalid Product ID rejected with 404');

    // 8. Retrieve AMC Contract Detail
    const detailRes = await request('GET', `/amc/${createdAmc.id}`);
    assert(
      detailRes.status === 200 &&
        detailRes.data?.data?.amcNumber === createdAmc.amcNumber &&
        detailRes.data?.data?.customer?.customerCode === customer.customerCode,
      'Retrieve AMC Contract Detail with Relations'
    );

    // 9. Schedule Visit #1
    const scheduleRes = await request('POST', `/amc/${createdAmc.id}/visits`, {
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      technicianId: tech.id,
      remarks: 'Q1 Comprehensive checkup and chemical filter wash',
    });
    assert(
      scheduleRes.status === 201 &&
        scheduleRes.data?.data?.visits?.length === 1 &&
        scheduleRes.data?.data?.visits[0]?.visitNumber === 1 &&
        scheduleRes.data?.data?.visits[0]?.technician?.fullName === tech.fullName,
      'Schedule AMC Visit #1 & Link Technician'
    );
    const visit1 = scheduleRes.data?.data?.visits[0];

    // 10. Complete Visit #1
    const completeVisitRes = await request('PATCH', `/amc/${createdAmc.id}/visits/${visit1.id}/complete`);
    assert(
      completeVisitRes.status === 200 &&
        completeVisitRes.data?.data?.completedVisits === 1 &&
        completeVisitRes.data?.data?.remainingVisits === 3,
      'Complete AMC Visit #1 & Authoritatively Decrement Remaining Allowance (3 Remaining)'
    );

    // 11. Negative Test: Double completion of same visit
    const negCompVisit = await request('PATCH', `/amc/${createdAmc.id}/visits/${visit1.id}/complete`);
    assert(negCompVisit.status === 400, 'Negative Test: Duplicate completion of already completed visit rejected (400)');

    // 12. Schedule and complete remaining 3 visits to consume all 4
    for (let i = 2; i <= 4; i++) {
      const sRes = await request('POST', `/amc/${createdAmc.id}/visits`, {
        scheduledDate: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString(),
        technicianId: tech.id,
        remarks: `Q${i} Scheduled Maintenance`,
      });
      if (sRes.status !== 201) {
        console.error(`Error scheduling visit #${i}:`, sRes.status, sRes.data);
      }
      const v = sRes.data?.data?.visits?.find((x) => x.visitNumber === i);
      if (v) {
        await request('PATCH', `/amc/${createdAmc.id}/visits/${v.id}/complete`);
      }
    }

    const checkFull = await request('GET', `/amc/${createdAmc.id}`);
    assert(
      checkFull.status === 200 &&
        checkFull.data?.data?.completedVisits === 4 &&
        checkFull.data?.data?.remainingVisits === 0,
      'All 4 Included Visits Successfully Consumed & Tracked'
    );

    // 13. Negative Test: Exceeding included visit allowance
    const negOverVisit = await request('POST', `/amc/${createdAmc.id}/visits`, {
      scheduledDate: new Date().toISOString(),
      remarks: 'Unauthorized 5th visit',
    });
    assert(negOverVisit.status === 400, 'Negative Test: Exceeding included visit allowance rejected (400)');

    // 14. Renew Contract
    const renewStart = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString();
    const renewEnd = new Date(Date.now() + 731 * 24 * 60 * 60 * 1000).toISOString();

    const renewRes = await request('POST', `/amc/${createdAmc.id}/renew`, {
      startDate: renewStart,
      endDate: renewEnd,
      totalVisits: 4,
      contractValue: 7000,
      notes: 'Renewal for year 2',
    });
    assert(
      renewRes.status === 201 &&
        renewRes.data?.data?.amcNumber?.startsWith('AMC-') &&
        renewRes.data?.data?.amcNumber !== createdAmc.amcNumber &&
        renewRes.data?.data?.status === 'Active' &&
        renewRes.data?.data?.remainingVisits === 4,
      'Renew AMC Contract: Generated Next Sequence Contract with Fresh Allowance'
    );

    // Verify old contract marked Renewed
    const oldCheck = await request('GET', `/amc/${createdAmc.id}`);
    assert(oldCheck.data?.data?.status === 'Renewed', 'Historical Contract Marked as Renewed Without Data Loss');

    // 15. Create Invoice from AMC Contract
    const invoiceRes = await request('POST', `/amc/${createdAmc.id}/create-invoice`);
    assert(
      invoiceRes.status === 201 &&
        invoiceRes.data?.data?.invoiceNumber?.startsWith('FT/') &&
        invoiceRes.data?.data?.subtotal === 6500 &&
        invoiceRes.data?.data?.gstAmount === 1170 &&
        invoiceRes.data?.data?.grandTotal === 7670,
      'Generate GST Invoice for AMC Contract (₹6,500 + 18% GST ₹1,170 = ₹7,670)'
    );
    const invoiceId = invoiceRes.data?.data?.id;

    // 16. Negative Test: Duplicate invoice generation
    const dupInv = await request('POST', `/amc/${createdAmc.id}/create-invoice`);
    assert(dupInv.status === 409, 'Negative Test: Duplicate Invoice Creation for same AMC rejected (409 Conflict)');

    // 17. Verify Document 1 PDF
    const pdfRes = await request('GET', `/invoices/${invoiceId}/pdf`);
    assert(
      pdfRes.status === 200 && pdfRes.headers['content-type'] === 'application/pdf',
      'Generate Document 1 PDF for AMC Invoice'
    );

    // 18. Phase 2–6 Regressions
    const regQuots = await request('GET', '/quotations');
    const regInvs = await request('GET', '/invoices');
    const regPays = await request('GET', '/payments');
    const regSrvs = await request('GET', '/services');
    assert(
      regQuots.status === 200 && regInvs.status === 200 && regPays.status === 200 && regSrvs.status === 200,
      'Phase 2–6 Regressions (Quotations, Invoices, Payments, Services OK)'
    );

    console.log(`\n====================================================`);
    console.log(`TEST SUMMARY: Passed ${passed} / ${total} tests`);
    console.log(`====================================================\n`);

    if (passed === total) {
      console.log('🎉 ALL PHASE 7 AUTOMATED API TESTS PASSED SUCCESSFULLY!');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected test error:', err);
    process.exit(1);
  }
}

runTests();
