"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { User, Role } from "@/lib/types";
import { logoutApi } from "@/lib/api";
import { useLuminaStore } from "@/lib/store";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  role: Role | null;
  company: string | null;
  department: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (data: {
    user: User;
    token: string;
    refreshToken: string;
    role: Role;
    company?: string;
    department?: string;
  }) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

const STORAGE_KEY = "vfx-auth-session";

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  role: null,
  company: null,
  department: null,
  loading: true,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored) as AuthState;
        setState({ ...session, loading: false });
        if (session.user) {
          useLuminaStore.getState().setCurrentUser(session.user);
        }
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const login = useCallback((data: {
    user: User;
    token: string;
    refreshToken: string;
    role: Role;
    company?: string;
    department?: string;
  }) => {
    const newState: AuthState = {
      isAuthenticated: true,
      user: data.user,
      token: data.token,
      refreshToken: data.refreshToken,
      role: data.role,
      company: data.company ?? null,
      department: data.department ?? null,
      loading: false,
    };

    setState(newState);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      useLuminaStore.getState().setCurrentUser(data.user);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const logout = useCallback(() => {
    const { token, refreshToken } = state;

    // Call backend logout API (fire-and-forget)
    if (token && refreshToken) {
      logoutApi(token, refreshToken).catch(() => {
        // Ignore logout API errors — local session will still be cleared
      });
    }

    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      company: null,
      department: null,
      loading: false,
    });

    try {
      localStorage.removeItem(STORAGE_KEY);
      useLuminaStore.getState().setCurrentUser(null);
    } catch {
      // Ignore storage errors
    }
  }, [state]);

  const setUser = useCallback((user: User | null) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  const setToken = useCallback((token: string | null) => {
    setState((prev) => ({ ...prev, token }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        setUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
