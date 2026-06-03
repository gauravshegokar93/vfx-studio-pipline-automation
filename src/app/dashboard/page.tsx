"use client";

import React, { useMemo } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { 
  Briefcase,
  TrendingUp,
  Users,
  Film,
  Layers,
  Clock,
  Target,
  BarChart3,
  DollarSign,
  AlertCircle,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLuminaStore } from '@/lib/store';
import { analyticsService } from '@/services/analyticsService';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ProductionHeadDashboard() {
  const { currentRole, projects, shots, tasks } = useLuminaStore();
  
  // Executive Guard
  if (currentRole !== 'Production Head') {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <ShieldCheck className="w-16 h-16 text-crimson opacity-20 mb-4" />
          <h1 className="text-2xl font-headline text-white">Executive View Restricted</h1>
          <p className="text-muted-foreground max-w-sm mt-2">
            This dashboard provides high-level studio intelligence. Please use your department workbench for operational tasks.
          </p>
          <Button variant="outline" className="mt-6 border-sidebar-border" asChild>
            <Link href="/tasks">Return to Workbench</Link>
          </Button>
        </main>
      </div>
    );
  }

  // Aggregate Executive Data
  const stats = useMemo(() => analyticsService.getStudioStats(), [tasks, shots, projects]);
  const projectHealth = useMemo(() => analyticsService.getProjectHealthData(), [projects, shots, tasks]);
  const deptMetrics = useMemo(() => analyticsService.getDepartmentMetrics(), [tasks]);
  const leadMetrics = useMemo(() => analyticsService.getLeadPerformance(), [tasks]);

  const hasData = projects.length > 0;

  const bidData = [
    { name: 'Consumed', value: stats.utilizedBid, fill: '#E6192E' },
    { name: 'Remaining', value: stats.remainingBid, fill: '#333' }
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-8 space-y-8 pb-20">
          {/* Executive Header */}
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Studio Intelligence Hub</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Executive Overview</h1>
              <p className="text-muted-foreground">Studio performance and capacity throughput across the pipeline.</p>
            </div>
            {!hasData && (
              <Button className="bg-crimson shadow-lg shadow-crimson/20 font-bold h-12 px-8" asChild>
                <Link href="/import">Initialize Studio SSoT</Link>
              </Button>
            )}
          </div>

          {!hasData ? (
             <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-sidebar-border rounded-3xl bg-sidebar/5">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-6 opacity-20" />
                <h3 className="text-3xl font-bold text-white mb-3">No Studio Data</h3>
                <p className="text-muted-foreground mb-10 text-center max-w-lg leading-relaxed">
                  Your executive environment is ready but currently empty. Bootstrap your studio pipeline by importing the client's Bid Sheet.
                </p>
                <Button className="bg-crimson h-16 px-12 rounded-2xl text-xl font-bold shadow-xl shadow-crimson/30" asChild>
                  <Link href="/import">Import Client Bid Sheet</Link>
                </Button>
             </div>
          ) : (
            <>
              {/* Studio Key KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card border-none p-6 shadow-xl group hover:ring-1 hover:ring-crimson transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Revenue Forecast</p>
                    <DollarSign className="w-4 h-4 text-green-500" />
                  </div>
                  <h3 className="text-3xl font-headline text-white">${(stats.revenueForecast / 1000).toFixed(1)}k</h3>
                  <div className="mt-4 flex flex-col gap-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Earned Revenue</p>
                    <p className="text-sm font-bold text-green-500">${(stats.revenueRecognized / 1000).toFixed(1)}k</p>
                  </div>
                </Card>

                <Card className="bg-card border-none p-6 shadow-xl group hover:ring-1 hover:ring-crimson transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Studio Capacity</p>
                    <Zap className="w-4 h-4 text-yellow-500" />
                  </div>
                  <h3 className="text-3xl font-headline text-white">{stats.efficiency}%</h3>
                  <div className="mt-4 flex flex-col gap-1">
                    <Progress value={stats.efficiency} className="h-1 bg-sidebar-accent" />
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase">Utilization Index</p>
                  </div>
                </Card>

                <Card className="bg-card border-none p-6 shadow-xl group hover:ring-1 hover:ring-crimson transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Active Hierarchy</p>
                    <Film className="w-4 h-4 text-crimson" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <h4 className="text-2xl font-headline text-white">{stats.totalProjects}</h4>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold">Projects</p>
                    </div>
                    <div>
                      <h4 className="text-2xl font-headline text-white">{stats.totalShots}</h4>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold">Shots</p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-card border-none p-6 shadow-xl group hover:ring-1 hover:ring-crimson transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Risk Rating</p>
                    <AlertCircle className={cn("w-4 h-4", stats.riskFactor === 'High' ? "text-red-500" : "text-yellow-500")} />
                  </div>
                  <h3 className={cn("text-3xl font-headline", stats.riskFactor === 'High' ? "text-red-500" : "text-white")}>
                    {stats.riskFactor}
                  </h3>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] uppercase">{stats.overdueTasks} Overdue Tasks</Badge>
                  </div>
                </Card>
              </div>

              {/* Bid Utilization & Departmental Efficiency */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="bg-card border-none shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-white font-headline">Bid Volume Consumption</CardTitle>
                    <CardDescription>Studio-wide total bid vs actual hours tracked.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] flex flex-col items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bidData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {bidData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-2xl font-headline text-white">{stats.utilizedBid}h</p>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold">Consumed</p>
                    </div>
                    <div className="w-full flex justify-between mt-4 border-t border-sidebar-border pt-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Bid</p>
                        <p className="text-sm font-bold text-white">{stats.assignedBid}h</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Remaining</p>
                        <p className="text-sm font-bold text-white">{stats.remainingBid}h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-none shadow-2xl lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white font-headline">Pipeline Unit Efficiency</CardTitle>
                    <CardDescription>Performance ratio and capacity utilization per department.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', color: '#fff' }} />
                        <Bar dataKey="efficiency" name="Efficiency" radius={[4, 4, 0, 0]} fill="#E6192E" />
                        <Bar dataKey="capacityUtilization" name="Capacity Used" radius={[4, 4, 0, 0]} fill="#333" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Project Health Matrix */}
              <Card className="bg-card border-none shadow-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-sidebar-accent/20 border-b border-sidebar-border">
                  <div>
                    <CardTitle className="text-white font-headline">Executive Project Health Matrix</CardTitle>
                    <CardDescription>Live burn rate and delivery forecasting for current slate.</CardDescription>
                  </div>
                  <Button variant="ghost" className="text-crimson text-xs font-bold uppercase" asChild>
                    <Link href="/projects">Full Slate Hierarchy <ChevronRight className="w-4 h-4 ml-2" /></Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-sidebar-accent/50 text-[10px] uppercase font-bold text-muted-foreground border-b border-sidebar-border">
                        <tr>
                          <th className="px-6 py-4">Production Name</th>
                          <th className="px-6 py-4">Slate Progress</th>
                          <th className="px-6 py-4">Bid vs Actual</th>
                          <th className="px-6 py-4">Efficiency</th>
                          <th className="px-6 py-4">Forecast</th>
                          <th className="px-6 py-4 text-right">Burn Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sidebar-border">
                        {projectHealth.map(proj => (
                          <tr key={proj.id} className="hover:bg-sidebar-accent/10 transition-colors">
                            <td className="px-6 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-crimson/10 text-crimson rounded-xl flex items-center justify-center font-bold text-xs">
                                  {proj.code}
                                </div>
                                <span className="font-bold text-white">{proj.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-6 w-64">
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-white">{proj.progress}%</span>
                                </div>
                                <Progress value={proj.progress} className="h-1 bg-sidebar-accent" />
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="text-sm">
                                <span className="text-white font-bold">{proj.actual}h</span>
                                <span className="text-muted-foreground"> / {proj.bid}h</span>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <Badge className={cn(
                                "font-bold",
                                proj.efficiency >= 100 ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                              )}>
                                {proj.efficiency}%
                              </Badge>
                            </td>
                            <td className="px-6 py-6">
                              <Badge variant="outline" className={cn(
                                "uppercase text-[8px]",
                                proj.forecastStatus === 'On Track' ? "text-green-500" : "text-yellow-500"
                              )}>
                                {proj.forecastStatus}
                              </Badge>
                            </td>
                            <td className="px-6 py-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-white font-bold text-lg">1.2x</span>
                                <span className="text-[8px] text-muted-foreground uppercase font-bold">Velocity</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Lead & Resource Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-card border-none shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-white font-headline">Lead Efficiency Rankings</CardTitle>
                    <CardDescription>Department leads ranked by managed shot throughput efficiency.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {leadMetrics.slice(0, 5).map((lead, i) => (
                        <div key={lead.name} className="flex items-center justify-between p-4 bg-sidebar-accent/20 rounded-xl border border-sidebar-border">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-muted-foreground">{i+1}</span>
                            <div className="w-10 h-10 rounded-full bg-crimson/20 flex items-center justify-center font-bold text-crimson">
                              {lead.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{lead.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">{lead.managedShots} Shots Managed</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-headline text-white">{lead.efficiency}%</p>
                            <p className="text-[8px] text-muted-foreground uppercase font-bold">Yield Ratio</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-crimson border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-8">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Briefcase className="w-48 h-48 rotate-12" />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <h3 className="text-3xl font-headline font-bold text-white">Resource Allocation Ready</h3>
                    <p className="text-white/80 leading-relaxed">
                      Studio capacity is currently operating at {stats.efficiency}% efficiency. Based on current burn rates, next-reel delivery risk is LOW.
                    </p>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                      <div>
                        <p className="text-2xl font-headline text-white">{stats.totalArtists}</p>
                        <p className="text-[10px] text-white/60 uppercase font-bold">Active Artists</p>
                      </div>
                      <div>
                        <p className="text-2xl font-headline text-white">{stats.totalDepartments}</p>
                        <p className="text-[10px] text-white/60 uppercase font-bold">Pipeline Units</p>
                      </div>
                      <div>
                        <p className="text-2xl font-headline text-white">40h</p>
                        <p className="text-[10px] text-white/60 uppercase font-bold">Artist Cap</p>
                      </div>
                    </div>
                    <Button className="w-full bg-white text-crimson font-bold hover:bg-white/90 h-12 rounded-xl mt-4 shadow-xl" asChild>
                      <Link href="/analytics">Enter Full Analytics Suite</Link>
                    </Button>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}