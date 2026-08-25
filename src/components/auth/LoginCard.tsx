"use client";

import React from "react";
import { LoginLogo } from "@/components/auth/LoginLogo";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginFormData } from "@/types/auth";

interface LoginCardProps {
  onSubmit: (data: LoginFormData) => void;
  isLoading?: boolean;
}

export function LoginCard({ onSubmit, isLoading = false }: LoginCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-12 md:p-8">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 shadow-xl sm:p-8">
          {/* Logo and App Name */}
          <div className="mb-6 sm:mb-8">
            <LoginLogo />
          </div>

          {/* Welcome Text */}
          <div className="mb-4 sm:mb-6 text-center">
            <h2 className="font-headline text-xl font-semibold text-foreground sm:text-2xl">
              Welcome Back
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Login Form */}
          <LoginForm onSubmit={onSubmit} isLoading={isLoading} />

          {/* Footer */}
          <div className="mt-6 text-center sm:mt-8">
            <p className="text-xs text-muted-foreground">
              Version 1.0
            </p>
            <p className="text-xs text-muted-foreground">
              &copy; SM Rolling FX
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
