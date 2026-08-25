import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  let token: string | null = null;
  let tokenSource = 'none';

  if (typeof window !== 'undefined') {
    // PRIMARY: read from in-memory Zustand store (always up-to-date after login / hydration)
    // Import inline to avoid circular dependencies
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useLuminaStore } = require('@/lib/store');
      token = useLuminaStore.getState().accessToken ?? null;
      if (token) tokenSource = 'zustand';
    } catch {
      // store not yet initialized — fall through to localStorage
    }

    // FALLBACK: if store token not yet populated (e.g. very first render before hydration),
    // read directly from localStorage
    if (!token) {
      const sessionStr = localStorage.getItem('vfx-auth-session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          token = session.token ?? null;
          if (token) tokenSource = 'localStorage';
        } catch {
          // ignore malformed session
        }
      }
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // === DIAGNOSTIC LOGGING (safe — never prints actual token) ===
  const url = config.url || config.baseURL || '?';
  console.log(`[apiClient] ${config.method?.toUpperCase()} ${url} | token-exists: ${!!token} | source: ${tokenSource} | token-length: ${token?.length ?? 0} | auth-header: ${!!config.headers.Authorization}`);

  return config;
}, (error) => {
  return Promise.reject(error);
});
