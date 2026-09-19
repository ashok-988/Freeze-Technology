'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  CreditCard,
  Wrench,
  ShieldCheck,
  Truck,
  Boxes,
  Building2,
  UserCheck,
  CalendarCheck,
  Banknote,
  ReceiptText,
  BarChart3,
  Bell,
  Settings,
  Layers,
  CalendarClock,
  Sparkles,
  ShieldAlert,
  Key,
  Sliders,
  LineChart,
  BookOpen,
} from 'lucide-react';

const navigationSections = [
  {
    title: 'CRM & Sales',
    items: [
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Products Catalog', href: '/products', icon: Package },
      { name: 'Quotations', href: '/quotations', icon: FileText },
      { name: 'GST Invoices', href: '/invoices', icon: Receipt },
      { name: 'Payments & Receivables', href: '/payments', icon: CreditCard },
    ],
  },
  {
    title: 'Operations & Field',
    items: [
      { name: 'Asset Management', href: '/assets', icon: Layers },
      { name: 'Preventive Maintenance', href: '/preventive-maintenance', icon: CalendarClock },
      { name: 'Service Job Cards', href: '/services', icon: Wrench, badge: '2' },
      { name: 'AMC Tracker', href: '/amc', icon: ShieldCheck },
      { name: 'Installations', href: '/installations', icon: Truck },
    ],
  },
  {
    title: 'Inventory & Procurement',
    items: [
      { name: 'Inventory & Stock', href: '/inventory', icon: Boxes },
      { name: 'Suppliers', href: '/suppliers', icon: Building2 },
    ],
  },
  {
    title: 'HR & Management',
    items: [
      { name: 'Employees', href: '/employees', icon: UserCheck },
      { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { name: 'Payroll', href: '/payroll', icon: Banknote },
    ],
  },
  {
    title: 'Finance & Accounts',
    items: [
      { name: 'Accounting & Ledger', href: '/accounting', icon: BookOpen },
      { name: 'Vendor Bills & Payables', href: '/payables', icon: ReceiptText },
      { name: 'Reports & GST', href: '/reports', icon: BarChart3 },
      { name: 'Asset & Maintenance', href: '/phase15', icon: Sparkles },
      { name: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    title: 'Executive & BI',
    items: [
      { name: 'Executive Dashboard', href: '/executive-dashboard', icon: LineChart },
    ],
  },
  {
    title: 'Administration',
    items: [
      { name: 'Admin Console', href: '/admin', icon: ShieldAlert },
      { name: 'User Management', href: '/users', icon: Users },
      { name: 'Roles & Permissions', href: '/roles', icon: Key },
      { name: 'System Settings', href: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isRouteActive = (href) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <aside className="w-64 bg-brand text-white fixed inset-y-0 left-0 z-50 flex flex-col shadow-lg">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-white/10 flex-shrink-0">
        <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
          <img
            src="/logo.png"
            alt="Freeze Technology Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-white">FREEZE TECHNOLOGY</h1>
          <span className="text-[10px] text-brand-accent font-semibold block">PANASONIC AUTHORISED</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 text-sm font-medium">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition ${
            isRouteActive('/')
              ? 'bg-white/20 text-white font-semibold shadow-sm'
              : 'text-white/80 hover:bg-white/10 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          <span>Dashboard</span>
        </Link>

        {navigationSections.map((section) => (
          <div key={section.title} className="pt-3">
            <div className="text-[10px] uppercase font-bold tracking-wider text-white/50 pb-1 px-3">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isRouteActive(item.href);
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-md transition ${
                      active
                        ? 'bg-white/20 text-white font-semibold shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      {IconComponent && (
                        <IconComponent
                          className={`w-4 h-4 flex-shrink-0 ${
                            active ? 'text-brand-accent' : 'text-white/70'
                          }`}
                        />
                      )}
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-white/10 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center font-bold text-white text-xs">
          AK
        </div>
        <div className="text-xs">
          <div className="font-semibold text-white">Ashok Kumar</div>
          <div className="text-white/60">Administrator</div>
        </div>
      </div>
    </aside>
  );
}
