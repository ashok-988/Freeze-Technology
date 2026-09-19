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
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
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
const del = (path) => request('DELETE', path);

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 PHASE 11 AUTOMATED VERIFICATION & REGRESSION TEST SUITE 🚀');
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

    // 2. Employee list
    const empList = await get('/employees');
    assert(empList.status === 200 && Array.isArray(empList.data?.data), '2. Employee List Endpoint', `Got status ${empList.status}`);
    const initialEmployees = empList.data?.data || [];

    // 3. Employee stats
    const empStats = await get('/employees/stats');
    assert(
      empStats.status === 200 &&
        typeof empStats.data?.data?.totalEmployees === 'number' &&
        typeof empStats.data?.data?.activeEmployees === 'number',
      '3. Employee Live Stats',
    );

    // 4. Employee creation
    const uniquePhone = '9884' + Math.floor(100000 + Math.random() * 900000);
    const uniqueEmail = `technician.${Date.now()}@freezetechnology.in`;
    const newEmpPayload = {
      fullName: 'Aravind Krishnan',
      designation: 'Field HVAC Specialist',
      department: 'Service & Operations',
      employmentType: 'Full-Time',
      phone: uniquePhone,
      email: uniqueEmail,
      address: 'No 45, Velachery Main Road, Chennai 600042',
      salary: 29000,
      joiningDate: '2026-08-01',
      status: 'ACTIVE',
    };
    const createEmp = await post('/employees', newEmpPayload);
    assert(
      createEmp.status === 201 &&
        createEmp.data?.data?.employeeCode?.startsWith('EMP-2026-') &&
        createEmp.data?.data?.fullName === 'Aravind Krishnan',
      '4. Employee Creation with Sequential Numbering (EMP-2026-XXXX)',
      `Code: ${createEmp.data?.data?.employeeCode}`,
    );
    const createdEmployeeId = createEmp.data?.data?.id;
    const createdEmployeeCode = createEmp.data?.data?.employeeCode;

    // 5. Employee retrieval by ID & Code
    const getById = await get(`/employees/${createdEmployeeId}`);
    const getByCode = await get(`/employees/${createdEmployeeCode}`);
    assert(
      getById.status === 200 && getByCode.status === 200 && getById.data?.data?.id === createdEmployeeId,
      '5. Employee Retrieval by ID and Employee Code',
    );

    // 6. Employee update
    const updateEmp = await patch(`/employees/${createdEmployeeId}`, {
      designation: 'Senior Lead HVAC Specialist',
      salary: 32000,
    });
    assert(
      updateEmp.status === 200 && updateEmp.data?.data?.designation === 'Senior Lead HVAC Specialist',
      '6. Employee Update',
    );

    // 7. Employee search
    const searchRes = await get(`/employees?search=Aravind`);
    assert(
      searchRes.status === 200 && searchRes.data?.data?.some((e) => e.id === createdEmployeeId),
      '7. Employee Search by Name',
    );

    // 8. Employee filtering
    const deptRes = await get(`/employees?department=Service%20%26%20Operations`);
    assert(
      deptRes.status === 200 && Array.isArray(deptRes.data?.data),
      '8. Employee Filtering by Department',
    );

    // 9. Technician list
    const techRes = await get('/employees/technicians');
    assert(
      techRes.status === 200 && Array.isArray(techRes.data?.data) && techRes.data?.data?.length >= 4,
      '9. Technician Directory Endpoint',
      `Count: ${techRes.data?.data?.length}`,
    );

    // 10. Duplicate phone / email validation
    const dupPhoneRes = await post('/employees', {
      fullName: 'Duplicate User',
      designation: 'Technician',
      phone: uniquePhone,
    });
    assert(dupPhoneRes.status === 409, '10. Duplicate Phone Validation (409 Conflict)');

    // 11. Employee deactivation
    const deactRes = await del(`/employees/${createdEmployeeId}`);
    assert(
      deactRes.status === 200 && deactRes.data?.data?.status === 'INACTIVE',
      '11. Employee Deactivation Toggle (Soft-Deactivation)',
    );

    // 12. Inactive employee check-in rejection
    const inactiveCheckIn = await post('/attendance/check-in', {
      employeeId: createdEmployeeId,
    });
    assert(inactiveCheckIn.status === 400, '12. Inactive Employee Check-In Rejection (400 Bad Request)');

    // Reactivate employee for attendance test
    await del(`/employees/${createdEmployeeId}`);

    // 13. Daily shift Check-in
    const checkInRes = await post('/attendance/check-in', {
      employeeId: createdEmployeeId,
      remarks: 'Automated Test Check-In',
    });
    assert(
      checkInRes.status === 201 &&
        checkInRes.data?.data?.attendanceStatus === 'Present' &&
        checkInRes.data?.data?.checkIn !== null,
      '13. Staff Daily Check-In with Server Timestamp',
      `Check-In ID: ${checkInRes.data?.data?.id}`,
    );
    const attendanceId = checkInRes.data?.data?.id;

    // 14. Duplicate check-in rejection
    const dupCheckIn = await post('/attendance/check-in', {
      employeeId: createdEmployeeId,
    });
    assert(dupCheckIn.status === 409, '14. Duplicate Check-In Rejection on Same Calendar Day (409 Conflict)');

    // 15. Check-out & Working Duration
    const checkOutRes = await patch(`/attendance/${attendanceId}/check-out`, {
      remarks: 'Shift completed cleanly',
    });
    assert(
      checkOutRes.status === 200 &&
        checkOutRes.data?.data?.checkOut !== null &&
        typeof checkOutRes.data?.data?.totalWorkingMinutes === 'number',
      '15. Staff Check-Out & Working Duration Calculation',
    );

    // 16. Duplicate check-out rejection
    const dupCheckOut = await patch(`/attendance/${attendanceId}/check-out`);
    assert(dupCheckOut.status === 409, '16. Duplicate Check-Out Rejection (409 Conflict)');

    // 17. Manual attendance marking for a different past date
    const pastDate = '2026-08-10';
    const manualAttRes = await post('/attendance/mark', {
      employeeId: createdEmployeeId,
      attendanceDate: `${pastDate}T00:00:00.000Z`,
      attendanceStatus: 'Present',
      checkIn: `${pastDate}T09:00:00.000Z`,
      checkOut: `${pastDate}T18:30:00.000Z`,
      remarks: 'Full 9.5h shift with 1.5h OT',
    });
    assert(
      manualAttRes.status === 201 &&
        manualAttRes.data?.data?.workingHours === 9.5 &&
        manualAttRes.data?.data?.overtimeMinutes === 90,
      '17. Manual Attendance Entry with Overtime Calculation (9.5h shift -> 90m OT)',
      `Working Hours: ${manualAttRes.data?.data?.workingHours}h, OT: ${manualAttRes.data?.data?.overtimeMinutes}m`,
    );

    // 18. Duplicate manual attendance rejection
    const dupManual = await post('/attendance/mark', {
      employeeId: createdEmployeeId,
      attendanceDate: `${pastDate}T00:00:00.000Z`,
      attendanceStatus: 'Absent',
    });
    assert(dupManual.status === 409, '18. Duplicate Attendance Rejection on Same Date (409 Conflict)');

    // 19. Invalid employee rejection
    const invalidEmpAtt = await post('/attendance/check-in', {
      employeeId: '00000000-0000-0000-0000-000000000000',
    });
    assert(invalidEmpAtt.status === 404, '19. Invalid Employee Check-In Rejection (404 Not Found)');

    // 20. Attendance statistics
    const attStats = await get('/attendance/stats');
    assert(
      attStats.status === 200 &&
        typeof attStats.data?.data?.presentToday === 'number' &&
        typeof attStats.data?.data?.avgWorkingHours === 'number',
      '20. Attendance Live Shift KPIs',
    );

    // 21. Employee attendance history
    const empHistory = await get(`/attendance?employeeId=${createdEmployeeId}`);
    assert(
      empHistory.status === 200 &&
        Array.isArray(empHistory.data?.data) &&
        empHistory.data?.data?.length >= 2,
      '21. Employee Attendance History Logs',
      `Records: ${empHistory.data?.data?.length}`,
    );

    // 22. Cross-module Phase 6 Services technician integration
    const servicesTech = await get('/services/technicians');
    assert(
      servicesTech.status === 200 && servicesTech.data?.data?.length >= 4,
      '22. Phase 6 Services Technician API Integration',
    );

    // 23. Cross-module Phase 7 AMC technicians
    const amcList = await get('/amc');
    assert(amcList.status === 200, '23. Phase 7 AMC Integration');

    // 24. Cross-module Phase 8 Installations
    const installList = await get('/installations');
    assert(installList.status === 200, '24. Phase 8 Installation Integration');

    // 25. Full ERP Smoke Check across Phases 2 to 10
    const endpoints = [
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
    ];

    let erpPassed = 0;
    for (const ep of endpoints) {
      const res = await get(ep);
      if (res.status >= 200 && res.status < 300) {
        erpPassed++;
      } else {
        console.error(`ERP endpoint failed: ${ep} (${res.status})`);
      }
    }

    assert(
      erpPassed === endpoints.length,
      `25. Full ERP 24-Endpoint Regression Check (${erpPassed}/${endpoints.length} endpoints 200 OK)`,
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
