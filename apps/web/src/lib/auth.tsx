import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { consoleApi } from '../api';
import { setCsrfToken } from '../api/client';
import type { AuthUser } from '../domain/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRefresh = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const work = (async () => {
    try {
      const { user: current } = await consoleApi.me();
      setUser(current);
      setError(null);
      lastRefresh.current = Date.now();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not check your session.');
    } finally {
      setLoading(false);
      inFlight.current = null;
    }
    })();
    inFlight.current = work;
    return work;
  }, []);

  useEffect(() => {
    void refresh();
    const focus = () => { if (Date.now() - lastRefresh.current > 60000) void refresh(); };
    window.addEventListener('focus', focus);
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('petpal-auth');
      channel.current.onmessage = (event) => {
        if (event.data === 'logout') { setUser(null); setCsrfToken(null); setError(null); }
      };
    }
    return () => { window.removeEventListener('focus', focus); channel.current?.close(); };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await consoleApi.logout();
    setUser(null);
    setError(null);
    channel.current?.postMessage('logout');
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, refresh, signOut }),
    [user, loading, error, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}

/** Route guard for the signed-in console pages. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="py-24 text-center text-sm italic text-mist">Checking your session…</p>;
  }
  if (!user) {
    if (error) return <div role="alert" className="py-24 text-center"><p>{error}</p><button onClick={() => void refresh()}>Retry session check</button></div>;
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    );
  }
  return <>{children}</>;
}
