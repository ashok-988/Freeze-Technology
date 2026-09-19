import './globals.css';
import AppShell from '../components/AppShell';

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
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
