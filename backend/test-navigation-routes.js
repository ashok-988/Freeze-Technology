const fs = require('fs');
const path = require('path');

const requiredRoutes = [
  { name: 'Dashboard', path: '/', file: 'frontend/src/app/page.jsx' },
  { name: 'Customers', path: '/customers', file: 'frontend/src/app/customers/page.jsx' },
  { name: 'Products Catalog', path: '/products', file: 'frontend/src/app/products/page.jsx' },
  { name: 'Quotations', path: '/quotations', file: 'frontend/src/app/quotations/page.jsx' },
  { name: 'GST Invoices', path: '/invoices', file: 'frontend/src/app/invoices/page.jsx' },
  { name: 'Payments & Receivables', path: '/payments', file: 'frontend/src/app/payments/page.jsx' },
  { name: 'Service Job Cards', path: '/services', file: 'frontend/src/app/services/page.jsx' },
  { name: 'AMC Tracker', path: '/amc', file: 'frontend/src/app/amc/page.jsx' },
  { name: 'Installations', path: '/installations', file: 'frontend/src/app/installations/page.jsx' },
  { name: 'Inventory & Stock', path: '/inventory', file: 'frontend/src/app/inventory/page.jsx' },
  { name: 'Suppliers', path: '/suppliers', file: 'frontend/src/app/suppliers/page.jsx' },
  { name: 'Employees', path: '/employees', file: 'frontend/src/app/employees/page.jsx' },
  { name: 'Attendance', path: '/attendance', file: 'frontend/src/app/attendance/page.jsx' },
  { name: 'Payroll', path: '/payroll', file: 'frontend/src/app/payroll/page.jsx' },
  { name: 'Vendor Bills & Payables', path: '/payables', file: 'frontend/src/app/payables/page.jsx' },
  { name: 'Reports & GST', path: '/reports', file: 'frontend/src/app/reports/page.jsx' },
  { name: 'Notifications', path: '/notifications', file: 'frontend/src/app/notifications/page.jsx' },
  { name: 'Settings', path: '/settings', file: 'frontend/src/app/settings/page.jsx' },
];

console.log('======================================================');
console.log('🧭 ERP SIDEBAR NAVIGATION & ROUTE VERIFICATION 🧭');
console.log('======================================================');

let passed = 0;
let failed = 0;

for (const r of requiredRoutes) {
  const fullPath = path.resolve('..', r.file);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    console.log(`[PASS] Route ${r.path} (${r.name}) -> ${r.file} exists`);
    passed++;
  } else {
    console.error(`[FAIL] Route ${r.path} (${r.name}) -> MISSING ${r.file}`);
    failed++;
  }
}

console.log('======================================================');
console.log(`NAVIGATION VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================');

if (failed > 0) process.exit(1);
