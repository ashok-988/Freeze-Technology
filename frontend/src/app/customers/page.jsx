'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { customerApi } from '../../lib/api/client';
import {
  Users,
  Building2,
  User,
  FileCheck,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
  Wrench,
  ShieldCheck,
  Receipt,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ total: 0, commercial: 0, retail: 0, gstRegistered: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [activeCustomer, setActiveCustomer] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    companyName: '',
    customerType: 'Commercial',
    mobile: '',
    alternateMobile: '',
    email: '',
    gstNumber: '',
    address: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600097',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedType !== 'All') params.type = selectedType;

      const [custListRes, statsRes] = await Promise.allSettled([
        customerApi.getCustomers(params),
        customerApi.getStats(),
      ]);

      let loadedCustomers = [];
      if (custListRes.status === 'fulfilled' && custListRes.value?.data) {
        loadedCustomers = custListRes.value.data;
        setCustomers(loadedCustomers);
      } else if (custListRes.status === 'rejected') {
        throw custListRes.reason;
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      } else {
        // Fallback stats computation from loaded dataset
        setStats({
          total: loadedCustomers.length,
          commercial: loadedCustomers.filter((c) => c.customerType === 'Commercial').length,
          retail: loadedCustomers.filter((c) => c.customerType === 'Retail').length,
          gstRegistered: loadedCustomers.filter((c) => !!c.gstNumber).length,
        });
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('Unable to load customer directory. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedType]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const validateForm = () => {
    const errors = {};
    if (!formData.customerName.trim()) {
      errors.customerName = 'Customer or Company Name is required';
    }
    if (!formData.mobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (!/^[0-9+ -]{10,15}$/.test(formData.mobile.trim())) {
      errors.mobile = 'Enter a valid 10-digit mobile number';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!formData.address.trim()) {
      errors.address = 'Street address is required';
    }
    if (!formData.pincode.trim() || !/^[0-9]{6}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Enter a valid 6-digit pincode';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await customerApi.createCustomer(formData);
      if (res && res.success) {
        showToast('Customer created and persisted successfully!');
        setShowAddModal(false);
        resetForm();
        await fetchCustomers();
      } else {
        throw new Error(res?.message || 'Failed to save customer');
      }
    } catch (err) {
      console.error('Create customer failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to create customer';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!validateForm() || !activeCustomer) return;

    setSubmitting(true);
    try {
      const res = await customerApi.updateCustomer(activeCustomer.id, formData);
      if (res && res.success) {
        showToast('Customer profile updated successfully!');
        setShowEditModal(false);
        setActiveCustomer(null);
        resetForm();
        await fetchCustomers();
      } else {
        throw new Error(res?.message || 'Failed to update customer');
      }
    } catch (err) {
      console.error('Update customer failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to update customer';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!activeCustomer) return;
    setSubmitting(true);
    try {
      const res = await customerApi.deleteCustomer(activeCustomer.id);
      if (res && res.success) {
        showToast('Customer archived successfully.');
        setShowDeleteModal(false);
        setActiveCustomer(null);
        await fetchCustomers();
      } else {
        throw new Error(res?.message || 'Failed to delete customer');
      }
    } catch (err) {
      console.error('Delete customer failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to delete customer';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (customer) => {
    setActiveCustomer(customer);
    setFormData({
      customerName: customer.customerName || '',
      companyName: customer.companyName || '',
      customerType: customer.customerType || 'Commercial',
      mobile: customer.mobile || '',
      alternateMobile: customer.alternateMobile || '',
      email: customer.email || '',
      gstNumber: customer.gstNumber || '',
      address: customer.address || '',
      city: customer.city || 'Chennai',
      state: customer.state || 'Tamil Nadu',
      pincode: customer.pincode || '600097',
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const openDeleteModal = (customer) => {
    setActiveCustomer(customer);
    setShowDeleteModal(true);
  };

  const openDetailModal = async (customer) => {
    setActiveCustomer(customer);
    setShowDetailModal(true);
    setDetailTab('overview');
    try {
      const res = await customerApi.getCustomerById(customer.id);
      if (res && res.data) {
        setDetailCustomer(res.data);
      }
    } catch {
      setDetailCustomer(customer);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      companyName: '',
      customerType: 'Commercial',
      mobile: '',
      alternateMobile: '',
      email: '',
      gstNumber: '',
      address: '',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600097',
    });
    setFormErrors({});
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 text-white transition-all ${toastMessage.type === 'error' ? 'bg-red-600' : 'bg-brand'
            }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customer Management (CRM)</h2>
          <p className="text-xs text-gray-500 mt-1">
            Directory of Commercial & Retail clients, GSTIN tracking, and HVAC service records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Total Directory</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-brand flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</div>
          <div className="text-[11px] text-gray-400 mt-1">Active client profiles</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Commercial Clients</span>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.commercial}</div>
          <div className="text-[11px] text-gray-400 mt-1">Hospitals, Salons & Corporate</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Retail Customers</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.retail}</div>
          <div className="text-[11px] text-gray-400 mt-1">Residential & Individual</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">GST Registered</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.gstRegistered}</div>
          <div className="text-[11px] text-gray-400 mt-1">B2B GST compliant accounts</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Name, Phone, Code, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-canvas border border-gray-200 rounded-md text-xs outline-none focus:border-brand transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex bg-canvas p-1 rounded-md border border-gray-200 text-xs">
            {['All', 'Commercial', 'Retail'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded font-medium transition ${selectedType === type
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={fetchCustomers}
            title="Refresh Directory"
            className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand mb-2" />
            Loading customer directory...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="font-semibold text-gray-900 mb-1">{error}</div>
            <button
              onClick={fetchCustomers}
              className="mt-3 bg-brand text-white px-3 py-1.5 rounded text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-xs">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="font-bold text-gray-900 text-sm mb-1">No customers found</div>
            <p className="text-gray-500 max-w-sm mx-auto mb-4">
              {search || selectedType !== 'All'
                ? 'No customer matched your search or filter criteria.'
                : 'Get started by creating your first customer profile.'}
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-brand text-white px-4 py-2 rounded text-xs font-semibold hover:bg-brand-dark transition"
            >
              Add Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-200">
                  <th className="p-3.5 whitespace-nowrap">Customer Code</th>
                  <th className="p-3.5">Name / Company</th>
                  <th className="p-3.5 whitespace-nowrap">Type</th>
                  <th className="p-3.5 whitespace-nowrap">Mobile Contact</th>
                  <th className="p-3.5 whitespace-nowrap">GSTIN</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition">
                    <td className="p-3.5 font-bold text-brand whitespace-nowrap">
                      {c.customerCode || 'CUST-000'}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-gray-900">{c.customerName}</div>
                      {c.companyName && (
                        <div className="text-[11px] text-gray-400">{c.companyName}</div>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${c.customerType === 'Commercial'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}
                      >
                        {c.customerType}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-medium text-gray-800">{c.mobile}</div>
                      {c.email && (
                        <div className="text-[11px] text-gray-400">{c.email}</div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-gray-700 whitespace-nowrap">
                      {c.gstNumber || <span className="text-gray-400 font-sans">N/A</span>}
                    </td>
                    <td className="p-3.5 text-gray-600 max-w-[220px] truncate" title={c.address}>
                      {c.address}, {c.city || 'Chennai'}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetailModal(c)}
                          title="View Profile & History"
                          className="p-1.5 text-gray-500 hover:text-brand hover:bg-brand/10 rounded transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Customer"
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(c)}
                          title="Archive Customer"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand" /> Add New Customer
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Customer / Enterprise Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Super Specialty Hospital or Ramesh Kumar"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className={`w-full p-2 border rounded-md outline-none focus:border-brand ${formErrors.customerName ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {formErrors.customerName && (
                  <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.customerName}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Customer Type *
                  </label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand bg-white"
                  >
                    <option value="Commercial">Commercial (Business/Org)</option>
                    <option value="Retail">Retail (Individual/Home)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Parent organization"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    placeholder="10-digit mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand ${formErrors.mobile ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {formErrors.mobile && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.mobile}</span>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Alternate Phone
                  </label>
                  <input
                    type="text"
                    placeholder="Landline / Alternate"
                    value={formData.alternateMobile}
                    onChange={(e) => setFormData({ ...formData, alternateMobile: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="contact@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand ${formErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {formErrors.email && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.email}</span>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    GSTIN Number (15 digits)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 33AAACA9876E1Z1"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Street Address *
                </label>
                <textarea
                  rows={2}
                  placeholder="Plot/Door No, Building, Street, Area"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full p-2 border rounded-md outline-none focus:border-brand ${formErrors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {formErrors.address && (
                  <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.address}</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Pincode *</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand ${formErrors.pincode ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {formErrors.pincode && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.pincode}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-dark font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-brand" /> Edit Customer Profile ({activeCustomer?.customerCode})
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Customer / Enterprise Name *
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand bg-white"
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Retail">Retail</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Street Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-dark font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Update Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-gray-900">Archive Customer?</h3>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              Are you sure you want to archive <strong>{activeCustomer?.customerName}</strong> ({activeCustomer?.customerCode})?
              This customer will be removed from the active directory. All historical invoices, job cards, and AMC records remain preserved.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={submitting}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold disabled:opacity-50"
              >
                {submitting ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer / Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 text-xs">
            <div className="flex justify-between items-start pb-4 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">
                    {detailCustomer?.customerName}
                  </span>
                  <span className="bg-emerald-100 text-brand px-2 py-0.5 rounded text-[10px] font-bold">
                    {detailCustomer?.customerCode}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${detailCustomer?.customerType === 'Commercial'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                      }`}
                  >
                    {detailCustomer?.customerType}
                  </span>
                </div>
                {detailCustomer?.companyName && (
                  <p className="text-gray-500 text-xs mt-0.5">{detailCustomer?.companyName}</p>
                )}
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Tabs */}
            <div className="flex border-b border-gray-200 my-4">
              {[
                { key: 'overview', label: 'Contact & GST Profile' },
                { key: 'invoices', label: `Invoices (${detailCustomer?.invoices?.length || 0})` },
                { key: 'quotations', label: `Quotations (${detailCustomer?.quotations?.length || 0})` },
                { key: 'services', label: `Service Jobs (${detailCustomer?.complaints?.length || 0})` },
                { key: 'amc', label: `AMC Contracts (${detailCustomer?.amcContracts?.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key)}
                  className={`px-3 py-2 border-b-2 font-semibold transition ${detailTab === tab.key
                      ? 'border-brand text-brand'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {detailTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-canvas p-4 rounded-lg border border-gray-200">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-brand" />
                      <span><strong>Mobile:</strong> {detailCustomer?.mobile}</span>
                    </div>
                    {detailCustomer?.alternateMobile && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span><strong>Alternate:</strong> {detailCustomer?.alternateMobile}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="w-4 h-4 text-brand" />
                      <span><strong>Email:</strong> {detailCustomer?.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <FileCheck className="w-4 h-4 text-brand" />
                      <span><strong>GSTIN:</strong> {detailCustomer?.gstNumber || 'Unregistered'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <span>
                        <strong>Address:</strong> {detailCustomer?.address}, {detailCustomer?.city},{' '}
                        {detailCustomer?.state} - {detailCustomer?.pincode}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'invoices' && (
              <div>
                {detailCustomer?.invoices && detailCustomer.invoices.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b">
                        <th className="p-2">Invoice #</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Grand Total</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailCustomer.invoices.map((inv) => (
                        <tr key={inv.id} className="border-b">
                          <td className="p-2 font-bold text-brand">{inv.invoiceNumber}</td>
                          <td className="p-2">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                          <td className="p-2 font-semibold">₹{inv.grandTotal?.toFixed(2)}</td>
                          <td className="p-2">{inv.paymentStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No historical invoices recorded for this customer.
                  </div>
                )}
              </div>
            )}

            {detailTab === 'quotations' && (
              <div>
                {detailCustomer?.quotations && detailCustomer.quotations.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b">
                        <th className="p-2">Quote #</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Total Amount</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailCustomer.quotations.map((q) => (
                        <tr key={q.id} className="border-b">
                          <td className="p-2 font-bold text-brand">{q.quotationNumber}</td>
                          <td className="p-2">{new Date(q.quotationDate).toLocaleDateString()}</td>
                          <td className="p-2 font-semibold">₹{q.grandTotal?.toFixed(2)}</td>
                          <td className="p-2">{q.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No quotations generated for this customer.
                  </div>
                )}
              </div>
            )}

            {detailTab === 'services' && (
              <div>
                {detailCustomer?.complaints && detailCustomer.complaints.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b">
                        <th className="p-2">Complaint #</th>
                        <th className="p-2">Issue Description</th>
                        <th className="p-2">Priority</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailCustomer.complaints.map((c) => (
                        <tr key={c.id} className="border-b">
                          <td className="p-2 font-bold text-brand">{c.complaintNumber}</td>
                          <td className="p-2">{c.complaintDescription}</td>
                          <td className="p-2">{c.priority}</td>
                          <td className="p-2">{c.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No service complaints logged for this customer.
                  </div>
                )}
              </div>
            )}

            {detailTab === 'amc' && (
              <div>
                {detailCustomer?.amcContracts && detailCustomer.amcContracts.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b">
                        <th className="p-2">AMC #</th>
                        <th className="p-2">Validity Period</th>
                        <th className="p-2">Visits Progress</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailCustomer.amcContracts.map((a) => (
                        <tr key={a.id} className="border-b">
                          <td className="p-2 font-bold text-brand">{a.amcNumber}</td>
                          <td className="p-2">
                            {new Date(a.startDate).toLocaleDateString()} -{' '}
                            {new Date(a.endDate).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            {a.completedVisits} / {a.totalVisits} completed
                          </td>
                          <td className="p-2">{a.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No active AMC contracts found for this customer.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
