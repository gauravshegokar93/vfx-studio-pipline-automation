
"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { 
  Play, 
  Pause, 
  Send, 
  History,
  AlertTriangle,
  MoreVertical,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLuminaStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { taskService } from '@/services/taskService';
import { Task } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function ArtistTasksPage() {
  const { currentUser } = useLuminaStore();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const fetchTasks = async () => {
      if (currentUser) {
        const data = await taskService.getByArtist(currentUser.id);
        setTasks(data);
        setLoading(false);
      }
    };
    fetchTasks();
  }, [currentUser]);

  useEffect(() => {
    let interval: any;
    if (activeTaskId) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      setSeconds(0);
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
    if (actual === 0) return 100;
    return Math.round((bid / actual) * 100);
  };

  const handleStartTimer = async (taskId: string) => {
    setActiveTaskId(taskId);
    await taskService.startTask(taskId);
    toast({ title: "Task Started", description: "Timer is now tracking your work." });
  };

  const handlePauseTimer = async (taskId: string) => {
    const minutes = Math.floor(seconds / 60);
    await taskService.pauseTask('mock-log-id', minutes);
    setActiveTaskId(null);
    toast({ title: "Task Paused", description: `${minutes} minutes logged to SQL Server.` });
  };

  const handleCompleteTask = async (taskId: string) => {
    await taskService.completeTask(taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
    toast({ title: "Task Submitted", description: "Status updated to Pending Review automatically." });
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <AppSidebar />
        <main className="flex-1 p-8 space-y-8">
           <Skeleton className="h-12 w-1/3 bg-sidebar-accent" />
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-40 w-full bg-sidebar-accent" />
              </div>
              <Skeleton className="h-96 w-full bg-sidebar-accent" />
           </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">My Workbench</h1>
              <p className="text-muted-foreground">Automated time tracking and pipeline execution.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Active Pipeline</h3>
              {tasks.length === 0 ? (
                <Card className="bg-card border-none p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">No tasks assigned. Contact your Lead.</p>
                </Card>
              ) : tasks.map((task) => {
                const productivity = calculateProductivity(task.bidHours, task.spentHours);
                const statusColor = productivity < 100 ? "text-yellow-500" : "text-green-500";
                
                return (
                  <Card key={task.id} className={cn(
                    "bg-card border-none transition-all",
                    activeTaskId === task.id ? "ring-2 ring-crimson shadow-[0_0_30px_rgba(230,25,46,0.2)]" : "hover:ring-1 hover:ring-sidebar-border"
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
                            <p className="text-xs text-muted-foreground mt-1">Single Source Status: <span className="text-white font-bold">{task.status}</span></p>
                          </div>
                        </div>
                        {activeTaskId === task.id && (
                          <div className="flex items-center gap-2 bg-crimson/10 px-4 py-2 rounded-full border border-crimson/30">
                            <span className="w-2 h-2 rounded-full bg-crimson animate-pulse" />
                            <span className="text-sm font-mono text-crimson font-bold">{formatTime(seconds)}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-6 mb-6">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Client Bid</p>
                          <p className="text-xl text-white font-headline">{task.bidHours}h</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Auto-Logged Actual</p>
                          <p className={cn("text-xl font-headline text-white")}>
                            {task.spentHours}h
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Live Productivity</p>
                          <div className="flex items-center gap-2">
                             <p className={cn("text-xl font-headline", statusColor)}>
                               {productivity}%
                             </p>
                             {productivity < 100 && <Badge variant="outline" className="text-[10px] text-yellow-500 border-yellow-500/20">Over Budget</Badge>}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center gap-4 border-t border-sidebar-border pt-6">
                        <div className="flex gap-2">
                          {activeTaskId === task.id ? (
                            <Button variant="outline" className="border-crimson text-crimson hover:bg-crimson/10" onClick={() => handlePauseTimer(task.id)}>
                              <Pause className="w-4 h-4 mr-2" /> Pause Work
                            </Button>
                          ) : (
                            <Button className="bg-crimson hover:bg-crimson/90" onClick={() => handleStartTimer(task.id)}>
                              <Play className="w-4 h-4 mr-2" /> Start Timer
                            </Button>
                          )}
                          <Button variant="outline" className="border-sidebar-border" onClick={() => handleCompleteTask(task.id)}>
                            <Send className="w-4 h-4 mr-2" /> Submit for Review
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
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Automated Reports</h3>
              <Card className="bg-sidebar border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">My Weekly Utilization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Database Capacity (40h)</span>
                      <span className="text-white font-bold">34h Logged</span>
                    </div>
                    <Progress value={85} className="h-1.5 bg-sidebar-accent" />
                  </div>
                  
                  <div className="pt-4 border-t border-sidebar-border">
                    <h5 className="text-xs font-bold text-muted-foreground uppercase mb-4">Internal Deadlines</h5>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white font-medium">SH_010 Final QC</span>
                        <span className="text-xs font-bold text-red-500">Tommorrow</span>
                      </div>
                    </div>
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
