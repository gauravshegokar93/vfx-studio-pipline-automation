
"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { StatCard } from '@/components/dashboard/stat-card';
import { 
  Projector, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Activity,
  Database,
  Users,
  Film,
  Layers,
  CheckSquare,
  UserX,
  Plus
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
import { useLuminaStore } from '@/lib/store';
import { analyticsService } from '@/services/analyticsService';
import Link from 'next/link';

export default function DashboardPage() {
  const { currentRole, projects, sequences, shots, tasks } = useLuminaStore();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const [util, bidAct, health, artProd] = await Promise.all([
        analyticsService.getDepartmentUtilization(),
        analyticsService.getBidVsActual(),
        analyticsService.getProjectHealth(),
        analyticsService.getArtistProductivity()
      ]);
      setData({ util, bidAct, health, artProd });
    };
    loadData();
  }, []);

  const hasData = projects.length > 0;

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
              <p className="text-muted-foreground font-body">Real-time studio health aggregated from SQL Server.</p>
            </div>
            {!hasData && (
              <Button className="bg-crimson shadow-lg shadow-crimson/20 font-bold" asChild>
                <Link href="/import"><Plus className="w-4 h-4 mr-2" /> Bootstrap Studio</Link>
              </Button>
            )}
          </div>

          {hasData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard label="Total Projects" value={projects.length} icon={Projector} />
                <StatCard label="Total Sequences" value={sequences.length} icon={Layers} />
                <StatCard label="Total Shots" value={shots.length} icon={Film} />
                <StatCard label="Total Tasks" value={tasks.length} icon={CheckSquare} />
                <StatCard label="Completed" value={tasks.filter(t => t.status === 'Approved').length} icon={CheckCircle2} iconColor="text-green-500" />
                <StatCard label="Active Artists" value="156" icon={Users} />
                <StatCard label="Overdue" value="142" icon={AlertCircle} iconColor="text-red-500" />
                <StatCard label="Pipeline Health" value="OPTIMAL" icon={Activity} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {data && (
                  <>
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
                        <CardDescription>Real-time tracked hours vs client budget.</CardDescription>
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
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-sidebar-border rounded-2xl bg-sidebar/30">
              <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No Production Data Available</h3>
              <p className="text-muted-foreground mb-8 text-center max-w-md">
                Your studio database is currently empty. Please bootstrap the pipeline by importing the client's Bid Sheet.
              </p>
              <Button className="bg-crimson h-14 px-10 rounded-xl text-lg font-bold" asChild>
                <Link href="/import">Initialize Studio Hub</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
