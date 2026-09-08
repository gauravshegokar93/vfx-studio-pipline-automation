
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  CheckSquare,
  Users,
  BarChart3,
  LogOut,
  Search,
  Table as TableIcon,
  LayoutList,
  Calendar,
  Gauge,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLuminaStore } from '@/lib/store';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  permission?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useLuminaStore();
  const { role: authRole, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const displayName =
    currentUser?.name ??
    currentUser?.fullName ??
    currentUser?.username ??
    currentUser?.displayName ??
    'User';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const navSections: NavSection[] = [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', permission: 'dashboard.view' },
        { label: 'Projects', icon: Layers, href: '/projects', permission: 'projects.view' },
        { label: 'Bid Sheet Import', icon: TableIcon, href: '/import', permission: 'projects.view' },
      ],
    },
    {
      title: 'PRODUCTION',
      items: [
        { label: 'My Tasks', icon: CheckSquare, href: '/tasks', permission: 'tasks.view' },
        { label: 'Department Queue', icon: LayoutList, href: '/department-queue', permission: 'departments.view' },
        { label: 'Department Progress', icon: Gauge, href: '/department-progress', permission: 'workspace.production_head' },
        { label: 'Artist Allocation', icon: Users, href: '/workload', permission: 'artists.view' },
      ],
    },
    {
      title: 'REPORTS',
      items: [
        { label: 'Analytics', icon: BarChart3, href: '/analytics', permission: 'reports.view' },
      ],
    },
    {
      title: 'ADMIN / SYSTEM',
      items: [
        { label: 'Staff Directory', icon: ShieldCheck, href: '/users', permission: 'users.view' },
        { label: 'Leave Requests', icon: Calendar, href: '/leaves', permission: 'leave.approve' },
      ],
    },
  ];

  // Get user's permissions from context/store
  const userPermissions = (currentUser as any)?.permissions || [];

  const isItemVisible = (item: NavItem) => {
    if (searchQuery.trim() !== '') {
      if (!item.label.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    if (!item.permission) return true;
    if (authRole === 'Super Admin' || authRole === 'Admin') return true;
    return userPermissions.includes(item.permission);
  };

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden shrink-0 select-none">
      {/* Top Logo */}
      <div className="p-5 flex items-center justify-between border-b border-sidebar-border/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-crimson rounded-md flex items-center justify-center shadow-md">
            <Layers className="text-white w-5 h-5" />
          </div>
          <span className="font-headline text-base tracking-tight text-white uppercase font-bold">
            SM ROLLING FX
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-sidebar-accent/70 border border-sidebar-border/30 rounded-md py-2 pl-9 pr-4 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-crimson transition-all"
          />
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-3 space-y-6 overflow-y-auto scrollbar-hide">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                {section.title}
              </div>
              {visibleItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/'));
                return (
                  <Link key={item.href + item.label} href={item.href}>
                    <span
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group font-medium",
                        isActive
                          ? "bg-sidebar-accent text-white shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-4 h-4 transition-colors shrink-0",
                          isActive
                            ? "text-crimson"
                            : "text-muted-foreground group-hover:text-crimson"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom User Section */}
      <div className="mt-auto p-4 border-t border-sidebar-border/40 bg-sidebar-accent/30">
        <Link href="/settings" title="Profile & Settings">
          <div className="flex items-center justify-between p-2 rounded-md hover:bg-sidebar-accent/80 transition-colors cursor-pointer group mb-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
                <AvatarImage src={currentUser?.avatarUrl || undefined} />
                <AvatarFallback className="text-xs font-semibold bg-crimson text-white">{avatarInitial}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-white truncate group-hover:text-crimson transition-colors">
                  {displayName}
                </span>
                <span className="text-[10px] text-crimson font-bold uppercase tracking-wider truncate">
                  {authRole}
                </span>
              </div>
            </div>
            <Settings className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors shrink-0" />
          </div>
        </Link>

        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-white hover:bg-sidebar-accent p-2 h-auto text-xs font-medium"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

