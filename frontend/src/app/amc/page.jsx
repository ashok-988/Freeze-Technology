'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Building2,
  User,
  Phone,
  Eye,
  Edit3,
  Trash2,
  ArrowRight,
  Receipt,
  RotateCcw,
  X,
  Check,
  Layers,
  Settings,
  DollarSign,
  AlertTriangle,
  Wrench,
  FileDown,
} from 'lucide-react';
import { amcApi, amcManagementApi, customerApi, productApi, serviceApi } from '../../lib/api/client';

export default function AMCPage() {
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    totalVisits: 0,
    completedVisits: 0,
    remainingVisits: 0,
  });
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Active Selected Contract
  const [activeContract, setActiveContract] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [createFormData, setCreateFormData] = useState({
    customerId: '',
    productId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalVisits: 4,
    contractValue: 6500,
    notes: '',
  });

  const [scheduleFormData, setScheduleFormData] = useState({
    scheduledDate: new Date().toISOString().split('T')[0],
    technicianId: '',
    remarks: '',
  });

  const [renewFormData, setRenewFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalVisits: 4,
    contractValue: 6500,
    notes: '',
  });

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [amcRes, statRes, custRes, prodRes, techRes] = await Promise.all([
        amcApi.getContracts(),
        amcApi.getStats(),
        customerApi.getCustomers(),
        productApi.getProducts(),
        serviceApi.getTechnicians(),
      ]);

      if (amcRes?.success) setContracts(amcRes.data || []);
      if (statRes?.success) setStats(statRes.data || {});
      if (custRes?.success) setCustomers(custRes.data || []);
      if (prodRes?.success) setProducts(prodRes.data || []);
      if (techRes?.success) setTechnicians(techRes.data || []);
    } catch (err) {
      console.error('Error loading AMC data:', err);
      showToast('Failed to load AMC contracts from database.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;

      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      const amcNo = c.amcNumber?.toLowerCase() || '';
      const cName = c.customer?.customerName?.toLowerCase() || '';
      const compName = c.customer?.companyName?.toLowerCase() || '';
      const cCode = c.customer?.customerCode?.toLowerCase() || '';
      const pName = c.product?.productName?.toLowerCase() || '';
      const pSku = c.product?.sku?.toLowerCase() || '';

      return (
        amcNo.includes(search) ||
        cName.includes(search) ||
        compName.includes(search) ||
        cCode.includes(search) ||
        pName.includes(search) ||
        pSku.includes(search)
      );
    });
  }, [contracts, searchQuery, statusFilter]);

  // Open Handlers
  const openCreate = () => {
    const today = new Date();
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    setCreateFormData({
      customerId: customers[0]?.id || '',
      productId: products[0]?.id || '',
      startDate: today.toISOString().split('T')[0],
      endDate: nextYear.toISOString().split('T')[0],
      totalVisits: 4,
      contractValue: 6500,
      notes: 'Standard 4-Visit Annual Preventive Maintenance Contract',
    });
    setShowCreateModal(true);
  };

  const openSchedule = (contract) => {
    setActiveContract(contract);
    setScheduleFormData({
      scheduledDate: new Date().toISOString().split('T')[0],
      technicianId: technicians[0]?.id || '',
      remarks: `Quarterly AMC Service Visit #${(contract.visits?.length || 0) + 1}`,
    });
    setShowScheduleModal(true);
  };

  const openRenew = (contract) => {
    setActiveContract(contract);
    const currEnd = new Date(contract.endDate);
    const newStart = new Date(currEnd.getTime() + 24 * 60 * 60 * 1000);
    const newEnd = new Date(newStart.getTime() + 365 * 24 * 60 * 60 * 1000);

    setRenewFormData({
      startDate: newStart.toISOString().split('T')[0],
      endDate: newEnd.toISOString().split('T')[0],
      totalVisits: 4,
      contractValue: 6500,
      notes: `Renewal of contract ${contract.amcNumber}`,
    });
    setShowRenewModal(true);
  };

  const openDetail = (contract) => {
    setActiveContract(contract);
    setShowDetailModal(true);
  };

  const openDelete = (contract) => {
    setActiveContract(contract);
    setShowDeleteModal(true);
  };

  // Submit Handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createFormData.customerId) {
      showToast('Please select a customer.', true);
      return;
    }
    if (!createFormData.productId) {
      showToast('Please select a covered product/equipment.', true);
      return;
    }
    if (new Date(createFormData.endDate) <= new Date(createFormData.startDate)) {
      showToast('End date must be after start date.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await amcApi.createContract({
        customerId: createFormData.customerId,
        productId: createFormData.productId,
        startDate: new Date(createFormData.startDate).toISOString(),
        endDate: new Date(createFormData.endDate).toISOString(),
        totalVisits: Number(createFormData.totalVisits) || 4,
        contractValue: Number(createFormData.contractValue) || 6500,
        notes: createFormData.notes,
      });

      if (res?.success) {
        showToast(res.message || 'AMC Contract created successfully!');
        setShowCreateModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Create AMC error:', err);
      showToast(err.response?.data?.message || 'Failed to create AMC contract.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!activeContract) return;

    try {
      setSubmitting(true);
      const res = await amcApi.scheduleVisit(activeContract.id, {
        scheduledDate: new Date(scheduleFormData.scheduledDate).toISOString(),
        technicianId: scheduleFormData.technicianId || undefined,
        remarks: scheduleFormData.remarks,
      });

      if (res?.success) {
        showToast(res.message || 'Maintenance visit scheduled!');
        setShowScheduleModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Schedule visit error:', err);
      showToast(err.response?.data?.message || 'Failed to schedule visit.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteVisit = async (contractId, visitId) => {
    try {
      setSubmitting(true);
      const res = await amcApi.completeVisit(contractId, visitId);
      if (res?.success) {
        showToast(res.message || 'Maintenance visit completed!');
        await loadData();
        if (activeContract) {
          const updated = await amcApi.getContractById(activeContract.id);
          if (updated?.success) setActiveContract(updated.data);
        }
      }
    } catch (err) {
      console.error('Complete visit error:', err);
      showToast(err.response?.data?.message || 'Failed to complete visit.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!activeContract) return;

    try {
      setSubmitting(true);
      const res = await amcApi.renewContract(activeContract.id, {
        startDate: new Date(renewFormData.startDate).toISOString(),
        endDate: new Date(renewFormData.endDate).toISOString(),
        totalVisits: Number(renewFormData.totalVisits) || 4,
        contractValue: Number(renewFormData.contractValue) || 6500,
        notes: renewFormData.notes,
      });

      if (res?.success) {
        showToast(res.message || 'Contract renewed successfully!');
        setShowRenewModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Renew AMC error:', err);
      showToast(err.response?.data?.message || 'Failed to renew contract.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (contract) => {
    try {
      setSubmitting(true);
      const res = await amcApi.createInvoice(contract.id);
      if (res?.success) {
        showToast(`Invoice ${res.data?.invoiceNumber} generated for AMC contract!`);
        setShowDetailModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Create invoice error:', err);
      showToast(err.response?.data?.message || 'Failed to generate invoice.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!activeContract) return;
    try {
      setSubmitting(true);
      const res = await amcApi.deleteContract(activeContract.id);
      if (res?.success) {
        showToast(res.message || 'Contract cancelled.');
        setShowDeleteModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Cancel AMC error:', err);
      showToast(err.response?.data?.message || 'Failed to cancel contract.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper Badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        );
      case 'Expiring Soon':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Expiring Soon
          </span>
        );
      case 'Expired':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" /> Expired
          </span>
        );
      case 'Renewed':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <RotateCcw className="w-3 h-3" /> Renewed
          </span>
        );
      case 'Cancelled':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <X className="w-3 h-3" /> Cancelled
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
            <ShieldCheck className="w-6 h-6 text-brand" />
            Annual Maintenance Contract (AMC) Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            HVAC annual contracts, quarterly preventive maintenance schedules, visits tracking, and renewals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => amcManagementApi.downloadRevenueReportPdf({}, `AMC_Revenue_Report_${Date.now()}.pdf`)}
            className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3.5 py-2 rounded-md text-xs font-semibold hover:bg-gray-200 transition-colors shadow-sm"
          >
            <FileDown className="w-4 h-4 text-gray-500" /> Export Revenue PDF
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New AMC Contract
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-medium">Active AMC Contracts</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.active || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">{stats.total || 0} Total Registered Contracts</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-medium">Expiring Soon (30 Days)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.expiringSoon || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Eligible for Renewal</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-medium">Completed Visits</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.completedVisits || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Preventive Service Completed</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[11px] font-medium">Visits Remaining</span>
            <Wrench className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{stats.remainingVisits || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Out of {stats.totalVisits || 0} Total Included</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search AMC #, customer, equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {['All', 'Active', 'Expiring Soon', 'Expired', 'Renewed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* AMC Contracts Table */}
      <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
            <div>Loading AMC contracts from PostgreSQL...</div>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">No AMC Contracts Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'All'
                ? 'No contracts match your filter criteria.'
                : 'Register an Annual Maintenance Contract to track quarterly visits and renewals.'}
            </p>
            <button
              onClick={openCreate}
              className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
            >
              + Register AMC Contract
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                  <th className="p-3">Contract #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Covered Equipment</th>
                  <th className="p-3">Contract Period</th>
                  <th className="p-3">Visits Progress</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-brand">{c.amcNumber}</div>
                      <div className="text-[10px] text-gray-400">
                        {c.totalVisits} Annual Visits
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-gray-900">
                        {c.customer?.companyName || c.customer?.customerName}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>{c.customer?.customerCode}</span>
                        <span>•</span>
                        <span>{c.customer?.mobile}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{c.product?.productName}</div>
                      <div className="text-[10px] text-gray-400">SKU: {c.product?.sku}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-gray-900 font-medium">
                        {new Date(c.startDate).toLocaleDateString('en-GB')} — {new Date(c.endDate).toLocaleDateString('en-GB')}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {Math.ceil((new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24))} days remaining
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-brand h-full rounded-full"
                            style={{
                              width: `${Math.min(100, ((c.completedVisits || 0) / (c.totalVisits || 1)) * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="font-bold text-gray-800 text-[11px]">
                          {c.completedVisits} / {c.totalVisits}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {c.remainingVisits} visits remaining
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status === 'Active' && c.remainingVisits > 0 && (
                          <button
                            onClick={() => openSchedule(c)}
                            title="Schedule Visit"
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(c.status === 'Active' || c.status === 'Expiring Soon' || c.status === 'Expired') && (
                          <button
                            onClick={() => openRenew(c)}
                            title="Renew Contract"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCreateInvoice(c)}
                          title="Generate Invoice"
                          className="p-1 text-brand hover:bg-brand/10 rounded"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => amcManagementApi.downloadContractPdf(c.id, `AMC_Contract_${c.amcNumber}.pdf`)}
                          title="Download Contract PDF"
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDetail(c)}
                          title="View Details"
                          className="p-1 text-gray-600 hover:text-brand hover:bg-gray-100 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {c.status !== 'Cancelled' && (
                          <button
                            onClick={() => openDelete(c)}
                            title="Cancel Contract"
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE AMC MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand" />
                Register New AMC Contract
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Customer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createFormData.customerId}
                  onChange={(e) => setCreateFormData({ ...createFormData, customerId: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerCode} — {c.companyName || c.customerName} ({c.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Covered Equipment / Product <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createFormData.productId}
                  onChange={(e) => setCreateFormData({ ...createFormData, productId: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                >
                  <option value="">-- Select Product / AC Unit --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.productName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={createFormData.startDate}
                    onChange={(e) => setCreateFormData({ ...createFormData, startDate: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={createFormData.endDate}
                    onChange={(e) => setCreateFormData({ ...createFormData, endDate: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Included Visits</label>
                  <input
                    type="number"
                    min="1"
                    value={createFormData.totalVisits}
                    onChange={(e) => setCreateFormData({ ...createFormData, totalVisits: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Contract Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={createFormData.contractValue}
                    onChange={(e) => setCreateFormData({ ...createFormData, contractValue: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes / Plan Scope</label>
                <textarea
                  rows={2}
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                  placeholder="e.g. 4 comprehensive services + unlimited breakdown calls"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Register Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE VISIT MODAL */}
      {showScheduleModal && activeContract && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Schedule Maintenance Visit — {activeContract.amcNumber}
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Scheduled Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={scheduleFormData.scheduledDate}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, scheduledDate: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Assign Technician</label>
                <select
                  value={scheduleFormData.technicianId}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, technicianId: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                >
                  <option value="">-- Default / Unassigned --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} — {t.designation} ({t.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Instructions / Scope</label>
                <input
                  type="text"
                  value={scheduleFormData.remarks}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, remarks: e.target.value })}
                  placeholder="e.g. Q1 Filter cleaning & electrical check"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Schedule & Link Job Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENEW AMC MODAL */}
      {showRenewModal && activeContract && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                Renew AMC Contract — {activeContract.amcNumber}
              </h3>
              <button onClick={() => setShowRenewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200 space-y-1">
                <div><strong>Customer:</strong> {activeContract.customer?.companyName || activeContract.customer?.customerName}</div>
                <div><strong>Equipment:</strong> {activeContract.product?.productName}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">New Start Date</label>
                  <input
                    type="date"
                    value={renewFormData.startDate}
                    onChange={(e) => setRenewFormData({ ...renewFormData, startDate: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">New End Date</label>
                  <input
                    type="date"
                    value={renewFormData.endDate}
                    onChange={(e) => setRenewFormData({ ...renewFormData, endDate: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">New Visit Count</label>
                  <input
                    type="number"
                    min="1"
                    value={renewFormData.totalVisits}
                    onChange={(e) => setRenewFormData({ ...renewFormData, totalVisits: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Renewal Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={renewFormData.contractValue}
                    onChange={(e) => setRenewFormData({ ...renewFormData, contractValue: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Renewing...' : 'Issue Renewed Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER MODAL */}
      {showDetailModal && activeContract && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-gray-900">Contract — {activeContract.amcNumber}</h3>
                {getStatusBadge(activeContract.status)}
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-md border border-gray-200">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Customer Details</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {activeContract.customer?.companyName || activeContract.customer?.customerName}
                  </span>
                  <div className="text-gray-500 mt-0.5">
                    {activeContract.customer?.customerCode} • {activeContract.customer?.mobile}
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">{activeContract.customer?.address}</div>
                </div>

                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Covered Equipment</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {activeContract.product?.productName}
                  </span>
                  <div className="text-gray-500 mt-0.5">SKU: {activeContract.product?.sku}</div>
                  <div className="text-gray-500 text-[11px] mt-0.5">Model: {activeContract.product?.model}</div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-md p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Contract Duration:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(activeContract.startDate).toLocaleDateString('en-GB')} — {new Date(activeContract.endDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Included Maintenance Visits:</span>
                  <span className="font-bold text-brand">{activeContract.totalVisits} Visits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Completed / Consumed:</span>
                  <span className="font-bold text-emerald-700">{activeContract.completedVisits} Completed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Remaining Visits Allowance:</span>
                  <span className="font-bold text-purple-700">{activeContract.remainingVisits} Remaining</span>
                </div>
              </div>

              {/* Maintenance Visits History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand" /> Maintenance Visits Schedule & History
                  </h4>
                  {activeContract.status === 'Active' && activeContract.remainingVisits > 0 && (
                    <button
                      onClick={() => openSchedule(activeContract)}
                      className="bg-brand text-white px-2.5 py-1 rounded text-[11px] font-semibold hover:bg-brand-dark"
                    >
                      + Schedule Visit
                    </button>
                  )}
                </div>

                {activeContract.visits && activeContract.visits.length > 0 ? (
                  <div className="space-y-2">
                    {activeContract.visits.map((v) => (
                      <div
                        key={v.id}
                        className="bg-gray-50 p-2.5 rounded border border-gray-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            <span>Visit #{v.visitNumber}</span>
                            {v.completedDate ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                Completed ({new Date(v.completedDate).toLocaleDateString('en-GB')})
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                                Scheduled ({new Date(v.scheduledDate).toLocaleDateString('en-GB')})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Tech: {v.technician?.fullName || 'Unassigned'} • {v.remarks || 'Routine AMC Service'}
                          </div>
                        </div>

                        {!v.completedDate && (
                          <button
                            onClick={() => handleCompleteVisit(activeContract.id, v.id)}
                            disabled={submitting}
                            className="bg-emerald-600 text-white px-2.5 py-1 rounded font-semibold text-[11px] hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 italic text-center py-4 bg-gray-50 rounded border">
                    No maintenance visits scheduled yet.
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <button
                  onClick={() => handleCreateInvoice(activeContract)}
                  disabled={submitting}
                  className="bg-brand text-white px-4 py-2 rounded-md font-semibold text-xs hover:bg-brand-dark flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Receipt className="w-4 h-4" /> 1-Click Generate GST Invoice
                </button>
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

      {/* CANCEL MODAL */}
      {showDeleteModal && activeContract && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-xs text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900">
              Cancel Contract {activeContract.amcNumber}?
            </h3>
            <p className="text-gray-500 mt-2">
              This will update the contract status to Cancelled.
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
              >
                Go Back
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 text-white rounded-md font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
