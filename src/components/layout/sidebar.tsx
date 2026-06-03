
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
  Settings, 
  LogOut,
  BrainCircuit,
  Clapperboard,
  Search,
  FilePlus,
  Table as TableIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLuminaStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AppSidebar() {
  const pathname = usePathname();
  const { currentUser, currentRole, setRole } = useLuminaStore();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Import Bid Sheet', icon: TableIcon, href: '/import', roles: ['Production Head'] },
    { label: 'Review Queue', icon: Film, href: '/review' },
    { label: 'My Workbench', icon: CheckSquare, href: '/tasks' },
    { label: 'Resource Scheduling', icon: BrainCircuit, href: '/scheduling', roles: ['Production Head', 'Department Supervisor'] },
    { label: 'Analytics', icon: BarChart3, href: '/analytics' },
  ];

  const filteredItems = navItems.filter(item => 
    !item.roles || item.roles.includes(currentRole)
  );

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-crimson rounded-md flex items-center justify-center">
          <Layers className="text-white w-5 h-5" />
        </div>
        <span className="font-headline text-xl tracking-tight text-white">LUMINA</span>
      </div>

      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search hub..."
            className="w-full bg-sidebar-accent border-none rounded-md py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-crimson outline-none text-white"
          />
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
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
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Role Simulator</p>
        <div className="flex flex-wrap gap-1">
          {['Production Head', 'Department Supervisor', 'Lead', 'Artist'].map(r => (
            <button
              key={r}
              onClick={() => setRole(r as any)}
              className={cn(
                "text-[8px] px-2 py-1 rounded border",
                currentRole === r ? "bg-crimson text-white border-crimson" : "text-muted-foreground border-sidebar-border"
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
        
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white hover:bg-sidebar-accent p-2 h-auto text-xs" asChild>
          <Link href="/logout">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Link>
        </Button>
      </div>
    </div>
  );
}
