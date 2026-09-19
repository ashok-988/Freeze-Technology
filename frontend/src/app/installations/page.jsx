'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Wrench,
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
  MapPin,
  FileText,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react';
import { installationApi, customerApi, productApi, serviceApi } from '../../lib/api/client';

export default function InstallationsPage() {
  const [installations, setInstallations] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    thisMonth: 0,
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Active Selected Installation
  const [activeInstallation, setActiveInstallation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [createFormData, setCreateFormData] = useState({
    customerId: '',
    productId: '',
    technicianId: '',
    installationDate: new Date().toISOString().split('T')[0],
    installationStatus: 'Pending',
    notes: '',
  });

  const [assignFormData, setAssignFormData] = useState({
    technicianId: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    instructions: '',
  });

  const [statusFormData, setStatusFormData] = useState({
    status: '',
    notes: '',
  });

  const [completeFormData, setCompleteFormData] = useState({
    completedDate: new Date().toISOString().split('T')[0],
    customerVerified: true,
    commissioningNotes: '',
    technicianRemarks: '',
    actualCost: 2500,
  });

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [instRes, statRes, custRes, prodRes, techRes] = await Promise.all([
        installationApi.getInstallations(),
        installationApi.getStats(),
        customerApi.getCustomers(),
        productApi.getProducts(),
        serviceApi.getTechnicians(),
      ]);

      if (instRes?.success) setInstallations(instRes.data || []);
      if (statRes?.success) setStats(statRes.data || {});
      if (custRes?.success) setCustomers(custRes.data || []);
      if (prodRes?.success) setProducts(prodRes.data || []);
      if (techRes?.success) setTechnicians(techRes.data || []);
    } catch (err) {
      console.error('Error loading Installations data:', err);
      showToast('Failed to load installations from database.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Installations
  const filteredInstallations = useMemo(() => {
    return installations.filter((inst) => {
      if (statusFilter !== 'All' && inst.installationStatus !== statusFilter) return false;

      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      const instNo = inst.installationNumber?.toLowerCase() || '';
      const cName = inst.customer?.customerName?.toLowerCase() || '';
      const compName = inst.customer?.companyName?.toLowerCase() || '';
      const cCode = inst.customer?.customerCode?.toLowerCase() || '';
      const pName = inst.product?.productName?.toLowerCase() || '';
      const pSku = inst.product?.sku?.toLowerCase() || '';
      const tName = inst.technician?.fullName?.toLowerCase() || '';

      return (
        instNo.includes(search) ||
        cName.includes(search) ||
        compName.includes(search) ||
        cCode.includes(search) ||
        pName.includes(search) ||
        pSku.includes(search) ||
        tName.includes(search)
      );
    });
  }, [installations, searchQuery, statusFilter]);

  // Open Handlers
  const openCreate = () => {
    setCreateFormData({
      customerId: customers[0]?.id || '',
      productId: products[0]?.id || '',
      technicianId: technicians[0]?.id || '',
      installationDate: new Date().toISOString().split('T')[0],
      installationStatus: 'Pending',
      notes: 'Standard Split AC site installation and gas leakage verification.',
    });
    setShowCreateModal(true);
  };

  const openAssign = (inst) => {
    setActiveInstallation(inst);
    setAssignFormData({
      technicianId: inst.technicianId || technicians[0]?.id || '',
      scheduledDate: inst.installationDate
        ? new Date(inst.installationDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      instructions: 'Carry outdoor unit mounting kit and 4m copper piping set.',
    });
    setShowAssignModal(true);
  };

  const openStatus = (inst) => {
    setActiveInstallation(inst);
    setStatusFormData({
      status: getNextLogicalStatus(inst.installationStatus),
      notes: '',
    });
    setShowStatusModal(true);
  };

  const openComplete = (inst) => {
    setActiveInstallation(inst);
    setCompleteFormData({
      completedDate: new Date().toISOString().split('T')[0],
      customerVerified: true,
      commissioningNotes: 'Outdoor & indoor units mounted, vacuum pump test passed, 18°C cooling verified.',
      technicianRemarks: 'Installation completed per factory standards.',
      actualCost: 2500,
    });
    setShowCompleteModal(true);
  };

  const openDetail = (inst) => {
    setActiveInstallation(inst);
    setShowDetailModal(true);
  };

  const openDelete = (inst) => {
    setActiveInstallation(inst);
    setShowDeleteModal(true);
  };

  const getNextLogicalStatus = (current) => {
    switch (current) {
      case 'Pending':
        return 'Assigned';
      case 'Assigned':
        return 'Scheduled';
      case 'Scheduled':
        return 'In Progress';
      case 'In Progress':
        return 'Completed';
      default:
        return 'Cancelled';
    }
  };

  // Submit Handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createFormData.customerId) {
      showToast('Please select a customer.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await installationApi.createInstallation({
        customerId: createFormData.customerId,
        productId: createFormData.productId || undefined,
        technicianId: createFormData.technicianId || undefined,
        installationDate: createFormData.installationDate
          ? new Date(createFormData.installationDate).toISOString()
          : undefined,
        installationStatus: createFormData.installationStatus,
        notes: createFormData.notes,
      });

      if (res?.success) {
        showToast(res.message || 'Installation created successfully!');
        setShowCreateModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Create installation error:', err);
      showToast(err.response?.data?.message || 'Failed to create installation.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!activeInstallation || !assignFormData.technicianId) return;

    try {
      setSubmitting(true);
      const res = await installationApi.assignTechnician(activeInstallation.id, {
        technicianId: assignFormData.technicianId,
        scheduledDate: assignFormData.scheduledDate
          ? new Date(assignFormData.scheduledDate).toISOString()
          : undefined,
        instructions: assignFormData.instructions,
      });

      if (res?.success) {
        showToast(res.message || 'Technician assigned successfully!');
        setShowAssignModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Assign technician error:', err);
      showToast(err.response?.data?.message || 'Failed to assign technician.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!activeInstallation || !statusFormData.status) return;

    try {
      setSubmitting(true);
      const res = await installationApi.updateStatus(activeInstallation.id, {
        status: statusFormData.status,
        notes: statusFormData.notes,
      });

      if (res?.success) {
        showToast(res.message || 'Installation status updated!');
        setShowStatusModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Update status error:', err);
      showToast(err.response?.data?.message || 'Failed to update status.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!activeInstallation) return;

    try {
      setSubmitting(true);
      const res = await installationApi.completeInstallation(activeInstallation.id, {
        completedDate: completeFormData.completedDate
          ? new Date(completeFormData.completedDate).toISOString()
          : new Date().toISOString(),
        customerVerified: completeFormData.customerVerified,
        commissioningNotes: completeFormData.commissioningNotes,
        technicianRemarks: completeFormData.technicianRemarks,
        actualCost: Number(completeFormData.actualCost) || 2500,
      });

      if (res?.success) {
        showToast(res.message || 'Installation marked as Completed & Commissioned!');
        setShowCompleteModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Complete installation error:', err);
      showToast(err.response?.data?.message || 'Failed to complete installation.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (inst) => {
    try {
      setSubmitting(true);
      const res = await installationApi.createInvoice(inst.id);
      if (res?.success) {
        showToast(`Invoice ${res.data?.invoiceNumber} generated for installation!`);
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
    if (!activeInstallation) return;
    try {
      setSubmitting(true);
      const res = await installationApi.deleteInstallation(activeInstallation.id);
      if (res?.success) {
        showToast(res.message || 'Installation cancelled.');
        setShowDeleteModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Cancel installation error:', err);
      showToast(err.response?.data?.message || 'Failed to cancel installation.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper Badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'Scheduled':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <Calendar className="w-3 h-3" /> Scheduled
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <User className="w-3 h-3" /> Assigned
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" /> Pending
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
            <Wrench className="w-6 h-6 text-brand" />
            Installation Management & Commissioning
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            New AC delivery tracker, technician site assignments, commissioning checklists, and warranty handoff.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Installation Job
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-medium">Total Installations</span>
            <Layers className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">{stats.thisMonth || 0} Booked This Month</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-yellow-600 mb-1">
            <span className="text-[11px] font-medium">Pending / Unscheduled</span>
            <AlertCircle className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-yellow-700">{stats.pending || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Requires Tech Assignment</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[11px] font-medium">Scheduled & In Progress</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {(stats.scheduled || 0) + (stats.inProgress || 0)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Field Technicians Dispatched</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-medium">Commissioned & Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.completed || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">100% Commissioned & Signed Off</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search INST #, customer, equipment, tech..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {['All', 'Pending', 'Assigned', 'Scheduled', 'In Progress', 'Completed'].map((st) => (
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

      {/* Installations Table */}
      <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
            <div>Loading installation records from PostgreSQL...</div>
          </div>
        ) : filteredInstallations.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">No Installation Records Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'All'
                ? 'No installation jobs match your filter criteria.'
                : 'Create an installation request to assign technicians and commission equipment.'}
            </p>
            <button
              onClick={openCreate}
              className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
            >
              + Create Installation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                  <th className="p-3">Job Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Equipment / Product</th>
                  <th className="p-3">Assigned Technician</th>
                  <th className="p-3">Installation Date</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInstallations.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-brand">{inst.installationNumber}</div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(inst.createdAt).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-gray-900">
                        {inst.customer?.companyName || inst.customer?.customerName}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>{inst.customer?.customerCode}</span>
                        <span>•</span>
                        <span>{inst.customer?.mobile}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">
                        {inst.product?.productName || 'General HVAC Unit'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {inst.product?.sku ? `SKU: ${inst.product.sku}` : 'Standard AC Installation'}
                      </div>
                    </td>
                    <td className="p-3">
                      {inst.technician ? (
                        <div>
                          <div className="font-semibold text-gray-800">{inst.technician.fullName}</div>
                          <div className="text-[10px] text-gray-400">{inst.technician.phone}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3">
                      {inst.installationDate ? (
                        <div>
                          <div className="text-gray-900 font-medium">
                            {new Date(inst.installationDate).toLocaleDateString('en-GB')}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {inst.completedDate
                              ? `Completed on ${new Date(inst.completedDate).toLocaleDateString('en-GB')}`
                              : 'Scheduled'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(inst.installationStatus)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inst.installationStatus !== 'Completed' && inst.installationStatus !== 'Cancelled' && (
                          <>
                            <button
                              onClick={() => openAssign(inst)}
                              title="Assign Technician"
                              className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                            >
                              <User className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openStatus(inst)}
                              title="Update Status"
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openComplete(inst)}
                              title="Commission & Complete"
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded font-bold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {!inst.invoiceId && (
                          <button
                            onClick={() => handleCreateInvoice(inst)}
                            title="Generate GST Invoice"
                            className="p-1 text-brand hover:bg-brand/10 rounded"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openDetail(inst)}
                          title="View Details"
                          className="p-1 text-gray-600 hover:text-brand hover:bg-gray-100 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {inst.installationStatus !== 'Cancelled' && (
                          <button
                            onClick={() => openDelete(inst)}
                            title="Cancel Installation"
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

      {/* CREATE INSTALLATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-brand" />
                Book New AC Installation Job
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
                <label className="block font-semibold text-gray-700 mb-1">Equipment / AC Model</label>
                <select
                  value={createFormData.productId}
                  onChange={(e) => setCreateFormData({ ...createFormData, productId: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                >
                  <option value="">-- Select Product / AC Unit --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.productName} ({p.brand?.brandName || 'Brand'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Assigned Technician</label>
                  <select
                    value={createFormData.technicianId}
                    onChange={(e) => setCreateFormData({ ...createFormData, technicianId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                  >
                    <option value="">-- Unassigned --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} — {t.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Installation Date</label>
                  <input
                    type="date"
                    value={createFormData.installationDate}
                    onChange={(e) => setCreateFormData({ ...createFormData, installationDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Site Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                  placeholder="e.g. 2nd floor bedroom, outdoor unit on balcony stand"
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
                  {submitting ? 'Creating...' : 'Register Installation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN TECHNICIAN MODAL */}
      {showAssignModal && activeInstallation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Assign Technician — {activeInstallation.installationNumber}
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Select Lead Technician <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignFormData.technicianId}
                  onChange={(e) => setAssignFormData({ ...assignFormData, technicianId: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                >
                  <option value="">-- Select Technician --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} — {t.designation} ({t.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={assignFormData.scheduledDate}
                  onChange={(e) => setAssignFormData({ ...assignFormData, scheduledDate: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Special Instructions</label>
                <input
                  type="text"
                  value={assignFormData.instructions}
                  onChange={(e) => setAssignFormData({ ...assignFormData, instructions: e.target.value })}
                  placeholder="e.g. Carry outdoor unit mounting kit and 4m copper piping"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {showStatusModal && activeInstallation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-blue-600" />
                Update Status — {activeInstallation.installationNumber}
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <span className="text-gray-500 font-semibold">Current Status:</span>{' '}
                <span className="font-bold">{activeInstallation.installationStatus}</span>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  New Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={statusFormData.status}
                  onChange={(e) => setStatusFormData({ ...statusFormData, status: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white font-semibold"
                >
                  {['Pending', 'Assigned', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'].map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Status Remarks</label>
                <input
                  type="text"
                  value={statusFormData.notes}
                  onChange={(e) => setStatusFormData({ ...statusFormData, notes: e.target.value })}
                  placeholder="e.g. Technician arrived on site, started mounting"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE & COMMISSION MODAL */}
      {showCompleteModal && activeInstallation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Commission & Sign Off — {activeInstallation.installationNumber}
              </h3>
              <button onClick={() => setShowCompleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Commissioning Date</label>
                  <input
                    type="date"
                    value={completeFormData.completedDate}
                    onChange={(e) => setCompleteFormData({ ...completeFormData, completedDate: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Installation Cost (₹)</label>
                  <input
                    type="number"
                    value={completeFormData.actualCost}
                    onChange={(e) => setCompleteFormData({ ...completeFormData, actualCost: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Commissioning Checklist & Notes</label>
                <textarea
                  rows={2}
                  value={completeFormData.commissioningNotes}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, commissioningNotes: e.target.value })}
                  placeholder="e.g. Copper piping 4m, vacuum pressure 500 microns, test run verified"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Technician Remarks</label>
                <input
                  type="text"
                  value={completeFormData.technicianRemarks}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, technicianRemarks: e.target.value })}
                  placeholder="e.g. Demo given to customer, remote control handed over"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 bg-emerald-50 p-2.5 rounded border border-emerald-200">
                <input
                  type="checkbox"
                  id="customerVerifiedCheck"
                  checked={completeFormData.customerVerified}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, customerVerified: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="customerVerifiedCheck" className="font-semibold text-emerald-900 text-[11px]">
                  Customer verified installation & signed delivery acknowledgement
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'Commissioning...' : 'Complete & Sign Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER MODAL */}
      {showDetailModal && activeInstallation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-gray-900">Job — {activeInstallation.installationNumber}</h3>
                {getStatusBadge(activeInstallation.installationStatus)}
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
                    {activeInstallation.customer?.companyName || activeInstallation.customer?.customerName}
                  </span>
                  <div className="text-gray-500 mt-0.5">
                    {activeInstallation.customer?.customerCode} • {activeInstallation.customer?.mobile}
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">{activeInstallation.customer?.address}</div>
                </div>

                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Equipment / AC Model</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {activeInstallation.product?.productName || 'Standard AC Unit'}
                  </span>
                  <div className="text-gray-500 mt-0.5">SKU: {activeInstallation.product?.sku || 'N/A'}</div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    Warranty: {activeInstallation.product?.warrantyMonths || 12} Months
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-md p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Assigned Technician:</span>
                  <span className="font-bold text-gray-900">
                    {activeInstallation.technician?.fullName || 'Unassigned'} ({activeInstallation.technician?.phone || 'No phone'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Installation Schedule:</span>
                  <span className="font-medium text-gray-900">
                    {activeInstallation.installationDate
                      ? new Date(activeInstallation.installationDate).toLocaleDateString('en-GB')
                      : 'Pending Scheduling'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Commissioning Date:</span>
                  <span className="font-medium text-emerald-700">
                    {activeInstallation.completedDate
                      ? new Date(activeInstallation.completedDate).toLocaleDateString('en-GB')
                      : 'Not Commissioned Yet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Customer Verification:</span>
                  <span className="font-bold text-gray-900">
                    {activeInstallation.customerVerified ? 'Verified & Signed' : 'Pending Verification'}
                  </span>
                </div>
                {activeInstallation.notes && (
                  <div className="pt-2 border-t text-gray-600 text-[11px] whitespace-pre-line">
                    <strong>Notes:</strong> {activeInstallation.notes}
                  </div>
                )}
              </div>

              {/* Linked Invoicing Info */}
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-md flex items-center justify-between">
                <div>
                  <span className="text-blue-900 font-bold block text-xs">GST Tax Invoice Status</span>
                  <span className="text-blue-700 text-[11px]">
                    {activeInstallation.invoice
                      ? `Invoice ${activeInstallation.invoice.invoiceNumber} — ₹${activeInstallation.invoice.grandTotal} (${activeInstallation.invoice.paymentStatus})`
                      : 'No invoice generated yet for this installation.'}
                  </span>
                </div>
                {!activeInstallation.invoice && (
                  <button
                    onClick={() => handleCreateInvoice(activeInstallation)}
                    disabled={submitting}
                    className="bg-brand text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-brand-dark flex items-center gap-1 shadow-sm disabled:opacity-50"
                  >
                    <Receipt className="w-3.5 h-3.5" /> Generate Invoice
                  </button>
                )}
              </div>

              <div className="flex justify-end items-center pt-3 border-t">
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
      {showDeleteModal && activeInstallation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-xs text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900">
              Cancel Installation {activeInstallation.installationNumber}?
            </h3>
            <p className="text-gray-500 mt-2">
              This will update the installation status to Cancelled.
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
