
"use client";

import React from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { StatCard } from '@/components/dashboard/stat-card';
import { 
  Projector, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp,
  Activity,
  ArrowRight,
  TrendingDown,
  Database
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart,
  Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLuminaStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const deptPerformanceData = [
  { name: 'Paint', productivity: 112 },
  { name: 'Roto', productivity: 95 },
  { name: 'Comp', productivity: 124 },
  { name: 'Matchmove', productivity: 88 },
  { name: 'CG', productivity: 105 },
];

export default function DashboardPage() {
  const { currentRole } = useLuminaStore();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Single Source of Truth</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">
                {currentRole === 'Production Head' ? 'Enterprise Control' : 
                 currentRole === 'Department Supervisor' ? 'Department Control' : 'Team Overview'}
              </h1>
              <p className="text-muted-foreground font-body">Real-time studio health aggregated from automated artist tracking.</p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-crimson text-white hover:bg-crimson/90">Automated Weekly Report</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Pipeline Health" value="OPTIMAL" icon={Activity} />
            <StatCard label="Studio Productivity" value="108%" icon={TrendingUp} trend={{ value: 4, isPositive: true }} />
            <StatCard label="Bid Compliance" value="92%" icon={CheckCircle2} />
            <StatCard label="Budget Alerts" value="12" icon={TrendingDown} iconColor="text-red-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Auto-Calculated Productivity Index</CardTitle>
                <CardDescription className="text-muted-foreground">Aggregated from active artist worklogs (Bid / Actual).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="productivity" fill="#E6192E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Allocation Status</CardTitle>
                <CardDescription className="text-muted-foreground">Automated artist workload balance.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {['Comp', 'Roto', 'Paint', 'Matchmove'].map((dept) => (
                    <div key={dept} className="space-y-2">
                       <div className="flex justify-between text-xs">
                         <span className="text-white font-bold">{dept}</span>
                         <span className="text-muted-foreground">85% Assigned</span>
                       </div>
                       <div className="h-1.5 w-full bg-sidebar-accent rounded-full">
                         <div className="h-full bg-crimson rounded-full" style={{ width: '85%' }} />
                       </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
