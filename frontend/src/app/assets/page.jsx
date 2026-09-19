'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Search,
  Plus,
  Filter,
  RefreshCw,
  FileDown,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  X,
  Package,
  CalendarClock,
  Activity,
  Boxes,
} from 'lucide-react';
import {
  assetApi,
  preventiveMaintenanceApi,
  customerApi,
  productApi,
  employeeApi,
} from '../../lib/api/client';

export default function AssetsPage() {
  // Main state
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [amcFilter, setAmcFilter] = useState('ALL');
  const [warrantyFilter, setWarrantyFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dropdown reference data
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [techniciansList, setTechniciansList] = useState([]);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSchedulePmModalOpen, setIsSchedulePmModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview'); // overview, warranty_amc, service_history, pm_schedules, parts

  // Form states
  const [createForm, setCreateForm] = useState({
    customerId: '',
    productId: '',
    brandName: '',
    modelNumber: '',
    serialNumber: '',
    capacitySpec: '1.5 Ton Split AC',
    installationDate: new Date().toISOString().split('T')[0],
    warrantyStartDate: new Date().toISOString().split('T')[0],
    warrantyEndDate: '',
    location: 'Main Office',
    siteAddress: '',
    floorArea: '',
    status: 'ACTIVE',
    amcStatus: 'NONE',
    technicianId: '',
    notes: '',
  });

  const [editForm, setEditForm] = useState({});
  const [schedulePmForm, setSchedulePmForm] = useState({
    plannedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    frequency: 'QUARTERLY',
    technicianId: '',
    remarks: '',
  });

  // Action status
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, isErr = false) => {
    setToastMessage({ text: msg, isError: isErr });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Format INR Currency
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
      const [custRes, prodRes, techRes] = await Promise.all([
        customerApi.getCustomers().catch(() => ({ data: [] })),
        productApi.getProducts().catch(() => ({ data: [] })),
        employeeApi.getTechnicians().catch(() => ({ data: [] })),
      ]);

      setCustomersList(Array.isArray(custRes.data) ? custRes.data : custRes || []);
      setProductsList(Array.isArray(prodRes.data) ? prodRes.data : prodRes || []);
      setTechniciansList(Array.isArray(techRes.data) ? techRes.data : techRes || []);
    } catch (e) {
      console.error('Error loading reference lists:', e);
    }
  };

  // Load Asset List and Stats
  const loadAssetsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: String(page),
        limit: '20',
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (amcFilter !== 'ALL') params.amcStatus = amcFilter;
      if (warrantyFilter !== 'ALL') params.warrantyStatus = warrantyFilter;

      const [listRes, statsRes] = await Promise.all([
        assetApi.getAssets(params),
        assetApi.getStats(),
      ]);

      const items = listRes.items || listRes.data || (Array.isArray(listRes) ? listRes : []);
      setAssets(items);
      setTotalPages(listRes.totalPages || 1);
      setStats(statsRes.data || statsRes);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Unable to load asset records. Please check the connection.');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, amcFilter, warrantyFilter]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadAssetsData();
  }, [loadAssetsData]);

  // Open Detail Drawer
  const handleOpenDetail = async (asset) => {
    try {
      const full = await assetApi.getAssetById(asset.id);
      setSelectedAsset(full.data || full);
      setDrawerTab('overview');
      setIsDetailDrawerOpen(true);
    } catch (err) {
      showToast('Failed to load asset details', true);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (asset) => {
    setSelectedAsset(asset);
    setEditForm({
      customerId: asset.customerId,
      productId: asset.productId,
      brandName: asset.brandName || '',
      modelNumber: asset.modelNumber || '',
      serialNumber: asset.serialNumber || '',
      capacitySpec: asset.capacitySpec || '',
      installationDate: asset.installationDate ? new Date(asset.installationDate).toISOString().split('T')[0] : '',
      warrantyStartDate: asset.warrantyStartDate ? new Date(asset.warrantyStartDate).toISOString().split('T')[0] : '',
      warrantyEndDate: asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : '',
      location: asset.location || '',
      siteAddress: asset.siteAddress || '',
      floorArea: asset.floorArea || '',
      status: asset.status || 'ACTIVE',
      amcStatus: asset.amcStatus || 'NONE',
      technicianId: asset.technicianId || '',
      notes: asset.notes || '',
    });
    setIsEditModalOpen(true);
  };

  // Open Schedule PM Modal
  const handleOpenSchedulePm = (asset) => {
    setSelectedAsset(asset);
    setSchedulePmForm({
      plannedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      frequency: 'QUARTERLY',
      technicianId: asset.technicianId || '',
      remarks: `Scheduled quarterly service for ${asset.assetNumber}`,
    });
    setIsSchedulePmModalOpen(true);
  };

  // Submit Create Asset
  const handleCreateAsset = async (e) => {
    e.preventDefault();
    if (!createForm.customerId || !createForm.productId) {
      showToast('Please select both Customer and Equipment Product.', true);
      return;
    }
    setSubmitting(true);
    try {
      await assetApi.createAsset(createForm);
      showToast('Asset registered successfully!');
      setIsCreateModalOpen(false);
      setCreateForm({
        customerId: '',
        productId: '',
        brandName: '',
        modelNumber: '',
        serialNumber: '',
        capacitySpec: '1.5 Ton Split AC',
        installationDate: new Date().toISOString().split('T')[0],
        warrantyStartDate: new Date().toISOString().split('T')[0],
        warrantyEndDate: '',
        location: 'Main Office',
        siteAddress: '',
        floorArea: '',
        status: 'ACTIVE',
        amcStatus: 'NONE',
        technicianId: '',
        notes: '',
      });
      loadAssetsData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to register asset', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Asset
  const handleEditAsset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await assetApi.updateAsset(selectedAsset.id, editForm);
      showToast('Asset details updated successfully!');
      setIsEditModalOpen(false);
      loadAssetsData();
      if (isDetailDrawerOpen) {
        handleOpenDetail(selectedAsset);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update asset', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Schedule PM
  const handleSchedulePm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await preventiveMaintenanceApi.createSchedule({
        assetId: selectedAsset.id,
        plannedDate: schedulePmForm.plannedDate,
        frequency: schedulePmForm.frequency,
        technicianId: schedulePmForm.technicianId || undefined,
        remarks: schedulePmForm.remarks,
      });
      showToast('Preventive maintenance visit scheduled successfully!');
      setIsSchedulePmModalOpen(false);
      loadAssetsData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to schedule PM', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>;
      case 'UNDER_SERVICE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Under Service</span>;
      case 'BREAKDOWN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Breakdown</span>;
      case 'REPLACED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Replaced</span>;
      case 'SCRAPPED':
      case 'INACTIVE':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Retired</span>;
    }
  };

  // AMC Badge Helper
  const renderAmcBadge = (amcStatus) => {
    switch (amcStatus) {
      case 'COVERED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"><ShieldCheck className="w-3 h-3 text-emerald-600" /> AMC Active</span>;
      case 'EXPIRING_SOON':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200"><ShieldAlert className="w-3 h-3 text-amber-600" /> Expiring Soon</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">AMC Expired</span>;
      case 'NONE':
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">No AMC</span>;
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
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Asset Management</h1>
              <p className="text-xs text-slate-500">Installed equipment register, warranty tracker, AMC coverage, and maintenance lifecycle.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => assetApi.downloadAssetRegisterPdf({}, `Asset_Register_${Date.now()}.pdf`)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100 transition shadow-sm"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            Export Register PDF
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Installed Asset
          </button>
        </div>
      </div>

      {/* Executive 8-KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Total Assets</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{stats?.totalAssets ?? '—'}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Active Units</span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">{stats?.activeAssets ?? '—'}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Under Service</span>
          <span className="text-xl font-bold text-amber-700 mt-1 block">{stats?.underService ?? '—'}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Warranty Exp 30d</span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">{stats?.warrantyExpiring ?? '—'}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">AMC Covered</span>
          <span className="text-xl font-bold text-emerald-800 mt-1 block">{stats?.amcCovered ?? '—'}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">AMC Expiring</span>
          <span className="text-xl font-bold text-amber-600 mt-1 block">{stats?.amcExpiring ?? '—'}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">PM Visits Due</span>
          <span className="text-xl font-bold text-indigo-700 mt-1 block">{stats?.pmDueCount ?? '—'}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Breakdowns Mo</span>
          <span className="text-xl font-bold text-rose-700 mt-1 block">{stats?.breakdownsThisMonth ?? '—'}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Asset #, Serial No, Customer Name, Model, or Product..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Status: All</option>
            <option value="ACTIVE">Active</option>
            <option value="UNDER_SERVICE">Under Service</option>
            <option value="BREAKDOWN">Breakdown</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SCRAPPED">Scrapped / Retired</option>
          </select>

          <select
            value={amcFilter}
            onChange={(e) => { setAmcFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">AMC: All</option>
            <option value="COVERED">Covered</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
            <option value="NONE">No AMC</option>
          </select>

          <select
            value={warrantyFilter}
            onChange={(e) => { setWarrantyFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Warranty: All</option>
            <option value="ACTIVE">Active Warranty</option>
            <option value="EXPIRING_30">Expiring in 30 Days</option>
            <option value="EXPIRING_60">Expiring in 60 Days</option>
            <option value="EXPIRED">Expired Warranty</option>
          </select>

          <button
            onClick={loadAssetsData}
            title="Refresh"
            className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Asset Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="text-xs font-medium">Loading installed asset register...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600 flex flex-col items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <p className="text-xs font-medium">{error}</p>
            <button onClick={loadAssetsData} className="px-3 py-1.5 bg-rose-100 text-rose-800 text-xs rounded-md">Retry</button>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <Package className="w-8 h-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No installed assets found</p>
            <p className="text-xs text-slate-400">Click "Add Installed Asset" to register equipment for a customer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Asset No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Product / Model</th>
                  <th className="py-3 px-4">Serial No</th>
                  <th className="py-3 px-4">Install Date</th>
                  <th className="py-3 px-4">Warranty</th>
                  <th className="py-3 px-4">AMC Coverage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {assets.map((ast) => (
                  <tr key={ast.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <button
                        onClick={() => handleOpenDetail(ast)}
                        className="text-emerald-700 hover:underline flex items-center gap-1.5"
                      >
                        {ast.assetNumber}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{ast.customer?.customerName || 'N/A'}</div>
                      <div className="text-[11px] text-slate-500">{ast.customer?.companyName || ast.customer?.customerCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{ast.product?.productName}</div>
                      <div className="text-[11px] text-slate-500">
                        {ast.brandName || ast.product?.brand?.brandName} / {ast.modelNumber || ast.product?.model}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {ast.serialNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {ast.installationDate ? new Date(ast.installationDate).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {ast.warrantyEndDate ? (
                        <div>
                          <span className="text-[11px] block">{new Date(ast.warrantyEndDate).toLocaleDateString('en-GB')}</span>
                          {new Date(ast.warrantyEndDate) < new Date() ? (
                            <span className="text-[10px] text-rose-600 font-medium">Expired</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">Covered</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {renderAmcBadge(ast.amcStatus)}
                    </td>
                    <td className="py-3 px-4">
                      {renderStatusBadge(ast.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(ast)}
                          title="View Detail Drawer"
                          className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(ast)}
                          title="Edit Asset"
                          className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenSchedulePm(ast)}
                          title="Schedule Maintenance Visit"
                          className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => assetApi.downloadAssetCardPdf(ast.id, `Asset_${ast.assetNumber}.pdf`)}
                          title="Download Equipment Card PDF"
                          className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 transition"
                        >
                          <FileDown className="w-3.5 h-3.5" />
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

      {/* CREATE ASSET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Register New Installed Asset
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="createAssetForm" onSubmit={handleCreateAsset} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer / Client *</label>
                  <select
                    required
                    value={createForm.customerId}
                    onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Customer --</option>
                    {customersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerName} {c.companyName ? `(${c.companyName})` : ''} - {c.customerCode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Catalog *</label>
                  <select
                    required
                    value={createForm.productId}
                    onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Product --</option>
                    {productsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.productName} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    placeholder="Panasonic, Daikin, Blue Star..."
                    value={createForm.brandName}
                    onChange={(e) => setCreateForm({ ...createForm, brandName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Model Number</label>
                  <input
                    type="text"
                    placeholder="CS-KN18WKY-1"
                    value={createForm.modelNumber}
                    onChange={(e) => setCreateForm({ ...createForm, modelNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serial Number (Unique)</label>
                  <input
                    type="text"
                    placeholder="SN-2026-XXXX"
                    value={createForm.serialNumber}
                    onChange={(e) => setCreateForm({ ...createForm, serialNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity / Specification</label>
                  <input
                    type="text"
                    placeholder="1.5 Ton Split Inverter"
                    value={createForm.capacitySpec}
                    onChange={(e) => setCreateForm({ ...createForm, capacitySpec: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Installation Date</label>
                  <input
                    type="date"
                    value={createForm.installationDate}
                    onChange={(e) => setCreateForm({ ...createForm, installationDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Warranty End Date</label>
                  <input
                    type="date"
                    value={createForm.warrantyEndDate}
                    onChange={(e) => setCreateForm({ ...createForm, warrantyEndDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floor / Room Location</label>
                  <input
                    type="text"
                    placeholder="Server Room, 2nd Floor"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Technician</label>
                  <select
                    value={createForm.technicianId}
                    onChange={(e) => setCreateForm({ ...createForm, technicianId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {techniciansList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Site Address</label>
                <input
                  type="text"
                  placeholder="Installation physical site address..."
                  value={createForm.siteAddress}
                  onChange={(e) => setCreateForm({ ...createForm, siteAddress: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asset Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UNDER_SERVICE">UNDER_SERVICE</option>
                  <option value="BREAKDOWN">BREAKDOWN</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Commissioning Remarks</label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Additional equipment notes..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </form>

            {/* Fixed Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="createAssetForm"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Registering...' : 'Register Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ASSET MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                Edit Asset: {selectedAsset?.assetNumber}
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="editAssetForm" onSubmit={handleEditAsset} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={editForm.brandName || ''}
                    onChange={(e) => setEditForm({ ...editForm, brandName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Model Number</label>
                  <input
                    type="text"
                    value={editForm.modelNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, modelNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={editForm.serialNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity Spec</label>
                  <input
                    type="text"
                    value={editForm.capacitySpec || ''}
                    onChange={(e) => setEditForm({ ...editForm, capacitySpec: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editForm.status || 'ACTIVE'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="UNDER_SERVICE">UNDER_SERVICE</option>
                    <option value="BREAKDOWN">BREAKDOWN</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="REPLACED">REPLACED</option>
                    <option value="SCRAPPED">SCRAPPED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">AMC Status</label>
                  <select
                    value={editForm.amcStatus || 'NONE'}
                    onChange={(e) => setEditForm({ ...editForm, amcStatus: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="NONE">NONE</option>
                    <option value="COVERED">COVERED</option>
                    <option value="EXPIRING_SOON">EXPIRING_SOON</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Warranty End Date</label>
                  <input
                    type="date"
                    value={editForm.warrantyEndDate || ''}
                    onChange={(e) => setEditForm({ ...editForm, warrantyEndDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Technician</label>
                  <select
                    value={editForm.technicianId || ''}
                    onChange={(e) => setEditForm({ ...editForm, technicianId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {techniciansList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location / Floor</label>
                <input
                  type="text"
                  value={editForm.location || ''}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </form>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="editAssetForm"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE PM MODAL */}
      {isSchedulePmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-indigo-600" />
                Schedule PM: {selectedAsset?.assetNumber}
              </h2>
              <button onClick={() => setIsSchedulePmModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="schedulePmForm" onSubmit={handleSchedulePm} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Planned Visit Date *</label>
                <input
                  type="date"
                  required
                  value={schedulePmForm.plannedDate}
                  onChange={(e) => setSchedulePmForm({ ...schedulePmForm, plannedDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Frequency</label>
                <select
                  value={schedulePmForm.frequency}
                  onChange={(e) => setSchedulePmForm({ ...schedulePmForm, frequency: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="BI_MONTHLY">BI_MONTHLY</option>
                  <option value="QUARTERLY">QUARTERLY</option>
                  <option value="HALF_YEARLY">HALF_YEARLY</option>
                  <option value="ANNUAL">ANNUAL</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Technician</label>
                <select
                  value={schedulePmForm.technicianId}
                  onChange={(e) => setSchedulePmForm({ ...schedulePmForm, technicianId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Technician --</option>
                  {techniciansList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Visit Remarks / Checklist Notes</label>
                <textarea
                  rows={2}
                  value={schedulePmForm.remarks}
                  onChange={(e) => setSchedulePmForm({ ...schedulePmForm, remarks: e.target.value })}
                  placeholder="Special instructions..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </form>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsSchedulePmModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="schedulePmForm"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Scheduling...' : 'Schedule Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSET DETAIL DRAWER */}
      {isDetailDrawerOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-900">{selectedAsset.assetNumber}</span>
                  {renderStatusBadge(selectedAsset.status)}
                  {renderAmcBadge(selectedAsset.amcStatus)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{selectedAsset.product?.productName} ({selectedAsset.modelNumber})</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => assetApi.downloadAssetCardPdf(selectedAsset.id, `Asset_${selectedAsset.assetNumber}.pdf`)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  PDF Card
                </button>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-5 text-xs font-semibold text-slate-600 gap-6 flex-shrink-0">
              <button
                onClick={() => setDrawerTab('overview')}
                className={`py-3 border-b-2 transition ${
                  drawerTab === 'overview' ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-900'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setDrawerTab('warranty_amc')}
                className={`py-3 border-b-2 transition ${
                  drawerTab === 'warranty_amc' ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-900'
                }`}
              >
                Warranty & AMC
              </button>
              <button
                onClick={() => setDrawerTab('service_history')}
                className={`py-3 border-b-2 transition ${
                  drawerTab === 'service_history' ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-900'
                }`}
              >
                Service History ({selectedAsset.serviceHistories?.length || 0})
              </button>
              <button
                onClick={() => setDrawerTab('pm_schedules')}
                className={`py-3 border-b-2 transition ${
                  drawerTab === 'pm_schedules' ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-900'
                }`}
              >
                Preventive PM ({selectedAsset.pmSchedules?.length || 0})
              </button>
              <button
                onClick={() => setDrawerTab('parts')}
                className={`py-3 border-b-2 transition ${
                  drawerTab === 'parts' ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-900'
                }`}
              >
                Parts Consumed ({selectedAsset.partsConsumed?.length || 0})
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-700">
              {drawerTab === 'overview' && (
                <div className="space-y-5">
                  {/* Equipment Spec Grid */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-600" />
                      Equipment Specifications
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><span className="text-slate-400 block">Product:</span> <span className="font-semibold text-slate-800">{selectedAsset.product?.productName}</span></div>
                      <div><span className="text-slate-400 block">Brand / Model:</span> <span className="font-semibold text-slate-800">{selectedAsset.brandName} / {selectedAsset.modelNumber}</span></div>
                      <div><span className="text-slate-400 block">Serial Number:</span> <span className="font-mono font-semibold text-slate-800">{selectedAsset.serialNumber || '—'}</span></div>
                      <div><span className="text-slate-400 block">Capacity / Spec:</span> <span className="font-semibold text-slate-800">{selectedAsset.capacitySpec || 'Standard'}</span></div>
                      <div><span className="text-slate-400 block">Installation Date:</span> <span className="font-semibold text-slate-800">{selectedAsset.installationDate ? new Date(selectedAsset.installationDate).toLocaleDateString('en-GB') : '—'}</span></div>
                      <div><span className="text-slate-400 block">Assigned Tech:</span> <span className="font-semibold text-slate-800">{selectedAsset.technician?.fullName || 'Unassigned'}</span></div>
                    </div>
                  </div>

                  {/* Customer & Location */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      Customer & Facility Location
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><span className="text-slate-400 block">Customer Name:</span> <span className="font-semibold text-slate-800">{selectedAsset.customer?.customerName}</span></div>
                      <div><span className="text-slate-400 block">Company / Code:</span> <span className="font-semibold text-slate-800">{selectedAsset.customer?.companyName || selectedAsset.customer?.customerCode}</span></div>
                      <div><span className="text-slate-400 block">Contact Phone:</span> <span className="font-semibold text-slate-800">{selectedAsset.customer?.mobile}</span></div>
                      <div><span className="text-slate-400 block">Floor / Area:</span> <span className="font-semibold text-slate-800">{selectedAsset.location || 'Main Office'}</span></div>
                      <div className="col-span-2"><span className="text-slate-400 block">Site Address:</span> <span className="font-semibold text-slate-800">{selectedAsset.siteAddress || selectedAsset.customer?.address}</span></div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedAsset.notes && (
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-xs">
                      <span className="font-bold block mb-1">Commissioning Notes:</span>
                      {selectedAsset.notes}
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'warranty_amc' && (
                <div className="space-y-4">
                  {/* Warranty Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs">Manufacturer Warranty Status</h4>
                    <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                      <div><span className="text-slate-400 block">Start Date:</span> <span className="font-semibold">{selectedAsset.warrantyStartDate ? new Date(selectedAsset.warrantyStartDate).toLocaleDateString('en-GB') : '—'}</span></div>
                      <div><span className="text-slate-400 block">End Date:</span> <span className="font-semibold">{selectedAsset.warrantyEndDate ? new Date(selectedAsset.warrantyEndDate).toLocaleDateString('en-GB') : '—'}</span></div>
                    </div>
                  </div>

                  {/* AMC Coverage Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs">Annual Maintenance Contract (AMC)</h4>
                    {selectedAsset.amcContractAssets && selectedAsset.amcContractAssets.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {selectedAsset.amcContractAssets.map((ca) => (
                          <div key={ca.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-900 block">{ca.amcContract?.amcNumber}</span>
                              <span className="text-slate-500 text-[11px]">
                                {new Date(ca.amcContract?.startDate).toLocaleDateString('en-GB')} to {new Date(ca.amcContract?.endDate).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {ca.amcContract?.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 mt-2">No active AMC contract linked to this equipment.</p>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'service_history' && (
                <div className="space-y-3">
                  {(!selectedAsset.serviceHistories || selectedAsset.serviceHistories.length === 0) ? (
                    <p className="text-center text-slate-400 py-8">No service history recorded for this equipment.</p>
                  ) : (
                    selectedAsset.serviceHistories.map((hist) => (
                      <div key={hist.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{hist.serviceType}</span>
                          <span className="text-[11px] text-slate-500">{new Date(hist.serviceDate).toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="text-xs text-slate-700 font-medium">{hist.workDone || hist.resolution || hist.complaint}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                          <span>Tech: {hist.technician?.fullName || 'Service Team'}</span>
                          <span>Cost: {formatRs(hist.cost || 0)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {drawerTab === 'pm_schedules' && (
                <div className="space-y-3">
                  {(!selectedAsset.pmSchedules || selectedAsset.pmSchedules.length === 0) ? (
                    <p className="text-center text-slate-400 py-8">No preventive maintenance schedules assigned.</p>
                  ) : (
                    selectedAsset.pmSchedules.map((pm) => (
                      <div key={pm.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{pm.pmNumber} ({pm.frequency})</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">{pm.status}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Planned: {new Date(pm.plannedDate).toLocaleDateString('en-GB')} {pm.completionDate ? `| Completed: ${new Date(pm.completionDate).toLocaleDateString('en-GB')}` : ''}
                        </div>
                        {pm.workPerformed && (
                          <div className="text-xs text-slate-700 mt-1 bg-white p-2 rounded border border-slate-200">
                            {pm.workPerformed}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {drawerTab === 'parts' && (
                <div className="space-y-3">
                  {(!selectedAsset.partsConsumed || selectedAsset.partsConsumed.length === 0) ? (
                    <p className="text-center text-slate-400 py-8">No spare parts or consumables consumed.</p>
                  ) : (
                    selectedAsset.partsConsumed.map((pc) => (
                      <div key={pc.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-900 block">{pc.product?.productName}</span>
                          <span className="text-[11px] text-slate-500">Qty: {pc.quantity} | Date: {new Date(pc.consumedAt).toLocaleDateString('en-GB')}</span>
                        </div>
                        <span className="font-bold text-slate-900">{formatRs(pc.totalCost || 0)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
