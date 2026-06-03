
"use client";

import React, { useState, useMemo } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { analyticsService } from '@/services/analyticsService';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
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
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Layers, 
  Briefcase, 
  Clock, 
  Target, 
  ShieldCheck,
  Zap,
  BarChart3,
  Search,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyticsHub() {
  const { currentRole, currentUser, projects, shots, tasks } = useLuminaStore();
  
  // Guard for Artist Access
  if (currentRole === 'Artist') {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
          <ShieldCheck className="w-16 h-16 text-crimson opacity-20" />
          <h1 className="text-2xl font-headline text-white">Access Restricted</h1>
          <p className="text-muted-foreground text-center max-w-sm">
            Analytics data is reserved for Production Management and Department Leads. Please check your workbench for task updates.
          </p>
        </main>
      </div>
    );
  }

  // Aggregate Data from Service
  const stats = useMemo(() => analyticsService.getStudioStats(), [tasks, shots, projects]);
  const projectHealth = useMemo(() => analyticsService.getProjectHealthData(), [projects, shots, tasks]);
  const deptMetrics = useMemo(() => analyticsService.getDepartmentMetrics(), [tasks]);
  const capacityData = useMemo(() => analyticsService.getCapacityData(), [tasks]);
  const rankings = useMemo(() => analyticsService.getPerformanceRankings(), [tasks]);

  const [drillDownProject, setDrillDownProject] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-8 space-y-8 pb-20">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Enterprise Intelligence Suite</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Studio Intelligence Hub</h1>
              <p className="text-muted-foreground">Real-time SSoT analytics driving cinematic production efficiency.</p>
            </div>
          </div>

          <Tabs defaultValue="studio" className="w-full">
            <TabsList className="bg-sidebar border border-sidebar-border p-1 h-12 sticky top-0 z-10 shadow-2xl">
              <TabsTrigger value="studio" className="px-6 font-bold">Studio Overview</TabsTrigger>
              <TabsTrigger value="hierarchy" className="px-6 font-bold">Production Hierarchy</TabsTrigger>
              <TabsTrigger value="performance" className="px-6 font-bold">Rankings & Efficiency</TabsTrigger>
              <TabsTrigger value="operations" className="px-6 font-bold">Operations & Risk</TabsTrigger>
            </TabsList>

            {/* MODULE 1: STUDIO OVERVIEW */}
            <TabsContent value="studio" className="space-y-8 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Target className="w-20 h-20" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Studio Efficiency</p>
                  <h3 className="text-4xl font-headline text-white">{stats.efficiency}%</h3>
                  <div className="mt-4 flex items-center gap-2 text-green-500 text-xs font-bold">
                    <TrendingUp className="w-4 h-4" /> Optimal Performance
                  </div>
                </Card>

                <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Layers className="w-20 h-20" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Shot Delivery Rate</p>
                  <h3 className="text-4xl font-headline text-white">{stats.shotCompletion}%</h3>
                  <Progress value={stats.shotCompletion} className="h-1 bg-sidebar-accent mt-4" />
                </Card>

                <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Clock className="w-20 h-20" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Overdue Pipeline</p>
                  <h3 className={cn("text-4xl font-headline", stats.overdueTasks > 0 ? "text-red-500" : "text-white")}>
                    {stats.overdueTasks}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-4 uppercase">Critical blockers detected</p>
                </Card>

                <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <AlertTriangle className="w-20 h-20" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Risk Assessment</p>
                  <h3 className={cn(
                    "text-4xl font-headline",
                    stats.riskFactor === 'High' ? "text-red-500" : (stats.riskFactor === 'Medium' ? "text-yellow-500" : "text-green-500")
                  )}>{stats.riskFactor}</h3>
                  <Badge className="mt-4 bg-sidebar-accent text-[8px] uppercase">{stats.activeArtists} Artists Online</Badge>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-card border-none shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-white font-headline">Bid vs Actual Variance</CardTitle>
                    <CardDescription>Aggregate hours tracked vs total project bid sheet volume.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Bid Hours', value: stats.assignedBid, fill: '#666' },
                        { name: 'Actual Tracked', value: stats.utilizedBid, fill: '#E6192E' },
                        { name: 'Remaining', value: stats.remainingBid, fill: '#3266E6' }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card border-none shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-white font-headline">Departmental Efficiency Index</CardTitle>
                    <CardDescription>Productivity ratios (Bid / Actual) across pipeline steps.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Bar dataKey="efficiency" radius={[4, 4, 0, 0]}>
                          {deptMetrics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.efficiency >= 100 ? '#E6192E' : '#ca8a04'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* MODULE 2: PRODUCTION HIERARCHY DRILL-DOWN */}
            <TabsContent value="hierarchy" className="mt-6 space-y-6">
              <Card className="bg-card border-none shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white font-headline">Project Portfolio Status</CardTitle>
                  <CardDescription>Visualizing completion density across all live productions.</CardDescription>
                </CardHeader>
                <div className="p-6 space-y-4">
                  {projectHealth.map(proj => (
                    <div key={proj.id} className="p-6 rounded-2xl bg-sidebar-accent/30 border border-sidebar-border hover:border-crimson/50 transition-all cursor-pointer group" onClick={() => setDrillDownProject(proj.id)}>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-crimson/10 rounded-xl flex items-center justify-center text-crimson font-bold">
                            {proj.code}
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white">{proj.name}</h4>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{proj.status}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-headline text-white">{proj.progress}%</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Completion</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Progress value={proj.progress} className="h-2 bg-sidebar-accent" />
                        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-sidebar-border">
                          <div>
                            <p className="text-[8px] text-muted-foreground uppercase font-bold">Total Bid</p>
                            <p className="text-sm font-bold text-white">{proj.bid}h</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-muted-foreground uppercase font-bold">Actual Spent</p>
                            <p className="text-sm font-bold text-white">{proj.actual}h</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-muted-foreground uppercase font-bold">Efficiency Ratio</p>
                            <p className={cn("text-sm font-bold", proj.efficiency >= 100 ? "text-green-500" : "text-yellow-500")}>
                              {proj.efficiency}%
                            </p>
                          </div>
                          <div className="flex justify-end items-center">
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* MODULE 3: PERFORMANCE & RANKINGS */}
            <TabsContent value="performance" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="bg-card border-none shadow-2xl lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white font-headline">Studio Productivity Ranking</CardTitle>
                    <CardDescription>Top performers across departments based on Bid vs Actual performance.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {rankings.map((user, i) => (
                        <div key={user.name} className="flex items-center justify-between p-4 hover:bg-sidebar-accent/20 rounded-xl transition-all">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center font-bold text-crimson">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white">{user.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">{user.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-lg font-headline font-bold", user.efficiency >= 100 ? "text-green-500" : "text-yellow-500")}>
                              {user.efficiency}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">{user.taskCount} tasks tracked</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-none shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-white font-headline">Department Capacity</CardTitle>
                    <CardDescription>Utilization per pipeline unit.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {deptMetrics.map(dept => (
                      <div key={dept.name} className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white font-bold">{dept.name} Pipeline</span>
                          <span className={cn("font-bold", dept.utilization > 90 ? "text-red-500" : "text-white")}>
                            {dept.utilization}% Cap
                          </span>
                        </div>
                        <Progress value={dept.utilization} className={cn("h-2 bg-sidebar-accent")} />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>{dept.pendingReview} Pending Reviews</span>
                          <span>{dept.bidHours}h Bid Vol.</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* MODULE 4: OPERATIONS & RISK */}
            <TabsContent value="operations" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="bg-card border-none shadow-2xl md:col-span-2">
                   <CardHeader>
                     <CardTitle className="text-white font-headline">Resource Allocation Analytics</CardTitle>
                     <CardDescription>Live tracking of artist availability vs assigned workload.</CardDescription>
                   </CardHeader>
                   <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {capacityData.map(artist => (
                          <div key={artist.name} className="p-4 rounded-xl bg-sidebar-accent/20 border border-sidebar-border flex flex-col justify-between h-40">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col">
                                <span className="font-bold text-white">{artist.name}</span>
                                <Badge className={cn(
                                  "text-[8px] uppercase font-bold w-fit mt-1",
                                  artist.status === 'Available' ? "bg-green-500/20 text-green-500" : 
                                  artist.status === 'Leave' ? "bg-red-500/20 text-red-500" : "bg-orange-500/20 text-orange-500"
                                )}>{artist.status}</Badge>
                              </div>
                              <span className="text-lg font-headline text-white">{artist.utilization}%</span>
                            </div>
                            <div className="space-y-2">
                              <Progress value={artist.utilization} className="h-1 bg-sidebar-accent" />
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>{artist.assigned}h Assigned</span>
                                <span>{artist.remaining}h Avail</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                   </CardContent>
                </Card>

                <div className="space-y-8">
                  <Card className="bg-crimson/5 border border-crimson/20 p-8 flex flex-col items-center text-center">
                    <Zap className="text-crimson w-12 h-12 mb-4" />
                    <h4 className="text-xl font-headline text-white mb-2">Delivery Predictor</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                      Based on current studio-wide efficiency ({stats.efficiency}%) and shot velocity, next-reel delivery risk is:
                    </p>
                    <Badge className={cn(
                      "px-6 py-2 text-lg font-headline font-bold rounded-xl",
                      stats.riskFactor === 'Low' ? "bg-green-500 text-white" : "bg-yellow-500 text-black"
                    )}>{stats.riskFactor} RISK</Badge>
                  </Card>

                  <Card className="bg-card border-none shadow-2xl p-6">
                    <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                       <Clock className="text-accent w-4 h-4" /> Timeline Drift
                    </h4>
                    <div className="space-y-4">
                       <div className="p-4 bg-sidebar-accent/50 rounded-xl">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Schedule Variance</p>
                          <p className="text-xl font-headline text-white">+2.4 Days</p>
                       </div>
                       <div className="p-4 bg-sidebar-accent/50 rounded-xl">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Review Latency</p>
                          <p className="text-xl font-headline text-white">4.2 Hours</p>
                       </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
