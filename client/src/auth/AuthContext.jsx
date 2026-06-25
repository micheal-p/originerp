import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, apiPost, setAccessToken, onAuthExpired } from '../api/client.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // On first load, try to restore a session from the refresh cookie.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
        if (r.ok) {
          const data = await r.json();
          setAccessToken(data.accessToken);
          setUser(data.user);
        }
      } catch {
        /* no session */
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  // Forced sign-out when a refresh fails mid-session.
  useEffect(() => onAuthExpired(() => { setAccessToken(null); setUser(null); }), []);

  const login = useCallback(async (email, password) => {
    const data = await apiPost('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await apiPost('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await api('/me');
    setUser(data.user);
    return data.user;
  }, []);

  return (
    <AuthCtx.Provider value={{ user, setUser, booting, login, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}
