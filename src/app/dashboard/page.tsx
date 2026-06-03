
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
  TrendingDown
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

const healthData = [
  { day: 'Mon', active: 120, completed: 45 },
  { day: 'Tue', active: 115, completed: 52 },
  { day: 'Wed', active: 125, completed: 38 },
  { day: 'Thu', active: 110, completed: 64 },
  { day: 'Fri', active: 95, completed: 72 },
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
              <h1 className="text-4xl font-headline text-white mb-2">
                {currentRole === 'Production Head' ? 'Enterprise Intelligence' : 
                 currentRole === 'Department Supervisor' ? 'Department Control' : 'Team Overview'}
              </h1>
              <p className="text-muted-foreground font-body">Production analytics and studio pipeline health.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-sidebar-border bg-sidebar text-white">Export PDF</Button>
              <Button className="bg-crimson text-white hover:bg-crimson/90">Studio Report</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Pipeline Health" value="Optimal" icon={Activity} />
            <StatCard label="Avg Productivity" value="108%" icon={TrendingUp} trend={{ value: 4, isPositive: true }} />
            <StatCard label="Bid Compliance" value="92%" icon={CheckCircle2} />
            <StatCard label="Over Budget Tasks" value="12" icon={TrendingDown} iconColor="text-red-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Department Productivity Index</CardTitle>
                <CardDescription className="text-muted-foreground">Productivity = (Bid / Actual) * 100</CardDescription>
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
                <CardTitle className="text-white font-headline text-xl">Studio Velocity</CardTitle>
                <CardDescription className="text-muted-foreground">Weekly task completion trend.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={healthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="day" stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                      <YAxis stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px' }}
                      />
                      <Line type="monotone" dataKey="active" stroke="#333" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="completed" stroke="#E6192E" strokeWidth={3} dot={{ r: 4, fill: '#E6192E' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-none shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white font-headline text-xl">Priority review</CardTitle>
                  <CardDescription className="text-muted-foreground">High-impact versions awaiting approval.</CardDescription>
                </div>
                <Button variant="ghost" className="text-crimson">Review All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { shot: 'SH_010', task: 'Comp', artist: 'Alex R.', status: 'Pending Review', priority: 'Critical' },
                    { shot: 'SH_110', task: 'Matchmove', artist: 'Maya S.', status: 'Overdue', priority: 'High' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-sidebar-accent/50 rounded-lg group">
                      <div className="flex gap-3 items-center">
                         <div className="w-10 h-10 rounded bg-black/40 border border-sidebar-border" />
                         <div>
                            <p className="text-sm font-bold text-white">{item.shot} - {item.task}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{item.artist}</p>
                         </div>
                      </div>
                      <Badge className={item.priority === 'Critical' ? 'bg-red-500' : 'bg-yellow-500'}>
                        {item.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Budget Compliance</CardTitle>
                <CardDescription className="text-muted-foreground">Projects nearing or exceeding bid hours.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { name: 'The Night Walker', bid: 4500, actual: 4820, risk: 'Over Budget' },
                    { name: 'Neon Genesis', bid: 12000, actual: 4200, risk: 'Healthy' }
                  ].map((p, i) => (
                    <div key={i} className="space-y-2">
                       <div className="flex justify-between items-center">
                         <p className="text-sm font-bold text-white">{p.name}</p>
                         <Badge variant="outline" className={p.risk === 'Over Budget' ? 'text-red-500 border-red-500/20' : 'text-green-500 border-green-500/20'}>
                           {p.risk}
                         </Badge>
                       </div>
                       <div className="h-2 w-full bg-sidebar-accent rounded-full overflow-hidden">
                         <div 
                           className={cn("h-full rounded-full transition-all duration-1000", p.risk === 'Over Budget' ? 'bg-red-500' : 'bg-crimson')}
                           style={{ width: `${Math.min(100, (p.actual / p.bid) * 100)}%` }}
                         />
                       </div>
                       <p className="text-[10px] text-muted-foreground uppercase font-bold">
                         {p.actual}h / {p.bid}h Bid
                       </p>
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
