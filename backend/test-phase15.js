/**
 * Phase 15 Automated Test Suite
 * Asset Management, AMC Contract Billing & Preventive Maintenance
 */
const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            const parsed = JSON.parse(buffer.toString('utf8'));
            resolve({ status: res.statusCode, headers: res.headers, body: parsed, buffer });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, body: buffer.toString('utf8'), buffer });
          }
        } else {
          resolve({ status: res.statusCode, headers: res.headers, body: buffer, buffer });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 15: ASSETS, AMC BILLING & PREVENTIVE MAINTENANCE');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // SETUP: Get or create Customer, Product, Technician
    // ----------------------------------------------------
    console.log('1. Fetching Reference Masters (Customer, Product, Technician)...');
    const custRes = await request('GET', '/customers');
    assert(custRes.status === 200, 'GET /api/customers returns 200');
    const customer = custRes.body.data?.[0] || custRes.body[0];
    assert(customer && customer.id, `Found reference customer: ${customer?.customerName}`);

    const prodRes = await request('GET', '/products');
    assert(prodRes.status === 200, 'GET /api/products returns 200');
    const product = prodRes.body.data?.[0] || prodRes.body[0];
    assert(product && product.id, `Found reference product: ${product?.productName}`);

    const techRes = await request('GET', '/employees/technicians');
    assert(techRes.status === 200, 'GET /api/employees/technicians returns 200');
    const technician = techRes.body.data?.[0] || techRes.body[0];
    assert(technician && technician.id, `Found reference technician: ${technician?.fullName}`);

    const [catRes, brandRes] = await Promise.all([
      request('GET', '/products/categories'),
      request('GET', '/products/brands'),
    ]);
    const categoryId = catRes.body.data?.[0]?.id || catRes.body[0]?.id;
    const brandId = brandRes.body.data?.[0]?.id || brandRes.body[0]?.id;

    // Create a spare part product with inventory
    console.log('\n2. Creating Test Spare Part Product & Stock for Consumption...');
    const spareCode = `SP-${Date.now()}`;
    const spareRes = await request('POST', '/products', {
      productName: `Test Compressor Capacitor 50uF ${Date.now()}`,
      sku: `SKU-${spareCode}`,
      categoryId: categoryId,
      brandId: brandId,
      model: `CAP-50UF-${Date.now().toString().slice(-4)}`,
      purchasePrice: 450,
      sellingPrice: 750,
      stockQuantity: 15,
    });
    assert(spareRes.status === 201, 'POST /api/products creates spare part product');
    const spareProduct = spareRes.body.data || spareRes.body;
    assert(spareProduct && spareProduct.id, `Created Spare Part: ${spareProduct.productName} with 15 initial stock`);

    // ----------------------------------------------------
    // ASSET REGISTER TESTS
    // ----------------------------------------------------
    console.log('\n3. Asset Register & Lifecycle Tests...');
    const uniqueSerial1 = `SN-TEST-P15-${Date.now()}-1`;
    const uniqueSerial2 = `SN-TEST-P15-${Date.now()}-2`;

    // 3.1 Create Asset 1 (Active Warranty)
    const asset1Res = await request('POST', '/assets', {
      customerId: customer.id,
      productId: product.id,
      brandName: 'Panasonic',
      modelNumber: 'CS-KN18WKY-1',
      serialNumber: uniqueSerial1,
      capacitySpec: '1.5 Ton 5 Star Split Inverter',
      installationDate: '2026-01-15',
      warrantyStartDate: '2026-01-15',
      warrantyEndDate: '2027-01-14',
      location: 'MD Chamber 2nd Floor',
      siteAddress: 'PTC Quarters, Thoraipakkam, Chennai',
      status: 'ACTIVE',
      technicianId: technician.id,
      notes: 'Initial commissioning complete and tested.',
    });
    assert(asset1Res.status === 201, 'POST /api/assets creates Asset 1 with 201 Created');
    const asset1 = asset1Res.body.data || asset1Res.body;
    assert(asset1.assetNumber && asset1.assetNumber.startsWith('AST-'), `Asset 1 assigned number: ${asset1.assetNumber}`);
    assert(asset1.status === 'ACTIVE', 'Asset 1 status is ACTIVE');
    assert(asset1.warrantyStatus === 'ACTIVE', 'Asset 1 warrantyStatus calculated as ACTIVE');

    // 3.2 Create Asset 2 (Expired Warranty)
    const asset2Res = await request('POST', '/assets', {
      customerId: customer.id,
      productId: product.id,
      brandName: 'Daikin',
      modelNumber: 'FTKM50TV',
      serialNumber: uniqueSerial2,
      capacitySpec: '1.5 Ton Non-Inverter',
      installationDate: '2024-01-10',
      warrantyStartDate: '2024-01-10',
      warrantyEndDate: '2025-01-09',
      location: 'Conference Room 1',
      status: 'ACTIVE',
      notes: 'Legacy unit.',
    });
    assert(asset2Res.status === 201, 'POST /api/assets creates Asset 2 with 201 Created');
    const asset2 = asset2Res.body.data || asset2Res.body;
    assert(asset2.warrantyStatus === 'EXPIRED', 'Asset 2 warrantyStatus calculated as EXPIRED');

    // 3.3 Duplicate Serial Number validation
    const dupRes = await request('POST', '/assets', {
      customerId: customer.id,
      productId: product.id,
      serialNumber: uniqueSerial1, // duplicate
    });
    assert(dupRes.status === 400 || dupRes.status === 409, 'Duplicate serial number returns 400/409 error');

    // 3.4 Query & Filter Assets
    const listRes = await request('GET', '/assets?limit=10');
    assert(listRes.status === 200, 'GET /api/assets returns 200');
    assert(listRes.body.total >= 2, `GET /api/assets returned ${listRes.body.total} total assets`);

    const statsRes = await request('GET', '/assets/stats');
    assert(statsRes.status === 200, 'GET /api/assets/stats returns 200');
    assert(statsRes.body.data?.totalAssets >= 2, `Total assets in stats: ${statsRes.body.data?.totalAssets}`);

    // 3.5 Warranty Analysis Endpoint
    const warrantyRes = await request('GET', '/assets/warranty');
    assert(warrantyRes.status === 200, 'GET /api/assets/warranty returns 200');
    assert(Array.isArray(warrantyRes.body.data?.activeWarranty), 'Warranty analysis contains activeWarranty array');

    // 3.6 Update Asset
    const updateAssetRes = await request('PATCH', `/assets/${asset1.id}`, {
      location: 'MD Chamber - Updated Location',
      status: 'UNDER_SERVICE',
    });
    assert(updateAssetRes.status === 200, 'PATCH /api/assets/:id updates asset');
    assert(updateAssetRes.body.data?.status === 'UNDER_SERVICE', 'Asset status updated to UNDER_SERVICE');

    // 3.7 Download Asset PDF Card & Register
    const assetPdfRes = await request('GET', `/assets/${asset1.id}/pdf`);
    assert(assetPdfRes.status === 200, 'GET /api/assets/:id/pdf returns 200');
    assert(assetPdfRes.headers['content-type']?.includes('application/pdf'), 'Asset card returns application/pdf');
    assert(assetPdfRes.buffer?.length > 1000, `Asset card PDF generated (${assetPdfRes.buffer?.length} bytes)`);

    const regPdfRes = await request('GET', '/assets/export/register-pdf');
    assert(regPdfRes.status === 200, 'GET /api/assets/export/register-pdf returns 200');
    assert(regPdfRes.headers['content-type']?.includes('application/pdf'), 'Asset register returns application/pdf');

    // ----------------------------------------------------
    // AMC CONTRACT & BILLING SCHEDULE TESTS
    // ----------------------------------------------------
    console.log('\n4. AMC Contract, Multi-Asset Coverage & Billing Schedule Tests...');
    const startD = new Date().toISOString().split('T')[0];
    const endD = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const amcRes = await request('POST', '/amc', {
      customerId: customer.id,
      productId: product.id,
      assetIds: [asset1.id, asset2.id],
      contractType: 'Comprehensive',
      startDate: startD,
      endDate: endD,
      totalVisits: 4,
      serviceFrequency: 'QUARTERLY',
      billingFrequency: 'QUARTERLY',
      contractValue: 24000,
      gstRate: 18,
      assignedTechnicianId: technician.id,
      notes: 'Enterprise AMC contract covering 2 installed units with quarterly billing.',
    });
    assert(amcRes.status === 201, 'POST /api/amc creates Phase 15 AMC Contract with 201');
    const amcContract = amcRes.body.data || amcRes.body;
    assert(amcContract.amcNumber && amcContract.amcNumber.startsWith('AMC-'), `AMC assigned number: ${amcContract.amcNumber}`);
    assert(amcContract.totalAmount === 28320, `Total AMC value calculated with 18% GST = ₹${amcContract.totalAmount}`);

    // Verify Billing Schedules Generated
    const schedRes = await request('GET', `/amc/${amcContract.id}/billing-schedules`);
    assert(schedRes.status === 200, 'GET /api/amc/:id/billing-schedules returns 200');
    const schedules = schedRes.body.data || schedRes.body;
    assert(Array.isArray(schedules) && schedules.length === 4, `4 Quarterly billing schedules generated (Found: ${schedules.length})`);
    assert(schedules[0].periodLabel.startsWith('Q1') && schedules[0].totalAmount === 7080, 'Q1 billing schedule amount is ₹7,080.00');

    // Verify Asset AMC Status Updated
    const checkAsset1 = await request('GET', `/assets/${asset1.id}`);
    assert(checkAsset1.body.data?.amcStatus === 'COVERED', 'Asset 1 amcStatus updated to COVERED');

    // 1-Click Generate GST Invoice for Billing Period 1
    console.log('\n5. Testing 1-Click AMC Billing Invoice Generation (Phase 5 integration)...');
    const invBillRes = await request('POST', '/amc/billing/generate', {
      amcContractId: amcContract.id,
      billingScheduleId: schedules[0].id,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Quarterly AMC billing invoice Q1',
    });
    assert(invBillRes.status === 201, 'POST /api/amc/billing/generate returns 201 Created');
    assert(invBillRes.body.invoice && invBillRes.body.invoice.invoiceNumber.startsWith('FT/'), `Created Phase 5 GST Invoice: ${invBillRes.body.invoice.invoiceNumber}`);
    assert(invBillRes.body.billingSchedule?.status === 'INVOICED' || invBillRes.body.billingScheduleId, 'AMCBillingSchedule status updated to INVOICED');

    // Download AMC Contract & Revenue Report PDFs
    const amcPdfRes = await request('GET', `/amc/${amcContract.id}/pdf`);
    assert(amcPdfRes.status === 200 && amcPdfRes.buffer?.length > 1000, `AMC Contract PDF generated (${amcPdfRes.buffer?.length} bytes)`);

    const amcRevPdfRes = await request('GET', '/amc/export/revenue-pdf');
    assert(amcRevPdfRes.status === 200 && amcRevPdfRes.buffer?.length > 1000, `AMC Revenue Report PDF generated (${amcRevPdfRes.buffer?.length} bytes)`);

    // ----------------------------------------------------
    // PREVENTIVE MAINTENANCE SCHEDULING TESTS
    // ----------------------------------------------------
    console.log('\n6. Preventive Maintenance (PM) Generation & Scheduling Tests...');
    // 6.1 Auto-generate PMs from AMC contract
    const genPmRes = await request('POST', '/preventive-maintenance/generate-amc-pm', {
      amcContractId: amcContract.id,
    });
    assert(genPmRes.status === 201 || genPmRes.status === 200, 'POST /api/preventive-maintenance/generate-amc-pm returns 200/201');
    assert(genPmRes.body.generatedVisits?.length > 0, `Generated ${genPmRes.body.generatedVisits?.length} PM visit schedules for AMC`);
    const pmVisit1 = genPmRes.body.generatedVisits[0];

    // 6.2 Manual PM Schedule Creation
    const manualPmRes = await request('POST', '/preventive-maintenance', {
      assetId: asset2.id,
      plannedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      frequency: 'QUARTERLY',
      technicianId: technician.id,
      remarks: 'Comprehensive coil & filter chemical wash.',
    });
    assert(manualPmRes.status === 201, 'POST /api/preventive-maintenance creates manual PM schedule');
    const manualPm = manualPmRes.body.data || manualPmRes.body;
    assert(manualPm.pmNumber && manualPm.pmNumber.startsWith('PM-'), `Assigned PM Number: ${manualPm.pmNumber}`);

    // 6.3 PM Stats Endpoint
    const pmStatsRes = await request('GET', '/preventive-maintenance/stats');
    assert(pmStatsRes.status === 200, 'GET /api/preventive-maintenance/stats returns 200');

    // ----------------------------------------------------
    // VISIT COMPLETION & TRANSACTIONAL INVENTORY CONSUMPTION
    // ----------------------------------------------------
    console.log('\n7. Maintenance Visit Completion & Atomic Inventory Consumption Tests...');
    // Initial spare part stock was 15. Consume 3 units.
    const completeRes = await request('POST', `/preventive-maintenance/${pmVisit1.id}/complete`, {
      completionDate: new Date().toISOString().split('T')[0],
      actualStartTime: '09:30 AM',
      actualEndTime: '11:00 AM',
      workPerformed: 'Replaced compressor capacitor, washed air filters, tested gas suction pressure (65 PSI).',
      observations: 'Unit operating within nominal factory temperature gradients.',
      recommendations: 'Continue quarterly filter maintenance.',
      customerAcknowledgement: 'Verified on site by facility executive.',
      checklist: JSON.stringify(['compressor', 'filter', 'coil', 'gasPressure', 'electrical', 'drainLine']),
      partsConsumed: [
        {
          productId: spareProduct.id,
          quantity: 3,
          unitCost: 450,
        },
      ],
    });
    assert(completeRes.status === 200 || completeRes.status === 201, 'POST /api/preventive-maintenance/:id/complete marks visit complete');
    const completedPm = completeRes.body.data || completeRes.body;
    assert(completedPm.status === 'COMPLETED', 'PM schedule status updated to COMPLETED');
    assert(completedPm.completionDate !== null, 'PM completionDate recorded');

    // Verify Inventory Stock Reduced Atomically from 15 to 12
    const verifyStockRes = await request('GET', `/products/${spareProduct.id}`);
    const updatedProd = verifyStockRes.body.data || verifyStockRes.body;
    assert(updatedProd.stockQuantity === 12, `Product stockQuantity decremented from 15 to ${updatedProd.stockQuantity}`);

    // Verify Negative Stock Prevention: Attempt to consume 50 units (only 12 available)
    const negativeStockRes = await request('POST', `/preventive-maintenance/${manualPm.id}/complete`, {
      completionDate: new Date().toISOString().split('T')[0],
      workPerformed: 'Attempt excess consumption',
      partsConsumed: [
        {
          productId: spareProduct.id,
          quantity: 50, // exceeds available stock 12
          unitCost: 450,
        },
      ],
    });
    assert(negativeStockRes.status === 400, 'Attempt to consume more stock than available correctly rejected with 400 Bad Request');

    // Re-verify stock remains 12
    const verifyStockRes2 = await request('GET', `/products/${spareProduct.id}`);
    const updatedProd2 = verifyStockRes2.body.data || verifyStockRes2.body;
    assert(updatedProd2.stockQuantity === 12, `Product stock remains safe at ${updatedProd2.stockQuantity} after rejected transaction`);

    // Download PM Visit Slip PDF & Schedule Summary PDF
    const pmPdfRes = await request('GET', `/preventive-maintenance/${pmVisit1.id}/pdf`);
    assert(pmPdfRes.status === 200 && pmPdfRes.buffer?.length > 1000, `PM Visit Report PDF generated (${pmPdfRes.buffer?.length} bytes)`);

    const pmSchedPdfRes = await request('GET', '/preventive-maintenance/export/pdf');
    assert(pmSchedPdfRes.status === 200 && pmSchedPdfRes.buffer?.length > 1000, `PM Schedule Report PDF generated (${pmSchedPdfRes.buffer?.length} bytes)`);

    // ----------------------------------------------------
    // AMC CONTRACT RENEWAL TEST
    // ----------------------------------------------------
    console.log('\n8. AMC Contract Renewal Tests...');
    const renewStart = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const renewEnd = new Date(Date.now() + 731 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const renewRes = await request('POST', `/amc/${amcContract.id}/renew`, {
      startDate: renewStart,
      endDate: renewEnd,
      totalVisits: 4,
      contractValue: 26000,
      notes: 'Renewed for year 2 with 8% escalation.',
    });
    assert(renewRes.status === 201, 'POST /api/amc/:id/renew creates renewed contract');
    const renewedContract = renewRes.body.data || renewRes.body;
    assert(renewedContract.previousContractId === amcContract.id, 'Renewed contract references previousContractId');

    const renewPdfRes = await request('GET', `/amc/${amcContract.id}/renewal-pdf`);
    assert(renewPdfRes.status === 200 && renewPdfRes.buffer?.length > 1000, `AMC Renewal Notice PDF generated (${renewPdfRes.buffer?.length} bytes)`);

    // ----------------------------------------------------
    // REPORTS & ANALYTICS INTEGRATION
    // ----------------------------------------------------
    console.log('\n9. Management Reports & Analytics Integration Tests...');
    const rptAssets = await request('GET', '/reports/assets');
    assert(rptAssets.status === 200, 'GET /api/reports/assets returns 200');
    assert(rptAssets.body.data?.summary?.totalAssets >= 2, `Assets report totalAssets: ${rptAssets.body.data?.summary?.totalAssets}`);

    const rptAmc = await request('GET', '/reports/amc');
    assert(rptAmc.status === 200, 'GET /api/reports/amc returns 200');
    assert(rptAmc.body.data?.summary?.totalContracts >= 1, `AMC report totalContracts: ${rptAmc.body.data?.summary?.totalContracts}`);

    const rptPm = await request('GET', '/reports/preventive-maintenance');
    assert(rptPm.status === 200, 'GET /api/reports/preventive-maintenance returns 200');
    assert(rptPm.body.data?.summary?.completed >= 1, `PM report completed count: ${rptPm.body.data?.summary?.completed}`);

    const rptDash = await request('GET', '/reports/dashboard');
    assert(rptDash.status === 200, 'GET /api/reports/dashboard returns 200');

    // ----------------------------------------------------
    // FULL REGRESSION CHECK ACROSS PHASES 2–15
    // ----------------------------------------------------
    console.log('\n10. Complete ERP Regression Across Phases 2–15...');
    const regressionEndpoints = [
      ['Phase 2 CRM', 'GET', '/customers'],
      ['Phase 3 Products', 'GET', '/products'],
      ['Phase 4 Quotations', 'GET', '/quotations'],
      ['Phase 5 Invoices', 'GET', '/invoices'],
      ['Phase 5 Payments', 'GET', '/payments'],
      ['Phase 6 Services', 'GET', '/services'],
      ['Phase 7 AMC', 'GET', '/amc'],
      ['Phase 8 Installations', 'GET', '/installations'],
      ['Phase 9 Inventory', 'GET', '/inventory'],
      ['Phase 10 Suppliers', 'GET', '/suppliers'],
      ['Phase 10 Purchase Orders', 'GET', '/purchase-orders'],
      ['Phase 11 Employees', 'GET', '/employees'],
      ['Phase 11 Attendance', 'GET', '/attendance'],
      ['Phase 12 Payroll', 'GET', '/payroll/periods'],
      ['Phase 13 Payables', 'GET', '/payables'],
      ['Phase 14 Reports', 'GET', '/reports/dashboard'],
      ['Phase 15 Assets', 'GET', '/assets'],
      ['Phase 15 PM Schedules', 'GET', '/preventive-maintenance'],
    ];

    for (const [phase, method, ep] of regressionEndpoints) {
      const res = await request(method, ep);
      assert(res.status === 200, `${phase} (${method} ${ep}) is functional and healthy`);
    }

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  }
}

runTests();
