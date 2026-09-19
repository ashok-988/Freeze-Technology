import './globals.css';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';

export const metadata = {
  title: 'Freeze Technology ERP - Panasonic Authorised Sales & Service',
  description: 'Air Conditioning & Refrigeration Sales, Service, Job Cards, AMC & GST Invoicing ERP',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-canvas text-gray-900 min-h-screen flex antialiased">
        {/* Left Sidebar Navigation */}
        <Sidebar />

        {/* Main Workspace */}
        <div className="ml-64 flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-40 px-6 flex items-center justify-between">
            <div className="w-80 relative">
              <input
                type="text"
                placeholder="Search Invoices, Customers, Job Cards..."
                className="w-full pl-4 pr-4 py-1.5 bg-canvas border border-gray-200 rounded-full text-xs outline-none focus:border-brand transition"
              />
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <Link
                href="/invoices"
                className="bg-brand text-white px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-dark transition"
              >
                + New Invoice
              </Link>
            </div>
          </header>

          <main className="p-6 flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
