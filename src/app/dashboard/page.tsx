
"use client";

import React, { useEffect, useState } from 'react';
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
  Database,
  Users,
  Film,
  Layers,
  CheckSquare,
  UserX
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
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLuminaStore } from '@/lib/store';
import { analyticsService } from '@/services/analyticsService';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#E6192E', '#A632E6', '#3266E6', '#32E6A6', '#E6A632'];

export default function DashboardPage() {
  const { currentRole } = useLuminaStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [util, bidAct, health, artProd] = await Promise.all([
          analyticsService.getDepartmentUtilization(),
          analyticsService.getBidVsActual(),
          analyticsService.getProjectHealth(),
          analyticsService.getArtistProductivity()
        ]);
        setData({ util, bidAct, health, artProd });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-8">
        <Skeleton className="h-12 w-1/2 mb-8 bg-sidebar-accent" />
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-sidebar-accent" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-80 bg-sidebar-accent" />
          <Skeleton className="h-80 bg-sidebar-accent" />
        </div>
      </main>
    </div>
  );

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
                {currentRole} Control
              </h1>
              <p className="text-muted-foreground font-body">Real-time studio health aggregated from automated tracking.</p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-crimson text-white hover:bg-crimson/90 shadow-lg shadow-crimson/20">Automated Weekly Report</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <StatCard label="Total Projects" value="12" icon={Projector} />
            <StatCard label="Total Sequences" value="48" icon={Layers} />
            <StatCard label="Total Shots" value="1,242" icon={Film} />
            <StatCard label="Total Tasks" value="4,892" icon={CheckSquare} />
            <StatCard label="Completed Tasks" value="3,210" icon={CheckCircle2} iconColor="text-green-500" />
            <StatCard label="Pending Tasks" value="1,682" icon={Clock} iconColor="text-yellow-500" />
            <StatCard label="Overdue Tasks" value="142" icon={AlertCircle} iconColor="text-red-500" />
            <StatCard label="Active Artists" value="156" icon={Users} />
            <StatCard label="Artists On Leave" value="8" icon={UserX} iconColor="text-blue-500" />
            <StatCard label="Pipeline Health" value="OPTIMAL" icon={Activity} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Department Utilization</CardTitle>
                <CardDescription>Capacity allocation per department.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.util}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="#E6192E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Bid vs Actual Variance</CardTitle>
                <CardDescription>Comparative analysis of estimated vs logged hours.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.bidAct}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="bid" stroke="#666" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="actual" stroke="#E6192E" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Project Velocity (Health)</CardTitle>
                <CardDescription>Completion percentage trend.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.health}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="day" stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="completion" stroke="#A632E6" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Top Artist Productivity</CardTitle>
                <CardDescription>Highest (Bid / Actual) ratios across studio.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.artProd} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                    <XAxis type="number" stroke="#666" fontSize={12} axisLine={false} tickLine={false} unit="%" />
                    <YAxis dataKey="name" type="category" stroke="#666" fontSize={12} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="productivity" fill="#3266E6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
