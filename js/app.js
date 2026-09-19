/* -------------------------------------------------------------------------- */
/* FREEZE TECHNOLOGY ERP - MAIN APPLICATION CONTROLLER                        */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  bindNavigation();
  bindGlobalEvents();
  renderCurrentModule('dashboard');
}

/* -------------------------------------------------------------------------- */
/* NAVIGATION & ROUTING ENGINE                                                */
/* -------------------------------------------------------------------------- */
function bindNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetModule = item.getAttribute('data-module');
      if (!targetModule) return;

      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      renderCurrentModule(targetModule);
    });
  });
}

function renderCurrentModule(moduleName) {
  const container = document.getElementById('module-content');
  if (!container) return;

  switch (moduleName) {
    case 'dashboard':
      container.innerHTML = renderDashboard();
      initDashboardCharts();
      break;
    case 'customers':
      container.innerHTML = renderCustomers();
      break;
    case 'products':
      container.innerHTML = renderProducts();
      break;
    case 'quotations':
      container.innerHTML = renderQuotations();
      break;
    case 'invoices':
      container.innerHTML = renderInvoices();
      break;
    case 'inventory':
      container.innerHTML = renderInventory();
      break;
    case 'suppliers':
      container.innerHTML = renderSuppliers();
      break;
    case 'services':
      container.innerHTML = renderServiceJobs();
      break;
    case 'technician':
      container.innerHTML = renderTechnicianModule();
      break;
    case 'amc':
      container.innerHTML = renderAMCTracker();
      break;
    case 'installations':
      container.innerHTML = renderInstallations();
      break;
    case 'employees':
      container.innerHTML = renderEmployees();
      break;
    case 'attendance':
      container.innerHTML = renderAttendance();
      break;
    case 'payments':
      container.innerHTML = renderPayments();
      break;
    case 'reports':
      container.innerHTML = renderReports();
      break;
    case 'settings':
      container.innerHTML = renderSettings();
      break;
    default:
      container.innerHTML = renderDashboard();
  }
  
  // Re-bind icon components or modal triggers
  if (window.lucide) lucide.createIcons();
}

/* -------------------------------------------------------------------------- */
/* MODULE RENDERERS                                                           */
/* -------------------------------------------------------------------------- */

// 1. DASHBOARD MODULE
function renderDashboard() {
  const analytics = window.ftStore.getAnalytics();
  const invoices = window.ftStore.get('invoices').slice(0, 5);
  const jobs = window.ftStore.get('jobCards');

  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Executive Business Dashboard</h2>
        <p>Real-time metrics for Freeze Technology Air Conditioning & Refrigeration Operations</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="triggerQuickAction('new-invoice')">
          <i data-lucide="file-plus"></i> New Invoice
        </button>
        <button class="btn btn-primary" onclick="triggerQuickAction('new-service')">
          <i data-lucide="wrench"></i> New Job Card
        </button>
      </div>
    </div>

    <!-- KPI Cards Grid -->
    <div class="kpi-grid">
      <div class="kpi-card" onclick="renderCurrentModule('invoices')">
        <div class="kpi-top">
          <div class="kpi-icon green"><i data-lucide="indian-rupee"></i></div>
          <div class="kpi-trend up"><i data-lucide="trending-up"></i> +14.2%</div>
        </div>
        <div class="kpi-value">₹${analytics.totalSales.toLocaleString('en-IN')}</div>
        <div class="kpi-label">Total Revenue Generated</div>
      </div>

      <div class="kpi-card" onclick="renderCurrentModule('services')">
        <div class="kpi-top">
          <div class="kpi-icon blue"><i data-lucide="wrench"></i></div>
          <div class="kpi-trend up"><i data-lucide="clock"></i> Active</div>
        </div>
        <div class="kpi-value">${analytics.activeJobsCount}</div>
        <div class="kpi-label">Pending Service Jobs</div>
      </div>

      <div class="kpi-card" onclick="renderCurrentModule('amc')">
        <div class="kpi-top">
          <div class="kpi-icon purple"><i data-lucide="shield-check"></i></div>
          <div class="kpi-trend up"><i data-lucide="check-circle"></i> Active</div>
        </div>
        <div class="kpi-value">${analytics.activeAmcCount}</div>
        <div class="kpi-label">Active AMC Contracts</div>
      </div>

      <div class="kpi-card" onclick="renderCurrentModule('inventory')">
        <div class="kpi-top">
          <div class="kpi-icon red"><i data-lucide="alert-triangle"></i></div>
          <div class="kpi-trend down">Low Stock</div>
        </div>
        <div class="kpi-value">${analytics.lowStockCount}</div>
        <div class="kpi-label">Reorder Stock Alerts</div>
      </div>
    </div>

    <!-- Charts & Analytics Section -->
    <div class="grid-2" style="margin-bottom: 24px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Monthly Revenue Trend (2026)</div>
          <span class="badge badge-success">Growth: +18%</span>
        </div>
        <div style="height: 240px; position: relative;">
          <canvas id="chart-revenue"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Service Request Breakdown</div>
          <span class="badge badge-info">HVAC Jobs</span>
        </div>
        <div style="height: 240px; position: relative;">
          <canvas id="chart-services"></canvas>
        </div>
      </div>
    </div>

    <!-- Recent Tables -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Recent Invoices</div>
          <button class="btn btn-secondary btn-sm" onclick="renderCurrentModule('invoices')">View All</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map(inv => `
                <tr>
                  <td><strong>${inv.invoiceNo}</strong></td>
                  <td>${inv.customerName}</td>
                  <td>₹${inv.grandTotal.toLocaleString('en-IN')}</td>
                  <td><span class="badge ${inv.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${inv.paymentStatus}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="previewDoc1Invoice('${inv.id}')">
                      <i data-lucide="printer"></i> Print
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Active Job Cards</div>
          <button class="btn btn-secondary btn-sm" onclick="renderCurrentModule('services')">View All</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Job #</th>
                <th>Customer</th>
                <th>Technician</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${jobs.map(job => `
                <tr>
                  <td><strong>${job.jobNumber}</strong></td>
                  <td>${job.customerName}</td>
                  <td>${job.technicianName}</td>
                  <td><span class="badge ${job.status === 'Completed' ? 'badge-success' : 'badge-info'}">${job.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// 2. CUSTOMER MANAGEMENT MODULE
function renderCustomers() {
  const customers = window.ftStore.get('customers');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Customer Management</h2>
        <p>Directory of Retail and Commercial HVAC clients</p>
      </div>
      <button class="btn btn-primary" onclick="openAddCustomerModal()">
        <i data-lucide="user-plus"></i> Add Customer
      </button>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Name / Company</th>
              <th>Type</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>GSTIN</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => `
              <tr>
                <td><strong>${c.id}</strong></td>
                <td>${c.name}</td>
                <td><span class="badge ${c.type === 'Commercial' ? 'badge-purple' : 'badge-info'}">${c.type}</span></td>
                <td>${c.mobile}</td>
                <td>${c.email || '-'}</td>
                <td>${c.gstin || 'N/A'}</td>
                <td>${c.address}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="alert('Viewing history for ${c.name}')">
                    <i data-lucide="eye"></i> Profile
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 3. PRODUCT MANAGEMENT MODULE
function renderProducts() {
  const products = window.ftStore.get('products');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Product & Catalog Management</h2>
        <p>Panasonic AC Units, Refrigerators, Water Coolers & Spare Parts Catalog</p>
      </div>
      <button class="btn btn-primary" onclick="openAddProductModal()">
        <i data-lucide="plus-circle"></i> Add New Product
      </button>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Brand / Model</th>
              <th>Selling Price</th>
              <th>Stock Qty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td><strong>${p.sku}</strong></td>
                <td>${p.name}</td>
                <td><span class="badge badge-info">${p.category}</span></td>
                <td>${p.brand} (${p.model})</td>
                <td>₹${p.sellingPrice.toLocaleString('en-IN')}</td>
                <td><strong>${p.stockQuantity}</strong></td>
                <td>
                  <span class="badge ${p.stockQuantity <= 5 ? 'badge-danger' : 'badge-success'}">
                    ${p.stockQuantity <= 5 ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 4. QUOTATION MANAGEMENT MODULE
function renderQuotations() {
  const quotations = window.ftStore.get('quotations');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Quotation Management</h2>
        <p>Pre-sales commercial proposals and estimates</p>
      </div>
      <button class="btn btn-primary" onclick="alert('Quotation Builder opened')">
        <i data-lucide="file-plus"></i> Create Quotation
      </button>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${quotations.map(q => `
              <tr>
                <td><strong>${q.quotationNo}</strong></td>
                <td>${q.customerName}</td>
                <td>${q.date}</td>
                <td>₹${q.total.toLocaleString('en-IN')}</td>
                <td><span class="badge ${q.status === 'Approved' ? 'badge-success' : 'badge-warning'}">${q.status}</span></td>
                <td>
                  <button class="btn btn-accent btn-sm" onclick="convertQuoteToInvoice('${q.id}')">
                    Convert to Invoice
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 5. INVOICE MANAGEMENT MODULE (DOCUMENT 1 COMPLIANT)
function renderInvoices() {
  const invoices = window.ftStore.get('invoices');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>GST Invoice Management</h2>
        <p>Generate, Print, and Share Official Freeze Technology GST Invoices</p>
      </div>
      <button class="btn btn-primary" onclick="openCreateInvoiceModal()">
        <i data-lucide="plus"></i> Generate GST Invoice
      </button>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Date</th>
              <th>Customer Name</th>
              <th>Grand Total</th>
              <th>Payment Status</th>
              <th>Payment Method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map(inv => `
              <tr>
                <td><strong>${inv.invoiceNo}</strong></td>
                <td>${inv.date}</td>
                <td>${inv.customerName}</td>
                <td><strong>₹${inv.grandTotal.toLocaleString('en-IN')}</strong></td>
                <td><span class="badge ${inv.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${inv.paymentStatus}</span></td>
                <td>${inv.paymentMethod}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="previewDoc1Invoice('${inv.id}')" title="Print/View Official Document 1 Invoice">
                    <i data-lucide="printer"></i> Print / PDF
                  </button>
                  <button class="btn btn-accent btn-sm" onclick="shareWhatsApp('${inv.invoiceNo}')">
                    <i data-lucide="send"></i> WhatsApp
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 6. INVENTORY MANAGEMENT MODULE
function renderInventory() {
  const products = window.ftStore.get('products');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Inventory & Warehouse Stock</h2>
        <p>Real-time stock movement, warehouse entries, and replenishment alerts</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="alert('Stock In Entry Modal')"><i data-lucide="arrow-down-left"></i> Stock In</button>
        <button class="btn btn-primary" onclick="alert('Stock Out Entry Modal')"><i data-lucide="arrow-up-right"></i> Stock Out</button>
      </div>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU Code</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Available Stock</th>
              <th>Reorder Level</th>
              <th>Stock Status</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td><strong>${p.sku}</strong></td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td><span style="font-size: 16px; font-weight: 700;">${p.stockQuantity}</span></td>
                <td>5 units</td>
                <td>
                  <span class="badge ${p.stockQuantity <= 5 ? 'badge-danger' : 'badge-success'}">
                    ${p.stockQuantity <= 5 ? 'CRITICAL - REORDER' : 'OPTIMAL'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 7. SUPPLIER & PURCHASE MODULE
function renderSuppliers() {
  const suppliers = window.ftStore.get('suppliers');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Supplier & Procurement Management</h2>
        <p>Equipment Vendors & Spare Parts Suppliers</p>
      </div>
      <button class="btn btn-primary" onclick="alert('Add Supplier Modal')">
        <i data-lucide="truck"></i> Add Supplier
      </button>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Supplier ID</th>
              <th>Company Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>GSTIN</th>
            </tr>
          </thead>
          <tbody>
            ${suppliers.map(s => `
              <tr>
                <td><strong>${s.id}</strong></td>
                <td>${s.name}</td>
                <td>${s.contact}</td>
                <td>${s.phone}</td>
                <td>${s.gstin}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 8. SERVICE MANAGEMENT & JOB CARDS MODULE
function renderServiceJobs() {
  const jobs = window.ftStore.get('jobCards');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Service & Job Card Management</h2>
        <p>AC & Refrigeration Maintenance, Water Wash & Repair Job Cards</p>
      </div>
      <button class="btn btn-primary" onclick="openCreateJobCardModal()">
        <i data-lucide="wrench"></i> New Complaint Job Card
      </button>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Job #</th>
              <th>Customer</th>
              <th>Equipment / Product</th>
              <th>Complaint Details</th>
              <th>Assigned Technician</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${jobs.map(j => `
              <tr>
                <td><strong>${j.jobNumber}</strong></td>
                <td>${j.customerName}</td>
                <td>${j.product}</td>
                <td>${j.complaint}</td>
                <td>${j.technicianName}</td>
                <td><span class="badge ${j.priority === 'High' ? 'badge-danger' : 'badge-warning'}">${j.priority}</span></td>
                <td><span class="badge ${j.status === 'Completed' ? 'badge-success' : 'badge-info'}">${j.status}</span></td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="updateJobStatusModal('${j.id}')">
                    Update Status
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 9. TECHNICIAN WORKSPACE MODULE
function renderTechnicianModule() {
  const jobs = window.ftStore.get('jobCards');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Technician Field Portal</h2>
        <p>Field Service Engineer Workstation & Mobile Workflow</p>
      </div>
    </div>

    <div class="grid-2">
      ${jobs.map(j => `
        <div class="card">
          <div class="card-header">
            <div>
              <strong style="font-size: 16px; color: var(--primary);">${j.jobNumber}</strong>
              <span class="badge badge-warning" style="margin-left: 8px;">${j.priority} Priority</span>
            </div>
            <span class="badge badge-info">${j.status}</span>
          </div>
          <div style="line-height: 1.8; margin-bottom: 16px;">
            <p><strong>Customer:</strong> ${j.customerName}</p>
            <p><strong>Equipment:</strong> ${j.product}</p>
            <p><strong>Complaint:</strong> ${j.complaint}</p>
            <p><strong>Scheduled Date:</strong> ${j.visitDate}</p>
            <p><strong>Parts Consumed:</strong> ${j.partsUsed || 'None'}</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary btn-sm" onclick="alert('Navigating to Customer Location via Google Maps...')">
              <i data-lucide="navigation"></i> Location Map
            </button>

            <button class="btn btn-accent btn-sm" onclick="alert('Photo Attachment Uploaded & Customer Digital Signature Captured!')">
              <i data-lucide="check-square"></i> Complete Job & Sign
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 10. AMC TRACKER MODULE
function renderAMCTracker() {
  const amcs = window.ftStore.get('amcContracts');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Annual Maintenance Contract (AMC) Tracker</h2>
        <p>Monitor customer AMC validity, quarterly visits, and renewal reminders</p>
      </div>
      <button class="btn btn-primary" onclick="alert('New AMC Contract Form')">
        <i data-lucide="shield-plus"></i> New AMC Contract
      </button>
    </div>

    <div class="grid-2">
      ${amcs.map(a => `
        <div class="card">
          <div class="card-header">
            <div>
              <strong style="font-size: 17px; color: var(--primary);">${a.amcNumber}</strong>
              <div style="font-size: 13px; color: var(--text-secondary);">${a.customerName}</div>
            </div>
            <span class="badge ${a.status === 'Active' ? 'badge-success' : 'badge-warning'}">${a.status}</span>
          </div>
          <div style="line-height: 1.8; margin: 12px 0;">
            <p><strong>Covered Equipment:</strong> ${a.product}</p>
            <p><strong>Contract Period:</strong> ${a.startDate} to ${a.endDate}</p>
            <p><strong>Visit Progress:</strong> ${a.completedVisits} of ${a.totalVisits} Completed (${a.remainingVisits} Remaining)</p>
          </div>
          <div style="background: var(--bg-main); border-radius: 6px; height: 10px; overflow: hidden; margin-bottom: 16px;">
            <div style="background: var(--primary); height: 100%; width: ${(a.completedVisits / a.totalVisits) * 100}%;"></div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="alert('Generating scheduled visit job card...')">
            <i data-lucide="calendar"></i> Schedule Next Visit
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

// 11. INSTALLATIONS MODULE
function renderInstallations() {
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>After-Sales & Installation Tracker</h2>
        <p>Track new Panasonic AC installations, technician visits, and warranty activation</p>
      </div>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Installation Status</th>
              <th>Assigned Tech</th>
              <th>Warranty Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>FT/2026/0718</strong></td>
              <td>Apex Super Specialty Hospital</td>
              <td>Panasonic 2.0 Ton Inverter Split AC (x2)</td>
              <td><span class="badge badge-warning">Installation Scheduled</span></td>
              <td>Suresh V</td>
              <td><span class="badge badge-info">12 Months Warranty Pending</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 12. EMPLOYEE MANAGEMENT
function renderEmployees() {
  const employees = window.ftStore.get('employees');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Employee Management</h2>
        <p>Staff profiles, technicians, and HR records</p>
      </div>
      <button class="btn btn-primary" onclick="alert('Add Employee Modal')"><i data-lucide="user-plus"></i> Add Employee</button>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Emp Code</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Mobile</th>
              <th>Salary (Monthly)</th>
              <th>Joining Date</th>
            </tr>
          </thead>
          <tbody>
            ${employees.map(e => `
              <tr>
                <td><strong>${e.code}</strong></td>
                <td>${e.name}</td>
                <td><span class="badge badge-purple">${e.designation}</span></td>
                <td>${e.phone}</td>
                <td>₹${parseFloat(e.salary).toLocaleString('en-IN')}</td>
                <td>${e.joining}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 13. ATTENDANCE MODULE
function renderAttendance() {
  const att = window.ftStore.get('attendance');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Daily Attendance & Shift Tracker</h2>
        <p>Field technician check-in, working hours, and leave tracking</p>
      </div>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${att.map(a => `
              <tr>
                <td><strong>${a.employeeName}</strong></td>
                <td>${a.date}</td>
                <td>${a.checkIn}</td>
                <td>${a.checkOut}</td>
                <td><span class="badge badge-success">${a.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 14. PAYMENTS MODULE
function renderPayments() {
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Payment & Collections Management</h2>
        <p>Cash, UPI, Card, and Bank Transfer Payment Logs</p>
      </div>
      <button class="btn btn-primary" onclick="alert('Record Payment Modal')"><i data-lucide="credit-card"></i> Record Receipt</button>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Payment Method</th>
              <th>Amount Received</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>RCP-901</strong></td>
              <td>FT/2026/0713</td>
              <td>M/s. Mebacare Naturals Salon</td>
              <td><span class="badge badge-info">UPI</span></td>
              <td><strong>₹7,000.00</strong></td>
              <td>13/07/2026</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 15. REPORTS MODULE
function renderReports() {
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Business Reports & GST Analytics</h2>
        <p>Financial Summaries, GST Output Tax, and Service Metrics</p>
      </div>
    </div>
    <div class="grid-3">
      <div class="card" onclick="alert('Generating Sales Report PDF...')">
        <div class="card-title" style="margin-bottom: 8px;"><i data-lucide="bar-chart-3"></i> Sales Report</div>
        <p style="color: var(--text-secondary); font-size: 13px;">Monthly revenue breakdown, customer-wise sales analysis.</p>
      </div>
      <div class="card" onclick="alert('Generating GST 18% Tax Report...')">
        <div class="card-title" style="margin-bottom: 8px;"><i data-lucide="file-text"></i> GST Tax Filing Summary</div>
        <p style="color: var(--text-secondary); font-size: 13px;">B2B & B2C 18% GST output tax calculations for GSTR-1.</p>
      </div>
      <div class="card" onclick="alert('Generating Service Metrics Report...')">
        <div class="card-title" style="margin-bottom: 8px;"><i data-lucide="wrench"></i> Service Efficiency</div>
        <p style="color: var(--text-secondary); font-size: 13px;">Technician job turnaround times & spare parts consumption.</p>
      </div>
    </div>
  `;
}

// 16. SETTINGS MODULE
function renderSettings() {
  const company = window.ftStore.get('company');
  return `
    <div class="page-header">
      <div class="page-title">
        <h2>Company Setup & Master Settings</h2>
        <p>Freeze Technology business parameters, GSTIN, and Bank configuration</p>
      </div>
    </div>
    <div class="card" style="max-width: 800px;">
      <div class="card-header">
        <div class="card-title">Freeze Technology Organization Profile</div>
      </div>
      <div class="form-group">
        <label>Company Name</label>
        <input type="text" class="form-control" value="${company.name}" readonly />
      </div>
      <div class="form-group">
        <label>Business Description</label>
        <input type="text" class="form-control" value="${company.subTitle}" readonly />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>GSTIN Number</label>
          <input type="text" class="form-control" value="${company.gstin}" readonly />
        </div>
        <div class="form-group">
          <label>Brand Authorization</label>
          <input type="text" class="form-control" value="${company.brandAuth}" readonly />
        </div>
      </div>
      <div class="form-group">
        <label>Registered Office Address</label>
        <textarea class="form-control" rows="2" readonly>${company.regdOffice}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Phone / Cell</label>
          <input type="text" class="form-control" value="${company.phone} / ${company.cell}" readonly />
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="text" class="form-control" value="${company.email}" readonly />
        </div>
      </div>

      <h4 style="margin: 20px 0 10px 0; color: var(--primary);">Official Bank Account Details (Doc 1)</h4>
      <div class="form-row">
        <div class="form-group">
          <label>Bank Name</label>
          <input type="text" class="form-control" value="${company.bank.name}" readonly />
        </div>
        <div class="form-group">
          <label>Branch</label>
          <input type="text" class="form-control" value="${company.bank.branch}" readonly />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Account Number</label>
          <input type="text" class="form-control" value="${company.bank.accountNo}" readonly />
        </div>
        <div class="form-group">
          <label>IFSC Code</label>
          <input type="text" class="form-control" value="${company.bank.ifsc}" readonly />
        </div>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/* DASHBOARD CHARTS (CANVAS RENDERER)                                         */
/* -------------------------------------------------------------------------- */
function initDashboardCharts() {
  setTimeout(() => {
    // 1. Revenue Chart
    const canvasRev = document.getElementById('chart-revenue');
    if (canvasRev) {
      const ctx = canvasRev.getContext('2d');
      drawBarChart(ctx, ['Apr', 'May', 'Jun', 'Jul', 'Aug'], [120000, 185000, 240000, 310000, 195000], '#2F612F');
    }

    // 2. Services Chart
    const canvasSrv = document.getElementById('chart-services');
    if (canvasSrv) {
      const ctx = canvasSrv.getContext('2d');
      drawDonutChart(ctx, ['Water Wash', 'General Checking', 'Wiring Repair', 'Gas Charging'], [40, 25, 20, 15], ['#2F612F', '#4D8A4D', '#FFF101', '#2196F3']);
    }
  }, 100);
}

function drawBarChart(ctx, labels, values, color) {
  const width = ctx.canvas.width = ctx.canvas.parentElement.clientWidth;
  const height = ctx.canvas.height = 240;
  ctx.clearRect(0, 0, width, height);

  const maxVal = Math.max(...values) * 1.2;
  const barWidth = 36;
  const gap = (width - 60 - (labels.length * barWidth)) / (labels.length + 1);

  values.forEach((val, i) => {
    const x = 40 + gap + i * (barWidth + gap);
    const barH = (val / maxVal) * (height - 60);
    const y = height - 40 - barH;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, [6, 6, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = '#5E6470';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barWidth / 2, height - 15);
  });
}

function drawDonutChart(ctx, labels, values, colors) {
  const width = ctx.canvas.width = ctx.canvas.parentElement.clientWidth;
  const height = ctx.canvas.height = 240;
  ctx.clearRect(0, 0, width, height);

  const total = values.reduce((a, b) => a + b, 0);
  let startAngle = 0;
  const centerX = width / 3;
  const centerY = height / 2;
  const radius = 70;

  values.forEach((val, i) => {
    const sliceAngle = (val / total) * 2 * Math.PI;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    startAngle += sliceAngle;
  });

  // Inner cutout
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 42, 0, 2 * Math.PI);
  ctx.fill();

  // Legend
  labels.forEach((label, i) => {
    const lx = width / 2 + 30;
    const ly = 50 + (i * 36);

    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.roundRect(lx, ly - 10, 14, 14, 3);
    ctx.fill();

    ctx.fillStyle = '#1E1E1E';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${label} (${values[i]}%)`, lx + 22, ly);
  });
}

/* -------------------------------------------------------------------------- */
/* MODALS & DOCUMENT 1 INVOICE PRINTING ENGINE                                */
/* -------------------------------------------------------------------------- */
function previewDoc1Invoice(invoiceId) {
  const inv = window.ftStore.getById('invoices', invoiceId) || window.ftStore.get('invoices')[0];
  const company = window.ftStore.get('company');

  const printArea = document.getElementById('printable-invoice');
  if (!printArea) return;

  printArea.innerHTML = `
    <div class="doc1-invoice-box">
      <!-- Top Brand Header -->
      <div class="doc1-header">
        <div class="doc1-logo-area">
          <img src="assets/logo.png" alt="FT Logo" style="width: 70px; height: 70px; object-fit: contain;" />
          <div class="doc1-company-title">
            <h1>FREEZE TECHNOLOGY</h1>
            <p>Air Conditioning & Refrigeration Sales & Service</p>
            <div class="doc1-company-gst">GSTIN: ${company.gstin}</div>
          </div>
        </div>

        <div class="doc1-panasonic">
          <h2>Panasonic</h2>
          <span>Authorised Sales & Service</span>
        </div>
      </div>

      <div class="doc1-title-bar">INVOICE</div>

      <!-- Info Box (Customer vs Invoice Meta) -->
      <div class="doc1-info-grid">
        <div class="doc1-to-box">
          <strong style="font-size: 14px;">To:</strong>
          <div style="font-weight: bold; margin-top: 4px; font-size: 13.5px;">${inv.customerName}</div>
          <div style="font-size: 12.5px; line-height: 1.4; margin-top: 2px;">${inv.customerAddress}</div>
        </div>

        <div class="doc1-meta-box">
          <div class="doc1-meta-row"><span>Invoice No</span> <span>: ${inv.invoiceNo}</span></div>
          <div class="doc1-meta-row"><span>Date</span> <span>: ${inv.date}</span></div>
          <div class="doc1-meta-row"><span>Customer's GSTIN</span> <span>: ${inv.customerGstin || ''}</span></div>
        </div>
      </div>

      <!-- Items Table (Exact Doc 1 Headers & Layout) -->
      <table class="doc1-table">
        <thead>
          <tr>
            <th style="width: 45px;">S.N.</th>
            <th>Description</th>
            <th style="width: 50px;">Qty</th>
            <th style="width: 60px;">GST</th>
            <th style="width: 80px;">Rate</th>
            <th style="width: 100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map(item => `
            <tr>
              <td class="center"><strong>${item.sn}</strong></td>
              <td>${item.description}</td>
              <td class="center">${item.qty}</td>
              <td class="center">${item.gst}</td>
              <td class="right">${item.rate.toLocaleString('en-IN')}</td>
              <td class="right">${item.amount.toFixed(2)}</td>
            </tr>
          `).join('')}

          <!-- GST Extra Row -->
          <tr class="doc1-extra-row">
            <td colspan="4" class="right" style="padding-right: 15px;">GST 18% EXTRA</td>
            <td class="center"><strong>Grand Total</strong></td>
            <td class="right"><strong>${inv.grandTotal.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>

      <!-- Bank Details & Signatory Footer -->
      <div class="doc1-footer-grid">
        <div class="doc1-bank-details">
          <div><strong>Bank Name</strong> : ${company.bank.name}</div>
          <div><strong>Branch</strong> : ${company.bank.branch}</div>
          <div><strong>Account No</strong> : ${company.bank.accountNo}</div>
          <div><strong>IFSC Code</strong> : ${company.bank.ifsc}</div>
        </div>

        <div class="doc1-sign-box">
          <h3>For FREEZE TECHNOLOGY</h3>
          <div style="font-size: 12px; margin-top: 40px;">Authorised Signatory</div>
        </div>
      </div>
    </div>

    <div class="doc1-regd-footer">
      <div>Regd Office: ${company.regdOffice}</div>
      <div>Phone No: ${company.phone}, Cell: ${company.cell}, Email: ${company.email}</div>
    </div>
  `;

  // Trigger browser print
  window.print();
}

function shareWhatsApp(invoiceNo) {
  alert(`Sharing Invoice ${invoiceNo} via WhatsApp API to customer's mobile number...`);
}

function openAddCustomerModal() {
  document.getElementById('modal-title').innerText = 'Add New Customer';
  document.getElementById('modal-body').innerHTML = `
    <form id="form-customer">
      <div class="form-group">
        <label>Customer Name / Company</label>
        <input type="text" id="cust-name" class="form-control" required placeholder="e.g. M/s. Mebacare Naturals Salon" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Customer Type</label>
          <select id="cust-type" class="form-control">
            <option value="Commercial">Commercial</option>
            <option value="Retail">Retail</option>
          </select>
        </div>
        <div class="form-group">
          <label>Mobile Number</label>
          <input type="text" id="cust-mobile" class="form-control" required placeholder="10-digit mobile" />
        </div>
      </div>
      <div class="form-group">
        <label>Address</label>
        <textarea id="cust-address" class="form-control" rows="2" placeholder="Full street address & pincode"></textarea>
      </div>
    </form>
  `;
  document.getElementById('modal-save-btn').onclick = () => {
    const name = document.getElementById('cust-name').value;
    const type = document.getElementById('cust-type').value;
    const mobile = document.getElementById('cust-mobile').value;
    const address = document.getElementById('cust-address').value;
    if (!name || !mobile) return alert('Please enter Customer Name and Mobile');

    window.ftStore.add('customers', {
      id: 'CUST-' + Math.floor(100 + Math.random() * 900),
      name, type, mobile, address, createdAt: new Date().toISOString().split('T')[0]
    });
    closeModal();
    renderCurrentModule('customers');
  };
  openModal();
}

function openModal() {
  document.getElementById('custom-modal').classList.add('active');
}
function closeModal() {
  document.getElementById('custom-modal').classList.remove('active');
}

function bindGlobalEvents() {
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
}

window.previewDoc1Invoice = previewDoc1Invoice;
window.shareWhatsApp = shareWhatsApp;
window.openAddCustomerModal = openAddCustomerModal;
