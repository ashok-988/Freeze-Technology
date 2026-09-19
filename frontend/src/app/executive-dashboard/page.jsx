'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  AlertCircle,
  FileText,
  Download,
  RefreshCw,
  Calendar,
  Layers,
  Wrench,
  ShieldCheck,
  CalendarClock,
  Boxes,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  BarChart3,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { executiveDashboardApi } from '@/lib/api/client';

export default function ExecutiveDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState(null);

  // Date Filter State
  const [period, setPeriod] = useState('current_fy');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = { period };
      if (period === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const response = await executiveDashboardApi.getDashboardData(params);
      setData(response);
    } catch (err) {
      console.error('Failed to load executive dashboard:', err);
      setError('Failed to load executive intelligence data. Please verify network and backend services.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      const params = { period };
      if (period === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const blob = await executiveDashboardApi.downloadPdf(params);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Executive_Management_Report_${period}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Could not generate Executive PDF report. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const formatINR = (val) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  };

  const kpis = data?.kpis || {};
  const rev = kpis.revenue || {};
  const col = kpis.collections || {};
  const rec = kpis.receivables || {};
  const pay = kpis.payables || {};
  const exp = kpis.expenses || {};
  const payr = kpis.payroll || {};
  const inv = kpis.inventory || {};
  const gst = kpis.gst || {};
  const prof = kpis.profitability || {};
  const srv = kpis.services || {};
  const amc = kpis.amc || {};
  const pm = kpis.preventiveMaintenance || {};
  const ast = kpis.assets || {};
  const proc = kpis.procurement || {};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header & Executive Controls */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live BI Feed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Authoritative Management Control Center & Real-time Operations Intelligence
                {data?.lastRefreshed && ` • Refreshed ${new Date(data.lastRefreshed).toLocaleTimeString()}`}
              </p>
            </div>

            {/* Filter Bar & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="bg-transparent border-none text-slate-700 font-medium focus:ring-0 cursor-pointer py-1 pl-1 pr-6"
                >
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="current_fy">Current FY (2026-27)</option>
                  <option value="previous_fy">Previous FY (2025-26)</option>
                  <option value="custom">Custom Date Range</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              {period === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs px-2 py-1 bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs px-2 py-1 bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}

              <button
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
                Refresh
              </button>

              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                {exportingPdf ? 'Generating PDF...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={() => loadDashboard()}
              className="px-3 py-1 bg-rose-600 text-white text-xs font-semibold rounded-md hover:bg-rose-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 p-4">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
                <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <>
            {/* ROW 1: PRIMARY FINANCIAL & OPERATIONAL KPIS */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Key Financial Telemetry ({data?.dateRange?.label || 'Current Period'})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Gross Revenue */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Gross Sales Revenue</span>
                    <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <DollarSign className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">
                    {formatINR(rev.grossSales)}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span>{rev.invoiceCount || 0} Invoices</span>
                    {rev.growthVsPrevious !== 0 && (
                      <span className={`inline-flex items-center font-medium ${rev.growthVsPrevious > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {rev.growthVsPrevious > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(rev.growthVsPrevious)}% vs prev
                      </span>
                    )}
                  </div>
                </div>

                {/* Collections */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Total Collections</span>
                    <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <CreditCard className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">
                    {formatINR(col.totalCollections)}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                    <span>{col.paymentCount || 0} Receipts</span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {col.collectionRate || 0}% Realized
                    </span>
                  </div>
                </div>

                {/* Customer Receivables */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Customer Receivables</span>
                    <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">
                    {formatINR(rec.totalReceivables)}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-slate-500">{rec.unpaidInvoicesCount || 0} Pending</span>
                    <span className="text-rose-600 font-medium">
                      Overdue: {formatINR(rec.overdueReceivables)}
                    </span>
                  </div>
                </div>

                {/* Vendor Payables */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Vendor Payables</span>
                    <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                      <Building2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">
                    {formatINR(pay.totalPayables)}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-slate-500">{pay.unpaidBillsCount || 0} Bills</span>
                    <span className="text-rose-600 font-medium">
                      Overdue: {formatINR(pay.overduePayables)}
                    </span>
                  </div>
                </div>

                {/* Operating Expenses */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Operating Expenses</span>
                    <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                      <TrendingDown className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">
                    {formatINR(exp.totalExpenses)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {exp.expenseCount || 0} Expense Records
                  </div>
                </div>

                {/* Payroll Cost */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Payroll Cost</span>
                    <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Users className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">
                    {formatINR(payr.totalGrossPayroll)}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                    <span>{payr.employeeCount || 0} Active Staff</span>
                    <span className="text-slate-700 font-medium">{payr.payrollPercentOfRevenue || 0}% of Rev</span>
                  </div>
                </div>

                {/* Inventory Stock Valuation */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Inventory Valuation</span>
                    <span className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                      <Boxes className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">
                    {formatINR(inv.totalStockValuation)}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-slate-500">{inv.totalSKUs || 0} SKUs</span>
                    {(inv.lowStockCount > 0 || inv.outOfStockCount > 0) && (
                      <span className="text-amber-600 font-semibold">
                        {inv.lowStockCount + inv.outOfStockCount} Low/Out
                      </span>
                    )}
                  </div>
                </div>

                {/* GST Tax Summary */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Est. Net GST Liability</span>
                    <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">
                    {formatINR(gst.netGSTLiability)}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                    <span>Out: {formatINR(gst.outputGST)}</span>
                    <span>In: {formatINR(gst.inputGST)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: MANAGEMENT PROFITABILITY STATEMENT */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Executive Profitability Waterfall ({data?.dateRange?.label})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Live Transaction Aggregation
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center text-center md:text-left">
                {/* Gross Revenue */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">1. Gross Revenue</span>
                  <span className="text-base font-bold text-slate-900 block mt-1">{formatINR(prof.grossRevenue)}</span>
                  <span className="text-[10px] text-slate-400">Total Billed</span>
                </div>

                {/* Direct Purchases / COGS */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">2. Direct COGS</span>
                  <span className="text-base font-bold text-rose-600 block mt-1">- {formatINR(prof.directPurchasesCOGS)}</span>
                  <span className="text-[10px] text-slate-400">Vendor Purchases</span>
                </div>

                {/* Gross Margin */}
                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block">3. Gross Margin</span>
                  <span className="text-base font-bold text-emerald-900 block mt-1">{formatINR(prof.grossMargin)}</span>
                  <span className="text-[10px] font-semibold text-emerald-700">{prof.grossMarginPercent || 0}% Gross Margin</span>
                </div>

                {/* OpEx & Payroll */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">4. OpEx & Payroll</span>
                  <span className="text-base font-bold text-rose-600 block mt-1">
                    - {formatINR((prof.operatingExpenses || 0) + (prof.payrollCost || 0))}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Exp: {formatINR(prof.operatingExpenses)} | Payr: {formatINR(prof.payrollCost)}
                  </span>
                </div>

                {/* Net Operating Result */}
                <div className={`p-3 rounded-lg border ${prof.netOperatingResult >= 0 ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900' : 'bg-rose-100/80 border-rose-300 text-rose-900'}`}>
                  <span className="text-[11px] font-bold uppercase block">5. Net Operating Result</span>
                  <span className="text-base font-bold block mt-1">{formatINR(prof.netOperatingResult)}</span>
                  <span className="text-[10px] font-semibold">
                    {prof.operatingMarginPercent || 0}% Operating Margin
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 3: 12-MONTH HISTORICAL TRENDS */}
            {data?.trends && data.trends.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      12-Month Performance Trends
                    </h3>
                    <p className="text-xs text-slate-500">Monthly Revenue vs Collections & Expenses</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Revenue
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Collections
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Expenses
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-2">
                  {data.trends.map((t, idx) => {
                    const maxVal = Math.max(...data.trends.map((x) => Math.max(x.revenue, x.collections, x.expense)), 1000);
                    const revHeight = Math.min(100, Math.max(8, (t.revenue / maxVal) * 100));
                    const colHeight = Math.min(100, Math.max(8, (t.collections / maxVal) * 100));

                    return (
                      <div key={idx} className="flex flex-col items-center group">
                        <div className="h-28 w-full flex items-end justify-center gap-1 pb-1">
                          <div
                            style={{ height: `${revHeight}%` }}
                            className="w-2.5 bg-emerald-500 rounded-t group-hover:bg-emerald-600 transition"
                            title={`Revenue: ${formatINR(t.revenue)}`}
                          ></div>
                          <div
                            style={{ height: `${colHeight}%` }}
                            className="w-2.5 bg-blue-500 rounded-t group-hover:bg-blue-600 transition"
                            title={`Collections: ${formatINR(t.collections)}`}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium truncate w-full text-center">
                          {t.month}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {t.revenue > 0 ? `₹${(t.revenue / 1000).toFixed(0)}k` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ROW 4: WORKING CAPITAL & AGING ANALYSIS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Receivables Aging */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Customer Receivables Aging
                  </h3>
                  <span className="text-xs font-bold text-rose-600">
                    Total: {formatINR(rec.totalReceivables)}
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Current (Not Due)', val: rec.aging?.current, color: 'bg-emerald-500' },
                    { label: '1 - 30 Days Overdue', val: rec.aging?.days1To30, color: 'bg-amber-400' },
                    { label: '31 - 60 Days Overdue', val: rec.aging?.days31To60, color: 'bg-orange-500' },
                    { label: '61 - 90 Days Overdue', val: rec.aging?.days61To90, color: 'bg-rose-500' },
                    { label: '90+ Days Overdue', val: rec.aging?.days90Plus, color: 'bg-rose-700' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                      <span className="text-slate-600">{row.label}</span>
                      <span className="font-bold text-slate-900">{formatINR(row.val)}</span>
                    </div>
                  ))}
                </div>

                {rec.topDebtors && rec.topDebtors.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Top Outstanding Debtors
                    </span>
                    <div className="space-y-1.5">
                      {rec.topDebtors.slice(0, 3).map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 truncate max-w-[200px]">{c.name}</span>
                          <span className="font-semibold text-rose-600">{formatINR(c.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payables Aging */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Vendor Payables Aging
                  </h3>
                  <span className="text-xs font-bold text-purple-600">
                    Total: {formatINR(pay.totalPayables)}
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Current (Not Due)', val: pay.aging?.current, color: 'bg-emerald-500' },
                    { label: '1 - 30 Days Overdue', val: pay.aging?.days1To30, color: 'bg-amber-400' },
                    { label: '31 - 60 Days Overdue', val: pay.aging?.days31To60, color: 'bg-orange-500' },
                    { label: '61 - 90 Days Overdue', val: pay.aging?.days61To90, color: 'bg-rose-500' },
                    { label: '90+ Days Overdue', val: pay.aging?.days90Plus, color: 'bg-rose-700' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                      <span className="text-slate-600">{row.label}</span>
                      <span className="font-bold text-slate-900">{formatINR(row.val)}</span>
                    </div>
                  ))}
                </div>

                {pay.topCreditors && pay.topCreditors.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Top Vendor Commitments
                    </span>
                    <div className="space-y-1.5">
                      {pay.topCreditors.slice(0, 3).map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 truncate max-w-[200px]">{s.name}</span>
                          <span className="font-semibold text-purple-600">{formatINR(s.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ROW 5: OPERATIONAL & FIELD INTELLIGENCE */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
                Operations & Field Health Telemetry
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Services */}
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-blue-600" /> Service Tickets
                    </span>
                    <span className="text-xs font-bold text-slate-900">{srv.totalTickets || 0}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Open Tickets:</span>
                      <span className="font-semibold text-amber-600">{srv.openTickets || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-semibold text-emerald-600">{srv.completedTickets || 0}</span>
                    </div>
                  </div>
                </div>

                {/* AMC Contracts */}
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> AMC Contracts
                    </span>
                    <span className="text-xs font-bold text-slate-900">{amc.activeContractsCount || 0}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Portfolio Value:</span>
                      <span className="font-semibold text-slate-900">{formatINR(amc.totalPortfolioValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expiring in 30d:</span>
                      <span className="font-semibold text-amber-600">{amc.expiringWithin30Days || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Preventive Maintenance */}
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-purple-600" /> PM Execution
                    </span>
                    <span className="text-xs font-bold text-slate-900">{pm.completionRate || 100}%</span>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Scheduled:</span>
                      <span className="font-semibold text-slate-900">{pm.totalScheduled || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overdue Visits:</span>
                      <span className="font-semibold text-rose-600">{pm.overdue || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Assets Fleet */}
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-teal-600" /> Assets Fleet
                    </span>
                    <span className="text-xs font-bold text-slate-900">{ast.totalAssets || 0}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Active Units:</span>
                      <span className="font-semibold text-emerald-600">{ast.activeAssets || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Under AMC:</span>
                      <span className="font-semibold text-slate-900">{ast.amcCovered || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 6: CRITICAL MANAGEMENT EXCEPTIONS & ALERTS */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Critical Management Exceptions & Action Items
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  {data?.exceptions?.length || 0} items require attention
                </span>
              </div>

              {(!data?.exceptions || data.exceptions.length === 0) ? (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  All operational and financial parameters are within normal enterprise thresholds.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.exceptions.map((exc) => (
                    <div key={exc.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
                            exc.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : exc.severity === 'WARNING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {exc.severity}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{exc.title}</h4>
                          <p className="text-[11px] text-slate-600 mt-0.5">{exc.description}</p>
                        </div>
                      </div>

                      {exc.actionUrl && (
                        <a
                          href={exc.actionUrl}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition flex-shrink-0"
                        >
                          Review <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
