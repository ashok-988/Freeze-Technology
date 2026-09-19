'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  RotateCcw,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  PackageX,
  DollarSign,
  History,
  Warehouse,
  X,
  Layers,
  Eye,
  RefreshCw,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { inventoryApi, productApi } from '../../lib/api/client';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'transactions'
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({
    totalSKUs: 0,
    totalUnits: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    stockValue: 0,
    stockReceivedThisMonth: 0,
    stockIssuedThisMonth: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Active item & submission state
  const [activeItem, setActiveItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [receiveForm, setReceiveForm] = useState({
    productId: '',
    quantity: 1,
    unitCost: '',
    warehouseName: 'Main Warehouse - Thoraipakkam',
    reference: '',
    notes: '',
  });

  const [issueForm, setIssueForm] = useState({
    productId: '',
    quantity: 1,
    reason: 'Installation',
    reference: '',
    notes: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    newQuantity: 0,
    reason: 'Physical Stock Audit',
    reference: '',
    notes: '',
  });

  const [transferForm, setTransferForm] = useState({
    productId: '',
    quantity: 1,
    fromWarehouse: 'Main Warehouse - Thoraipakkam',
    toWarehouse: 'Service Van 1 - Suresh V',
    reference: '',
    notes: '',
  });

  const showToast = (text, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, statRes, txRes, catRes, brRes, prodRes] = await Promise.all([
        inventoryApi.getInventory(),
        inventoryApi.getStats(),
        inventoryApi.getTransactions(),
        productApi.getCategories(),
        productApi.getBrands(),
        productApi.getProducts(),
      ]);

      if (invRes?.success) setInventory(invRes.data || []);
      if (statRes?.success) setStats(statRes.data || {});
      if (txRes?.success) setTransactions(txRes.data || []);
      if (catRes?.success) setCategories(catRes.data || []);
      if (brRes?.success) setBrands(brRes.data || []);
      if (prodRes?.success) setProductsList(prodRes.data || []);
    } catch (err) {
      console.error('Error loading inventory data:', err);
      showToast('Failed to load inventory data from PostgreSQL.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (statusFilter !== 'All' && item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (categoryFilter !== 'All' && item.category?.categoryName !== categoryFilter) return false;
      if (brandFilter !== 'All' && item.brand?.brandName !== brandFilter) return false;

      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      const sku = item.sku?.toLowerCase() || '';
      const pName = item.productName?.toLowerCase() || '';
      const model = item.model?.toLowerCase() || '';
      const cat = item.category?.categoryName?.toLowerCase() || '';
      const brand = item.brand?.brandName?.toLowerCase() || '';

      return (
        sku.includes(search) ||
        pName.includes(search) ||
        model.includes(search) ||
        cat.includes(search) ||
        brand.includes(search)
      );
    });
  }, [inventory, searchQuery, categoryFilter, brandFilter, statusFilter]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    const search = searchQuery.toLowerCase();
    return transactions.filter((tx) => {
      const pName = tx.product?.productName?.toLowerCase() || '';
      const sku = tx.product?.sku?.toLowerCase() || '';
      const refId = tx.referenceId?.toLowerCase() || '';
      const refType = tx.referenceType?.toLowerCase() || '';
      const remarks = tx.remarks?.toLowerCase() || '';
      return (
        pName.includes(search) ||
        sku.includes(search) ||
        refId.includes(search) ||
        refType.includes(search) ||
        remarks.includes(search)
      );
    });
  }, [transactions, searchQuery]);

  // Modal Open Handlers
  const openReceive = (item = null) => {
    const prodId = item?.id || productsList[0]?.id || '';
    const selectedProd = productsList.find((p) => p.id === prodId);
    setReceiveForm({
      productId: prodId,
      quantity: 5,
      unitCost: selectedProd?.purchasePrice || '',
      warehouseName: 'Main Warehouse - Thoraipakkam',
      reference: 'PO-2026-001',
      notes: 'Standard supplier delivery receipt',
    });
    setShowReceiveModal(true);
  };

  const openIssue = (item = null) => {
    const prodId = item?.id || productsList[0]?.id || '';
    setIssueForm({
      productId: prodId,
      quantity: 1,
      reason: 'Installation',
      reference: 'INST-2026-0001',
      notes: 'Equipment dispatched for site installation',
    });
    setShowIssueModal(true);
  };

  const openAdjust = (item = null) => {
    const prodId = item?.id || productsList[0]?.id || '';
    const selectedProd = inventory.find((p) => p.id === prodId) || productsList.find((p) => p.id === prodId);
    setAdjustForm({
      productId: prodId,
      newQuantity: selectedProd?.stockQuantity || 0,
      reason: 'Physical Stock Audit',
      reference: 'AUDIT-2026-Q3',
      notes: 'Audited physical stock verified in warehouse rack',
    });
    setShowAdjustModal(true);
  };

  const openTransfer = (item = null) => {
    const prodId = item?.id || productsList[0]?.id || '';
    setTransferForm({
      productId: prodId,
      quantity: 1,
      fromWarehouse: 'Main Warehouse - Thoraipakkam',
      toWarehouse: 'Service Van 1 - Suresh V',
      reference: 'TRF-2026-01',
      notes: 'Stock transferred for technician site schedule',
    });
    setShowTransferModal(true);
  };

  const openDetail = async (item) => {
    try {
      const res = await inventoryApi.getInventoryItem(item.id);
      if (res?.success) {
        setActiveItem(res.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      showToast('Failed to load item stock details.', true);
    }
  };

  // Submit Handlers
  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    if (!receiveForm.productId) {
      showToast('Please select a product.', true);
      return;
    }
    if (receiveForm.quantity <= 0) {
      showToast('Receipt quantity must be at least 1.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await inventoryApi.createReceipt({
        productId: receiveForm.productId,
        quantity: Number(receiveForm.quantity),
        unitCost: receiveForm.unitCost ? Number(receiveForm.unitCost) : undefined,
        warehouseName: receiveForm.warehouseName,
        reference: receiveForm.reference,
        notes: receiveForm.notes,
      });

      if (res?.success) {
        showToast(res.message || 'Stock received successfully!');
        setShowReceiveModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Receive stock error:', err);
      showToast(err.response?.data?.message || 'Failed to receive stock.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueForm.productId) {
      showToast('Please select a product.', true);
      return;
    }
    if (issueForm.quantity <= 0) {
      showToast('Issue quantity must be at least 1.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await inventoryApi.createIssue({
        productId: issueForm.productId,
        quantity: Number(issueForm.quantity),
        reason: issueForm.reason,
        reference: issueForm.reference,
        notes: issueForm.notes,
      });

      if (res?.success) {
        showToast(res.message || 'Stock issued successfully!');
        setShowIssueModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Issue stock error:', err);
      showToast(err.response?.data?.message || 'Failed to issue stock.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustForm.productId) {
      showToast('Please select a product.', true);
      return;
    }
    if (adjustForm.newQuantity < 0) {
      showToast('New stock quantity cannot be negative.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await inventoryApi.createAdjustment({
        productId: adjustForm.productId,
        newQuantity: Number(adjustForm.newQuantity),
        reason: adjustForm.reason,
        reference: adjustForm.reference,
        notes: adjustForm.notes,
      });

      if (res?.success) {
        showToast(res.message || 'Stock adjusted successfully!');
        setShowAdjustModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Adjust stock error:', err);
      showToast(err.response?.data?.message || 'Failed to adjust stock.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferForm.productId) {
      showToast('Please select a product.', true);
      return;
    }
    if (transferForm.fromWarehouse === transferForm.toWarehouse) {
      showToast('Source and destination warehouses must be different.', true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await inventoryApi.createTransfer({
        productId: transferForm.productId,
        quantity: Number(transferForm.quantity),
        fromWarehouse: transferForm.fromWarehouse,
        toWarehouse: transferForm.toWarehouse,
        reference: transferForm.reference,
        notes: transferForm.notes,
      });

      if (res?.success) {
        showToast(res.message || 'Stock transfer recorded successfully!');
        setShowTransferModal(false);
        await loadData();
      }
    } catch (err) {
      console.error('Transfer stock error:', err);
      showToast(err.response?.data?.message || 'Failed to record stock transfer.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status, qty, reorder) => {
    switch (status) {
      case 'OutOfStock':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <PackageX className="w-3 h-3" /> Out of Stock (0)
          </span>
        );
      case 'LowStock':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Low Stock ({qty})
          </span>
        );
      case 'InStock':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <PackageCheck className="w-3 h-3" /> In Stock ({qty})
          </span>
        );
    }
  };

  // Selected item live helper for modals
  const selectedIssueProduct = useMemo(() => {
    return inventory.find((i) => i.id === issueForm.productId) || productsList.find((p) => p.id === issueForm.productId);
  }, [inventory, productsList, issueForm.productId]);

  const selectedAdjustProduct = useMemo(() => {
    return inventory.find((i) => i.id === adjustForm.productId) || productsList.find((p) => p.id === adjustForm.productId);
  }, [inventory, productsList, adjustForm.productId]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-xs font-semibold flex items-center gap-2 ${
            toastMessage.isError ? 'bg-rose-600 text-white' : 'bg-brand text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-brand" />
            Inventory & Warehouse Stock Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Real-time multi-warehouse stock levels, inward receipt vouchers, outward dispatch issues, audit adjustments, and transaction logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openReceive()}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-3.5 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm"
          >
            <ArrowDownRight className="w-4 h-4" /> Receive Stock (Inward)
          </button>
          <button
            onClick={() => openIssue()}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4" /> Issue Stock (Outward)
          </button>
          <button
            onClick={() => openAdjust()}
            className="inline-flex items-center gap-1.5 bg-gray-800 text-white px-3.5 py-2 rounded-md text-xs font-semibold hover:bg-black transition-colors shadow-sm"
          >
            <Sliders className="w-4 h-4" /> Audit Adjustment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-medium">Total SKUs</span>
            <Boxes className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalSKUs || 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Active Catalog Models</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-brand mb-1">
            <span className="text-[11px] font-medium">Total Units in Stock</span>
            <Warehouse className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-brand">{stats.totalUnits || 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Available Warehouse Qty</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-medium">Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.lowStockItems || 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">At or Below Reorder Qty</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-medium">Out of Stock</span>
            <PackageX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{stats.outOfStockItems || 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">0 Units Available</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-medium">Total Stock Value</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-700">
            ₹{(stats.stockValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Cost Basis Valuation</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 text-xs font-semibold gap-6">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'stock'
              ? 'border-brand text-brand font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Warehouse className="w-4 h-4" /> Current Warehouse Stock ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'transactions'
              ? 'border-brand text-brand font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <History className="w-4 h-4" /> Stock Movements & Audit Log ({transactions.length})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search SKU, product name, model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>

        {activeTab === 'stock' && (
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-xs bg-white text-gray-700"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.categoryName}>
                  {c.categoryName}
                </option>
              ))}
            </select>

            {/* Brand Filter */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-xs bg-white text-gray-700"
            >
              <option value="All">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.brandName}>
                  {b.brandName}
                </option>
              ))}
            </select>

            {/* Status Filter Chips */}
            {['All', 'InStock', 'LowStock', 'OutOfStock'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st === 'All' ? 'All Status' : st === 'InStock' ? 'In Stock' : st === 'LowStock' ? 'Low Stock' : 'Out of Stock'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB CONTENT: CURRENT STOCK TABLE */}
      {activeTab === 'stock' && (
        <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2"></div>
              <div>Loading real-time inventory from PostgreSQL...</div>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="p-12 text-center">
              <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">No Inventory Items Found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                No items match your filter criteria or products catalog.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                    <th className="p-3">SKU & Model</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Category / Brand</th>
                    <th className="p-3 text-center">Stock Qty</th>
                    <th className="p-3 text-center">Reorder Level</th>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3 text-right">Stock Valuation</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-brand">{item.sku}</div>
                        <div className="text-[10px] text-gray-400">{item.model}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{item.productName}</div>
                        <div className="text-[10px] text-gray-500">{item.warehouse}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-gray-900 font-medium">{item.category?.categoryName || 'General'}</div>
                        <div className="text-[10px] text-gray-400">{item.brand?.brandName || 'Brand'}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-bold text-sm ${
                            item.stockQuantity === 0
                              ? 'text-rose-600'
                              : item.stockQuantity <= item.reorderLevel
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {item.stockQuantity}
                        </span>
                        <div className="text-[9px] text-gray-400">units</div>
                      </td>
                      <td className="p-3 text-center text-gray-500 font-medium">
                        {item.reorderLevel} units
                      </td>
                      <td className="p-3 text-right font-medium text-gray-900">
                        ₹{(item.unitCost || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        ₹{(item.stockValue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(item.status, item.stockQuantity, item.reorderLevel)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openReceive(item)}
                            title="Receive Stock (Inward)"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openIssue(item)}
                            title="Issue Stock (Outward)"
                            disabled={item.stockQuantity === 0}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openAdjust(item)}
                            title="Audit Adjust Stock"
                            className="p-1 text-gray-700 hover:bg-gray-100 rounded"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDetail(item)}
                            title="View Stock Ledger & History"
                            className="p-1 text-brand hover:bg-brand/10 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
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
      )}

      {/* TAB CONTENT: STOCK MOVEMENTS / TRANSACTIONS HISTORY */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">No Stock Movements Logged Yet</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Stock movements from receipts, issues, adjustments, and installations will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] border-b">
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Product / SKU</th>
                    <th className="p-3 text-center">Movement Type</th>
                    <th className="p-3 text-center">Qty Changed</th>
                    <th className="p-3 text-center">Stock Snapshot (Before → After)</th>
                    <th className="p-3">Reference / Document</th>
                    <th className="p-3">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 text-gray-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString('en-GB')}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{tx.product?.productName}</div>
                        <div className="text-[10px] text-gray-400">{tx.product?.sku}</div>
                      </td>
                      <td className="p-3 text-center">
                        {tx.movementType === 'IN' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <ArrowDownRight className="w-3 h-3" /> INWARD
                          </span>
                        ) : tx.movementType === 'OUT' ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <ArrowUpRight className="w-3 h-3" /> OUTWARD
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Sliders className="w-3 h-3" /> {tx.movementType}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span
                          className={
                            tx.movementType === 'IN'
                              ? 'text-emerald-600'
                              : tx.movementType === 'OUT'
                              ? 'text-rose-600'
                              : 'text-blue-600'
                          }
                        >
                          {tx.movementType === 'IN' ? `+${tx.quantity}` : tx.movementType === 'OUT' ? `-${tx.quantity}` : tx.quantity}
                        </span>
                      </td>
                      <td className="p-3 text-center text-gray-700">
                        {tx.previousQuantity !== null && tx.resultingQuantity !== null ? (
                          <span>
                            {tx.previousQuantity} → <strong className="text-gray-900">{tx.resultingQuantity}</strong>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 font-mono text-[11px]">
                        {tx.referenceId || tx.referenceType || 'Direct'}
                      </td>
                      <td className="p-3 text-gray-600 max-w-xs truncate" title={tx.remarks}>
                        {tx.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RECEIVE STOCK MODAL (INWARD) */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                Receive Inward Stock / PO Delivery
              </h3>
              <button onClick={() => setShowReceiveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Product / SKU <span className="text-rose-500">*</span>
                </label>
                <select
                  value={receiveForm.productId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const prod = productsList.find((p) => p.id === pid);
                    setReceiveForm({
                      ...receiveForm,
                      productId: pid,
                      unitCost: prod?.purchasePrice || receiveForm.unitCost,
                    });
                  }}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                >
                  <option value="">-- Select Product --</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.productName} (Current: {p.stockQuantity || 0} units)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Received Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={receiveForm.quantity}
                    onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    value={receiveForm.unitCost}
                    onChange={(e) => setReceiveForm({ ...receiveForm, unitCost: e.target.value })}
                    placeholder="e.g. 38000"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Destination Warehouse</label>
                  <input
                    type="text"
                    value={receiveForm.warehouseName}
                    onChange={(e) => setReceiveForm({ ...receiveForm, warehouseName: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">PO / Inward Ref #</label>
                  <input
                    type="text"
                    value={receiveForm.reference}
                    onChange={(e) => setReceiveForm({ ...receiveForm, reference: e.target.value })}
                    placeholder="e.g. PO-2026-0042"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes / Delivery Details</label>
                <input
                  type="text"
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  placeholder="e.g. Received from Panasonic Authorized Distributor in good condition"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'Receiving...' : 'Record Inward Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE STOCK MODAL (OUTWARD) */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-blue-600" />
                Issue Outward Stock / Dispatch
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Product / SKU <span className="text-rose-500">*</span>
                </label>
                <select
                  value={issueForm.productId}
                  onChange={(e) => setIssueForm({ ...issueForm, productId: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                >
                  <option value="">-- Select Product --</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.productName} (Available: {p.stockQuantity || 0} units)
                    </option>
                  ))}
                </select>
              </div>

              {selectedIssueProduct && (
                <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-md flex items-center justify-between">
                  <span className="text-blue-900 font-medium">Currently Available in Warehouse:</span>
                  <span className="font-bold text-blue-900 text-sm">
                    {selectedIssueProduct.stockQuantity || 0} Units
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Issue Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedIssueProduct?.stockQuantity || 9999}
                    value={issueForm.quantity}
                    onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Issue Reason / Purpose <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={issueForm.reason}
                    onChange={(e) => setIssueForm({ ...issueForm, reason: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white font-medium"
                  >
                    <option value="Installation">Installation Site Dispatch</option>
                    <option value="Service">Service Job Card Consumption</option>
                    <option value="Sale">Direct Counter Sale</option>
                    <option value="Damaged">Damaged / Transit Loss</option>
                    <option value="Sample">Customer Demo / Display</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Job / Invoice / Reference #</label>
                <input
                  type="text"
                  value={issueForm.reference}
                  onChange={(e) => setIssueForm({ ...issueForm, reference: e.target.value })}
                  placeholder="e.g. INST-2026-0002 or JC-2026-0005"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Issue Remarks</label>
                <input
                  type="text"
                  value={issueForm.notes}
                  onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                  placeholder="e.g. Dispatched with Suresh V for customer site installation"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (selectedIssueProduct && selectedIssueProduct.stockQuantity < issueForm.quantity)}
                  className="px-5 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'Issuing...' : 'Confirm Stock Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-gray-800" />
                Physical Stock Adjustment / Audit
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Product / SKU <span className="text-rose-500">*</span>
                </label>
                <select
                  value={adjustForm.productId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const prod = inventory.find((p) => p.id === pid) || productsList.find((p) => p.id === pid);
                    setAdjustForm({
                      ...adjustForm,
                      productId: pid,
                      newQuantity: prod?.stockQuantity || 0,
                    });
                  }}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                >
                  <option value="">-- Select Product --</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.productName} (Current: {p.stockQuantity || 0} units)
                    </option>
                  ))}
                </select>
              </div>

              {selectedAdjustProduct && (
                <div className="grid grid-cols-3 gap-2 bg-gray-50 border border-gray-200 p-2.5 rounded-md text-center">
                  <div>
                    <span className="text-[10px] text-gray-500 block">System Stock</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {selectedAdjustProduct.stockQuantity || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Physical Count</span>
                    <span className="font-bold text-brand text-sm">{adjustForm.newQuantity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Variance (Diff)</span>
                    <span
                      className={`font-bold text-sm ${
                        adjustForm.newQuantity - (selectedAdjustProduct.stockQuantity || 0) >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {adjustForm.newQuantity - (selectedAdjustProduct.stockQuantity || 0) >= 0 ? '+' : ''}
                      {adjustForm.newQuantity - (selectedAdjustProduct.stockQuantity || 0)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Audited Physical Count <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustForm.newQuantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, newQuantity: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand font-bold text-base"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Adjustment Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand bg-white"
                >
                  <option value="Physical Stock Audit">Physical Warehouse Stock Audit</option>
                  <option value="Damaged Stock Write-off">Damaged / Dead Stock Write-off</option>
                  <option value="Found Unrecorded Stock">Found Unrecorded Stock</option>
                  <option value="Data Entry Correction">Initial Data Entry Correction</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Audit Reference / Remarks</label>
                <input
                  type="text"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  placeholder="e.g. Verified by Store Manager during Q3 inventory audit"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gray-900 text-white rounded-md font-semibold hover:bg-black flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'Updating...' : 'Save Audit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL LEDGER & TRANSACTION HISTORY MODAL */}
      {showDetailModal && activeItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col overflow-hidden text-xs">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-gray-900">
                  {activeItem.productName} ({activeItem.sku})
                </h3>
                {getStatusBadge(activeItem.status, activeItem.stockQuantity, activeItem.reorderLevel)}
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-4 gap-3 bg-gray-50 p-3.5 rounded-md border border-gray-200 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 block">Available Stock</span>
                  <span className="font-bold text-gray-900 text-base">{activeItem.stockQuantity}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Unit Cost</span>
                  <span className="font-bold text-gray-900 text-base">
                    ₹{(activeItem.unitCost || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Selling Price</span>
                  <span className="font-bold text-brand text-base">
                    ₹{(activeItem.sellingPrice || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Stock Value</span>
                  <span className="font-bold text-emerald-700 text-base">
                    ₹{(activeItem.stockValue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-gray-500" /> Recent Stock Movements for this Item
                </h4>
                {activeItem.stockMovements?.length === 0 ? (
                  <div className="text-center p-6 bg-gray-50 rounded border text-gray-400">
                    No movements recorded yet for this SKU.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-center">Type</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-center">Snapshot</th>
                          <th className="p-2.5">Reference</th>
                          <th className="p-2.5">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activeItem.stockMovements?.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="p-2.5 text-gray-500 whitespace-nowrap">
                              {new Date(m.createdAt).toLocaleDateString('en-GB')}
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  m.movementType === 'IN'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : m.movementType === 'OUT'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {m.movementType}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-bold">
                              {m.movementType === 'IN' ? `+${m.quantity}` : m.movementType === 'OUT' ? `-${m.quantity}` : m.quantity}
                            </td>
                            <td className="p-2.5 text-center text-gray-700">
                              {m.previousQuantity !== null ? `${m.previousQuantity} → ${m.resultingQuantity}` : '—'}
                            </td>
                            <td className="p-2.5 text-gray-600 font-mono text-[11px]">{m.referenceId || 'Direct'}</td>
                            <td className="p-2.5 text-gray-600 truncate max-w-xs">{m.remarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-semibold text-xs hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
