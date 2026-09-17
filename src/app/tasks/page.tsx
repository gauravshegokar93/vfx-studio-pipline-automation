"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Film,
  AlertCircle,
  ExternalLink,
  Target,
  RefreshCw,
  Play,
  Pause,
  Send,
  Lock,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLuminaStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { taskService, TaskItem, TaskTimeSummary } from '@/services/taskService';

export default function ArtistTasksPage() {
  const { currentUser } = useLuminaStore();
  const { toast } = useToast();

  const [artistTasks, setArtistTasks] = useState<TaskItem[]>([]);
  const [summaries, setSummaries] = useState<Record<number, TaskTimeSummary>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Submit for Review Modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [submissionRemarks, setSubmissionRemarks] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const artistId = currentUser?.userId || currentUser?.id || 5;

  const loadArtistTasks = useCallback(async () => {
    setLoading(true);
    try {
      const items = await taskService.getByArtist(artistId);
      setArtistTasks(items);

      // Load time summaries for all assigned tasks
      const summaryPromises = items.map(t => taskService.getTaskTimeSummary(t.taskId));
      const summaryResults = await Promise.all(summaryPromises);
      const summaryMap: Record<number, TaskTimeSummary> = {};
      summaryResults.forEach((s, idx) => {
        if (s) {
          summaryMap[items[idx].taskId] = s;
        }
      });
      setSummaries(summaryMap);

    } catch (err) {
      console.error('[ArtistTasksPage] Error loading tasks:', err);
      toast({ title: 'Error', description: 'Failed to load assigned tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [artistId, toast]);

  useEffect(() => {
    loadArtistTasks();
  }, [loadArtistTasks]);

  const handleStartWork = async (taskId: number) => {
    setActionLoading(taskId);
    const res = await taskService.startWorkSession(taskId);
    setActionLoading(null);

    if (res.success) {
      toast({ title: 'Session Started', description: 'Timer is now active for this task.' });
      loadArtistTasks();
    } else {
      toast({ 
        title: 'Work Session Error', 
        description: res.message || 'Failed to start session', 
        variant: 'destructive' 
      });
    }
  };

  const handleStopWork = async (taskId: number) => {
    setActionLoading(taskId);
    const res = await taskService.stopWorkSession(taskId);
    setActionLoading(null);

    if (res.success) {
      const hrs = res.timeLog?.hoursWorked || 0;
      toast({ title: 'Session Stopped', description: `Recorded ${hrs} hrs of work time.` });
      loadArtistTasks();
    } else {
      toast({ 
        title: 'Work Session Error', 
        description: res.message || 'Failed to stop session', 
        variant: 'destructive' 
      });
    }
  };

  const handleOpenSubmitModal = (task: TaskItem) => {
    setSelectedTask(task);
    setSubmissionRemarks('');
    setSubmitModalOpen(true);
  };

  const handleSubmitForReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmittingReview(true);
    const res = await taskService.submitTaskForReview(selectedTask.taskId, submissionRemarks);
    setSubmittingReview(false);

    if (res.success) {
      toast({ 
        title: 'Submitted for Review', 
        description: `Task ${selectedTask.taskCode} has been sent to review queue.` 
      });
      setSubmitModalOpen(false);
      setSelectedTask(null);
      setSubmissionRemarks('');
      loadArtistTasks();
    } else {
      toast({ 
        title: 'Submission Error', 
        description: res.message || 'Failed to submit task for review', 
        variant: 'destructive' 
      });
    }
  };

  const totalAssignedBid = artistTasks.reduce((acc, t) => {
    const bid = t.estimatedBid !== undefined && t.estimatedBid !== null ? t.estimatedBid : (t.estimatedHours ? t.estimatedHours / 8 : 0);
    return acc + bid;
  }, 0);

  const totalTargetBid = artistTasks.reduce((acc, t) => {
    const bid = t.targetBid !== undefined && t.targetBid !== null ? t.targetBid : (t.targetHours ? t.targetHours / 8 : 0);
    return acc + bid;
  }, 0);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Film className="text-crimson w-5 h-5" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Artist Production Hub</span>
            </div>
            <h1 className="text-4xl font-headline text-white mb-2">My Workbench</h1>
            <p className="text-muted-foreground">Managing your real shot-based pipeline assignments and work time.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadArtistTasks} disabled={loading} className="gap-2 border-sidebar-border">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh Workbench
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card border-none p-6 shadow-lg">
            <p className="text-xs font-bold text-muted-foreground uppercase">Assigned Bids</p>
            <h3 className="text-3xl font-headline text-white mt-1">{totalAssignedBid.toFixed(2)} Bid</h3>
          </Card>
          <Card className="bg-card border-none p-6 shadow-lg">
            <p className="text-xs font-bold text-muted-foreground uppercase">Target Allocation Bids</p>
            <h3 className="text-3xl font-headline text-blue-500 mt-1">{totalTargetBid.toFixed(2)} Bid</h3>
          </Card>
          <Card className="bg-card border-none p-6 shadow-lg">
            <p className="text-xs font-bold text-muted-foreground uppercase">Assigned Tasks</p>
            <h3 className="text-3xl font-headline text-yellow-500 mt-1">{artistTasks.length}</h3>
          </Card>
          <Card className="bg-card border-none p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Active Roster</p>
                <h3 className="text-3xl font-headline text-green-500 mt-1">Ready</h3>
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
                  <TableHead>Task Code</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Complexity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estimated Bid</TableHead>
                  <TableHead>Target Bid</TableHead>
                  <TableHead>Actual Logged</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artistTasks.map((task) => {
                  const estBid = task.estimatedBid !== undefined && task.estimatedBid !== null ? task.estimatedBid : (task.estimatedHours ? task.estimatedHours / 8 : 0);
                  const tgtBid = task.targetBid !== undefined && task.targetBid !== null ? task.targetBid : (task.targetHours ? task.targetHours / 8 : 0);
                  
                  const summary = summaries[task.taskId];
                  const hasActive = summary?.activeSession !== null && summary?.activeSession !== undefined;
                  const actualHrs = summary ? summary.actualWorkedHours : (task.actualHours || 0);

                  const statusId = task.statusId;
                  const statusName = task.status;
                  const isCompleted = statusId === 4 || statusName === 'Completed';
                  const isReview = statusId === 3 || statusName === 'Review';
                  const isRework = statusId === 5 || statusName === 'Rework';
                  const isInProgress = statusId === 2 || statusName === 'In Progress';
                  const isAssigned = statusId === 1 || statusName === 'Assigned';

                  return (
                    <TableRow key={task.taskId} className="border-sidebar-border h-20 transition-all hover:bg-sidebar-accent/20">
                      <TableCell className="pl-6 font-bold text-white text-lg font-mono">{task.shotCode}</TableCell>
                      <TableCell className="text-white font-mono text-sm">{task.taskCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-crimson border-crimson/20 uppercase text-[10px]">{task.stage}</Badge>
                      </TableCell>
                      <TableCell>
                        {task.complexity ? (
                          <Badge variant="outline" className={cn(
                            "uppercase text-[10px] font-bold",
                            task.complexity.toLowerCase().includes('hard') ? "text-red-400 border-red-400/30 bg-red-400/10" :
                            task.complexity.toLowerCase().includes('mid') ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                            task.complexity.toLowerCase().includes('easy') ? "text-green-400 border-green-400/30 bg-green-400/10" :
                            "text-blue-400 border-blue-400/30 bg-blue-400/10"
                          )}>
                            {task.complexity}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "uppercase text-[10px] font-bold",
                          isCompleted ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          isReview ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse" :
                          isRework ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                          hasActive ? "bg-blue-500/20 text-blue-400 animate-pulse border border-blue-500/30" :
                          isInProgress ? "bg-blue-500/20 text-blue-500" :
                          isAssigned ? "bg-green-500/20 text-green-500" : "bg-sidebar-accent text-muted-foreground"
                        )}>
                          {hasActive ? 'ACTIVE SESSION' : statusName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white font-mono text-xs">{estBid.toFixed(2)} Bid</TableCell>
                      <TableCell className="text-yellow-500 font-mono text-xs font-bold">{tgtBid.toFixed(2)} Bid</TableCell>
                      <TableCell className="text-crimson font-mono text-xs font-bold">
                        {actualHrs.toFixed(1)} hrs <span className="text-muted-foreground text-[10px]">({(actualHrs / 8).toFixed(2)} Bid)</span>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isCompleted ? (
                            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 gap-1 text-xs py-1.5 px-3">
                              <Lock className="w-3 h-3" /> Locked (Completed)
                            </Badge>
                          ) : isReview ? (
                            <Badge variant="outline" className="text-amber-400 border-amber-500/30 gap-1 text-xs py-1.5 px-3">
                              <Clock className="w-3 h-3 animate-spin" /> Waiting for Review
                            </Badge>
                          ) : (
                            <>
                              {hasActive ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStopWork(task.taskId)}
                                  disabled={actionLoading === task.taskId}
                                  className="border-amber-500/40 text-amber-400 hover:bg-amber-500/20 gap-1 text-xs"
                                >
                                  <Pause className="w-3.5 h-3.5" /> PAUSE / STOP
                                </Button>
                              ) : isRework ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartWork(task.taskId)}
                                  disabled={actionLoading === task.taskId}
                                  className="border-purple-500/40 text-purple-400 hover:bg-purple-500/20 gap-1 text-xs"
                                >
                                  <Play className="w-3.5 h-3.5" /> START REWORK
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartWork(task.taskId)}
                                  disabled={actionLoading === task.taskId}
                                  className="border-green-500/40 text-green-400 hover:bg-green-500/20 gap-1 text-xs"
                                >
                                  <Play className="w-3.5 h-3.5" /> {(summary?.sessionCount || 0) > 0 ? 'RESUME WORK' : 'START WORK'}
                                </Button>
                              )}

                              {(isInProgress || isRework) && (
                                <Button
                                  size="sm"
                                  className="bg-crimson hover:bg-crimson/80 text-white gap-1 text-xs"
                                  onClick={() => handleOpenSubmitModal(task)}
                                  disabled={actionLoading === task.taskId}
                                >
                                  <Send className="w-3.5 h-3.5" /> SUBMIT FOR REVIEW
                                </Button>
                              )}
                            </>
                          )}

                          <Button size="sm" variant="outline" className="border-sidebar-border" asChild>
                            <Link href={`/tasks/${task.taskId}`}>
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
              <p className="text-lg">No shots currently assigned to you in database.</p>
              <p className="text-sm">Wait for supervisor or lead to allocate tasks from department queue.</p>
            </div>
          )}
        </Card>

        {/* Submit for Review Modal */}
        <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
          <DialogContent className="sm:max-w-[450px] bg-sidebar border-sidebar-border text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Send className="w-5 h-5 text-crimson" /> Submit Task for Review
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Submitting task <span className="text-white font-mono font-bold">{selectedTask?.taskCode}</span> ({selectedTask?.shotCode}) to reviewer queue.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitForReview} className="space-y-4 py-3">
              <div className="p-4 rounded-lg bg-card/60 border border-sidebar-border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Task Name:</span>
                  <span className="font-semibold text-white">{selectedTask?.taskName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actual Logged Time:</span>
                  <span className="font-mono text-crimson font-bold">
                    {(summaries[selectedTask?.taskId || 0]?.actualWorkedHours || selectedTask?.actualHours || 0).toFixed(1)} hrs
                    <span className="text-muted-foreground text-xs ml-1">
                      ({((summaries[selectedTask?.taskId || 0]?.actualWorkedHours || selectedTask?.actualHours || 0) / 8).toFixed(2)} Bid)
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="submissionRemarks" className="text-sm font-semibold">Submission Notes / Remarks</Label>
                <Textarea
                  id="submissionRemarks"
                  placeholder="Describe completed work, file paths, or notes for reviewer..."
                  value={submissionRemarks}
                  onChange={(e) => setSubmissionRemarks(e.target.value)}
                  className="bg-card border-sidebar-border text-white min-h-[100px]"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setSubmitModalOpen(false)}
                  className="border-sidebar-border text-white hover:bg-sidebar-accent"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submittingReview}
                  className="bg-crimson hover:bg-crimson/80 text-white font-semibold gap-2"
                >
                  {submittingReview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit for Review
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
