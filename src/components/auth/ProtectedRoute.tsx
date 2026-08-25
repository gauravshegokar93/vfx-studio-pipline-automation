"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Just a simple mapping for MVP, could be dynamic
const pathnameToPermission: Record<string, string> = {
  "/users": "users.view",
  "/roles": "roles.view",
  "/projects": "projects.view",
  "/tasks": "tasks.view",
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, role, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  const requiredPermission = pathnameToPermission[pathname];

  if (requiredPermission && role) {
    const isSuperAdmin = role === 'Super Admin' || role === 'Admin';
    const hasPerm = isSuperAdmin || ((user as any)?.permissions || []).includes(requiredPermission);
    
    if (!hasPerm) {
      router.push("/unauthorized");
      return null;
    }
  }

  return <>{children}</>;
}
