
"use client";

import React from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { StatCard } from '@/components/dashboard/stat-card';
import { 
  Projector, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Activity,
  ArrowRight
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
  Cell 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const bidVsActualData = [
  { name: 'Paint', bid: 450, actual: 480 },
  { name: 'Roto', bid: 600, actual: 590 },
  { name: 'Comp', bid: 800, actual: 920 },
  { name: 'Matchmove', bid: 300, actual: 310 },
  { name: 'CG', bid: 500, actual: 450 },
];

const utilizationData = [
  { name: 'Active', value: 78, color: '#E6192E' },
  { name: 'On Bench', value: 12, color: '#A632E6' },
  { name: 'On Leave', value: 10, color: '#333' },
];

const recentActivity = [
  { user: 'Leo K.', action: 'submitted version 02', target: 'Shot SH_010', time: '2 mins ago', type: 'version' },
  { user: 'Maya R.', action: 'approved shot', target: 'Shot SH_045', time: '15 mins ago', type: 'approval' },
  { user: 'System', action: 'flagged overdue task', target: 'Paint SH_090', time: '1 hour ago', type: 'alert' },
  { user: 'David W.', action: 'assigned task', target: 'Comp SH_110', time: '3 hours ago', type: 'assignment' },
];

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">Production Overview</h1>
              <p className="text-muted-foreground font-body">Real-time pulse of your studio pipeline.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-sidebar-border bg-sidebar text-white">Export PDF</Button>
              <Button className="bg-crimson text-white hover:bg-crimson/90">New Project</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Active Projects" value={12} icon={Projector} trend={{ value: 4, isPositive: true }} />
            <StatCard label="Pending Review" value={48} icon={Clock} trend={{ value: 12, isPositive: false }} />
            <StatCard label="Overdue Tasks" value={7} icon={AlertCircle} iconColor="text-red-500" />
            <StatCard label="Completed Today" value={24} icon={CheckCircle2} iconColor="text-green-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Bid vs Actual Hours</CardTitle>
                <CardDescription className="text-muted-foreground">Compare estimated effort against real tracking.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bidVsActualData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="bid" fill="#333" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" fill="#E6192E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Studio Capacity</CardTitle>
                <CardDescription className="text-muted-foreground">Current artist utilization.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={utilizationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {utilizationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2 mt-4">
                  {utilizationData.map((item) => (
                    <div key={item.name} className="flex justify-between items-center px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium text-white">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-none shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white font-headline text-xl">Recent Activity</CardTitle>
                  <CardDescription className="text-muted-foreground">Updates from the studio floor.</CardDescription>
                </div>
                <Button variant="ghost" className="text-crimson hover:text-crimson/80 hover:bg-crimson/5">View All</Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[320px] pr-4">
                  <div className="space-y-6">
                    {recentActivity.map((item, i) => (
                      <div key={i} className="flex gap-4 items-start group">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          item.type === 'version' ? "bg-crimson/10 text-crimson" :
                          item.type === 'approval' ? "bg-green-500/10 text-green-500" :
                          item.type === 'alert' ? "bg-red-500/10 text-red-500" : "bg-accent/10 text-accent"
                        )}>
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white font-body">
                            <span className="font-semibold">{item.user}</span> {item.action} 
                            <span className="text-crimson ml-1 cursor-pointer hover:underline">{item.target}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white font-headline text-xl">Production Health</CardTitle>
                <CardDescription className="text-muted-foreground">Overall project milestone status.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { name: 'The Night Walker', progress: 68, status: 'On Track', color: 'bg-green-500' },
                    { name: 'Neon Genesis Live', progress: 32, status: 'At Risk', color: 'bg-yellow-500' },
                    { name: 'Mars Odyssey', progress: 91, status: 'Near Delivery', color: 'bg-crimson' },
                    { name: 'Cyberpunk 2088', progress: 15, status: 'Delayed', color: 'bg-red-500' },
                  ].map((project) => (
                    <div key={project.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white">{project.name}</span>
                        <Badge variant="outline" className="border-sidebar-border text-[10px] uppercase font-bold text-muted-foreground">
                          {project.status}
                        </Badge>
                      </div>
                      <div className="h-2 w-full bg-sidebar-accent rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", project.color)}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Progress</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{project.progress}%</span>
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
