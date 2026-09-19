'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Trash2,
  Edit3,
  Eye,
  X,
  UserCheck,
  UserX,
  CreditCard,
  FileText,
  Download,
  Printer,
  Shield,
  Layers,
  Clock,
  Check,
  ArrowRight,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { payrollApi } from '../../lib/api/client';

export default function PayrollPage() {
  // State
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    totalPeriods: 0,
    draftPeriods: 0,
    approvedPeriods: 0,
    paidPeriods: 0,
    activeEmployeesCount: 0,
    totalGrossPaidAllTime: 0,
    totalDeductionsAllTime: 0,
    totalNetPaidAllTime: 0,
  });

  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [newPeriodData, setNewPeriodData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    remarks: '',
  });

  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [calcData, setCalcData] = useState({
    standardWorkingDays: 26,
  });

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingRecord, setAdjustingRecord] = useState(null);
  const [adjustFormData, setAdjustFormData] = useState({
    otherAllowance: 0,
    advanceDeduction: 0,
    loanDeduction: 0,
    otherDeduction: 0,
    remarks: '',
  });

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveRemarks, setApproveRemarks] = useState('');

  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [paidFormData, setPaidFormData] = useState({
    paymentMethod: 'Bank Transfer',
    paymentReference: '',
    paidAt: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  // Drawer
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper currency format
  const formatCurrency = (val) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Month names helper
  const getMonthName = (m) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[(m || 1) - 1] || 'Month';
  };

  // Load Periods & Stats
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [periodRes, statRes] = await Promise.all([
        payrollApi.getPeriods(),
        payrollApi.getStats(),
      ]);

      const periodList = Array.isArray(periodRes?.data)
        ? periodRes.data
        : Array.isArray(periodRes?.data?.data)
          ? periodRes.data.data
          : Array.isArray(periodRes)
            ? periodRes
            : [];

      setPeriods(periodList);
      setStats(statRes?.data || statRes || {});

      if (periodList.length > 0) {
        // Keep selected period if still existing, else select first
        setSelectedPeriod((prev) => {
          if (!prev) return periodList[0];
          const found = periodList.find((p) => p.id === prev.id);
          return found || periodList[0];
        });
      } else {
        setSelectedPeriod(null);
        setRecords([]);
      }
    } catch (err) {
      console.error('Failed to load payroll periods:', err);
      showToast('Failed to load payroll periods from database.', true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Records for selected period
  const loadRecords = useCallback(async (periodId) => {
    if (!periodId) return;
    try {
      setRecordsLoading(true);
      const res = await payrollApi.getRecords(periodId);
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
            ? res
            : [];
      setRecords(list);
    } catch (err) {
      console.error('Failed to load payroll records:', err);
      showToast('Failed to load employee records for period.', true);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPeriod?.id) {
      loadRecords(selectedPeriod.id);
    }
  }, [selectedPeriod?.id, loadRecords]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (statusFilter !== 'All' && rec.paymentStatus !== statusFilter) return false;
      if (departmentFilter !== 'All' && rec.department !== departmentFilter) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        rec.employeeName?.toLowerCase().includes(q) ||
        rec.employeeCode?.toLowerCase().includes(q) ||
        rec.designation?.toLowerCase().includes(q) ||
        rec.department?.toLowerCase().includes(q) ||
        rec.remarks?.toLowerCase().includes(q)
      );
    });
  }, [records, search, statusFilter, departmentFilter]);

  // Create Period Handler
  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await payrollApi.createPeriod({
        month: Number(newPeriodData.month),
        year: Number(newPeriodData.year),
        remarks: newPeriodData.remarks,
      });

      showToast(res.message || 'Payroll period created successfully.');
      setShowCreatePeriodModal(false);
      await loadData();
      if (res.data?.id) {
        setSelectedPeriod(res.data);
      }
    } catch (err) {
      console.error('Create period error:', err);
      let errorMsg = 'Failed to create payroll period.';
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join('; ')
          : String(err.response.data.message);
      }
      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate Payroll Handler
  const handleCalculatePayroll = async (e) => {
    e.preventDefault();
    if (!selectedPeriod) return;

    try {
      setActionLoading(true);
      const res = await payrollApi.calculatePayroll(selectedPeriod.id, {
        standardWorkingDays: Number(calcData.standardWorkingDays) || 26,
      });

      showToast(res.message || 'Payroll calculated successfully!');
      setShowCalculateModal(false);
      await loadData();
      setSelectedPeriod(res.data);
      await loadRecords(selectedPeriod.id);
    } catch (err) {
      console.error('Calculate payroll error:', err);
      let errorMsg = 'Failed to calculate payroll.';
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join('; ')
          : String(err.response.data.message);
      }
      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Adjust Modal
  const handleOpenAdjust = (rec) => {
    setAdjustingRecord(rec);
    setAdjustFormData({
      otherAllowance: rec.otherAllowance || 0,
      advanceDeduction: rec.advanceDeduction || 0,
      loanDeduction: rec.loanDeduction || 0,
      otherDeduction: rec.otherDeduction || 0,
      remarks: rec.remarks || '',
    });
    setShowAdjustModal(true);
  };

  // Save Adjustments Handler
  const handleSaveAdjustments = async (e) => {
    e.preventDefault();
    if (!selectedPeriod || !adjustingRecord) return;

    try {
      setActionLoading(true);
      const res = await payrollApi.updateRecord(selectedPeriod.id, adjustingRecord.employeeId, {
        otherAllowance: Number(adjustFormData.otherAllowance) || 0,
        advanceDeduction: Number(adjustFormData.advanceDeduction) || 0,
        loanDeduction: Number(adjustFormData.loanDeduction) || 0,
        otherDeduction: Number(adjustFormData.otherDeduction) || 0,
        remarks: adjustFormData.remarks,
      });

      showToast(res.message || 'Payroll record adjusted successfully.');
      setShowAdjustModal(false);
      await loadData();
      await loadRecords(selectedPeriod.id);
    } catch (err) {
      console.error('Adjust record error:', err);
      let errorMsg = 'Failed to update record.';
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join('; ')
          : String(err.response.data.message);
      }
      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Payroll Handler
  const handleApprovePayroll = async (e) => {
    e.preventDefault();
    if (!selectedPeriod) return;

    try {
      setActionLoading(true);
      const res = await payrollApi.approvePayroll(selectedPeriod.id, {
        remarks: approveRemarks,
      });

      showToast(res.message || 'Payroll approved successfully.');
      setShowApproveModal(false);
      await loadData();
      setSelectedPeriod(res.data);
      await loadRecords(selectedPeriod.id);
    } catch (err) {
      console.error('Approve payroll error:', err);
      let errorMsg = 'Failed to approve payroll.';
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join('; ')
          : String(err.response.data.message);
      }
      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark Paid Handler
  const handleMarkPaid = async (e) => {
    e.preventDefault();
    if (!selectedPeriod) return;

    try {
      setActionLoading(true);
      const res = await payrollApi.markPaid(selectedPeriod.id, {
        paymentMethod: paidFormData.paymentMethod,
        paymentReference: paidFormData.paymentReference,
        paidAt: paidFormData.paidAt,
        remarks: paidFormData.remarks,
      });

      showToast(res.message || 'Payroll marked as PAID.');
      setShowMarkPaidModal(false);
      await loadData();
      setSelectedPeriod(res.data);
      await loadRecords(selectedPeriod.id);
    } catch (err) {
      console.error('Mark paid error:', err);
      let errorMsg = 'Failed to mark as paid.';
      if (err.response?.data?.message) {
        errorMsg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join('; ')
          : String(err.response.data.message);
      }
      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Status Badge Helper
  const getPeriodBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> PAID
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <Lock className="w-3 h-3" /> APPROVED
          </span>
        );
      case 'CALCULATED':
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <Edit3 className="w-3 h-3" /> DRAFT
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <UserX className="w-3 h-3" /> CANCELLED
          </span>
        );
      default:
        return <span className="text-gray-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            toastMessage.isError ? 'bg-rose-600 text-white' : 'bg-brand text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-brand" />
              Payroll & Salary Management
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Phase 12
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Monthly payroll processing, salary calculation, approvals and payslips.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreatePeriodModal(true)}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Payroll Period
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Payroll Runs</span>
            <Layers className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalPeriods || periods.length}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">
            {stats.paidPeriods || 0} Paid • {stats.draftPeriods || 0} Pending
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Staff in Run</span>
            <UserCheck className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {selectedPeriod?.totalEmployees || records.length || stats.activeEmployeesCount || 0}
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">Active workforce</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gross Payout</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-gray-900 truncate">
            {formatCurrency(selectedPeriod?.totalGrossSalary || 0)}
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">Basic + Allowances + OT</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Deductions</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-700 truncate">
            {formatCurrency(selectedPeriod?.totalDeductions || 0)}
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">LOP + Advances + EMI</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Net Take-Home</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-700 truncate">
            {formatCurrency(selectedPeriod?.totalNetSalary || 0)}
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">Total payable amount</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-brand mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Disbursed All Time</span>
            <CreditCard className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-xl font-bold text-brand truncate">
            {formatCurrency(stats.totalNetPaidAllTime || 0)}
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">Completed payroll cycles</div>
        </div>
      </div>

      {/* Selected Period Control Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">
                  {selectedPeriod
                    ? `${getMonthName(selectedPeriod.month)} ${selectedPeriod.year}`
                    : 'No Payroll Period Selected'}
                </span>
                {selectedPeriod && (
                  <span className="font-mono text-xs font-bold text-brand bg-brand/5 px-2 py-0.5 rounded border border-brand/20">
                    {selectedPeriod.payrollNumber}
                  </span>
                )}
                {selectedPeriod && getPeriodBadge(selectedPeriod.status)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {selectedPeriod
                  ? `Cycle Window: ${new Date(selectedPeriod.periodStart).toLocaleDateString('en-GB')} – ${new Date(selectedPeriod.periodEnd).toLocaleDateString('en-GB')}`
                  : 'Select or create a monthly payroll run.'}
              </div>
            </div>
          </div>

          {/* Period Selector & Workflow Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPeriod?.id || ''}
              onChange={(e) => {
                const found = periods.find((p) => p.id === e.target.value);
                if (found) setSelectedPeriod(found);
              }}
              className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {getMonthName(p.month)} {p.year} ({p.payrollNumber}) — {p.status}
                </option>
              ))}
            </select>

            {selectedPeriod && ['DRAFT', 'CALCULATED', 'REVIEW'].includes(selectedPeriod.status) && (
              <button
                onClick={() => setShowCalculateModal(true)}
                className="inline-flex items-center gap-1.5 bg-brand text-white hover:bg-brand-dark px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {selectedPeriod.status === 'DRAFT' ? 'Calculate Payroll' : 'Recalculate'}
              </button>
            )}

            {selectedPeriod && ['CALCULATED', 'REVIEW'].includes(selectedPeriod.status) && (
              <button
                onClick={() => setShowApproveModal(true)}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve Payroll
              </button>
            )}

            {selectedPeriod && selectedPeriod.status === 'APPROVED' && (
              <button
                onClick={() => setShowMarkPaidModal(true)}
                className="inline-flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Disburse & Mark Paid
              </button>
            )}
          </div>
        </div>

        {/* Filter / Search for Employee Records */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between pt-1">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee name, code, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
            >
              <option value="All">All Departments</option>
              <option value="Service & Operations">Service & Operations</option>
              <option value="Sales & Marketing">Sales & Marketing</option>
              <option value="Management & Admin">Management & Admin</option>
              <option value="Finance & Accounts">Finance & Accounts</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
            >
              <option value="All">All Payment Statuses</option>
              <option value="PENDING">Pending Disbursal</option>
              <option value="PAID">Disbursed (PAID)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Payroll Table */}
      <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                <th className="p-3">Employee Code</th>
                <th className="p-3">Employee Name</th>
                <th className="p-3">Department</th>
                <th className="p-3 text-center">Attendance (P/A/L)</th>
                <th className="p-3 text-center">Overtime</th>
                <th className="p-3 text-right">Gross Salary</th>
                <th className="p-3 text-right">Deductions</th>
                <th className="p-3 text-right">Net Payable</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading || recordsLoading ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-xs text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
                    <div>Loading salary records from PostgreSQL...</div>
                  </td>
                </tr>
              ) : !selectedPeriod ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-800">No Payroll Periods Configured</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Create your first payroll run for the current month.
                    </p>
                    <button
                      onClick={() => setShowCreatePeriodModal(true)}
                      className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
                    >
                      + New Payroll Period
                    </button>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-800">Payroll Not Calculated Yet</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Click &ldquo;Calculate Payroll&rdquo; to automatically compute earnings, attendance loss of pay, and overtime from Phase 11.
                    </p>
                    {['DRAFT', 'CALCULATED', 'REVIEW'].includes(selectedPeriod.status) && (
                      <button
                        onClick={() => setShowCalculateModal(true)}
                        className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
                      >
                        Calculate Payroll Now
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isLocked = ['APPROVED', 'PAID'].includes(selectedPeriod.status);

                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-mono font-bold text-brand flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-brand" />
                          {rec.employeeCode}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{rec.employeeName}</div>
                        <div className="text-[10px] text-gray-500">{rec.designation}</div>
                      </td>
                      <td className="p-3 text-gray-600 font-medium">{rec.department}</td>
                      <td className="p-3 text-center">
                        <div className="font-medium text-gray-900">
                          {rec.presentDays}P / {rec.absentDays}A / {rec.leaveDays}L
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {rec.paidDays} of {rec.workingDays} paid days
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono">
                        {rec.overtimeHours > 0 ? (
                          <div>
                            <span className="text-brand font-semibold">{rec.overtimeHours}h</span>
                            <div className="text-[10px] text-gray-500 font-bold">
                              {formatCurrency(rec.overtimeAmount)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-semibold text-gray-900">
                        {formatCurrency(rec.grossSalary)}
                        <div className="text-[9px] text-gray-400">Basic {formatCurrency(rec.basicSalary)}</div>
                      </td>
                      <td className="p-3 text-right font-semibold text-rose-700">
                        {formatCurrency(rec.totalDeductions)}
                        {rec.lossOfPay > 0 && (
                          <div className="text-[9px] text-rose-500">LOP {formatCurrency(rec.lossOfPay)}</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700 text-sm">
                        {formatCurrency(rec.netSalary)}
                      </td>
                      <td className="p-3 text-center">
                        {rec.paymentStatus === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRecord(rec);
                              setShowDetailDrawer(true);
                            }}
                            className="p-1 text-gray-600 hover:text-brand hover:bg-brand/10 rounded"
                            title="View Payslip & Salary Breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {!isLocked && (
                            <button
                              onClick={() => handleOpenAdjust(rec)}
                              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Adjust Allowances & Deductions"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <a
                            href={payrollApi.getPayslipUrl(selectedPeriod.id, rec.employeeId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            title="Download PDF Payslip"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE PAYROLL PERIOD */}
      {showCreatePeriodModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand" />
                New Monthly Payroll Period
              </h3>
              <button
                type="button"
                onClick={() => setShowCreatePeriodModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="create-period-form" onSubmit={handleCreatePeriod} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Month <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newPeriodData.month}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, month: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {getMonthName(m)} ({m.toString().padStart(2, '0')})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2100"
                    value={newPeriodData.year}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, year: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payroll Cycle Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Standard August salary run for Service & Admin staff"
                  value={newPeriodData.remarks}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, remarks: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>
            </form>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCreatePeriodModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-period-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark text-xs shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Creating...' : 'Create Period'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CALCULATE PAYROLL */}
      {showCalculateModal && selectedPeriod && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-brand" />
                Calculate Monthly Payroll
              </h3>
              <button
                type="button"
                onClick={() => setShowCalculateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="calc-form" onSubmit={handleCalculatePayroll} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3 bg-brand/5 border border-brand/20 rounded-md space-y-1.5 text-gray-700">
                <div className="font-semibold text-gray-900">
                  Payroll Period: {getMonthName(selectedPeriod.month)} {selectedPeriod.year} ({selectedPeriod.payrollNumber})
                </div>
                <div>
                  Calculates Basic (50%), HRA (25%), Conveyance (10%), Special Allowance (15%), Overtime pay (1.5x) and Loss of Pay (LOP) based on daily attendance.
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Standard Monthly Working Days <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={calcData.standardWorkingDays}
                  onChange={(e) => setCalcData({ standardWorkingDays: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  required
                />
                <span className="text-[10px] text-gray-400">Default standard working days: 26</span>
              </div>
            </form>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCalculateModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="calc-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark text-xs shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Calculating...' : 'Run Calculation Engine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADJUST RECORD ALLOWANCES & DEDUCTIONS */}
      {showAdjustModal && adjustingRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-brand" />
                Adjust Salary: {adjustingRecord.employeeName} ({adjustingRecord.employeeCode})
              </h3>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="adjust-form" onSubmit={handleSaveAdjustments} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                <div>
                  <span className="text-gray-500 block">Base Salary</span>
                  <span className="font-bold text-gray-900">{formatCurrency(adjustingRecord.basicSalary + adjustingRecord.hra + adjustingRecord.conveyance + adjustingRecord.specialAllowance)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Loss of Pay (LOP)</span>
                  <span className="font-bold text-rose-700">{formatCurrency(adjustingRecord.lossOfPay)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-gray-800 uppercase text-[10px] tracking-wider">ALLOWANCES & ADDITIONS</h4>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Other Allowance / Bonus (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={adjustFormData.otherAllowance}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, otherAllowance: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-gray-800 uppercase text-[10px] tracking-wider">MANUAL DEDUCTIONS & RECOVERIES</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Salary Advance (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={adjustFormData.advanceDeduction}
                      onChange={(e) => setAdjustFormData({ ...adjustFormData, advanceDeduction: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Loan / EMI (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={adjustFormData.loanDeduction}
                      onChange={(e) => setAdjustFormData({ ...adjustFormData, loanDeduction: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Other Deduction (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={adjustFormData.otherDeduction}
                      onChange={(e) => setAdjustFormData({ ...adjustFormData, otherDeduction: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Adjustment Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Festival advance deduction / Tool allowance"
                  value={adjustFormData.remarks}
                  onChange={(e) => setAdjustFormData({ ...adjustFormData, remarks: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>
            </form>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="adjust-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark text-xs shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Apply Adjustments'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: APPROVE PAYROLL */}
      {showApproveModal && selectedPeriod && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Approve Monthly Payroll
              </h3>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="approve-form" onSubmit={handleApprovePayroll} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-blue-900 space-y-1">
                <div className="font-bold">Period: {getMonthName(selectedPeriod.month)} {selectedPeriod.year}</div>
                <div>Total Employees: {selectedPeriod.totalEmployees}</div>
                <div>Total Gross: {formatCurrency(selectedPeriod.totalGrossSalary)}</div>
                <div>Total Net Payable: {formatCurrency(selectedPeriod.totalNetSalary)}</div>
              </div>

              <p className="text-gray-600">
                Approving this payroll locks employee calculations from silent modification and enables salary disbursement.
              </p>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Approval Notes / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Approved by Director & HR Management"
                  value={approveRemarks}
                  onChange={(e) => setApproveRemarks(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>
            </form>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="approve-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 text-xs shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: MARK AS PAID */}
      {showMarkPaidModal && selectedPeriod && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Salary Disbursement (Mark as PAID)
              </h3>
              <button
                type="button"
                onClick={() => setShowMarkPaidModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="mark-paid-form" onSubmit={handleMarkPaid} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-emerald-900 space-y-1">
                <div className="font-bold">Total Disbursal: {formatCurrency(selectedPeriod.totalNetSalary)}</div>
                <div>All {selectedPeriod.totalEmployees} employee payslips will be marked as PAID.</div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paidFormData.paymentMethod}
                  onChange={(e) => setPaidFormData({ ...paidFormData, paymentMethod: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  required
                >
                  <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                  <option value="UPI">Company UPI</option>
                  <option value="Cheque">Corporate Cheque</option>
                  <option value="Cash">Cash Voucher</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paidFormData.paidAt}
                    onChange={(e) => setPaidFormData({ ...paidFormData, paidAt: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">UTR / Bank Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. AXIS-NEFT-991823"
                    value={paidFormData.paymentReference}
                    onChange={(e) => setPaidFormData({ ...paidFormData, paymentReference: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Salary credited to employee salary accounts"
                  value={paidFormData.remarks}
                  onChange={(e) => setPaidFormData({ ...paidFormData, remarks: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>
            </form>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowMarkPaidModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="mark-paid-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 text-xs shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Disbursal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: PAYSLIP DETAIL VIEW */}
      {showDetailDrawer && selectedRecord && selectedPeriod && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white border-l border-gray-200 h-full overflow-y-auto p-6 space-y-6 shadow-2xl text-xs animate-in slide-in-from-right">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{selectedRecord.employeeName}</h3>
                  <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                    {selectedRecord.employeeCode}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {selectedRecord.designation} • {selectedRecord.department}
                </div>
              </div>
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payslip Header Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                PAYSLIP SUMMARY: {getMonthName(selectedPeriod.month)} {selectedPeriod.year}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 block">Payroll Reference</span>
                  <span className="font-semibold text-gray-900">{selectedPeriod.payrollNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Payment Status</span>
                  <span className="font-semibold">
                    {selectedRecord.paymentStatus === 'PAID' ? (
                      <span className="text-emerald-700">PAID ✓</span>
                    ) : (
                      <span className="text-amber-700">PENDING</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Working Days</span>
                  <span className="font-semibold text-gray-900">{selectedRecord.workingDays}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Paid Days</span>
                  <span className="font-semibold text-gray-900">{selectedRecord.paidDays}</span>
                </div>
              </div>
            </div>

            {/* Breakdown Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Earnings */}
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                <h4 className="font-bold text-emerald-800 uppercase text-[10px] tracking-wider border-b pb-1">
                  EARNINGS
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Basic Salary</span>
                    <span className="font-medium">{formatCurrency(selectedRecord.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">HRA</span>
                    <span className="font-medium">{formatCurrency(selectedRecord.hra)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conveyance</span>
                    <span className="font-medium">{formatCurrency(selectedRecord.conveyance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Special Allowance</span>
                    <span className="font-medium">{formatCurrency(selectedRecord.specialAllowance)}</span>
                  </div>
                  {selectedRecord.otherAllowance > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Other Allowance</span>
                      <span className="font-medium">{formatCurrency(selectedRecord.otherAllowance)}</span>
                    </div>
                  )}
                  {selectedRecord.overtimeAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overtime ({selectedRecord.overtimeHours}h)</span>
                      <span className="font-medium text-brand">{formatCurrency(selectedRecord.overtimeAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 font-bold text-gray-900">
                    <span>Total Gross</span>
                    <span>{formatCurrency(selectedRecord.grossSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                <h4 className="font-bold text-rose-800 uppercase text-[10px] tracking-wider border-b pb-1">
                  DEDUCTIONS
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loss of Pay (LOP)</span>
                    <span className="font-medium text-rose-600">{formatCurrency(selectedRecord.lossOfPay)}</span>
                  </div>
                  {selectedRecord.advanceDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Advance</span>
                      <span className="font-medium">{formatCurrency(selectedRecord.advanceDeduction)}</span>
                    </div>
                  )}
                  {selectedRecord.loanDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loan / EMI</span>
                      <span className="font-medium">{formatCurrency(selectedRecord.loanDeduction)}</span>
                    </div>
                  )}
                  {selectedRecord.otherDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Other</span>
                      <span className="font-medium">{formatCurrency(selectedRecord.otherDeduction)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 font-bold text-rose-700">
                    <span>Total Deductions</span>
                    <span>{formatCurrency(selectedRecord.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Pay Callout */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 font-medium block">NET TAKE-HOME SALARY</span>
                <span className="text-2xl font-bold text-emerald-700">{formatCurrency(selectedRecord.netSalary)}</span>
              </div>
              <a
                href={payrollApi.getPayslipUrl(selectedPeriod.id, selectedRecord.employeeId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-md font-semibold text-xs transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
