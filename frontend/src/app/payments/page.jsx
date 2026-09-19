'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  X,
  Eye,
  Edit3,
  Trash2,
  ArrowRight,
  Printer,
  FileText,
  Wallet,
  Landmark,
  Banknote,
  QrCode,
} from 'lucide-react';
import { paymentApi, invoiceApi, customerApi } from '../../lib/api/client';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalPaymentsCount: 0,
    paidInvoicesCount: 0,
    partialInvoicesCount: 0,
    pendingInvoicesCount: 0,
    collectionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Active Selected Payment
  const [activePayment, setActivePayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Record / Edit Payment
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'UPI',
    paymentReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [payRes, statRes, invRes, custRes] = await Promise.all([
        paymentApi.getPayments(),
        paymentApi.getStats(),
        invoiceApi.getInvoices(),
        customerApi.getCustomers(),
      ]);

      if (payRes?.success) setPayments(payRes.data || []);
      if (statRes?.success) setStats(statRes.data || {});
      if (invRes?.success) setInvoices(invRes.data || []);
      if (custRes?.success) setCustomers(custRes.data || []);
    } catch (err) {
      console.error('Error loading payments data:', err);
      showToast('Failed to load payments data from database.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (methodFilter !== 'All' && p.paymentMethod !== methodFilter) return false;
      if (statusFilter !== 'All' && p.invoice?.paymentStatus !== statusFilter) return false;

      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      const ref = p.paymentReference?.toLowerCase() || '';
      const rem = p.remarks?.toLowerCase() || '';
      const invNo = p.invoice?.invoiceNumber?.toLowerCase() || '';
      const cName = p.customer?.customerName?.toLowerCase() || '';
      const compName = p.customer?.companyName?.toLowerCase() || '';
      const cCode = p.customer?.customerCode?.toLowerCase() || '';
      const mob = p.customer?.mobile || '';

      return (
        ref.includes(search) ||
        rem.includes(search) ||
        invNo.includes(search) ||
        cName.includes(search) ||
        compName.includes(search) ||
        cCode.includes(search) ||
        mob.includes(search)
      );
    });
  }, [payments, searchQuery, methodFilter, statusFilter]);

  // Selected Invoice for Payment Recording
  const selectedInvoiceData = useMemo(() => {
    if (!formData.invoiceId) return null;
    const inv = invoices.find(
      (i) => i.id === formData.invoiceId || i.invoiceNumber === formData.invoiceId,
    );
    if (!inv) return null;

    const totalPaid = (inv.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstanding = Math.max(0, (inv.grandTotal || 0) - totalPaid);

    return {
      ...inv,
      totalPaid,
      outstanding: Number(outstanding.toFixed(2)),
    };
  }, [formData.invoiceId, invoices]);

  // Calculation Preview for Recording Payment
  const paymentPreview = useMemo(() => {
    if (!selectedInvoiceData) return null;
    const paymentAmt = Number(formData.amount) || 0;
    const remaining = Math.max(0, selectedInvoiceData.outstanding - paymentAmt);
    const isOverpaying = paymentAmt > selectedInvoiceData.outstanding + 0.01;

    return {
      paymentAmt,
      remaining: Number(remaining.toFixed(2)),
      isOverpaying,
    };
  }, [selectedInvoiceData, formData.amount]);

  // Open Create Payment Modal
  const openCreate = (preselectedInvoiceId) => {
    const invId = preselectedInvoiceId || invoices[0]?.id || '';
    const inv = invoices.find((i) => i.id === invId);
    const totalPaid = (inv?.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstanding = inv ? Math.max(0, (inv.grandTotal || 0) - totalPaid) : 0;

    setFormData({
      invoiceId: invId,
      amount: outstanding > 0 ? outstanding.toString() : '',
      paymentMethod: 'UPI',
      paymentReference: '',
      paymentDate: new Date().toISOString().split('T')[0],
      remarks: '',
    });
    setShowCreateModal(true);
  };

  // Open Edit Payment Modal
  const openEdit = (payment) => {
    setActivePayment(payment);
    setFormData({
      invoiceId: payment.invoiceId,
      amount: payment.amount.toString(),
      paymentMethod: payment.paymentMethod || 'UPI',
      paymentReference: payment.paymentReference || '',
      paymentDate: payment.paymentDate
        ? new Date(payment.paymentDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      remarks: payment.remarks || '',
    });
    setShowEditModal(true);
  };

  // Open Detail Modal
  const openDetail = (payment) => {
    setActivePayment(payment);
    setShowDetailModal(true);
  };

  // Open Delete Modal
  const openDelete = (payment) => {
    setActivePayment(payment);
    setShowDeleteModal(true);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoiceId) {
      showToast('Please select an invoice.', true);
      return;
    }
    const amt = Number(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid payment amount greater than 0.', true);
      return;
    }

    if (paymentPreview?.isOverpaying) {
      showToast(
        `Payment amount of ₹${amt.toLocaleString('en-IN')} exceeds outstanding balance of ₹${selectedInvoiceData?.outstanding.toLocaleString('en-IN')}.`,
        true,
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await paymentApi.createPayment({
        invoiceId: formData.invoiceId,
        amount: amt,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference,
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate).toISOString() : undefined,
        remarks: formData.remarks,
      });

      if (res?.success) {
        showToast(res.message || 'Payment recorded successfully!');
        setShowCreateModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Record payment error:', err);
      showToast(err.response?.data?.message || 'Failed to record payment in database.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activePayment) return;
    const amt = Number(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid amount greater than 0.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await paymentApi.updatePayment(activePayment.id, {
        amount: amt,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference,
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate).toISOString() : undefined,
        remarks: formData.remarks,
      });

      if (res?.success) {
        showToast('Payment details updated successfully!');
        setShowEditModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Update payment error:', err);
      showToast(err.response?.data?.message || 'Failed to update payment.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete / Void Submit
  const handleDeleteSubmit = async () => {
    if (!activePayment) return;
    try {
      setSubmitting(true);
      const res = await paymentApi.deletePayment(activePayment.id);
      if (res?.success) {
        showToast(res.message || 'Payment voided successfully!');
        setShowDeleteModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Delete payment error:', err);
      showToast(err.response?.data?.message || 'Failed to void payment.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper Badge for Payment Method
  const getMethodBadge = (method) => {
    switch (method) {
      case 'UPI':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
            <QrCode className="w-3 h-3" /> UPI
          </span>
        );
      case 'Cash':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
            <Banknote className="w-3 h-3" /> Cash
          </span>
        );
      case 'Card':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
            <CreditCard className="w-3 h-3" /> Card
          </span>
        );
      case 'Bank Transfer':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
            <Landmark className="w-3 h-3" /> Bank Transfer
          </span>
        );
    }
  };

  const getInvoiceStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'Partial':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Partial
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-xs font-semibold flex items-center gap-2 ${
            toastMessage.isError ? 'bg-rose-600 text-white' : 'bg-brand text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand" />
            Payments & Receivables
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Track customer collections, balance reconciliation, and payment receipts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-medium">Total Invoiced</span>
            <FileText className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{(stats.totalInvoiced || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {stats.paidInvoicesCount + stats.partialInvoicesCount + stats.pendingInvoicesCount} Active GST Invoices
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-medium">Total Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            ₹{(stats.totalCollected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {stats.totalPaymentsCount} Transaction Receipts
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-medium">Outstanding Balance</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            ₹{(stats.totalOutstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {stats.partialInvoicesCount} Partial • {stats.pendingInvoicesCount} Pending
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-brand mb-1">
            <span className="text-[11px] font-medium">Collection Efficiency</span>
            <TrendingUp className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-brand">
            {stats.collectionRate || 0}%
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {stats.paidInvoicesCount} Invoices Fully Settled
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice #, customer, reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {['All', 'UPI', 'Cash', 'Card', 'Bank Transfer'].map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                methodFilter === m
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
            <div>Loading payments from PostgreSQL...</div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">No Payment Records Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery || methodFilter !== 'All'
                ? 'No payments match the selected search or filter.'
                : 'No payments recorded yet. Record a payment against an outstanding invoice.'}
            </p>
            <button
              onClick={() => openCreate()}
              className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
            >
              + Record Payment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                  <th className="p-3">Payment Date</th>
                  <th className="p-3">Reference / Txn ID</th>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-center">Payment Method</th>
                  <th className="p-3 text-right">Amount Paid</th>
                  <th className="p-3 text-center">Invoice Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3 font-medium text-gray-800">
                      {new Date(pay.paymentDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-3">
                      <div className="font-mono font-bold text-gray-900">
                        {pay.paymentReference || 'Direct Payment'}
                      </div>
                      {pay.remarks && (
                        <div className="text-[10px] text-gray-400 truncate max-w-[140px]">
                          {pay.remarks}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-brand">{pay.invoice?.invoiceNumber}</div>
                      <div className="text-[10px] text-gray-400">
                        Total: ₹{pay.invoice?.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-gray-900">
                        {pay.customer?.companyName || pay.customer?.customerName}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>{pay.customer?.customerCode}</span>
                        <span>•</span>
                        <span>{pay.customer?.mobile}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {getMethodBadge(pay.paymentMethod)}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700 text-sm">
                      ₹{pay.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      {getInvoiceStatusBadge(pay.invoice?.paymentStatus)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(pay)}
                          title="View Payment Receipt"
                          className="p-1 text-gray-600 hover:text-brand hover:bg-brand/10 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(pay)}
                          title="Edit Payment Details"
                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDelete(pay)}
                          title="Void / Delete Payment"
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD / EDIT PAYMENT MODAL */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-brand" />
                {showCreateModal ? 'Record Customer Payment' : 'Edit Payment Details'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={showCreateModal ? handleCreateSubmit : handleEditSubmit}
              className="p-6 space-y-4"
            >
              {/* Select Invoice */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Invoice <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    const inv = invoices.find((i) => i.id === newId);
                    const paid = (inv?.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                    const bal = inv ? Math.max(0, (inv.grandTotal || 0) - paid) : 0;
                    setFormData({
                      ...formData,
                      invoiceId: newId,
                      amount: bal > 0 ? bal.toString() : '',
                    });
                  }}
                  disabled={showEditModal}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white disabled:bg-gray-100"
                >
                  <option value="">-- Select Invoice --</option>
                  {invoices.map((inv) => {
                    const totalPaid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
                    const bal = Math.max(0, (inv.grandTotal || 0) - totalPaid);
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.customer?.companyName || inv.customer?.customerName} (Bal: ₹{bal.toLocaleString('en-IN')})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Invoice Summary Banner */}
              {selectedInvoiceData && (
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-md space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Customer:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedInvoiceData.customer?.companyName || selectedInvoiceData.customer?.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Invoice Grand Total:</span>
                    <span className="font-semibold">
                      ₹{selectedInvoiceData.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Total Already Paid:</span>
                    <span className="font-semibold">
                      ₹{selectedInvoiceData.totalPaid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-700 font-bold border-t pt-1">
                    <span>Current Outstanding:</span>
                    <span>₹{selectedInvoiceData.outstanding?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Payment Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Amount Paid (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    placeholder="0.00"
                    className={`w-full p-2 border rounded-md focus:ring-1 focus:ring-brand ${
                      paymentPreview?.isOverpaying ? 'border-rose-500 bg-rose-50' : 'border-gray-300'
                    }`}
                  />
                  {paymentPreview?.isOverpaying && (
                    <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                      Amount exceeds outstanding balance!
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Payment Reference / UTR #
                  </label>
                  <input
                    type="text"
                    value={formData.paymentReference}
                    onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                    placeholder="e.g. UPI-9840123 / UTR99881"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Remarks / Notes</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Optional payment notes"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              {/* Balance Preview */}
              {selectedInvoiceData && paymentPreview && (
                <div className="bg-brand/5 border border-brand/20 p-3 rounded-md flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                      Remaining Invoice Balance
                    </span>
                    <span className="text-base font-bold text-brand">
                      ₹{paymentPreview.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block text-right">
                      Resulting Status
                    </span>
                    <span className="font-bold">
                      {paymentPreview.remaining <= 0.01 ? (
                        <span className="text-emerald-700 font-bold">Paid in Full</span>
                      ) : (
                        <span className="text-amber-700 font-bold">Partially Paid</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || paymentPreview?.isOverpaying}
                  className="px-5 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving to Database...' : showCreateModal ? 'Record Payment' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL / RECEIPT MODAL */}
      {showDetailModal && activePayment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand" />
                Payment Receipt
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-semibold text-xs flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center pb-3 border-b border-gray-200">
                <img
                  src="/logo.png"
                  alt="Freeze Technology"
                  className="w-12 h-12 object-contain mx-auto mb-1.5"
                />
                <h4 className="font-bold text-brand text-base uppercase">FREEZE TECHNOLOGY</h4>
                <p className="text-[11px] text-gray-500">Official Payment Collection Receipt</p>
                <div className="text-2xl font-black text-emerald-700 mt-2">
                  ₹{activePayment.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Paid on {new Date(activePayment.paymentDate).toLocaleDateString('en-GB')}
                </div>
              </div>

              <div className="space-y-2 text-gray-700 bg-gray-50 p-3.5 rounded-md border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-bold text-gray-900">
                    {activePayment.customer?.companyName || activePayment.customer?.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice Number:</span>
                  <span className="font-bold text-brand">{activePayment.invoice?.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Method:</span>
                  <span>{getMethodBadge(activePayment.paymentMethod)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reference # / UTR:</span>
                  <span className="font-mono font-semibold">{activePayment.paymentReference || 'N/A'}</span>
                </div>
                {activePayment.remarks && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Remarks:</span>
                    <span>{activePayment.remarks}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-semibold text-xs hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE / VOID MODAL */}
      {showDeleteModal && activePayment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-xs">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-center font-bold text-base text-gray-900">
              Void Payment of ₹{activePayment.amount?.toLocaleString('en-IN')}?
            </h3>
            <p className="text-center text-gray-500 mt-2">
              This will remove the payment transaction from PostgreSQL and automatically recalculate the balance for invoice{' '}
              <strong className="text-gray-900">{activePayment.invoice?.invoiceNumber}</strong>.
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 text-white rounded-md font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
