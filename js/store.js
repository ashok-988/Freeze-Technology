/* -------------------------------------------------------------------------- */
/* FREEZE TECHNOLOGY ERP - DATA STORE & LOCAL STORAGE MANAGER                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'FT_ERP_DATABASE_V1';

const INITIAL_STATE = {
  company: {
    name: 'FREEZE TECHNOLOGY',
    subTitle: 'Air Conditioning & Refrigeration Sales & Service',
    gstin: '33BKCPD7319A2ZU',
    brandAuth: 'Panasonic Authorised Sales & Service',
    regdOffice: 'C15, 1st Cross Street, PTC Quarters, Thoraipakkam, OMR, Chennai - 600 097',
    phone: '044-35723836',
    cell: '9884955011 / +91 88077 33953',
    email: 'freezetechnology.ft@gmail.com',
    website: 'https://www.freezetechnology.in/',
    bank: {
      name: 'Axis Bank',
      branch: 'Thoraipakkam',
      accountNo: '915020010100166',
      ifsc: 'UTIB0001566'
    }
  },

  customers: [
    {
      id: 'CUST-001',
      name: 'M/s. Mebacare Naturals Salon',
      type: 'Commercial',
      mobile: '9840123456',
      alternate: '044-24901122',
      email: 'contact@mebacare.com',
      gstin: '33AAACM1234F1Z5',
      address: 'No.25/3 East Mada Street, Thiruvanmiyur, Chennai 600041',
      createdAt: '2026-06-10'
    },
    {
      id: 'CUST-002',
      name: 'Apex Super Specialty Hospital',
      type: 'Commercial',
      mobile: '9884099887',
      alternate: '044-35709900',
      email: 'admin@apexhospital.org',
      gstin: '33AAACA9876E1Z1',
      address: '45 OMR Main Road, Kandanchavadi, Chennai 600096',
      createdAt: '2026-05-15'
    },
    {
      id: 'CUST-003',
      name: 'Ramesh Kumar',
      type: 'Retail',
      mobile: '9790887766',
      alternate: '',
      email: 'ramesh.k@gmail.com',
      gstin: '',
      address: 'Flat 3B, Sunshine Apartments, Adyar, Chennai 600020',
      createdAt: '2026-07-01'
    }
  ],

  products: [
    {
      id: 'PROD-001',
      sku: 'AC-PAN-15T',
      name: 'Panasonic 1.5 Ton 5 Star Inverter Split AC',
      brand: 'Panasonic',
      model: 'CS/CU-NU18YKY5W',
      category: 'AC',
      sellingPrice: 42500,
      purchasePrice: 36000,
      warrantyMonths: 12,
      stockQuantity: 14
    },
    {
      id: 'PROD-002',
      sku: 'AC-PAN-20T',
      name: 'Panasonic 2.0 Ton 3 Star Inverter Split AC',
      brand: 'Panasonic',
      model: 'CS/CU-NU24YKY3W',
      category: 'AC',
      sellingPrice: 54000,
      purchasePrice: 46000,
      warrantyMonths: 12,
      stockQuantity: 6
    },
    {
      id: 'PROD-003',
      sku: 'SRV-GEN-CLN',
      name: 'General checking and air filter cleaning work',
      brand: 'Service',
      model: 'Service-AC',
      category: 'Service',
      sellingPrice: 400,
      purchasePrice: 100,
      warrantyMonths: 1,
      stockQuantity: 999
    },
    {
      id: 'PROD-004',
      sku: 'SRV-WTR-WSH',
      name: 'Water wash work',
      brand: 'Service',
      model: 'Service-AC',
      category: 'Service',
      sellingPrice: 1500,
      purchasePrice: 300,
      warrantyMonths: 1,
      stockQuantity: 999
    },
    {
      id: 'PROD-005',
      sku: 'SRV-WRG-PRB',
      name: 'Wiring problem repair',
      brand: 'Service',
      model: 'Service-AC',
      category: 'Service',
      sellingPrice: 600,
      purchasePrice: 150,
      warrantyMonths: 1,
      stockQuantity: 999
    },
    {
      id: 'PROD-006',
      sku: 'SP-R22-GAS',
      name: 'R32 Eco Refrigerant Gas (1kg)',
      brand: 'Panasonic',
      model: 'R32-GAS',
      category: 'Spare Parts',
      sellingPrice: 1800,
      purchasePrice: 1100,
      warrantyMonths: 0,
      stockQuantity: 3
    }
  ],

  invoices: [
    {
      id: 'INV-2026-0713',
      invoiceNo: 'FT/2026/0713',
      date: '13/07/2026',
      customerId: 'CUST-001',
      customerName: 'M/s. Mebacare Naturals Salon',
      customerAddress: 'No.25/3 East Mada Street, Thiruvanmiyur, Chennai 600041.',
      customerGstin: '',
      items: [
        { sn: 1, description: 'General checking and air filter cleaning work', qty: 1, gst: '18%', rate: 400, amount: 400.00 },
        { sn: 2, description: 'Water wash work', qty: 4, gst: '18%', rate: 1500, amount: 6000.00 },
        { sn: 3, description: 'Wiring problem', qty: 1, gst: '18%', rate: 600, amount: 600.00 }
      ],
      gstNote: 'GST 18% EXTRA',
      grandTotal: 7000.00,
      paymentStatus: 'Paid',
      paymentMethod: 'UPI'
    },
    {
      id: 'INV-2026-0718',
      invoiceNo: 'FT/2026/0718',
      date: '18/07/2026',
      customerId: 'CUST-002',
      customerName: 'Apex Super Specialty Hospital',
      customerAddress: '45 OMR Main Road, Kandanchavadi, Chennai 600096',
      customerGstin: '33AAACA9876E1Z1',
      items: [
        { sn: 1, description: 'Panasonic 2.0 Ton Inverter Split AC', qty: 2, gst: '18%', rate: 54000, amount: 108000.00 },
        { sn: 2, description: 'Installation & Piping Charges', qty: 2, gst: '18%', rate: 2500, amount: 5000.00 }
      ],
      gstNote: 'GST Included (18%)',
      grandTotal: 113000.00,
      paymentStatus: 'Pending',
      paymentMethod: 'Bank Transfer'
    }
  ],

  quotations: [
    {
      id: 'QT-2026-009',
      quotationNo: 'FT-QT-009',
      date: '2026-08-01',
      customerId: 'CUST-002',
      customerName: 'Apex Super Specialty Hospital',
      total: 145000,
      status: 'Approved'
    },
    {
      id: 'QT-2026-012',
      quotationNo: 'FT-QT-012',
      date: '2026-08-04',
      customerId: 'CUST-003',
      customerName: 'Ramesh Kumar',
      total: 44000,
      status: 'Sent'
    }
  ],

  jobCards: [
    {
      id: 'JOB-2026-042',
      jobNumber: 'JC-9042',
      customerId: 'CUST-001',
      customerName: 'M/s. Mebacare Naturals Salon',
      product: 'Panasonic 1.5T AC (Salon Main Hall)',
      complaint: 'Cooling insufficient & unusual noise from blower',
      technicianId: 'EMP-004',
      technicianName: 'Suresh V (Lead AC Tech)',
      visitDate: '2026-08-05',
      priority: 'High',
      status: 'In Progress',
      partsUsed: 'Capacitor 45uF'
    },
    {
      id: 'JOB-2026-043',
      jobNumber: 'JC-9043',
      customerId: 'CUST-003',
      customerName: 'Ramesh Kumar',
      product: 'Panasonic Refrigerator 350L',
      complaint: 'Water leakage inside chiller tray',
      technicianId: 'EMP-005',
      technicianName: 'Karthik R (Senior Tech)',
      visitDate: '2026-08-06',
      priority: 'Medium',
      status: 'Assigned',
      partsUsed: '-'
    }
  ],

  amcContracts: [
    {
      id: 'AMC-2026-101',
      amcNumber: 'AMC-FT-101',
      customerId: 'CUST-001',
      customerName: 'M/s. Mebacare Naturals Salon',
      product: '3 x Panasonic 1.5T AC Units',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      totalVisits: 4,
      completedVisits: 2,
      remainingVisits: 2,
      status: 'Active'
    },
    {
      id: 'AMC-2026-108',
      amcNumber: 'AMC-FT-108',
      customerId: 'CUST-002',
      customerName: 'Apex Super Specialty Hospital',
      product: '12 x Cassette AC Units',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      totalVisits: 6,
      completedVisits: 5,
      remainingVisits: 1,
      status: 'Expiring Soon'
    }
  ],

  employees: [
    { id: 'EMP-001', code: 'FT-E01', name: 'FT', designation: 'General Manager', phone: '9884955011', salary: '65000', joining: '2020-01-15' },
    { id: 'EMP-004', code: 'FT-E04', name: 'Suresh V', designation: 'Lead AC Technician', phone: '9789012345', salary: '28000', joining: '2021-06-10' },
    { id: 'EMP-005', code: 'FT-E05', name: 'Karthik R', designation: 'Senior HVAC Technician', phone: '9840987654', salary: '25000', joining: '2022-03-01' }
  ],

  attendance: [
    { id: 'ATT-001', employeeName: 'Suresh V', date: '2026-08-05', checkIn: '09:00 AM', checkOut: '06:30 PM', status: 'Present' },
    { id: 'ATT-002', employeeName: 'Karthik R', date: '2026-08-05', checkIn: '09:15 AM', checkOut: '06:00 PM', status: 'Present' }
  ],

  suppliers: [
    { id: 'SUP-01', name: 'Panasonic India Pvt Ltd', contact: 'Rajesh Kumar', phone: '044-49001122', gstin: '33AAACP1234A1Z0' },
    { id: 'SUP-02', name: 'Metro Refrigeration Spares', contact: 'Venkatesh', phone: '9841099881', gstin: '33BBCPM4321B1Z2' }
  ],

  purchases: [
    { id: 'PO-901', poNumber: 'PO-2026-004', supplierName: 'Panasonic India Pvt Ltd', date: '2026-07-20', total: 216000, status: 'Received' }
  ],

  notifications: [
    { id: 'N-1', title: 'Low Stock Alert', message: 'R32 Eco Refrigerant Gas stock is at 3 units (Below reorder level 5).', type: 'Warning', time: '10 mins ago' },
    { id: 'N-2', title: 'AMC Expiry Alert', message: 'Apex Hospital AMC-FT-108 expires in 25 days.', type: 'Info', time: '2 hours ago' }
  ]
};

class Store {
  constructor() {
    this.data = this.loadStore();
  }

  loadStore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.saveStore(INITIAL_STATE);
      return INITIAL_STATE;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse database, resetting to initial state', e);
      this.saveStore(INITIAL_STATE);
      return INITIAL_STATE;
    }
  }

  saveStore(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state || this.data));
  }

  get(collection) {
    return this.data[collection] || [];
  }

  getById(collection, id) {
    const items = this.get(collection);
    return items.find(item => item.id === id);
  }

  add(collection, item) {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    this.data[collection].unshift(item);
    this.saveStore();
    return item;
  }

  update(collection, id, updatedFields) {
    const items = this.get(collection);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[collection][index] = { ...this.data[collection][index], ...updatedFields };
      this.saveStore();
      return this.data[collection][index];
    }
    return null;
  }

  delete(collection, id) {
    if (this.data[collection]) {
      this.data[collection] = this.data[collection].filter(item => item.id !== id);
      this.saveStore();
    }
  }

  // Business Analytics Calculations
  getAnalytics() {
    const invoices = this.get('invoices');
    const totalSales = invoices.reduce((sum, inv) => sum + (parseFloat(inv.grandTotal) || 0), 0);
    const pendingInvoices = invoices.filter(i => i.paymentStatus === 'Pending');
    const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + (parseFloat(inv.grandTotal) || 0), 0);

    const jobCards = this.get('jobCards');
    const activeJobs = jobCards.filter(j => j.status !== 'Completed');
    const todayJobs = jobCards.filter(j => j.visitDate === new Date().toISOString().split('T')[0]);

    const amc = this.get('amcContracts');
    const activeAmc = amc.filter(a => a.status === 'Active');

    const products = this.get('products');
    const lowStock = products.filter(p => p.stockQuantity <= 5);

    return {
      totalSales,
      pendingRevenue,
      totalInvoicesCount: invoices.length,
      activeJobsCount: activeJobs.length,
      todayJobsCount: todayJobs.length,
      activeAmcCount: activeAmc.length,
      lowStockCount: lowStock.length
    };
  }
}

window.ftStore = new Store();
