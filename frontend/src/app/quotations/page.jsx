'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  Building2,
  User,
  Phone,
  Calendar,
  Eye,
  Edit3,
  Trash2,
  ArrowRight,
  Printer,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  X,
  Layers,
  Percent,
  TrendingUp,
  ReceiptText,
} from 'lucide-react';
import { quotationApi, customerApi, productApi } from '../../lib/api/client';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    approved: 0,
    rejected: 0,
    converted: 0,
    totalPipelineValue: 0,
  });
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);

  // Quick Customer State
  const [quickCustomerSubmitting, setQuickCustomerSubmitting] = useState(false);
  const [quickCustomerErrors, setQuickCustomerErrors] = useState({});
  const [quickCustomerData, setQuickCustomerData] = useState({
    customerName: '',
    customerType: 'Commercial',
    companyName: '',
    mobile: '',
    alternateMobile: '',
    email: '',
    gstNumber: '',
    address: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600097',
  });

  // Selected Quotation for View/Edit/Convert/Delete
  const [activeQuotation, setActiveQuotation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [conversionResult, setConversionResult] = useState(null);

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    customerId: '',
    expiryDate: '',
    discountPercentage: 0,
    status: 'Draft',
    items: [
      { productId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0, total: 0 },
    ],
  });

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleQuickCreateCustomer = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!quickCustomerData.customerName.trim()) {
      errors.customerName = 'Customer or Company Name is required';
    }
    if (!quickCustomerData.mobile.trim() || !/^[0-9]{10}$/.test(quickCustomerData.mobile.trim())) {
      errors.mobile = 'Enter a valid 10-digit mobile number';
    }
    if (!quickCustomerData.address.trim()) {
      errors.address = 'Street address is required';
    }
    if (!quickCustomerData.pincode.trim() || !/^[0-9]{6}$/.test(quickCustomerData.pincode.trim())) {
      errors.pincode = 'Enter a valid 6-digit pincode';
    }
    setQuickCustomerErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setQuickCustomerSubmitting(true);
    try {
      const payload = {
        ...quickCustomerData,
        companyName: quickCustomerData.companyName || quickCustomerData.customerName,
      };
      const res = await customerApi.createCustomer(payload);
      const newCustomer = res?.data || res;
      if (res?.success || newCustomer?.id) {
        showToast('Customer created and selected successfully!');

        // Refresh customer list from DB
        const updatedCustRes = await customerApi.getCustomers();
        const updatedList = updatedCustRes?.data || updatedCustRes || [];
        setCustomers(Array.isArray(updatedList) ? updatedList : []);

        // Auto-select newly created customer in quotation form
        const createdId = newCustomer?.id || (Array.isArray(updatedList) && updatedList.find((c) => c.mobile === quickCustomerData.mobile)?.id);
        if (createdId) {
          setFormData((prev) => ({ ...prev, customerId: createdId }));
        }

        setShowQuickCustomerModal(false);
        setQuickCustomerData({
          customerName: '',
          customerType: 'Commercial',
          companyName: '',
          mobile: '',
          alternateMobile: '',
          email: '',
          gstNumber: '',
          address: '',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600097',
        });
        setQuickCustomerErrors({});
      } else {
        throw new Error(res?.message || 'Failed to create customer');
      }
    } catch (err) {
      console.error('Quick customer creation failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to create customer';
      showToast(errMsg, true);
    } finally {
      setQuickCustomerSubmitting(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [quotRes, statsRes, custRes, prodRes] = await Promise.all([
        quotationApi.getQuotations(),
        quotationApi.getStats(),
        customerApi.getCustomers(),
        productApi.getProducts(),
      ]);

      if (quotRes?.success) setQuotations(quotRes.data || []);
      if (statsRes?.success) setStats(statsRes.data || {});
      if (custRes?.success) setCustomers(custRes.data || []);
      if (prodRes?.success) setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Error loading quotation data:', err);
      setError('Unable to load quotation data from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'Converted' && !q.invoice) return false;
        if (statusFilter !== 'Converted' && q.status !== statusFilter) return false;
      }
      if (!searchQuery) return true;
      const qNum = q.quotationNumber?.toLowerCase() || '';
      const cName = q.customer?.customerName?.toLowerCase() || '';
      const compName = q.customer?.companyName?.toLowerCase() || '';
      const cCode = q.customer?.customerCode?.toLowerCase() || '';
      const mob = q.customer?.mobile || '';
      const search = searchQuery.toLowerCase();
      return (
        qNum.includes(search) ||
        cName.includes(search) ||
        compName.includes(search) ||
        cCode.includes(search) ||
        mob.includes(search)
      );
    });
  }, [quotations, searchQuery, statusFilter]);

  // Form Item Helpers
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: '', quantity: 1, unitPrice: 0, discount: 0, taxAmount: 0, total: 0 },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) {
      showToast('Quotation must have at least one product item.', true);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleProductChange = (index, productId) => {
    const selectedProd = products.find((p) => p.id === productId || p.sku === productId);
    const unitPrice = selectedProd ? selectedProd.sellingPrice : 0;
    const taxRate = selectedProd ? selectedProd.taxRate || 18.0 : 18.0;

    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      item.productId = selectedProd ? selectedProd.id : productId;
      item.unitPrice = unitPrice;
      const lineSubtotal = Math.max(0, item.quantity * unitPrice - (item.discount || 0));
      item.taxAmount = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
      item.total = Number((lineSubtotal + item.taxAmount).toFixed(2));
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const handleItemFieldChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      item[field] = Number(value) || 0;

      const selectedProd = products.find((p) => p.id === item.productId);
      const taxRate = selectedProd ? selectedProd.taxRate || 18.0 : 18.0;

      const qty = field === 'quantity' ? Number(value) || 1 : item.quantity;
      const rate = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
      const disc = field === 'discount' ? Number(value) || 0 : item.discount || 0;

      const lineSubtotal = Math.max(0, qty * rate - disc);
      item.taxAmount = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
      item.total = Number((lineSubtotal + item.taxAmount).toFixed(2));
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  // Form Financial Calculations (Authoritative Preview)
  const formCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    formData.items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.unitPrice) || 0;
      const disc = Number(item.discount) || 0;
      const lineSubtotal = Math.max(0, qty * rate - disc);
      const selectedProd = products.find((p) => p.id === item.productId);
      const taxRate = selectedProd ? selectedProd.taxRate || 18.0 : 18.0;
      const lineTax = (lineSubtotal * taxRate) / 100;
      subtotal += qty * rate;
      totalTax += lineTax;
    });

    const discountPercentage = Number(formData.discountPercentage) || 0;
    const discountAmount = Number(((subtotal * discountPercentage) / 100).toFixed(2));
    const grandTotal = Math.max(0, subtotal - discountAmount + totalTax);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(totalTax.toFixed(2)),
      discountPercentage,
      discountAmount,
      grandTotal: Number(grandTotal.toFixed(2)),
    };
  }, [formData, products]);

  // Open Create Modal
  const openCreate = () => {
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);

    setFormData({
      customerId: '',
      expiryDate: defaultExpiry.toISOString().split('T')[0],
      discountPercentage: 0,
      status: 'Draft',
      items: [
        {
          productId: '',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxAmount: 0,
          total: 0,
        },
      ],
    });
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const openEdit = (quot) => {
    if (quot.invoice) {
      showToast('Cannot edit quotation already converted to an invoice.', true);
      return;
    }
    const subtotal =
      quot.subtotal ||
      quot.items.reduce((s, i) => s + Number(i.unitPrice) * Number(i.quantity), 0);
    const derivedPercentage =
      subtotal > 0 && quot.discount > 0
        ? Number(((quot.discount / subtotal) * 100).toFixed(2))
        : 0;

    setActiveQuotation(quot);
    setFormData({
      customerId: quot.customerId,
      expiryDate: quot.expiryDate ? new Date(quot.expiryDate).toISOString().split('T')[0] : '',
      discountPercentage: derivedPercentage,
      status: quot.status || 'Draft',
      items: quot.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount || 0,
        taxAmount: i.taxAmount,
        total: i.total,
      })),
    });
    setShowEditModal(true);
  };

  // Open Detail Modal
  const openDetail = (quot) => {
    setActiveQuotation(quot);
    setShowDetailModal(true);
  };

  // Open Convert Modal
  const openConvert = (quot) => {
    if (quot.invoice) {
      showToast(`Quotation already converted to Invoice ${quot.invoice.invoiceNumber}.`, true);
      return;
    }
    setActiveQuotation(quot);
    setConversionResult(null);
    setShowConvertModal(true);
  };

  // Open Delete Modal
  const openDelete = (quot) => {
    setActiveQuotation(quot);
    setShowDeleteModal(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      showToast('Please select a customer.', true);
      return;
    }
    if (formData.items.some((i) => !i.productId || i.quantity < 1)) {
      showToast('Please select a product and valid quantity for each line item.', true);
      return;
    }

    const pct = Number(formData.discountPercentage) || 0;
    if (pct < 0 || pct > 100) {
      showToast('Special discount percentage must be between 0% and 100%.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await quotationApi.createQuotation({
        customerId: formData.customerId,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
        discount: formCalculations.discountAmount,
        status: formData.status,
        items: formData.items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount) || 0,
        })),
      });

      if (res?.success) {
        showToast(`Quotation ${res.data?.quotationNumber || ''} created successfully!`);
        setShowCreateModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Create quotation error:', err);
      showToast(err.response?.data?.message || 'Failed to create quotation in database.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeQuotation) return;

    const pct = Number(formData.discountPercentage) || 0;
    if (pct < 0 || pct > 100) {
      showToast('Special discount percentage must be between 0% and 100%.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await quotationApi.updateQuotation(activeQuotation.id, {
        customerId: formData.customerId,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
        discount: formCalculations.discountAmount,
        status: formData.status,
        items: formData.items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount) || 0,
        })),
      });

      if (res?.success) {
        showToast(`Quotation ${activeQuotation.quotationNumber} updated successfully!`);
        setShowEditModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Update quotation error:', err);
      showToast(err.response?.data?.message || 'Failed to update quotation.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Quotation Conversion to Invoice
  const handleExecuteConversion = async () => {
    if (!activeQuotation) return;
    try {
      setSubmitting(true);
      const res = await quotationApi.convertToInvoice(activeQuotation.id);
      if (res?.success) {
        setConversionResult(res.data);
        showToast(`Quotation converted to Invoice ${res.data?.invoiceNumber}!`);
        await loadData();
      }
    } catch (err) {
      console.error('Conversion error:', err);
      showToast(err.response?.data?.message || 'Conversion failed. Please try again.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Soft Delete
  const handleExecuteDelete = async () => {
    if (!activeQuotation) return;
    try {
      setSubmitting(true);
      const res = await quotationApi.deleteQuotation(activeQuotation.id);
      if (res?.success) {
        showToast(`Quotation ${activeQuotation.quotationNumber} soft-deleted.`);
        setShowDeleteModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.response?.data?.message || 'Failed to delete quotation.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status, invoice) => {
    if (invoice) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
          <FileCheck className="w-3 h-3" /> Converted
        </span>
      );
    }
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'Sent':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Sent
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'Draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-xs font-semibold flex items-center gap-2 ${toastMessage.isError ? 'bg-rose-600 text-white' : 'bg-brand text-white'
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
            <FileText className="w-6 h-6 text-brand" />
            Quotation & Sales Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Create commercial proposals, calculate GST automatically, and convert to official invoices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Quotation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-medium">Total Quotations</span>
            <FileText className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">All commercial proposals</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-medium">Drafts / In Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.draft || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Pending approval</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-medium">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.approved || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Ready for conversion</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[11px] font-medium">Converted to Invoice</span>
            <FileCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{stats.converted || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Invoiced orders</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-brand mb-1">
            <span className="text-[11px] font-medium">Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-brand" />
          </div>
          <div className="text-xl font-bold text-brand">
            ₹{(stats.totalPipelineValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Total quotation value</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search quotation #, customer, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {['All', 'Draft', 'Sent', 'Approved', 'Converted', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === st
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
            <div>Loading quotations from PostgreSQL...</div>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">No Quotations Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'All'
                ? 'No quotations match the selected filters.'
                : 'Get started by creating your first quotation proposal.'}
            </p>
            <button
              onClick={openCreate}
              className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
            >
              + Create Quotation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                  <th className="p-3">Quotation #</th>
                  <th className="p-3">Date / Expiry</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items Summary</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-right">GST (18%)</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuotations.map((quot) => (
                  <tr key={quot.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3 font-bold text-brand">
                      <button
                        onClick={() => openDetail(quot)}
                        className="hover:underline flex items-center gap-1"
                      >
                        {quot.quotationNumber}
                      </button>
                      {quot.invoice && (
                        <div className="text-[10px] text-purple-700 font-medium mt-0.5 flex items-center gap-1">
                          <span>Inv: {quot.invoice.invoiceNumber}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div>{new Date(quot.quotationDate).toLocaleDateString('en-GB')}</div>
                      <div className="text-[10px] text-gray-400">
                        Exp: {new Date(quot.expiryDate).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-gray-900">
                        {quot.customer?.companyName || quot.customer?.customerName}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>{quot.customer?.customerCode}</span>
                        <span>•</span>
                        <span>{quot.customer?.mobile}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-800">
                        {quot.items?.length || 0} {quot.items?.length === 1 ? 'item' : 'items'}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[160px]">
                        {quot.items?.[0]?.product?.productName || 'Line items'}
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium text-gray-600">
                      ₹{quot.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-medium text-gray-600">
                      ₹{quot.gstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-gray-900">
                      ₹{quot.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(quot.status, quot.invoice)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(quot)}
                          title="View Quotation Details"
                          className="p-1 text-gray-600 hover:text-brand hover:bg-brand/10 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {!quot.invoice && (
                          <>
                            <button
                              onClick={() => openConvert(quot)}
                              title="Convert to Official Invoice"
                              className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded text-[11px] font-semibold flex items-center gap-1"
                            >
                              <FileCheck className="w-3 h-3" /> Convert
                            </button>
                            <button
                              onClick={() => openEdit(quot)}
                              title="Edit Quotation"
                              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {quot.invoice && (
                          <Link
                            href="/invoices"
                            title="View Converted Invoice"
                            className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100 rounded text-[11px] font-semibold flex items-center gap-1"
                          >
                            <ReceiptText className="w-3 h-3" /> Invoices
                          </Link>
                        )}

                        <button
                          onClick={() => openDelete(quot)}
                          title="Delete Quotation"
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

      {/* CREATE / EDIT MODAL */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand" />
                {showCreateModal ? 'Create New Quotation' : `Edit Quotation ${activeQuotation?.quotationNumber}`}
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
              className="p-6 space-y-5 overflow-y-auto flex-1 text-xs"
            >
              {/* Customer and General Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-gray-700">
                      Customer <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickCustomerErrors({});
                        setShowQuickCustomerModal(true);
                      }}
                      className="text-brand hover:text-brand-dark text-xs font-bold flex items-center gap-1 transition"
                    >
                      + New Customer
                    </button>
                  </div>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerCode} - {c.companyName || c.customerName} ({c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Line Items Section */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="bg-gray-100 p-2.5 flex items-center justify-between font-bold text-gray-700">
                  <span>Quotation Line Items (Authoritative 18% GST Calculation)</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-brand text-white px-2.5 py-1 rounded text-[11px] font-semibold hover:bg-brand-dark flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Item
                  </button>
                </div>

                <div className="p-3 space-y-3">
                  {formData.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-gray-50/70 p-2.5 rounded border border-gray-200"
                    >
                      <div className="col-span-1 text-center font-bold text-gray-500">
                        #{idx + 1}
                      </div>

                      <div className="col-span-4">
                        <label className="block text-[10px] text-gray-500 mb-0.5">Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          required
                          className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.productName} (₹{p.sellingPrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-gray-500 mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                          required
                          className="w-full p-1.5 border border-gray-300 rounded text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-gray-500 mb-0.5">Unit Rate (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemFieldChange(idx, 'unitPrice', e.target.value)}
                          required
                          className="w-full p-1.5 border border-gray-300 rounded text-xs"
                        />
                      </div>

                      <div className="col-span-2 text-right">
                        <label className="block text-[10px] text-gray-500 mb-0.5">
                          Line Total (inc. 18% GST)
                        </label>
                        <div className="font-bold text-gray-900 py-1.5">
                          ₹{item.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Summary Bar */}
              <div className="bg-brand/5 border border-brand/20 p-4 rounded-md flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-4 text-gray-700">
                  <div>
                    <span className="text-gray-500 block text-[10px]">ITEMS SUBTOTAL</span>
                    <span className="font-bold text-sm">
                      ₹{formCalculations.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">GST 18% EXTRA</span>
                    <span className="font-bold text-sm text-blue-700">
                      ₹{formCalculations.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <label className="text-gray-500 block text-[10px]">SPECIAL DISCOUNT (%)</label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={formData.discountPercentage}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setFormData({ ...formData, discountPercentage: '' });
                            return;
                          }
                          const num = Number(val);
                          if (!isNaN(num) && num >= 0 && num <= 100) {
                            setFormData({ ...formData, discountPercentage: val });
                          }
                        }}
                        placeholder="0"
                        className="w-20 p-1 border border-gray-300 rounded text-xs bg-white font-semibold text-right"
                      />
                      <span className="text-xs font-bold text-gray-500">%</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                      Discount: ₹{formCalculations.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-gray-500 uppercase font-bold block">Grand Total</span>
                  <span className="text-2xl font-black text-brand">
                    ₹{formCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
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
                  disabled={submitting}
                  className="px-5 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving to Database...' : showCreateModal ? 'Save & Create Quotation' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL / PREVIEW MODAL */}
      {showDetailModal && activeQuotation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-base text-gray-900">
                  Quotation Proposal — {activeQuotation.quotationNumber}
                </h3>
                {getStatusBadge(activeQuotation.status, activeQuotation.invoice)}
              </div>
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

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Document Header */}
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50/50 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="Freeze Technology Logo"
                    className="w-12 h-12 object-contain bg-white rounded p-0.5 border border-gray-200"
                  />
                  <div>
                    <div className="font-bold text-brand text-lg tracking-wider">FREEZE TECHNOLOGY</div>
                    <div className="text-[11px] text-gray-600">Air Conditioning & Refrigeration Sales & Service</div>
                    <div className="text-[11px] text-gray-600">Panasonic Authorised Sales & Service</div>
                    <div className="text-[11px] font-semibold text-gray-800 mt-1">GSTIN: 33BKCPD7319A2ZU</div>
                  </div>
                </div>

                <div className="text-right space-y-1 text-gray-700">
                  <div>
                    <span className="font-semibold text-gray-500">Quotation No: </span>
                    <span className="font-bold text-brand">{activeQuotation.quotationNumber}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">Date: </span>
                    <span>{new Date(activeQuotation.quotationDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">Valid Till: </span>
                    <span>{new Date(activeQuotation.expiryDate).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              </div>

              {/* Customer Box */}
              <div className="border border-gray-200 rounded-md p-3">
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">PROPOSAL PREPARED FOR:</div>
                <div className="font-bold text-gray-900 text-sm">
                  {activeQuotation.customer?.companyName || activeQuotation.customer?.customerName}
                </div>
                <div className="text-gray-600 mt-0.5">{activeQuotation.customer?.address}</div>
                <div className="text-gray-600">
                  {activeQuotation.customer?.city}, {activeQuotation.customer?.state} - {activeQuotation.customer?.pincode}
                </div>
                <div className="text-gray-600 mt-1 flex gap-4">
                  <span>Mobile: {activeQuotation.customer?.mobile}</span>
                  {activeQuotation.customer?.gstNumber && (
                    <span>Customer GSTIN: {activeQuotation.customer?.gstNumber}</span>
                  )}
                </div>
              </div>

              {/* Converted Invoice Notice */}
              {activeQuotation.invoice && (
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-900 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    <span>Converted to Official Invoice: <strong>{activeQuotation.invoice.invoiceNumber}</strong></span>
                  </div>
                  <Link
                    href="/invoices"
                    className="text-xs bg-purple-600 text-white px-3 py-1 rounded font-semibold hover:bg-purple-700 flex items-center gap-1"
                  >
                    View Invoices <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Items Table */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-[10px] uppercase border-b">
                      <th className="p-2.5 text-center w-10">S.N.</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-center w-16">Qty</th>
                      <th className="p-2.5 text-right w-24">Rate (₹)</th>
                      <th className="p-2.5 text-center w-20">GST</th>
                      <th className="p-2.5 text-right w-24">Tax (₹)</th>
                      <th className="p-2.5 text-right w-28">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeQuotation.items?.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="p-2.5 text-center font-bold text-gray-500">{idx + 1}</td>
                        <td className="p-2.5 font-medium text-gray-900">
                          <div>{item.product?.productName}</div>
                          <div className="text-[10px] text-gray-400">SKU: {item.product?.sku}</div>
                        </td>
                        <td className="p-2.5 text-center">{item.quantity}</td>
                        <td className="p-2.5 text-right">{item.unitPrice?.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-center">18%</td>
                        <td className="p-2.5 text-right">{item.taxAmount?.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-semibold">
                          {(item.total || (item.quantity * item.unitPrice + item.taxAmount)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Box */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-md ml-auto max-w-sm space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{activeQuotation.subtotal?.toFixed(2)}</span>
                </div>
                {activeQuotation.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Special Discount:</span>
                    <span className="font-semibold">-₹{activeQuotation.discount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-blue-700">
                  <span>GST 18% EXTRA:</span>
                  <span className="font-semibold">₹{activeQuotation.gstAmount?.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between text-gray-900 font-bold text-sm">
                  <span>Grand Total:</span>
                  <span className="text-brand text-base">₹{activeQuotation.grandTotal?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                {!activeQuotation.invoice && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openConvert(activeQuotation);
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold text-xs hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <FileCheck className="w-4 h-4" /> Convert to Invoice
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-semibold text-xs hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONVERT TO INVOICE MODAL */}
      {showConvertModal && activeQuotation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs">
            {!conversionResult ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-center font-bold text-base text-gray-900">
                  Convert Quotation to Invoice?
                </h3>
                <p className="text-center text-gray-500 mt-2">
                  This will generate an official GST Invoice for{' '}
                  <strong className="text-gray-900">{activeQuotation.quotationNumber}</strong> for customer{' '}
                  <strong className="text-gray-900">
                    {activeQuotation.customer?.companyName || activeQuotation.customer?.customerName}
                  </strong>
                  .
                </p>

                <div className="bg-gray-50 p-3 rounded-md my-4 space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span>Items Count:</span>
                    <span className="font-bold">{activeQuotation.items?.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span className="font-bold">₹{activeQuotation.gstAmount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t pt-1">
                    <span>Invoice Grand Total:</span>
                    <span className="text-brand">₹{activeQuotation.grandTotal?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-5">
                  <button
                    onClick={() => setShowConvertModal(false)}
                    disabled={submitting}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteConversion}
                    disabled={submitting}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {submitting ? 'Generating Invoice...' : 'Confirm & Convert'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-center font-bold text-base text-gray-900">
                  Invoice Generated Successfully!
                </h3>
                <p className="text-center text-gray-500 mt-1">
                  Official GST Invoice Number:
                </p>
                <div className="text-center font-black text-brand text-lg my-2">
                  {conversionResult.invoiceNumber}
                </div>

                <p className="text-center text-gray-500 text-[11px] mb-4">
                  The invoice has been persisted in PostgreSQL and is linked to quotation{' '}
                  <strong>{activeQuotation.quotationNumber}</strong>.
                </p>

                <div className="flex justify-center gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowConvertModal(false);
                      setConversionResult(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                  >
                    Back to Quotations
                  </button>
                  <Link
                    href="/invoices"
                    className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark flex items-center gap-1"
                  >
                    Go to Invoices <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && activeQuotation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-xs">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-center font-bold text-base text-gray-900">
              Soft-Delete Quotation?
            </h3>
            <p className="text-center text-gray-500 mt-2">
              Are you sure you want to remove quotation{' '}
              <strong className="text-gray-900">{activeQuotation.quotationNumber}</strong>?
              Historical billing and converted records remain protected.
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
                onClick={handleExecuteDelete}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 text-white rounded-md font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* QUICK ADD CUSTOMER MODAL */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-sm text-gray-900">Quick Add New Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateCustomer} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">
                    Customer / Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Multi Specialty Hospital or Rajesh Kumar"
                    value={quickCustomerData.customerName}
                    onChange={(e) => setQuickCustomerData({ ...quickCustomerData, customerName: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand ${quickCustomerErrors.customerName ? 'border-rose-500' : 'border-gray-300'
                      }`}
                  />
                  {quickCustomerErrors.customerName && (
                    <span className="text-rose-500 text-[10px] mt-0.5 block">{quickCustomerErrors.customerName}</span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Customer Type</label>
                  <select
                    value={quickCustomerData.customerType}
                    onChange={(e) => setQuickCustomerData({ ...quickCustomerData, customerType: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand bg-white"
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Retail">Retail</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={quickCustomerData.mobile}
                    onChange={(e) => setQuickCustomerData({ ...quickCustomerData, mobile: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand ${quickCustomerErrors.mobile ? 'border-rose-500' : 'border-gray-300'
                      }`}
                  />
                  {quickCustomerErrors.mobile && (
                    <span className="text-rose-500 text-[10px] mt-0.5 block">{quickCustomerErrors.mobile}</span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contact@company.com"
                    value={quickCustomerData.email}
                    onChange={(e) => setQuickCustomerData({ ...quickCustomerData, email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="15-digit GST (e.g. 33AAAAA0000A1Z5)"
                    value={quickCustomerData.gstNumber}
                    onChange={(e) => setQuickCustomerData({ ...quickCustomerData, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand uppercase font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">
                    Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Plot/Door No, Street, Area"
                    value={quickCustomerData.address}
                    onChange={(e) => setQuickCustomerData({ ...quickCustomerData, address: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand ${quickCustomerErrors.address ? 'border-rose-500' : 'border-gray-300'
                      }`}
                  />
                  {quickCustomerErrors.address && (
                    <span className="text-rose-500 text-[10px] mt-0.5 block">{quickCustomerErrors.address}</span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={quickCustomerData.city}
                    onChange={(e) => setQuickCustomerData({ ...quickCustomerData, city: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Pincode <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={quickCustomerData.pincode}
                    onChange={(e) => setQuickCustomerData({ ...quickCustomerData, pincode: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand ${quickCustomerErrors.pincode ? 'border-rose-500' : 'border-gray-300'
                      }`}
                  />
                  {quickCustomerErrors.pincode && (
                    <span className="text-rose-500 text-[10px] mt-0.5 block">{quickCustomerErrors.pincode}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  disabled={quickCustomerSubmitting}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickCustomerSubmitting}
                  className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {quickCustomerSubmitting ? 'Saving Customer...' : 'Save & Select Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
