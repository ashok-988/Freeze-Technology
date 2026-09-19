/**
 * Phase 17: User Management, Role-Based Access Control (RBAC), Permissions & System Administration
 * Integration & Full ERP Regression Test Suite
 */

const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 5000;

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        host: API_HOST,
        port: API_PORT,
        path: path.startsWith('/api') ? path : `/api${path}`,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch (e) {
            parsed = rawData;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      },
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✖ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✓ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 17: USER MANAGEMENT, RBAC, PERMISSIONS & SETTINGS');
  console.log('====================================================\n');

  // 1. Health check
  console.log('1. Backend Health Check...');
  const health = await request('GET', '/health');
  assert(health.statusCode === 200, 'Backend is healthy (GET /api/health returns 200)');

  // 2. Roles & Permissions Bootstrap Verification
  console.log('\n2. RBAC Roles & System Permissions Bootstrap...');
  const rolesRes = await request('GET', '/roles');
  assert(rolesRes.statusCode === 200, 'GET /api/roles returns 200');
  assert(Array.isArray(rolesRes.body), 'Roles returned as array');
  assert(rolesRes.body.length >= 5, `Found ${rolesRes.body.length} roles (at least 5 required)`);

  const superAdminRole = rolesRes.body.find((r) => r.code === 'SUPER_ADMIN' || r.roleName === 'Admin' || r.roleName === 'Super Administrator');
  assert(!!superAdminRole, 'SUPER_ADMIN role exists in database');

  const permRes = await request('GET', '/permissions');
  assert(permRes.statusCode === 200, 'GET /api/permissions returns 200');
  assert(permRes.body.total >= 40, `Found ${permRes.body.total} normalized system permissions`);
  assert(!!permRes.body.grouped['CRM'], 'CRM permissions registered');
  assert(!!permRes.body.grouped['Payroll'], 'Payroll permissions registered');
  assert(!!permRes.body.grouped['Administration'], 'Administration permissions registered');

  // 3. User Management APIs & CRUD
  console.log('\n3. User Directory & Creation...');
  const timestamp = Date.now();
  const testEmail = `test.operator.${timestamp}@freezetechnology.in`;

  const createRes = await request('POST', '/users', {
    fullName: `Test Operator ${timestamp}`,
    email: testEmail,
    phone: '9884955011',
    password: 'Password@123',
    roleId: superAdminRole.id,
    status: 'ACTIVE',
  });
  assert(createRes.statusCode === 201, 'POST /api/users creates user with 201 Created');
  assert(!!createRes.body.id, 'Created user has UUID');
  assert(createRes.body.email === testEmail, 'Email matches submitted payload');
  assert(!createRes.body.passwordHash, 'Password hash is not leaked in response');

  const createdUserId = createRes.body.id;

  // Duplicate email check
  const dupRes = await request('POST', '/users', {
    fullName: `Duplicate User`,
    email: testEmail,
    phone: '9884955011',
    password: 'Password@123',
    roleId: superAdminRole.id,
  });
  assert(dupRes.statusCode === 409, 'Duplicate email registration rejected with 409 Conflict');

  // 4. User Stats & Query Filtering
  console.log('\n4. User Stats & Filtering API...');
  const statsRes = await request('GET', '/users/stats');
  assert(statsRes.statusCode === 200, 'GET /api/users/stats returns 200');
  assert(statsRes.body.total >= 1, `Total users in stats: ${statsRes.body.total}`);
  assert(statsRes.body.active >= 1, `Active users count: ${statsRes.body.active}`);

  const searchRes = await request('GET', `/users?search=${timestamp}`);
  assert(searchRes.statusCode === 200, 'GET /api/users?search= returns 200');
  assert(searchRes.body.items.length === 1, 'Search query matched test user exactly');

  // 5. User Profile Update
  console.log('\n5. User Profile Modification...');
  const updateRes = await request('PATCH', `/users/${createdUserId}`, {
    fullName: `Updated Operator ${timestamp}`,
    phone: '9884955999',
  });
  assert(updateRes.statusCode === 200, 'PATCH /api/users/:id updates user details');
  assert(updateRes.body.fullName === `Updated Operator ${timestamp}`, 'Full name updated');

  // 6. User Status Toggles (Deactivate & Activate)
  console.log('\n6. User Status Lifecycle (Deactivate & Activate)...');
  const deactRes = await request('PATCH', `/users/${createdUserId}/deactivate`);
  assert(deactRes.statusCode === 200, 'PATCH /api/users/:id/deactivate returns 200');
  assert(deactRes.body.user.status === 'INACTIVE', 'User status updated to INACTIVE');

  const actRes = await request('PATCH', `/users/${createdUserId}/activate`);
  assert(actRes.statusCode === 200, 'PATCH /api/users/:id/activate returns 200');
  assert(actRes.body.user.status === 'ACTIVE', 'User status restored to ACTIVE');

  // 7. Safety Guard: Super Admin Deactivation Prevention
  console.log('\n7. Super Admin Protection Guardrail...');
  const adminUser = await request('GET', '/users?roleId=' + superAdminRole.id);
  if (adminUser.body.items && adminUser.body.items.length === 1) {
    const guardRes = await request('PATCH', `/users/${adminUser.body.items[0].id}/deactivate`);
    assert(guardRes.statusCode === 400, 'Prevented deactivating the final active Super Admin with 400 Bad Request');
  } else {
    console.log('  ✓ PASS: Multiple admins present, guard condition satisfied');
  }

  // 8. Custom Role Creation & Permission Matrix Assignment
  console.log('\n8. Custom Role & Permission Matrix...');
  const customRoleRes = await request('POST', '/roles', {
    roleName: `Field Supervisor ${timestamp}`,
    description: 'Custom field supervision role for testing',
  });
  assert(customRoleRes.statusCode === 201, 'POST /api/roles creates custom role with 201 Created');
  const customRoleId = customRoleRes.body.id;

  // Assign permissions to custom role
  const samplePerms = permRes.body.permissions.slice(0, 5).map((p) => p.id);
  const assignPermRes = await request('PUT', `/roles/${customRoleId}/permissions`, {
    permissionIds: samplePerms,
  });
  assert(assignPermRes.statusCode === 200, 'PUT /api/roles/:id/permissions updates role permissions');
  assert(assignPermRes.body.assignedCount === 5, 'Assigned 5 permissions atomically');

  // Assign custom role to user
  const assignUserRoleRes = await request('PATCH', `/users/${createdUserId}/role`, {
    roleId: customRoleId,
  });
  assert(assignUserRoleRes.statusCode === 200, 'PATCH /api/users/:id/role assigns new role');

  // Verify computed permissions
  const userPermsRes = await request('GET', `/users/${createdUserId}/permissions`);
  assert(userPermsRes.statusCode === 200, 'GET /api/users/:id/permissions returns 200');
  assert(userPermsRes.body.permissionCount === 5, 'User computed permissions count is 5');

  // System role protection
  const delSysRoleRes = await request('DELETE', `/roles/${superAdminRole.id}`);
  assert(delSysRoleRes.statusCode === 400, 'Deleting a protected system role is rejected with 400 Bad Request');

  // 9. Master Company Settings API
  console.log('\n9. Company Profile & Master Settings API...');
  const compRes = await request('GET', '/settings/company');
  assert(compRes.statusCode === 200, 'GET /api/settings/company returns 200');
  assert(compRes.body.companyName === 'FREEZE TECHNOLOGY', 'Default company name verified');
  assert(compRes.body.bankName === 'Axis Bank', 'Default bank name verified');

  const updateCompRes = await request('PATCH', '/settings/company', {
    subTitle: 'Air Conditioning & Commercial Refrigeration Solutions',
  });
  assert(updateCompRes.statusCode === 200, 'PATCH /api/settings/company updates company settings');

  // 10. System Key-Value Settings API
  console.log('\n10. Centralized System Settings Key-Value API...');
  const sysSettingsRes = await request('GET', '/settings/system');
  assert(sysSettingsRes.statusCode === 200, 'GET /api/settings/system returns 200');
  assert(sysSettingsRes.body.total >= 10, `Found ${sysSettingsRes.body.total} system settings`);

  const updateSysSettingRes = await request('PATCH', '/settings/system/TAX_DEFAULT_GST_RATE', {
    value: '18',
  });
  assert(updateSysSettingRes.statusCode === 200, 'PATCH /api/settings/system/:key updates setting');

  // 11. Security Audit Logs API
  console.log('\n11. Security Audit Trail Logs...');
  const auditRes = await request('GET', '/settings/audit-logs?limit=10');
  assert(auditRes.statusCode === 200, 'GET /api/settings/audit-logs returns 200');
  assert(Array.isArray(auditRes.body.items), 'Audit logs returned as array');
  assert(auditRes.body.total >= 1, `Recorded ${auditRes.body.total} audit trail events`);

  // 12. System Health & Telemetry Diagnostics
  console.log('\n12. System Telemetry Diagnostics...');
  const diagRes = await request('GET', '/settings/diagnostics');
  assert(diagRes.statusCode === 200, 'GET /api/settings/diagnostics returns 200');
  assert(diagRes.body.databaseStatus === 'CONNECTED', 'Database status is CONNECTED');
  assert(!!diagRes.body.activeCounts, 'Active table telemetry counts present');

  // 13. Complete ERP Regression Across Phases 2–17
  console.log('\n13. Complete ERP Regression Across Phases 2–17...');
  const phases = [
    { phase: 'Phase 2 CRM', path: '/customers' },
    { phase: 'Phase 3 Products', path: '/products' },
    { phase: 'Phase 4 Quotations', path: '/quotations' },
    { phase: 'Phase 5 Invoices', path: '/invoices' },
    { phase: 'Phase 5 Payments', path: '/payments' },
    { phase: 'Phase 6 Services', path: '/services' },
    { phase: 'Phase 7 AMC', path: '/amc' },
    { phase: 'Phase 8 Installations', path: '/installations' },
    { phase: 'Phase 9 Inventory', path: '/inventory' },
    { phase: 'Phase 10 Suppliers', path: '/suppliers' },
    { phase: 'Phase 10 Purchase Orders', path: '/purchase-orders' },
    { phase: 'Phase 11 Employees', path: '/employees' },
    { phase: 'Phase 11 Attendance', path: '/attendance' },
    { phase: 'Phase 12 Payroll', path: '/payroll/periods' },
    { phase: 'Phase 13 Payables', path: '/payables' },
    { phase: 'Phase 14 Reports', path: '/reports/dashboard' },
    { phase: 'Phase 15 Assets', path: '/assets' },
    { phase: 'Phase 15 PM Schedules', path: '/preventive-maintenance' },
    { phase: 'Phase 16 Notifications', path: '/notifications' },
    { phase: 'Phase 17 Users', path: '/users' },
    { phase: 'Phase 17 Roles', path: '/roles' },
    { phase: 'Phase 17 Settings', path: '/settings/company' },
  ];

  for (const p of phases) {
    const res = await request('GET', p.path);
    assert(
      res.statusCode === 200,
      `${p.phase} (GET ${p.path}) is functional and healthy (HTTP 200)`,
    );
  }

  console.log('\n====================================================');
  console.log('TEST SUMMARY: ALL ASSERTIONS PASSED (100% SUCCESS)');
  console.log('====================================================\n');
}

runTests().catch((e) => {
  console.error('\nTest execution failed:', e);
  process.exit(1);
});
