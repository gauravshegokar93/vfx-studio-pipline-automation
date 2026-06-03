
"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Send, 
  History,
  AlertTriangle,
  CheckCircle2,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLuminaStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export default function ArtistTasksPage() {
  const { tasks, updateTaskTimer } = useLuminaStore();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  // Simulated active tasks if store is empty
  const artistTasks = tasks.length > 0 ? tasks : [
    { 
      id: 't1', shotId: 'SH_010', taskName: 'Hero Comp', pipelineStep: 'Comp', 
      bidHours: 16, spentHours: 4.5, status: 'In Progress', priority: 'High',
      isTimerRunning: false 
    },
    { 
      id: 't2', shotId: 'SH_045', taskName: 'Building Cleanup', pipelineStep: 'Paint', 
      bidHours: 8, spentHours: 2.1, status: 'Assigned', priority: 'Medium',
      isTimerRunning: false 
    }
  ];

  useEffect(() => {
    let interval: any;
    if (activeTaskId) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTaskId]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateProductivity = (bid: number, actual: number) => {
    if (actual === 0) return 0;
    return Math.round((bid / actual) * 100);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">My Workbench</h1>
              <p className="text-muted-foreground">Track your time and manage your daily VFX pipeline tasks.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Active Submissions</h3>
              {artistTasks.map((task: any) => {
                const productivity = calculateProductivity(task.bidHours, task.spentHours);
                const isOverBudget = productivity < 100 && task.spentHours > task.bidHours;

                return (
                  <Card key={task.id} className={cn(
                    "bg-card border-none transition-all group",
                    activeTaskId === task.id ? "ring-2 ring-crimson" : "hover:ring-1 hover:ring-sidebar-border"
                  )}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-lg bg-sidebar-accent flex items-center justify-center text-crimson font-bold text-xl">
                            {task.pipelineStep.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-bold text-white">{task.taskName}</h4>
                              <Badge variant="outline" className="text-[10px] uppercase">{task.shotId}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Status: <span className="text-white">{task.status}</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeTaskId === task.id ? (
                            <div className="flex items-center gap-2 bg-crimson/10 px-3 py-1.5 rounded-full border border-crimson/20">
                              <span className="w-2 h-2 rounded-full bg-crimson animate-pulse" />
                              <span className="text-sm font-mono text-crimson font-bold">{formatTime(seconds)}</span>
                            </div>
                          ) : null}
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6 mb-6">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Bid Hours</p>
                          <p className="text-xl text-white font-headline">{task.bidHours}h</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Spent Hours</p>
                          <p className={cn("text-xl font-headline", isOverBudget ? "text-red-500" : "text-white")}>
                            {task.spentHours}h
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Productivity</p>
                          <div className="flex items-center gap-2">
                             <p className={cn("text-xl font-headline", productivity < 100 ? "text-yellow-500" : "text-green-500")}>
                               {productivity}%
                             </p>
                             {isOverBudget && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center gap-4 border-t border-sidebar-border pt-6">
                        <div className="flex gap-2">
                          {activeTaskId === task.id ? (
                            <Button variant="outline" className="border-crimson text-crimson hover:bg-crimson/10" onClick={() => setActiveTaskId(null)}>
                              <Pause className="w-4 h-4 mr-2" /> Pause
                            </Button>
                          ) : (
                            <Button className="bg-crimson hover:bg-crimson/90" onClick={() => setActiveTaskId(task.id)}>
                              <Play className="w-4 h-4 mr-2" /> Start Timer
                            </Button>
                          )}
                          <Button variant="outline" className="border-sidebar-border">
                            <Send className="w-4 h-4 mr-2" /> Submit Version
                          </Button>
                        </div>
                        <Badge className={cn(
                          "uppercase text-[10px] font-bold",
                          task.priority === 'High' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                        )}>
                          {task.priority} Priority
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Studio Summary</h3>
              <Card className="bg-sidebar border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Weekly Utilization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Assigned (32h)</span>
                      <span className="text-white font-bold">80%</span>
                    </div>
                    <Progress value={80} className="h-1.5 bg-sidebar-accent" />
                  </div>
                  
                  <div className="pt-4 border-t border-sidebar-border">
                    <h5 className="text-xs font-bold text-muted-foreground uppercase mb-4">Upcoming Deadlines</h5>
                    <div className="space-y-4">
                      {[
                        { shot: 'SH_010', task: 'Comp', date: 'In 2 days', urgency: 'text-red-500' },
                        { shot: 'SH_025', task: 'Roto', date: 'In 5 days', urgency: 'text-white' }
                      ].map((d, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-crimson" />
                            <span className="text-sm text-white font-medium">{d.shot} {d.task}</span>
                          </div>
                          <span className={cn("text-xs font-bold", d.urgency)}>{d.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-sidebar border-none shadow-xl">
                <CardHeader>
                   <CardTitle className="text-white text-lg flex items-center gap-2">
                     <History className="w-4 h-4 text-crimson" /> Recent Logs
                   </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                      {[
                        { time: '4.5h', action: 'Worked on', target: 'SH_010 Comp', date: 'Today' },
                        { time: '1.2h', action: 'Worked on', target: 'SH_045 Paint', date: 'Yesterday' }
                      ].map((log, i) => (
                        <div key={i} className="flex justify-between items-start">
                           <div>
                             <p className="text-sm text-white">{log.action} <span className="font-bold">{log.target}</span></p>
                             <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">{log.date}</p>
                           </div>
                           <Badge variant="outline" className="text-crimson border-crimson/20">{log.time}</Badge>
                        </div>
                      ))}
                   </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
