
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
  Cell
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  AlertTriangle, 
  Layers, 
  Clock, 
  Target, 
  Zap,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyticsHub() {
  const { currentRole, projects, shots, tasks } = useLuminaStore();
  
  // Internal Role Isolation
  const isProdHead = currentRole === 'Production Head';
  const isSupervisor = currentRole === 'Department Supervisor';
  const isLead = currentRole === 'Lead';

  // Aggregate Data from Service
  const stats = useMemo(() => analyticsService.getStudioStats(), [tasks, shots, projects]);
  const projectHealth = useMemo(() => analyticsService.getProjectHealthData(), [projects, shots, tasks]);
  const deptMetrics = useMemo(() => analyticsService.getDepartmentMetrics(), [tasks]);
  const capacityData = useMemo(() => analyticsService.getCapacityData(), [tasks]);
  const rankings = useMemo(() => analyticsService.getPerformanceRankings(), [tasks]);

  const [drillDownProject, setDrillDownProject] = useState<string | null>(null);

  // Filter metrics based on role if needed, but sidebar handles the primary access
  const visibleTabs = [
    { value: 'studio', label: 'Studio Overview', show: isProdHead },
    { value: 'hierarchy', label: 'Production Hierarchy', show: isProdHead || isSupervisor },
    { value: 'performance', label: 'Rankings & Efficiency', show: isProdHead || isSupervisor || isLead },
    { value: 'operations', label: 'Operations & Risk', show: isProdHead || isSupervisor },
  ].filter(t => t.show);

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
              <h1 className="text-4xl font-headline text-white mb-2">
                {isProdHead ? 'Studio Intelligence Hub' : isSupervisor ? 'Department Intelligence' : 'Team Performance'}
              </h1>
              <p className="text-muted-foreground">Real-time SSoT analytics driving cinematic production efficiency.</p>
            </div>
          </div>

          <Tabs defaultValue={visibleTabs[0]?.value} className="w-full">
            <TabsList className="bg-sidebar border border-sidebar-border p-1 h-12 sticky top-0 z-10 shadow-2xl">
              {visibleTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="px-6 font-bold">{tab.label}</TabsTrigger>
              ))}
            </TabsList>

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
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="hierarchy" className="mt-6 space-y-6">
              <Card className="bg-card border-none shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white font-headline">Project Portfolio Status</CardTitle>
                  <CardDescription>Visualizing completion density across all live productions.</CardDescription>
                </CardHeader>
                <div className="p-6 space-y-4">
                  {projectHealth.map(proj => (
                    <div key={proj.id} className="p-6 rounded-2xl bg-sidebar-accent/30 border border-sidebar-border transition-all">
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
                      <Progress value={proj.progress} className="h-2 bg-sidebar-accent" />
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="bg-card border-none shadow-2xl lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white font-headline">Productivity Ranking</CardTitle>
                    <CardDescription>Performance across departments based on Bid vs Actual performance.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {rankings.map((user, i) => (
                        <div key={user.name} className="flex items-center justify-between p-4 hover:bg-sidebar-accent/20 rounded-xl transition-all">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                            <div>
                              <p className="font-bold text-white">{user.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">{user.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-lg font-headline font-bold", user.efficiency >= 100 ? "text-green-500" : "text-yellow-500")}>
                              {user.efficiency}%
                            </p>
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
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="operations" className="mt-6">
              <Card className="bg-card border-none shadow-2xl">
                 <CardHeader>
                   <CardTitle className="text-white font-headline">Resource Allocation Analytics</CardTitle>
                   <CardDescription>Live tracking of artist availability vs assigned workload.</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                          </div>
                        </div>
                      ))}
                    </div>
                 </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
