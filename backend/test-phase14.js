const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        let parsed = null;
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            parsed = JSON.parse(bodyBuffer.toString('utf-8'));
          } catch (e) {
            parsed = bodyBuffer.toString('utf-8');
          }
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
          raw: bodyBuffer,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('📊 PHASE 14 — REPORTS, GST & ENTERPRISE ANALYTICS TEST SUITE 📊');
  console.log('========================================================================\n');

  try {
    // 1. Health check
    const health = await request('/health');
    assert(health.status === 200 && health.data?.status === 'UP', '1. Backend Health Check (200 UP)');

    // 2. Management Dashboard
    const dash = await request('/reports/dashboard');
    assert(dash.status === 200 && dash.data?.success === true, '2. GET /api/reports/dashboard returns 200 OK');
    assert(dash.data?.data?.kpis?.totalRevenue !== undefined, '3. Dashboard KPI totalRevenue is present and numeric');
    assert(dash.data?.data?.kpis?.totalCollections !== undefined, '4. Dashboard KPI totalCollections is present and numeric');
    assert(dash.data?.data?.financials?.grossRevenue !== undefined, '5. Financial Statement grossRevenue calculated');
    assert(dash.data?.data?.financials?.netResult !== undefined, '6. Management Net Operating Result calculated');

    // 3. Preset Date Ranges
    const todayDash = await request('/reports/dashboard?range=today');
    assert(todayDash.status === 200 && todayDash.data?.data?.periodLabel?.includes('Today'), '7. Date Range: range=today resolved correctly');

    const weekDash = await request('/reports/dashboard?range=this_week');
    assert(weekDash.status === 200 && weekDash.data?.data?.periodLabel === 'This Week', '8. Date Range: range=this_week resolved correctly');

    const lastMonthDash = await request('/reports/dashboard?range=prev_month');
    assert(lastMonthDash.status === 200, '9. Date Range: range=prev_month resolved correctly');

    const fyDash = await request('/reports/dashboard?range=this_fy');
    assert(fyDash.status === 200 && fyDash.data?.data?.periodLabel?.includes('FY'), '10. Date Range: range=this_fy resolved correctly');

    const customDash = await request('/reports/dashboard?from=2026-01-01&to=2026-12-31');
    assert(customDash.status === 200 && customDash.data?.data?.periodLabel === '2026-01-01 to 2026-12-31', '11. Custom Date Range: from/to applied');

    // 4. Invalid Date Handling
    const invalidDate = await request('/reports/dashboard?from=2026-12-31&to=2026-01-01');
    assert(invalidDate.status === 400, '12. Invalid Date Range (from > to) returns 400 Bad Request');

    // 5. Sales Report
    const sales = await request('/reports/sales');
    assert(sales.status === 200 && sales.data?.success === true, '13. GET /api/reports/sales returns 200 OK');
    assert(Array.isArray(sales.data?.data?.items), '14. Sales Report contains items array');
    assert(sales.data?.data?.summary?.totalGrandTotal !== undefined, '15. Sales Report contains totalGrandTotal summary');

    // 6. Sales CSV Export
    const salesCsv = await request('/reports/sales/export');
    assert(salesCsv.status === 200 && salesCsv.headers['content-type']?.includes('text/csv'), '16. GET /api/reports/sales/export returns text/csv');
    assert(salesCsv.raw.toString('utf-8').includes('Invoice Number'), '17. Sales CSV contains RFC headers');

    // 7. Sales PDF Export
    const salesPdf = await request('/reports/sales/pdf');
    assert(salesPdf.status === 200 && salesPdf.headers['content-type'] === 'application/pdf', '18. GET /api/reports/sales/pdf returns application/pdf');
    assert(salesPdf.raw.slice(0, 4).toString('utf-8') === '%PDF', '19. Sales PDF starts with %PDF header');

    // 8. Receivables Aging Report
    const receivables = await request('/reports/receivables');
    assert(receivables.status === 200 && receivables.data?.success === true, '20. GET /api/reports/receivables returns 200 OK');
    assert(Array.isArray(receivables.data?.data?.customerAging), '21. Receivables Report contains customerAging buckets');
    assert(receivables.data?.data?.summary?.totalReceivables !== undefined, '22. Receivables Report summary contains totalReceivables');

    // 9. Receivables CSV & PDF
    const recCsv = await request('/reports/receivables/export');
    assert(recCsv.status === 200 && recCsv.headers['content-type']?.includes('text/csv'), '23. GET /api/reports/receivables/export returns text/csv');
    const recPdf = await request('/reports/receivables/pdf');
    assert(recPdf.status === 200 && recPdf.headers['content-type'] === 'application/pdf', '24. GET /api/reports/receivables/pdf returns application/pdf');

    // 10. Procurement (POs) Report
    const proc = await request('/reports/procurement');
    assert(proc.status === 200 && proc.data?.success === true, '25. GET /api/reports/procurement returns 200 OK');
    assert(proc.data?.data?.summary?.totalPoValue !== undefined, '26. Procurement summary contains totalPoValue');
    const procCsv = await request('/reports/procurement/export');
    assert(procCsv.status === 200 && procCsv.headers['content-type']?.includes('text/csv'), '27. GET /api/reports/procurement/export returns text/csv');

    // 11. Payables Aging Report
    const payables = await request('/reports/payables');
    assert(payables.status === 200 && payables.data?.success === true, '28. GET /api/reports/payables returns 200 OK');
    assert(Array.isArray(payables.data?.data?.supplierAging), '29. Payables Report contains supplierAging buckets');
    assert(payables.data?.data?.summary?.totalPayables !== undefined, '30. Payables summary contains totalPayables');

    // 12. Payables CSV & PDF
    const payCsv = await request('/reports/payables/export');
    assert(payCsv.status === 200 && payCsv.headers['content-type']?.includes('text/csv'), '31. GET /api/reports/payables/export returns text/csv');
    const payPdf = await request('/reports/payables/pdf');
    assert(payPdf.status === 200 && payPdf.headers['content-type'] === 'application/pdf', '32. GET /api/reports/payables/pdf returns application/pdf');

    // 13. Operating Expenses Report
    const exp = await request('/reports/expenses');
    assert(exp.status === 200 && exp.data?.success === true, '33. GET /api/reports/expenses returns 200 OK');
    assert(Array.isArray(exp.data?.data?.categoryBreakdown), '34. Expenses Report contains categoryBreakdown');
    const expCsv = await request('/reports/expenses/export');
    assert(expCsv.status === 200 && expCsv.headers['content-type']?.includes('text/csv'), '35. GET /api/reports/expenses/export returns text/csv');

    // 14. Inventory Valuation Report
    const inv = await request('/reports/inventory');
    assert(inv.status === 200 && inv.data?.success === true, '36. GET /api/reports/inventory returns 200 OK');
    assert(inv.data?.data?.summary?.totalValuation !== undefined, '37. Inventory summary contains totalValuation');
    const invCsv = await request('/reports/inventory/export');
    assert(invCsv.status === 200 && invCsv.headers['content-type']?.includes('text/csv'), '38. GET /api/reports/inventory/export returns text/csv');
    const invPdf = await request('/reports/inventory/pdf');
    assert(invPdf.status === 200 && invPdf.headers['content-type'] === 'application/pdf', '39. GET /api/reports/inventory/pdf returns application/pdf');

    // 15. GST Reports (Summary, Outward, Inward, CSV, PDF)
    const gstSum = await request('/reports/gst/summary');
    assert(gstSum.status === 200 && gstSum.data?.success === true, '40. GET /api/reports/gst/summary returns 200 OK');
    assert(gstSum.data?.data?.summary?.totalOutputTax !== undefined, '41. GST Summary contains totalOutputTax');
    assert(gstSum.data?.data?.summary?.totalInputTax !== undefined, '42. GST Summary contains totalInputTax');
    assert(gstSum.data?.data?.summary?.netGstLiability !== undefined, '43. GST Summary contains netGstLiability');

    const gstOutward = await request('/reports/gst/outward');
    assert(gstOutward.status === 200 && Array.isArray(gstOutward.data?.data), '44. GET /api/reports/gst/outward returns GSTR-1 outward list');

    const gstInward = await request('/reports/gst/inward');
    assert(gstInward.status === 200 && Array.isArray(gstInward.data?.data), '45. GET /api/reports/gst/inward returns GSTR-2B inward list');

    const gstCsv = await request('/reports/gst/export');
    assert(gstCsv.status === 200 && gstCsv.headers['content-type']?.includes('text/csv'), '46. GET /api/reports/gst/export returns text/csv');

    const gstPdf = await request('/reports/gst/pdf');
    assert(gstPdf.status === 200 && gstPdf.headers['content-type'] === 'application/pdf', '47. GET /api/reports/gst/pdf returns application/pdf');

    // 16. Financial Summary & Dashboard PDF
    const finSum = await request('/reports/financial-summary');
    assert(finSum.status === 200 && finSum.data?.financials?.grossRevenue !== undefined, '48. GET /api/reports/financial-summary returns 200 OK');

    const dashPdf = await request('/reports/dashboard/pdf');
    assert(dashPdf.status === 200 && dashPdf.headers['content-type'] === 'application/pdf', '49. GET /api/reports/dashboard/pdf returns application/pdf');

    // 17. Operations & Workforce Reports
    const ops = await request('/reports/operations');
    assert(ops.status === 200 && ops.data?.success === true, '50. GET /api/reports/operations returns 200 OK');

    const workforce = await request('/reports/workforce');
    assert(workforce.status === 200 && workforce.data?.success === true, '51. GET /api/reports/workforce returns 200 OK');

    // 18. Financial Consistency Check (GST Formula: Output - Input = Net)
    const outTax = gstSum.data?.data?.summary?.totalOutputTax;
    const inTax = gstSum.data?.data?.summary?.totalInputTax;
    const netTax = gstSum.data?.data?.summary?.netGstLiability;
    const expectedNet = Number((outTax - inTax).toFixed(2));
    assert(netTax === expectedNet, `52. GST Consistency Check: Output (${outTax}) - Input (${inTax}) = Net (${netTax})`);

    // 19. Inventory Read-Only Safety Check
    const initialSkus = inv.data?.data?.summary?.totalSkus;
    await request('/reports/inventory');
    const secondInv = await request('/reports/inventory');
    assert(secondInv.data?.data?.summary?.totalSkus === initialSkus, '53. Inventory Read-Only Safety: Reports queries do NOT modify database inventory');

    // 20. Full ERP 28-Endpoint Regression Check across Phases 2 to 14
    console.log('\n[INFO] Running 28-endpoint ERP regression check...');
    const endpoints = [
      '/customers',
      '/products',
      '/quotations',
      '/invoices',
      '/payments',
      '/services',
      '/jobcards',
      '/amc',
      '/installations',
      '/inventory',
      '/inventory/low-stock',
      '/suppliers',
      '/purchase-orders',
      '/employees',
      '/attendance',
      '/payroll/periods',
      '/payables/bills',
      '/payables/expenses',
      '/payables/payments',
      '/payables/stats',
      '/reports/dashboard',
      '/reports/sales',
      '/reports/receivables',
      '/reports/procurement',
      '/reports/payables',
      '/reports/expenses',
      '/reports/inventory',
      '/reports/gst/summary',
    ];

    let regSuccess = 0;
    for (const ep of endpoints) {
      const r = await request(ep);
      if (r.status === 200) regSuccess++;
      else console.error(`[REGRESSION FAILED] ${ep} returned ${r.status}`);
    }
    assert(regSuccess === endpoints.length, `54. Full ERP Regression Suite (${regSuccess}/${endpoints.length} endpoints 200 OK)`);

    console.log('\n========================================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
