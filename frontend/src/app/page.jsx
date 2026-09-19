'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { invoiceApi, serviceApi, amcApi, inventoryApi } from '../lib/api/client';
import { FileText, Wrench, ShieldCheck, Boxes, AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingJobs: 0,
    activeAmc: 0,
    lowStock: 0,
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [invRes, srvRes, amcRes, invenRes] = await Promise.allSettled([
        invoiceApi.getInvoices(),
        serviceApi.getServices(),
        amcApi.getStats ? amcApi.getStats() : Promise.resolve({ success: false }),
        inventoryApi?.getStats ? inventoryApi.getStats() : Promise.resolve({ success: false }),
      ]);

      let invoices = [];
      if (invRes.status === 'fulfilled' && invRes.value?.success && Array.isArray(invRes.value.data)) {
        invoices = invRes.value.data;
        setRecentInvoices(invoices.slice(0, 5));
      } else {
        setRecentInvoices([]);
      }

      let jobs = [];
      if (srvRes.status === 'fulfilled' && srvRes.value?.success && Array.isArray(srvRes.value.data)) {
        jobs = srvRes.value.data;
        setRecentJobs(jobs.slice(0, 5));
      } else {
        setRecentJobs([]);
      }

      const totalRevenue = invoices.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
      const pendingJobs = jobs.filter((j) => j.status !== 'Completed' && j.status !== 'Cancelled').length;
      
      let activeAmc = 0;
      if (amcRes.status === 'fulfilled' && amcRes.value?.success && amcRes.value.data?.active !== undefined) {
        activeAmc = amcRes.value.data.active;
      }

      let lowStock = 0;
      if (invenRes.status === 'fulfilled' && invenRes.value?.success && invenRes.value.data?.lowStockCount !== undefined) {
        lowStock = invenRes.value.data.lowStockCount;
      }

      setStats({
        totalRevenue,
        pendingJobs,
        activeAmc,
        lowStock,
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Executive Business Dashboard</h2>
          <p className="text-xs text-gray-500 mt-1">Real-time metrics for Freeze Technology Air Conditioning & Refrigeration Operations</p>
        </div>
        <div className="flex gap-3">
          <Link href="/invoices" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-xs font-semibold hover:bg-gray-50">
            + New Invoice
          </Link>
          <Link href="/services" className="bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark">
            + New Job Card
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Total Sales Revenue</span>
            <span className="text-xs font-bold text-brand bg-emerald-50 px-2 py-0.5 rounded">Live</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            ₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">From recorded invoices</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Pending Service Jobs</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Active</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingJobs}</div>
          <div className="text-[11px] text-gray-400 mt-1">HVAC Maintenance & Repair</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Active AMC Contracts</span>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Valid</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.activeAmc}</div>
          <div className="text-[11px] text-gray-400 mt-1">Commercial & Retail Contracts</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Low Stock Reorder Alerts</span>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Inventory</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{stats.lowStock}</div>
          <div className="text-[11px] text-gray-400 mt-1">Items at or below reorder level</div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices Table */}
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-900">Recent GST Invoices</h3>
            <Link href="/invoices" className="text-xs text-brand font-semibold hover:underline">View All</Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading invoices...</div>
          ) : recentInvoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">No invoices recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                  <th className="p-2 border-b">Invoice No</th>
                  <th className="p-2 border-b">Customer</th>
                  <th className="p-2 border-b">Amount</th>
                  <th className="p-2 border-b">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentInvoices.map((inv, idx) => (
                  <tr key={inv.id || idx}>
                    <td className="p-2 font-bold text-brand">{inv.invoiceNumber || inv.invoiceNo}</td>
                    <td className="p-2">{inv.customer?.companyName || inv.customer?.customerName || inv.customerName || 'Customer'}</td>
                    <td className="p-2 font-semibold">₹{Number(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                        inv.paymentStatus === 'Paid' ? 'bg-emerald-100 text-brand' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inv.paymentStatus || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Job Cards Table */}
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-900">Active Service Job Cards</h3>
            <Link href="/services" className="text-xs text-brand font-semibold hover:underline">View All</Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading service job cards...</div>
          ) : recentJobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">No active service job cards found.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                  <th className="p-2 border-b">Job #</th>
                  <th className="p-2 border-b">Customer</th>
                  <th className="p-2 border-b">Technician</th>
                  <th className="p-2 border-b">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentJobs.map((job, idx) => (
                  <tr key={job.id || idx}>
                    <td className="p-2 font-bold text-brand">{job.jobNumber || job.complaint?.complaintNumber || 'JC-000'}</td>
                    <td className="p-2">{job.complaint?.customer?.companyName || job.complaint?.customer?.customerName || job.customerName || 'Customer'}</td>
                    <td className="p-2">{job.technician?.fullName || job.technicianName || 'Unassigned'}</td>
                    <td className="p-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold text-[10px]">
                        {job.status || 'In Progress'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
