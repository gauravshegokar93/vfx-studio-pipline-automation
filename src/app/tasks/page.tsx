
"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { 
  Play, 
  Pause, 
  Send, 
  Clock, 
  CheckCircle2,
  ExternalLink,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLuminaStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { taskService } from '@/services/taskService';
import { Task } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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

  const handleStartTimer = (taskId: string) => {
    setActiveTaskId(taskId);
    toast({ title: "Timer Started", description: "Tracking live production hours." });
  };

  const handlePauseTimer = (taskId: string) => {
    setActiveTaskId(null);
    toast({ title: "Timer Paused", description: "Hours logged to single source of truth." });
  };

  if (loading) return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 p-8"><Skeleton className="w-full h-full bg-sidebar-accent" /></main>
    </div>
  );

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
            {activeTaskId && (
              <div className="flex items-center gap-4 bg-crimson/10 px-6 py-3 rounded-xl border border-crimson/30 animate-pulse">
                <Timer className="text-crimson w-5 h-5" />
                <span className="text-2xl font-mono text-crimson font-bold">{formatTime(seconds)}</span>
              </div>
            )}
          </div>

          <Card className="bg-card border-none overflow-hidden shadow-2xl">
            <Table>
              <TableHeader className="bg-sidebar-accent/50">
                <TableRow className="border-sidebar-border h-14">
                  <TableHead className="text-xs font-bold uppercase tracking-widest pl-6">Project / Shot</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest">Pipeline Task</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest">Bid Hours</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest">Actual Hours</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest">Remaining</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest">Productivity</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const productivity = calculateProductivity(task.bidHours, task.spentHours);
                  const isOverBudget = productivity < 100;
                  const isActive = activeTaskId === task.id;

                  return (
                    <TableRow key={task.id} className={cn(
                      "border-sidebar-border hover:bg-sidebar-accent/30 transition-colors h-20",
                      isActive && "bg-crimson/5 border-crimson/30"
                    )}>
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-muted-foreground">NGHT</span>
                          <span className="text-lg font-bold text-white">{task.shotId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-sidebar-accent/50 text-crimson border-crimson/20">
                          {task.pipelineStep}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-white">{task.bidHours}h</TableCell>
                      <TableCell className="font-mono">{task.spentHours}h</TableCell>
                      <TableCell className="font-mono">{task.remainingHours}h</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-lg font-bold",
                            isOverBudget ? "text-yellow-500" : "text-green-500"
                          )}>
                            {productivity}%
                          </span>
                          {isOverBudget && <span className="text-[10px] font-bold uppercase text-yellow-500/70">Over Budget</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "uppercase text-[10px] font-bold",
                          task.status === 'In Progress' ? "bg-blue-500/20 text-blue-500" : "bg-sidebar-accent text-muted-foreground"
                        )}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          {isActive ? (
                            <Button size="sm" variant="outline" className="border-crimson text-crimson" onClick={() => handlePauseTimer(task.id)}>
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" className="bg-crimson" onClick={() => handleStartTimer(task.id)}>
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="border-sidebar-border" asChild>
                            <Link href={`/tasks/${task.id}`}>
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  );
}
