'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser } from '@/lib/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

const LOGIN_PATH = '/login';

export function useAuth() {
  return useContext(AuthContext);
}

/** Fetch a socket auth token for the signed-in user and hand it to the socket client. */
async function loadSocketToken(): Promise<void> {
  try {
    const res = await fetch('/api/auth/token');
    if (!res.ok) throw new Error(`Token request failed (${res.status})`);
    const data = await res.json();
    if (!data.token) return;
    const { setSocketToken } = await import('@/lib/socket');
    setSocketToken(data.token);
  } catch {
    // Socket stays unauthenticated; real-time updates simply won't arrive.
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fallback for a cookie the proxy accepted but the API rejected (or a network failure).
  const redirectToLogin = useCallback(() => {
    if (window.location.pathname !== LOGIN_PATH) router.replace(LOGIN_PATH);
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        setUser(await res.json());
        // Not awaited: first paint must not wait on the socket token.
        void loadSocketToken();
        return;
      }
      setUser(null);
      redirectToLogin();
    } catch {
      setUser(null);
      redirectToLogin();
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = LOGIN_PATH;
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, logout, refreshUser }),
    [user, loading, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
