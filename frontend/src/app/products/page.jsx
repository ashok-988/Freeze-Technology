'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { productApi } from '../../lib/api/client';
import {
  Package,
  Boxes,
  AlertTriangle,
  Layers,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Tag,
  Shield,
  FileText,
  Receipt,
  Wrench,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
} from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    totalStock: 0,
    totalInventoryValue: 0,
    categoriesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [activeProduct, setActiveProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');

  // Form state
  const [formData, setFormData] = useState({
    productName: '',
    sku: '',
    categoryId: '',
    brandId: '',
    model: '',
    serialNumber: '',
    warrantyMonths: 12,
    purchasePrice: '',
    sellingPrice: '',
    taxRate: 18,
    stockQuantity: 1,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedBrand !== 'All') params.brand = selectedBrand;
      if (onlyLowStock) params.status = 'LowStock';

      const [prodRes, statsRes, catRes, brandRes] = await Promise.allSettled([
        productApi.getProducts(params),
        productApi.getStats(),
        productApi.getCategories(),
        productApi.getBrands(),
      ]);

      let loadedProducts = [];
      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        loadedProducts = prodRes.value.data;
        setProducts(loadedProducts);
      } else if (prodRes.status === 'rejected') {
        throw prodRes.reason;
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      } else {
        // Fallback computation
        setStats({
          total: loadedProducts.length,
          lowStock: loadedProducts.filter(
            (p) => (p.stockQuantity || 0) <= 5 && p.category?.categoryName !== 'Service',
          ).length,
          totalStock: loadedProducts.reduce((sum, p) => sum + (p.stockQuantity || 0), 0),
          totalInventoryValue: loadedProducts.reduce(
            (sum, p) => sum + (p.stockQuantity || 0) * (p.sellingPrice || 0),
            0,
          ),
          categoriesCount: new Set(loadedProducts.map((p) => p.categoryId)).size,
        });
      }

      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        setCategories(catRes.value.data);
      }
      if (brandRes.status === 'fulfilled' && brandRes.value?.data) {
        setBrands(brandRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Unable to load product catalog. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedBrand, onlyLowStock]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const validateForm = () => {
    const errors = {};
    if (!formData.productName.trim()) {
      errors.productName = 'Product name is required';
    }
    if (!formData.categoryId) {
      errors.categoryId = 'Please select a category';
    }
    if (!formData.brandId) {
      errors.brandId = 'Please select a brand';
    }
    if (!formData.model.trim()) {
      errors.model = 'Model number or code is required';
    }
    if (formData.sellingPrice === '' || Number(formData.sellingPrice) < 0) {
      errors.sellingPrice = 'Enter a valid selling price';
    }
    if (formData.purchasePrice === '' || Number(formData.purchasePrice) < 0) {
      errors.purchasePrice = 'Enter a valid purchase price';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        warrantyMonths: Number(formData.warrantyMonths || 12),
        taxRate: Number(formData.taxRate || 18),
        stockQuantity: Number(formData.stockQuantity || 0),
      };

      const res = await productApi.createProduct(payload);
      if (res && res.success) {
        showToast('Product added to catalog successfully!');
        setShowAddModal(false);
        resetForm();
        await fetchProducts();
      } else {
        throw new Error(res?.message || 'Failed to save product');
      }
    } catch (err) {
      console.error('Create product failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to create product';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!validateForm() || !activeProduct) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        warrantyMonths: Number(formData.warrantyMonths || 12),
        taxRate: Number(formData.taxRate || 18),
        stockQuantity: Number(formData.stockQuantity || 0),
      };

      const res = await productApi.updateProduct(activeProduct.id, payload);
      if (res && res.success) {
        showToast('Product specifications updated successfully!');
        setShowEditModal(false);
        setActiveProduct(null);
        resetForm();
        await fetchProducts();
      } else {
        throw new Error(res?.message || 'Failed to update product');
      }
    } catch (err) {
      console.error('Update product failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to update product';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!activeProduct) return;
    setSubmitting(true);
    try {
      const res = await productApi.deleteProduct(activeProduct.id);
      if (res && res.success) {
        showToast('Product archived successfully.');
        setShowDeleteModal(false);
        setActiveProduct(null);
        await fetchProducts();
      } else {
        throw new Error(res?.message || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Delete product failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to delete product';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (product) => {
    setActiveProduct(product);
    setFormData({
      productName: product.productName || '',
      sku: product.sku || '',
      categoryId: product.categoryId || (categories[0]?.id || ''),
      brandId: product.brandId || (brands[0]?.id || ''),
      model: product.model || '',
      serialNumber: product.serialNumber || '',
      warrantyMonths: product.warrantyMonths !== undefined ? product.warrantyMonths : 12,
      purchasePrice: product.purchasePrice || '',
      sellingPrice: product.sellingPrice || '',
      taxRate: product.taxRate || 18,
      stockQuantity: product.stockQuantity !== undefined ? product.stockQuantity : 0,
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const openDeleteModal = (product) => {
    setActiveProduct(product);
    setShowDeleteModal(true);
  };

  const openDetailModal = async (product) => {
    setActiveProduct(product);
    setShowDetailModal(true);
    setDetailTab('overview');
    try {
      const res = await productApi.getProductById(product.id);
      if (res && res.data) {
        setDetailProduct(res.data);
      }
    } catch {
      setDetailProduct(product);
    }
  };

  const resetForm = () => {
    setFormData({
      productName: '',
      sku: '',
      categoryId: categories[0]?.id || 'cat-001',
      brandId: brands[0]?.id || 'brd-001',
      model: '',
      serialNumber: '',
      warrantyMonths: 12,
      purchasePrice: '',
      sellingPrice: '',
      taxRate: 18,
      stockQuantity: 1,
    });
    setFormErrors({});
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 text-white transition-all ${
            toastMessage.type === 'error' ? 'bg-red-600' : 'bg-brand'
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
          <h2 className="text-xl font-bold text-gray-900">Products & Equipment Catalog</h2>
          <p className="text-xs text-gray-500 mt-1">
            Panasonic Inverter ACs, Commercial Refrigeration, Spare Parts, and Standard Service Rates
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
            <Plus className="w-4 h-4" /> + Add Product
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Catalog SKUs</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-brand flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</div>
          <div className="text-[11px] text-gray-400 mt-1">Active inventory & services</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Product Categories</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {categories.length || stats.categoriesCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">AC, Refrigeration, Spares & Services</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Warehouse Stock</span>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.totalStock}</div>
          <div className="text-[11px] text-gray-400 mt-1">Total physical units on hand</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Low Stock Alert</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.lowStock}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Units requiring reorder (≤ 5)</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-gray-200 rounded-card p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Product, SKU, Model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-canvas border border-gray-200 rounded-md text-xs outline-none focus:border-brand transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-1.5 bg-canvas border border-gray-200 rounded-md text-xs outline-none focus:border-brand font-medium"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.categoryName}>
                {cat.categoryName}
              </option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="p-1.5 bg-canvas border border-gray-200 rounded-md text-xs outline-none focus:border-brand font-medium"
          >
            <option value="All">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.brandName}>
                {b.brandName}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
              onlyLowStock
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-canvas text-gray-600 border-gray-200 hover:text-gray-900'
            }`}
          >
            Low Stock Only
          </button>

          <button
            onClick={fetchProducts}
            title="Refresh Catalog"
            className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Product Data Table */}
      <div className="bg-white border border-gray-200 rounded-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand mb-2" />
            Loading product catalog...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="font-semibold text-gray-900 mb-1">{error}</div>
            <button
              onClick={fetchProducts}
              className="mt-3 bg-brand text-white px-3 py-1.5 rounded text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-xs">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="font-bold text-gray-900 text-sm mb-1">No products found</div>
            <p className="text-gray-500 max-w-sm mx-auto mb-4">
              {search || selectedCategory !== 'All' || selectedBrand !== 'All'
                ? 'No item matched your search or category filter criteria.'
                : 'Get started by creating your first product or service item.'}
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-brand text-white px-4 py-2 rounded text-xs font-semibold hover:bg-brand-dark transition"
            >
              + Add Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-200">
                  <th className="p-3.5">SKU / Code</th>
                  <th className="p-3.5">Product / Service Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Brand</th>
                  <th className="p-3.5">Model</th>
                  <th className="p-3.5">Selling Price</th>
                  <th className="p-3.5">Stock</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/70 transition">
                    <td className="p-3.5 font-mono font-bold text-brand">{p.sku}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-gray-900">{p.productName}</div>
                      {p.serialNumber && (
                        <div className="text-[10px] text-gray-400">S/N: {p.serialNumber}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-semibold text-[10px]">
                        {p.category?.categoryName || p.categoryId}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-medium text-gray-700">
                        {p.brand?.brandName || p.brandId}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-gray-600">{p.model}</td>
                    <td className="p-3.5 font-bold text-gray-900">
                      ₹{p.sellingPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] font-normal text-gray-400 block">
                        +{p.taxRate || 18}% GST
                      </span>
                    </td>
                    <td className="p-3.5">
                      {p.category?.categoryName === 'Service' ? (
                        <span className="text-gray-400 font-medium">Service Rate</span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            (p.stockQuantity || 0) <= 5
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stockQuantity || 0} Units
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => openDetailModal(p)}
                        title="View Specifications & History"
                        className="p-1 text-gray-600 hover:text-brand hover:bg-emerald-50 rounded transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(p)}
                        title="Edit Product"
                        className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(p)}
                        title="Archive Product"
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand" /> Add Product / Service Item
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Product / Service Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Panasonic 1.5 Ton Inverter AC or Water Wash Service"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className={`w-full p-2 border rounded-md outline-none focus:border-brand ${
                    formErrors.productName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.productName && (
                  <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.productName}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Category *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand bg-white ${
                      formErrors.categoryId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                  {formErrors.categoryId && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.categoryId}</span>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Brand *</label>
                  <select
                    value={formData.brandId}
                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand bg-white ${
                      formErrors.brandId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.brandName}
                      </option>
                    ))}
                  </select>
                  {formErrors.brandId && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.brandId}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Model / Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. CS/CU-NU18YKY5W"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand ${
                      formErrors.model ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.model && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.model}</span>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">SKU (Auto if empty)</label>
                  <input
                    type="text"
                    placeholder="e.g. AC-PAN-15T"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Selling Price (₹ Excl. Tax) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 42500"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand ${
                      formErrors.sellingPrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.sellingPrice && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.sellingPrice}</span>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Purchase Price (₹ Cost) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 36000"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className={`w-full p-2 border rounded-md outline-none focus:border-brand ${
                      formErrors.purchasePrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.purchasePrice && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{formErrors.purchasePrice}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">GST Rate %</label>
                  <input
                    type="number"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Warranty (Months)</label>
                  <input
                    type="number"
                    value={formData.warrantyMonths}
                    onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
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
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-brand" /> Edit Product ({activeProduct?.sku})
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Product / Service Name *
                </label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Brand</label>
                  <select
                    value={formData.brandId}
                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand bg-white"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.brandName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Model / Code</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Stock Units</label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">GST Rate %</label>
                  <input
                    type="number"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Warranty (Mo)</label>
                  <input
                    type="number"
                    value={formData.warrantyMonths}
                    onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
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
                  {submitting ? 'Saving...' : 'Update Product'}
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
              <h3 className="font-bold text-sm text-gray-900">Archive Product?</h3>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              Are you sure you want to archive <strong>{activeProduct?.productName}</strong> ({activeProduct?.sku})?
              This product will be removed from the active catalog. Historical invoices, quotations, and service records referencing this SKU remain preserved.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={submitting}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold disabled:opacity-50"
              >
                {submitting ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 text-xs">
            <div className="flex justify-between items-start pb-4 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">
                    {detailProduct?.productName}
                  </span>
                  <span className="bg-emerald-100 text-brand px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                    {detailProduct?.sku}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold text-[10px]">
                    {detailProduct?.category?.categoryName || detailProduct?.categoryId}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">
                  Brand: {detailProduct?.brand?.brandName || detailProduct?.brandId} • Model: {detailProduct?.model}
                </p>
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
                { key: 'overview', label: 'Technical & Pricing' },
                { key: 'invoices', label: `Invoices (${detailProduct?.invoiceItems?.length || 0})` },
                { key: 'quotations', label: `Quotations (${detailProduct?.quotationItems?.length || 0})` },
                { key: 'services', label: `Service Complaints (${detailProduct?.complaints?.length || 0})` },
                { key: 'amc', label: `AMC Contracts (${detailProduct?.amcContracts?.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key)}
                  className={`px-3 py-2 border-b-2 font-semibold transition ${
                    detailTab === tab.key
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
                      <IndianRupee className="w-4 h-4 text-brand" />
                      <span>
                        <strong>Selling Price:</strong> ₹
                        {detailProduct?.sellingPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (+{detailProduct?.taxRate || 18}% GST)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <IndianRupee className="w-4 h-4 text-gray-400" />
                      <span>
                        <strong>Purchase Cost:</strong> ₹
                        {detailProduct?.purchasePrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Shield className="w-4 h-4 text-brand" />
                      <span><strong>Warranty:</strong> {detailProduct?.warrantyMonths || 12} Months</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Boxes className="w-4 h-4 text-brand" />
                      <span>
                        <strong>Warehouse Stock:</strong> {detailProduct?.stockQuantity || 0} Units
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Tag className="w-4 h-4 text-brand" />
                      <span><strong>Model:</strong> {detailProduct?.model}</span>
                    </div>
                    {detailProduct?.serialNumber && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span><strong>Serial #:</strong> {detailProduct?.serialNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'invoices' && (
              <div>
                {detailProduct?.invoiceItems && detailProduct.invoiceItems.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b">
                        <th className="p-2">Invoice #</th>
                        <th className="p-2">Quantity</th>
                        <th className="p-2">Unit Price</th>
                        <th className="p-2">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailProduct.invoiceItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2 font-bold text-brand">{item.invoice?.invoiceNumber || 'INV'}</td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">₹{item.unitPrice?.toFixed(2)}</td>
                          <td className="p-2 font-semibold">₹{item.totalAmount?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No historical invoices referencing this product SKU.
                  </div>
                )}
              </div>
            )}

            {detailTab === 'quotations' && (
              <div>
                {detailProduct?.quotationItems && detailProduct.quotationItems.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b">
                        <th className="p-2">Quote #</th>
                        <th className="p-2">Quantity</th>
                        <th className="p-2">Unit Price</th>
                        <th className="p-2">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailProduct.quotationItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2 font-bold text-brand">{item.quotation?.quotationNumber || 'QT'}</td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">₹{item.unitPrice?.toFixed(2)}</td>
                          <td className="p-2 font-semibold">₹{item.totalAmount?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No quotations generated for this product SKU.
                  </div>
                )}
              </div>
            )}

            {detailTab === 'services' && (
              <div>
                {detailProduct?.complaints && detailProduct.complaints.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b">
                        <th className="p-2">Complaint #</th>
                        <th className="p-2">Issue Description</th>
                        <th className="p-2">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailProduct.complaints.map((c) => (
                        <tr key={c.id} className="border-b">
                          <td className="p-2 font-bold text-brand">{c.complaintNumber}</td>
                          <td className="p-2">{c.complaintDescription}</td>
                          <td className="p-2">{c.priority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No service breakdown complaints logged for this equipment.
                  </div>
                )}
              </div>
            )}

            {detailTab === 'amc' && (
              <div>
                {detailProduct?.amcContracts && detailProduct.amcContracts.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold border-b">
                        <th className="p-2">AMC #</th>
                        <th className="p-2">Contract Amount</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailProduct.amcContracts.map((a) => (
                        <tr key={a.id} className="border-b">
                          <td className="p-2 font-bold text-brand">{a.amcNumber}</td>
                          <td className="p-2">₹{a.contractAmount?.toFixed(2)}</td>
                          <td className="p-2">{a.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No active AMC maintenance contracts covering this equipment SKU.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
