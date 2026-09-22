'use client';

import Image from 'next/image';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      window.location.href = '/';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-dark flex items-center justify-center">
      <div className="bg-charcoal-light border border-gb-dark-3 rounded-xl p-8 w-[380px] shadow-2xl">
        <div className="text-center mb-6">
          <Image src="/goldbell-group-logo.svg" alt="Goldbell Group" width={56} height={56} priority className="mx-auto mb-3 h-14 w-14" />
          <h1 className="text-2xl font-bold text-white tracking-tight">FMS Dashboard</h1>
          <p className="text-sm text-neutral-400 mt-1">Fleet Management System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="login-username" className="block text-xs text-neutral-300 font-medium mb-1.5">Username</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-charcoal-dark border border-gb-dark-3 rounded-md px-3 py-2.5 text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Enter username"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="login-password" className="block text-xs text-neutral-300 font-medium mb-1.5">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-charcoal-dark border border-gb-dark-3 rounded-md px-3 py-2.5 text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="mb-4 text-sm text-danger bg-danger/10 border border-danger/20 rounded-md px-3 py-2 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-gb-ink font-semibold py-2.5 rounded-md text-sm transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
