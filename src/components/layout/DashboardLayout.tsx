"use client";

import React from "react";
import { AppSidebar } from "@/components/layout/sidebar";

import { usePathname } from "next/navigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div key={pathname} className="animate-fade-in-up-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
