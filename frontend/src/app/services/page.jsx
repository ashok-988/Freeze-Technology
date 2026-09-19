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
  UserCheck,
  Calendar,
  Building2,
  User,
  Phone,
  Eye,
  Edit3,
  Trash2,
  ArrowRight,
  Printer,
  FileText,
  X,
  Check,
  Layers,
  Settings,
  DollarSign,
  AlertTriangle,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { serviceApi, customerApi, productApi } from '../../lib/api/client';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    highPriority: 0,
  });
  const [technicians, setTechnicians] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected Service
  const [activeJob, setActiveJob] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [createFormData, setCreateFormData] = useState({
    customerId: '',
    productId: '',
    complaintDescription: '',
    priority: 'Medium',
    serviceType: 'Breakdown',
    technicianId: '',
    visitDate: new Date().toISOString().split('T')[0],
    estimatedCost: 1500,
    notes: '',
  });

  const [assignFormData, setAssignFormData] = useState({
    technicianId: '',
    visitDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [statusFormData, setStatusFormData] = useState({
    status: 'In Progress',
    remarks: '',
  });

  const [completeFormData, setCompleteFormData] = useState({
    workDone: '',
    sparePartsUsed: '',
    actualCost: 1500,
    customerSignature: 'Verified by Customer',
    notes: '',
  });

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [srvRes, statRes, techRes, custRes, prodRes] = await Promise.all([
        serviceApi.getServices(),
        serviceApi.getStats(),
        serviceApi.getTechnicians(),
        customerApi.getCustomers(),
        productApi.getProducts(),
      ]);

      if (srvRes?.success) setServices(srvRes.data || []);
      if (statRes?.success) setStats(statRes.data || {});
      if (techRes?.success) setTechnicians(techRes.data || []);
      if (custRes?.success) setCustomers(custRes.data || []);
      if (prodRes?.success) setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Error loading service data:', err);
      showToast('Failed to load service job cards from database.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      if (statusFilter !== 'All' && srv.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && srv.complaint?.priority !== priorityFilter) return false;

      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      const jobNo = srv.jobNumber?.toLowerCase() || '';
      const cmpNo = srv.complaint?.complaintNumber?.toLowerCase() || '';
      const cName = srv.complaint?.customer?.customerName?.toLowerCase() || '';
      const compName = srv.complaint?.customer?.companyName?.toLowerCase() || '';
      const desc = srv.complaint?.complaintDescription?.toLowerCase() || '';
      const tech = srv.technician?.fullName?.toLowerCase() || '';
      const mob = srv.complaint?.customer?.mobile || '';

      return (
        jobNo.includes(search) ||
        cmpNo.includes(search) ||
        cName.includes(search) ||
        compName.includes(search) ||
        desc.includes(search) ||
        tech.includes(search) ||
        mob.includes(search)
      );
    });
  }, [services, searchQuery, statusFilter, priorityFilter]);

  // Open Handlers
  const openCreate = () => {
    setCreateFormData({
      customerId: customers[0]?.id || '',
      productId: '',
      complaintDescription: '',
      priority: 'Medium',
      serviceType: 'Breakdown',
      technicianId: technicians[0]?.id || '',
      visitDate: new Date().toISOString().split('T')[0],
      estimatedCost: 1500,
      notes: '',
    });
    setShowCreateModal(true);
  };

  const openAssign = (job) => {
    setActiveJob(job);
    setAssignFormData({
      technicianId: job.technicianId || technicians[0]?.id || '',
      visitDate: job.visitDate
        ? new Date(job.visitDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowAssignModal(true);
  };

  const openStatus = (job) => {
    setActiveJob(job);
    setStatusFormData({
      status: job.status === 'Assigned' ? 'In Progress' : 'In Progress',
      remarks: '',
    });
    setShowStatusModal(true);
  };

  const openComplete = (job) => {
    setActiveJob(job);
    setCompleteFormData({
      workDone: '',
      sparePartsUsed: '',
      actualCost: job.actualCost || job.estimatedCost || 1500,
      customerSignature: 'Customer Signoff OK',
      notes: '',
    });
    setShowCompleteModal(true);
  };

  const openDetail = (job) => {
    setActiveJob(job);
    setShowDetailModal(true);
  };

  const openDelete = (job) => {
    setActiveJob(job);
    setShowDeleteModal(true);
  };

  // Submit Handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createFormData.customerId) {
      showToast('Please select a customer.', true);
      return;
    }
    if (!createFormData.complaintDescription.trim()) {
      showToast('Please enter a complaint description.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await serviceApi.createService({
        customerId: createFormData.customerId,
        productId: createFormData.productId || undefined,
        complaintDescription: createFormData.complaintDescription,
        priority: createFormData.priority,
        serviceType: createFormData.serviceType,
        technicianId: createFormData.technicianId || undefined,
        visitDate: createFormData.visitDate ? new Date(createFormData.visitDate).toISOString() : undefined,
        estimatedCost: Number(createFormData.estimatedCost) || 0,
        notes: createFormData.notes,
      });

      if (res?.success) {
        showToast(res.message || 'Service request created successfully!');
        setShowCreateModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Create service error:', err);
      showToast(err.response?.data?.message || 'Failed to create service job card.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!activeJob) return;

    try {
      setSubmitting(true);
      const res = await serviceApi.assignTechnician(activeJob.id, {
        technicianId: assignFormData.technicianId,
        visitDate: assignFormData.visitDate ? new Date(assignFormData.visitDate).toISOString() : undefined,
        notes: assignFormData.notes,
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
    if (!activeJob) return;

    try {
      setSubmitting(true);
      const res = await serviceApi.updateStatus(activeJob.id, {
        status: statusFormData.status,
        remarks: statusFormData.remarks,
      });

      if (res?.success) {
        showToast(res.message || 'Job status updated successfully!');
        setShowStatusModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Update status error:', err);
      showToast(err.response?.data?.message || 'Failed to update job status.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!activeJob) return;
    if (!completeFormData.workDone.trim()) {
      showToast('Please describe the work performed.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await serviceApi.completeService(activeJob.id, {
        workDone: completeFormData.workDone,
        sparePartsUsed: completeFormData.sparePartsUsed,
        actualCost: Number(completeFormData.actualCost) || 0,
        customerSignature: completeFormData.customerSignature,
        notes: completeFormData.notes,
      });

      if (res?.success) {
        showToast(res.message || 'Service job completed successfully!');
        setShowCompleteModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Complete service error:', err);
      showToast(err.response?.data?.message || 'Failed to complete service.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (job) => {
    try {
      setSubmitting(true);
      const res = await serviceApi.createInvoice(job.id);
      if (res?.success) {
        showToast(`Invoice ${res.data?.invoiceNumber} created for Job Card!`);
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
    if (!activeJob) return;
    try {
      setSubmitting(true);
      const res = await serviceApi.deleteService(activeJob.id);
      if (res?.success) {
        showToast(res.message || 'Job card cancelled.');
        setShowDeleteModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Cancel job error:', err);
      showToast(err.response?.data?.message || 'Failed to cancel job.', true);
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
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <Wrench className="w-3 h-3" /> In Progress
          </span>
        );
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <UserCheck className="w-3 h-3" /> Assigned
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <X className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">Critical</span>;
      case 'High':
        return <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">High</span>;
      case 'Low':
        return <span className="bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded text-[10px]">Low</span>;
      case 'Medium':
      default:
        return <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded text-[10px]">Medium</span>;
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
            Service & Job Card Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            HVAC breakdown complaints, technician dispatch, work history, and service billing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Service Request
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-medium">Total Job Cards</span>
            <Layers className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">{stats.highPriority || 0} High Priority</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-medium">Pending Assignment</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.pending || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Awaiting Technician Dispatch</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[11px] font-medium">In Progress & Active</span>
            <Wrench className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {(stats.inProgress || 0) + (stats.assigned || 0)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {stats.assigned || 0} Assigned • {stats.inProgress || 0} On Site
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-medium">Completed Jobs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.completed || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Resolved & Ready for Invoicing</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search job #, customer, complaint, technician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {['All', 'Pending', 'Assigned', 'In Progress', 'Completed'].map((st) => (
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

      {/* Job Cards Table */}
      <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
            <div>Loading service job cards from PostgreSQL...</div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">No Service Job Cards Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'All'
                ? 'No job cards match your filter criteria.'
                : 'Create a service request to dispatch technicians and track repair work.'}
            </p>
            <button
              onClick={openCreate}
              className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
            >
              + Create Service Request
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                  <th className="p-3">Job Card #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Complaint / Issue</th>
                  <th className="p-3 text-center">Priority</th>
                  <th className="p-3">Assigned Technician</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Estimated / Actual</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-brand">{srv.jobNumber}</div>
                      <div className="text-[10px] text-gray-400">{srv.complaint?.complaintNumber}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-gray-900">
                        {srv.complaint?.customer?.companyName || srv.complaint?.customer?.customerName}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>{srv.complaint?.customer?.customerCode}</span>
                        <span>•</span>
                        <span>{srv.complaint?.customer?.mobile}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900 max-w-xs truncate">
                        {srv.complaint?.complaintDescription}
                      </div>
                      {srv.complaint?.product && (
                        <div className="text-[10px] text-gray-400">
                          Equip: {srv.complaint.product.productName}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {getPriorityBadge(srv.complaint?.priority)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gray-400" />
                        {srv.technician?.fullName || 'Unassigned'}
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(srv.visitDate).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(srv.status)}
                    </td>
                    <td className="p-3 text-right font-bold text-gray-900">
                      ₹{(srv.actualCost || srv.estimatedCost || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {srv.status === 'Pending' && (
                          <button
                            onClick={() => openAssign(srv)}
                            title="Assign Technician"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {srv.status === 'Assigned' && (
                          <button
                            onClick={() => openStatus(srv)}
                            title="Start Work (In Progress)"
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(srv.status === 'In Progress' || srv.status === 'Assigned') && (
                          <button
                            onClick={() => openComplete(srv)}
                            title="Complete Service"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {srv.status === 'Completed' && (
                          <button
                            onClick={() => handleCreateInvoice(srv)}
                            title="Generate Invoice"
                            className="p-1 text-brand hover:bg-brand/10 rounded"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openDetail(srv)}
                          title="View Job Details"
                          className="p-1 text-gray-600 hover:text-brand hover:bg-gray-100 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {srv.status !== 'Completed' && (
                          <button
                            onClick={() => openDelete(srv)}
                            title="Cancel Job"
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

      {/* CREATE SERVICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-brand" />
                New Service Request / Complaint
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Equipment / AC Model</label>
                  <select
                    value={createFormData.productId}
                    onChange={(e) => setCreateFormData({ ...createFormData, productId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                  >
                    <option value="">-- General Service (No specific model) --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.productName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Service Type</label>
                  <select
                    value={createFormData.serviceType}
                    onChange={(e) => setCreateFormData({ ...createFormData, serviceType: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                  >
                    <option value="Breakdown">Breakdown Repair</option>
                    <option value="Water Wash">Water Wash Service</option>
                    <option value="General Service">General Checkup & Filter Cleaning</option>
                    <option value="Gas Charging">Refrigerant / Gas Charging</option>
                    <option value="Installation Repair">Installation / Piping Repair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Complaint Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={createFormData.complaintDescription}
                  onChange={(e) => setCreateFormData({ ...createFormData, complaintDescription: e.target.value })}
                  required
                  placeholder="e.g. AC not cooling, fan motor noise, water leaking from indoor unit"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={createFormData.priority}
                    onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={createFormData.estimatedCost}
                    onChange={(e) => setCreateFormData({ ...createFormData, estimatedCost: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Assign Technician</label>
                  <select
                    value={createFormData.technicianId}
                    onChange={(e) => setCreateFormData({ ...createFormData, technicianId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                  >
                    <option value="">-- Assign Later (Pending) --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={createFormData.visitDate}
                    onChange={(e) => setCreateFormData({ ...createFormData, visitDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
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
                  {submitting ? 'Creating...' : 'Create Job Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN TECHNICIAN MODAL */}
      {showAssignModal && activeJob && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                Assign Technician — {activeJob.jobNumber}
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Select Technician <span className="text-rose-500">*</span>
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
                <label className="block font-semibold text-gray-700 mb-1">Scheduled Visit Date</label>
                <input
                  type="date"
                  value={assignFormData.visitDate}
                  onChange={(e) => setAssignFormData({ ...assignFormData, visitDate: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Instructions / Notes</label>
                <input
                  type="text"
                  value={assignFormData.notes}
                  onChange={(e) => setAssignFormData({ ...assignFormData, notes: e.target.value })}
                  placeholder="e.g. Call customer 30 mins before arrival"
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

      {/* STATUS UPDATE MODAL */}
      {showStatusModal && activeJob && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-600" />
                Update Job Status — {activeJob.jobNumber}
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">New Status</label>
                <select
                  value={statusFormData.status}
                  onChange={(e) => setStatusFormData({ ...statusFormData, status: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white font-semibold"
                >
                  <option value="In Progress">In Progress (Work started)</option>
                  <option value="Assigned">Assigned (Dispatched)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Status Notes / Remarks</label>
                <input
                  type="text"
                  value={statusFormData.remarks}
                  onChange={(e) => setStatusFormData({ ...statusFormData, remarks: e.target.value })}
                  placeholder="e.g. Technician arrived at customer site"
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

      {/* COMPLETE SERVICE MODAL */}
      {showCompleteModal && activeJob && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Complete Service Job — {activeJob.jobNumber}
              </h3>
              <button onClick={() => setShowCompleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Work Done / Resolution <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={completeFormData.workDone}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, workDone: e.target.value })}
                  required
                  placeholder="e.g. Coil pressure wash completed, capacitor replaced, cooling tested at 16°C"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Spare Parts Used</label>
                <input
                  type="text"
                  value={completeFormData.sparePartsUsed}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, sparePartsUsed: e.target.value })}
                  placeholder="e.g. 50uF Capacitor, 1/4 inch copper flare nut"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Final Service Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={completeFormData.actualCost}
                    onChange={(e) => setCompleteFormData({ ...completeFormData, actualCost: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Customer Signoff / Verified By</label>
                  <input
                    type="text"
                    value={completeFormData.customerSignature}
                    onChange={(e) => setCompleteFormData({ ...completeFormData, customerSignature: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
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
                  className="px-5 py-2 bg-emerald-700 text-white rounded-md font-semibold hover:bg-emerald-800 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Mark Job Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL / DRAWER MODAL */}
      {showDetailModal && activeJob && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-gray-900">Job Card Detail — {activeJob.jobNumber}</h3>
                {getStatusBadge(activeJob.status)}
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-md border border-gray-200">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Customer</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {activeJob.complaint?.customer?.companyName || activeJob.complaint?.customer?.customerName}
                  </span>
                  <div className="text-gray-500 mt-0.5">
                    {activeJob.complaint?.customer?.customerCode} • {activeJob.complaint?.customer?.mobile}
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">{activeJob.complaint?.customer?.address}</div>
                </div>

                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Technician & Visit</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {activeJob.technician?.fullName || 'Unassigned'}
                  </span>
                  <div className="text-gray-500 mt-0.5">
                    Phone: {activeJob.technician?.phone || 'N/A'}
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    Scheduled: {new Date(activeJob.visitDate).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-md p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Complaint #:</span>
                  <span className="font-mono font-bold text-brand">{activeJob.complaint?.complaintNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Issue:</span>
                  <span className="font-medium text-gray-900">{activeJob.complaint?.complaintDescription}</span>
                </div>
                {activeJob.complaint?.product && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Equipment / Product:</span>
                    <span className="font-medium text-gray-900">{activeJob.complaint.product.productName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Priority:</span>
                  <span>{getPriorityBadge(activeJob.complaint?.priority)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Estimated / Actual Charges:</span>
                  <span className="font-bold text-emerald-700">
                    ₹{(activeJob.actualCost || activeJob.estimatedCost || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Service History / Work Performed */}
              {activeJob.serviceHistory && activeJob.serviceHistory.length > 0 && (
                <div className="border border-emerald-200 bg-emerald-50/50 rounded-md p-3.5 space-y-1.5">
                  <div className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Work Performed & Resolution
                  </div>
                  {activeJob.serviceHistory.map((hist) => (
                    <div key={hist.id} className="text-gray-800 text-[11px] pt-1">
                      <div><strong>Work Done:</strong> {hist.workDone}</div>
                      {hist.sparePartsUsed && <div><strong>Spares:</strong> {hist.sparePartsUsed}</div>}
                      {hist.customerSignature && <div><strong>Signoff:</strong> {hist.customerSignature}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Status Timeline History */}
              {activeJob.serviceStatusLogs && activeJob.serviceStatusLogs.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-700 mb-2">Status Audit Trail</h4>
                  <div className="space-y-1.5">
                    {activeJob.serviceStatusLogs.map((log) => (
                      <div key={log.id} className="flex justify-between items-center text-[11px] bg-gray-50 p-2 rounded border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-600">{log.previousStatus}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="font-bold text-brand">{log.currentStatus}</span>
                        </div>
                        <span className="text-gray-400">
                          {new Date(log.updatedAt).toLocaleString('en-GB')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t">
                {activeJob.status === 'Completed' ? (
                  <button
                    onClick={() => handleCreateInvoice(activeJob)}
                    disabled={submitting}
                    className="bg-brand text-white px-4 py-2 rounded-md font-semibold text-xs hover:bg-brand-dark flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Receipt className="w-4 h-4" /> 1-Click Generate GST Invoice
                  </button>
                ) : (
                  <div></div>
                )}
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

      {/* CANCEL / DELETE MODAL */}
      {showDeleteModal && activeJob && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-xs text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900">
              Cancel Job Card {activeJob.jobNumber}?
            </h3>
            <p className="text-gray-500 mt-2">
              This will update the job card and complaint status to Cancelled.
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
