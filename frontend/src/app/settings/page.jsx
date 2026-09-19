'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Sliders,
  DollarSign,
  Percent,
  Calendar,
  Bell,
  Shield,
  FileText,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Activity,
  Search,
  Filter,
  Layers,
  Database,
  Lock,
} from 'lucide-react';
import { systemSettingsApi } from '../../lib/api/client';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [error, setError] = useState(null);

  // Company Settings
  const [companyForm, setCompanyForm] = useState({
    companyName: 'FREEZE TECHNOLOGY',
    subTitle: 'Air Conditioning & Refrigeration Sales & Service',
    gstNumber: '33BKCPD7319A2ZU',
    brandAuth: 'Panasonic Authorised Sales & Service',
    regdOffice: 'C15, 1st Cross Street, PTC Quarters, Thoraipakkam, OMR, Chennai - 600 097',
    phone: '044-35723836',
    cell: '9884955011',
    email: 'freezetechnology.ft@gmail.com',
    bankName: 'Axis Bank',
    bankBranch: 'Thoraipakkam',
    bankAccountNo: '915020010100166',
    ifscCode: 'UTIB0001566',
  });

  // System Settings grouped
  const [systemSettingsGrouped, setSystemSettingsGrouped] = useState({});
  const [allSettingsMap, setAllSettingsMap] = useState({});

  // Audit Logs tab state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditModuleFilter, setAuditModuleFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, sysRes] = await Promise.all([
        systemSettingsApi.getCompanySettings().catch(() => null),
        systemSettingsApi.getSystemSettings().catch(() => ({ grouped: {}, settings: [] })),
      ]);

      if (compRes) setCompanyForm(compRes);
      setSystemSettingsGrouped(sysRes.grouped || {});

      const map = {};
      (sysRes.settings || []).forEach((s) => {
        map[s.key] = s.value;
      });
      setAllSettingsMap(map);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Unable to load master settings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await systemSettingsApi.getAuditLogs({
        page: String(auditPage),
        limit: '20',
        moduleName: auditModuleFilter || undefined,
        search: auditSearch || undefined,
      });
      setAuditLogs(res.items || []);
      setAuditTotal(res.total || 0);
      setAuditTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, auditPage, auditModuleFilter]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await systemSettingsApi.updateCompanySettings(companyForm);
      showToast('Company profile & bank parameters saved successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save company profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSingleSetting = async (key, value) => {
    setSaving(true);
    try {
      await systemSettingsApi.updateSystemSetting(key, value);
      setAllSettingsMap((prev) => ({ ...prev, [key]: value }));
      showToast(`Setting "${key}" updated.`);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to update setting "${key}".`);
    } finally {
      setSaving(false);
    }
  };

  const handleAuditSearchSubmit = (e) => {
    e.preventDefault();
    setAuditPage(1);
    fetchAuditLogs();
  };

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'finance', label: 'Finance & Tax', icon: DollarSign },
    { id: 'operations', label: 'Operations & Inventory', icon: Layers },
    { id: 'payroll', label: 'Payroll Configuration', icon: Calendar },
    { id: 'notifications', label: 'Alerts & Security', icon: Bell },
    { id: 'audit', label: 'Audit Trail & Logs', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              System Administration
            </span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Master Configuration
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & System Administration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage company legal entities, tax parameters, operational thresholds, and inspect global audit logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchSettings();
              if (activeTab === 'audit') fetchAuditLogs();
            }}
            disabled={loading}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. COMPANY PROFILE */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Legal Enterprise Profile & Header Branding</h2>
              <p className="text-xs text-slate-500 mt-0.5">Parameters printed on GST tax invoices, quotes, AMC contracts, and PM service cards</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Company Profile
            </button>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="w-16 h-16 bg-white rounded-lg p-1.5 border border-slate-200 flex items-center justify-center shadow-xs flex-shrink-0">
              <img
                src="/logo.png"
                alt="Freeze Technology Brand Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Freeze Technology Brand Mark</h3>
              <p className="text-xs text-slate-500 mt-0.5">Primary vector & high-resolution transparent logo used on Invoices, Quotations, Job Cards, and App Header.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Company Legal Trade Name *</label>
              <input
                type="text"
                required
                value={companyForm.companyName}
                onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Subtitle / Line of Business *</label>
              <input
                type="text"
                required
                value={companyForm.subTitle}
                onChange={(e) => setCompanyForm({ ...companyForm, subTitle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">GSTIN (15-Digit GST Number) *</label>
              <input
                type="text"
                required
                value={companyForm.gstNumber}
                onChange={(e) => setCompanyForm({ ...companyForm, gstNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">OEM Brand Authorization Notice *</label>
              <input
                type="text"
                required
                value={companyForm.brandAuth}
                onChange={(e) => setCompanyForm({ ...companyForm, brandAuth: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Registered Head Office Address *</label>
              <textarea
                rows={2}
                required
                value={companyForm.regdOffice}
                onChange={(e) => setCompanyForm({ ...companyForm, regdOffice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Office Landline *</label>
              <input
                type="text"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Support Mobile *</label>
              <input
                type="text"
                value={companyForm.cell}
                onChange={(e) => setCompanyForm({ ...companyForm, cell: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Official Email *</label>
              <input
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Bank Details Section */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Settlement Bank & NEFT/RTGS Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Bank Name</label>
                <input
                  type="text"
                  value={companyForm.bankName}
                  onChange={(e) => setCompanyForm({ ...companyForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Branch</label>
                <input
                  type="text"
                  value={companyForm.bankBranch}
                  onChange={(e) => setCompanyForm({ ...companyForm, bankBranch: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Account Number</label>
                <input
                  type="text"
                  value={companyForm.bankAccountNo}
                  onChange={(e) => setCompanyForm({ ...companyForm, bankAccountNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={companyForm.ifscCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, ifscCode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB CONTENT: 2. FINANCE & TAX */}
      {activeTab === 'finance' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Financial & Tax Slabs Parameters</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure default GST rate, payment terms, and default SAC/HSN codes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Default GST Percentage</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={allSettingsMap['TAX_DEFAULT_GST_RATE'] || '18'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, TAX_DEFAULT_GST_RATE: e.target.value })}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-base font-bold text-slate-900 bg-white"
                />
                <span className="text-sm font-bold text-slate-700">% (IGST 18% / CGST 9% + SGST 9%)</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSingleSetting('TAX_DEFAULT_GST_RATE', allSettingsMap['TAX_DEFAULT_GST_RATE'] || '18')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
              >
                Update Default GST
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Standard Payment Terms</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={allSettingsMap['FINANCE_PAYMENT_TERMS_DAYS'] || '15'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, FINANCE_PAYMENT_TERMS_DAYS: e.target.value })}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-base font-bold text-slate-900 bg-white"
                />
                <span className="text-sm font-bold text-slate-700">Days from invoice date</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSingleSetting('FINANCE_PAYMENT_TERMS_DAYS', allSettingsMap['FINANCE_PAYMENT_TERMS_DAYS'] || '15')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
              >
                Update Payment Term
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Default SAC Code (Services)</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={allSettingsMap['TAX_HSN_AC_SERVICES'] || '998719'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, TAX_HSN_AC_SERVICES: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSingleSetting('TAX_HSN_AC_SERVICES', allSettingsMap['TAX_HSN_AC_SERVICES'] || '998719')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
              >
                Update SAC Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. OPERATIONS & INVENTORY */}
      {activeTab === 'operations' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Operations & Inventory Thresholds</h2>
            <p className="text-xs text-slate-500 mt-0.5">Parameters governing stock reorder warnings and automatic inventory consumption</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Default Reorder Warning Level</h3>
              <p className="text-xs text-slate-500">Products with stock quantity falling below this unit count trigger automated low-stock warnings.</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={allSettingsMap['INVENTORY_DEFAULT_REORDER_LEVEL'] || '5'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, INVENTORY_DEFAULT_REORDER_LEVEL: e.target.value })}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateSingleSetting('INVENTORY_DEFAULT_REORDER_LEVEL', allSettingsMap['INVENTORY_DEFAULT_REORDER_LEVEL'] || '5')}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                >
                  Save Level
                </button>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Preventive Maintenance Spare Consumption</h3>
              <p className="text-xs text-slate-500">Automatically decrement spare parts from warehouse inventory upon completing a PM visit checklist.</p>
              <div className="flex items-center gap-3">
                <select
                  value={allSettingsMap['INVENTORY_AUTO_DEDUCT_ON_PM'] || 'true'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, INVENTORY_AUTO_DEDUCT_ON_PM: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                >
                  <option value="true">Enabled (Atomic deduction)</option>
                  <option value="false">Disabled (Manual adjustment)</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleUpdateSingleSetting('INVENTORY_AUTO_DEDUCT_ON_PM', allSettingsMap['INVENTORY_AUTO_DEDUCT_ON_PM'] || 'true')}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                >
                  Save Setting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. PAYROLL CONFIGURATION */}
      {activeTab === 'payroll' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Payroll Calculation Constants</h2>
            <p className="text-xs text-slate-500 mt-0.5">Parameters applied during automated salary calculations and overtime processing</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Standard Shift Duration</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={allSettingsMap['PAYROLL_STANDARD_HOURS_PER_DAY'] || '8'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, PAYROLL_STANDARD_HOURS_PER_DAY: e.target.value })}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                />
                <span className="text-xs text-slate-600">Hours / day</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSingleSetting('PAYROLL_STANDARD_HOURS_PER_DAY', allSettingsMap['PAYROLL_STANDARD_HOURS_PER_DAY'] || '8')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
              >
                Save Hours
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Overtime Rate Multiplier</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={allSettingsMap['PAYROLL_OVERTIME_RATE_MULTIPLIER'] || '1.5'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, PAYROLL_OVERTIME_RATE_MULTIPLIER: e.target.value })}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                />
                <span className="text-xs text-slate-600">x Hourly rate</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSingleSetting('PAYROLL_OVERTIME_RATE_MULTIPLIER', allSettingsMap['PAYROLL_OVERTIME_RATE_MULTIPLIER'] || '1.5')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
              >
                Save Multiplier
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Monthly Cutoff Day</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={allSettingsMap['PAYROLL_CUTOFF_DAY_OF_MONTH'] || '25'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, PAYROLL_CUTOFF_DAY_OF_MONTH: e.target.value })}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                />
                <span className="text-xs text-slate-600">th of each month</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSingleSetting('PAYROLL_CUTOFF_DAY_OF_MONTH', allSettingsMap['PAYROLL_CUTOFF_DAY_OF_MONTH'] || '25')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
              >
                Save Cutoff Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. NOTIFICATIONS & SECURITY */}
      {activeTab === 'notifications' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Alerts Lead Time & Security Policies</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure automated alert lead days and authentication session policy</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">AMC Expiry Warning Lead</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={allSettingsMap['NOTIFICATIONS_AMC_EXPIRY_WARNING_DAYS'] || '30'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, NOTIFICATIONS_AMC_EXPIRY_WARNING_DAYS: e.target.value })}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                />
                <span className="text-xs text-slate-600">Days ahead</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSingleSetting('NOTIFICATIONS_AMC_EXPIRY_WARNING_DAYS', allSettingsMap['NOTIFICATIONS_AMC_EXPIRY_WARNING_DAYS'] || '30')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
              >
                Save AMC Lead Days
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Warranty Expiry Warning Lead</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={allSettingsMap['NOTIFICATIONS_WARRANTY_EXPIRY_DAYS'] || '30'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, NOTIFICATIONS_WARRANTY_EXPIRY_DAYS: e.target.value })}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                />
                <span className="text-xs text-slate-600">Days ahead</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSingleSetting('NOTIFICATIONS_WARRANTY_EXPIRY_DAYS', allSettingsMap['NOTIFICATIONS_WARRANTY_EXPIRY_DAYS'] || '30')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
              >
                Save Warranty Lead Days
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">JWT Session Inactivity Timeout</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={allSettingsMap['SECURITY_SESSION_TIMEOUT_MINUTES'] || '60'}
                  onChange={(e) => setAllSettingsMap({ ...allSettingsMap, SECURITY_SESSION_TIMEOUT_MINUTES: e.target.value })}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                />
                <span className="text-xs text-slate-600">Minutes</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSingleSetting('SECURITY_SESSION_TIMEOUT_MINUTES', allSettingsMap['SECURITY_SESSION_TIMEOUT_MINUTES'] || '60')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
              >
                Save Session Timeout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. AUDIT TRAIL & LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">System Transaction & Security Audit Trail</h2>
              <p className="text-xs text-slate-500 mt-0.5">Immutable audit log records with actor identity, action type, and details</p>
            </div>

            <form onSubmit={handleAuditSearchSubmit} className="flex items-center gap-3">
              <select
                value={auditModuleFilter}
                onChange={(e) => {
                  setAuditModuleFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Modules</option>
                <option value="USERS">USERS</option>
                <option value="ROLES">ROLES</option>
                <option value="SETTINGS">SETTINGS</option>
                <option value="NOTIFICATIONS">NOTIFICATIONS</option>
                <option value="INVOICES">INVOICES</option>
                <option value="PAYABLES">PAYABLES</option>
                <option value="PAYROLL">PAYROLL</option>
              </select>

              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Transaction Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      No audit log records found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{log.user?.fullName || 'System'}</div>
                        <div className="text-[10px] text-slate-400">{log.user?.email || 'automated'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                          {log.moduleName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : log.action === 'UPDATE' || log.action === 'UPDATE_COMPANY'
                              ? 'bg-blue-50 text-blue-700'
                              : log.action === 'DEACTIVATE'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 break-all max-w-md">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Total <span className="font-bold text-slate-800">{auditTotal}</span> audit log entries recorded
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={auditPage <= 1}
                className="px-3 py-1.5 border border-slate-300 rounded disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-1 font-semibold text-slate-700">
                {auditPage} / {auditTotalPages}
              </span>
              <button
                onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                disabled={auditPage >= auditTotalPages}
                className="px-3 py-1.5 border border-slate-300 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
