import type { Metadata } from 'next';
import './globals.css';
import { ensureBootstrap } from '@/lib/bootstrap';
import AuthProvider from './components/AuthProvider';

export const metadata: Metadata = {
  title: 'FMS Fleet Dashboard',
  description: 'Fleet Management System - Real-time Dashboard',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureBootstrap();

  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
