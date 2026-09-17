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

// Single refresh promise queue management
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
let activeRefreshToken: string | null = null;

export function clearAuthInterceptorState() {
  isRefreshing = false;
  refreshSubscribers = [];
  activeRefreshToken = null;
}

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function handleAuthFailure() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('vfx-auth-session');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useLuminaStore } = require('@/lib/store');
      useLuminaStore.getState().setAccessToken(null);
      useLuminaStore.getState().setCurrentUser(null);
    } catch {
      // ignore storage/store errors
    }
    window.location.href = '/login';
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if response is 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Prevent infinite loop if the request IS the refresh request itself
      if (originalRequest.url?.includes('/auth/refresh')) {
        handleAuthFailure();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (!isRefreshing) {
        let refreshToken: string | null = null;
        if (typeof window !== 'undefined') {
          const sessionStr = localStorage.getItem('vfx-auth-session');
          if (sessionStr) {
            try {
              const session = JSON.parse(sessionStr);
              refreshToken = session.refreshToken ?? null;
            } catch {
              // ignore JSON parse error
            }
          }
        }

        if (!refreshToken) {
          clearAuthInterceptorState();
          handleAuthFailure();
          return Promise.reject(error);
        }

        isRefreshing = true;
        activeRefreshToken = refreshToken;

        try {
          // Call existing refresh endpoint directly via base axios to bypass interceptors
          const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          if (refreshRes.data?.success && refreshRes.data?.accessToken) {
            const newAccessToken = refreshRes.data.accessToken;
            const newRefreshToken = refreshRes.data.refreshToken || refreshToken;

            // PREVENT HIJACKING: check if session is still the one we refreshed
            let validSession = false;
            if (typeof window !== 'undefined') {
              const currentSessionStr = localStorage.getItem('vfx-auth-session');
              if (currentSessionStr) {
                try {
                  const currentSession = JSON.parse(currentSessionStr);
                  if (currentSession.refreshToken === activeRefreshToken) {
                    validSession = true;
                    currentSession.token = newAccessToken;
                    currentSession.refreshToken = newRefreshToken;
                    if (refreshRes.data.user) {
                      currentSession.user = refreshRes.data.user;
                    }
                    localStorage.setItem('vfx-auth-session', JSON.stringify(currentSession));
                  }
                } catch {
                  // ignore storage errors
                }
              }
            }

            if (!validSession) {
              clearAuthInterceptorState();
              return Promise.reject(new Error('Session changed or user logged out during refresh'));
            }

            // Update Zustand store
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { useLuminaStore } = require('@/lib/store');
              useLuminaStore.getState().setAccessToken(newAccessToken);
              if (refreshRes.data.user) {
                useLuminaStore.getState().setCurrentUser(refreshRes.data.user);
              }
            } catch {
              // ignore store errors
            }

            clearAuthInterceptorState();
            onRefreshed(newAccessToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          } else {
            throw new Error('Refresh endpoint returned failure status');
          }
        } catch (refreshErr) {
          clearAuthInterceptorState();
          handleAuthFailure();
          return Promise.reject(refreshErr);
        }
      }

      // Queue concurrent requests while token refresh is in progress
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

