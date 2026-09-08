
"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  Layers,
  CheckSquare,
  Users,
  BarChart3,
  LogOut,
  Search,
  Table as TableIcon,
  LayoutList,
  Calendar,
  Bell,
  Clock,
  Activity,
  UserCheck,
  FileSpreadsheet,
  Gauge,
  Settings,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLuminaStore } from '@/lib/store';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useLuminaStore();
  const { role: authRole, logout } = useAuth();

  const displayName =
    currentUser?.name ??
    currentUser?.fullName ??
    currentUser?.username ??
    currentUser?.displayName ??
    'User';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', permission: 'dashboard.view' as const },
    
    // Artist Navigation
    { label: 'My Tasks', icon: CheckSquare, href: '/tasks', permission: 'tasks.view' as const },
    { label: 'Daily Standup', icon: FileSpreadsheet, href: '/daily-tracking', permission: 'workspace.artist' as const },
    
    // Lead Navigation
    { label: 'Team Tasks', icon: UserCheck, href: '/lead-dashboard', permission: 'teams.view' as const },
    { label: 'Capacity Planning', icon: Activity, href: '/workload', permission: 'workspace.project_manager' as const },
    
    // Supervisor Navigation
    { label: 'Department Queue', icon: LayoutList, href: '/department-queue', permission: 'departments.view' as const },
    { label: 'Department Progress', icon: Gauge, href: '/department-progress', permission: 'workspace.production_head' as const },
    { label: 'Artist Allocation', icon: Users, href: '/workload', permission: 'artists.view' as const },
    { label: 'Calendar', icon: Calendar, href: '/scheduling', permission: 'leave.view' as const },

    // Management & Executive Navigation
    { label: 'Staff Directory', icon: ShieldCheck, href: '/users', permission: 'users.view' as const },
    { label: 'Projects', icon: Layers, href: '/projects', permission: 'projects.view' as const },
    { label: 'Bid Sheet Import', icon: TableIcon, href: '/import', permission: 'projects.view' as const },
    { label: 'Analytics', icon: BarChart3, href: '/analytics', permission: 'reports.view' as const },
    
    // Universal Operations
    { label: 'Leave Requests', icon: Calendar, href: '/leaves', permission: 'leave.approve' as const },
    { label: 'Profile & Settings', icon: Settings, href: '/settings', permission: 'settings.view' as const },
  ];

  // Get user's permissions from context/store
  const userPermissions = (currentUser as any)?.permissions || [];
  
  // Filter items by permission
  const filteredItems = navItems.filter(item => {
    if (!item.permission) return true;
    
    // Super Admin and Admin have access to everything
    if (authRole === 'Super Admin' || authRole === 'Admin') return true;
    
    return userPermissions.includes(item.permission);
  });

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden shrink-0">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-crimson rounded-md flex items-center justify-center">
            <Layers className="text-white w-5 h-5" />
          </div>
          <span className="font-headline text-lg tracking-tight text-white uppercase">SM rolling FX</span>
        </div>
        

      </div>

      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search hierarchy..."
            className="w-full bg-sidebar-accent border-none rounded-md py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-crimson outline-none text-white"
          />
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {filteredItems.map((item) => (
          <Link key={item.href + item.label} href={item.href}>
            <span className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group",
              pathname === item.href 
                ? "bg-sidebar-accent text-white font-medium shadow-sm" 
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
            )}>
              <item.icon className={cn(
                "w-4 h-4",
                pathname === item.href ? "text-crimson" : "text-muted-foreground group-hover:text-crimson"
              )} />
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-sidebar-accent/50">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarImage src={currentUser?.avatarUrl || undefined} />
            <AvatarFallback>{avatarInitial}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-white truncate">{displayName}</span>
            <span className="text-[10px] text-crimson font-bold uppercase tracking-tighter">{authRole}</span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-white hover:bg-sidebar-accent p-2 h-auto text-xs"
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
