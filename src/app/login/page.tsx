"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { LoginCard } from "@/components/auth/LoginCard";
import { loginApi } from "@/lib/api";
import { POST_LOGIN_REDIRECT } from "@/config/routes";
import type { LoginFormData, LoginApiResult, LoginUser } from "@/types/auth";
import type { Role } from "@/lib/types";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(POST_LOGIN_REDIRECT);
    }
  }, [isAuthenticated, router]);

  const handleLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const result: LoginApiResult = await loginApi({
        email: data.username,
        password: data.password,
      });

      if (result.success) {
        const backendUser = result.user as LoginUser;

        login({
          user: {
            id: String(backendUser.id),
            employeeCode: backendUser.employeeCode,
            name: backendUser.fullName,
            fullName: backendUser.fullName,
            email: backendUser.email,
            role: backendUser.roleName as Role,
            departmentId: String(backendUser.departmentId),
            departmentName: backendUser.departmentName,
            teamId: backendUser.teamId ? String(backendUser.teamId) : undefined,
            teamName: backendUser.teamName,
            isActive: backendUser.isActive,
            isFirstLogin: false,
            permissions: backendUser.permissions || [],
          },
          token: result.accessToken,
          refreshToken: result.refreshToken,
          role: backendUser.roleName as Role,
          company: backendUser.teamName ?? undefined,
          department: backendUser.departmentName ?? undefined,
        });

        toast({
          title: "Login Successful",
          description: `Welcome back, ${backendUser.fullName}!`,
        });
      } else {
        toast({
          title: "Login Failed",
          description: result.message,
          variant: "destructive",
        });
      }

      return result;
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });

      return {
        success: false,
        message: "An unexpected error occurred. Please try again.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  return <LoginCard onSubmit={handleLoginSubmit} isLoading={isLoading} />;
}
