'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  supplierApi,
  purchaseOrderApi,
  productApi,
} from '../../lib/api/client';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  Clock,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Boxes,
  Trash2,
  Edit,
  Eye,
  Send,
  Check,
  X,
  Layers,
  ShoppingBag,
  Receipt,
  RotateCcw,
} from 'lucide-react';

export default function SuppliersPage() {
  // State
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' or 'suppliers'
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    totalPOs: 0,
    draftPOs: 0,
    submittedPOs: 0,
    approvedPOs: 0,
    partiallyReceivedPOs: 0,
    receivedPOs: 0,
    totalSpend: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals & Drawers
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierFormData, setSupplierFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    address: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '',
  });

  const [showPoModal, setShowPoModal] = useState(false);
  const [poFormData, setPoFormData] = useState({
    supplierId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    notes: '',
    items: [{ productId: '', quantity: 1, unitPrice: 0, taxAmount: 0 }],
  });

  const [selectedPo, setSelectedPo] = useState(null);
  const [showPoDrawer, setShowPoDrawer] = useState(false);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveData, setReceiveData] = useState({
    items: [],
    warehouseName: 'Main Warehouse - Thoraipakkam',
    notes: '',
  });

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [suppliersData, posData, poStats, productsData] = await Promise.all([
        supplierApi.getSuppliers(),
        purchaseOrderApi.getPurchaseOrders(),
        purchaseOrderApi.getStats(),
        productApi.getProducts(),
      ]);

      const productList = Array.isArray(productsData?.data)
        ? productsData.data
        : Array.isArray(productsData?.data?.data)
          ? productsData.data.data
          : Array.isArray(productsData)
            ? productsData
            : [];

      const suppliersList = Array.isArray(suppliersData?.data)
        ? suppliersData.data
        : Array.isArray(suppliersData)
          ? suppliersData
          : [];

      const posList = Array.isArray(posData?.data)
        ? posData.data
        : Array.isArray(posData)
          ? posData
          : [];

      setSuppliers(suppliersList);
      setPurchaseOrders(posList);
      setStats(poStats || {});
      setProducts(productList);
    } catch (err) {
      console.error('Failed to load procurement data:', err);
      setError(err.response?.data?.message || 'Failed to load procurement records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Flash message helper
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Supplier Form Handlers
  const handleOpenSupplierModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierFormData({
        companyName: supplier.companyName || '',
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        gstNumber: supplier.gstNumber || '',
        address: supplier.address || '',
        city: supplier.city || 'Chennai',
        state: supplier.state || 'Tamil Nadu',
        pincode: supplier.pincode || '',
      });
    } else {
      setEditingSupplier(null);
      setSupplierFormData({
        companyName: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstNumber: '',
        address: '',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '',
      });
    }
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierFormData.companyName || !supplierFormData.contactPerson || !supplierFormData.phone) {
      setError('Company name, contact person, and phone are required.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');

      if (editingSupplier) {
        await supplierApi.updateSupplier(editingSupplier.id, supplierFormData);
        showSuccess(`Supplier "${supplierFormData.companyName}" updated successfully.`);
      } else {
        const res = await supplierApi.createSupplier(supplierFormData);
        showSuccess(`Supplier "${res.companyName}" created successfully with code ${res.supplierCode}.`);
      }

      setShowSupplierModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save supplier:', err);
      setError(err.response?.data?.message || 'Failed to save supplier.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSupplier = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove supplier "${name}"?`)) return;
    try {
      setActionLoading(true);
      await supplierApi.deleteSupplier(id);
      showSuccess(`Supplier "${name}" deleted.`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      setError(err.response?.data?.message || 'Failed to delete supplier.');
    } finally {
      setActionLoading(false);
    }
  };

  // PO Form Handlers
  const handleOpenPoModal = (defaultSupplierId = null) => {
    if (suppliers.length === 0) {
      setError('Please add at least one supplier before creating a Purchase Order.');
      return;
    }
    const defaultProduct = Array.isArray(products) && products.length > 0 ? products[0] : null;
    const defaultSupplier = (typeof defaultSupplierId === 'string' && defaultSupplierId) || suppliers[0]?.id || '';

    setPoFormData({
      supplierId: defaultSupplier,
      purchaseDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      notes: '',
      items: [{
        productId: defaultProduct?.id || '',
        quantity: 1,
        unitPrice: defaultProduct?.purchasePrice || 0,
        taxAmount: 0,
      }],
    });
    setShowPoModal(true);
  };

  const handlePoItemChange = (index, field, value) => {
    const updated = [...poFormData.items];
    updated[index][field] = value;

    if (field === 'productId') {
      const prod = Array.isArray(products) ? products.find((p) => p.id === value) : null;
      if (prod) {
        updated[index].unitPrice = prod.purchasePrice || 0;
      }
    }

    setPoFormData({ ...poFormData, items: updated });
  };

  const handleAddPoItem = () => {
    const defaultProduct = Array.isArray(products) && products.length > 0 ? products[0] : null;
    setPoFormData({
      ...poFormData,
      items: [
        ...poFormData.items,
        {
          productId: defaultProduct?.id || '',
          quantity: 1,
          unitPrice: defaultProduct?.purchasePrice || 0,
          taxAmount: 0,
        },
      ],
    });
  };

  const handleRemovePoItem = (index) => {
    if (poFormData.items.length <= 1) return;
    const updated = poFormData.items.filter((_, i) => i !== index);
    setPoFormData({ ...poFormData, items: updated });
  };

  // Calculate PO Totals
  const calculatePoTotals = (items = []) => {
    const safeItems = Array.isArray(items) ? items : [];

    let subtotal = 0;
    let gst = 0;

    safeItems.forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const prod = Array.isArray(products) ? products.find((p) => p.id === item.productId) : null;
      const taxRate = Number(item.taxRate ?? prod?.taxRate ?? 18);

      const lineSub = quantity * unitPrice;
      const lineTax = (lineSub * taxRate) / 100;

      subtotal += lineSub;
      gst += lineTax;
    });

    return {
      subtotal: Number(subtotal.toFixed(2)),
      gst: Number(gst.toFixed(2)),
      total: Number((subtotal + gst).toFixed(2)),
    };
  };

  const currentPoTotals = calculatePoTotals(poFormData.items);

  const handleSavePo = async (e) => {
    e.preventDefault();
    if (!poFormData.supplierId) {
      setError('Please select a supplier.');
      return;
    }
    if (poFormData.items.length === 0) {
      setError('At least one item is required.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');

      const payload = {
        supplierId: poFormData.supplierId,
        purchaseDate: poFormData.purchaseDate ? new Date(poFormData.purchaseDate).toISOString() : new Date().toISOString(),
        expectedDeliveryDate: poFormData.expectedDeliveryDate ? new Date(poFormData.expectedDeliveryDate).toISOString() : undefined,
        notes: poFormData.notes || undefined,
        items: poFormData.items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      };

      const res = await purchaseOrderApi.createPurchaseOrder(payload);
      showSuccess(`Purchase Order "${res.poNumber}" created successfully.`);
      setShowPoModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create PO:', err);
      setError(err.response?.data?.message || 'Failed to create Purchase Order.');
    } finally {
      setActionLoading(false);
    }
  };

  // PO Status Transitions
  const handleSubmitPo = async (poId) => {
    try {
      setActionLoading(true);
      setError('');
      const updated = await purchaseOrderApi.submitPurchaseOrder(poId);
      showSuccess(`PO "${updated.poNumber}" submitted for approval.`);
      fetchData();
      if (selectedPo?.id === poId) setSelectedPo(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit PO.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePo = async (poId) => {
    try {
      setActionLoading(true);
      setError('');
      const updated = await purchaseOrderApi.approvePurchaseOrder(poId);
      showSuccess(`PO "${updated.poNumber}" approved. Ready for stock receiving.`);
      fetchData();
      if (selectedPo?.id === poId) setSelectedPo(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve PO.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPo = async (poId) => {
    if (!window.confirm('Are you sure you want to cancel this purchase order?')) return;
    try {
      setActionLoading(true);
      setError('');
      const updated = await purchaseOrderApi.cancelPurchaseOrder(poId);
      showSuccess(`PO "${updated.poNumber}" cancelled.`);
      fetchData();
      if (selectedPo?.id === poId) setSelectedPo(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel PO.');
    } finally {
      setActionLoading(false);
    }
  };

  // Stock Receiving Handlers
  const handleOpenReceiveModal = (po) => {
    const unfulfilledItems = (po.items || [])
      .filter((i) => i.quantity > (i.receivedQuantity || 0))
      .map((i) => ({
        purchaseItemId: i.id,
        productName: i.product?.productName || 'Product',
        sku: i.product?.sku || '',
        orderedQuantity: i.quantity,
        alreadyReceived: i.receivedQuantity || 0,
        remaining: i.quantity - (i.receivedQuantity || 0),
        receivedQuantity: i.quantity - (i.receivedQuantity || 0), // Default to remaining
      }));

    if (unfulfilledItems.length === 0) {
      setError('All items in this Purchase Order have already been fully received.');
      return;
    }

    setSelectedPo(po);
    setReceiveData({
      items: unfulfilledItems,
      warehouseName: 'Main Warehouse - Thoraipakkam',
      notes: '',
    });
    setShowReceiveModal(true);
  };

  const handleReceiveItemQtyChange = (index, value) => {
    const updated = [...receiveData.items];
    updated[index].receivedQuantity = Number(value) || 0;
    setReceiveData({ ...receiveData, items: updated });
  };

  const handleExecuteReceive = async (e) => {
    e.preventDefault();
    if (!selectedPo) return;

    const validItems = receiveData.items
      .filter((i) => i.receivedQuantity > 0)
      .map((i) => ({
        purchaseItemId: i.purchaseItemId,
        receivedQuantity: Number(i.receivedQuantity),
      }));

    if (validItems.length === 0) {
      setError('Please specify at least 1 unit to receive.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');

      const res = await purchaseOrderApi.receiveStock(selectedPo.id, {
        items: validItems,
        warehouseName: receiveData.warehouseName,
        notes: receiveData.notes || undefined,
      });

      showSuccess(res.message || 'Stock received and inventory updated.');
      setShowReceiveModal(false);
      setShowPoDrawer(false);
      fetchData();
    } catch (err) {
      console.error('Stock intake failed:', err);
      setError(err.response?.data?.message || 'Failed to receive stock.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered lists
  const filteredSuppliers = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.companyName?.toLowerCase().includes(q) ||
      s.contactPerson?.toLowerCase().includes(q) ||
      s.supplierCode?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.city?.toLowerCase().includes(q)
    );
  });

  const filteredPOs = purchaseOrders.filter((po) => {
    if (statusFilter !== 'All' && po.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      po.poNumber?.toLowerCase().includes(q) ||
      po.supplier?.companyName?.toLowerCase().includes(q) ||
      po.notes?.toLowerCase().includes(q)
    );
  });

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
      case 'Submitted':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Submitted
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'Partially Received':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Partially Received
          </span>
        );
      case 'Received':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Received
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            <X className="w-3 h-3" /> Cancelled
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
      {/* Toast Alert Notifications */}
      {error && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-xs font-semibold flex items-center gap-2 bg-rose-600 text-white animate-in fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-white/80 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-xs font-semibold flex items-center gap-2 bg-brand text-white animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-white/80 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-brand" />
              Procurement & Supplier Management
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Phase 10
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Vendor Directory, Purchase Orders, and Automated Inward Stock Receiving.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenSupplierModal()}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Building2 className="w-4 h-4 text-gray-500" />
            Add Supplier
          </button>
          <button
            onClick={() => handleOpenPoModal()}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Vendors</span>
            <Building2 className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalSuppliers || suppliers.length}</div>
          <div className="text-[10px] text-gray-400 mt-1">Active equipment & parts suppliers</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total POs</span>
            <FileText className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalPOs || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">{stats.draftPOs || 0} Draft • {stats.submittedPOs || 0} Submitted</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">In Transit / Action</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {(stats.approvedPOs || 0) + (stats.partiallyReceivedPOs || 0)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Approved & Ready to Receive</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Received / In Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.receivedPOs || 0}</div>
          <div className="text-[10px] text-gray-400 mt-1">Fully fulfilled orders</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-brand mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total PO Spend</span>
            <TrendingUp className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-brand">
            ₹{(stats.totalSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Procurement volume (incl. GST)</div>
        </div>
      </div>

      {/* Tabs & Search Navigation Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'pos'
                ? 'bg-brand/10 text-brand border border-brand/20'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Purchase Orders</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === 'pos' ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {purchaseOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'suppliers'
                ? 'bg-brand/10 text-brand border border-brand/20'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Vendor Directory</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === 'suppliers' ? 'bg-brand text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {suppliers.length}
            </span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'pos' ? 'Search PO #, supplier...' : 'Search supplier name, phone, city...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 placeholder-gray-400"
            />
          </div>

          {activeTab === 'pos' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Partially Received">Partially Received</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'pos' && (
        <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                  <th className="p-3">PO Number</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Purchase Date</th>
                  <th className="p-3">Items Summary</th>
                  <th className="p-3 text-right">Total (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-xs text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
                      <div>Loading purchase orders from PostgreSQL...</div>
                    </td>
                  </tr>
                ) : filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center">
                      <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-gray-800">No Purchase Orders Found</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        No purchase orders match your criteria. Click &quot;Create Purchase Order&quot; to issue a new order.
                      </p>
                      <button
                        onClick={() => handleOpenPoModal()}
                        className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
                      >
                        + Create Purchase Order
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((po) => {
                    const totalQty = po.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                    const receivedQty = po.items?.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0) || 0;
                    const fulfillmentPct = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;

                    return (
                      <tr key={po.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-3">
                          <div className="font-mono font-bold text-brand flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-brand" />
                            {po.poNumber}
                          </div>
                          <div className="text-[10px] text-gray-400">By {po.createdBy?.fullName || 'Admin'}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-gray-900">{po.supplier?.companyName}</div>
                          <div className="text-[10px] text-gray-500">{po.supplier?.supplierCode} • {po.supplier?.city}</div>
                        </td>
                        <td className="p-3 text-gray-700">
                          {new Date(po.purchaseDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3">
                          <div className="text-gray-700">
                            {po.items?.length || 0} item{po.items?.length !== 1 ? 's' : ''} ({receivedQty}/{totalQty} units)
                          </div>
                          <div className="w-24 bg-gray-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full ${fulfillmentPct === 100
                                ? 'bg-emerald-500'
                                : fulfillmentPct > 0
                                  ? 'bg-amber-500'
                                  : 'bg-gray-400'
                                }`}
                              style={{ width: `${fulfillmentPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700 text-sm">
                          ₹{(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(po.status)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedPo(po);
                                setShowPoDrawer(true);
                              }}
                              className="p-1 text-gray-600 hover:text-brand hover:bg-brand/10 rounded"
                              title="View PO Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {po.status === 'Draft' && (
                              <button
                                onClick={() => handleSubmitPo(po.id)}
                                disabled={actionLoading}
                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title="Submit for Approval"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {po.status === 'Submitted' && (
                              <button
                                onClick={() => handleApprovePo(po.id)}
                                disabled={actionLoading}
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                title="Approve PO"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {(po.status === 'Approved' || po.status === 'Partially Received') && (
                              <button
                                onClick={() => handleOpenReceiveModal(po)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded shadow-sm"
                                title="Receive Stock into Inventory"
                              >
                                <PackageCheck className="w-3 h-3" /> Receive
                              </button>
                            )}

                            {po.status !== 'Received' && po.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleCancelPo(po.id)}
                                disabled={actionLoading}
                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Cancel PO"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      )}

      {/* TAB 2: VENDOR DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full bg-white border border-gray-200 rounded-card p-12 text-center text-xs text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
              <div>Loading vendors...</div>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="col-span-full bg-white border border-gray-200 rounded-card p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">No Vendors Registered</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                No vendors found. Click &quot;Add Supplier&quot; to register a new vendor.
              </p>
              <button
                onClick={() => handleOpenSupplierModal()}
                className="mt-4 bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark"
              >
                + Add Supplier
              </button>
            </div>
          ) : (
            filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white border border-gray-200 rounded-card p-5 flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                        {supplier.supplierCode}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 mt-2">{supplier.companyName}</h3>
                      <div className="text-xs text-gray-500 font-medium">Contact: {supplier.contactPerson}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenSupplierModal(supplier)}
                        className="p-1.5 text-gray-500 hover:text-brand hover:bg-gray-100 rounded transition-colors"
                        title="Edit Supplier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(supplier.id, supplier.companyName)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{supplier.phone}</span>
                    </div>
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>{supplier.email}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                      <span>{supplier.address}, {supplier.city}, {supplier.state}</span>
                    </div>
                    {supplier.gstNumber && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-500">GSTIN:</span>
                        <span className="font-mono font-medium text-gray-900">{supplier.gstNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {supplier.purchaseOrders?.length || 0} Purchase Orders
                  </span>
                  <button
                    onClick={() => handleOpenPoModal(supplier.id)}
                    className="text-brand hover:text-brand-dark font-semibold flex items-center gap-1"
                  >
                    <span>New PO</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT SUPPLIER */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand" />
                {editingSupplier ? 'Edit Vendor / Supplier' : 'Add New Vendor / Supplier'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form id="supplier-form" onSubmit={handleSaveSupplier} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Company Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Panasonic India Pvt Ltd"
                  value={supplierFormData.companyName}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, companyName: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Contact Person <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={supplierFormData.contactPerson}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone Number <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="33AAAAA0000A1Z5"
                    value={supplierFormData.gstNumber}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, gstNumber: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Office Address <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Plot 45, Guindy Industrial Estate"
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={supplierFormData.city}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, city: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={supplierFormData.state}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, state: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    placeholder="600032"
                    value={supplierFormData.pincode}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, pincode: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>
            </form>

            {/* Modal Fixed / Sticky Action Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="supplier-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark text-xs shadow-sm transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE PURCHASE ORDER */}
      {showPoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand" />
                Create Purchase Order
              </h3>
              <button
                type="button"
                onClick={() => setShowPoModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form id="po-form" onSubmit={handleSavePo} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Select Supplier <span className="text-rose-500">*</span></label>
                  <select
                    value={poFormData.supplierId}
                    onChange={(e) => setPoFormData({ ...poFormData, supplierId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} ({s.supplierCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Purchase Date <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={poFormData.purchaseDate}
                    onChange={(e) => setPoFormData({ ...poFormData, purchaseDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={poFormData.expectedDeliveryDate}
                    onChange={(e) => setPoFormData({ ...poFormData, expectedDeliveryDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                    Purchase Order Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPoItem}
                    className="inline-flex items-center gap-1 bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(Array.isArray(poFormData.items) ? poFormData.items : []).map((item, idx) => {
                    const prod = Array.isArray(products) ? products.find((p) => p.id === item.productId) : null;
                    const lineSub = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    const taxRate = prod?.taxRate || 18;
                    const lineTax = (lineSub * taxRate) / 100;
                    const lineTotal = lineSub + lineTax;

                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded border border-gray-200 shadow-sm">
                        <div className="col-span-5">
                          <label className="block text-[10px] text-gray-500">Product / SKU</label>
                          <select
                            value={item.productId}
                            onChange={(e) => handlePoItemChange(idx, 'productId', e.target.value)}
                            className="w-full py-1.5 px-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                            required
                          >
                            {(Array.isArray(products) ? products : []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.productName} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] text-gray-500">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handlePoItemChange(idx, 'quantity', e.target.value)}
                            className="w-full py-1.5 px-2 text-xs text-center border border-gray-300 rounded focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] text-gray-500">Unit Price (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handlePoItemChange(idx, 'unitPrice', e.target.value)}
                            className="w-full py-1.5 px-2 text-xs text-right border border-gray-300 rounded focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                            required
                          />
                        </div>
                        <div className="col-span-2 text-right">
                          <label className="block text-[10px] text-gray-500">Total (incl {taxRate}%)</label>
                          <span className="text-xs font-bold text-gray-900">
                            ₹{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePoItem(idx)}
                            disabled={poFormData.items.length <= 1}
                            className="text-gray-400 hover:text-rose-600 disabled:opacity-30 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Calculation Summary */}
                <div className="pt-3 border-t border-gray-200 flex justify-end">
                  <div className="w-64 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{currentPoTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>GST (18% approx):</span>
                      <span className="font-semibold">₹{currentPoTotals.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
                      <span>Grand Total:</span>
                      <span className="text-brand">₹{currentPoTotals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Deliver to Thoraipakkam central warehouse with warranty cards."
                  value={poFormData.notes}
                  onChange={(e) => setPoFormData({ ...poFormData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 placeholder-gray-400 text-xs"
                />
              </div>
            </form>

            {/* Modal Fixed / Sticky Action Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPoModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="po-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand text-white rounded-md font-semibold hover:bg-brand-dark text-xs shadow-sm transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Creating...' : 'Create Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: PO DETAILS & FULFILLMENT TRACKER */}
      {showPoDrawer && selectedPo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white border-l border-gray-200 h-full overflow-y-auto p-6 space-y-6 shadow-2xl text-xs animate-in slide-in-from-right">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{selectedPo.poNumber}</h3>
                  {getStatusBadge(selectedPo.status)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Supplier: {selectedPo.supplier?.companyName} ({selectedPo.supplier?.supplierCode})
                </div>
              </div>
              <button
                onClick={() => setShowPoDrawer(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workflow Pipeline Progress */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-3">PROCUREMENT STATUS WORKFLOW</div>
              <div className="flex items-center justify-between text-xs">
                <div className={`flex flex-col items-center gap-1 ${selectedPo.status !== 'Cancelled' ? 'text-brand font-bold' : 'text-gray-400'}`}>
                  <div className="w-7 h-7 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center font-bold">1</div>
                  <span>Draft</span>
                </div>
                <div className="h-0.5 flex-1 bg-gray-200 mx-2" />
                <div className={`flex flex-col items-center gap-1 ${['Submitted', 'Approved', 'Partially Received', 'Received'].includes(selectedPo.status) ? 'text-brand font-bold' : 'text-gray-400'}`}>
                  <div className="w-7 h-7 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center font-bold">2</div>
                  <span>Submitted</span>
                </div>
                <div className="h-0.5 flex-1 bg-gray-200 mx-2" />
                <div className={`flex flex-col items-center gap-1 ${['Approved', 'Partially Received', 'Received'].includes(selectedPo.status) ? 'text-brand font-bold' : 'text-gray-400'}`}>
                  <div className="w-7 h-7 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center font-bold">3</div>
                  <span>Approved</span>
                </div>
                <div className="h-0.5 flex-1 bg-gray-200 mx-2" />
                <div className={`flex flex-col items-center gap-1 ${selectedPo.status === 'Received' ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                  <div className={`w-7 h-7 rounded-full ${selectedPo.status === 'Received' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-gray-100 border-gray-300 text-gray-500'} flex items-center justify-center font-bold`}>4</div>
                  <span>Received</span>
                </div>
              </div>
            </div>

            {/* PO Line Items and Intake Tracking */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-brand" />
                Ordered Items & Inward Intake
              </h4>

              <div className="space-y-2">
                {selectedPo.items?.map((item) => {
                  const ordered = item.quantity;
                  const received = item.receivedQuantity || 0;
                  const pct = Math.round((received / ordered) * 100);

                  return (
                    <div key={item.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 text-xs">{item.product?.productName}</div>
                          <div className="text-[10px] text-gray-500">SKU: {item.product?.sku} • Unit: ₹{item.unitPrice}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 text-xs">₹{(item.total || 0).toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-gray-500">Tax: ₹{item.taxAmount}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1">
                        <span>Intake: {received} / {ordered} units received</span>
                        <span className="font-bold">{pct}%</span>
                      </div>

                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PO Financial Totals */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Excl Tax):</span>
                <span className="font-semibold">₹{(selectedPo.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST Tax (18%):</span>
                <span className="font-semibold">₹{(selectedPo.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Grand Total:</span>
                <span className="text-brand">₹{(selectedPo.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200">
              {selectedPo.status === 'Draft' && (
                <button
                  onClick={() => handleSubmitPo(selectedPo.id)}
                  disabled={actionLoading}
                  className="bg-brand text-white hover:bg-brand-dark flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold text-xs transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Submit for Approval
                </button>
              )}

              {selectedPo.status === 'Submitted' && (
                <button
                  onClick={() => handleApprovePo(selectedPo.id)}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold text-xs transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Approve Purchase Order
                </button>
              )}

              {(selectedPo.status === 'Approved' || selectedPo.status === 'Partially Received') && (
                <button
                  onClick={() => handleOpenReceiveModal(selectedPo)}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold text-xs shadow-sm transition-colors"
                >
                  <PackageCheck className="w-4 h-4" />
                  Receive Inward Stock
                </button>
              )}

              {selectedPo.status !== 'Received' && selectedPo.status !== 'Cancelled' && (
                <button
                  onClick={() => handleCancelPo(selectedPo.id)}
                  disabled={actionLoading}
                  className="border border-gray-300 text-rose-600 hover:bg-rose-50 py-2 px-4 rounded-md font-semibold text-xs transition-colors"
                >
                  Cancel PO
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INWARD STOCK RECEIVING MODAL */}
      {showReceiveModal && selectedPo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                Receive Inward Stock — {selectedPo.poNumber}
              </h3>
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form id="receive-form" onSubmit={handleExecuteReceive} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">
                Receiving stock will atomically increase <strong>Product.stockQuantity</strong>, update the warehouse inventory balance, and create an auditable <strong>StockMovement (IN)</strong> record.
              </div>

              <div className="space-y-3">
                <label className="block font-semibold text-gray-700 uppercase tracking-wider text-[11px]">
                  Quantity Intake by Item
                </label>

                {receiveData.items.map((item, idx) => (
                  <div key={item.purchaseItemId} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.productName}</div>
                      <div className="text-[10px] text-gray-500">
                        SKU: {item.sku} • Ordered: {item.orderedQuantity} (Remaining: {item.remaining})
                      </div>
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] text-gray-500 mb-0.5">Receive Units</label>
                      <input
                        type="number"
                        min="0"
                        max={item.remaining}
                        value={item.receivedQuantity}
                        onChange={(e) => handleReceiveItemQtyChange(idx, e.target.value)}
                        className="w-full py-1 text-sm text-center font-bold text-brand border border-gray-300 rounded focus:ring-1 focus:ring-brand focus:border-brand bg-white"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Warehouse</label>
                <input
                  type="text"
                  value={receiveData.warehouseName}
                  onChange={(e) => setReceiveData({ ...receiveData, warehouseName: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Intake Notes / Delivery Challan #</label>
                <input
                  type="text"
                  placeholder="e.g. Received via DC-9942, inspected 0 damages."
                  value={receiveData.notes}
                  onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand focus:border-brand bg-white text-gray-900 placeholder-gray-400"
                />
              </div>
            </form>

            {/* Modal Fixed / Sticky Action Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="receive-form"
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Updating Inventory...' : 'Confirm Stock Intake'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
