'use client';
import React from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Executive Business Dashboard</h2>
          <p className="text-xs text-gray-500 mt-1">Real-time metrics for Freeze Technology Air Conditioning & Refrigeration Operations</p>
        </div>
        <div className="flex gap-3">
          <a href="/invoices" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-xs font-semibold hover:bg-gray-50">
            + New Invoice
          </a>
          <a href="/services" className="bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark">
            + New Job Card
          </a>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Total Sales Revenue</span>
            <span className="text-xs font-bold text-brand bg-emerald-50 px-2 py-0.5 rounded">+14.2%</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">₹1,20,000</div>
          <div className="text-[11px] text-gray-400 mt-1">Updated today</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Pending Service Jobs</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Active</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">2</div>
          <div className="text-[11px] text-gray-400 mt-1">HVAC Maintenance & Repair</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Active AMC Contracts</span>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Valid</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">2</div>
          <div className="text-[11px] text-gray-400 mt-1">Commercial & Salon Contracts</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Low Stock Reorder Alerts</span>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Reorder</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">1</div>
          <div className="text-[11px] text-gray-400 mt-1">R32 Eco Refrigerant Gas</div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices Table */}
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-900">Recent GST Invoices</h3>
            <a href="/invoices" className="text-xs text-brand font-semibold hover:underline">View All</a>
          </div>
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
              <tr>
                <td className="p-2 font-bold text-brand">FT/2026/0713</td>
                <td className="p-2">M/s. Mebacare Naturals Salon</td>
                <td className="p-2 font-semibold">₹7,000.00</td>
                <td className="p-2"><span className="bg-emerald-100 text-brand px-2 py-0.5 rounded font-semibold text-[10px]">Paid</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Job Cards Table */}
        <div className="bg-white border border-gray-200 rounded-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-900">Active Service Job Cards</h3>
            <a href="/services" className="text-xs text-brand font-semibold hover:underline">View All</a>
          </div>
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
              <tr>
                <td className="p-2 font-bold text-brand">JC-9042</td>
                <td className="p-2">M/s. Mebacare Naturals Salon</td>
                <td className="p-2">Suresh V</td>
                <td className="p-2"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold text-[10px]">In Progress</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
