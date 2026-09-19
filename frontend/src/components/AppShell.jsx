'use client';
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-canvas text-gray-900 min-h-screen flex antialiased">
      {/* Sidebar with responsive mobile drawer support */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Workspace */}
      <div className="lg:ml-64 flex-1 flex flex-col min-w-0 transition-all">
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
              aria-label="Open navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-60 sm:w-80 relative">
              <input
                type="text"
                placeholder="Search Invoices, Customers, Job Cards..."
                className="w-full pl-4 pr-4 py-1.5 bg-canvas border border-gray-200 rounded-full text-xs outline-none focus:border-brand transition"
              />
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
