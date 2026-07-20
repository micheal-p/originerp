// API facade. Pages call apiGet/apiPost/... against a stable endpoint contract;
// the implementation underneath is either Supabase (default) or a localStorage
// demo mock (VITE_DEMO_MODE=true).
import { demoApi } from './demo.js';
import { supabaseApi } from './supabaseApi.js';
import type { AuthResult } from '../types';

export const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export interface ApiOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

type AuthExpiredListener = () => void;

let accessToken: string | null = null;
const listeners = new Set<AuthExpiredListener>();

export const setAccessToken = (t: string | null): void => { accessToken = t; };
export const getAccessToken = (): string | null => accessToken;

/** Reserved hook for forced sign-out; kept for API stability. */
export const onAuthExpired = (fn: AuthExpiredListener): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

const backend = (path: string, opts?: ApiOpts): Promise<any> => (DEMO ? demoApi(path, opts) : supabaseApi(path, opts));

/** Restore a session on app boot; null when there is no valid session. */
export async function bootSession(): Promise<AuthResult | null> {
  try {
    const d = await backend('/auth/refresh', { method: 'POST' });
    accessToken = d.accessToken;
    return d as AuthResult;
  } catch {
    return null;
  }
}

export async function api<T = any>(path: string, opts: ApiOpts = {}): Promise<T> {
  const data = await backend(path, opts);
  if (data && data.accessToken) accessToken = data.accessToken;
  return data as T;
}

export const apiGet = <T = any>(p: string): Promise<T> => api<T>(p);
export const apiPost = <T = any>(p: string, body?: unknown): Promise<T> => api<T>(p, { method: 'POST', body });
export const apiPatch = <T = any>(p: string, body?: unknown): Promise<T> => api<T>(p, { method: 'PATCH', body });
export const apiPut = <T = any>(p: string, body?: unknown): Promise<T> => api<T>(p, { method: 'PUT', body });
export const apiDelete = <T = any>(p: string): Promise<T> => api<T>(p, { method: 'DELETE' });
