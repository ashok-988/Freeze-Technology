'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  Clock,
  Briefcase,
  Wrench,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Trash2,
  Edit3,
  Eye,
  X,
  UserCheck,
  UserX,
  Shield,
  Clock3,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { employeeApi } from '../../lib/api/client';

export default function EmployeesPage() {
  // State
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    techniciansCount: 0,
    departmentsCount: 0,
    newThisMonth: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals & Drawers
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    designation: 'Senior AC Technician',
    department: 'Service & Operations',
    employmentType: 'Full-Time',
    phone: '',
    email: '',
    address: '',
    salary: 25000,
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, statRes] = await Promise.all([
        employeeApi.getEmployees(),
        employeeApi.getStats(),
      ]);

      const empList = Array.isArray(empRes?.data)
        ? empRes.data
        : Array.isArray(empRes?.data?.data)
          ? empRes.data.data
          : Array.isArray(empRes)
            ? empRes
            : [];

      setEmployees(empList);
      setStats(statRes?.data || statRes || {});
    } catch (err) {
      console.error('Failed to load employees:', err);
      showToast('Failed to load employee records from database.', true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered List
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (statusFilter !== 'All' && emp.status !== statusFilter) return false;
      if (departmentFilter !== 'All' && emp.department !== departmentFilter) return false;
      if (employmentTypeFilter !== 'All' && emp.employmentType !== employmentTypeFilter) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        emp.fullName?.toLowerCase().includes(q) ||
        emp.employeeCode?.toLowerCase().includes(q) ||
        emp.phone?.includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.designation?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q)
      );
    });
  }, [employees, search, departmentFilter, employmentTypeFilter, statusFilter]);

  // Open Create / Edit Modal
  const handleOpenModal = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        fullName: employee.fullName || '',
        designation: employee.designation || 'Senior AC Technician',
        department: employee.department || 'Service & Operations',
        employmentType: employee.employmentType || 'Full-Time',
        phone: employee.phone || '',
        email: employee.email || '',
        address: employee.address || '',
        salary: employee.salary || 25000,
        joiningDate: employee.joiningDate
          ? new Date(employee.joiningDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        status: employee.status || 'ACTIVE',
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        fullName: '',
        designation: 'Senior AC Technician',
        department: 'Service & Operations',
        employmentType: 'Full-Time',
        phone: '',
        email: '',
        address: '',
        salary: 25000,
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
      });
    }
    setShowEmployeeModal(true);
  };

  // Date normalization helper
  const normalizeDateToIso = (dateStr) => {
    if (!dateStr) return undefined;
    if (typeof dateStr !== 'string') return undefined;
    const trimmed = dateStr.trim();
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return trimmed;
  };

  // Submit Save / Update Employee
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!formData.fullName?.trim() || !formData.phone?.trim() || !formData.designation?.trim()) {
      showToast('Full name, phone, and designation are required.', true);
      return;
    }

    const payload = {
      fullName: formData.fullName.trim(),
      designation: formData.designation.trim(),
      department: formData.department?.trim() || 'Service & Operations',
      employmentType: formData.employmentType || 'Full-Time',
      phone: formData.phone.trim(),
      email: formData.email?.trim() || undefined,
      address: formData.address?.trim() || undefined,
      salary:
        typeof formData.salary === 'number' && !isNaN(formData.salary)
          ? formData.salary
          : parseFloat(formData.salary) || 25000,
      joiningDate: normalizeDateToIso(formData.joiningDate),
      status: formData.status || 'ACTIVE',
    };

    console.log('EMPLOYEE CREATE PAYLOAD:', payload);

    try {
      setActionLoading(true);
      if (editingEmployee) {
        const res = await employeeApi.updateEmployee(editingEmployee.id, payload);
        showToast(res.message || `Employee "${payload.fullName}" updated successfully.`);
      } else {
        const res = await employeeApi.createEmployee(payload);
        showToast(res.message || `Employee created successfully with code ${res.data?.employeeCode || ''}.`);
      }

      setShowEmployeeModal(false);
      await loadData();
    } catch (err) {
      console.error('EMPLOYEE CREATE ERROR:', {
        status: err?.response?.status,
        data: err?.response?.data,
        headers: err?.response?.headers,
        message: err?.message,
      });

      let errorMsg = 'Failed to save employee in database.';
      if (err.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          errorMsg = err.response.data.message.join('; ');
        } else {
          errorMsg = String(err.response.data.message);
        }
      } else if (err.response?.data?.error) {
        errorMsg = String(err.response.data.error);
      } else if (err.message) {
        errorMsg = err.message;
      }

      showToast(errorMsg, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Detail Drawer
  const handleOpenDetail = async (emp) => {
    try {
      setDetailLoading(true);
      setShowDetailDrawer(true);
      const res = await employeeApi.getEmployeeById(emp.id);
      setSelectedEmployee(res?.data || emp);
    } catch (err) {
      console.error('Failed to load employee details:', err);
      setSelectedEmployee(emp);
    } finally {
      setDetailLoading(false);
    }
  };

  // Toggle Activation
  const handleToggleStatus = async (emp) => {
    const actionLabel = emp.status === 'ACTIVE' ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionLabel} employee "${emp.fullName}" (${emp.employeeCode})?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await employeeApi.deleteEmployee(emp.id);
      showToast(res.message || `Employee status updated.`);
      await loadData();
      if (selectedEmployee?.id === emp.id) {
        setSelectedEmployee({
          ...selectedEmployee,
          status: emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        });
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      showToast(err.response?.data?.message || 'Failed to update employee status.', true);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in ${toastMessage.isError ? 'bg-rose-600 text-white' : 'bg-brand text-white'
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
              <Users className="w-6 h-6 text-brand" />
              Employee & Workforce Management
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Phase 11
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Employee master, technician directory, workforce status, and staff administration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Clock3 className="w-4 h-4 text-gray-500" />
            Shift Attendance
          </Link>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Employees</span>
            <Users className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees || employees.length}</div>
          <div className="text-[10px] text-gray-400 mt-1">
            {stats.departmentsCount || 1} Departments active
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Active Staff</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.activeEmployees || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">
            {stats.inactiveEmployees || 0} Deactivated / On Notice
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-brand mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Field Technicians</span>
            <Wrench className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-brand">{stats.techniciansCount || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Assigned to Services & AMC</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Joined This Month</span>
            <Calendar className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.newThisMonth || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">New workforce additions</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name, code, phone, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 placeholder-gray-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Department Filter */}
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

          {/* Employment Type */}
          <select
            value={employmentTypeFilter}
            onChange={(e) => setEmploymentTypeFilter(e.target.value)}
            className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
          >
            <option value="All">All Employment Types</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Contract">Contract</option>
            <option value="Intern">Intern</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
          >
            <option value="All">All Statuses</option>
            <option value="ACTIVE">Active Staff</option>
            <option value="INACTIVE">Inactive / Resigned</option>
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                <th className="p-3">Employee Code</th>
                <th className="p-3">Employee Name</th>
                <th className="p-3">Designation</th>
                <th className="p-3">Department</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Employment Type</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-xs text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
                    <div>Loading workforce records from PostgreSQL...</div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-800">No Employees Found</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      {search || departmentFilter !== 'All' || statusFilter !== 'All'
                        ? 'No employees match the selected search or filter criteria.'
                        : 'No employees registered in the system yet. Click "Add Employee" to create one.'}
                    </p>
                    <button
                      onClick={() => handleOpenModal()}
                      className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
                    >
                      Add Employee
                    </button>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isTech =
                    emp.designation?.toLowerCase().includes('technician') ||
                    emp.designation?.toLowerCase().includes('specialist') ||
                    emp.designation?.toLowerCase().includes('engineer');

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-mono font-bold text-brand flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-brand" />
                          {emp.employeeCode}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {emp.fullName}
                          {isTech && (
                            <span className="inline-flex items-center text-[9px] bg-cyan-50 text-cyan-700 border border-cyan-200 px-1.5 py-0.2 rounded font-bold">
                              Tech
                            </span>
                          )}
                        </div>
                        {emp.email && <div className="text-[10px] text-gray-400 truncate max-w-[180px]">{emp.email}</div>}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-800">{emp.designation}</div>
                        <div className="text-[10px] text-gray-400">
                          Joined {new Date(emp.joiningDate).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 font-medium">{emp.department}</td>
                      <td className="p-3">
                        <div className="font-mono text-gray-800">{emp.phone}</div>
                        {emp.address && (
                          <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{emp.address}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {emp.employmentType || 'Full-Time'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {emp.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            <UserX className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(emp)}
                            className="p-1 text-gray-600 hover:text-brand hover:bg-brand/10 rounded"
                            title="View Employee Profile & History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(emp)}
                            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Employee"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(emp)}
                            className={`p-1 rounded ${emp.status === 'ACTIVE'
                                ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            title={emp.status === 'ACTIVE' ? 'Deactivate Employee' : 'Activate Employee'}
                          >
                            {emp.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
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

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand" />
                {editingEmployee ? 'Edit Employee Record' : 'Add New Employee'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEmployeeModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form id="employee-form" onSubmit={handleSaveEmployee} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Venkatesh"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Designation / Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior AC Technician"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  >
                    <option value="Service & Operations">Service & Operations</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="Management & Admin">Management & Admin</option>
                    <option value="Finance & Accounts">Finance & Accounts</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98849 55011"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="suresh@freezetechnology.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. No. 12, Thoraipakkam, OMR, Chennai"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>

              {editingEmployee && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Employee Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  >
                    <option value="ACTIVE">ACTIVE (Ready for Work / Job Card Assignment)</option>
                    <option value="INACTIVE">INACTIVE (Deactivated / Not Available)</option>
                  </select>
                </div>
              )}
            </form>

            {/* Modal Fixed / Sticky Action Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="employee-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark text-xs shadow-sm transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Save Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE DETAIL & HISTORY DRAWER */}
      {showDetailDrawer && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white border-l border-gray-200 h-full overflow-y-auto p-6 space-y-6 shadow-2xl text-xs animate-in slide-in-from-right">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{selectedEmployee.fullName}</h3>
                  <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                    {selectedEmployee.employeeCode}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {selectedEmployee.designation} • {selectedEmployee.department}
                </div>
              </div>
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                EMPLOYEE MASTER PROFILE
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 block">Phone</span>
                  <span className="font-semibold text-gray-900">{selectedEmployee.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Email</span>
                  <span className="font-semibold text-gray-900">{selectedEmployee.email || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Employment Type</span>
                  <span className="font-semibold text-gray-900">{selectedEmployee.employmentType || 'Full-Time'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Joining Date</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(selectedEmployee.joiningDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {selectedEmployee.address && (
                  <div className="col-span-2">
                    <span className="text-gray-500 block">Address</span>
                    <span className="text-gray-900">{selectedEmployee.address}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 block">Status</span>
                  <span className="font-semibold">
                    {selectedEmployee.status === 'ACTIVE' ? (
                      <span className="text-emerald-700">ACTIVE</span>
                    ) : (
                      <span className="text-rose-700">INACTIVE</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Operational Assignment Statistics */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                CROSS-MODULE OPERATIONAL ASSIGNMENTS
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded p-3 text-center shadow-sm">
                  <div className="text-lg font-bold text-brand">
                    {selectedEmployee.jobCards?.length || selectedEmployee._count?.jobCards || 0}
                  </div>
                  <div className="text-[10px] text-gray-500">Service Job Cards</div>
                </div>
                <div className="bg-white border border-gray-200 rounded p-3 text-center shadow-sm">
                  <div className="text-lg font-bold text-cyan-700">
                    {selectedEmployee.amcVisits?.length || selectedEmployee._count?.amcVisits || 0}
                  </div>
                  <div className="text-[10px] text-gray-500">AMC Visits</div>
                </div>
                <div className="bg-white border border-gray-200 rounded p-3 text-center shadow-sm">
                  <div className="text-lg font-bold text-emerald-700">
                    {selectedEmployee.installations?.length || selectedEmployee._count?.installations || 0}
                  </div>
                  <div className="text-[10px] text-gray-500">Installations</div>
                </div>
              </div>
            </div>

            {/* Recent Attendance History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center justify-between">
                <span>RECENT ATTENDANCE LOGS</span>
                <Link href={`/attendance?employeeId=${selectedEmployee.id}`} className="text-brand hover:underline font-semibold text-[11px] flex items-center gap-0.5">
                  View Full <ArrowUpRight className="w-3 h-3" />
                </Link>
              </h4>

              {detailLoading ? (
                <div className="p-4 text-center text-gray-500">Loading history...</div>
              ) : !selectedEmployee.attendance || selectedEmployee.attendance.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center text-gray-500">
                  No attendance logged yet for this employee.
                </div>
              ) : (
                <div className="border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                        <th className="p-2">Date</th>
                        <th className="p-2">Check In</th>
                        <th className="p-2">Check Out</th>
                        <th className="p-2">Duration</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedEmployee.attendance.slice(0, 5).map((att) => (
                        <tr key={att.id}>
                          <td className="p-2 font-medium">
                            {new Date(att.attendanceDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="p-2 text-gray-600">
                            {att.checkIn ? new Date(att.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="p-2 text-gray-600">
                            {att.checkOut ? new Date(att.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="p-2 font-semibold text-gray-900">
                            {typeof att.workingHours === 'number' ? `${att.workingHours}h` : '-'}
                          </td>
                          <td className="p-2 text-center">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {att.attendanceStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowDetailDrawer(false);
                  handleOpenModal(selectedEmployee);
                }}
                className="flex-1 bg-brand text-white hover:bg-brand-dark py-2 rounded font-semibold text-xs transition-colors text-center"
              >
                Edit Employee Details
              </button>
              <button
                onClick={() => handleToggleStatus(selectedEmployee)}
                className={`py-2 px-4 rounded font-semibold text-xs border transition-colors ${selectedEmployee.status === 'ACTIVE'
                    ? 'border-gray-300 text-rose-600 hover:bg-rose-50'
                    : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                  }`}
              >
                {selectedEmployee.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
