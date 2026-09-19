'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  Search,
  Plus,
  Filter,
  RefreshCw,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Eye,
  CheckSquare,
  X,
  Package,
  Wrench,
  Boxes,
  ShieldCheck,
} from 'lucide-react';
import {
  preventiveMaintenanceApi,
  assetApi,
  employeeApi,
  productApi,
} from '../../lib/api/client';

export default function PreventiveMaintenancePage() {
  // Main state
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rangeFilter, setRangeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Reference lists
  const [assetsList, setAssetsList] = useState([]);
  const [techniciansList, setTechniciansList] = useState([]);
  const [productsList, setProductsList] = useState([]);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedPm, setSelectedPm] = useState(null);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    assetId: '',
    plannedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    frequency: 'QUARTERLY',
    technicianId: '',
    remarks: '',
  });

  const [assignForm, setAssignForm] = useState({
    technicianId: '',
  });

  const [completeForm, setCompleteForm] = useState({
    completionDate: new Date().toISOString().split('T')[0],
    actualStartTime: '',
    actualEndTime: '',
    workPerformed: 'Completed comprehensive preventive maintenance inspection and service.',
    observations: 'Operating parameters, cooling coil, and refrigerant pressure tested normal.',
    recommendations: 'Keep indoor air filters dust-free with bi-weekly cleaning.',
    customerAcknowledgement: 'Signed by facility manager.',
    technicianRemarks: 'System operating at peak energy efficiency.',
    checklistItems: {
      compressor: true,
      filter: true,
      coil: true,
      gasPressure: true,
      electrical: true,
      drainLine: true,
    },
    partsConsumed: [],
  });

  // Spare parts sub-row
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedPartQty, setSelectedPartQty] = useState(1);

  // Action status
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, isErr = false) => {
    setToastMessage({ text: msg, isError: isErr });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const formatRs = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `₹${Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Load Reference Masters
  const loadReferenceData = async () => {
    try {
      const [assetsRes, techRes, prodRes] = await Promise.all([
        assetApi.getAssets({ limit: '100' }).catch(() => ({ items: [] })),
        employeeApi.getTechnicians().catch(() => ({ data: [] })),
        productApi.getProducts().catch(() => ({ data: [] })),
      ]);

      setAssetsList(assetsRes.items || assetsRes.data || []);
      setTechniciansList(Array.isArray(techRes.data) ? techRes.data : techRes || []);
      setProductsList(Array.isArray(prodRes.data) ? prodRes.data : prodRes || []);
    } catch (e) {
      console.error('Error loading PM masters:', e);
    }
  };

  // Load PM Schedules and Stats
  const loadPmData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: String(page),
        limit: '20',
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (rangeFilter !== 'ALL') params.range = rangeFilter;

      const [listRes, statsRes] = await Promise.all([
        preventiveMaintenanceApi.getSchedules(params),
        preventiveMaintenanceApi.getStats(),
      ]);

      const items = listRes.items || listRes.data || (Array.isArray(listRes) ? listRes : []);
      setSchedules(items);
      setTotalPages(listRes.totalPages || 1);
      setStats(statsRes.data || statsRes);
    } catch (err) {
      console.error('Failed to load PM schedules:', err);
      setError('Unable to load maintenance visits. Please check the connection.');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, rangeFilter]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadPmData();
  }, [loadPmData]);

  // Open Complete Modal
  const handleOpenComplete = (pm) => {
    setSelectedPm(pm);
    setCompleteForm({
      completionDate: new Date().toISOString().split('T')[0],
      actualStartTime: '10:00 AM',
      actualEndTime: '11:30 AM',
      workPerformed: 'Routine PM service completed: filter washed, coil deep-cleaned, drain flushed, operating parameters checked.',
      observations: 'All test parameters within nominal specification.',
      recommendations: 'Regular monthly filter cleaning recommended.',
      customerAcknowledgement: 'Verified and signed on site.',
      technicianRemarks: 'System operating smoothly.',
      checklistItems: {
        compressor: true,
        filter: true,
        coil: true,
        gasPressure: true,
        electrical: true,
        drainLine: true,
      },
      partsConsumed: [],
    });
    setIsCompleteModalOpen(true);
  };

  // Open Assign Modal
  const handleOpenAssign = (pm) => {
    setSelectedPm(pm);
    setAssignForm({
      technicianId: pm.technicianId || '',
    });
    setIsAssignModalOpen(true);
  };

  // Add Part to Complete Form
  const handleAddPart = () => {
    if (!selectedPartId || selectedPartQty <= 0) return;
    const prod = productsList.find((p) => p.id === selectedPartId);
    if (!prod) return;

    // Check inventory stock
    const availableStock = prod.stockQuantity ?? 10;
    if (availableStock < selectedPartQty) {
      showToast(`Warning: Only ${availableStock} units in stock for ${prod.productName}`, true);
    }

    setCompleteForm((prev) => ({
      ...prev,
      partsConsumed: [
        ...prev.partsConsumed,
        {
          productId: prod.id,
          productName: prod.productName,
          sku: prod.sku,
          quantity: Number(selectedPartQty),
          unitCost: prod.purchasePrice || 0,
          total: Number(selectedPartQty) * (prod.purchasePrice || 0),
        },
      ],
    }));

    setSelectedPartId('');
    setSelectedPartQty(1);
  };

  // Remove Part
  const handleRemovePart = (index) => {
    setCompleteForm((prev) => ({
      ...prev,
      partsConsumed: prev.partsConsumed.filter((_, idx) => idx !== index),
    }));
  };

  // Submit Schedule Creation
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.assetId) {
      showToast('Please select an asset.', true);
      return;
    }
    setSubmitting(true);
    try {
      await preventiveMaintenanceApi.createSchedule(scheduleForm);
      showToast('Preventive maintenance visit scheduled successfully!');
      setIsScheduleModalOpen(false);
      setScheduleForm({
        assetId: '',
        plannedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        frequency: 'QUARTERLY',
        technicianId: '',
        remarks: '',
      });
      loadPmData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to schedule visit', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Assign Technician
  const handleAssignTechnician = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await preventiveMaintenanceApi.updateSchedule(selectedPm.id, {
        technicianId: assignForm.technicianId || undefined,
        status: assignForm.technicianId ? 'ASSIGNED' : 'SCHEDULED',
      });
      showToast('Technician assigned successfully!');
      setIsAssignModalOpen(false);
      loadPmData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to assign technician', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Visit Completion
  const handleCompleteVisit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const checklistArray = Object.entries(completeForm.checklistItems)
        .filter(([_, val]) => val)
        .map(([key]) => key);

      const payload = {
        completionDate: completeForm.completionDate,
        actualStartTime: completeForm.actualStartTime,
        actualEndTime: completeForm.actualEndTime,
        workPerformed: completeForm.workPerformed,
        observations: completeForm.observations,
        recommendations: completeForm.recommendations,
        customerAcknowledgement: completeForm.customerAcknowledgement,
        technicianRemarks: completeForm.technicianRemarks,
        checklist: JSON.stringify(checklistArray),
        partsConsumed: completeForm.partsConsumed.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
          unitCost: p.unitCost,
        })),
      };

      await preventiveMaintenanceApi.completeVisit(selectedPm.id, payload);
      showToast('Maintenance visit completed successfully! Inventory deducted.');
      setIsCompleteModalOpen(false);
      loadPmData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete maintenance visit', true);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"><Clock className="w-3 h-3 text-indigo-600" /> In Progress</span>;
      case 'ASSIGNED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">Assigned</span>;
      case 'SCHEDULED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Scheduled</span>;
      case 'MISSED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><AlertTriangle className="w-3 h-3 text-rose-600" /> Missed</span>;
      case 'CANCELLED':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Cancelled</span>;
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 transition ${
          toastMessage.isError
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toastMessage.isError ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          {toastMessage.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Preventive Maintenance</h1>
              <p className="text-xs text-slate-500">Service scheduling, technician checklist dispatch, completion reports, and spare part consumption.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => preventiveMaintenanceApi.downloadScheduleReportPdf({}, `PM_Schedule_${Date.now()}.pdf`)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100 transition shadow-sm"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            Export Schedule PDF
          </button>

          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule New PM
          </button>
        </div>
      </div>

      {/* 5-KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Today's Visits</span>
          <span className="text-2xl font-bold text-indigo-700 mt-1 block">{stats?.todaysVisits ?? '—'}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Upcoming (7 Days)</span>
          <span className="text-2xl font-bold text-sky-700 mt-1 block">{stats?.upcomingVisits ?? '—'}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Overdue Visits</span>
          <span className="text-2xl font-bold text-rose-600 mt-1 block">{stats?.overdueVisits ?? '—'}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Completed (Month)</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">{stats?.completedThisMonth ?? '—'}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Missed Visits</span>
          <span className="text-2xl font-bold text-slate-700 mt-1 block">{stats?.missedVisits ?? '—'}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PM #, Asset #, Customer, Technician, or AMC Contract..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={rangeFilter}
            onChange={(e) => { setRangeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Date: All Time</option>
            <option value="today">Today's Visits</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Status: All</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="MISSED">Missed</option>
          </select>

          <button
            onClick={loadPmData}
            title="Refresh"
            className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs font-medium">Loading preventive maintenance visits...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600 flex flex-col items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <p className="text-xs font-medium">{error}</p>
            <button onClick={loadPmData} className="px-3 py-1.5 bg-rose-100 text-rose-800 text-xs rounded-md">Retry</button>
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <CalendarClock className="w-8 h-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No maintenance schedules found</p>
            <p className="text-xs text-slate-400">Click "Schedule New PM" or generate PMs from active AMC contracts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">PM No</th>
                  <th className="py-3 px-4">Asset / Equipment</th>
                  <th className="py-3 px-4">Customer & Location</th>
                  <th className="py-3 px-4">AMC Reference</th>
                  <th className="py-3 px-4">Planned Date</th>
                  <th className="py-3 px-4">Assigned Tech</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {schedules.map((pm) => (
                  <tr key={pm.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {pm.pmNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{pm.asset?.assetNumber}</div>
                      <div className="text-[11px] text-slate-500">{pm.asset?.product?.productName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{pm.customer?.customerName}</div>
                      <div className="text-[11px] text-slate-500">{pm.asset?.location || pm.customer?.city}</div>
                    </td>
                    <td className="py-3 px-4">
                      {pm.amcContract ? (
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          {pm.amcContract.amcNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Direct Schedule</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <div className="font-medium">{new Date(pm.plannedDate).toLocaleDateString('en-GB')}</div>
                      {pm.completionDate && (
                        <div className="text-[10px] text-emerald-600">Done: {new Date(pm.completionDate).toLocaleDateString('en-GB')}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {pm.technician ? (
                        <span className="text-slate-900 font-medium">{pm.technician.fullName}</span>
                      ) : (
                        <button
                          onClick={() => handleOpenAssign(pm)}
                          className="text-xs text-indigo-600 font-semibold hover:underline"
                        >
                          + Assign Tech
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {renderStatusBadge(pm.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {pm.status !== 'COMPLETED' ? (
                          <>
                            <button
                              onClick={() => handleOpenAssign(pm)}
                              title="Assign / Reassign Technician"
                              className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition"
                            >
                              <User className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenComplete(pm)}
                              title="Complete Maintenance Visit"
                              className="px-2 py-1 rounded bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 transition shadow-sm"
                            >
                              Complete Visit
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => preventiveMaintenanceApi.downloadVisitPdf(pm.id, `PM_Visit_${pm.pmNumber}.pdf`)}
                            title="Download Service Visit Slip"
                            className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 transition"
                          >
                            <FileDown className="w-3.5 h-3.5" />
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

      {/* SCHEDULE PM MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-indigo-600" />
                Schedule Preventive Maintenance
              </h2>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="scheduleFormModal" onSubmit={handleCreateSchedule} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Installed Asset *</label>
                <select
                  required
                  value={scheduleForm.assetId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, assetId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Asset --</option>
                  {assetsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.assetNumber} - {a.customer?.customerName} ({a.product?.productName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Planned Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.plannedDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, plannedDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="BI_MONTHLY">BI_MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="HALF_YEARLY">HALF_YEARLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Technician (Optional)</label>
                <select
                  value={scheduleForm.technicianId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, technicianId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Unassigned (Assign Later) --</option>
                  {techniciansList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Visit Remarks</label>
                <textarea
                  rows={2}
                  value={scheduleForm.remarks}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, remarks: e.target.value })}
                  placeholder="Special instructions for the visit..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </form>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="scheduleFormModal"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Scheduling...' : 'Schedule Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN TECHNICIAN MODAL */}
      {isAssignModalOpen && selectedPm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <h2 className="text-sm font-bold text-slate-900">Assign Technician</h2>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignTechnician} className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">PM Visit:</span>
                <span className="font-bold text-slate-900 block">{selectedPm.pmNumber} ({selectedPm.asset?.assetNumber})</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Technician *</label>
                <select
                  required
                  value={assignForm.technicianId}
                  onChange={(e) => setAssignForm({ technicianId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Active Technician --</option>
                  {techniciansList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700"
                >
                  {submitting ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE VISIT MODAL */}
      {isCompleteModalOpen && selectedPm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Complete Maintenance Visit: {selectedPm.pmNumber}
              </h2>
              <button onClick={() => setIsCompleteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="completeFormModal" onSubmit={handleCompleteVisit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400 block">Asset Number:</span> <span className="font-bold text-slate-900">{selectedPm.asset?.assetNumber}</span></div>
                <div><span className="text-slate-400 block">Customer:</span> <span className="font-bold text-slate-900">{selectedPm.customer?.customerName}</span></div>
              </div>

              {/* Maintenance Inspection Checklist */}
              <div>
                <label className="block font-bold text-slate-900 mb-2">Service Inspection Checklist</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completeForm.checklistItems.compressor}
                      onChange={(e) => setCompleteForm({
                        ...completeForm,
                        checklistItems: { ...completeForm.checklistItems, compressor: e.target.checked },
                      })}
                      className="rounded text-emerald-600"
                    />
                    <span>Compressor Operating Amps</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completeForm.checklistItems.filter}
                      onChange={(e) => setCompleteForm({
                        ...completeForm,
                        checklistItems: { ...completeForm.checklistItems, filter: e.target.checked },
                      })}
                      className="rounded text-emerald-600"
                    />
                    <span>Air Filter Wash & Clean</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completeForm.checklistItems.coil}
                      onChange={(e) => setCompleteForm({
                        ...completeForm,
                        checklistItems: { ...completeForm.checklistItems, coil: e.target.checked },
                      })}
                      className="rounded text-emerald-600"
                    />
                    <span>Evaporator / Condenser Coil Wash</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completeForm.checklistItems.gasPressure}
                      onChange={(e) => setCompleteForm({
                        ...completeForm,
                        checklistItems: { ...completeForm.checklistItems, gasPressure: e.target.checked },
                      })}
                      className="rounded text-emerald-600"
                    />
                    <span>Refrigerant (PSI) Pressure Test</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completeForm.checklistItems.electrical}
                      onChange={(e) => setCompleteForm({
                        ...completeForm,
                        checklistItems: { ...completeForm.checklistItems, electrical: e.target.checked },
                      })}
                      className="rounded text-emerald-600"
                    />
                    <span>Electrical Terminals Tightening</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completeForm.checklistItems.drainLine}
                      onChange={(e) => setCompleteForm({
                        ...completeForm,
                        checklistItems: { ...completeForm.checklistItems, drainLine: e.target.checked },
                      })}
                      className="rounded text-emerald-600"
                    />
                    <span>Drainage Line Flush</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Performed *</label>
                <textarea
                  required
                  rows={2}
                  value={completeForm.workPerformed}
                  onChange={(e) => setCompleteForm({ ...completeForm, workPerformed: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observations & Measurements</label>
                <textarea
                  rows={2}
                  value={completeForm.observations}
                  onChange={(e) => setCompleteForm({ ...completeForm, observations: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Spare Parts Consumed Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block font-bold text-slate-900">Spare Parts Consumed (Deducts Inventory)</label>
                <div className="flex gap-2">
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="flex-1 p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">-- Select Consumed Spare Part --</option>
                    {productsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.productName} ({p.sku}) — Stock: {p.stockQuantity ?? 10}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={selectedPartQty}
                    onChange={(e) => setSelectedPartQty(e.target.value)}
                    className="w-20 p-2 border border-slate-300 rounded-lg text-center"
                  />
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="px-3 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900"
                  >
                    Add
                  </button>
                </div>

                {completeForm.partsConsumed.length > 0 && (
                  <div className="space-y-1.5 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {completeForm.partsConsumed.map((part, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-200 last:border-none">
                        <div>
                          <span className="font-semibold text-slate-900">{part.productName}</span>
                          <span className="text-slate-500 text-[11px] ml-2">Qty: {part.quantity} @ {formatRs(part.unitCost)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{formatRs(part.total)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePart(idx)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Acknowledgement</label>
                <input
                  type="text"
                  value={completeForm.customerAcknowledgement}
                  onChange={(e) => setCompleteForm({ ...completeForm, customerAcknowledgement: e.target.value })}
                  placeholder="e.g. Verified by Mr. Ramesh (Facility Manager)"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </form>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="completeFormModal"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Recording Visit...' : 'Complete & Record Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
