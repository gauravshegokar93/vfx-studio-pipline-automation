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
  BrainCircuit,
  Search,
  Table as TableIcon,
  LayoutList,
  Calendar,
  Bell,
  Clock,
  History,
  Activity
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
    { label: 'Import Bid Sheet', icon: TableIcon, href: '/import', roles: ['Production Head'] },
    { label: 'Production Queue', icon: LayoutList, href: '/production-queue', roles: ['Production Head', 'Department Supervisor'] },
    { label: 'Hierarchy & Shots', icon: Layers, href: '/projects', roles: ['Production Head', 'Department Supervisor'] },
    { label: 'Department Queue', icon: LayoutList, href: '/department-queue', roles: ['Production Head', 'Department Supervisor'] },
    { label: 'Review Queue', icon: Film, href: '/review', roles: ['Production Head', 'Department Supervisor', 'Lead'] },
    { label: 'My Workbench', icon: CheckSquare, href: '/tasks' },
    { label: 'Workload & Capacity', icon: Users, href: '/workload', roles: ['Production Head', 'Department Supervisor'] },
    { label: 'Version History', icon: History, href: '/versions', roles: ['Production Head', 'Department Supervisor', 'Lead'] },
    { label: 'Resource Scheduling', icon: BrainCircuit, href: '/scheduling', roles: ['Production Head', 'Department Supervisor'] },
    { label: 'Analytics', icon: BarChart3, href: '/analytics' },
    { label: 'Notifications', icon: Bell, href: '/notifications' },
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
          <span className="font-headline text-xl tracking-tight text-white">LUMINA</span>
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
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Alerts</h4>
             </div>
             <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                {[1,2,3].map(i => (
                  <div key={i} className="p-3 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer border-b border-sidebar-border/30 last:border-none">
                    <p className="text-xs text-white mb-1">New task assigned: <span className="text-crimson font-bold">SH_0010 Hero Comp</span></p>
                    <p className="text-[10px] text-muted-foreground">Assigned by Kyle Reese • 10m ago</p>
                  </div>
                ))}
             </div>
             <Button variant="ghost" className="w-full text-[10px] uppercase font-bold text-muted-foreground hover:text-white rounded-none border-t border-sidebar-border" asChild>
               <Link href="/notifications">View All Notifications</Link>
             </Button>
          </PopoverContent>
        </Popover>
      </div>

      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search production..."
            className="w-full bg-sidebar-accent border-none rounded-md py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-crimson outline-none text-white"
          />
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <Link key={item.href} href={item.href}>
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
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Simulated Production Context</p>
        <div className="flex flex-wrap gap-1">
          {['Production Head', 'Department Supervisor', 'Lead', 'Artist'].map(r => (
            <button
              key={r}
              onClick={() => setRole(r as any)}
              className={cn(
                "text-[8px] px-2 py-1 rounded border transition-colors",
                currentRole === r ? "bg-crimson text-white border-crimson" : "text-muted-foreground border-sidebar-border hover:bg-sidebar-accent"
              )}
            >
              {r.split(' ')[0]}
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
        
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white hover:bg-sidebar-accent p-2 h-auto text-xs">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
