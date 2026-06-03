
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
  AlertCircle,
  FileEdit,
  Target,
  Film
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLuminaStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';

export default function ArtistTasksPage() {
  const { tasks, shots, currentUser, updateTaskStatus, artistUpdateProgress } = useLuminaStore();
  const { toast } = useToast();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  // Modal State
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedTaskForUpdate, setSelectedTaskForUpdate] = useState<any>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [commentValue, setCommentValue] = useState('');
  const [etaValue, setEtaValue] = useState('');

  const artistTasks = tasks.filter(t => t.assignedArtistId === currentUser?.id || t.assignedArtistId === 'u3');
  
  const getShotName = (shotId: string) => {
    return shots.find(s => s.id === shotId)?.shotCode || "N/A";
  };

  const totalAssignedBid = artistTasks.reduce((acc, t) => acc + t.bidHours, 0);
  const totalUtilizedBid = artistTasks.reduce((acc, t) => acc + t.spentHours, 0);
  const totalRemainingBid = artistTasks.reduce((acc, t) => acc + t.remainingHours, 0);

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
    toast({ title: "Timer Started", description: `Working on ${getShotName(tasks.find(t => t.id === taskId)?.shotId || "")}` });
  };

  const handlePauseTimer = (taskId: string) => {
    setActiveTaskId(null);
    toast({ title: "Timer Paused", description: "Progress synced to SSoT." });
  };

  const handleOpenUpdate = (task: any) => {
    setSelectedTaskForUpdate(task);
    setProgressValue(task.progress || 0);
    setEtaValue(task.internalEta || task.dueDate);
    setCommentValue(task.latestArtistComment || '');
    setUpdateModalOpen(true);
  };

  const handleCommitUpdate = () => {
    if (!selectedTaskForUpdate) return;
    artistUpdateProgress(selectedTaskForUpdate.id, progressValue, commentValue, etaValue);
    setUpdateModalOpen(false);
    toast({ title: "Task Updated", description: "Production state synchronized." });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Film className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Artist Production Hub</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">My Workbench</h1>
              <p className="text-muted-foreground">Managing your shot-based pipeline assignments.</p>
            </div>
            {activeTaskId && (
              <div className="flex items-center gap-4 bg-crimson/10 px-6 py-3 rounded-xl border border-crimson/30 animate-pulse">
                <Timer className="text-crimson w-5 h-5" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-crimson font-bold uppercase">Active: {getShotName(tasks.find(t => t.id === activeTaskId)?.shotId || "")}</span>
                  <span className="text-2xl font-mono text-crimson font-bold leading-none">{formatTime(seconds)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card border-none p-6 shadow-lg">
              <p className="text-xs font-bold text-muted-foreground uppercase">Assigned Bid</p>
              <h3 className="text-3xl font-headline text-white mt-1">{totalAssignedBid}h</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-lg">
              <p className="text-xs font-bold text-muted-foreground uppercase">Utilized Hours</p>
              <h3 className="text-3xl font-headline text-blue-500 mt-1">{totalUtilizedBid}h</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-lg">
              <p className="text-xs font-bold text-muted-foreground uppercase">Remaining Hours</p>
              <h3 className="text-3xl font-headline text-yellow-500 mt-1">{totalRemainingBid}h</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Productivity Target</p>
                  <h3 className="text-3xl font-headline text-green-500 mt-1">100%</h3>
                </div>
                <Target className="text-green-500 w-5 h-5" />
              </div>
            </Card>
          </div>

          <Card className="bg-card border-none overflow-hidden shadow-2xl">
            {artistTasks.length > 0 ? (
              <Table>
                <TableHeader className="bg-sidebar-accent/50">
                  <TableRow className="border-sidebar-border h-14">
                    <TableHead className="pl-6">Shot Name</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Bid / Utilized</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artistTasks.map((task) => {
                    const isActive = activeTaskId === task.id;
                    const shotName = getShotName(task.shotId);
                    return (
                      <TableRow key={task.id} className={cn(
                        "border-sidebar-border h-20 transition-all",
                        isActive && "bg-crimson/5 border-crimson/30"
                      )}>
                        <TableCell className="pl-6 font-bold text-white text-lg">{shotName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-crimson border-crimson/20">{task.pipelineStep}</Badge></TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "uppercase text-[10px] font-bold",
                            task.status === 'In Progress' ? "bg-blue-500/20 text-blue-500" : 
                            task.status === 'Retake' ? "bg-red-500/20 text-red-500" : 
                            task.status === 'Approved' ? "bg-green-500/20 text-green-500" : "bg-sidebar-accent text-muted-foreground"
                          )}>{task.status}</Badge>
                        </TableCell>
                        <TableCell className="w-48">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-muted-foreground">Completion</span>
                              <span className="text-white">{task.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-sidebar-accent rounded-full overflow-hidden">
                              <div className="h-full bg-crimson transition-all duration-500" style={{ width: `${task.progress}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-mono text-xs">{task.bidHours}h / {task.spentHours}h</TableCell>
                        <TableCell className={cn(
                          "font-mono text-xs font-bold",
                          task.remainingHours < 0 ? "text-red-500" : "text-yellow-500"
                        )}>{task.remainingHours}h</TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="border-sidebar-border hover:bg-sidebar-accent" onClick={() => handleOpenUpdate(task)}>
                              <FileEdit className="w-4 h-4 mr-2" /> Update
                            </Button>
                            {isActive ? (
                              <Button size="sm" variant="outline" className="border-crimson text-crimson" onClick={() => handlePauseTimer(task.id)}>
                                <Pause className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button size="sm" className="bg-crimson hover:bg-crimson/90" onClick={() => handleStartTimer(task.id)}>
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
              <div className="p-24 text-center text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No shots currently assigned to you.</p>
                <p className="text-sm">Wait for your Lead to allocate tasks from the project pool.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Artist Progress Update Dialog */}
        <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white">
            <DialogHeader>
              <DialogTitle>Update Progress: {getShotName(selectedTaskForUpdate?.shotId || "")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Completion Percentage</Label>
                  <span className="text-xs font-bold text-crimson">{progressValue}%</span>
                </div>
                <Slider 
                  value={[progressValue]} 
                  onValueChange={(val) => setProgressValue(val[0])} 
                  max={100} 
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Internal ETA</Label>
                <Input 
                  type="date" 
                  className="bg-sidebar-accent border-sidebar-border" 
                  value={etaValue} 
                  onChange={(e) => setEtaValue(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Work Log / Comments</Label>
                <Textarea 
                  placeholder="Describe your progress or technical blockers..." 
                  className="bg-sidebar-accent border-sidebar-border h-24" 
                  value={commentValue}
                  onChange={(e) => setCommentValue(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateModalOpen(false)}>Cancel</Button>
              <Button className="bg-crimson px-6 font-bold" onClick={handleCommitUpdate}>Commit to SSoT</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
