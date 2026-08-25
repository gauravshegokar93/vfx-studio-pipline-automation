"use client";

import React from "react";
import {
  Users,
  Shield,
  KeyRound,
  Building2,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminMenuItem {
  title: string;
  icon: React.ReactNode;
}

const adminMenuItems: AdminMenuItem[] = [
  {
    title: "User Management",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Role Management",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    title: "Permission Matrix",
    icon: <KeyRound className="h-4 w-4" />,
  },
  {
    title: "Company Settings",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    title: "System Settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

interface AdminPanelCardProps {
  visible?: boolean;
}

export function AdminPanelCard({ visible = true }: AdminPanelCardProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        {/* Header */}
        <div className="mb-4">
          <h3 className="font-headline text-base font-semibold text-foreground">
            👑 Admin Panel
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Administration & System Management
          </p>
        </div>

        {/* Menu Items */}
        <nav className="space-y-1">
          {adminMenuItems.map((item) => (
            <div
              key={item.title}
              className="group flex items-center justify-between rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground group-hover:text-accent-foreground">
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.title}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent-foreground" />
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
