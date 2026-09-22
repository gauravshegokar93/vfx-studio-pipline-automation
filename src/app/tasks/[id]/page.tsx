"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppSidebar } from '@/components/layout/sidebar';
import { 
  taskService, 
  TaskItem, 
  TimeLogItem, 
  TaskTimeSummary, 
  TaskReviewItem, 
  TaskReworkItem 
} from '@/services/taskService';
import { Version } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Clock, 
  History, 
  Layers, 
  MessageSquare, 
  PlayCircle, 
  ArrowLeft,
  Calendar,
  User,
  Zap,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Send,
  Lock,
  RotateCcw,
  Star,
  Activity,
  Target
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatTime12Hour, formatDateLocal, formatDateTimeLocal } from '@/lib/formatTime';

function formatTimer(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDurationDisplay(hours: number): string {
  const totalMins = Math.round(hours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const { role: authRole, user: authUser } = useAuth();

  const [task, setTask] = useState<TaskItem | null>(null);
  const [summary, setSummary] = useState<TaskTimeSummary | null>(null);
  const [logs, setLogs] = useState<TimeLogItem[]>([]);
  const [reviews, setReviews] = useState<TaskReviewItem[]>([]);
  const [reworks, setReworks] = useState<TaskReworkItem[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timerActionLoading, setTimerActionLoading] = useState(false);

  // Live Timer Ticker State (derived from backend StartTime)
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Manual Time Log Modal State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [hoursWorked, setHoursWorked] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);
  const [logMessage, setLogMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Submit for Review Modal State
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submissionRemarks, setSubmissionRemarks] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchTaskDetails = async () => {
    if (!id) return;
    try {
      const [t, sum, l, revHist, v, tl] = await Promise.all([
        taskService.getById(id as string),
        taskService.getTaskTimeSummary(id as string, authRole === 'Artist' ? (authUser?.userId || authUser?.id) : undefined),
        taskService.getTimeLogs(id as string),
        taskService.getTaskReviewHistory(id as string),
        taskService.getVersions(id as string),
        taskService.getTimeline(id as string)
      ]);
      setTask(t);
      setSummary(sum);
      const filteredLogs = authRole === 'Artist' ? l.filter((log: any) => Number(log.userId) === Number(authUser?.userId || authUser?.id)) : l;
      setLogs(filteredLogs);
      setReviews(revHist.reviews || []);
      setReworks(revHist.reworks || []);
      setVersions(v);
      setTimeline(tl || []);
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const [liveSeconds, setLiveSeconds] = useState(0);

  // Live timer interval effect anchored strictly to server-provided elapsedSeconds and start time
  useEffect(() => {
    if (summary?.activeSession) {
      const active = summary.activeSession;
      const initialElapsed = active.startTime 
        ? Math.max(active.elapsedSeconds || 0, Math.floor((Date.now() - new Date(active.startTime).getTime()) / 1000))
        : (active.elapsedSeconds || 0);
      
      setLiveSeconds(initialElapsed);
      
      const interval = setInterval(() => {
        if (active.startTime) {
          const currentElapsed = Math.floor((Date.now() - new Date(active.startTime).getTime()) / 1000);
          setLiveSeconds(Math.max(0, currentElapsed));
        } else {
          setLiveSeconds(prev => prev + 1);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setLiveSeconds(0);
    }
  }, [summary?.activeSession]);

  // Calculate dynamic actual logged hours (Closed sessions + Active session elapsed)
  const closedWorkedHours = summary
    ? (summary.actualWorkedHours - (summary.activeSession ? (summary.activeSession.elapsedSeconds / 3600.0) : 0))
    : (task?.actualHours || 0);

  const liveActiveHours = (summary?.activeSession && liveSeconds > 0)
    ? (liveSeconds / 3600.0)
    : 0;

  const currentActualWorkedHours = Math.max(0, closedWorkedHours + liveActiveHours);
  let baseAllocationHours = summary?.targetHours || summary?.estimatedHours || task?.targetHours || task?.estimatedHours || 0;

  if (authRole === 'Artist' && task?.assignmentsJson) {
    try {
      const assignments = typeof task.assignmentsJson === 'string' ? JSON.parse(task.assignmentsJson) : task.assignmentsJson;
      if (Array.isArray(assignments)) {
        const artistAssignment = assignments.find((a: any) => Number(a.userId) === Number(authUser?.userId || authUser?.id));
        if (artistAssignment && artistAssignment.targetHours !== undefined) {
          baseAllocationHours = artistAssignment.targetHours;
        }
      }
    } catch(e) {}
  }

  const currentRemainingHours = baseAllocationHours - currentActualWorkedHours;

  const handleStartTimer = async () => {
    if (!task) return;
    setTimerActionLoading(true);
    const res = await taskService.startWorkSession(task.taskId);
    setTimerActionLoading(false);

    if (res.success) {
      toast({ title: 'Work Session Started', description: 'Timer is now running for this task.' });
      fetchTaskDetails();
    } else {
      toast({ title: 'Timer Error', description: res.message || 'Failed to start timer', variant: 'destructive' });
    }
  };

  const handleStopTimer = async () => {
    if (!task) return;
    setTimerActionLoading(true);
    const res = await taskService.stopWorkSession(task.taskId);
    setTimerActionLoading(false);

    if (res.success) {
      const hrs = res.timeLog?.hoursWorked || 0;
      toast({ title: 'Work Session Stopped', description: `Recorded ${hrs} hrs of work time.` });
      fetchTaskDetails();
    } else {
      toast({ title: 'Timer Error', description: res.message || 'Failed to stop timer', variant: 'destructive' });
    }
  };

  const handleCreateTimeLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    const parsedHours = parseFloat(hoursWorked);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      setLogMessage({ type: 'error', text: 'Please enter valid hours worked (greater than 0).' });
      return;
    }

    setSubmittingLog(true);
    setLogMessage(null);

    const res = await taskService.createTimeLog({
      taskId: task.taskId,
      workDate,
      hoursWorked: parsedHours,
      remarks
    });

    setSubmittingLog(false);

    if (res.success) {
      setLogMessage({ type: 'success', text: 'Time log recorded successfully!' });
      setHoursWorked('');
      setRemarks('');
      setTimeout(() => {
        setLogModalOpen(false);
        setLogMessage(null);
      }, 1200);
      fetchTaskDetails();
    } else {
      setLogMessage({ type: 'error', text: res.message || 'Failed to record time log' });
    }
  };

  const handleClientRevision = async () => {
    if (!task) return;
    setTimerActionLoading(true);
    const res = await taskService.reopenForClientRevision(task.taskId);
    setTimerActionLoading(false);

    if (res.success) {
      toast({ title: 'Task Reopened', description: `Task ${task.taskCode} reopened for Client Revision.` });
      fetchTaskDetails();
    } else {
      toast({ title: 'Error', description: res.message || 'Failed to reopen task', variant: 'destructive' });
    }
  };

  const handleSubmitForReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setSubmittingReview(true);
    const res = await taskService.submitTaskForReview(task.taskId, submissionRemarks);
    setSubmittingReview(false);

    if (res.success) {
      toast({ title: 'Submitted for Review', description: `Task ${task.taskCode} has been sent to review queue.` });
      setSubmitModalOpen(false);
      setSubmissionRemarks('');
      fetchTaskDetails();
    } else {
      toast({ title: 'Submission Error', description: res.message || 'Failed to submit task for review', variant: 'destructive' });
    }
  };

  const combinedHistory = [
    ...reviews.map(r => ({ type: 'review', date: r.reviewDate || new Date().toISOString(), data: r })),
    ...reworks.filter(rw => rw.reason === 'Client Revision').map(rw => ({ type: 'client_revision', date: rw.requestedDate || new Date().toISOString(), data: rw }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (loading) return <div className="p-8"><Skeleton className="h-full w-full bg-sidebar-accent" /></div>;

  if (!task) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <AppSidebar />
        <main className="flex-1 p-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/tasks"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Workbench</Link>
          </Button>
          <div className="p-8 text-center text-muted-foreground">Task not found</div>
        </main>
      </div>
    );
  }

  const estimatedBid = summary?.estimatedBid ?? task.estimatedBid ?? (task.estimatedHours ? task.estimatedHours / 8 : 0);
  
  let targetBid = summary?.targetBid ?? task.targetBid ?? (task.targetHours ? task.targetHours / 8 : 0);
  if (authRole === 'Artist' && task?.assignmentsJson) {
    try {
      const assignments = typeof task.assignmentsJson === 'string' ? JSON.parse(task.assignmentsJson) : task.assignmentsJson;
      if (Array.isArray(assignments)) {
        const artistAssignment = assignments.find((a: any) => Number(a.userId) === Number(authUser?.userId || authUser?.id));
        if (artistAssignment && artistAssignment.targetHours !== undefined) {
          targetBid = artistAssignment.targetHours / 8;
        }
      }
    } catch(e) {}
  }
  const hasActiveSession = summary?.activeSession !== null && summary?.activeSession !== undefined;

  const statusId = task.statusId;
  const statusName = task.status;
  const isCompleted = statusId === 4 || statusName === 'Completed';
  const isReview = statusId === 3 || statusName === 'Review';
  const isRework = statusId === 5 || statusName === 'Rework';
  const isInProgress = statusId === 2 || statusName === 'In Progress';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8 animate-fade-in-up-sm">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/tasks"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Workbench</Link>
          </Button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-crimson text-white">{task.stageName || task.departmentName || task.stage || 'General'}</Badge>
                <h1 className="text-4xl font-headline text-white">{task.shotCode} - {task.taskName}</h1>
              </div>
              <p className="text-muted-foreground">
                Task Code: <span className="text-white font-mono font-bold mr-4">{task.taskCode}</span>
                Tracking ID: <span className="text-white font-mono font-bold">{task.taskId}</span>
              </p>
            </div>

            {/* Timer Actions & Status Controls */}
            <div className="flex items-center gap-3">
              {isCompleted ? (
                <>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 gap-1.5 text-sm py-2 px-4 font-semibold">
                    <Lock className="w-4 h-4" /> Locked (Completed)
                  </Badge>
                  {['Super Admin', 'Production Head', 'Team Lead'].includes(authRole || '') && (
                    <Button
                      onClick={handleClientRevision}
                      disabled={timerActionLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold shadow-lg ml-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Reopen for Client Revision
                    </Button>
                  )}
                </>
              ) : isReview ? (
                <Badge variant="outline" className="text-amber-400 border-amber-500/30 gap-1.5 text-sm py-2 px-4 font-semibold animate-pulse">
                  <Clock className="w-4 h-4 animate-spin" /> Under Review
                </Badge>
              ) : (
                <>
                  {hasActiveSession ? (
                    <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                        <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Live Timer</span>
                      </div>
                      <span className="font-mono text-xl font-bold text-white tracking-widest">{formatTimer(liveSeconds)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleStopTimer}
                        disabled={timerActionLoading}
                        className="border-amber-500 text-amber-400 hover:bg-amber-500/20 gap-1 ml-2"
                      >
                        <Pause className="w-4 h-4" /> PAUSE / STOP
                      </Button>
                    </div>
                  ) : isRework ? (
                    <Button
                      onClick={handleStartTimer}
                      disabled={timerActionLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-semibold shadow-lg"
                    >
                      <Play className="w-4 h-4" /> START REWORK
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartTimer}
                      disabled={timerActionLoading}
                      className="bg-green-600 hover:bg-green-700 text-white gap-2 font-semibold shadow-lg"
                    >
                      <Play className="w-4 h-4" /> {(summary?.sessionCount || 0) > 0 ? 'RESUME WORK' : 'START WORK'}
                    </Button>
                  )}

                  {(isInProgress || isRework) && (
                    <Button
                      onClick={() => setSubmitModalOpen(true)}
                      className="bg-crimson hover:bg-crimson/80 text-white gap-2 font-semibold shadow-lg"
                    >
                      <Send className="w-4 h-4" /> SUBMIT FOR REVIEW
                    </Button>
                  )}
                </>
              )}

              {!isCompleted && !isReview && (
                <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-sidebar-border text-white hover:bg-sidebar-accent">
                      <Clock className="w-4 h-4 mr-2" /> Log Work Time
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-sidebar border-sidebar-border text-white">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Log Work Time (Manual Entry)</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Record manual work hours for task <span className="text-white font-mono">{task.taskCode}</span>.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTimeLog} className="space-y-4 py-2">
                      {logMessage && (
                        <div className={cn(
                          "p-3 rounded-md text-sm flex items-center gap-2",
                          logMessage.type === 'success' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                        )}>
                          {logMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {logMessage.text}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="workDate" className="text-xs uppercase font-bold text-muted-foreground">Work Date</Label>
                        <Input
                          id="workDate"
                          type="date"
                          value={workDate}
                          onChange={(e) => setWorkDate(e.target.value)}
                          className="bg-background border-sidebar-border text-white"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hoursWorked" className="text-xs uppercase font-bold text-muted-foreground">Hours Worked</Label>
                        <Input
                          id="hoursWorked"
                          type="number"
                          step="0.25"
                          min="0.1"
                          placeholder="e.g. 4.0 or 8.0"
                          value={hoursWorked}
                          onChange={(e) => setHoursWorked(e.target.value)}
                          className="bg-background border-sidebar-border text-white"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="remarks" className="text-xs uppercase font-bold text-muted-foreground">Work Remarks</Label>
                        <Textarea
                          id="remarks"
                          placeholder="Describe the work completed during this session..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          className="bg-background border-sidebar-border text-white min-h-[80px]"
                        />
                      </div>
                      <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={() => setLogModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submittingLog} className="bg-crimson hover:bg-crimson/90">
                          {submittingLog ? 'Saving...' : 'Record Time'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="bg-card border-none col-span-1">
              <CardHeader><CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Meta Data</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <User className="text-crimson w-4 h-4" />
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Artist</p><p className="text-white text-sm font-semibold">{authRole === 'Artist' ? (authUser?.fullName || 'You') : (task.assignedArtist || 'Unassigned')}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="text-yellow-500 w-4 h-4" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Status</p>
                    <p className="text-white text-sm font-semibold flex items-center gap-1.5">
                      {hasActiveSession && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                      {hasActiveSession ? 'In Progress (Active Session)' : (task.status || 'Unassigned')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Layers className="text-blue-500 w-4 h-4" />
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Priority</p><p className="text-white text-sm font-semibold">{task.priority || 'Medium'}</p></div>
                </div>
                {task.complexity && (
                  <div className="flex items-center gap-3">
                    <Target className={cn(
                      "w-4 h-4",
                      task.complexity.toLowerCase().includes('hard') ? "text-red-400" :
                      task.complexity.toLowerCase().includes('mid') ? "text-yellow-400" :
                      task.complexity.toLowerCase().includes('easy') ? "text-green-400" :
                      "text-blue-400"
                    )} />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Complexity</p>
                      <Badge variant="outline" className={cn(
                        "uppercase text-[10px] font-bold mt-0.5",
                        task.complexity.toLowerCase().includes('hard') ? "text-red-400 border-red-400/30 bg-red-400/10" :
                        task.complexity.toLowerCase().includes('mid') ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                        task.complexity.toLowerCase().includes('easy') ? "text-green-400 border-green-400/30 bg-green-400/10" :
                        "text-blue-400 border-blue-400/30 bg-blue-400/10"
                      )}>
                        {task.complexity}
                      </Badge>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="text-emerald-500 w-4 h-4" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Due Date</p>
                    <p className="text-white text-sm font-semibold">{task.dueDate ? formatDateLocal(task.dueDate) : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Calculated Production Analytics Banner */}
            <Card className="bg-card border-none col-span-3">
              <CardHeader><CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Auto-Calculated Production Analytics</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Estimated Bid</p>
                  <p className="text-3xl font-headline text-white">{estimatedBid.toFixed(2)} Bid</p>
                  <p className="text-xs text-muted-foreground">{task.estimatedHours} hrs (Planning)</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Target Allocation</p>
                  <p className="text-3xl font-headline text-white">{targetBid.toFixed(2)} Bid</p>
                  <p className="text-xs text-muted-foreground">{summary?.targetHours ?? task.targetHours ?? 0} hrs (Assigned)</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Actual Logged</p>
                  <p className="text-3xl font-headline text-crimson">{currentActualWorkedHours.toFixed(1)} hrs</p>
                  <p className="text-xs text-muted-foreground">{formatDurationDisplay(currentActualWorkedHours)} ({summary?.sessionCount || logs.length} sessions)</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Remaining Balance</p>
                  <p className={cn(
                    "text-3xl font-headline",
                    currentRemainingHours >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {currentRemainingHours.toFixed(1)} hrs
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDurationDisplay(currentRemainingHours)} remaining</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="logs" className="w-full">
            <TabsList className="bg-sidebar border border-sidebar-border">
              <TabsTrigger value="timeline"><Activity className="w-4 h-4 mr-2" /> Activity Timeline</TabsTrigger>
              <TabsTrigger value="logs"><History className="w-4 h-4 mr-2" /> Time Logs ({logs.length})</TabsTrigger>
              <TabsTrigger value="reviews"><CheckCircle2 className="w-4 h-4 mr-2" /> Reviews & Reworks ({reviews.length})</TabsTrigger>
              <TabsTrigger value="versions"><Layers className="w-4 h-4 mr-2" /> Versions ({versions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="logs" className="mt-6">
              <Card className="bg-card border-none">
                <CardContent className="p-0">
                  {logs.length === 0 ? (
                    <div className="p-8 text-center space-y-3 animate-in fade-in slide-in-from-bottom-1.5 duration-200 ease-out">
                      <Clock className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">No actual work time logged yet for this task.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-sidebar-accent/30">
                        <TableRow className="border-sidebar-border">
                          <TableHead>Work Date</TableHead>
                          <TableHead>Artist / User</TableHead>
                          <TableHead>Session Window</TableHead>
                          <TableHead>Hours Worked</TableHead>
                          <TableHead>Remarks</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => {
                          const isOpen = log.endTime === null || log.endTime === undefined;
                          const hrs = parseFloat(String(log.hoursWorked)) || 0;
                          return (
                            <TableRow key={`timelog-${log.timeLogId || log.id}`} className="border-sidebar-border">
                              <TableCell className="text-white font-medium font-mono">
                                {log.workDate ? formatDateLocal(log.workDate) : 'N/A'}
                              </TableCell>
                              <TableCell className="text-white">{log.artistName || log.userName || 'Artist'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono">
                                {log.startTime ? formatTime12Hour(log.startTime) : 'N/A'} 
                                <span className="mx-2 text-muted-foreground/50">→</span>
                                {isOpen ? <span className="text-amber-400 font-bold animate-pulse">ACTIVE</span> : (log.endTime ? formatTime12Hour(log.endTime) : 'N/A')}
                              </TableCell>
                              <TableCell className="text-crimson font-bold font-mono">
                                {isOpen ? 'In Progress' : `${hrs.toFixed(2)} hrs (${formatDurationDisplay(hrs)})`}
                              </TableCell>
                              <TableCell className="text-muted-foreground max-w-md truncate">{log.remarks || 'No remarks'}</TableCell>
                              <TableCell>
                                {isOpen ? (
                                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">RUNNING</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-muted-foreground">COMPLETED</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Chronological Review & Rework History Tab */}
            <TabsContent value="reviews" className="mt-6 space-y-6">
              {combinedHistory.length === 0 ? (
                <Card className="bg-card border-none p-12 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-1.5 duration-200 ease-out">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-base font-semibold text-white">No Review History Recorded</p>
                  <p className="text-sm">When this task is submitted for review, version iterations (v001, v002, etc.) and reviewer reasons will appear here.</p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {combinedHistory.map((item, idx) => {
                    if (item.type === 'client_revision') {
                      const cr = item.data as TaskReworkItem;
                      return (
                        <Card key={`cr-${cr.reworkId}`} className="bg-card border-sidebar-border overflow-hidden shadow-xl">
                          <CardHeader className="bg-sidebar-accent/30 pb-3 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className="bg-blue-600 text-white font-mono text-sm px-3 py-1 font-bold">
                                CR#{cr.reworkRound}
                              </Badge>
                              <div>
                                <CardTitle className="text-base font-headline text-white">
                                  Client Revision #{cr.reworkRound}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground font-mono">
                                  Requested on {cr.requestedDate ? formatDateTimeLocal(cr.requestedDate) : 'N/A'} by <span className="text-white font-semibold">{cr.requestedByName || 'Admin'}</span>
                                </p>
                              </div>
                            </div>
                            <Badge className="uppercase text-[10px] font-bold px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              CLIENT REVISION
                            </Badge>
                          </CardHeader>
                          <CardContent className="p-5 space-y-4">
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                                  <RotateCcw className="w-4 h-4" /> REOPENED FOR CLIENT REVISION
                                </div>
                              </div>
                              <div className="pt-2 border-t border-blue-500/20">
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-300 block mb-1">Reason:</span>
                                <p className="text-white font-medium text-sm leading-relaxed bg-blue-950/40 p-3 rounded border border-blue-500/30">
                                  &quot;{cr.reason}&quot;
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    const rev = item.data as TaskReviewItem;
                    const reviewIdx = reviews.findIndex(r => r.reviewId === rev.reviewId);
                    const versionLabel = `v${String(reviewIdx + 1).padStart(3, '0')}`;
                    const reworkMatch = reworks.find(rw => rw.reviewId === rev.reviewId);
                    const isApproved = rev.reviewStatus === 'Approved';
                    const isRework = rev.reviewStatus === 'Rework';
                    const isSubmitted = rev.reviewStatus === 'Submitted';

                    return (
                      <Card key={`rev-${rev.reviewId}`} className="bg-card border-sidebar-border overflow-hidden shadow-xl">
                        <CardHeader className="bg-sidebar-accent/30 pb-3 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-crimson text-white font-mono text-sm px-3 py-1 font-bold">
                              {versionLabel}
                            </Badge>
                            <div>
                              <CardTitle className="text-base font-headline text-white">
                                Submission Iteration {versionLabel}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground font-mono">
                                Submitted on {rev.reviewDate ? formatDateTimeLocal(rev.reviewDate) : 'N/A'} by <span className="text-white font-semibold">{rev.artistName || task.assignedArtist || 'Artist'}</span>
                              </p>
                            </div>
                          </div>
                          <Badge className={cn(
                            "uppercase text-[10px] font-bold px-3 py-1",
                            isApproved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                            isRework ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                            "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                          )}>
                            {isApproved ? 'APPROVED' : isRework ? 'REWORK REQUESTED' : 'SUBMITTED FOR REVIEW'}
                          </Badge>
                        </CardHeader>

                        <CardContent className="p-5 space-y-4">
                          {/* Artist Submission Notes */}
                          {rev.remarks && (
                            <div className="text-sm bg-card/50 p-3 rounded-md border border-sidebar-border/60">
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Artist Submission Notes:</span>
                              <p className="text-white italic">&quot;{rev.remarks}&quot;</p>
                            </div>
                          )}

                          {/* Reviewer Feedback Section */}
                          {isRework && (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                                  <RotateCcw className="w-4 h-4" /> REWORK REQUESTED
                                  {reworkMatch?.reworkRound && <span className="text-xs font-mono text-purple-300">(Round #{reworkMatch.reworkRound})</span>}
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">
                                  Reviewer: <strong className="text-white">{rev.reviewerName || reworkMatch?.requestedByName || 'Supervisor'}</strong>
                                  {reworkMatch?.requestedDate || rev.reviewDate ? ` on ${formatDateTimeLocal(reworkMatch?.requestedDate || rev.reviewDate)}` : ''}
                                </span>
                              </div>

                              <div className="pt-2 border-t border-purple-500/20">
                                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 block mb-1">Reviewer Rework Reason:</span>
                                <p className="text-white font-medium text-sm leading-relaxed bg-purple-950/40 p-3 rounded border border-purple-500/30">
                                  &quot;{reworkMatch?.reason || rev.remarks || 'Please make requested adjustments.'}&quot;
                                </p>
                              </div>

                              {reworkMatch?.reviewerRemarks && reworkMatch.reviewerRemarks !== reworkMatch.reason && (
                                <div className="pt-1">
                                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Additional Remarks:</span>
                                  <p className="text-muted-foreground text-xs italic">&quot;{reworkMatch.reviewerRemarks}&quot;</p>
                                </div>
                              )}
                            </div>
                          )}

                          {isApproved && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                  <CheckCircle2 className="w-4 h-4" /> TASK APPROVED & COMPLETED
                                  {rev.rating && (
                                    <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold ml-2">
                                      <Star className="w-3.5 h-3.5 fill-yellow-400" /> {rev.rating}/5
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">
                                  Reviewer: <strong className="text-white">{rev.reviewerName || 'Supervisor'}</strong>
                                  {rev.reviewDate ? ` on ${formatDateTimeLocal(rev.reviewDate)}` : ''}
                                </span>
                              </div>

                              <div className="pt-2 border-t border-emerald-500/20">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block mb-1">Reviewer Comment:</span>
                                <p className="text-white font-medium text-sm leading-relaxed bg-emerald-950/40 p-3 rounded border border-emerald-500/30">
                                  &quot;{rev.remarks || 'Looks good. Approved.'}&quot;
                                </p>
                              </div>
                            </div>
                          )}

                          {isSubmitted && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between text-xs">
                              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 animate-spin" /> Pending Supervisor / Lead Review
                              </span>
                              <span className="text-muted-foreground">Waiting for reviewer evaluation...</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="versions" className="mt-6">
              {versions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-1.5 duration-200 ease-out">No submitted versions found for this task.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {versions.map(v => (
                    <Card key={`version-${v.id}`} className="bg-card border-none overflow-hidden group">
                      <div className="aspect-video bg-black relative">
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <PlayCircle className="w-12 h-12 text-white" />
                        </div>
                        <Badge className="absolute top-2 left-2 bg-black/60">v{v.versionNumber.toString().padStart(3, '0')}</Badge>
                        <Badge className={cn(
                          "absolute bottom-2 right-2",
                          v.reviewStatus === 'Approved' ? "bg-green-500" : v.reviewStatus === 'Retake' ? "bg-red-500" : "bg-yellow-500"
                        )}>{v.reviewStatus}</Badge>
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateLocal(v.createdAt)}</p>
                        {v.reviewComment && <p className="text-sm text-white italic">&quot;{v.reviewComment}&quot;</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-6">
              <Card className="bg-card border-none">
                <CardContent className="p-6">
                  {timeline.length === 0 ? (
                    <div className="text-center text-muted-foreground p-8 animate-in fade-in slide-in-from-bottom-1.5 duration-200 ease-out">No activity recorded for this task yet.</div>
                  ) : (
                    <div className="relative border-l-2 border-sidebar-border ml-3 pl-6 space-y-6">
                      {timeline.map((event, idx) => (
                        <div 
                          key={`timeline-${event.type || 'evt'}-${event.id || idx}`} 
                          className="relative opacity-0 animate-fade-in-up-sm"
                          style={{ animationDelay: `${Math.min(idx * 60, 600)}ms` }}
                        >
                          <div className="absolute -left-[31px] bg-sidebar border-2 border-sidebar-border rounded-full w-4 h-4 mt-1 transition-normal hover:scale-110" />
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{event.actorName || 'System'}</span>
                              <span className="text-sm text-muted-foreground">{event.action}</span>
                              {event.targetName && <span className="text-sm font-bold text-white">{event.targetName}</span>}
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDateTimeLocal(event.eventDate)}</span>
                            {event.details && (
                              <div className="mt-2 text-sm text-muted-foreground bg-sidebar-accent/20 p-3 rounded-md border border-sidebar-border/50">
                                {event.details}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit for Review Modal */}
          <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
            <DialogContent className="sm:max-w-[450px] bg-sidebar border-sidebar-border text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Send className="w-5 h-5 text-crimson" /> Submit Task for Review
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Submitting task <span className="text-white font-mono font-bold">{task?.taskCode}</span> ({task?.shotCode}) to reviewer queue.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitForReview} className="space-y-4 py-3">
                <div className="p-4 rounded-lg bg-card/60 border border-sidebar-border space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Task Name:</span>
                    <span className="font-semibold text-white">{task?.taskName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual Logged Time:</span>
                    <span className="font-mono text-crimson font-bold">
                      {currentActualWorkedHours.toFixed(1)} hrs
                      <span className="text-muted-foreground text-xs ml-1">
                        ({(currentActualWorkedHours / 8).toFixed(2)} Bid)
                      </span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detailSubmissionRemarks" className="text-sm font-semibold">Submission Notes / Remarks</Label>
                  <Textarea
                    id="detailSubmissionRemarks"
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
                    {submittingReview ? 'Submitting...' : 'Submit for Review'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
