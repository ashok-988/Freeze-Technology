const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:5000/api';

function request(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath.startsWith('http') ? urlPath : `${BASE_URL}${urlPath}`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = client.request(url, reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        let data = null;
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(bodyBuffer.toString('utf8'));
          } catch (e) {
            data = bodyBuffer.toString('utf8');
          }
        } else {
          data = bodyBuffer;
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          raw: bodyBuffer,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      if (typeof options.body === 'object' && !(options.body instanceof Buffer)) {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(options.body));
      } else {
        req.write(options.body);
      }
    }

    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('======================================================================');
  console.log('PHASE 18 — EXECUTIVE DASHBOARD & BUSINESS INTELLIGENCE AUTOMATED TEST SUITE');
  console.log('======================================================================\n');

  try {
    // 1. Health check
    console.log('Test 1: Backend Health Check');
    const health = await request('/health');
    assert(health.status === 200, `Health check returned status ${health.status}`);

    // 2. Executive Dashboard Consolidated API
    console.log('\nTest 2: Consolidated Executive Dashboard API (GET /api/executive-dashboard)');
    const dashRes = await request('/executive-dashboard');
    assert(dashRes.status === 200, `Executive dashboard returned status 200`);
    assert(dashRes.data && dashRes.data.kpis, `Response contains kpis object`);
    assert(dashRes.data && Array.isArray(dashRes.data.trends), `Response contains trends array`);
    assert(dashRes.data && Array.isArray(dashRes.data.exceptions), `Response contains exceptions array`);
    assert(dashRes.data && dashRes.data.dateRange && dashRes.data.dateRange.label, `Response contains dateRange with label: "${dashRes.data?.dateRange?.label}"`);

    // 3. Date Range Filter Testing
    console.log('\nTest 3: Date Range Filtering & Indian Financial Year Logic');
    const fyRes = await request('/executive-dashboard?period=current_fy');
    assert(fyRes.status === 200 && fyRes.data.dateRange.label.includes('FY'), `Current FY filter works: ${fyRes.data?.dateRange?.label}`);

    const monthRes = await request('/executive-dashboard?period=this_month');
    assert(monthRes.status === 200, `This Month filter works: ${monthRes.data?.dateRange?.label}`);

    const quarterRes = await request('/executive-dashboard?period=this_quarter');
    assert(quarterRes.status === 200 && quarterRes.data.dateRange.label.includes('Q'), `This Quarter filter works: ${quarterRes.data?.dateRange?.label}`);

    const customRes = await request('/executive-dashboard?period=custom&startDate=2026-04-01&endDate=2026-06-30');
    assert(customRes.status === 200, `Custom date range filter works: ${customRes.data?.dateRange?.label}`);

    // 4. Revenue & Sales Calculations
    console.log('\nTest 4: Revenue & Sales Authoritative Calculations');
    const revRes = await request('/executive-dashboard/revenue');
    assert(revRes.status === 200, `Revenue endpoint returned 200`);
    assert(typeof revRes.data.grossSales === 'number', `grossSales is a number (${revRes.data.grossSales})`);
    assert(typeof revRes.data.netTaxableSales === 'number', `netTaxableSales is a number (${revRes.data.netTaxableSales})`);
    assert(typeof revRes.data.outputGst === 'number', `outputGst is a number (${revRes.data.outputGst})`);
    assert(typeof revRes.data.invoiceCount === 'number', `invoiceCount is a number (${revRes.data.invoiceCount})`);

    // 5. Collections & Cash Flow
    console.log('\nTest 5: Collections & Cash Flow Telemetry');
    const colRes = await request('/executive-dashboard/collections');
    assert(colRes.status === 200, `Collections endpoint returned 200`);
    assert(typeof colRes.data.totalCollections === 'number', `totalCollections is a number (${colRes.data.totalCollections})`);
    assert(typeof colRes.data.collectionRate === 'number', `collectionRate is a number (${colRes.data.collectionRate}%)`);
    assert(typeof colRes.data.modeBreakdown === 'object', `modeBreakdown breakdown returned`);

    // 6. Receivables & Aging
    console.log('\nTest 6: Customer Receivables Aging Matrix');
    const recRes = await request('/executive-dashboard/receivables');
    assert(recRes.status === 200, `Receivables endpoint returned 200`);
    assert(typeof recRes.data.totalReceivables === 'number', `totalReceivables is a number (${recRes.data.totalReceivables})`);
    assert(recRes.data.aging && typeof recRes.data.aging.current === 'number', `Aging contains current bucket`);
    assert(recRes.data.aging && typeof recRes.data.aging.days1To30 === 'number', `Aging contains 1-30 days bucket`);
    assert(Array.isArray(recRes.data.topDebtors), `topDebtors returned as array`);

    // 7. Payables & Aging
    console.log('\nTest 7: Vendor Payables Aging Matrix');
    const payRes = await request('/executive-dashboard/payables');
    assert(payRes.status === 200, `Payables endpoint returned 200`);
    assert(typeof payRes.data.totalPayables === 'number', `totalPayables is a number (${payRes.data.totalPayables})`);
    assert(payRes.data.aging && typeof payRes.data.aging.days90Plus === 'number', `Aging contains 90+ days bucket`);
    assert(Array.isArray(payRes.data.topCreditors), `topCreditors returned as array`);

    // 8. Operating Expenses
    console.log('\nTest 8: Operating Expenses Aggregation');
    const expRes = await request('/executive-dashboard/expenses');
    assert(expRes.status === 200, `Expenses endpoint returned 200`);
    assert(typeof expRes.data.totalExpenses === 'number', `totalExpenses is a number (${expRes.data.totalExpenses})`);
    assert(typeof expRes.data.categoryBreakdown === 'object', `categoryBreakdown returned`);

    // 9. Payroll & Workforce
    console.log('\nTest 9: Payroll & Workforce Metrics');
    const payrRes = await request('/executive-dashboard/payroll');
    assert(payrRes.status === 200, `Payroll endpoint returned 200`);
    assert(typeof payrRes.data.totalGrossPayroll === 'number', `totalGrossPayroll is a number (${payrRes.data.totalGrossPayroll})`);
    assert(typeof payrRes.data.employeeCount === 'number', `employeeCount is a number (${payrRes.data.employeeCount})`);

    // 10. Inventory Valuation
    console.log('\nTest 10: Inventory Valuation & Reorder Alerts');
    const invRes = await request('/executive-dashboard/inventory');
    assert(invRes.status === 200, `Inventory endpoint returned 200`);
    assert(typeof invRes.data.totalStockValuation === 'number', `totalStockValuation is a number (${invRes.data.totalStockValuation})`);
    assert(typeof invRes.data.totalSKUs === 'number', `totalSKUs is a number (${invRes.data.totalSKUs})`);
    assert(typeof invRes.data.categoryValuation === 'object', `categoryValuation returned`);

    // 11. Procurement
    console.log('\nTest 11: Procurement & Purchase Orders');
    const procRes = await request('/executive-dashboard/procurement');
    assert(procRes.status === 200, `Procurement endpoint returned 200`);
    assert(typeof procRes.data.totalPOValue === 'number', `totalPOValue is a number`);

    // 12. Service Operations
    console.log('\nTest 12: Field Service Operations Workload');
    const srvRes = await request('/executive-dashboard/service');
    assert(srvRes.status === 200, `Service endpoint returned 200`);
    assert(typeof srvRes.data.totalTickets === 'number', `totalTickets is a number`);

    // 13. AMC Contracts Portfolio
    console.log('\nTest 13: AMC Contracts Portfolio & Expiring Tracking');
    const amcRes = await request('/executive-dashboard/amc');
    assert(amcRes.status === 200, `AMC endpoint returned 200`);
    assert(typeof amcRes.data.activeContractsCount === 'number', `activeContractsCount is a number`);
    assert(typeof amcRes.data.totalPortfolioValue === 'number', `totalPortfolioValue is a number`);

    // 14. Asset Management & Warranty
    console.log('\nTest 14: Asset Fleet Health & Warranty Tracking');
    const astRes = await request('/executive-dashboard/assets');
    assert(astRes.status === 200, `Assets endpoint returned 200`);
    assert(typeof astRes.data.totalAssets === 'number', `totalAssets is a number`);

    // 15. Preventive Maintenance
    console.log('\nTest 15: Preventive Maintenance Execution');
    const pmRes = await request('/executive-dashboard/preventive-maintenance');
    assert(pmRes.status === 200, `PM endpoint returned 200`);
    assert(typeof pmRes.data.completionRate === 'number', `completionRate is a number (${pmRes.data.completionRate}%)`);

    // 16. GST Summary
    console.log('\nTest 16: GST Summary & Net Tax Liability');
    const gstRes = await request('/executive-dashboard/gst');
    assert(gstRes.status === 200, `GST endpoint returned 200`);
    assert(typeof gstRes.data.outputGST === 'number', `outputGST is a number`);
    assert(typeof gstRes.data.inputGST === 'number', `inputGST is a number`);
    assert(typeof gstRes.data.netGSTLiability === 'number', `netGSTLiability is a number`);

    // 17. Management Profitability
    console.log('\nTest 17: Management Profitability Formulas');
    const profRes = await request('/executive-dashboard/profitability');
    assert(profRes.status === 200, `Profitability endpoint returned 200`);
    assert(typeof profRes.data.grossMargin === 'number', `grossMargin calculated (${profRes.data.grossMargin})`);
    assert(typeof profRes.data.netOperatingResult === 'number', `netOperatingResult calculated (${profRes.data.netOperatingResult})`);
    assert(typeof profRes.data.grossMarginPercent === 'number', `grossMarginPercent calculated (${profRes.data.grossMarginPercent}%)`);

    // 18. 12-Month Trends
    console.log('\nTest 18: 12-Month Historical Performance Trends');
    const trendRes = await request('/executive-dashboard/trends');
    assert(trendRes.status === 200 && Array.isArray(trendRes.data), `Trends returned 200 with array of length ${trendRes.data.length}`);
    assert(trendRes.data.length === 12, `Exactly 12 monthly trend data points returned`);

    // 19. Critical Management Exceptions
    console.log('\nTest 19: Management Exceptions & Critical Alerts');
    const excRes = await request('/executive-dashboard/exceptions');
    assert(excRes.status === 200 && Array.isArray(excRes.data), `Exceptions returned 200 with array`);

    // 20. Executive PDF Generation
    console.log('\nTest 20: Executive Management PDF Export (GET /api/executive-dashboard/pdf)');
    const pdfRes = await request('/executive-dashboard/pdf');
    assert(pdfRes.status === 200, `PDF endpoint returned status 200`);
    assert(
      (pdfRes.headers['content-type'] || '').includes('application/pdf'),
      `Content-Type header is application/pdf: ${pdfRes.headers['content-type']}`,
    );
    assert(pdfRes.raw && pdfRes.raw.length > 500, `PDF binary content generated (size: ${pdfRes.raw?.length} bytes)`);

    // 21. Audit Logging of PDF Export
    console.log('\nTest 21: AuditLog Verification for Executive PDF Export');
    const auditRes = await request('/settings/audit-logs?moduleName=EXECUTIVE_DASHBOARD');
    assert(auditRes.status === 200, `Audit logs endpoint returned 200`);
    const logs = auditRes.data?.items || auditRes.data?.data || (Array.isArray(auditRes.data) ? auditRes.data : []);
    const exportLog = logs.find((l) => l.action === 'EXPORT_PDF' && l.moduleName === 'EXECUTIVE_DASHBOARD');
    assert(exportLog !== undefined, `AuditLog captured EXPORT_PDF event for EXECUTIVE_DASHBOARD`);

    // 22. Phase 2-17 Full Regression Suite
    console.log('\nTest 22: Full ERP Regression Suite (Phases 2 - 17 Endpoints)');
    const regressionEndpoints = [
      ['/customers', 'Phase 2 CRM & Customers'],
      ['/products', 'Phase 3 Product Catalog'],
      ['/quotations', 'Phase 4 Quotations'],
      ['/invoices', 'Phase 5 GST Invoices'],
      ['/payments', 'Phase 5 Payments'],
      ['/services', 'Phase 6 Service Job Cards'],
      ['/amc', 'Phase 7 AMC Contracts'],
      ['/installations', 'Phase 8 Installations'],
      ['/inventory', 'Phase 9 Stock & Inventory'],
      ['/suppliers', 'Phase 10 Suppliers'],
      ['/purchase-orders', 'Phase 10 Purchase Orders'],
      ['/employees', 'Phase 11 Employees'],
      ['/attendance', 'Phase 11 Attendance'],
      ['/payroll', 'Phase 12 Payroll'],
      ['/payables', 'Phase 13 Accounts Payable'],
      ['/reports/dashboard', 'Phase 14 Reports & GST'],
      ['/assets', 'Phase 15 Asset Management'],
      ['/preventive-maintenance', 'Phase 15 Preventive Maintenance'],
      ['/notifications', 'Phase 16 Notifications'],
      ['/users', 'Phase 17 Users'],
      ['/roles', 'Phase 17 Roles & Permissions'],
      ['/settings/company', 'Phase 17 Company Settings'],
      ['/settings/system', 'Phase 17 System Settings'],
    ];

    for (const [ep, label] of regressionEndpoints) {
      const r = await request(ep);
      assert(r.status === 200 || r.status === 304, `${label} (${ep}) returned ${r.status}`);
    }

    console.log('\n======================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log('======================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
}

runTests();
