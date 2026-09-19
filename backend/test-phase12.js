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
  console.log('🚀 PHASE 12 PAYROLL & SALARY MANAGEMENT TEST SUITE 🚀');
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

    // 2. Active employee discovery
    const empList = await get('/employees?status=ACTIVE');
    assert(
      empList.status === 200 && Array.isArray(empList.data?.data) && empList.data?.data?.length > 0,
      '2. Active Employee Discovery',
      `Found ${empList.data?.data?.length} active employees`,
    );
    const firstEmp = empList.data?.data[0];

    // 3. Attendance integration check
    const attList = await get('/attendance');
    assert(attList.status === 200 && Array.isArray(attList.data?.data), '3. Attendance Discovery');

    // 4. Payroll period creation
    // Use an uncolliding test month (e.g. Month 11 / November 2026)
    const testMonth = 11;
    const testYear = 2026;
    const createPeriodRes = await post('/payroll/periods', {
      month: testMonth,
      year: testYear,
      remarks: 'Automated Test November 2026 Run',
    });
    assert(
      createPeriodRes.status === 201 &&
        createPeriodRes.data?.data?.payrollNumber?.startsWith('PAY-2026-') &&
        createPeriodRes.data?.data?.status === 'DRAFT',
      '4. Payroll Period Creation (PAY-2026-XXXX in DRAFT status)',
      `Number: ${createPeriodRes.data?.data?.payrollNumber}`,
    );
    const periodId = createPeriodRes.data?.data?.id;
    const payrollNumber = createPeriodRes.data?.data?.payrollNumber;

    // 5. Duplicate payroll period rejection for same month/year
    const dupPeriodRes = await post('/payroll/periods', {
      month: testMonth,
      year: testYear,
    });
    assert(
      dupPeriodRes.status === 409,
      '5. Duplicate Payroll Period Rejection for Same Month/Year (409 Conflict)',
    );

    // 6. Automatic payroll calculation
    const calcRes = await post(`/payroll/${periodId}/calculate`, {
      standardWorkingDays: 26,
    });
    assert(
      calcRes.status === 200 &&
        calcRes.data?.data?.status === 'CALCULATED' &&
        calcRes.data?.data?.totalEmployees > 0,
      '6. Automatic Payroll Calculation Trigger',
      `Calculated for ${calcRes.data?.data?.totalEmployees} staff`,
    );

    // 7. Payroll record generation for active staff
    const recordsRes = await get(`/payroll/${periodId}/records`);
    assert(
      recordsRes.status === 200 &&
        Array.isArray(recordsRes.data?.data) &&
        recordsRes.data?.data?.length === calcRes.data?.data?.totalEmployees,
      '7. Payroll Record Generation for All Active Staff',
    );
    const testRecord = recordsRes.data?.data[0];

    // 8. Basic Salary (50%) & Allowances calculation breakdown
    const monthlySalary = testRecord.employee?.salary || 25000;
    const expectedBasic = Number((monthlySalary * 0.50).toFixed(2));
    const expectedHra = Number((monthlySalary * 0.25).toFixed(2));
    const expectedConveyance = Number((monthlySalary * 0.10).toFixed(2));
    const expectedSpecial = Number((monthlySalary * 0.15).toFixed(2));

    assert(
      testRecord.basicSalary === expectedBasic &&
        testRecord.hra === expectedHra &&
        testRecord.conveyance === expectedConveyance &&
        testRecord.specialAllowance === expectedSpecial,
      '8. Basic Salary (50%), HRA (25%), Conveyance (10%), Special (15%) Breakdown',
      `Basic: ${testRecord.basicSalary}, HRA: ${testRecord.hra}`,
    );

    // 9. Attendance-based Loss of Pay (LOP) calculation
    const expectedDailyRate = monthlySalary / 26;
    const expectedLop = Number((expectedDailyRate * testRecord.absentDays).toFixed(2));
    assert(
      testRecord.lossOfPay === expectedLop,
      '9. Attendance-Based Loss of Pay (LOP) Computation',
      `LOP: ${testRecord.lossOfPay}`,
    );

    // 10. Overtime calculation from attendance minutes
    const hourlyRate = monthlySalary / (26 * 8);
    const expectedOtAmount = Number((testRecord.overtimeHours * hourlyRate * 1.5).toFixed(2));
    assert(
      testRecord.overtimeAmount === expectedOtAmount,
      '10. Overtime Calculation (1.5x Hourly Rate)',
      `OT Hours: ${testRecord.overtimeHours}h, OT Pay: ${testRecord.overtimeAmount}`,
    );

    // 11. Manual deduction & allowance adjustments
    const adjustRes = await patch(`/payroll/${periodId}/records/${testRecord.employeeId}`, {
      otherAllowance: 2000,
      advanceDeduction: 1500,
      loanDeduction: 500,
      remarks: 'Performance bonus & advance recovery',
    });
    assert(
      adjustRes.status === 200 &&
        adjustRes.data?.data?.otherAllowance === 2000 &&
        adjustRes.data?.data?.advanceDeduction === 1500 &&
        adjustRes.data?.data?.loanDeduction === 500,
      '11. Manual Allowance & Deduction Adjustments',
    );
    const updatedTestRecord = adjustRes.data?.data;

    // 12. Net salary calculation accuracy
    const expectedGross = Number(
      (
        updatedTestRecord.basicSalary +
        updatedTestRecord.hra +
        updatedTestRecord.conveyance +
        updatedTestRecord.specialAllowance +
        updatedTestRecord.otherAllowance +
        updatedTestRecord.overtimeAmount
      ).toFixed(2),
    );
    const expectedDeductions = Number(
      (
        updatedTestRecord.lossOfPay +
        updatedTestRecord.advanceDeduction +
        updatedTestRecord.loanDeduction +
        updatedTestRecord.otherDeduction
      ).toFixed(2),
    );
    const expectedNet = Math.max(0, Number((expectedGross - expectedDeductions).toFixed(2)));

    assert(
      updatedTestRecord.grossSalary === expectedGross &&
        updatedTestRecord.totalDeductions === expectedDeductions &&
        updatedTestRecord.netSalary === expectedNet,
      '12. Precise Monetary Net Salary Computation (Gross - Deductions = Net)',
      `Gross: ${updatedTestRecord.grossSalary}, Ded: ${updatedTestRecord.totalDeductions}, Net: ${updatedTestRecord.netSalary}`,
    );

    // 13. Payroll totals aggregation
    const periodWithTotals = await get(`/payroll/${periodId}`);
    assert(
      periodWithTotals.status === 200 &&
        periodWithTotals.data?.data?.totalGrossSalary > 0 &&
        periodWithTotals.data?.data?.totalNetSalary > 0,
      '13. Period Totals Aggregation (Gross, Deductions, Net)',
    );

    // 14. Payroll period retrieval by ID and sequential number
    const getById = await get(`/payroll/${periodId}`);
    const getByNum = await get(`/payroll/${payrollNumber}`);
    assert(
      getById.status === 200 && getByNum.status === 200 && getById.data?.data?.id === periodId,
      '14. Payroll Retrieval by ID and PAY-2026-XXXX Number',
    );

    // 15. Payroll records retrieval with search
    const searchRecords = await get(`/payroll/${periodId}/records?search=${encodeURIComponent(testRecord.employeeName)}`);
    assert(
      searchRecords.status === 200 && searchRecords.data?.data?.length >= 1,
      '15. Payroll Records Search by Employee Name',
    );

    // 16. Single employee record retrieval
    const getSingleRecord = await get(`/payroll/${periodId}/records/${testRecord.employeeId}`);
    assert(
      getSingleRecord.status === 200 && getSingleRecord.data?.data?.employeeId === testRecord.employeeId,
      '16. Single Employee Payroll Record Retrieval',
    );

    // 17. Recalculation preserving adjustments
    const recalcRes = await post(`/payroll/${periodId}/calculate`, {
      standardWorkingDays: 26,
    });
    const recheckedRecord = await get(`/payroll/${periodId}/records/${testRecord.employeeId}`);
    assert(
      recalcRes.status === 200 && recheckedRecord.data?.data?.otherAllowance === 2000,
      '17. Recalculation Preserving Existing Manual Adjustments',
    );

    // 18. Payment rejection before approval
    const unapprovedPayRes = await post(`/payroll/${periodId}/mark-paid`, {
      paymentMethod: 'Bank Transfer',
    });
    assert(
      unapprovedPayRes.status === 400,
      '18. Payment Rejection Before Formal Approval (400 Bad Request)',
    );

    // 19. Approval workflow
    const approveRes = await post(`/payroll/${periodId}/approve`, {
      remarks: 'Reviewed and verified by Finance Lead',
    });
    assert(
      approveRes.status === 200 &&
        approveRes.data?.data?.status === 'APPROVED' &&
        approveRes.data?.data?.approvedAt !== null,
      '19. Payroll Approval Workflow (Status -> APPROVED, approvedAt set)',
    );

    // 20. Duplicate approval rejection
    const dupApproveRes = await post(`/payroll/${periodId}/approve`);
    assert(
      dupApproveRes.status === 409,
      '20. Duplicate Approval Rejection (409 Conflict)',
    );

    // 21. Edit lock enforcement on APPROVED payroll
    const lockedEditRes = await patch(`/payroll/${periodId}/records/${testRecord.employeeId}`, {
      otherAllowance: 5000,
    });
    assert(
      lockedEditRes.status === 400,
      '21. Edit Lock Enforcement on APPROVED Payroll (400 Bad Request)',
    );

    // 22. Recalculation rejection on APPROVED payroll
    const lockedCalcRes = await post(`/payroll/${periodId}/calculate`);
    assert(
      lockedCalcRes.status === 400,
      '22. Recalculation Rejection on APPROVED Payroll (400 Bad Request)',
    );

    // 23. PDF payslip generation endpoint
    const payslipPdf = await get(`/payroll/${periodId}/records/${testRecord.employeeId}/payslip`);
    assert(
      payslipPdf.status === 200 && payslipPdf.isPdf === true && payslipPdf.length > 500,
      '23. Professional PDF Payslip Generation (application/pdf stream)',
      `PDF Size: ${payslipPdf.length} bytes`,
    );

    // 24. Mark as PAID workflow
    const markPaidRes = await post(`/payroll/${periodId}/mark-paid`, {
      paymentMethod: 'Bank Transfer',
      paymentReference: 'AXIS-NEFT-881923',
      remarks: 'Salaries disbursed via corporate netbanking',
    });
    assert(
      markPaidRes.status === 200 &&
        markPaidRes.data?.data?.status === 'PAID' &&
        markPaidRes.data?.data?.paidAt !== null,
      '24. Salary Disbursement & Mark as PAID Workflow',
    );

    // 25. Duplicate payment rejection
    const dupPaidRes = await post(`/payroll/${periodId}/mark-paid`, {
      paymentMethod: 'Bank Transfer',
    });
    assert(
      dupPaidRes.status === 400,
      '25. Duplicate Disbursal Rejection on PAID Payroll (400 Bad Request)',
    );

    // 26. Cancellation rejection on PAID payroll
    const cancelPaidRes = await post(`/payroll/${periodId}/cancel`);
    assert(
      cancelPaidRes.status === 400,
      '26. Cancellation Rejection on PAID Payroll (400 Bad Request)',
    );

    // 27. Payroll live statistics
    const statsRes = await get('/payroll/stats');
    assert(
      statsRes.status === 200 &&
        typeof statsRes.data?.data?.totalPeriods === 'number' &&
        typeof statsRes.data?.data?.totalNetPaidAllTime === 'number',
      '27. Live Database Payroll Analytics & KPIs',
    );

    // 28. Employee & Attendance cross-module regression
    const empCheck = await get('/employees');
    const attCheck = await get('/attendance');
    assert(
      empCheck.status === 200 && attCheck.status === 200,
      '28. Employee & Attendance Cross-Module Integration Integrity',
    );

    // 29. Full ERP 25-Endpoint Regression Check (Phases 2 to 12)
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
    ];

    let erpPassed = 0;
    for (const ep of erpEndpoints) {
      const res = await get(ep);
      if (res.status >= 200 && res.status < 300) {
        erpPassed++;
      } else {
        console.error(`Endpoint failed: ${ep} (${res.status})`);
      }
    }

    assert(
      erpPassed === erpEndpoints.length,
      `29. Full ERP 26-Endpoint Regression Check (${erpPassed}/${erpEndpoints.length} endpoints 200 OK)`,
    );

    // 30. Database persistence check
    const verifyPeriod = await get(`/payroll/${periodId}`);
    assert(
      verifyPeriod.status === 200 &&
        verifyPeriod.data?.data?.status === 'PAID' &&
        verifyPeriod.data?.data?.records?.length > 0,
      '30. Full Database Persistence & Record Integrity Verification',
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
