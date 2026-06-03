
"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { StatCard } from '@/components/dashboard/stat-card';
import { 
  Film,
  Database,
  Users,
  FilmIcon,
  Layers,
  Gauge,
  TrendingUp,
  Plus,
  AlertCircle,
  Clock,
  Briefcase
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
  Cell
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
  }, [tasks, shots]);

  const hasData = projects.length > 0;

  const studioUtilization = data?.util ? Math.round(data.util.reduce((acc: number, u: any) => acc + u.value, 0) / data.util.length) : 0;
  
  const completedShots = shots.filter(s => s.status === 'Approved' || s.status === 'Completed').length;
  const pendingReviews = tasks.filter(t => t.status === 'Pending Review').length;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Single Source of Truth Dashboard</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">
                Studio Control Center
              </h1>
              <p className="text-muted-foreground font-body">Real-time production health aggregated from Shot Name-based tracking.</p>
            </div>
            {!hasData && (
              <Button className="bg-crimson shadow-lg shadow-crimson/20 font-bold h-12 px-8" asChild>
                <Link href="/import"><Plus className="w-5 h-5 mr-2" /> Bootstrap Production</Link>
              </Button>
            )}
          </div>

          {hasData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard label="Studio Utilization" value={`${studioUtilization}%`} icon={Gauge} />
                <StatCard label="Live Shots" value={shots.length} icon={Film} />
                <StatCard label="Shots Approved" value={completedShots} icon={TrendingUp} iconColor="text-green-500" />
                <StatCard label="Pending Review" value={pendingReviews} icon={Clock} iconColor="text-accent" />
                <StatCard label="Active Artists" value="156" icon={Users} iconColor="text-blue-400" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {data && (
                  <>
                    <Card className="bg-card border-none shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-white font-headline text-xl">Departmental Throughput</CardTitle>
                        <CardDescription>Capacity allocation per pipeline unit.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.util}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                            <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                               {data.util.map((entry: any, index: number) => (
                                 <Cell key={`cell-${index}`} fill={entry.value > 90 ? '#E6192E' : '#3266E6'} />
                               ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-none shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-white font-headline text-xl">Bid vs Actual Variance</CardTitle>
                        <CardDescription>Aggregate hours tracked vs Client Bid Sheet volume.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data.bidAct}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                            <YAxis stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Line type="monotone" dataKey="bid" name="Client Bid" stroke="#666" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            <Line type="monotone" dataKey="actual" name="Actual Tracked" stroke="#E6192E" strokeWidth={4} dot={{ r: 6, fill: '#E6192E' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-12">
                 <Card className="bg-card border-none shadow-2xl col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div>
                          <CardTitle className="text-white font-headline text-lg">Active Hierarchy Progress</CardTitle>
                          <CardDescription>Visualizing shot completion density across live projects.</CardDescription>
                       </div>
                       <Button variant="ghost" className="text-xs uppercase font-bold text-crimson" asChild>
                          <Link href="/projects">Full Hierarchy <TrendingUp className="w-4 h-4 ml-2" /></Link>
                       </Button>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-6">
                          {projects.slice(0, 3).map(proj => {
                             const projShots = shots.filter(s => s.projectId === proj.id);
                             const projDone = projShots.filter(s => s.status === 'Approved').length;
                             const progress = projShots.length > 0 ? Math.round((projDone / projShots.length) * 100) : 0;
                             return (
                                <div key={proj.id} className="space-y-3">
                                   <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                         <div className="w-2 h-2 rounded-full bg-crimson" />
                                         <span className="text-sm font-bold text-white uppercase tracking-tighter">{proj.projectName}</span>
                                      </div>
                                      <span className="text-xs text-muted-foreground font-mono">{projDone} / {projShots.length} Shots Approved</span>
                                   </div>
                                   <div className="flex items-center gap-4">
                                      <div className="flex-1 h-2 bg-sidebar-accent rounded-full overflow-hidden">
                                         <div className="h-full bg-crimson" style={{ width: `${progress}%` }} />
                                      </div>
                                      <span className="text-xs font-bold text-white w-10 text-right">{progress}%</span>
                                   </div>
                                </div>
                             )
                          })}
                       </div>
                    </CardContent>
                 </Card>
                 
                 <Card className="bg-crimson border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-8">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <Briefcase className="w-48 h-48 rotate-12" />
                    </div>
                    <div className="relative z-10 space-y-4">
                       <h3 className="text-2xl font-headline font-bold text-white">Production Analytics Ready</h3>
                       <p className="text-white/80 text-sm leading-relaxed">
                          Your studio data is synchronized with the Single Source of Truth. View detailed productivity ratios and artist efficiency in the main analytics suite.
                       </p>
                       <Button className="bg-white text-crimson font-bold hover:bg-white/90" asChild>
                          <Link href="/analytics">Enter Analytics Center</Link>
                       </Button>
                    </div>
                 </Card>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-sidebar-border rounded-3xl bg-sidebar/20">
              <div className="w-24 h-24 bg-sidebar-accent rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-3">No Studio Data Detected</h3>
              <p className="text-muted-foreground mb-10 text-center max-w-lg leading-relaxed">
                Your production environment is ready but currently empty. Bootstrap your studio pipeline by importing the client's Bid Sheet to activate the SSoT.
              </p>
              <Button className="bg-crimson h-16 px-12 rounded-2xl text-xl font-bold shadow-xl shadow-crimson/30 hover:scale-105 transition-transform" asChild>
                <Link href="/import">Initialize SSoT Environment</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
