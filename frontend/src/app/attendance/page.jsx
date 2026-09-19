'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
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
  LogOut,
  LogIn,
  Users,
  Shield,
  FileText,
  Filter,
  Check,
  RefreshCw,
} from 'lucide-react';
import { attendanceApi, employeeApi } from '../../lib/api/client';

export default function AttendancePage() {
  // State
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({
    activeEmployeesCount: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    halfDayToday: 0,
    checkedInNow: 0,
    avgWorkingHours: 0,
    totalOvertimeHours: 0,
    todayRecordsCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [employeeFilter, setEmployeeFilter] = useState('All');

  // Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInData, setCheckInData] = useState({
    employeeId: '',
    attendanceDate: new Date().toISOString().split('T')[0],
    remarks: 'Web / Tablet Check-In',
  });

  const [showMarkModal, setShowMarkModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [markData, setMarkData] = useState({
    employeeId: '',
    attendanceDate: new Date().toISOString().split('T')[0],
    attendanceStatus: 'Present',
    checkInTime: '09:00',
    checkOutTime: '18:00',
    leaveReason: '',
    remarks: 'Manual Entry',
  });

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedDate) params.date = selectedDate;

      const [attRes, statRes, empRes] = await Promise.all([
        attendanceApi.getAttendance(params),
        attendanceApi.getStats(),
        employeeApi.getEmployees({ status: 'ACTIVE' }),
      ]);

      const attList = Array.isArray(attRes?.data)
        ? attRes.data
        : Array.isArray(attRes?.data?.data)
          ? attRes.data.data
          : Array.isArray(attRes)
            ? attRes
            : [];

      const empList = Array.isArray(empRes?.data)
        ? empRes.data
        : Array.isArray(empRes?.data?.data)
          ? empRes.data.data
          : Array.isArray(empRes)
            ? empRes
            : [];

      setAttendanceRecords(attList);
      setStats(statRes?.data || statRes || {});
      setEmployees(empList);

      if (!checkInData.employeeId && empList.length > 0) {
        setCheckInData((prev) => ({ ...prev, employeeId: empList[0].id }));
      }
      if (!markData.employeeId && empList.length > 0) {
        setMarkData((prev) => ({ ...prev, employeeId: empList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load attendance records:', err);
      showToast('Failed to load attendance records from database.', true);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      if (statusFilter !== 'All' && record.attendanceStatus !== statusFilter) return false;
      if (departmentFilter !== 'All' && record.employee?.department !== departmentFilter) return false;
      if (employeeFilter !== 'All' && record.employeeId !== employeeFilter) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        record.employee?.fullName?.toLowerCase().includes(q) ||
        record.employee?.employeeCode?.toLowerCase().includes(q) ||
        record.employee?.phone?.includes(q) ||
        record.remarks?.toLowerCase().includes(q) ||
        record.leaveReason?.toLowerCase().includes(q)
      );
    });
  }, [attendanceRecords, search, statusFilter, departmentFilter, employeeFilter]);

  // Execute Quick Check-In
  const handleExecuteCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInData.employeeId) {
      showToast('Please select an employee.', true);
      return;
    }

    try {
      setActionLoading(true);
      const res = await attendanceApi.checkIn(checkInData);
      showToast(res.message || 'Check-in recorded successfully!');
      setShowCheckInModal(false);
      await loadData();
    } catch (err) {
      console.error('Check-in error:', err);
      showToast(err.response?.data?.message || 'Failed to check in.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Check-Out
  const handleExecuteCheckOut = async (record) => {
    if (!window.confirm(`Confirm check-out for ${record.employee?.fullName}?`)) return;

    try {
      setActionLoading(true);
      const res = await attendanceApi.checkOut(record.id);
      showToast(res.message || 'Check-out completed successfully!');
      await loadData();
    } catch (err) {
      console.error('Check-out error:', err);
      showToast(err.response?.data?.message || 'Failed to check out.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Mark / Edit Modal
  const handleOpenMarkModal = (record = null) => {
    if (record) {
      setEditingRecord(record);
      const checkInFormatted = record.checkIn
        ? new Date(record.checkIn).toTimeString().substring(0, 5)
        : '09:00';
      const checkOutFormatted = record.checkOut
        ? new Date(record.checkOut).toTimeString().substring(0, 5)
        : '18:00';

      setMarkData({
        employeeId: record.employeeId,
        attendanceDate: new Date(record.attendanceDate).toISOString().split('T')[0],
        attendanceStatus: record.attendanceStatus,
        checkInTime: checkInFormatted,
        checkOutTime: checkOutFormatted,
        leaveReason: record.leaveReason || '',
        remarks: record.remarks || '',
      });
    } else {
      setEditingRecord(null);
      setMarkData({
        employeeId: employees[0]?.id || '',
        attendanceDate: selectedDate || new Date().toISOString().split('T')[0],
        attendanceStatus: 'Present',
        checkInTime: '09:00',
        checkOutTime: '18:00',
        leaveReason: '',
        remarks: 'Manual HR Entry',
      });
    }
    setShowMarkModal(true);
  };

  // Execute Mark / Update Attendance
  const handleSaveMarkAttendance = async (e) => {
    e.preventDefault();
    if (!markData.employeeId) {
      showToast('Please select an employee.', true);
      return;
    }

    try {
      setActionLoading(true);

      // Build full ISO date strings if time provided
      let checkInIso = undefined;
      let checkOutIso = undefined;

      if (['Present', 'Half Day', 'Late', 'On Duty'].includes(markData.attendanceStatus)) {
        if (markData.checkInTime) {
          checkInIso = new Date(`${markData.attendanceDate}T${markData.checkInTime}:00`).toISOString();
        }
        if (markData.checkOutTime) {
          checkOutIso = new Date(`${markData.attendanceDate}T${markData.checkOutTime}:00`).toISOString();
        }
      }

      if (editingRecord) {
        const res = await attendanceApi.updateAttendance(editingRecord.id, {
          attendanceStatus: markData.attendanceStatus,
          checkIn: checkInIso,
          checkOut: checkOutIso,
          leaveReason: markData.leaveReason,
          remarks: markData.remarks,
        });
        showToast(res.message || 'Attendance record updated.');
      } else {
        const res = await attendanceApi.markAttendance({
          employeeId: markData.employeeId,
          attendanceDate: new Date(markData.attendanceDate).toISOString(),
          attendanceStatus: markData.attendanceStatus,
          checkIn: checkInIso,
          checkOut: checkOutIso,
          leaveReason: markData.leaveReason,
          remarks: markData.remarks,
        });
        showToast(res.message || 'Attendance marked successfully.');
      }

      setShowMarkModal(false);
      await loadData();
    } catch (err) {
      console.error('Mark attendance error:', err);
      showToast(err.response?.data?.message || 'Failed to save attendance.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Attendance Record
  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`Delete attendance record for ${record.employee?.fullName}?`)) return;

    try {
      setActionLoading(true);
      const res = await attendanceApi.deleteAttendance(record.id);
      showToast(res.message || 'Attendance record deleted.');
      await loadData();
    } catch (err) {
      console.error('Delete attendance error:', err);
      showToast(err.response?.data?.message || 'Failed to delete record.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Present
          </span>
        );
      case 'Absent':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <UserX className="w-3 h-3" /> Absent
          </span>
        );
      case 'Half Day':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Half Day
          </span>
        );
      case 'Late':
        return (
          <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" /> Late
          </span>
        );
      case 'Leave':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <Calendar className="w-3 h-3" /> On Leave
          </span>
        );
      case 'On Duty':
        return (
          <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 border border-cyan-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <UserCheck className="w-3 h-3" /> On Duty (Site)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            {status}
          </span>
        );
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
              <Clock className="w-6 h-6 text-brand" />
              Attendance & Workforce Tracking
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Phase 11
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Daily shift check-in, check-out, working hours, and staff availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenMarkModal()}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Calendar className="w-4 h-4 text-gray-500" />
            Mark Attendance
          </button>
          <button
            onClick={() => setShowCheckInModal(true)}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            Quick Check-In
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Present Today</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.presentToday || 0}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Checked-in on duty</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-brand mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Currently Active</span>
            <LogIn className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-2xl font-bold text-brand">{stats.checkedInNow || 0}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Checked-in (open shift)</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Absent Today</span>
            <UserX className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{stats.absentToday || 0}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Unrecorded / Absent</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">On Leave</span>
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.onLeaveToday || 0}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Approved leave records</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Late / Half Day</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {(stats.lateToday || 0) + (stats.halfDayToday || 0)}
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5">{stats.lateToday || 0} Late • {stats.halfDayToday || 0} Half</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-brand mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Overtime Hours</span>
            <TrendingUp className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-2xl font-bold text-brand">{stats.totalOvertimeHours || 0}h</div>
          <div className="text-[9px] text-gray-400 mt-0.5">Avg: {stats.avgWorkingHours || 0}h / staff</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="py-1.5 px-2.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
            />
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-2.5 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold rounded-md transition-colors"
            >
              Today
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Half Day">Half Day</option>
            <option value="Late">Late</option>
            <option value="Leave">On Leave</option>
            <option value="On Duty">On Duty (Field)</option>
          </select>

          {/* Employee Filter */}
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 max-w-[180px]"
          >
            <option value="All">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName} ({emp.employeeCode})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                <th className="p-3">Attendance Date</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Department</th>
                <th className="p-3 text-center">Check-In</th>
                <th className="p-3 text-center">Check-Out</th>
                <th className="p-3 text-center">Working Hours</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-xs text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
                    <div>Loading shift attendance from PostgreSQL...</div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-800">No Attendance Records For Selected Date</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      No shift records logged for {new Date(selectedDate).toLocaleDateString('en-GB')}.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button
                        onClick={() => setShowCheckInModal(true)}
                        className="bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
                      >
                        + Quick Check-In
                      </button>
                      <button
                        onClick={() => handleOpenMarkModal()}
                        className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-200"
                      >
                        Mark Manual Attendance
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const checkInTime = record.checkIn
                    ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    : null;
                  const checkOutTime = record.checkOut
                    ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    : null;

                  const canCheckOut = record.checkIn && !record.checkOut;

                  return (
                    <tr key={record.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 font-medium text-gray-800">
                        {new Date(record.attendanceDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {record.employee?.fullName}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {record.employee?.employeeCode} • {record.employee?.designation}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 font-medium">{record.employee?.department}</td>
                      <td className="p-3 text-center font-mono">
                        {checkInTime ? (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                            {checkInTime}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {checkOutTime ? (
                          <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                            {checkOutTime}
                          </span>
                        ) : canCheckOut ? (
                          <span className="text-amber-700 font-bold animate-pulse text-[11px]">
                            In Progress
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-semibold">
                        {typeof record.workingHours === 'number' && record.workingHours > 0 ? (
                          <div>
                            <span className="text-gray-900">{record.workingHours}h</span>
                            {record.overtimeMinutes > 0 && (
                              <span className="ml-1 text-[10px] text-brand font-bold">
                                (+{Number((record.overtimeMinutes / 60).toFixed(1))}h OT)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">{getStatusBadge(record.attendanceStatus)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canCheckOut && (
                            <button
                              onClick={() => handleExecuteCheckOut(record)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 bg-brand text-white hover:bg-brand-dark text-[11px] font-semibold px-2.5 py-1 rounded shadow-sm transition-colors"
                              title="Complete Shift Check-Out"
                            >
                              <LogOut className="w-3 h-3" /> Check Out
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenMarkModal(record)}
                            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Attendance Record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* MODAL 1: QUICK CHECK-IN */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <LogIn className="w-5 h-5 text-brand" />
                Staff Shift Check-In
              </h3>
              <button
                type="button"
                onClick={() => setShowCheckInModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="checkin-form" onSubmit={handleExecuteCheckIn} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3 bg-brand/5 border border-brand/20 rounded-md text-gray-700">
                Server timestamp will automatically be stamped upon submission.
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={checkInData.employeeId}
                  onChange={(e) => setCheckInData({ ...checkInData, employeeId: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  required
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode}) — {emp.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={checkInData.attendanceDate}
                  onChange={(e) => setCheckInData({ ...checkInData, attendanceDate: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Check-in Remarks / Location</label>
                <input
                  type="text"
                  value={checkInData.remarks}
                  onChange={(e) => setCheckInData({ ...checkInData, remarks: e.target.value })}
                  placeholder="e.g. Office HQ / Guindy Service Center"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>
            </form>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCheckInModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="checkin-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark text-xs shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Recording...' : 'Confirm Check-In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL MARK / EDIT ATTENDANCE */}
      {showMarkModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand" />
                {editingRecord ? 'Edit Attendance Record' : 'Mark Manual Attendance'}
              </h3>
              <button
                type="button"
                onClick={() => setShowMarkModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="mark-form" onSubmit={handleSaveMarkAttendance} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={markData.employeeId}
                  onChange={(e) => setMarkData({ ...markData, employeeId: e.target.value })}
                  disabled={editingRecord !== null}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 disabled:bg-gray-100"
                  required
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode}) — {emp.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Attendance Date <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    disabled={editingRecord !== null}
                    value={markData.attendanceDate}
                    onChange={(e) => setMarkData({ ...markData, attendanceDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Shift Status <span className="text-rose-500">*</span></label>
                  <select
                    value={markData.attendanceStatus}
                    onChange={(e) => setMarkData({ ...markData, attendanceStatus: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  >
                    <option value="Present">Present (Full Day)</option>
                    <option value="Absent">Absent</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Late">Late Arrival</option>
                    <option value="Leave">On Leave</option>
                    <option value="On Duty">On Duty (Client Site)</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Week Off">Week Off</option>
                  </select>
                </div>
              </div>

              {['Present', 'Half Day', 'Late', 'On Duty'].includes(markData.attendanceStatus) && (
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Check-In Time</label>
                    <input
                      type="time"
                      value={markData.checkInTime}
                      onChange={(e) => setMarkData({ ...markData, checkInTime: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Check-Out Time</label>
                    <input
                      type="time"
                      value={markData.checkOutTime}
                      onChange={(e) => setMarkData({ ...markData, checkOutTime: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    />
                  </div>
                </div>
              )}

              {['Leave', 'Absent'].includes(markData.attendanceStatus) && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Leave Reason / Note</label>
                  <input
                    type="text"
                    value={markData.leaveReason}
                    onChange={(e) => setMarkData({ ...markData, leaveReason: e.target.value })}
                    placeholder="e.g. Medical emergency / Personal leave"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={markData.remarks}
                  onChange={(e) => setMarkData({ ...markData, remarks: e.target.value })}
                  placeholder="Optional attendance remarks"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>
            </form>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowMarkModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="mark-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark text-xs shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : editingRecord ? 'Update Record' : 'Mark Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
