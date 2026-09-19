'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Trash2,
  Edit3,
  Eye,
  X,
  CreditCard,
  FileText,
  Download,
  Printer,
  Shield,
  Layers,
  Clock,
  Check,
  ArrowRight,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  Tag,
  DollarSign,
  TrendingDown,
  ChevronRight,
  Filter,
  CheckSquare,
  XCircle,
  UserCheck,
} from 'lucide-react';
import {
  payablesApi,
  supplierApi,
  purchaseOrderApi,
  employeeApi,
} from '../../lib/api/client';

// Safe normalization helper for API response envelopes
const normalizeList = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export default function PayablesPage() {
  // Tabs: 'bills' | 'expenses' | 'payments' | 'aging'
  const [activeTab, setActiveTab] = useState('bills');

  // Main Data States
  const [bills, setBills] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [aging, setAging] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [stats, setStats] = useState({
    totalPayables: 0,
    outstandingPayables: 0,
    overdueAmount: 0,
    dueThisWeek: 0,
    pendingApproval: 0,
    expensesThisMonth: 0,
    paidThisMonth: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals
  const [showCreateBillModal, setShowCreateBillModal] = useState(false);
  const [billFormData, setBillFormData] = useState({
    supplierId: '',
    purchaseOrderId: '',
    vendorInvoiceNumber: '',
    vendorInvoiceDate: new Date().toISOString().split('T')[0],
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    discountAmount: 0,
    gstNumber: '',
    notes: '',
    items: [
      { description: '', quantity: 1, unitPrice: 0, taxRate: 18 },
    ],
  });

  const [showCreateExpenseModal, setShowCreateExpenseModal] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    categoryId: '',
    supplierId: '',
    employeeId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    description: '',
    referenceNumber: '',
    subtotal: 0,
    taxAmount: 0,
    notes: '',
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null); // { type: 'BILL'|'EXPENSE', record: ... }
  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    paymentReference: '',
    notes: '',
  });

  // Drawer
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const formatCurrency = (val) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Load all initial data safely with Promise.allSettled
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const results = await Promise.allSettled([
        payablesApi.getStats(),
        payablesApi.getBills(),
        payablesApi.getExpenses(),
        payablesApi.getPayments(),
        payablesApi.getAging(),
        payablesApi.getCategories(),
        supplierApi.getSuppliers(),
        purchaseOrderApi.getPurchaseOrders(),
        employeeApi.getEmployees(),
      ]);

      const [
        statsRes,
        billsRes,
        expensesRes,
        paymentsRes,
        agingRes,
        categoriesRes,
        suppliersRes,
        posRes,
        empRes,
      ] = results;

      if (statsRes.status === 'fulfilled') {
        const sData = statsRes.value?.data || statsRes.value || {};
        setStats(sData);
      }

      if (billsRes.status === 'fulfilled') {
        setBills(normalizeList(billsRes.value));
      }

      if (expensesRes.status === 'fulfilled') {
        setExpenses(normalizeList(expensesRes.value));
      }

      if (paymentsRes.status === 'fulfilled') {
        setPayments(normalizeList(paymentsRes.value));
      }

      if (agingRes.status === 'fulfilled') {
        setAging(normalizeList(agingRes.value));
      }

      if (categoriesRes.status === 'fulfilled') {
        setCategories(normalizeList(categoriesRes.value));
      }

      if (suppliersRes.status === 'fulfilled') {
        setSuppliers(normalizeList(suppliersRes.value));
      } else {
        console.error('Failed to load suppliers:', suppliersRes.reason);
        showToast('Failed to load suppliers from database.', true);
      }

      if (posRes.status === 'fulfilled') {
        setPurchaseOrders(normalizeList(posRes.value));
      } else {
        console.error('Failed to load purchase orders:', posRes.reason);
        showToast('Failed to load purchase orders from database.', true);
      }

      if (empRes.status === 'fulfilled') {
        setEmployees(normalizeList(empRes.value));
      }
    } catch (err) {
      console.error('Failed to load accounts payable data:', err);
      showToast('Failed to load payables data from database.', true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (supplierFilter !== 'All' && b.supplierId !== supplierFilter) return false;
      if (statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        b.billNumber?.toLowerCase().includes(q) ||
        b.vendorInvoiceNumber?.toLowerCase().includes(q) ||
        b.supplier?.companyName?.toLowerCase().includes(q) ||
        b.purchaseOrder?.poNumber?.toLowerCase().includes(q)
      );
    });
  }, [bills, supplierFilter, statusFilter, search]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (categoryFilter !== 'All' && e.categoryId !== categoryFilter) return false;
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        e.expenseNumber?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.referenceNumber?.toLowerCase().includes(q) ||
        e.category?.name?.toLowerCase().includes(q) ||
        e.supplier?.companyName?.toLowerCase().includes(q) ||
        e.employee?.fullName?.toLowerCase().includes(q)
      );
    });
  }, [expenses, categoryFilter, statusFilter, search]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.paymentReference?.toLowerCase().includes(q) ||
        p.vendorBill?.billNumber?.toLowerCase().includes(q) ||
        p.vendorBill?.supplier?.companyName?.toLowerCase().includes(q) ||
        p.expense?.expenseNumber?.toLowerCase().includes(q)
      );
    });
  }, [payments, search]);

  // Eligible POs for Selected Supplier in Modal
  const eligiblePOsForSupplier = useMemo(() => {
    if (!billFormData.supplierId) return [];
    return purchaseOrders.filter(
      (po) => po.supplierId === billFormData.supplierId && po.status !== 'CANCELLED'
    );
  }, [purchaseOrders, billFormData.supplierId]);

  // Create Bill Calculation Helpers
  const billItemSubtotals = useMemo(() => {
    let sub = 0;
    let tax = 0;
    (billFormData.items || []).forEach((it) => {
      const lineSub = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      const lineTax = lineSub * ((Number(it.taxRate) || 0) / 100);
      sub += lineSub;
      tax += lineTax;
    });
    const disc = Number(billFormData.discountAmount) || 0;
    const tot = Math.max(0, sub + tax - disc);
    return { subtotal: sub, taxAmount: tax, totalAmount: tot };
  }, [billFormData.items, billFormData.discountAmount]);

  const handleAddBillItem = () => {
    setBillFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, taxRate: 18 }],
    }));
  };

  const handleRemoveBillItem = (index) => {
    if (billFormData.items.length <= 1) return;
    setBillFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleBillItemChange = (index, field, val) => {
    setBillFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, items: updated };
    });
  };

  // Supplier Change Handler in Modal
  const handleSupplierChange = (e) => {
    const supId = e.target.value;
    const selectedSup = suppliers.find((s) => s.id === supId);

    // If PO was previously selected, check if it belongs to this supplier
    let newPoId = billFormData.purchaseOrderId;
    if (newPoId) {
      const poObj = purchaseOrders.find((p) => p.id === newPoId);
      if (poObj && poObj.supplierId !== supId) {
        newPoId = '';
      }
    }

    setBillFormData((prev) => ({
      ...prev,
      supplierId: supId,
      purchaseOrderId: newPoId,
      gstNumber: selectedSup?.gstNumber || prev.gstNumber || '',
    }));
  };

  // Purchase Order Change Handler in Modal (Autofill Line Items & Totals)
  const handlePoChange = (e) => {
    const poId = e.target.value;

    if (!poId) {
      // Direct Bill (No PO)
      setBillFormData((prev) => ({
        ...prev,
        purchaseOrderId: '',
      }));
      return;
    }

    const selectedPo = purchaseOrders.find((p) => p.id === poId);
    if (!selectedPo) return;

    // Build line items from PO if items exist
    let newItems = [...billFormData.items];
    if (Array.isArray(selectedPo.items) && selectedPo.items.length > 0) {
      newItems = selectedPo.items.map((it) => ({
        productId: it.productId || null,
        description: it.product?.name || it.description || 'Line Item',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        taxRate: Number(it.taxRate) || 18,
      }));
    }

    setBillFormData((prev) => ({
      ...prev,
      purchaseOrderId: poId,
      supplierId: selectedPo.supplierId || prev.supplierId,
      gstNumber: selectedPo.supplier?.gstNumber || prev.gstNumber || '',
      notes: prev.notes || `Billed against Purchase Order ${selectedPo.poNumber}`,
      items: newItems,
    }));
  };

  // Create Bill Submit Handler
  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (!billFormData.supplierId) {
      showToast('Please select a supplier.', true);
      return;
    }

    try {
      setActionLoading(true);
      const res = await payablesApi.createBill(billFormData);
      showToast(res.message || 'Vendor bill created successfully.');
      setShowCreateBillModal(false);
      // Reset form
      setBillFormData({
        supplierId: '',
        purchaseOrderId: '',
        vendorInvoiceNumber: '',
        vendorInvoiceDate: new Date().toISOString().split('T')[0],
        billDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        discountAmount: 0,
        gstNumber: '',
        notes: '',
        items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 18 }],
      });
      await loadData();
    } catch (err) {
      console.error('Create bill error:', err);
      let errorMsg = 'Failed to create vendor bill.';
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join('; ')
          : String(err.response.data.message);
      }
      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Create Expense Submit Handler
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!expenseFormData.categoryId) {
      showToast('Please select an expense category.', true);
      return;
    }

    try {
      setActionLoading(true);
      const res = await payablesApi.createExpense({
        ...expenseFormData,
        subtotal: Number(expenseFormData.subtotal),
        taxAmount: Number(expenseFormData.taxAmount) || 0,
      });
      showToast(res.message || 'Expense recorded successfully.');
      setShowCreateExpenseModal(false);
      setExpenseFormData({
        categoryId: '',
        supplierId: '',
        employeeId: '',
        expenseDate: new Date().toISOString().split('T')[0],
        description: '',
        referenceNumber: '',
        subtotal: 0,
        taxAmount: 0,
        notes: '',
      });
      await loadData();
    } catch (err) {
      console.error('Create expense error:', err);
      let errorMsg = 'Failed to create expense.';
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join('; ')
          : String(err.response.data.message);
      }
      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Bill Actions: Submit, Approve, Cancel
  const handleBillAction = async (billId, action) => {
    try {
      setActionLoading(true);
      let res;
      if (action === 'submit') res = await payablesApi.submitBill(billId);
      if (action === 'approve') res = await payablesApi.approveBill(billId);
      if (action === 'cancel') res = await payablesApi.cancelBill(billId);

      showToast(res.message || `Vendor bill ${action} successful.`);
      await loadData();
    } catch (err) {
      console.error(`Bill action ${action} error:`, err);
      let errorMsg = `Failed to ${action} vendor bill.`;
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join('; ')
          : String(err.response.data.message);
      }
      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Expense Actions: Submit, Approve, Reject, Cancel
  const handleExpenseAction = async (expenseId, action) => {
    try {
      setActionLoading(true);
      let res;
      if (action === 'submit') res = await payablesApi.submitExpense(expenseId);
      if (action === 'approve') res = await payablesApi.approveExpense(expenseId);
      if (action === 'reject') res = await payablesApi.rejectExpense(expenseId, 'Rejected by Finance Admin');
      if (action === 'cancel') res = await payablesApi.cancelExpense(expenseId);

      showToast(res.message || `Expense ${action} successful.`);
      await loadData();
    } catch (err) {
      console.error(`Expense action ${action} error:`, err);
      let errorMsg = `Failed to ${action} expense.`;
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join('; ')
          : String(err.response.data.message);
      }
      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (type, record) => {
    setPaymentTarget({ type, record });
    setPaymentFormData({
      amount: record.balanceAmount || 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      paymentReference: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  // Submit Payment Handler
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentTarget) return;

    try {
      setActionLoading(true);
      let res;
      if (paymentTarget.type === 'BILL') {
        res = await payablesApi.recordBillPayment(paymentTarget.record.id, {
          ...paymentFormData,
          amount: Number(paymentFormData.amount),
        });
      } else {
        res = await payablesApi.recordExpensePayment(paymentTarget.record.id, {
          ...paymentFormData,
          amount: Number(paymentFormData.amount),
        });
      }

      showToast(res.message || 'Payment recorded successfully.');
      setShowPaymentModal(false);
      await loadData();
    } catch (err) {
      console.error('Record payment error:', err);
      let errorMsg = 'Failed to record payment.';
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join('; ')
          : String(err.response.data.message);
      }
      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Download Handlers (Axios Blob)
  const handleDownloadBillPdf = async (bill) => {
    if (!bill?.id) return;
    try {
      showToast(`Downloading PDF for ${bill.billNumber || 'Bill'}...`);
      await payablesApi.downloadBillPdf(
        bill.id,
        `${bill.billNumber || 'Vendor_Bill'}.pdf`
      );
      showToast(`Downloaded ${bill.billNumber || 'Vendor Bill'} PDF.`);
    } catch (err) {
      console.error('Download bill PDF error:', err);
      showToast('Failed to download vendor bill PDF.', true);
    }
  };

  const handleDownloadExpensePdf = async (expense) => {
    if (!expense?.id) return;
    try {
      showToast(`Downloading Voucher for ${expense.expenseNumber || 'Expense'}...`);
      await payablesApi.downloadExpensePdf(
        expense.id,
        `${expense.expenseNumber || 'Expense_Voucher'}.pdf`
      );
      showToast(`Downloaded ${expense.expenseNumber || 'Expense'} Voucher.`);
    } catch (err) {
      console.error('Download expense PDF error:', err);
      showToast('Failed to download expense voucher PDF.', true);
    }
  };

  const handleDownloadPaymentReceipt = async (payment) => {
    if (!payment?.id) return;
    try {
      showToast(`Downloading Payment Receipt...`);
      await payablesApi.downloadPaymentReceipt(
        payment.id,
        `Payment_Receipt_${payment.id.slice(0, 8)}.pdf`
      );
      showToast('Downloaded Payment Receipt PDF.');
    } catch (err) {
      console.error('Download payment receipt error:', err);
      showToast('Failed to download payment receipt PDF.', true);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" /> PAID
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> APPROVED
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <CreditCard className="w-3 h-3" /> PARTIALLY PAID
          </span>
        );
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <Edit3 className="w-3 h-3" /> DRAFT
          </span>
        );
      case 'CANCELLED':
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return <span className="text-gray-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            toastMessage.isError ? 'bg-rose-600 text-white' : 'bg-brand text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-brand" />
              Accounts Payable & Expenses
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Phase 13
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Vendor bills, operating expenses, outstanding payables and payment tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCreateExpenseModal(true)}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Tag className="w-4 h-4 text-brand" />
            + Record Expense
          </button>
          <button
            onClick={() => {
              setShowCreateBillModal(true);
              if (suppliers.length === 0 || purchaseOrders.length === 0) {
                loadData();
              }
            }}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Vendor Bill
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Payables</span>
            <Layers className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-lg font-bold text-gray-900 truncate">{formatCurrency(stats.totalPayables)}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Bills & Expenses</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Outstanding</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-amber-700 truncate">{formatCurrency(stats.outstandingPayables)}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Unpaid balance</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Overdue</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-rose-700 truncate">{formatCurrency(stats.overdueAmount)}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Past due date</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Due This Week</span>
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-blue-700 truncate">{formatCurrency(stats.dueThisWeek)}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Next 7 days</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Review</span>
            <Shield className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{stats.pendingApproval || 0}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Awaiting approval</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Expenses (Month)</span>
            <Tag className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-purple-700 truncate">{formatCurrency(stats.expensesThisMonth)}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Operating spend</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Disbursed (Month)</span>
            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-emerald-700 truncate">{formatCurrency(stats.paidThisMonth)}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Total outflows</div>
        </div>
      </div>

      {/* Tabs & Search Filter Header */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'bills'
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Vendor Bills ({bills.length})
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'expenses'
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Operating Expenses ({expenses.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'payments'
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Payment History ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('aging')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'aging'
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Supplier Aging ({aging.length})
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between pt-1">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'bills'
                  ? 'Search bill #, invoice #, supplier...'
                  : activeTab === 'expenses'
                    ? 'Search expense #, description, category...'
                    : activeTab === 'payments'
                      ? 'Search payment ref, bill #...'
                      : 'Search supplier aging...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {activeTab === 'bills' && (
              <>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                >
                  <option value="All">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                >
                  <option value="All">All Statuses</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                  <option value="PAID">PAID</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </>
            )}

            {activeTab === 'expenses' && (
              <>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                >
                  <option value="All">All Statuses</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PAID">PAID</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: VENDOR BILLS TABLE */}
      {activeTab === 'bills' && (
        <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                  <th className="p-3">Bill Number</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Vendor Inv #</th>
                  <th className="p-3">PO Reference</th>
                  <th className="p-3">Bill / Due Date</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-right">Tax (GST)</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-right">Paid / Balance</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="p-12 text-center text-xs text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
                      <div>Loading vendor bills from PostgreSQL...</div>
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="p-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-gray-800">No Vendor Bills Found</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        Create a vendor bill to manage accounts payable, link purchase orders, and track payments.
                      </p>
                      <button
                        onClick={() => setShowCreateBillModal(true)}
                        className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
                      >
                        + New Vendor Bill
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => {
                    const isOverdue = b.balanceAmount > 0 && new Date(b.dueDate) < new Date();

                    return (
                      <tr key={b.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-3">
                          <div className="font-mono font-bold text-brand flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-brand" />
                            {b.billNumber}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-gray-900">{b.supplier?.companyName || '-'}</div>
                          <div className="text-[10px] text-gray-500">{b.supplier?.contactPerson}</div>
                        </td>
                        <td className="p-3 font-mono text-gray-700">{b.vendorInvoiceNumber || '-'}</td>
                        <td className="p-3 font-mono text-gray-600">
                          {b.purchaseOrder?.poNumber ? (
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                              {b.purchaseOrder.poNumber}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-gray-900">{new Date(b.billDate).toLocaleDateString('en-GB')}</div>
                          <div className={`text-[10px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-gray-400'}`}>
                            Due: {new Date(b.dueDate).toLocaleDateString('en-GB')} {isOverdue && '(OVERDUE)'}
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium text-gray-700">{formatCurrency(b.subtotal)}</td>
                        <td className="p-3 text-right text-gray-500 font-medium">{formatCurrency(b.taxAmount)}</td>
                        <td className="p-3 text-right font-bold text-gray-900 text-sm">{formatCurrency(b.totalAmount)}</td>
                        <td className="p-3 text-right">
                          <div className="font-semibold text-emerald-700">{formatCurrency(b.paidAmount)}</div>
                          <div className="text-[10px] text-rose-600 font-bold">Bal: {formatCurrency(b.balanceAmount)}</div>
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(b.status)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={async () => {
                                const fullBill = await payablesApi.getBill(b.id);
                                setSelectedBill(fullBill.data || fullBill);
                                setShowDetailDrawer(true);
                              }}
                              className="p-1 text-gray-600 hover:text-brand hover:bg-brand/10 rounded"
                              title="View Details & 3-Way PO Reconciliation"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {b.status === 'DRAFT' && (
                              <button
                                onClick={() => handleBillAction(b.id, 'submit')}
                                className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded"
                                title="Submit for Approval"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {['SUBMITTED', 'UNDER_REVIEW', 'DRAFT'].includes(b.status) && (
                              <button
                                onClick={() => handleBillAction(b.id, 'approve')}
                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title="Approve Bill"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {['APPROVED', 'PARTIALLY_PAID'].includes(b.status) && b.balanceAmount > 0 && (
                              <button
                                onClick={() => handleOpenPayment('BILL', b)}
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                title="Record Vendor Payment"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDownloadBillPdf(b)}
                              className="p-1 text-gray-600 hover:text-brand hover:bg-brand/10 rounded"
                              title="Download PDF Bill"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OPERATING EXPENSES TABLE */}
      {activeTab === 'expenses' && (
        <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                  <th className="p-3">Expense #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Beneficiary / Paid To</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Tax</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-center">Approval Status</th>
                  <th className="p-3 text-center">Payment</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="p-12 text-center text-xs text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
                      <div>Loading expenses from PostgreSQL...</div>
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="p-12 text-center">
                      <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-gray-800">No Operating Expenses Recorded</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        Record day-to-day operational spend such as rent, fuel, vehicle upkeep, and utilities.
                      </p>
                      <button
                        onClick={() => setShowCreateExpenseModal(true)}
                        className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
                      >
                        + Record Expense
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-brand">{exp.expenseNumber}</td>
                      <td className="p-3 text-gray-900">{new Date(exp.expenseDate).toLocaleDateString('en-GB')}</td>
                      <td className="p-3">
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                          {exp.category?.name || 'General'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-900 font-medium">
                        {exp.supplier?.companyName || exp.employee?.fullName || 'Direct Expense'}
                      </td>
                      <td className="p-3 text-gray-700 max-w-xs truncate">{exp.description}</td>
                      <td className="p-3 text-right text-gray-500">{formatCurrency(exp.taxAmount)}</td>
                      <td className="p-3 text-right font-bold text-gray-900 text-sm">{formatCurrency(exp.totalAmount)}</td>
                      <td className="p-3 text-center">{getStatusBadge(exp.status)}</td>
                      <td className="p-3 text-center">{getStatusBadge(exp.paymentStatus)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedExpense(exp);
                              setShowDetailDrawer(true);
                            }}
                            className="p-1 text-gray-600 hover:text-brand hover:bg-brand/10 rounded"
                            title="View Expense Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {exp.status === 'DRAFT' && (
                            <button
                              onClick={() => handleExpenseAction(exp.id, 'submit')}
                              className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded"
                              title="Submit Expense"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {['SUBMITTED', 'DRAFT'].includes(exp.status) && (
                            <>
                              <button
                                onClick={() => handleExpenseAction(exp.id, 'approve')}
                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title="Approve Expense"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleExpenseAction(exp.id, 'reject')}
                                className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded"
                                title="Reject Expense"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {exp.status === 'APPROVED' && exp.paymentStatus !== 'PAID' && (
                            <button
                              onClick={() => handleOpenPayment('EXPENSE', exp)}
                              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                              title="Disburse Expense Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDownloadExpensePdf(exp)}
                            className="p-1 text-gray-600 hover:text-brand hover:bg-brand/10 rounded"
                            title="Download PDF Voucher"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT ALLOCATIONS HISTORY */}
      {activeTab === 'payments' && (
        <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                  <th className="p-3">Payment Date</th>
                  <th className="p-3">Allocation Target</th>
                  <th className="p-3">Beneficiary</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Reference / UTR</th>
                  <th className="p-3 text-right">Amount Disbursed</th>
                  <th className="p-3">Recorded By</th>
                  <th className="p-3 text-right">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-12 text-center text-xs text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
                      <div>Loading payment allocations...</div>
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-12 text-center">
                      <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-gray-800">No Disbursed Payments Yet</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        Record partial or full payments on approved vendor bills and expenses.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 text-gray-900 font-medium">
                        {new Date(p.paymentDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="p-3 font-mono font-bold text-brand">
                        {p.vendorBill?.billNumber ? (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> Bill {p.vendorBill.billNumber}
                          </span>
                        ) : p.expense?.expenseNumber ? (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" /> Expense {p.expense.expenseNumber}
                          </span>
                        ) : (
                          'General'
                        )}
                      </td>
                      <td className="p-3 text-gray-900 font-semibold">
                        {p.vendorBill?.supplier?.companyName ||
                          p.expense?.supplier?.companyName ||
                          p.expense?.employee?.fullName ||
                          '-'}
                      </td>
                      <td className="p-3">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium text-[10px]">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-gray-600">{p.paymentReference || '-'}</td>
                      <td className="p-3 text-right font-bold text-emerald-700 text-sm">{formatCurrency(p.amount)}</td>
                      <td className="p-3 text-gray-500">{p.createdBy?.fullName || 'System Admin'}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadPaymentReceipt(p)}
                          className="inline-flex items-center gap-1 p-1 text-gray-600 hover:text-brand hover:bg-brand/10 rounded"
                          title="Download Payment Voucher"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SUPPLIER AGING TABLE */}
      {activeTab === 'aging' && (
        <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Contact Details</th>
                  <th className="p-3 text-center">Open Bills</th>
                  <th className="p-3 text-right">Current (Not Due)</th>
                  <th className="p-3 text-right">1–30 Days</th>
                  <th className="p-3 text-right">31–60 Days</th>
                  <th className="p-3 text-right">61–90 Days</th>
                  <th className="p-3 text-right">90+ Days</th>
                  <th className="p-3 text-right font-bold text-gray-900">Total Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-12 text-center text-xs text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
                      <div>Calculating supplier aging buckets...</div>
                    </td>
                  </tr>
                ) : aging.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-12 text-center">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-gray-800">No Outstanding Supplier Aging</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        All vendor bills are fully settled.
                      </p>
                    </td>
                  </tr>
                ) : (
                  aging.map((ag) => (
                    <tr key={ag.supplierId} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 font-semibold text-gray-900">{ag.supplierName}</td>
                      <td className="p-3 text-gray-500">
                        {ag.contactPerson} • {ag.phone}
                      </td>
                      <td className="p-3 text-center font-bold text-gray-700">{ag.openBillsCount}</td>
                      <td className="p-3 text-right font-medium text-gray-600">{formatCurrency(ag.current)}</td>
                      <td className="p-3 text-right font-medium text-amber-600">{formatCurrency(ag.days1to30)}</td>
                      <td className="p-3 text-right font-medium text-amber-700">{formatCurrency(ag.days31to60)}</td>
                      <td className="p-3 text-right font-medium text-rose-600">{formatCurrency(ag.days61to90)}</td>
                      <td className="p-3 text-right font-bold text-rose-700">{formatCurrency(ag.days90plus)}</td>
                      <td className="p-3 text-right font-bold text-brand text-sm">{formatCurrency(ag.totalOutstanding)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE VENDOR BILL */}
      {showCreateBillModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand" />
                Create New Vendor Bill
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateBillModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="create-bill-form" onSubmit={handleCreateBill} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Supplier / Vendor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={billFormData.supplierId}
                    onChange={handleSupplierChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers
                      .filter((s) => !s.deletedAt)
                      .map((s) => {
                        const labelParts = [s.companyName, s.supplierCode, s.city].filter(Boolean);
                        return (
                          <option key={s.id} value={s.id}>
                            {labelParts.join(' — ')}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Linked Purchase Order (Optional)</label>
                  <select
                    value={billFormData.purchaseOrderId}
                    onChange={handlePoChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  >
                    <option value="">-- Direct Bill (No PO) --</option>
                    {billFormData.supplierId ? (
                      eligiblePOsForSupplier.length > 0 ? (
                        eligiblePOsForSupplier.map((po) => (
                          <option key={po.id} value={po.id}>
                            {po.poNumber} — {po.supplier?.companyName || 'Supplier'} — {formatCurrency(po.totalAmount)}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          -- No Purchase Orders Available --
                        </option>
                      )
                    ) : (
                      purchaseOrders
                        .filter((po) => po.status !== 'CANCELLED')
                        .map((po) => (
                          <option key={po.id} value={po.id}>
                            {po.poNumber} — {po.supplier?.companyName || 'Supplier'} — {formatCurrency(po.totalAmount)}
                          </option>
                        ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Vendor Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-991283"
                    value={billFormData.vendorInvoiceNumber}
                    onChange={(e) => setBillFormData({ ...billFormData, vendorInvoiceNumber: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={billFormData.billDate}
                    onChange={(e) => setBillFormData({ ...billFormData, billDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={billFormData.dueDate}
                    onChange={(e) => setBillFormData({ ...billFormData, dueDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Supplier GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    value={billFormData.gstNumber}
                    onChange={(e) => setBillFormData({ ...billFormData, gstNumber: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Line Items Grid */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800 uppercase text-[10px] tracking-wider">Line Items</h4>
                  <button
                    type="button"
                    onClick={handleAddBillItem}
                    className="text-brand hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {billFormData.items.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded border border-gray-200">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Item description / Spare part..."
                          value={it.description}
                          onChange={(e) => handleBillItemChange(idx, 'description', e.target.value)}
                          className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900"
                          required
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={it.quantity}
                          onChange={(e) => handleBillItemChange(idx, 'quantity', e.target.value)}
                          className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900 text-center"
                          required
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price (₹)"
                          value={it.unitPrice}
                          onChange={(e) => handleBillItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900 text-right"
                          required
                        />
                      </div>
                      <div className="w-24">
                        <select
                          value={it.taxRate}
                          onChange={(e) => handleBillItemChange(idx, 'taxRate', Number(e.target.value))}
                          className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900"
                        >
                          <option value="0">0% GST</option>
                          <option value="5">5% GST</option>
                          <option value="12">12% GST</option>
                          <option value="18">18% GST</option>
                          <option value="28">28% GST</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBillItem(idx)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded"
                        disabled={billFormData.items.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 bg-gray-50 p-3 rounded border border-gray-200 space-y-1 text-right">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(billItemSubtotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST Tax:</span>
                    <span>{formatCurrency(billItemSubtotals.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Discount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={billFormData.discountAmount}
                      onChange={(e) => setBillFormData({ ...billFormData, discountAmount: e.target.value })}
                      className="w-24 p-1 border border-gray-300 rounded text-xs text-right bg-white"
                    />
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-sm border-t pt-1">
                    <span>Total Bill:</span>
                    <span>{formatCurrency(billItemSubtotals.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Terms 30 days net / warranty replacement parts"
                  value={billFormData.notes}
                  onChange={(e) => setBillFormData({ ...billFormData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>
            </form>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateBillModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-bill-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark text-xs shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Vendor Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE OPERATING EXPENSE */}
      {showCreateExpenseModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-brand" />
                Record Operating Expense
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateExpenseModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="create-expense-form" onSubmit={handleCreateExpense} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Expense Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={expenseFormData.categoryId}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, categoryId: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  required
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Paid To / Beneficiary (Optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={expenseFormData.supplierId}
                    onChange={(e) =>
                      setExpenseFormData({
                        ...expenseFormData,
                        supplierId: e.target.value,
                        employeeId: '',
                      })
                    }
                    className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 text-xs"
                  >
                    <option value="">-- Vendor / Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={expenseFormData.employeeId}
                    onChange={(e) =>
                      setExpenseFormData({
                        ...expenseFormData,
                        employeeId: e.target.value,
                        supplierId: '',
                      })
                    }
                    className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 text-xs"
                  >
                    <option value="">-- Staff / Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Expense Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Service van diesel fuel / Office broadband renewal"
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={expenseFormData.subtotal}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, subtotal: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tax / GST (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseFormData.taxAmount}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, taxAmount: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={expenseFormData.expenseDate}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, expenseDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Reference / Bill #</label>
                  <input
                    type="text"
                    placeholder="e.g. PETROL-771"
                    value={expenseFormData.referenceNumber}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, referenceNumber: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Authorized by Service Manager"
                  value={expenseFormData.notes}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>
            </form>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateExpenseModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-expense-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark text-xs shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Recording...' : 'Record Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD PAYMENT */}
      {showPaymentModal && paymentTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Record Payment Allocation
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="record-payment-form" onSubmit={handleRecordPayment} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded space-y-1 text-emerald-950">
                <div className="font-bold">
                  {paymentTarget.type === 'BILL'
                    ? `Vendor Bill ${paymentTarget.record.billNumber}`
                    : `Expense ${paymentTarget.record.expenseNumber}`}
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-semibold">{formatCurrency(paymentTarget.record.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Already Paid:</span>
                  <span className="font-semibold">{formatCurrency(paymentTarget.record.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold border-t border-emerald-200 pt-1">
                  <span>Outstanding Balance:</span>
                  <span>{formatCurrency(paymentTarget.record.balanceAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={paymentTarget.record.balanceAmount}
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 font-bold text-sm"
                  required
                />
                <span className="text-[10px] text-gray-400">Cannot exceed outstanding balance</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="UPI">Company UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Corporate Card</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Bank UTR / Transaction Reference</label>
                <input
                  type="text"
                  placeholder="e.g. AXIS-NEFT-991823"
                  value={paymentFormData.paymentReference}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentReference: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Partial advance payment / settled in full"
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>
            </form>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="record-payment-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 text-xs shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Disbursing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: BILL OR EXPENSE DETAILS & 3-WAY PO RECONCILIATION */}
      {showDetailDrawer && (selectedBill || selectedExpense) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white border-l border-gray-200 h-full overflow-y-auto p-6 space-y-6 shadow-2xl text-xs animate-in slide-from-right">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedBill ? `Vendor Bill: ${selectedBill.billNumber}` : `Expense: ${selectedExpense.expenseNumber}`}
                  </h3>
                  {selectedBill && getStatusBadge(selectedBill.status)}
                  {selectedExpense && getStatusBadge(selectedExpense.status)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {selectedBill
                    ? `Supplier: ${selectedBill.supplier?.companyName || '-'}`
                    : `Category: ${selectedExpense.category?.name || '-'}`}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailDrawer(false);
                  setSelectedBill(null);
                  setSelectedExpense(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Details */}
            {selectedBill && (
              <>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-500 block">Vendor Invoice #</span>
                    <span className="font-semibold text-gray-900">{selectedBill.vendorInvoiceNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">PO Reference</span>
                    <span className="font-semibold text-gray-900">{selectedBill.purchaseOrder?.poNumber || 'Direct'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Bill Date</span>
                    <span className="font-semibold text-gray-900">{new Date(selectedBill.billDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Due Date</span>
                    <span className="font-semibold text-gray-900">{new Date(selectedBill.dueDate).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>

                {/* 3-Way Reconciliation Callout if PO linked */}
                {selectedBill.reconciliation && (
                  <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-blue-200 pb-1">
                      <span className="font-bold text-blue-900 uppercase text-[10px]">
                        3-Way PO Reconciliation ({selectedBill.reconciliation.poNumber})
                      </span>
                      <span className="text-xs font-semibold text-blue-800">
                        PO Total: {formatCurrency(selectedBill.reconciliation.poTotal)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedBill.reconciliation.items?.map((rec, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border border-blue-100 space-y-1">
                          <div className="flex justify-between font-semibold text-gray-800">
                            <span>{rec.productName}</span>
                            <span className="text-gray-500 text-[10px]">SKU: {rec.sku || '-'}</span>
                          </div>
                          <div className="flex justify-between text-gray-600 text-[11px]">
                            <span>Ordered: {rec.orderedQty}</span>
                            <span>Received: {rec.receivedQty}</span>
                            <span className="font-bold text-brand">Billed: {rec.billedQty}</span>
                          </div>
                          {rec.mismatchWarning && (
                            <div className="text-[10px] text-amber-700 bg-amber-50 p-1 rounded border border-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              {rec.mismatchWarning}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-800 font-medium block">OUTSTANDING BALANCE</span>
                    <span className="text-2xl font-bold text-emerald-700">{formatCurrency(selectedBill.balanceAmount)}</span>
                    <div className="text-[10px] text-emerald-600">Total: {formatCurrency(selectedBill.totalAmount)} • Paid: {formatCurrency(selectedBill.paidAmount)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadBillPdf(selectedBill)}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-md font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </>
            )}

            {/* Expense Details */}
            {selectedExpense && (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  <div>
                    <span className="text-gray-500 block">Description</span>
                    <span className="font-semibold text-gray-900 text-sm">{selectedExpense.description}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div>
                      <span className="text-gray-500 block">Expense Date</span>
                      <span className="font-semibold text-gray-900">{new Date(selectedExpense.expenseDate).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Category</span>
                      <span className="font-semibold text-gray-900">{selectedExpense.category?.name || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-800 font-medium block">TOTAL AMOUNT</span>
                    <span className="text-2xl font-bold text-emerald-700">{formatCurrency(selectedExpense.totalAmount)}</span>
                    <div className="text-[10px] text-emerald-600">Balance: {formatCurrency(selectedExpense.balanceAmount)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadExpensePdf(selectedExpense)}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-md font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download Voucher
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
