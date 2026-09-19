import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT token if present in browser storage
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ft_access_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle common errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    return Promise.reject(error);
  },
);

export default apiClient;

// Customer API helpers
export const customerApi = {
  getCustomers: async (params = {}) => {
    const response = await apiClient.get('/customers', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/customers/stats');
    return response.data;
  },

  getCustomerById: async (id) => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
  },

  createCustomer: async (customerData) => {
    const response = await apiClient.post('/customers', customerData);
    return response.data;
  },

  updateCustomer: async (id, customerData) => {
    const response = await apiClient.patch(`/customers/${id}`, customerData);
    return response.data;
  },

  deleteCustomer: async (id) => {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  },
};

// Product API helpers
export const productApi = {
  getProducts: async (params = {}) => {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/products/stats');
    return response.data;
  },

  getCategories: async () => {
    const response = await apiClient.get('/products/categories');
    return response.data;
  },

  getBrands: async () => {
    const response = await apiClient.get('/products/brands');
    return response.data;
  },

  getProductById: async (id) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await apiClient.post('/products', productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await apiClient.patch(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },
};

// Quotation API helpers
export const quotationApi = {
  getQuotations: async (params = {}) => {
    const response = await apiClient.get('/quotations', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/quotations/stats');
    return response.data;
  },

  getQuotationById: async (id) => {
    const response = await apiClient.get(`/quotations/${id}`);
    return response.data;
  },

  createQuotation: async (quotationData) => {
    const response = await apiClient.post('/quotations', quotationData);
    return response.data;
  },

  updateQuotation: async (id, quotationData) => {
    const response = await apiClient.patch(`/quotations/${id}`, quotationData);
    return response.data;
  },

  deleteQuotation: async (id) => {
    const response = await apiClient.delete(`/quotations/${id}`);
    return response.data;
  },

  convertToInvoice: async (id) => {
    const response = await apiClient.post(`/quotations/${id}/convert-to-invoice`);
    return response.data;
  },
};

// Invoice API helpers
export const invoiceApi = {
  getInvoices: async () => {
    const response = await apiClient.get('/invoices');
    return response.data;
  },

  createInvoice: async (invoiceData) => {
    const response = await apiClient.post('/invoices', invoiceData);
    return response.data;
  },
};

// Payment API helpers
export const paymentApi = {
  getPayments: async (params = {}) => {
    const response = await apiClient.get('/payments', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/payments/stats');
    return response.data;
  },

  getPaymentById: async (id) => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  },

  createPayment: async (paymentData) => {
    const response = await apiClient.post('/payments', paymentData);
    return response.data;
  },

  updatePayment: async (id, paymentData) => {
    const response = await apiClient.patch(`/payments/${id}`, paymentData);
    return response.data;
  },

  deletePayment: async (id) => {
    const response = await apiClient.delete(`/payments/${id}`);
    return response.data;
  },
};

// Service & Job Card API helpers
export const serviceApi = {
  getServices: async (params = {}) => {
    const response = await apiClient.get('/services', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/services/stats');
    return response.data;
  },

  getTechnicians: async () => {
    const response = await apiClient.get('/services/technicians');
    return response.data;
  },

  getServiceById: async (id) => {
    const response = await apiClient.get(`/services/${id}`);
    return response.data;
  },

  createService: async (serviceData) => {
    const response = await apiClient.post('/services', serviceData);
    return response.data;
  },

  updateService: async (id, serviceData) => {
    const response = await apiClient.patch(`/services/${id}`, serviceData);
    return response.data;
  },

  assignTechnician: async (id, assignData) => {
    const response = await apiClient.patch(`/services/${id}/assign`, assignData);
    return response.data;
  },

  updateStatus: async (id, statusData) => {
    const response = await apiClient.patch(`/services/${id}/status`, statusData);
    return response.data;
  },

  completeService: async (id, completeData) => {
    const response = await apiClient.patch(`/services/${id}/complete`, completeData);
    return response.data;
  },

  createInvoice: async (id) => {
    const response = await apiClient.post(`/services/${id}/create-invoice`);
    return response.data;
  },

  deleteService: async (id) => {
    const response = await apiClient.delete(`/services/${id}`);
    return response.data;
  },
};

// AMC API helpers
export const amcApi = {
  getContracts: async (params = {}) => {
    const response = await apiClient.get('/amc', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/amc/stats');
    return response.data;
  },

  getContractById: async (id) => {
    const response = await apiClient.get(`/amc/${id}`);
    return response.data;
  },

  createContract: async (contractData) => {
    const response = await apiClient.post('/amc', contractData);
    return response.data;
  },

  updateContract: async (id, contractData) => {
    const response = await apiClient.patch(`/amc/${id}`, contractData);
    return response.data;
  },

  updateStatus: async (id, statusData) => {
    const response = await apiClient.patch(`/amc/${id}/status`, statusData);
    return response.data;
  },

  scheduleVisit: async (id, visitData) => {
    const response = await apiClient.post(`/amc/${id}/visits`, visitData);
    return response.data;
  },

  completeVisit: async (id, visitId) => {
    const response = await apiClient.patch(`/amc/${id}/visits/${visitId}/complete`);
    return response.data;
  },

  renewContract: async (id, renewData) => {
    const response = await apiClient.post(`/amc/${id}/renew`, renewData);
    return response.data;
  },

  createInvoice: async (id) => {
    const response = await apiClient.post(`/amc/${id}/create-invoice`);
    return response.data;
  },

  deleteContract: async (id) => {
    const response = await apiClient.delete(`/amc/${id}`);
    return response.data;
  },
};

// Installation API helpers
export const installationApi = {
  getInstallations: async (params = {}) => {
    const response = await apiClient.get('/installations', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/installations/stats');
    return response.data;
  },

  getInstallationById: async (id) => {
    const response = await apiClient.get(`/installations/${id}`);
    return response.data;
  },

  createInstallation: async (installationData) => {
    const response = await apiClient.post('/installations', installationData);
    return response.data;
  },

  updateInstallation: async (id, installationData) => {
    const response = await apiClient.patch(`/installations/${id}`, installationData);
    return response.data;
  },

  assignTechnician: async (id, assignData) => {
    const response = await apiClient.patch(`/installations/${id}/assign`, assignData);
    return response.data;
  },

  updateStatus: async (id, statusData) => {
    const response = await apiClient.patch(`/installations/${id}/status`, statusData);
    return response.data;
  },

  completeInstallation: async (id, completeData) => {
    const response = await apiClient.patch(`/installations/${id}/complete`, completeData);
    return response.data;
  },

  createInvoice: async (id) => {
    const response = await apiClient.post(`/installations/${id}/create-invoice`);
    return response.data;
  },

  deleteInstallation: async (id) => {
    const response = await apiClient.delete(`/installations/${id}`);
    return response.data;
  },
};

// Inventory & Stock Management API helpers
export const inventoryApi = {
  getInventory: async (params = {}) => {
    const response = await apiClient.get('/inventory', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/inventory/stats');
    return response.data;
  },

  getInventoryItem: async (id) => {
    const response = await apiClient.get(`/inventory/${id}`);
    return response.data;
  },

  createReceipt: async (receiptData) => {
    const response = await apiClient.post('/inventory/receipts', receiptData);
    return response.data;
  },

  createIssue: async (issueData) => {
    const response = await apiClient.post('/inventory/issues', issueData);
    return response.data;
  },

  createAdjustment: async (adjustmentData) => {
    const response = await apiClient.post('/inventory/adjustments', adjustmentData);
    return response.data;
  },

  createTransfer: async (transferData) => {
    const response = await apiClient.post('/inventory/transfers', transferData);
    return response.data;
  },

  getTransactions: async (params = {}) => {
    const response = await apiClient.get('/inventory/transactions', { params });
    return response.data;
  },

  getLowStock: async () => {
    const response = await apiClient.get('/inventory/low-stock');
    return response.data;
  },
};

// Supplier & Vendor API helpers
export const supplierApi = {
  getSuppliers: async (params = {}) => {
    const response = await apiClient.get('/suppliers', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/suppliers/stats');
    return response.data;
  },

  getSupplierById: async (id) => {
    const response = await apiClient.get(`/suppliers/${id}`);
    return response.data;
  },

  createSupplier: async (supplierData) => {
    const response = await apiClient.post('/suppliers', supplierData);
    return response.data;
  },

  updateSupplier: async (id, supplierData) => {
    const response = await apiClient.patch(`/suppliers/${id}`, supplierData);
    return response.data;
  },

  deleteSupplier: async (id) => {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response.data;
  },
};

// Purchase Order Procurement API helpers
export const purchaseOrderApi = {
  getPurchaseOrders: async (params = {}) => {
    const response = await apiClient.get('/purchase-orders', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/purchase-orders/stats');
    return response.data;
  },

  getPurchaseOrderById: async (id) => {
    const response = await apiClient.get(`/purchase-orders/${id}`);
    return response.data;
  },

  createPurchaseOrder: async (poData) => {
    const response = await apiClient.post('/purchase-orders', poData);
    return response.data;
  },

  updatePurchaseOrder: async (id, poData) => {
    const response = await apiClient.patch(`/purchase-orders/${id}`, poData);
    return response.data;
  },

  submitPurchaseOrder: async (id) => {
    const response = await apiClient.patch(`/purchase-orders/${id}/submit`);
    return response.data;
  },

  approvePurchaseOrder: async (id) => {
    const response = await apiClient.patch(`/purchase-orders/${id}/approve`);
    return response.data;
  },

  receiveStock: async (id, receiveData) => {
    const response = await apiClient.post(`/purchase-orders/${id}/receive`, receiveData);
    return response.data;
  },

  cancelPurchaseOrder: async (id) => {
    const response = await apiClient.delete(`/purchase-orders/${id}`);
    return response.data;
  },
};

// Plural aliases for convenience
export const suppliersApi = supplierApi;
export const purchaseOrdersApi = purchaseOrderApi;

// Employee & Workforce API helpers
export const employeeApi = {
  getEmployees: async (params = {}) => {
    const response = await apiClient.get('/employees', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/employees/stats');
    return response.data;
  },

  getTechnicians: async () => {
    const response = await apiClient.get('/employees/technicians');
    return response.data;
  },

  getEmployeeById: async (id) => {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data;
  },

  createEmployee: async (employeeData) => {
    const response = await apiClient.post('/employees', employeeData);
    return response.data;
  },

  updateEmployee: async (id, employeeData) => {
    const response = await apiClient.patch(`/employees/${id}`, employeeData);
    return response.data;
  },

  deleteEmployee: async (id) => {
    const response = await apiClient.delete(`/employees/${id}`);
    return response.data;
  },
};

// Daily Attendance & Shift API helpers
export const attendanceApi = {
  getAttendance: async (params = {}) => {
    const response = await apiClient.get('/attendance', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/attendance/stats');
    return response.data;
  },

  getAttendanceById: async (id) => {
    const response = await apiClient.get(`/attendance/${id}`);
    return response.data;
  },

  checkIn: async (checkInData) => {
    const response = await apiClient.post('/attendance/check-in', checkInData);
    return response.data;
  },

  checkOut: async (id, checkOutData = {}) => {
    const response = await apiClient.patch(`/attendance/${id}/check-out`, checkOutData);
    return response.data;
  },

  markAttendance: async (attendanceData) => {
    const response = await apiClient.post('/attendance/mark', attendanceData);
    return response.data;
  },

  updateAttendance: async (id, attendanceData) => {
    const response = await apiClient.patch(`/attendance/${id}`, attendanceData);
    return response.data;
  },

  deleteAttendance: async (id) => {
    const response = await apiClient.delete(`/attendance/${id}`);
    return response.data;
  },
};

// Payroll & Salary Processing API helpers
export const payrollApi = {
  getPayrolls: async (params = {}) => {
    const response = await apiClient.get('/payroll', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/payroll/stats');
    return response.data;
  },

  getPeriods: async (params = {}) => {
    const response = await apiClient.get('/payroll/periods', { params });
    return response.data;
  },

  getPayrollById: async (id) => {
    const response = await apiClient.get(`/payroll/${id}`);
    return response.data;
  },

  getRecords: async (id, params = {}) => {
    const response = await apiClient.get(`/payroll/${id}/records`, { params });
    return response.data;
  },

  getRecordById: async (id, employeeId) => {
    const response = await apiClient.get(`/payroll/${id}/records/${employeeId}`);
    return response.data;
  },

  createPeriod: async (periodData) => {
    const response = await apiClient.post('/payroll/periods', periodData);
    return response.data;
  },

  calculatePayroll: async (id, calculationData = {}) => {
    const response = await apiClient.post(`/payroll/${id}/calculate`, calculationData);
    return response.data;
  },

  updateRecord: async (id, employeeId, recordData) => {
    const response = await apiClient.patch(`/payroll/${id}/records/${employeeId}`, recordData);
    return response.data;
  },

  approvePayroll: async (id, approveData = {}) => {
    const response = await apiClient.post(`/payroll/${id}/approve`, approveData);
    return response.data;
  },

  markPaid: async (id, paidData) => {
    const response = await apiClient.post(`/payroll/${id}/mark-paid`, paidData);
    return response.data;
  },

  cancelPayroll: async (id) => {
    const response = await apiClient.post(`/payroll/${id}/cancel`);
    return response.data;
  },

  getPayslipUrl: (id, employeeId) => {
    return `/api/payroll/${id}/records/${employeeId}/payslip`;
  },
};

// Accounts Payable & Expense Management API helpers
export const payablesApi = {
  getStats: async () => {
    const response = await apiClient.get('/payables/stats');
    return response.data;
  },

  getCategories: async () => {
    const response = await apiClient.get('/payables/categories');
    return response.data;
  },

  getAging: async () => {
    const response = await apiClient.get('/payables/aging');
    return response.data;
  },

  // Vendor Bills
  getBills: async (params = {}) => {
    const response = await apiClient.get('/payables/bills', { params });
    return response.data;
  },

  getBill: async (id) => {
    const response = await apiClient.get(`/payables/bills/${id}`);
    return response.data;
  },

  createBill: async (billData) => {
    const response = await apiClient.post('/payables/bills', billData);
    return response.data;
  },

  updateBill: async (id, billData) => {
    const response = await apiClient.patch(`/payables/bills/${id}`, billData);
    return response.data;
  },

  submitBill: async (id) => {
    const response = await apiClient.post(`/payables/bills/${id}/submit`);
    return response.data;
  },

  approveBill: async (id) => {
    const response = await apiClient.post(`/payables/bills/${id}/approve`);
    return response.data;
  },

  recordBillPayment: async (id, paymentData) => {
    const response = await apiClient.post(`/payables/bills/${id}/payment`, paymentData);
    return response.data;
  },

  cancelBill: async (id) => {
    const response = await apiClient.post(`/payables/bills/${id}/cancel`);
    return response.data;
  },

  downloadBillPdf: async (id, filename) => {
    const response = await apiClient.get(`/payables/bills/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename ? (filename.endsWith('.pdf') ? filename : `${filename}.pdf`) : `Vendor_Bill_${id}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  getBillPdfUrl: (id) => {
    return `${API_BASE_URL}/payables/bills/${id}/pdf`;
  },

  // Operating Expenses
  getExpenses: async (params = {}) => {
    const response = await apiClient.get('/payables/expenses', { params });
    return response.data;
  },

  getExpense: async (id) => {
    const response = await apiClient.get(`/payables/expenses/${id}`);
    return response.data;
  },

  createExpense: async (expenseData) => {
    const response = await apiClient.post('/payables/expenses', expenseData);
    return response.data;
  },

  updateExpense: async (id, expenseData) => {
    const response = await apiClient.patch(`/payables/expenses/${id}`, expenseData);
    return response.data;
  },

  submitExpense: async (id) => {
    const response = await apiClient.post(`/payables/expenses/${id}/submit`);
    return response.data;
  },

  approveExpense: async (id) => {
    const response = await apiClient.post(`/payables/expenses/${id}/approve`);
    return response.data;
  },

  rejectExpense: async (id, notes = '') => {
    const response = await apiClient.post(`/payables/expenses/${id}/reject`, { notes });
    return response.data;
  },

  recordExpensePayment: async (id, paymentData) => {
    const response = await apiClient.post(`/payables/expenses/${id}/payment`, paymentData);
    return response.data;
  },

  cancelExpense: async (id) => {
    const response = await apiClient.post(`/payables/expenses/${id}/cancel`);
    return response.data;
  },

  downloadExpensePdf: async (id, filename) => {
    const response = await apiClient.get(`/payables/expenses/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename ? (filename.endsWith('.pdf') ? filename : `${filename}.pdf`) : `Expense_Voucher_${id}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  getExpensePdfUrl: (id) => {
    return `${API_BASE_URL}/payables/expenses/${id}/pdf`;
  },

  // Payments & History
  getPayments: async (params = {}) => {
    const response = await apiClient.get('/payables/payments', { params });
    return response.data;
  },

  downloadPaymentReceipt: async (id, filename) => {
    const response = await apiClient.get(`/payables/payments/${id}/receipt`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename ? (filename.endsWith('.pdf') ? filename : `${filename}.pdf`) : `Payment_Receipt_${id}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  getPaymentReceiptUrl: (id) => {
    return `${API_BASE_URL}/payables/payments/${id}/receipt`;
  },

  getHistory: async (id) => {
    const response = await apiClient.get(`/payables/${id}/history`);
    return response.data;
  },
};

// Phase 14 — Reports, GST & Management Analytics API helpers
export const reportsApi = {
  // 1. Dashboard
  getDashboard: async (params = {}) => {
    const response = await apiClient.get('/reports/dashboard', { params });
    return response.data;
  },

  downloadDashboardPdf: async (params = {}, filename = 'Management_Dashboard.pdf') => {
    const response = await apiClient.get('/reports/dashboard/pdf', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // 2. Sales & Revenue
  getSales: async (params = {}) => {
    const response = await apiClient.get('/reports/sales', { params });
    return response.data;
  },

  downloadSalesCsv: async (params = {}) => {
    const response = await apiClient.get('/reports/sales/export', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `report-sales-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadSalesPdf: async (params = {}, filename = 'Sales_Report.pdf') => {
    const response = await apiClient.get('/reports/sales/pdf', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // 3. Receivables & Aging
  getReceivables: async (params = {}) => {
    const response = await apiClient.get('/reports/receivables', { params });
    return response.data;
  },

  downloadReceivablesCsv: async (params = {}) => {
    const response = await apiClient.get('/reports/receivables/export', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `report-receivables-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadReceivablesPdf: async (params = {}, filename = 'Receivables_Aging.pdf') => {
    const response = await apiClient.get('/reports/receivables/pdf', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // 4. Procurement & POs
  getProcurement: async (params = {}) => {
    const response = await apiClient.get('/reports/procurement', { params });
    return response.data;
  },

  downloadProcurementCsv: async (params = {}) => {
    const response = await apiClient.get('/reports/procurement/export', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `report-procurement-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // 5. Payables & Supplier Aging
  getPayables: async (params = {}) => {
    const response = await apiClient.get('/reports/payables', { params });
    return response.data;
  },

  downloadPayablesCsv: async (params = {}) => {
    const response = await apiClient.get('/reports/payables/export', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `report-payables-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadPayablesPdf: async (params = {}, filename = 'Payables_Aging.pdf') => {
    const response = await apiClient.get('/reports/payables/pdf', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // 6. Expenses
  getExpenses: async (params = {}) => {
    const response = await apiClient.get('/reports/expenses', { params });
    return response.data;
  },

  downloadExpensesCsv: async (params = {}) => {
    const response = await apiClient.get('/reports/expenses/export', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `report-expenses-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // 7. Inventory
  getInventory: async (params = {}) => {
    const response = await apiClient.get('/reports/inventory', { params });
    return response.data;
  },

  downloadInventoryCsv: async (params = {}) => {
    const response = await apiClient.get('/reports/inventory/export', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `report-inventory-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadInventoryPdf: async (params = {}, filename = 'Inventory_Valuation.pdf') => {
    const response = await apiClient.get('/reports/inventory/pdf', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // 8. GST
  getGstSummary: async (params = {}) => {
    const response = await apiClient.get('/reports/gst/summary', { params });
    return response.data;
  },

  getGstOutward: async (params = {}) => {
    const response = await apiClient.get('/reports/gst/outward', { params });
    return response.data;
  },

  getGstInward: async (params = {}) => {
    const response = await apiClient.get('/reports/gst/inward', { params });
    return response.data;
  },

  downloadGstCsv: async (params = {}) => {
    const response = await apiClient.get('/reports/gst/export', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `report-gst-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadGstPdf: async (params = {}, filename = 'GST_Computation.pdf') => {
    const response = await apiClient.get('/reports/gst/pdf', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // 9. Financial Summary
  getFinancialSummary: async (params = {}) => {
    const response = await apiClient.get('/reports/financial-summary', { params });
    return response.data;
  },

  // 10. Operations & Field
  getOperations: async (params = {}) => {
    const response = await apiClient.get('/reports/operations', { params });
    return response.data;
  },

  // 11. Workforce & Payroll
  getWorkforce: async (params = {}) => {
    const response = await apiClient.get('/reports/workforce', { params });
    return response.data;
  },

  // 12. Phase 15 Reports
  getAssetsReport: async (params = {}) => {
    const response = await apiClient.get('/reports/assets', { params });
    return response.data;
  },

  getAmcReport: async (params = {}) => {
    const response = await apiClient.get('/reports/amc', { params });
    return response.data;
  },

  getPmReport: async (params = {}) => {
    const response = await apiClient.get('/reports/preventive-maintenance', { params });
    return response.data;
  },
};

// ==========================================
// PHASE 15: ASSET MANAGEMENT API
// ==========================================
export const assetApi = {
  getAssets: async (params = {}) => {
    const response = await apiClient.get('/assets', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/assets/stats');
    return response.data;
  },

  getWarrantyAnalysis: async () => {
    const response = await apiClient.get('/assets/warranty');
    return response.data;
  },

  getAssetById: async (id) => {
    const response = await apiClient.get(`/assets/${id}`);
    return response.data;
  },

  createAsset: async (data) => {
    const response = await apiClient.post('/assets', data);
    return response.data;
  },

  updateAsset: async (id, data) => {
    const response = await apiClient.patch(`/assets/${id}`, data);
    return response.data;
  },

  deleteAsset: async (id) => {
    const response = await apiClient.delete(`/assets/${id}`);
    return response.data;
  },

  downloadAssetCardPdf: async (id, filename = `Asset_${id}.pdf`) => {
    const response = await apiClient.get(`/assets/${id}/pdf`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadAssetRegisterPdf: async (params = {}, filename = `Asset_Register_${Date.now()}.pdf`) => {
    const response = await apiClient.get('/assets/export/register-pdf', { params, responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },
};

// ==========================================
// PHASE 15: PREVENTIVE MAINTENANCE API
// ==========================================
export const preventiveMaintenanceApi = {
  getSchedules: async (params = {}) => {
    const response = await apiClient.get('/preventive-maintenance', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/preventive-maintenance/stats');
    return response.data;
  },

  getScheduleById: async (id) => {
    const response = await apiClient.get(`/preventive-maintenance/${id}`);
    return response.data;
  },

  createSchedule: async (data) => {
    const response = await apiClient.post('/preventive-maintenance', data);
    return response.data;
  },

  generateAmcPM: async (amcContractId) => {
    const response = await apiClient.post('/preventive-maintenance/generate-amc-pm', { amcContractId });
    return response.data;
  },

  updateSchedule: async (id, data) => {
    const response = await apiClient.patch(`/preventive-maintenance/${id}`, data);
    return response.data;
  },

  completeVisit: async (id, data) => {
    const response = await apiClient.post(`/preventive-maintenance/${id}/complete`, data);
    return response.data;
  },

  downloadVisitPdf: async (id, filename = `PM_Visit_${id}.pdf`) => {
    const response = await apiClient.get(`/preventive-maintenance/${id}/pdf`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadScheduleReportPdf: async (params = {}, filename = `PM_Schedule_Report_${Date.now()}.pdf`) => {
    const response = await apiClient.get('/preventive-maintenance/export/pdf', { params, responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },
};

// ==========================================
// PHASE 15: AMC MANAGEMENT & BILLING API
// ==========================================
export const amcManagementApi = {
  getContracts: async (params = {}) => {
    const response = await apiClient.get('/amc', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/amc/stats');
    return response.data;
  },

  getContractById: async (id) => {
    const response = await apiClient.get(`/amc/${id}`);
    return response.data;
  },

  getBillingSchedules: async (id) => {
    const response = await apiClient.get(`/amc/${id}/billing-schedules`);
    return response.data;
  },

  createContract: async (data) => {
    const response = await apiClient.post('/amc', data);
    return response.data;
  },

  generateBillingInvoice: async (data) => {
    const response = await apiClient.post('/amc/billing/generate', data);
    return response.data;
  },

  renewContract: async (id, data) => {
    const response = await apiClient.post(`/amc/${id}/renew`, data);
    return response.data;
  },

  downloadContractPdf: async (id, filename = `AMC_Contract_${id}.pdf`) => {
    const response = await apiClient.get(`/amc/${id}/pdf`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadRenewalPdf: async (id, filename = `AMC_Renewal_${id}.pdf`) => {
    const response = await apiClient.get(`/amc/${id}/renewal-pdf`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  downloadRevenueReportPdf: async (params = {}, filename = `AMC_Revenue_Report_${Date.now()}.pdf`) => {
    const response = await apiClient.get('/amc/export/revenue-pdf', { params, responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },
};

// ==========================================
// PHASE 16: NOTIFICATIONS & ALERTS API
// ==========================================
export const notificationApi = {
  getNotifications: async (params = {}) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/notifications/stats');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  getNotificationById: async (id) => {
    const response = await apiClient.get(`/notifications/${id}`);
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAsUnread: async (id) => {
    const response = await apiClient.patch(`/notifications/${id}/unread`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },

  archiveNotification: async (id) => {
    const response = await apiClient.patch(`/notifications/${id}/archive`);
    return response.data;
  },

  archiveAll: async () => {
    const response = await apiClient.patch('/notifications/archive-all');
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },

  getPreferences: async () => {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (data) => {
    const response = await apiClient.patch('/notifications/preferences', data);
    return response.data;
  },

  runAutomatedChecks: async () => {
    const response = await apiClient.post('/notifications/evaluate-rules');
    return response.data;
  },
};

// Users API helpers
export const usersApi = {
  getUsers: async (params = {}) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/users/stats');
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await apiClient.post('/users', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await apiClient.patch(`/users/${id}`, userData);
    return response.data;
  },

  activateUser: async (id) => {
    const response = await apiClient.patch(`/users/${id}/activate`);
    return response.data;
  },

  deactivateUser: async (id) => {
    const response = await apiClient.patch(`/users/${id}/deactivate`);
    return response.data;
  },

  assignRole: async (id, roleId) => {
    const response = await apiClient.patch(`/users/${id}/role`, { roleId });
    return response.data;
  },

  getUserPermissions: async (id) => {
    const response = await apiClient.get(`/users/${id}/permissions`);
    return response.data;
  },

  getUserActivity: async (id) => {
    const response = await apiClient.get(`/users/${id}/activity`);
    return response.data;
  },
};

// Roles & Permissions API helpers
export const rolesApi = {
  getRoles: async () => {
    const response = await apiClient.get('/roles');
    return response.data;
  },

  getRoleById: async (id) => {
    const response = await apiClient.get(`/roles/${id}`);
    return response.data;
  },

  createRole: async (roleData) => {
    const response = await apiClient.post('/roles', roleData);
    return response.data;
  },

  updateRole: async (id, roleData) => {
    const response = await apiClient.patch(`/roles/${id}`, roleData);
    return response.data;
  },

  deleteRole: async (id) => {
    const response = await apiClient.delete(`/roles/${id}`);
    return response.data;
  },

  getRolePermissions: async (id) => {
    const response = await apiClient.get(`/roles/${id}/permissions`);
    return response.data;
  },

  updateRolePermissions: async (id, permissionIds) => {
    const response = await apiClient.put(`/roles/${id}/permissions`, { permissionIds });
    return response.data;
  },
};

export const permissionsApi = {
  getPermissions: async () => {
    const response = await apiClient.get('/permissions');
    return response.data;
  },
};

// System Settings & Diagnostics API helpers
export const systemSettingsApi = {
  getCompanySettings: async () => {
    const response = await apiClient.get('/settings/company');
    return response.data;
  },

  updateCompanySettings: async (data) => {
    const response = await apiClient.patch('/settings/company', data);
    return response.data;
  },

  getSystemSettings: async () => {
    const response = await apiClient.get('/settings/system');
    return response.data;
  },

  getSystemSettingsByCategory: async (category) => {
    const response = await apiClient.get(`/settings/system/${category}`);
    return response.data;
  },

  updateSystemSetting: async (key, value, description) => {
    const response = await apiClient.patch(`/settings/system/${key}`, { value, description });
    return response.data;
  },

  getAuditLogs: async (params = {}) => {
    const response = await apiClient.get('/settings/audit-logs', { params });
    return response.data;
  },

  getDiagnostics: async () => {
    const response = await apiClient.get('/settings/diagnostics');
    return response.data;
  },
};

// Executive Dashboard & BI API helpers
export const executiveDashboardApi = {
  getDashboardData: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard', { params });
    return response.data;
  },

  getSummary: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/summary', { params });
    return response.data;
  },

  getKPIs: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/kpis', { params });
    return response.data;
  },

  getTrends: async () => {
    const response = await apiClient.get('/executive-dashboard/trends');
    return response.data;
  },

  getProfitability: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/profitability', { params });
    return response.data;
  },

  getAging: async () => {
    const response = await apiClient.get('/executive-dashboard/aging');
    return response.data;
  },

  getExceptions: async () => {
    const response = await apiClient.get('/executive-dashboard/exceptions');
    return response.data;
  },

  getRevenue: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/revenue', { params });
    return response.data;
  },

  getCollections: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/collections', { params });
    return response.data;
  },

  getExpenses: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/expenses', { params });
    return response.data;
  },

  getPayroll: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/payroll', { params });
    return response.data;
  },

  getInventory: async () => {
    const response = await apiClient.get('/executive-dashboard/inventory');
    return response.data;
  },

  getProcurement: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/procurement', { params });
    return response.data;
  },

  getServices: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/service', { params });
    return response.data;
  },

  getAMC: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/amc', { params });
    return response.data;
  },

  getAssets: async () => {
    const response = await apiClient.get('/executive-dashboard/assets');
    return response.data;
  },

  getPM: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/preventive-maintenance', { params });
    return response.data;
  },

  getGST: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/gst', { params });
    return response.data;
  },

  downloadPdf: async (params = {}) => {
    const response = await apiClient.get('/executive-dashboard/pdf', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

// ============================================================
// PHASE 19 — GENERAL LEDGER & DOUBLE-ENTRY ACCOUNTING API
// ============================================================
export const accountingApi = {
  // Dashboard & Overview
  getDashboard: async () => {
    const response = await apiClient.get('/accounting/dashboard');
    return response.data;
  },

  // Chart of Accounts
  getAccounts: async (params = {}) => {
    const response = await apiClient.get('/accounting/accounts', { params });
    return response.data;
  },

  getAccountTree: async () => {
    const response = await apiClient.get('/accounting/accounts/tree');
    return response.data;
  },

  getAccountById: async (id) => {
    const response = await apiClient.get(`/accounting/accounts/${id}`);
    return response.data;
  },

  createAccount: async (data) => {
    const response = await apiClient.post('/accounting/accounts', data);
    return response.data;
  },

  updateAccount: async (id, data) => {
    const response = await apiClient.patch(`/accounting/accounts/${id}`, data);
    return response.data;
  },

  deleteAccount: async (id) => {
    const response = await apiClient.delete(`/accounting/accounts/${id}`);
    return response.data;
  },

  // Journal Entries
  getJournals: async (params = {}) => {
    const response = await apiClient.get('/accounting/journals', { params });
    return response.data;
  },

  getJournalById: async (id) => {
    const response = await apiClient.get(`/accounting/journals/${id}`);
    return response.data;
  },

  createJournal: async (data) => {
    const response = await apiClient.post('/accounting/journals', data);
    return response.data;
  },

  reverseJournal: async (id, data) => {
    const response = await apiClient.post(`/accounting/journals/${id}/reverse`, data);
    return response.data;
  },

  // Financial Reports
  getLedger: async (params = {}) => {
    const response = await apiClient.get('/accounting/ledger', { params });
    return response.data;
  },

  getTrialBalance: async (params = {}) => {
    const response = await apiClient.get('/accounting/trial-balance', { params });
    return response.data;
  },

  getProfitAndLoss: async (params = {}) => {
    const response = await apiClient.get('/accounting/profit-and-loss', { params });
    return response.data;
  },

  getBalanceSheet: async (params = {}) => {
    const response = await apiClient.get('/accounting/balance-sheet', { params });
    return response.data;
  },

  getCashBook: async (params = {}) => {
    const response = await apiClient.get('/accounting/cash-book', { params });
    return response.data;
  },

  getReconciliation: async () => {
    const response = await apiClient.get('/accounting/reconciliation');
    return response.data;
  },

  // Automated ERP Sync
  syncErp: async () => {
    const response = await apiClient.post('/accounting/sync-erp');
    return response.data;
  },

  // Accounting Periods
  getPeriods: async () => {
    const response = await apiClient.get('/accounting/periods');
    return response.data;
  },

  createPeriod: async (data) => {
    const response = await apiClient.post('/accounting/periods', data);
    return response.data;
  },

  closePeriod: async (id, data = {}) => {
    const response = await apiClient.patch(`/accounting/periods/${id}/close`, data);
    return response.data;
  },

  reopenPeriod: async (id) => {
    const response = await apiClient.patch(`/accounting/periods/${id}/reopen`);
    return response.data;
  },

  // PDF Downloads
  downloadCoaPdf: async () => {
    const response = await apiClient.get('/accounting/pdf/coa', { responseType: 'blob' });
    return response.data;
  },

  downloadTrialBalancePdf: async () => {
    const response = await apiClient.get('/accounting/pdf/trial-balance', { responseType: 'blob' });
    return response.data;
  },

  downloadProfitAndLossPdf: async () => {
    const response = await apiClient.get('/accounting/pdf/profit-and-loss', { responseType: 'blob' });
    return response.data;
  },

  downloadBalanceSheetPdf: async () => {
    const response = await apiClient.get('/accounting/pdf/balance-sheet', { responseType: 'blob' });
    return response.data;
  },

  downloadLedgerPdf: async (accountId) => {
    const response = await apiClient.get('/accounting/pdf/ledger', {
      params: accountId ? { accountId } : {},
      responseType: 'blob',
    });
    return response.data;
  },

  downloadCashBookPdf: async () => {
    const response = await apiClient.get('/accounting/pdf/cash-book', { responseType: 'blob' });
    return response.data;
  },

  downloadJournalRegisterPdf: async () => {
    const response = await apiClient.get('/accounting/pdf/journal-register', { responseType: 'blob' });
    return response.data;
  },

  downloadReconciliationPdf: async () => {
    const response = await apiClient.get('/accounting/pdf/reconciliation', { responseType: 'blob' });
    return response.data;
  },
};


