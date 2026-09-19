'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Building2,
  Boxes,
  Users,
  FileText,
  DollarSign,
  Calendar,
  Download,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Receipt,
  Layers,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  Sparkles,
} from 'lucide-react';
import { reportsApi, customerApi, supplierApi } from '../../lib/api/client';

export default function ReportsPage() {
  // Global Range Filter State
  const [dateRange, setDateRange] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Loading & Error States
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // Tab specific data states
  const [salesData, setSalesData] = useState(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatus, setSalesStatus] = useState('All');

  const [receivablesData, setReceivablesData] = useState(null);
  const [loadingReceivables, setLoadingReceivables] = useState(false);
  const [receivablesSearch, setReceivablesSearch] = useState('');

  const [procurementData, setProcurementData] = useState(null);
  const [loadingProcurement, setLoadingProcurement] = useState(false);
  const [procurementStatus, setProcurementStatus] = useState('All');

  const [payablesData, setPayablesData] = useState(null);
  const [loadingPayables, setLoadingPayables] = useState(false);
  const [payablesSearch, setPayablesSearch] = useState('');

  const [expensesData, setExpensesData] = useState(null);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesCategory, setExpensesCategory] = useState('All');

  const [inventoryData, setInventoryData] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');

  const [gstData, setGstData] = useState(null);
  const [loadingGst, setLoadingGst] = useState(false);
  const [gstTab, setGstTab] = useState('summary'); // 'summary' | 'outward' | 'inward'

  const [operationsData, setOperationsData] = useState(null);
  const [loadingOperations, setLoadingOperations] = useState(false);

  const [workforceData, setWorkforceData] = useState(null);
  const [loadingWorkforce, setLoadingWorkforce] = useState(false);

  // Helper to build active params
  const getFilterParams = () => {
    const p = { range: dateRange };
    if (dateRange === 'custom' && customFrom && customTo) {
      p.from = customFrom;
      p.to = customTo;
    }
    return p;
  };

  // 1. Fetch Management Dashboard
  const loadDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const res = await reportsApi.getDashboard(getFilterParams());
      if (res?.success && res?.data) {
        setDashboardData(res.data);
      } else if (res?.kpis || res?.data?.kpis) {
        setDashboardData(res.data || res);
      } else {
        showToast('Failed to load dashboard report', true);
      }
    } catch (err) {
      console.error('Reports dashboard API error:', err);
      showToast('Failed to load dashboard report', true);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // 2. Fetch Tab Data on Demand
  const loadTabData = async (tabName) => {
    const params = getFilterParams();
    try {
      if (tabName === 'sales') {
        setLoadingSales(true);
        const res = await reportsApi.getSales({ ...params, status: salesStatus, search: salesSearch });
        if (res?.success && res?.data) setSalesData(res.data);
        else if (res?.items) setSalesData(res);
      } else if (tabName === 'receivables') {
        setLoadingReceivables(true);
        const res = await reportsApi.getReceivables({ ...params, search: receivablesSearch });
        if (res?.success && res?.data) setReceivablesData(res.data);
        else if (res?.customerAging) setReceivablesData(res);
      } else if (tabName === 'procurement') {
        setLoadingProcurement(true);
        const res = await reportsApi.getProcurement({ ...params, status: procurementStatus });
        if (res?.success && res?.data) setProcurementData(res.data);
        else if (res?.items) setProcurementData(res);
      } else if (tabName === 'payables') {
        setLoadingPayables(true);
        const res = await reportsApi.getPayables({ ...params, search: payablesSearch });
        if (res?.success && res?.data) setPayablesData(res.data);
        else if (res?.supplierAging) setPayablesData(res);
      } else if (tabName === 'expenses') {
        setLoadingExpenses(true);
        const res = await reportsApi.getExpenses({ ...params, categoryId: expensesCategory });
        if (res?.success && res?.data) setExpensesData(res.data);
        else if (res?.items) setExpensesData(res);
      } else if (tabName === 'inventory') {
        setLoadingInventory(true);
        const res = await reportsApi.getInventory({ ...params, search: inventorySearch });
        if (res?.success && res?.data) setInventoryData(res.data);
        else if (res?.items) setInventoryData(res);
      } else if (tabName === 'gst') {
        setLoadingGst(true);
        const res = await reportsApi.getGstSummary(params);
        if (res?.success && res?.data) setGstData(res.data);
        else if (res?.summary) setGstData(res);
      } else if (tabName === 'operations') {
        setLoadingOperations(true);
        const res = await reportsApi.getOperations(params);
        if (res?.success && res?.data) setOperationsData(res.data);
        else if (res?.jobCards) setOperationsData(res);
      } else if (tabName === 'workforce') {
        setLoadingWorkforce(true);
        const res = await reportsApi.getWorkforce(params);
        if (res?.success && res?.data) setWorkforceData(res.data);
        else if (res?.attendance) setWorkforceData(res);
      }
    } catch (err) {
      console.error(`Reports ${tabName} API error:`, err);
      showToast(`Failed to load ${tabName} report`, true);
    } finally {
      setLoadingSales(false);
      setLoadingReceivables(false);
      setLoadingProcurement(false);
      setLoadingPayables(false);
      setLoadingExpenses(false);
      setLoadingInventory(false);
      setLoadingGst(false);
      setLoadingOperations(false);
      setLoadingWorkforce(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    if (activeTab !== 'overview') {
      loadTabData(activeTab);
    }
  }, [dateRange]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'overview') {
      loadTabData(tabId);
    }
  };

  const handleApplyCustomDate = () => {
    if (!customFrom || !customTo) {
      showToast('Please specify both From and To dates', true);
      return;
    }
    setDateRange('custom');
    loadDashboard();
    if (activeTab !== 'overview') {
      loadTabData(activeTab);
    }
  };

  const formatRs = (num) => {
    if (num === null || num === undefined) {
      return '—';
    }
    if (typeof num === 'object') {
      if (num.error) return 'Error';
      if (num.value !== undefined) return formatRs(num.value);
      return '—';
    }
    return `₹${Number(num || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Safe Export Handlers
  const handleExportDashboardPdf = async () => {
    try {
      showToast('Generating Management Report PDF...');
      await reportsApi.downloadDashboardPdf(getFilterParams(), `Executive_Analytics_${dateRange}.pdf`);
      showToast('Downloaded Management Report PDF');
    } catch (e) {
      showToast('Failed to download PDF report', true);
    }
  };

  const handleExportSalesCsv = async () => {
    try {
      showToast('Exporting Sales CSV...');
      await reportsApi.downloadSalesCsv(getFilterParams());
      showToast('Sales CSV Downloaded');
    } catch (e) {
      showToast('Failed to export Sales CSV', true);
    }
  };

  const handleExportSalesPdf = async () => {
    try {
      showToast('Generating Sales PDF...');
      await reportsApi.downloadSalesPdf(getFilterParams(), `Sales_Report_${dateRange}.pdf`);
      showToast('Sales PDF Downloaded');
    } catch (e) {
      showToast('Failed to download Sales PDF', true);
    }
  };

  const handleExportReceivablesCsv = async () => {
    try {
      showToast('Exporting Receivables CSV...');
      await reportsApi.downloadReceivablesCsv(getFilterParams());
      showToast('Receivables CSV Downloaded');
    } catch (e) {
      showToast('Failed to export Receivables CSV', true);
    }
  };

  const handleExportReceivablesPdf = async () => {
    try {
      showToast('Generating Receivables PDF...');
      await reportsApi.downloadReceivablesPdf(getFilterParams(), `Receivables_Aging_${dateRange}.pdf`);
      showToast('Receivables PDF Downloaded');
    } catch (e) {
      showToast('Failed to download Receivables PDF', true);
    }
  };

  const handleExportPayablesCsv = async () => {
    try {
      showToast('Exporting Payables CSV...');
      await reportsApi.downloadPayablesCsv(getFilterParams());
      showToast('Payables CSV Downloaded');
    } catch (e) {
      showToast('Failed to export Payables CSV', true);
    }
  };

  const handleExportPayablesPdf = async () => {
    try {
      showToast('Generating Payables PDF...');
      await reportsApi.downloadPayablesPdf(getFilterParams(), `Payables_Aging_${dateRange}.pdf`);
      showToast('Payables PDF Downloaded');
    } catch (e) {
      showToast('Failed to download Payables PDF', true);
    }
  };

  const handleExportExpensesCsv = async () => {
    try {
      showToast('Exporting Expenses CSV...');
      await reportsApi.downloadExpensesCsv(getFilterParams());
      showToast('Expenses CSV Downloaded');
    } catch (e) {
      showToast('Failed to export Expenses CSV', true);
    }
  };

  const handleExportInventoryCsv = async () => {
    try {
      showToast('Exporting Inventory CSV...');
      await reportsApi.downloadInventoryCsv(getFilterParams());
      showToast('Inventory CSV Downloaded');
    } catch (e) {
      showToast('Failed to export Inventory CSV', true);
    }
  };

  const handleExportInventoryPdf = async () => {
    try {
      showToast('Generating Inventory PDF...');
      await reportsApi.downloadInventoryPdf(getFilterParams(), `Inventory_Valuation_${dateRange}.pdf`);
      showToast('Inventory PDF Downloaded');
    } catch (e) {
      showToast('Failed to download Inventory PDF', true);
    }
  };

  const handleExportGstCsv = async () => {
    try {
      showToast('Exporting GST Returns CSV...');
      await reportsApi.downloadGstCsv(getFilterParams());
      showToast('GST CSV Downloaded');
    } catch (e) {
      showToast('Failed to export GST CSV', true);
    }
  };

  const handleExportGstPdf = async () => {
    try {
      showToast('Generating GST Computation PDF...');
      await reportsApi.downloadGstPdf(getFilterParams(), `GST_Computation_${dateRange}.pdf`);
      showToast('GST PDF Downloaded');
    } catch (e) {
      showToast('Failed to download GST PDF', true);
    }
  };

  const kpis = dashboardData?.kpis;
  const financials = dashboardData?.financials;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            toastMessage.isError ? 'bg-rose-600 text-white' : 'bg-[#2F612F] text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#2F612F]/10 text-[#2F612F] rounded-lg">
                  <BarChart3 className="w-5 h-5" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reports & GST Analytics</h1>
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Live Enterprise Data
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Executive financial summaries, customer receivables, vendor payables, and GST tax computation.
              </p>
            </div>

            {/* Date Range & Global Action Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setDateRange('today')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    dateRange === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateRange('this_week')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    dateRange === 'this_week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setDateRange('this_month')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    dateRange === 'this_month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setDateRange('prev_month')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    dateRange === 'prev_month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Last Month
                </button>
                <button
                  onClick={() => setDateRange('this_quarter')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    dateRange === 'this_quarter' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  This Quarter
                </button>
                <button
                  onClick={() => setDateRange('this_fy')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    dateRange === 'this_fy' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  FY 2026-27
                </button>
                <button
                  onClick={() => setDateRange('custom')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    dateRange === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Custom
                </button>
              </div>

              {dateRange === 'custom' && (
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-[#2F612F]"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-[#2F612F]"
                  />
                  <button
                    onClick={handleApplyCustomDate}
                    className="bg-[#2F612F] text-white px-2 py-0.5 rounded font-medium hover:bg-[#254f25]"
                  >
                    Apply
                  </button>
                </div>
              )}

              <button
                onClick={handleExportDashboardPdf}
                className="flex items-center gap-1.5 bg-[#2F612F] hover:bg-[#254f25] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Executive PDF</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Executive KPI Cards Grid (8 Cards) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Revenue */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Revenue</span>
              <span className="p-1 bg-emerald-50 text-emerald-700 rounded-md">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{formatRs(kpis?.totalRevenue)}</div>
            <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 mt-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>{kpis?.revenueGrowth > 0 ? `+${kpis?.revenueGrowth}%` : `${kpis?.revenueGrowth || 0}%`} vs prev</span>
            </div>
          </div>

          {/* Collections */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Collections</span>
              <span className="p-1 bg-blue-50 text-blue-700 rounded-md">
                <CreditCard className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{formatRs(kpis?.totalCollections)}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              {kpis?.totalPaymentsCount || 0} Receipts
            </div>
          </div>

          {/* Receivables */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Receivables</span>
              <span className="p-1 bg-amber-50 text-amber-700 rounded-md">
                <Users className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-base font-bold text-amber-700 mt-1">{formatRs(kpis?.outstandingReceivables)}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Customer Dues</div>
          </div>

          {/* Payables */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payables</span>
              <span className="p-1 bg-rose-50 text-rose-700 rounded-md">
                <Building2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-base font-bold text-rose-700 mt-1">{formatRs(kpis?.outstandingPayables)}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Vendor Bills Due</div>
          </div>

          {/* Expenses */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Expenses</span>
              <span className="p-1 bg-purple-50 text-purple-700 rounded-md">
                <Layers className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{formatRs(kpis?.totalExpenses)}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Operating Spend</div>
          </div>

          {/* Payroll */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payroll</span>
              <span className="p-1 bg-indigo-50 text-indigo-700 rounded-md">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{formatRs(kpis?.payrollCost)}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Disbursed Salary</div>
          </div>

          {/* Inventory */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Inventory</span>
              <span className="p-1 bg-teal-50 text-teal-700 rounded-md">
                <Boxes className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{formatRs(kpis?.inventoryValuation)}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{kpis?.totalSkus || 0} SKUs Stock</div>
          </div>

          {/* Net GST */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Net GST</span>
              <span className="p-1 bg-orange-50 text-orange-700 rounded-md">
                <Receipt className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">{formatRs(kpis?.netGstLiability)}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Est. Tax Liability</div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 bg-white rounded-xl shadow-xs px-2 pt-2">
          <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Executive Overview', icon: Sparkles },
              { id: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
              { id: 'receivables', label: 'Receivables Aging', icon: CreditCard },
              { id: 'procurement', label: 'Procurement (POs)', icon: Building2 },
              { id: 'payables', label: 'Payables Aging', icon: Receipt },
              { id: 'expenses', label: 'Operating Expenses', icon: Layers },
              { id: 'inventory', label: 'Inventory Valuation', icon: Boxes },
              { id: 'gst', label: 'GST Tax Reports', icon: FileText },
              { id: 'operations', label: 'Field & AMC Ops', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 py-2.5 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-[#2F612F] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Management Financial Statement Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Management Financial Performance Summary</h3>
                  <p className="text-xs text-slate-500">
                    Period: <span className="font-semibold text-slate-700">{dashboardData?.periodLabel || 'Current FY'}</span>  |  Server Authoritative Database Metrics
                  </p>
                </div>
                <button
                  onClick={handleExportDashboardPdf}
                  className="flex items-center gap-1.5 text-xs text-[#2F612F] font-semibold hover:underline"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Download Summary PDF
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-4">Financial Component</th>
                      <th className="py-2.5 px-4">Source Category</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-4 text-right">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">1. Gross Revenue (Sales Invoiced)</td>
                      <td className="py-3 px-4 text-slate-500">GST Sales Invoices (Phase 5)</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{formatRs(financials?.grossRevenue)}</td>
                      <td className="py-3 px-4 text-right text-slate-500">100.0%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-rose-700">2. Less: Direct Purchases / COGS</td>
                      <td className="py-3 px-4 text-slate-500">Vendor Bills & POs (Phases 10 & 13)</td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-700">- {formatRs(financials?.cogs)}</td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {financials?.grossRevenue > 0
                          ? `${((financials?.cogs / financials?.grossRevenue) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/50 font-bold">
                      <td className="py-3 px-4 text-emerald-800">3. Gross Management Margin (1 - 2)</td>
                      <td className="py-3 px-4 text-emerald-700 text-[11px]">Gross Trading Surplus</td>
                      <td className="py-3 px-4 text-right text-emerald-800">{formatRs(financials?.grossProfit)}</td>
                      <td className="py-3 px-4 text-right text-emerald-800">{financials?.grossMarginPercent || 0}%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">4. Less: Operating Expenses</td>
                      <td className="py-3 px-4 text-slate-500">Rent, Fuel, Spares, Admin (Phase 13)</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">- {formatRs(financials?.operatingExpenses)}</td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {financials?.grossRevenue > 0
                          ? `${((financials?.operatingExpenses / financials?.grossRevenue) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">5. Less: Payroll & Staff Cost</td>
                      <td className="py-3 px-4 text-slate-500">Salary Disbursements (Phase 12)</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">- {formatRs(financials?.payrollCost)}</td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {financials?.grossRevenue > 0
                          ? `${((financials?.payrollCost / financials?.grossRevenue) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-bold text-sm">
                      <td className="py-3.5 px-4 rounded-l-lg">6. Net Management Operating Result</td>
                      <td className="py-3.5 px-4 text-slate-300 text-xs font-normal">Surplus after Opex & Payroll</td>
                      <td className="py-3.5 px-4 text-right text-emerald-400">{formatRs(financials?.netResult)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-300 rounded-r-lg">
                        {financials?.grossRevenue > 0
                          ? `${((financials?.netResult / financials?.grossRevenue) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Two Column Grid: GST Snapshot & Operations Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GST Snapshot */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-sm font-bold text-slate-900">GST Compliance & Tax Snapshot</h4>
                  </div>
                  <button
                    onClick={() => handleTabChange('gst')}
                    className="text-xs text-[#2F612F] font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <span>Full GST Report</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Total Output GST (Sales):</span>
                    <span className="font-semibold text-slate-900">{formatRs(dashboardData?.gst?.outputTax)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Input Tax Credit (Vendor Bills):</span>
                    <span className="font-semibold text-slate-900">{formatRs(dashboardData?.gst?.inputTax)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Eligible Expense Tax Credit:</span>
                    <span className="font-semibold text-slate-900">{formatRs(dashboardData?.gst?.expenseInputTax)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-emerald-50/80 px-3 rounded-lg font-bold text-emerald-800">
                    <span>Estimated Net GST Payable:</span>
                    <span>{formatRs(dashboardData?.gst?.netPayable)}</span>
                  </div>
                </div>
              </div>

              {/* Operations Snapshot */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <h4 className="text-sm font-bold text-slate-900">Field Operations & AMC Health</h4>
                  </div>
                  <button
                    onClick={() => handleTabChange('operations')}
                    className="text-xs text-[#2F612F] font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <span>Full Ops Report</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-medium">Active Service Jobs</span>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">
                      {dashboardData?.operations?.activeJobCards || 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-medium">Completed Jobs</span>
                    <div className="text-lg font-bold text-emerald-700 mt-0.5">
                      {dashboardData?.operations?.completedJobCards || 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-medium">Active AMC Contracts</span>
                    <div className="text-lg font-bold text-blue-700 mt-0.5">
                      {dashboardData?.operations?.activeAmcCount || 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-medium">Installations Scheduled</span>
                    <div className="text-lg font-bold text-indigo-700 mt-0.5">
                      {dashboardData?.operations?.scheduledInstallations || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SALES & REVENUE REPORT */}
        {activeTab === 'sales' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Sales & Revenue Register</h3>
                <p className="text-xs text-slate-500">Authoritative invoice ledger with tax breakdown and collection status.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportSalesCsv}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleExportSalesPdf}
                  className="flex items-center gap-1.5 bg-[#2F612F] hover:bg-[#254f25] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Gross Invoiced:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{formatRs(salesData?.summary?.totalGrandTotal)}</div>
              </div>
              <div>
                <span className="text-slate-500">GST Collected:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{formatRs(salesData?.summary?.totalGst)}</div>
              </div>
              <div>
                <span className="text-slate-500">Total Collections:</span>
                <div className="font-bold text-emerald-700 text-sm mt-0.5">{formatRs(salesData?.summary?.totalPaid)}</div>
              </div>
              <div>
                <span className="text-slate-500">Outstanding Balance:</span>
                <div className="font-bold text-rose-700 text-sm mt-0.5">{formatRs(salesData?.summary?.totalOutstanding)}</div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice number, customer..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadTabData('sales')}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#2F612F]"
                />
              </div>
              <select
                value={salesStatus}
                onChange={(e) => {
                  setSalesStatus(e.target.value);
                  setTimeout(() => loadTabData('sales'), 50);
                }}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[#2F612F]"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
              </select>
              <button
                onClick={() => loadTabData('sales')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg text-xs"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">GST (18%)</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingSales ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2F612F] mb-1" />
                        Loading sales report...
                      </td>
                    </tr>
                  ) : (salesData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        No transactions found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    salesData.items.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {inv.customer?.companyName || inv.customer?.customerName || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right">{formatRs(inv.subtotal)}</td>
                        <td className="py-2.5 px-3 text-right">{formatRs(inv.gstAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRs(inv.grandTotal)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{formatRs(inv.paidAmount)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-700 font-semibold">{formatRs(inv.balanceAmount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.paymentStatus === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.paymentStatus === 'Partial'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {inv.paymentStatus || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RECEIVABLES AGING */}
        {activeTab === 'receivables' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Accounts Receivable Aging Report</h3>
                <p className="text-xs text-slate-500">Customer outstanding balances segmented into 30-day aging buckets.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportReceivablesCsv}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleExportReceivablesPdf}
                  className="flex items-center gap-1.5 bg-[#2F612F] hover:bg-[#254f25] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Aging Buckets Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">Total Due:</span>
                <div className="font-bold text-rose-700 text-sm mt-0.5">
                  {formatRs(receivablesData?.summary?.totalReceivables)}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">Current (Not Due):</span>
                <div className="font-bold text-emerald-700 text-sm mt-0.5">
                  {formatRs(receivablesData?.summary?.current)}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">1–30 Days:</span>
                <div className="font-bold text-amber-700 text-sm mt-0.5">
                  {formatRs(receivablesData?.summary?.days1to30)}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">31–60 Days:</span>
                <div className="font-bold text-amber-800 text-sm mt-0.5">
                  {formatRs(receivablesData?.summary?.days31to60)}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">61–90 Days:</span>
                <div className="font-bold text-rose-600 text-sm mt-0.5">
                  {formatRs(receivablesData?.summary?.days61to90)}
                </div>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                <span className="text-rose-700 font-semibold">90+ Days:</span>
                <div className="font-bold text-rose-800 text-sm mt-0.5">
                  {formatRs(receivablesData?.summary?.days90plus)}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by customer name, phone, code..."
                  value={receivablesSearch}
                  onChange={(e) => setReceivablesSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadTabData('receivables')}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#2F612F]"
                />
              </div>
              <button
                onClick={() => loadTabData('receivables')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3 text-center">Open Invoices</th>
                    <th className="py-2.5 px-3 text-right">Current</th>
                    <th className="py-2.5 px-3 text-right">1–30 Days</th>
                    <th className="py-2.5 px-3 text-right">31–60 Days</th>
                    <th className="py-2.5 px-3 text-right">61–90 Days</th>
                    <th className="py-2.5 px-3 text-right">90+ Days</th>
                    <th className="py-2.5 px-3 text-right">Total Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingReceivables ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2F612F] mb-1" />
                        Loading receivables aging...
                      </td>
                    </tr>
                  ) : (receivablesData?.customerAging || []).length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        No outstanding receivables found.
                      </td>
                    </tr>
                  ) : (
                    receivablesData.customerAging.map((c) => (
                      <tr key={c.customerId} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {c.customerName}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">({c.customerCode})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{c.mobile || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-medium">{c.openInvoicesCount}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">{formatRs(c.current)}</td>
                        <td className="py-2.5 px-3 text-right text-amber-700 font-medium">{formatRs(c.days1to30)}</td>
                        <td className="py-2.5 px-3 text-right text-amber-800 font-medium">{formatRs(c.days31to60)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600 font-medium">{formatRs(c.days61to90)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-700 font-bold">{formatRs(c.days90plus)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 bg-slate-50/50">
                          {formatRs(c.totalOutstanding)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PROCUREMENT & POS */}
        {activeTab === 'procurement' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Procurement & Purchase Orders Report</h3>
                <p className="text-xs text-slate-500">Summary of purchase commitments and supplier delivery status.</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    toast.loading('Exporting Procurement CSV...', { id: 'proc-csv' });
                    await reportsApi.downloadProcurementCsv(getFilterParams());
                    toast.success('Procurement CSV Downloaded', { id: 'proc-csv' });
                  } catch (e) {
                    toast.error('Failed to export CSV', { id: 'proc-csv' });
                  }
                }}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Total PO Value:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {formatRs(procurementData?.summary?.totalPoValue)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Approved POs:</span>
                <div className="font-bold text-emerald-700 text-sm mt-0.5">
                  {formatRs(procurementData?.summary?.approvedPoValue)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Received Stock Value:</span>
                <div className="font-bold text-blue-700 text-sm mt-0.5">
                  {formatRs(procurementData?.summary?.receivedPoValue)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Pending Approvals:</span>
                <div className="font-bold text-amber-700 text-sm mt-0.5">
                  {formatRs(procurementData?.summary?.pendingPoValue)}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">PO Number</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">GST</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingProcurement ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2F612F] mb-1" />
                        Loading procurement report...
                      </td>
                    </tr>
                  ) : (procurementData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-slate-500">
                        No purchase orders found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    procurementData.items.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{po.poNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(po.purchaseDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {po.supplier?.companyName || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right">{formatRs(po.subtotal)}</td>
                        <td className="py-2.5 px-3 text-right">{formatRs(po.gstAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRs(po.totalAmount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                            {po.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px]">
                            {po.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PAYABLES AGING */}
        {activeTab === 'payables' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Accounts Payable Aging Report</h3>
                <p className="text-xs text-slate-500">Supplier outstanding dues and vendor bill settlement aging.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPayablesCsv}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleExportPayablesPdf}
                  className="flex items-center gap-1.5 bg-[#2F612F] hover:bg-[#254f25] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">Total Payables:</span>
                <div className="font-bold text-rose-700 text-sm mt-0.5">
                  {formatRs(payablesData?.summary?.totalPayables)}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">Current (Not Due):</span>
                <div className="font-bold text-emerald-700 text-sm mt-0.5">
                  {formatRs(payablesData?.summary?.current)}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">1–30 Days:</span>
                <div className="font-bold text-amber-700 text-sm mt-0.5">
                  {formatRs(payablesData?.summary?.days1to30)}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">31–60 Days:</span>
                <div className="font-bold text-amber-800 text-sm mt-0.5">
                  {formatRs(payablesData?.summary?.days31to60)}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">61–90 Days:</span>
                <div className="font-bold text-rose-600 text-sm mt-0.5">
                  {formatRs(payablesData?.summary?.days61to90)}
                </div>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                <span className="text-rose-700 font-semibold">90+ Days:</span>
                <div className="font-bold text-rose-800 text-sm mt-0.5">
                  {formatRs(payablesData?.summary?.days90plus)}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3 text-center">Open Bills</th>
                    <th className="py-2.5 px-3 text-right">Current</th>
                    <th className="py-2.5 px-3 text-right">1–30 Days</th>
                    <th className="py-2.5 px-3 text-right">31–60 Days</th>
                    <th className="py-2.5 px-3 text-right">61–90 Days</th>
                    <th className="py-2.5 px-3 text-right">90+ Days</th>
                    <th className="py-2.5 px-3 text-right">Total Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingPayables ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2F612F] mb-1" />
                        Loading payables aging...
                      </td>
                    </tr>
                  ) : (payablesData?.supplierAging || []).length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        No outstanding supplier payables found.
                      </td>
                    </tr>
                  ) : (
                    payablesData.supplierAging.map((s) => (
                      <tr key={s.supplierId} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {s.supplierName}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">({s.supplierCode})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{s.phone || s.contactPerson || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-medium">{s.openBillsCount}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">{formatRs(s.current)}</td>
                        <td className="py-2.5 px-3 text-right text-amber-700 font-medium">{formatRs(s.days1to30)}</td>
                        <td className="py-2.5 px-3 text-right text-amber-800 font-medium">{formatRs(s.days31to60)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600 font-medium">{formatRs(s.days61to90)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-700 font-bold">{formatRs(s.days90plus)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 bg-slate-50/50">
                          {formatRs(s.totalOutstanding)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: OPERATING EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Operating Expenses Analysis</h3>
                <p className="text-xs text-slate-500">Breakdown of operational spend, category allocation, and input tax.</p>
              </div>
              <button
                onClick={handleExportExpensesCsv}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Category Breakdown Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(expensesData?.categoryBreakdown || []).map((cat) => (
                <div key={cat.name} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{cat.name}</span>
                    <span>{cat.percentage}%</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{formatRs(cat.amount)}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Expense #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Paid To</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">GST</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingExpenses ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2F612F] mb-1" />
                        Loading expense records...
                      </td>
                    </tr>
                  ) : (expensesData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        No expenses found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    expensesData.items.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{exp.expenseNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(exp.expenseDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{exp.category?.name || 'General'}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {exp.supplier?.companyName || exp.employee?.fullName || 'Direct'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{exp.description}</td>
                        <td className="py-2.5 px-3 text-right">{formatRs(exp.subtotal)}</td>
                        <td className="py-2.5 px-3 text-right">{formatRs(exp.taxAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRs(exp.totalAmount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                            {exp.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: INVENTORY VALUATION */}
        {activeTab === 'inventory' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Inventory Stock & Valuation Report</h3>
                <p className="text-xs text-slate-500">Product asset valuation calculated from purchase unit costs and available quantities.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportInventoryCsv}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleExportInventoryPdf}
                  className="flex items-center gap-1.5 bg-[#2F612F] hover:bg-[#254f25] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Total Valuation:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {formatRs(inventoryData?.summary?.totalValuation)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Active SKUs:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {inventoryData?.summary?.totalSkus || 0} Products
                </div>
              </div>
              <div>
                <span className="text-slate-500">Total Units in Stock:</span>
                <div className="font-bold text-blue-700 text-sm mt-0.5">
                  {inventoryData?.summary?.totalUnits || 0} Units
                </div>
              </div>
              <div>
                <span className="text-slate-500">Low Stock Alerts:</span>
                <div className="font-bold text-amber-700 text-sm mt-0.5">
                  {inventoryData?.summary?.lowStockCount || 0} Items
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Brand</th>
                    <th className="py-2.5 px-3 text-center">Stock Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Total Valuation</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingInventory ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2F612F] mb-1" />
                        Loading inventory valuation...
                      </td>
                    </tr>
                  ) : (inventoryData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-500">
                        No product inventory records found.
                      </td>
                    </tr>
                  ) : (
                    inventoryData.items.map((p) => {
                      const val = (p.stockQuantity || 0) * (p.purchasePrice || 0);
                      const isLow = (p.stockQuantity || 0) <= 5;
                      const isOut = (p.stockQuantity || 0) <= 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{p.sku}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {p.productName}
                            <span className="text-[10px] text-slate-400 block">{p.model}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{p.category?.categoryName || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.brand?.brandName || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-full ${
                                isOut
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'text-slate-900'
                              }`}
                            >
                              {p.stockQuantity || 0}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">{formatRs(p.purchasePrice)}</td>
                          <td className="py-2.5 px-3 text-right">{formatRs(p.sellingPrice)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRs(val)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {isOut ? (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                                In Stock
                              </span>
                            )}
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

        {/* TAB 8: GST TAX REPORTS */}
        {activeTab === 'gst' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">GST Compliance & Tax Computation</h3>
                <p className="text-xs text-slate-500">
                  GSTR-1 Outward sales register, GSTR-2B Input Tax Credit (ITC), and estimated net GST liability.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportGstCsv}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Export Returns CSV</span>
                </button>
                <button
                  onClick={handleExportGstPdf}
                  className="flex items-center gap-1.5 bg-[#2F612F] hover:bg-[#254f25] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download GST PDF</span>
                </button>
              </div>
            </div>

            {/* GST Computation Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Supply Category</th>
                    <th className="py-2.5 px-4 text-right">Taxable Value (₹)</th>
                    <th className="py-2.5 px-4 text-right">CGST 9% (₹)</th>
                    <th className="py-2.5 px-4 text-right">SGST 9% (₹)</th>
                    <th className="py-2.5 px-4 text-right">IGST 18% (₹)</th>
                    <th className="py-2.5 px-4 text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">A. Outward Supplies (Sales Invoices)</td>
                    <td className="py-3 px-4 text-right font-medium">{formatRs(gstData?.summary?.outwardTaxable)}</td>
                    <td className="py-3 px-4 text-right">{formatRs(gstData?.summary?.outwardCgst)}</td>
                    <td className="py-3 px-4 text-right">{formatRs(gstData?.summary?.outwardSgst)}</td>
                    <td className="py-3 px-4 text-right">₹0.00</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatRs(gstData?.summary?.totalOutputTax)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-800">B. Inward Eligible Supplies (Vendor Bills)</td>
                    <td className="py-3 px-4 text-right font-medium">{formatRs(gstData?.summary?.inwardBillsTaxable)}</td>
                    <td className="py-3 px-4 text-right">{formatRs(gstData?.summary?.inwardBillsCgst)}</td>
                    <td className="py-3 px-4 text-right">{formatRs(gstData?.summary?.inwardBillsSgst)}</td>
                    <td className="py-3 px-4 text-right">₹0.00</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatRs(gstData?.summary?.inwardBillsTax)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-800">C. Operating Expense Tax Credit (Vouchers)</td>
                    <td className="py-3 px-4 text-right font-medium">{formatRs(gstData?.summary?.inwardExpenseTaxable)}</td>
                    <td className="py-3 px-4 text-right">{formatRs(gstData?.summary?.inwardExpenseCgst)}</td>
                    <td className="py-3 px-4 text-right">{formatRs(gstData?.summary?.inwardExpenseSgst)}</td>
                    <td className="py-3 px-4 text-right">₹0.00</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatRs(gstData?.summary?.inwardExpenseTax)}</td>
                  </tr>
                  <tr className="bg-emerald-50/60 font-bold">
                    <td className="py-3 px-4 text-emerald-800">D. Total Input Tax Credit (ITC = B + C)</td>
                    <td className="py-3 px-4 text-right text-emerald-800">-</td>
                    <td className="py-3 px-4 text-right text-emerald-800">{formatRs(gstData?.summary?.totalInputCgst)}</td>
                    <td className="py-3 px-4 text-right text-emerald-800">{formatRs(gstData?.summary?.totalInputSgst)}</td>
                    <td className="py-3 px-4 text-right text-emerald-800">₹0.00</td>
                    <td className="py-3 px-4 text-right text-emerald-800">{formatRs(gstData?.summary?.totalInputTax)}</td>
                  </tr>
                  <tr className="bg-slate-900 text-white font-bold text-sm">
                    <td className="py-3.5 px-4 rounded-l-lg">E. NET ESTIMATED GST LIABILITY (A - D)</td>
                    <td className="py-3.5 px-4 text-right text-slate-300 text-xs font-normal">Est. Tax Balance</td>
                    <td className="py-3.5 px-4 text-right text-emerald-400">{formatRs(gstData?.summary?.netCgst)}</td>
                    <td className="py-3.5 px-4 text-right text-emerald-400">{formatRs(gstData?.summary?.netSgst)}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400">₹0.00</td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 rounded-r-lg">{formatRs(gstData?.summary?.netGstLiability)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sub-tabs for Outward vs Inward */}
            <div className="pt-2">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setGstTab('summary')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    gstTab === 'summary' ? 'bg-[#2F612F] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Outward Register (GSTR-1)
                </button>
                <button
                  onClick={() => setGstTab('inward')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    gstTab === 'inward' ? 'bg-[#2F612F] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Inward Supplies Register (GSTR-2B)
                </button>
              </div>

              {gstTab === 'summary' ? (
                <div className="mt-3 overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">GSTIN</th>
                        <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                        <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(gstData?.outwardInvoices || []).length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-6 text-slate-500">
                            No outward GST invoices found.
                          </td>
                        </tr>
                      ) : (
                        gstData.outwardInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(inv.invoiceDate).toLocaleDateString('en-GB')}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.isB2B ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {inv.isB2B ? 'B2B' : 'B2C'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{inv.customerName}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{inv.gstin || '-'}</td>
                            <td className="py-2.5 px-3 text-right">{formatRs(inv.taxableValue)}</td>
                            <td className="py-2.5 px-3 text-right">{formatRs(inv.cgst)}</td>
                            <td className="py-2.5 px-3 text-right">{formatRs(inv.sgst)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRs(inv.totalValue)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-3 overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Ref Number</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Supplier / Party</th>
                        <th className="py-2.5 px-3">Party GSTIN</th>
                        <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                        <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(gstData?.inwardPurchases || []).length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-6 text-slate-500">
                            No inward purchase records found.
                          </td>
                        </tr>
                      ) : (
                        gstData.inwardPurchases.map((inw) => (
                          <tr key={inw.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{inw.refNumber}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px]">
                                {inw.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(inw.date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{inw.partyName}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{inw.partyGstin || '-'}</td>
                            <td className="py-2.5 px-3 text-right">{formatRs(inw.taxableValue)}</td>
                            <td className="py-2.5 px-3 text-right">{formatRs(inw.cgst)}</td>
                            <td className="py-2.5 px-3 text-right">{formatRs(inw.sgst)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRs(inw.totalValue)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 9: OPERATIONS & FIELD SERVICES */}
        {activeTab === 'operations' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Operations & Field Performance</h3>
                <p className="text-xs text-slate-500">
                  Service complaints, technician job cards, AMC contract renewals, and equipment installations.
                </p>
              </div>
            </div>

            {/* Operational Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Total Service Requests:</span>
                <div className="font-bold text-slate-900 text-base mt-0.5">
                  {operationsData?.summary?.totalJobCards || 0}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Completed Jobs:</span>
                <div className="font-bold text-emerald-700 text-base mt-0.5">
                  {operationsData?.summary?.completedJobs || 0}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Active AMC Contracts:</span>
                <div className="font-bold text-blue-700 text-base mt-0.5">
                  {operationsData?.summary?.activeAmc || 0}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Installations Completed:</span>
                <div className="font-bold text-indigo-700 text-base mt-0.5">
                  {operationsData?.summary?.completedInstallations || 0}
                </div>
              </div>
            </div>

            {/* Job Cards Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Job Number</th>
                    <th className="py-2.5 px-3">Visit Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Technician</th>
                    <th className="py-2.5 px-3 text-right">Est. Cost</th>
                    <th className="py-2.5 px-3 text-right">Actual Cost</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingOperations ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#2F612F] mb-1" />
                        Loading operational metrics...
                      </td>
                    </tr>
                  ) : (operationsData?.jobCards || []).length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-500">
                        No service job cards found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    operationsData.jobCards.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{j.jobNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(j.visitDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {j.complaint?.customer?.companyName || j.complaint?.customer?.customerName || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{j.technician?.fullName || '-'}</td>
                        <td className="py-2.5 px-3 text-right">{formatRs(j.estimatedCost)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRs(j.actualCost)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              j.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
