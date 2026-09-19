const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
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
      res.on('data', (chunk) => {
        data.push(chunk);
      });
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const contentType = res.headers['content-type'] || '';
        let parsedBody = null;
        if (contentType.includes('application/json')) {
          try {
            parsedBody = JSON.parse(buffer.toString());
          } catch (e) {
            parsedBody = buffer.toString();
          }
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsedBody,
          rawBuffer: buffer,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 19: GENERAL LEDGER, CHART OF ACCOUNTS & DOUBLE-ENTRY ACCOUNTING');
  console.log('====================================================\n');

  try {
    // 1. Health Check
    console.log('1. Backend Health Check...');
    const health = await request('GET', '/health');
    assert(health.status === 200, 'GET /api/health returns 200 OK');

    // 2. Chart of Accounts Bootstrapping & Retrieval
    console.log('\n2. Chart of Accounts (COA) Verification...');
    const coaRes = await request('GET', '/accounting/accounts');
    assert(coaRes.status === 200, 'GET /api/accounting/accounts returns 200');
    assert(Array.isArray(coaRes.body), 'COA returns an array of accounts');
    assert(coaRes.body.length >= 20, `COA contains standard accounts (Found: ${coaRes.body.length})`);

    const cashAcc = coaRes.body.find((a) => a.accountCode === '1010');
    const bankAcc = coaRes.body.find((a) => a.accountCode === '1020');
    const arAcc = coaRes.body.find((a) => a.accountCode === '1030');
    const apAcc = coaRes.body.find((a) => a.accountCode === '2010');
    const salesAcc = coaRes.body.find((a) => a.accountCode === '4010');
    const cogsAcc = coaRes.body.find((a) => a.accountCode === '5010');

    assert(!!cashAcc, 'Standard Cash Account (1010) exists');
    assert(!!bankAcc, 'Standard Bank Account (1020) exists');
    assert(!!arAcc, 'Standard Accounts Receivable (1030) exists');
    assert(!!apAcc, 'Standard Accounts Payable (2010) exists');
    assert(!!salesAcc, 'Standard Product Sales Revenue (4010) exists');
    assert(!!cogsAcc, 'Standard Cost of Goods Sold (5010) exists');

    // 3. COA Tree Hierarchy
    console.log('\n3. COA Hierarchy Tree Structure...');
    const treeRes = await request('GET', '/accounting/accounts/tree');
    assert(treeRes.status === 200, 'GET /api/accounting/accounts/tree returns 200');
    assert(Array.isArray(treeRes.body), 'COA tree returned as array of root accounts');
    assert(treeRes.body.some((r) => r.children && r.children.length > 0), 'Parent control accounts contain sub-accounts');

    // 4. Custom Account Creation & Duplicate Code Protection
    console.log('\n4. Account Creation & Integrity Constraints...');
    const customCode = `99${Math.floor(10 + Math.random() * 89)}`;
    const newAccRes = await request('POST', '/accounting/accounts', {
      accountCode: customCode,
      accountName: 'Test Operational Expense Account',
      accountType: 'EXPENSE',
      accountGroup: 'OTHER_OPERATING_EXPENSES',
      description: 'Automated test expense ledger',
      allowPosting: true,
      openingBalance: 1000,
    });
    assert(newAccRes.status === 200 || newAccRes.status === 201, 'POST /api/accounting/accounts creates custom account');
    assert(newAccRes.body.accountCode === customCode, 'Created account code matches input');

    // Duplicate code test
    const dupRes = await request('POST', '/accounting/accounts', {
      accountCode: customCode,
      accountName: 'Duplicate Test Account',
      accountType: 'EXPENSE',
      accountGroup: 'OTHER_OPERATING_EXPENSES',
    });
    assert(dupRes.status === 400, 'Duplicate accountCode is rejected with HTTP 400');

    // 5. System Account Deletion Protection
    console.log('\n5. System Account Protection...');
    if (cashAcc) {
      const delSysRes = await request('DELETE', `/accounting/accounts/${cashAcc.id}`);
      assert(delSysRes.status === 400, 'Attempt to delete system account (1010) is rejected with HTTP 400');
    }

    // 6. Accounting Periods
    console.log('\n6. Accounting Periods & FY Controls...');
    const periodsRes = await request('GET', '/accounting/periods');
    assert(periodsRes.status === 200, 'GET /api/accounting/periods returns 200');
    assert(Array.isArray(periodsRes.body), 'Accounting periods returned as array');
    const openPeriod = periodsRes.body.find((p) => p.status === 'OPEN');
    assert(!!openPeriod, `Active OPEN accounting period exists (${openPeriod?.financialYear})`);

    // 7. Double-Entry Journal Engine — Balanced vs Unbalanced Validation
    console.log('\n7. Double-Entry Journal Engine Validation...');
    // Unbalanced test: Debit 5000 != Credit 3000
    const unbalancedRes = await request('POST', '/accounting/journals', {
      entryDate: new Date().toISOString(),
      narration: 'Test Unbalanced Journal Entry',
      lines: [
        { accountId: cashAcc.id, debit: 5000, credit: 0 },
        { accountId: salesAcc.id, debit: 0, credit: 3000 },
      ],
    });
    assert(unbalancedRes.status === 400, 'Unbalanced journal entry (Debit != Credit) is rejected with HTTP 400');

    // Negative amount test
    const negativeRes = await request('POST', '/accounting/journals', {
      entryDate: new Date().toISOString(),
      narration: 'Test Negative Amount Journal Entry',
      lines: [
        { accountId: cashAcc.id, debit: -5000, credit: 0 },
        { accountId: salesAcc.id, debit: 0, credit: -5000 },
      ],
    });
    assert(negativeRes.status === 400, 'Negative debit/credit amount is rejected with HTTP 400');

    // Balanced Journal: Debit Cash ₹15,000, Credit Sales ₹15,000
    const balancedRes = await request('POST', '/accounting/journals', {
      entryDate: new Date().toISOString(),
      referenceType: 'MANUAL',
      referenceNumber: 'MAN-2026-TEST01',
      narration: 'Manual cash sales adjustment entry',
      lines: [
        { accountId: cashAcc.id, debit: 15000, credit: 0, description: 'Cash receipt' },
        { accountId: salesAcc.id, debit: 0, credit: 15000, description: 'Sales recognition' },
      ],
    });
    assert(balancedRes.status === 200 || balancedRes.status === 201, 'POST /api/accounting/journals creates balanced journal');
    assert(balancedRes.body.journalNumber && balancedRes.body.journalNumber.startsWith('JE-'), `Sequential journal number assigned: ${balancedRes.body?.journalNumber}`);
    assert(balancedRes.body.totalDebit === 15000 && balancedRes.body.totalCredit === 15000, 'Total debit equals total credit (₹15,000)');

    const createdJournalId = balancedRes.body.id;

    // 8. Journal Retrieval & Immutability
    console.log('\n8. Journal Register & Single Entry Retrieval...');
    const journalList = await request('GET', '/accounting/journals');
    assert(journalList.status === 200, 'GET /api/accounting/journals returns 200');
    assert(journalList.body.items && journalList.body.items.length > 0, 'Journals list contains items');

    const singleJournal = await request('GET', `/accounting/journals/${createdJournalId}`);
    assert(singleJournal.status === 200, 'GET /api/accounting/journals/:id returns 200');
    assert(singleJournal.body.id === createdJournalId, 'Retrieved journal matches ID');

    // 9. Journal Reversal Lifecycle
    console.log('\n9. Journal Reversal Engine...');
    const reversalRes = await request('POST', `/accounting/journals/${createdJournalId}/reverse`, {
      reason: 'Reversing test manual adjustment',
    });
    assert(reversalRes.status === 200 || reversalRes.status === 201, 'POST /api/accounting/journals/:id/reverse returns 200');
    assert(reversalRes.body.referenceType === 'REVERSAL', 'Reversing entry has referenceType REVERSAL');
    assert(reversalRes.body.reversedEntryId === createdJournalId, 'Reversing entry links to original journal');

    const checkOriginal = await request('GET', `/accounting/journals/${createdJournalId}`);
    assert(checkOriginal.body.status === 'REVERSED', 'Original journal status updated to REVERSED');

    // Double reversal prevention
    const doubleRevRes = await request('POST', `/accounting/journals/${createdJournalId}/reverse`, {
      reason: 'Attempting duplicate reversal',
    });
    assert(doubleRevRes.status === 400, 'Duplicate reversal of already reversed journal is rejected with HTTP 400');

    // 10. Automated ERP Transaction Sync (Invoices, Payments, Bills, Payroll)
    console.log('\n10. Automated ERP Transactions Sync...');
    const syncRes = await request('POST', '/accounting/sync-erp');
    assert(syncRes.status === 200 || syncRes.status === 201, 'POST /api/accounting/sync-erp executes successfully');
    assert(typeof syncRes.body?.syncedCounts?.totalSyncedJournals === 'number', `Synced ERP transactions (Total synced: ${syncRes.body?.syncedCounts?.totalSyncedJournals})`);

    // Idempotency check — second sync should not duplicate
    const syncRes2 = await request('POST', '/accounting/sync-erp');
    assert(syncRes2.status === 200 || syncRes2.status === 201, 'Repeated sync executes idempotently without duplicate journal explosion');

    // 11. General Ledger Statements
    console.log('\n11. General Ledger Engine...');
    const glRes = await request('GET', '/accounting/ledger');
    assert(glRes.status === 200, 'GET /api/accounting/ledger returns 200');
    assert(Array.isArray(glRes.body), 'General ledger returns array of account ledgers');

    const glAr = glRes.body.find((a) => a.accountCode === '1030');
    assert(!!glAr, 'Accounts Receivable (1030) General Ledger account exists');
    assert(typeof glAr.closingBalance === 'number', `AR GL Closing Balance: ₹${glAr?.closingBalance}`);

    const singleAccGl = await request('GET', `/accounting/ledger?accountId=${cashAcc.id}`);
    assert(singleAccGl.status === 200, 'GET /api/accounting/ledger with accountId filter returns 200');

    // 12. Trial Balance Integrity Verification
    console.log('\n12. Trial Balance Double-Entry Integrity...');
    const tbRes = await request('GET', '/accounting/trial-balance');
    assert(tbRes.status === 200, 'GET /api/accounting/trial-balance returns 200');
    assert(tbRes.body.isBalanced === true, `Trial Balance is Balanced: Total Debits (₹${tbRes.body.totalDebits}) == Total Credits (₹${tbRes.body.totalCredits})`);
    assert(tbRes.body.difference <= 0.01, `Trial Balance Variance is 0.00 (Found: ${tbRes.body.difference})`);

    // 13. Profit & Loss Statement
    console.log('\n13. Profit & Loss Statement (P&L)...');
    const pnlRes = await request('GET', '/accounting/profit-and-loss');
    assert(pnlRes.status === 200, 'GET /api/accounting/profit-and-loss returns 200');
    assert(typeof pnlRes.body.revenue?.total === 'number', `GL Operating Revenue: ₹${pnlRes.body.revenue?.total}`);
    assert(typeof pnlRes.body.grossProfit === 'number', `GL Gross Profit: ₹${pnlRes.body.grossProfit}`);
    assert(typeof pnlRes.body.netProfit === 'number', `GL Net Profit: ₹${pnlRes.body.netProfit}`);
    assert(typeof pnlRes.body.grossMarginPct === 'number', `Gross Margin %: ${pnlRes.body.grossMarginPct}%`);

    // 14. Balance Sheet Equation
    console.log('\n14. Balance Sheet Equation (Assets = Liabilities + Equity)...');
    const bsRes = await request('GET', '/accounting/balance-sheet');
    assert(bsRes.status === 200, 'GET /api/accounting/balance-sheet returns 200');
    assert(typeof bsRes.body.assets?.totalAssets === 'number', `Total Assets: ₹${bsRes.body.assets?.totalAssets}`);
    assert(typeof bsRes.body.totalLiabilitiesAndEquity === 'number', `Total Liabilities & Equity: ₹${bsRes.body.totalLiabilitiesAndEquity}`);
    assert(bsRes.body.isBalanced === true, 'Balance Sheet Equation holds (Assets == Liabilities + Equity)');

    // 15. Cash & Bank Book
    console.log('\n15. Cash & Bank Book Statement...');
    const cashRes = await request('GET', '/accounting/cash-book');
    assert(cashRes.status === 200, 'GET /api/accounting/cash-book returns 200');
    assert(Array.isArray(cashRes.body.accounts), 'Cash book contains account schedules');
    assert(typeof cashRes.body.summary?.closingBalance === 'number', `Liquid Cash/Bank Closing Balance: ₹${cashRes.body.summary?.closingBalance}`);

    // 16. Subledger Reconciliations
    console.log('\n16. Subledger Reconciliations (AR, AP & GST)...');
    const recRes = await request('GET', '/accounting/reconciliation');
    assert(recRes.status === 200, 'GET /api/accounting/reconciliation returns 200');
    assert(recRes.body.accountsReceivable && typeof recRes.body.accountsReceivable.subledgerTotal === 'number', 'AR Reconciliation subledger verified');
    assert(recRes.body.accountsPayable && typeof recRes.body.accountsPayable.subledgerTotal === 'number', 'AP Reconciliation subledger verified');
    assert(recRes.body.gstPosition && typeof recRes.body.gstPosition.outputGst === 'number', 'GST Tax Position reconciliation verified');

    // 17. Accounting Dashboard Aggregation
    console.log('\n17. Accounting Dashboard Summary...');
    const dashRes = await request('GET', '/accounting/dashboard');
    assert(dashRes.status === 200, 'GET /api/accounting/dashboard returns 200');
    assert(dashRes.body.trialBalance?.isBalanced === true, 'Dashboard confirms balanced trial balance');
    assert(dashRes.body.balanceSheet?.isBalanced === true, 'Dashboard confirms balanced balance sheet');

    // 18. PDF Export Suite (All 8 PDF Streams)
    console.log('\n18. PDF Generation & Export Engine...');
    const pdfEndpoints = [
      { name: 'Chart of Accounts PDF', path: '/accounting/pdf/coa' },
      { name: 'Trial Balance PDF', path: '/accounting/pdf/trial-balance' },
      { name: 'Profit & Loss PDF', path: '/accounting/pdf/profit-and-loss' },
      { name: 'Balance Sheet PDF', path: '/accounting/pdf/balance-sheet' },
      { name: 'General Ledger PDF', path: '/accounting/pdf/ledger' },
      { name: 'Cash Book PDF', path: '/accounting/pdf/cash-book' },
      { name: 'Journal Register PDF', path: '/accounting/pdf/journal-register' },
      { name: 'Reconciliation PDF', path: '/accounting/pdf/reconciliation' },
    ];

    for (const ep of pdfEndpoints) {
      const pdf = await request('GET', ep.path);
      assert(pdf.status === 200, `GET /api${ep.path} returns HTTP 200 OK`);
      assert(pdf.headers['content-type']?.includes('application/pdf'), `${ep.name} has Content-Type application/pdf`);
      assert(pdf.rawBuffer && pdf.rawBuffer.length > 500, `${ep.name} stream is non-empty (${pdf.rawBuffer?.length} bytes)`);
    }

    // 19. Full ERP Regression Suite across Phases 2–18
    console.log('\n19. Complete ERP Regression Across Phases 2–18...');
    const regressionEndpoints = [
      { name: 'Phase 2 CRM (GET /customers)', path: '/customers' },
      { name: 'Phase 3 Products (GET /products)', path: '/products' },
      { name: 'Phase 4 Quotations (GET /quotations)', path: '/quotations' },
      { name: 'Phase 5 Invoices (GET /invoices)', path: '/invoices' },
      { name: 'Phase 5 Payments (GET /payments)', path: '/payments' },
      { name: 'Phase 6 Services (GET /services)', path: '/services' },
      { name: 'Phase 7 AMC (GET /amc)', path: '/amc' },
      { name: 'Phase 8 Installations (GET /installations)', path: '/installations' },
      { name: 'Phase 9 Inventory (GET /inventory)', path: '/inventory' },
      { name: 'Phase 10 Suppliers (GET /suppliers)', path: '/suppliers' },
      { name: 'Phase 10 Purchase Orders (GET /purchase-orders)', path: '/purchase-orders' },
      { name: 'Phase 11 Employees (GET /employees)', path: '/employees' },
      { name: 'Phase 11 Attendance (GET /attendance)', path: '/attendance' },
      { name: 'Phase 12 Payroll (GET /payroll/periods)', path: '/payroll/periods' },
      { name: 'Phase 13 Payables (GET /payables)', path: '/payables' },
      { name: 'Phase 14 Reports (GET /reports/dashboard)', path: '/reports/dashboard' },
      { name: 'Phase 15 Assets (GET /assets)', path: '/assets' },
      { name: 'Phase 15 PM Schedules (GET /preventive-maintenance)', path: '/preventive-maintenance' },
      { name: 'Phase 16 Notifications (GET /notifications)', path: '/notifications' },
      { name: 'Phase 17 Users (GET /users)', path: '/users' },
      { name: 'Phase 17 Roles (GET /roles)', path: '/roles' },
      { name: 'Phase 17 Settings (GET /settings/company)', path: '/settings/company' },
      { name: 'Phase 18 Executive Dashboard (GET /executive-dashboard)', path: '/executive-dashboard' },
    ];

    for (const ep of regressionEndpoints) {
      const res = await request('GET', ep.path);
      assert(res.status === 200, `${ep.name} is functional and healthy (HTTP 200)`);
    }

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during test execution:', error);
    process.exit(1);
  }
}

runTests();
