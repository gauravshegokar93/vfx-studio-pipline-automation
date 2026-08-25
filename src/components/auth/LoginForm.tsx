"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, User, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginFormData } from "@/lib/validators/auth";

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  isLoading?: boolean;
}

export function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Auto-focus username field on page load
  useEffect(() => {
    const usernameInput = document.getElementById("login-username");
    usernameInput?.focus();
  }, []);

  // Focus first invalid field when validation errors change
  useEffect(() => {
    const errors = form.formState.errors;
    const firstErrorField = Object.keys(errors)[0] as keyof LoginFormData | undefined;

    if (firstErrorField) {
      const elementId =
        firstErrorField === "username" ? "login-username" : "login-password";
      const element = document.getElementById(elementId);
      element?.focus();
    }
  }, [form.formState.errors]);

  // Caps Lock detection for password field
  const handlePasswordKeyEvent = useCallback(
    (event: KeyboardEvent) => {
      const passwordInput = document.getElementById("login-password");
      if (passwordInput && document.activeElement === passwordInput) {
        setIsCapsLockOn(event.getModifierState("CapsLock"));
      }
    },
    []
  );

  useEffect(() => {
    const passwordInput = document.getElementById("login-password");
    if (passwordInput) {
      passwordInput.addEventListener("keyup", handlePasswordKeyEvent);
      passwordInput.addEventListener("keydown", handlePasswordKeyEvent);
      return () => {
        passwordInput.removeEventListener("keyup", handlePasswordKeyEvent);
        passwordInput.removeEventListener("keydown", handlePasswordKeyEvent);
      };
    }
  }, [handlePasswordKeyEvent]);

  // Hide Caps Lock warning when password field loses focus
  useEffect(() => {
    const passwordInput = document.getElementById("login-password");
    if (passwordInput) {
      const handleBlur = () => setIsCapsLockOn(false);
      passwordInput.addEventListener("blur", handleBlur);
      return () => passwordInput.removeEventListener("blur", handleBlur);
    }
  }, []);

  const handleFormSubmit = (data: LoginFormData) => {
    onSubmit(data);
  };

  const usernameError = form.formState.errors.username;
  const passwordError = form.formState.errors.password;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Username Field */}
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="login-username">Username / Email</FormLabel>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input
                    id="login-username"
                    placeholder="Enter your username or email"
                    className={cn(
                      "pl-10 transition-all duration-200",
                      usernameError &&
                        "border-destructive focus-visible:ring-destructive"
                    )}
                    autoComplete="username"
                    required
                    aria-required="true"
                    aria-label="Username or email"
                    aria-invalid={!!usernameError}
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="login-password">Password</FormLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className={cn(
                      "pl-10 pr-10 transition-all duration-200",
                      passwordError &&
                        "border-destructive focus-visible:ring-destructive"
                    )}
                    autoComplete="current-password"
                    required
                    aria-required="true"
                    aria-label="Password"
                    aria-invalid={!!passwordError}
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Caps Lock Indicator */}
              {isCapsLockOn && (
                <p className="text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  Caps Lock is ON
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Remember Me"
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal cursor-pointer">
                  Remember Me
                </FormLabel>
              </FormItem>
            )}
          />
          <a
            href="#"
            className="text-sm text-primary hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Forgot Password?
          </a>
        </div>

        {/* Login Button */}
        <Button
          type="submit"
          className="w-full transition-all duration-200"
          size="lg"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
}
