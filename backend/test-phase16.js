/**
 * Automated Verification & Regression Test Suite for Phase 16
 * Freeze Technology ERP — Notifications, Alerts & Communication Center
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let passedCount = 0;
let failedCount = 0;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 16: NOTIFICATIONS, ALERTS & COMMUNICATION CENTER');
  console.log('====================================================\n');

  try {
    // 1. Backend Health Check
    console.log('1. Backend Health & Module Verification...');
    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'Backend is healthy (GET /api/health returns 200)');

    // 2. Notification Preferences
    console.log('\n2. Notification Preferences API...');
    const prefRes = await request('GET', '/api/notifications/preferences');
    assert(prefRes.status === 200, 'GET /api/notifications/preferences returns 200');
    assert(prefRes.body?.data?.minPriority !== undefined, 'User preferences initialized with minPriority');

    const updatePrefRes = await request('PATCH', '/api/notifications/preferences', {
      inventoryAlerts: true,
      payablesAlerts: true,
      minPriority: 'LOW',
    });
    assert(updatePrefRes.status === 200, 'PATCH /api/notifications/preferences returns 200');
    assert(updatePrefRes.body?.data?.minPriority === 'LOW', 'Preferences updated successfully');

    // 3. Notification Creation & Auto-Numbering
    console.log('\n3. Notification Creation & Auto-Numbering...');
    const testEventKey = `TEST:EVENT:${Date.now()}`;
    const createRes1 = await request('POST', '/api/notifications', {
      title: 'Compressor Motor Thermal Overload Alert',
      message: 'High discharge pressure detected on Outdoor Unit OD-2026-04 at Marina Mall branch.',
      category: 'SERVICE',
      priority: 'HIGH',
      sourceModule: 'SERVICES',
      sourceReference: 'SRV-2026-0089',
      actionUrl: '/services',
      eventKey: testEventKey,
    });
    assert(createRes1.status === 201 || createRes1.status === 200, 'POST /api/notifications creates notification');
    const notif1 = createRes1.body?.data;
    assert(notif1?.id !== undefined, 'Notification has UUID');
    assert(notif1?.notificationNumber?.startsWith('NOTIF-'), `Auto-assigned sequential number: ${notif1?.notificationNumber}`);
    assert(notif1?.isRead === false, 'Notification is initially unread');
    assert(notif1?.isArchived === false, 'Notification is initially not archived');

    // 4. Duplicate Notification Prevention (Idempotency)
    console.log('\n4. Duplicate Notification Prevention (Idempotency)...');
    const duplicateRes = await request('POST', '/api/notifications', {
      title: 'Compressor Motor Thermal Overload Alert',
      message: 'Duplicate event attempt',
      category: 'SERVICE',
      priority: 'HIGH',
      eventKey: testEventKey,
    });
    assert(duplicateRes.status === 201 || duplicateRes.status === 200, 'Duplicate request handled gracefully');
    assert(duplicateRes.body?.data?.id === notif1.id, 'Idempotent creation returns existing notification without creating duplicate');

    // Create a second notification
    const createRes2 = await request('POST', '/api/notifications', {
      title: 'Critical Warehouse Component Depletion',
      message: 'Test R32 Refrigerant Cylinder reached zero stock.',
      category: 'INVENTORY',
      priority: 'CRITICAL',
      sourceModule: 'INVENTORY',
      sourceReference: 'SKU-REF-001',
      actionUrl: '/inventory',
    });
    const notif2 = createRes2.body?.data;
    assert(notif2?.priority === 'CRITICAL', 'Second notification created with CRITICAL priority');

    // 5. Unread Count & Stats API
    console.log('\n5. Unread Count & Stats API...');
    const unreadRes = await request('GET', '/api/notifications/unread-count');
    assert(unreadRes.status === 200, 'GET /api/notifications/unread-count returns 200');
    assert(typeof unreadRes.body?.unreadCount === 'number' && unreadRes.body?.unreadCount >= 2, `Live unread count: ${unreadRes.body?.unreadCount}`);

    const statsRes = await request('GET', '/api/notifications/stats');
    assert(statsRes.status === 200, 'GET /api/notifications/stats returns 200');
    const stats = statsRes.body?.data;
    assert(stats?.total >= 2, `Total notifications tracked: ${stats?.total}`);
    assert(stats?.unread >= 2, `Unread alerts count: ${stats?.unread}`);
    assert(stats?.critical >= 1, `Critical alerts count: ${stats?.critical}`);

    // 6. Querying & Filtering
    console.log('\n6. Querying & Filtering...');
    const listAll = await request('GET', '/api/notifications');
    assert(listAll.status === 200, 'GET /api/notifications returns 200');
    assert(Array.isArray(listAll.body?.items), 'Items array returned');
    assert(listAll.body?.totalPages >= 1, 'Server pagination metadata included');

    const listUnread = await request('GET', '/api/notifications?status=UNREAD');
    assert(listUnread.body?.items?.every((item) => !item.isRead), 'Filtered by UNREAD status correctly');

    const listCritical = await request('GET', '/api/notifications?status=CRITICAL');
    assert(listCritical.body?.items?.every((item) => item.priority === 'CRITICAL'), 'Filtered by CRITICAL priority correctly');

    const listCategory = await request('GET', '/api/notifications?category=INVENTORY');
    assert(listCategory.body?.items?.every((item) => item.category === 'INVENTORY'), 'Filtered by category correctly');

    const listSearch = await request('GET', '/api/notifications?search=Thermal');
    assert(listSearch.body?.items?.some((item) => item.title.includes('Thermal')), 'Search query matched keyword correctly');

    // 7. Single Notification Retrieval
    console.log('\n7. Single Notification Retrieval...');
    const getSingle = await request('GET', `/api/notifications/${notif1.id}`);
    assert(getSingle.status === 200, 'GET /api/notifications/:id returns 200');
    assert(getSingle.body?.data?.id === notif1.id, 'Single notification details matched');

    // 8. Mark as Read & Mark as Unread
    console.log('\n8. Read/Unread Status Toggles...');
    const markReadRes = await request('PATCH', `/api/notifications/${notif1.id}/read`);
    assert(markReadRes.status === 200, 'PATCH /api/notifications/:id/read returns 200');
    assert(markReadRes.body?.data?.isRead === true, 'Notification state updated to read');

    const markUnreadRes = await request('PATCH', `/api/notifications/${notif1.id}/unread`);
    assert(markUnreadRes.status === 200, 'PATCH /api/notifications/:id/unread returns 200');
    assert(markUnreadRes.body?.data?.isRead === false, 'Notification state restored to unread');

    // 9. Read All
    console.log('\n9. Mark All as Read...');
    const readAllRes = await request('PATCH', '/api/notifications/read-all');
    assert(readAllRes.status === 200, 'PATCH /api/notifications/read-all returns 200');
    const unreadAfterReadAll = await request('GET', '/api/notifications/unread-count');
    assert(unreadAfterReadAll.body?.unreadCount === 0, 'All active notifications marked as read (Unread count = 0)');

    // 10. Archive & Archive All Lifecycle
    console.log('\n10. Archive Lifecycle...');
    const archiveRes = await request('PATCH', `/api/notifications/${notif1.id}/archive`);
    assert(archiveRes.status === 200, 'PATCH /api/notifications/:id/archive returns 200');
    assert(archiveRes.body?.data?.isArchived === true, 'Notification archived successfully');

    const archiveAllRes = await request('PATCH', '/api/notifications/archive-all');
    assert(archiveAllRes.status === 200, 'PATCH /api/notifications/archive-all returns 200');

    // 11. Delete Notification
    console.log('\n11. Delete Notification...');
    const deleteRes = await request('DELETE', `/api/notifications/${notif1.id}`);
    assert(deleteRes.status === 200, 'DELETE /api/notifications/:id returns 200');
    const checkDeleted = await request('GET', `/api/notifications/${notif1.id}`);
    assert(checkDeleted.status === 404, 'Deleted notification returns 404 Not Found');

    // 12. Automated Business Rule Evaluation
    console.log('\n12. Automated Business Rule Evaluation Engine...');
    const evalRes = await request('POST', '/api/notifications/evaluate-rules');
    assert(evalRes.status === 200 || evalRes.status === 201, 'POST /api/notifications/evaluate-rules executes without error');
    assert(typeof evalRes.body?.newAlertsCount === 'number', `Automated engine evaluated rules (New alerts: ${evalRes.body?.newAlertsCount})`);

    // 13. Full Regression Across Phases 2–16
    console.log('\n13. Complete ERP Regression Across Phases 2–16...');
    const endpoints = [
      { name: 'Phase 2 CRM (GET /customers)', path: '/api/customers' },
      { name: 'Phase 3 Products (GET /products)', path: '/api/products' },
      { name: 'Phase 4 Quotations (GET /quotations)', path: '/api/quotations' },
      { name: 'Phase 5 Invoices (GET /invoices)', path: '/api/invoices' },
      { name: 'Phase 5 Payments (GET /payments)', path: '/api/payments' },
      { name: 'Phase 6 Services (GET /services)', path: '/api/services' },
      { name: 'Phase 7 AMC (GET /amc)', path: '/api/amc' },
      { name: 'Phase 8 Installations (GET /installations)', path: '/api/installations' },
      { name: 'Phase 9 Inventory (GET /inventory)', path: '/api/inventory' },
      { name: 'Phase 10 Suppliers (GET /suppliers)', path: '/api/suppliers' },
      { name: 'Phase 10 Purchase Orders (GET /purchase-orders)', path: '/api/purchase-orders' },
      { name: 'Phase 11 Employees (GET /employees)', path: '/api/employees' },
      { name: 'Phase 11 Attendance (GET /attendance)', path: '/api/attendance' },
      { name: 'Phase 12 Payroll (GET /payroll/periods)', path: '/api/payroll/periods' },
      { name: 'Phase 13 Payables (GET /payables)', path: '/api/payables' },
      { name: 'Phase 14 Reports (GET /reports/dashboard)', path: '/api/reports/dashboard' },
      { name: 'Phase 15 Assets (GET /assets)', path: '/api/assets' },
      { name: 'Phase 15 PM Schedules (GET /preventive-maintenance)', path: '/api/preventive-maintenance' },
      { name: 'Phase 16 Notifications (GET /notifications)', path: '/api/notifications' },
    ];

    for (const ep of endpoints) {
      const res = await request('GET', ep.path);
      assert(res.status === 200, `${ep.name} is functional and healthy (HTTP 200)`);
    }

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Execution Error:', err);
    process.exit(1);
  }
}

runTests();
