'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  CalendarClock,
  ShieldCheck,
  Truck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Download,
  Search,
  ExternalLink,
  Wrench,
  Activity,
  Calendar,
  Building,
  Tag,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  assetApi,
  preventiveMaintenanceApi,
  amcManagementApi,
} from '../../lib/api/client';

export default function Phase15OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Stats State
  const [assetStats, setAssetStats] = useState({
    totalAssets: 0,
    activeAssets: 0,
    underService: 0,
    breakdownCount: 0,
    warrantyExpiring: 0,
    amcCovered: 0,
    amcExpiring: 0,
  });

  const [warrantyAnalysis, setWarrantyAnalysis] = useState({
    activeCount: 0,
    expiring30Count: 0,
    expiring60Count: 0,
    expiredCount: 0,
    noWarrantyCount: 0,
  });

  const [amcStats, setAmcStats] = useState({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    totalVisits: 0,
    completedVisits: 0,
    remainingVisits: 0,
    totalContractValue: 0,
    billedValue: 0,
    collectedValue: 0,
    pendingBilling: 0,
    outstandingReceivables: 0,
  });

  const [pmStats, setPmStats] = useState({
    todaysVisits: 0,
    upcomingVisits: 0,
    overdueVisits: 0,
    completedThisMonth: 0,
    missedVisits: 0,
    totalCount: 0,
  });

  // Recent data feeds
  const [recentAssets, setRecentAssets] = useState([]);
  const [upcomingPmVisits, setUpcomingPmVisits] = useState([]);
  const [activeContracts, setActiveContracts] = useState([]);

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      const [
        aStatsRes,
        wStatsRes,
        amcStatsRes,
        pmStatsRes,
        assetsListRes,
        pmListRes,
        amcListRes,
      ] = await Promise.allSettled([
        assetApi.getStats(),
        assetApi.getWarrantyAnalysis(),
        amcManagementApi.getStats(),
        preventiveMaintenanceApi.getStats(),
        assetApi.getAssets({ limit: 6 }),
        preventiveMaintenanceApi.getSchedules({ status: 'SCHEDULED', limit: 6 }),
        amcManagementApi.getContracts({ status: 'Active', limit: 6 }),
      ]);

      if (aStatsRes.status === 'fulfilled' && aStatsRes.value?.data) {
        setAssetStats(aStatsRes.value.data);
      }
      if (wStatsRes.status === 'fulfilled' && wStatsRes.value?.data) {
        setWarrantyAnalysis(wStatsRes.value.data);
      }
      if (amcStatsRes.status === 'fulfilled' && amcStatsRes.value?.data) {
        setAmcStats(amcStatsRes.value.data);
      }
      if (pmStatsRes.status === 'fulfilled' && pmStatsRes.value?.data) {
        setPmStats(pmStatsRes.value.data);
      }

      if (assetsListRes.status === 'fulfilled' && assetsListRes.value?.items) {
        setRecentAssets(assetsListRes.value.items);
      }
      if (pmListRes.status === 'fulfilled' && pmListRes.value?.items) {
        setUpcomingPmVisits(pmListRes.value.items);
      }
      if (amcListRes.status === 'fulfilled' && amcListRes.value?.items) {
        setActiveContracts(amcListRes.value.items);
      }
    } catch (error) {
      console.error('Failed to load Phase 15 overview data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-dark via-brand to-slate-900 rounded-xl p-6 text-white shadow-md border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-white/5 skew-x-12 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-brand-accent text-brand font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> Enterprise Operations
              </span>
              <span className="text-xs text-white/70 font-medium">Production-Ready Operations Suite</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Asset Management, AMC Billing & Preventive Maintenance
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-2xl">
              Centralized command center unifying installed customer equipment, multi-asset AMC coverage, periodic billing schedules with 1-click Phase 5 GST invoices, and atomic inventory-backed PM visits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              onClick={loadAllData}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1.5 border border-white/20 backdrop-blur-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
            <Link
              href="/assets"
              className="bg-white text-brand hover:bg-slate-100 text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              Open Asset Register
            </Link>
          </div>
        </div>
      </div>

      {/* 8 Essential Phase 15 KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Assets */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Assets</span>
            <Layers className="w-4 h-4 text-brand" />
          </div>
          <div className="text-xl font-bold text-gray-900 mt-2">
            {loading ? '...' : assetStats.totalAssets}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{assetStats.activeAssets} Active</span>
          </div>
        </div>

        {/* In Warranty */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">In Warranty</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-2">
            {loading ? '...' : (warrantyAnalysis.activeCount || assetStats.activeAssets || 0)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">OEM Active</div>
        </div>

        {/* Warranty Expiring */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Expiry (60d)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 mt-2">
            {loading ? '...' : (warrantyAnalysis.expiring60Count || assetStats.warrantyExpiring || 0)}
          </div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">Needs AMC</div>
        </div>

        {/* Active AMC Contracts */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Active AMCs</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-700 mt-2">
            {loading ? '...' : amcStats.active}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">{assetStats.amcCovered || 0} Units Covered</div>
        </div>

        {/* Total AMC Contract Value */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">AMC Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-gray-900 mt-2 truncate" title={formatCurrency(amcStats.totalContractValue)}>
            {loading ? '...' : formatCurrency(amcStats.totalContractValue)}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 truncate">
            {formatCurrency(amcStats.billedValue)} Billed
          </div>
        </div>

        {/* Upcoming PM Visits */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Upcoming PM</span>
            <CalendarClock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-600 mt-2">
            {loading ? '...' : pmStats.upcomingVisits}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">{pmStats.todaysVisits || 0} Scheduled Today</div>
        </div>

        {/* Overdue PM Visits */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Overdue PM</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 mt-2">
            {loading ? '...' : pmStats.overdueVisits}
          </div>
          <div className="text-[10px] text-rose-500/80 mt-0.5">High Priority</div>
        </div>

        {/* Completed PMs This Month */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Completed</span>
            <TrendingUp className="w-4 h-4 text-brand" />
          </div>
          <div className="text-xl font-bold text-brand mt-2">
            {loading ? '...' : pmStats.completedThisMonth}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">This Month</div>
        </div>
      </div>

      {/* 4 Primary Navigation Cards (Interactive Hub) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Asset Management */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-brand/40 transition group flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-brand flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 group-hover:text-brand transition">
              Asset Management & Cards
            </h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              Full lifecycle tracking for installed equipment with auto-numbering (AST-YYYY-XXXX), serial check, warranty calculations, and printable PDF cards.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">{assetStats.totalAssets} Registered</span>
            <Link
              href="/assets"
              className="text-xs font-bold text-brand hover:text-brand-dark flex items-center gap-1 group-hover:translate-x-0.5 transition"
            >
              Open Module <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Preventive Maintenance */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-400 transition group flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <CalendarClock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition">
              Preventive Maintenance Tracker
            </h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              Auto-generate PMs from AMC contracts, assign field technicians, complete visits with checklist, and atomically deduct spare parts from inventory.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">{pmStats.upcomingVisits} Scheduled</span>
            <Link
              href="/preventive-maintenance"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group-hover:translate-x-0.5 transition"
            >
              Open Module <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: AMC Contract Billing */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-purple-400 transition group flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 group-hover:text-purple-600 transition">
              AMC Contract Billing & Tracker
            </h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              Multi-asset coverage, quarterly & monthly billing schedules, 1-click Phase 5 GST invoice generation (FT/YYYY/XXXX), and annual renewals.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">{amcStats.active} Active Contracts</span>
            <Link
              href="/amc"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 group-hover:translate-x-0.5 transition"
            >
              Open Module <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Field Installations */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-amber-400 transition group flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 group-hover:text-amber-600 transition">
              Equipment Installations
            </h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              Field commissioning workflows, customer site sign-offs, and initial commissioning logs linked directly into Asset history.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Field Operations</span>
            <Link
              href="/installations"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 group-hover:translate-x-0.5 transition"
            >
              Open Module <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* PDF Export Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900">Official Master PDF Reports</div>
            <div className="text-[11px] text-gray-500">Generate formatted A4 audit documents streaming directly from the backend PDF engine.</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => assetApi.downloadRegisterPdf()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-md transition flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Asset Register PDF
          </button>
          <button
            onClick={() => preventiveMaintenanceApi.downloadSchedulePdf()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-md transition flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            PM Schedule PDF
          </button>
          <button
            onClick={() => amcManagementApi.downloadRevenueReportPdf()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-md transition flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            AMC Revenue PDF
          </button>
        </div>
      </div>

      {/* Two Column Grid: Recent Assets & Upcoming PM Schedules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Assets Register */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand" />
              <h3 className="font-bold text-sm text-gray-900">Installed Asset Register</h3>
            </div>
            <Link
              href="/assets"
              className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
            >
              View All ({assetStats.totalAssets}) <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Loading installed assets...</div>
            ) : recentAssets.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">No assets registered yet.</div>
            ) : (
              <div className="space-y-3">
                {recentAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50/50 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 font-mono">{asset.assetNumber}</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-medium text-gray-700 truncate">{asset.customer?.companyName || asset.customer?.customerName}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {asset.brandName} {asset.modelNumber} {asset.serialNumber ? `(SN: ${asset.serialNumber})` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          asset.warrantyStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : asset.warrantyStatus === 'EXPIRING_30' || asset.warrantyStatus === 'EXPIRING_60'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {asset.warrantyStatus || 'ACTIVE'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          asset.amcStatus === 'COVERED'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {asset.amcStatus === 'COVERED' ? 'AMC COVERED' : 'NO AMC'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Preventive Maintenance */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-gray-900">Upcoming PM Schedules</h3>
            </div>
            <Link
              href="/preventive-maintenance"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              View Schedule ({pmStats.upcomingVisits}) <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Loading PM visits...</div>
            ) : upcomingPmVisits.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">No scheduled visits pending.</div>
            ) : (
              <div className="space-y-3">
                {upcomingPmVisits.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-700 font-mono">{pm.pmNumber}</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-semibold text-gray-900">{formatDate(pm.plannedDate)}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {pm.customer?.companyName || pm.customer?.customerName} • Asset: {pm.asset?.assetNumber || 'Generic Unit'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-gray-600 font-medium bg-gray-100 px-2 py-0.5 rounded">
                        {pm.technician?.name || 'Unassigned'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {pm.frequency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
