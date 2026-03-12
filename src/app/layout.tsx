import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FMS Fleet Dashboard',
  description: 'Fleet Management System - Real-time Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
