
"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { 
  Play, 
  Pause, 
  Clock, 
  CheckCircle2,
  ExternalLink,
  Timer,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLuminaStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ArtistTasksPage() {
  const { tasks, currentUser, updateTaskStatus } = useLuminaStore();
  const { toast } = useToast();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  // Artist Dashboard: Only show tasks assigned to this artist
  const artistTasks = tasks.filter(t => t.assignedArtistId === 'u3'); // Mocking u3 as current artist

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

  const handleStartTimer = (taskId: string) => {
    setActiveTaskId(taskId);
    updateTaskStatus(taskId, 'In Progress');
    toast({ title: "Timer Started", description: "Tracking production hours." });
  };

  const handlePauseTimer = (taskId: string) => {
    setActiveTaskId(null);
    toast({ title: "Timer Paused", description: "Progress saved." });
  };

  const stats = {
    total: artistTasks.length,
    pending: artistTasks.filter(t => t.status === 'Assigned').length,
    active: artistTasks.filter(t => t.status === 'In Progress').length,
    completed: artistTasks.filter(t => t.status === 'Approved').length,
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">My Workbench</h1>
              <p className="text-muted-foreground">Direct access to your assigned production tasks.</p>
            </div>
            {activeTaskId && (
              <div className="flex items-center gap-4 bg-crimson/10 px-6 py-3 rounded-xl border border-crimson/30 animate-pulse">
                <Timer className="text-crimson w-5 h-5" />
                <span className="text-2xl font-mono text-crimson font-bold">{formatTime(seconds)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card border-none p-6 text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Assigned</p>
              <h3 className="text-2xl font-headline text-white">{stats.total}</h3>
            </Card>
            <Card className="bg-card border-none p-6 text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Pending Start</p>
              <h3 className="text-2xl font-headline text-yellow-500">{stats.pending}</h3>
            </Card>
            <Card className="bg-card border-none p-6 text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Active</p>
              <h3 className="text-2xl font-headline text-blue-500">{stats.active}</h3>
            </Card>
            <Card className="bg-card border-none p-6 text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Completed</p>
              <h3 className="text-2xl font-headline text-green-500">{stats.completed}</h3>
            </Card>
          </div>

          <Card className="bg-card border-none overflow-hidden shadow-2xl">
            {artistTasks.length > 0 ? (
              <Table>
                <TableHeader className="bg-sidebar-accent/50">
                  <TableRow className="border-sidebar-border h-14">
                    <TableHead className="pl-6">Shot</TableHead>
                    <TableHead>Pipeline Step</TableHead>
                    <TableHead>Bid Hours</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artistTasks.map((task) => {
                    const isActive = activeTaskId === task.id;
                    return (
                      <TableRow key={task.id} className={cn(
                        "border-sidebar-border h-20 transition-all",
                        isActive && "bg-crimson/5 border-crimson/30"
                      )}>
                        <TableCell className="pl-6 font-bold text-white">{task.shotId}</TableCell>
                        <TableCell><Badge variant="outline" className="text-crimson border-crimson/20">{task.pipelineStep}</Badge></TableCell>
                        <TableCell className="text-white font-mono">{task.bidHours}h</TableCell>
                        <TableCell className="text-muted-foreground font-mono">{task.spentHours}h</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "uppercase text-[10px] font-bold",
                            task.status === 'In Progress' ? "bg-blue-500/20 text-blue-500" : 
                            task.status === 'Assigned' ? "bg-yellow-500/20 text-yellow-500" : "bg-sidebar-accent text-muted-foreground"
                          )}>{task.status}</Badge>
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
            ) : (
              <div className="p-20 text-center text-muted-foreground">
                <AlertCircle className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p>No tasks currently assigned to you.</p>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
