"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  UserCircle,
  Settings,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLuminaStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';

export function AppSidebar() {
  const pathname = usePathname();
  const { currentUser, currentRole, setRole } = useLuminaStore();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    
    // Artist Navigation
    { label: 'My Tasks', icon: CheckSquare, href: '/tasks', roles: ['Artist', 'Lead', 'Production Head'] },
    { label: 'My Reviews', icon: Film, href: '/review', roles: ['Artist', 'Production Head'] },
    { label: 'Daily Standup', icon: FileSpreadsheet, href: '/daily-tracking', roles: ['Artist', 'Production Head'] },
    
    // Lead Navigation
    { label: 'Team Tasks', icon: UserCheck, href: '/lead-dashboard', roles: ['Lead', 'Production Head'] },
    { label: 'Review Queue', icon: Film, href: '/review', roles: ['Lead', 'Department Supervisor', 'Production Head'] },
    { label: 'Capacity Planning', icon: Activity, href: '/workload', roles: ['Lead', 'Production Head'] },
    
    // Supervisor Navigation
    { label: 'Department Queue', icon: LayoutList, href: '/department-queue', roles: ['Department Supervisor', 'Production Head'] },
    { label: 'Department Progress', icon: Gauge, href: '/department-progress', roles: ['Department Supervisor', 'Production Head'] },
    { label: 'Artist Allocation', icon: Users, href: '/workload', roles: ['Department Supervisor', 'Production Head'] },
    { label: 'Calendar', icon: Calendar, href: '/scheduling', roles: ['Department Supervisor', 'Production Head'] },

    // Management & Executive Navigation
    { label: 'Staff Directory', icon: ShieldCheck, href: '/users', roles: ['Production Head', 'Department Supervisor', 'Lead'] },
    { label: 'Projects', icon: Layers, href: '/projects', roles: ['Production Head'] },
    { label: 'Import Bid Sheet', icon: TableIcon, href: '/import', roles: ['Production Head'] },
    { label: 'Analytics', icon: BarChart3, href: '/analytics', roles: ['Production Head', 'Department Supervisor', 'Lead'] },
    
    // Universal Operations
    { label: 'Leave Requests', icon: Calendar, href: '/leaves' },
    { label: 'Notifications', icon: Bell, href: '/notifications' },
    { label: 'Profile & Settings', icon: Settings, href: '/settings' },
  ];

  const filteredItems = navItems.filter(item => 
    !item.roles || item.roles.includes(currentRole)
  );

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden shrink-0">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-crimson rounded-md flex items-center justify-center">
            <Layers className="text-white w-5 h-5" />
          </div>
          <span className="font-headline text-lg tracking-tight text-white uppercase">SM rolling FX</span>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-white h-8 w-8">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-crimson rounded-full animate-pulse"></span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-sidebar border-sidebar-border text-white shadow-2xl p-0 overflow-hidden" align="start">
             <div className="bg-sidebar-accent p-3 border-b border-sidebar-border">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Production Alerts</h4>
             </div>
             <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                <div className="p-3 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer">
                  <p className="text-xs text-white mb-1">New task: <span className="text-crimson font-bold">SH_010 Hero Comp</span></p>
                  <p className="text-[10px] text-muted-foreground">Allocated by Supervisor • 5m ago</p>
                </div>
             </div>
             <Button variant="ghost" className="w-full text-[10px] uppercase font-bold text-muted-foreground hover:text-white rounded-none border-t border-sidebar-border" asChild>
               <Link href="/notifications">Enter Notification Center</Link>
             </Button>
          </PopoverContent>
        </Popover>
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

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-2">
          <UserCircle className="w-3 h-3" /> Role Matrix Simulator
        </p>
        <div className="grid grid-cols-2 gap-1">
          {['Production Head', 'Department Supervisor', 'Lead', 'Artist'].map(r => (
            <button
              key={r}
              onClick={() => setRole(r as any)}
              className={cn(
                "text-[8px] px-2 py-1.5 rounded border transition-colors truncate",
                currentRole === r ? "bg-crimson text-white border-crimson" : "text-muted-foreground border-sidebar-border hover:bg-sidebar-accent"
              )}
            >
              {r.split(' ')[0]} {r.split(' ')[1] || ''}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto p-4 bg-sidebar-accent/50">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarImage src={currentUser?.avatarUrl} />
            <AvatarFallback>{currentUser?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-white truncate">{currentUser?.name}</span>
            <span className="text-[10px] text-crimson font-bold uppercase tracking-tighter">{currentRole}</span>
          </div>
        </div>
        
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white hover:bg-sidebar-accent p-2 h-auto text-xs" asChild>
          <Link href="/dashboard"><LogOut className="w-4 h-4 mr-2" /> Sign Out</Link>
        </Button>
      </div>
    </div>
  );
}
