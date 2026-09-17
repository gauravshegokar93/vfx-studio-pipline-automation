"use client";

import { useState, useEffect, useCallback } from 'react';
import useRouter from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  LayoutList, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle, 
  UserCircle, 
  Briefcase, 
  RefreshCw, 
  Search, 
  Filter, 
  ExternalLink,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import { taskService, TaskItem, UserItem } from '@/services/taskService';
import { dashboardService } from '@/services/dashboardService';

export default function DepartmentQueuePage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [activeArtists, setActiveArtists] = useState<any[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [projects, setProjects] = useState<{ id: string; projectCode: string; projectName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Operational Filters
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedStatusId, setSelectedStatusId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<UserItem | null>(null);
  const [targetBid, setTargetBid] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Adjust Target Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueData, usersData, dashData] = await Promise.all([
        taskService.getDepartmentQueue(selectedStage, {
          projectId: selectedProjectId !== 'all' ? selectedProjectId : undefined,
          statusId: selectedStatusId !== 'all' ? selectedStatusId : undefined,
          search: searchQuery.trim() ? searchQuery.trim() : undefined
        }),
        taskService.getUsers(),
        dashboardService.getExecutiveDashboard()
      ]);
      setTasks(queueData);
      setUsers(usersData);
      if (dashData?.projectsList) {
        setProjects(dashData.projectsList);
      }
    } catch (err) {
      console.error('[DepartmentQueuePage] Load error:', err);
      toast({ title: 'Error', description: 'Failed to load department tasks or users.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedStage, selectedProjectId, selectedStatusId, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAssignModal = async (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    setSelectedTask(task);
    setSelectedArtist(null);
    setActiveArtists([]);
    setAssignModalOpen(true);
    setLoadingArtists(true);
    try {
      const eligible = await taskService.getEligibleArtists(task.taskId);
      setActiveArtists(eligible);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load eligible artists', variant: 'destructive' });
    } finally {
      setLoadingArtists(false);
    }
    const initialBid = task.targetBid !== undefined && task.targetBid !== null 
      ? task.targetBid 
      : (task.estimatedBid !== undefined && task.estimatedBid !== null ? task.estimatedBid : (task.estimatedHours ? task.estimatedHours / 8 : 0));
    setTargetBid(initialBid);
    setRemarks('');
  };

  const handleExecuteAssignment = async () => {
    if (!selectedTask || !selectedArtist) {
      toast({ title: 'Validation Error', description: 'Please select an artist to assign.', variant: 'destructive' });
      return;
    }

    setAssigning(true);
    const result = await taskService.assignTask({
      taskId: selectedTask.taskId,
      userId: selectedArtist.userId || selectedArtist.id || (selectedArtist as any).UserId,
      targetBid: targetBid,
      remarks: remarks
    });

    setAssigning(false);

    if (result.success) {
      toast({ title: 'Task Assigned', description: `${selectedTask.taskCode} assigned to ${selectedArtist.fullName}.` });
      setAssignModalOpen(false);
      loadData();
    } else {
      toast({ title: 'Assignment Failed', description: result.message, variant: 'destructive' });
    }
  };

  const handleOpenAdjustModal = (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    setSelectedTask(task);
    setTargetBid(task.targetBid || 0);
    setRemarks('');
    setAdjustModalOpen(true);
  };

  const handleExecuteAdjustTarget = async () => {
    if (!selectedTask) return;
    setAdjusting(true);
    try {
      await taskService.adjustTarget(selectedTask.taskId, {
        targetBid: targetBid,
        remarks: remarks
      });
      toast({ title: 'Target Adjusted', description: `Target bid for ${selectedTask.taskCode} updated to ${targetBid} Bid.` });
      setAdjustModalOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    } finally {
      setAdjusting(false);
    }
  };

  const formattedBid = (val?: number) => {
    if (val === undefined || val === null) return '0.00 Bid';
    return `${val.toFixed(2)} Bid`;
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-crimson w-5 h-5" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Supervisor & Control Hub</span>
            </div>
            <h1 className="text-4xl font-headline text-white mb-2">Department Production Queue</h1>
            <p className="text-muted-foreground">Real-time operational task list per department workflow stage.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2 border-sidebar-border">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh Queue
            </Button>
            <CreateTaskDialog />
          </div>
        </div>

        {/* Operational Filter Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border border-sidebar-border shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            {/* Department / Stage Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'all', name: 'All Stages' },
                { id: '1', name: 'Roto' },
                { id: '2', name: 'Paint' },
                { id: '3', name: 'Comp' },
                { id: '4', name: 'CG' },
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant={selectedStage === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStage(tab.id)}
                  className={selectedStage === tab.id ? 'bg-crimson text-white font-bold' : 'border-sidebar-border text-muted-foreground'}
                >
                  {tab.name}
                </Button>
              ))}
            </div>

            <div className="h-6 w-px bg-sidebar-border hidden md:block" />

            {/* Project Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase font-bold">Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-sidebar border border-sidebar-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-crimson"
              >
                <option value="all">All Projects</option>
                {projects.map((p, idx) => (
                  <option key={p.id || `proj-${idx}`} value={p.id}>{p.projectName} ({p.projectCode})</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase font-bold">Status:</span>
              <select
                value={selectedStatusId}
                onChange={(e) => setSelectedStatusId(e.target.value)}
                className="bg-sidebar border border-sidebar-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-crimson"
              >
                <option value="all">All Statuses</option>
                <option value="unassigned">Unassigned</option>
                <option value="1">Assigned</option>
                <option value="2">In Progress</option>
                <option value="3">Review</option>
                <option value="5">Rework</option>
                <option value="4">Completed</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="bg-sidebar border-sidebar-border pl-9 text-xs text-white placeholder:text-muted-foreground"
              placeholder="Search Task Code, Shot Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Real Department Production Queue Table */}
        <Card className="bg-card border-none shadow-2xl overflow-hidden">
          <CardHeader className="bg-sidebar-accent/30 border-b border-sidebar-border flex flex-row items-center justify-between py-4">
            <CardTitle className="text-white text-base font-bold flex items-center gap-2 font-headline uppercase tracking-wider">
              <LayoutList className="text-crimson w-5 h-5" /> Production Tasks ({tasks.length})
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Click any row to open full Task Detail workbench.
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-sidebar-accent/50">
                <TableRow className="border-sidebar-border h-12 text-[11px] uppercase font-bold text-muted-foreground">
                  <TableHead className="pl-6">Task Code / Shot</TableHead>
                  <TableHead>Project / Reel</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estimated Bid</TableHead>
                  <TableHead>Target Bid</TableHead>
                  <TableHead>Actual Bid</TableHead>
                  <TableHead>Remaining Bid</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="pr-6 text-right">Assign Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task, idx) => {
                  const estBid = task.estimatedBid !== undefined && task.estimatedBid !== null ? task.estimatedBid : (task.estimatedHours ? task.estimatedHours / 8 : 0);
                  const tgtBid = task.targetBid !== undefined && task.targetBid !== null ? task.targetBid : (task.targetHours ? task.targetHours / 8 : estBid);
                  const actBid = task.actualBid !== undefined && task.actualBid !== null ? task.actualBid : (task.actualHours ? task.actualHours / 8 : 0);
                  const remBid = task.remainingBid !== undefined && task.remainingBid !== null ? task.remainingBid : (tgtBid - actBid);

                  const isCompleted = task.statusId === 4 || task.status === 'Completed';
                  const isReview = task.statusId === 3 || task.status === 'Review';
                  const isRework = task.statusId === 5 || task.status === 'Rework';
                  const isInProgress = task.statusId === 2 || task.status === 'In Progress';
                  const isAssigned = task.statusId === 1 || task.status === 'Assigned';
                  const isUnassigned = !task.assignedArtistId && (task.status === 'Unassigned' || !task.statusId);

                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

                  return (
                    <TableRow 
                      key={task.taskId || task.id || `task-${idx}`} 
                      className="border-sidebar-border hover:bg-sidebar-accent/30 h-16 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/tasks/${task.taskId || task.id}`}
                    >
                      <TableCell className="pl-6 font-mono">
                        <p className="font-bold text-white text-sm tracking-tight">{task.taskCode}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{task.shotCode}</p>
                      </TableCell>

                      <TableCell className="text-xs text-white">
                        <p className="font-semibold">{task.projectName || 'Project'}</p>
                        <p className="text-[10px] text-muted-foreground">{task.reelCode || task.sequenceCode || '-'}</p>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-crimson border-crimson/20 uppercase text-[10px] font-bold">
                          {task.stage || 'General'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-white font-medium">
                        {task.assignedArtist ? (
                          <div className="flex items-center gap-1.5">
                            <UserCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{task.assignedArtist}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Unassigned</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge className={cn(
                          "uppercase text-[10px] font-bold",
                          isCompleted ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          isReview ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse" :
                          isRework ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                          isInProgress ? "bg-blue-500/20 text-blue-400" :
                          isAssigned ? "bg-green-500/20 text-green-400" : "bg-sidebar-accent text-muted-foreground"
                        )}>
                          {task.status || 'Unassigned'}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-mono text-xs text-white">
                        <div className="flex items-center gap-1.5">
                          {formattedBid(estBid)}
                          {task.assignedArtist && tgtBid > estBid && (
                            <span title="Target exceeds Client Estimate"><AlertCircle className="w-3 h-3 text-red-500" /></span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-yellow-400 font-bold">{formattedBid(tgtBid)}</TableCell>
                      <TableCell className="font-mono text-xs text-emerald-400 font-bold">{formattedBid(actBid)}</TableCell>
                      <TableCell className="font-mono text-xs text-crimson font-bold">{formattedBid(remBid)}</TableCell>

                      <TableCell className="text-xs font-mono">
                        {task.dueDate ? (
                          <span className={cn(isOverdue ? "text-red-400 font-bold" : "text-muted-foreground")}>
                            {new Date(task.dueDate).toISOString().split('T')[0]}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        {isUnassigned ? (
                          <Button size="sm" variant="outline" className="hover:bg-crimson hover:text-white transition-all text-xs border-sidebar-border" onClick={(e) => handleOpenAssignModal(e, task)}>
                            Assign Artist
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" className="hover:bg-yellow-500 hover:text-white transition-all text-xs border-sidebar-border" onClick={(e) => handleOpenAdjustModal(e, task)}>
                              Adjust Target
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-white gap-1" asChild>
                              <Link href={`/tasks/${task.taskId}`}>
                                View <ExternalLink className="w-3 h-3" />
                              </Link>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {tasks.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-20 text-muted-foreground">
                      <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500/30" />
                      <p className="text-base font-bold text-white mb-1">No Queue Tasks Found</p>
                      <p className="text-xs">No tasks match the selected stage, project, status, or search query.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Task Assignment Dialog */}
        <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline flex items-center gap-3">
                <UserCircle className="text-crimson" /> Assign Task: {selectedTask?.taskCode}
              </DialogTitle>
              <DialogDescription className="hidden">
                Form to assign an eligible artist to the selected task.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border flex justify-between items-center text-xs">
                <div>
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Shot / Stage</p>
                  <p className="text-white font-bold text-sm">{selectedTask?.shotCode} — {selectedTask?.stage}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Estimated Bid</p>
                  <p className="text-crimson font-mono font-bold text-sm">
                    {formattedBid(selectedTask?.estimatedBid !== undefined && selectedTask?.estimatedBid !== null ? selectedTask.estimatedBid : (selectedTask?.estimatedHours ? selectedTask.estimatedHours / 8 : 0))}
                  </p>
                </div>
              </div>

              {/* Artist Selection */}
              <div className="space-y-3">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Select Active Artist</Label>
                {loadingArtists ? (
                  <div className="text-center py-4 text-muted-foreground text-xs">Loading eligible artists...</div>
                ) : activeArtists.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-xs font-bold border border-sidebar-border rounded-xl bg-sidebar-accent/20">
                    No eligible active artists are available for this pipeline stage.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {activeArtists.map((artist, idx) => {
                      const artistKey = artist.userId || artist.id || (artist as any).UserId || `artist-${idx}`;
                      const isSelected = !!selectedArtist && (
                        (selectedArtist.userId !== undefined && selectedArtist.userId === artist.userId) ||
                        (selectedArtist.id !== undefined && selectedArtist.id === artist.id) ||
                        ((selectedArtist as any).UserId !== undefined && (selectedArtist as any).UserId === (artist as any).UserId)
                      );
                      return (
                      <div
                        key={artistKey}
                        className={cn(
                          "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                          isSelected ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500 text-white" : "bg-sidebar-accent/40 border-sidebar-border text-muted-foreground hover:border-emerald-500/50"
                        )}
                        onClick={() => setSelectedArtist(artist)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                            isSelected ? "bg-emerald-500 text-white" : "bg-sidebar text-muted-foreground"
                          )}>
                            {(artist.FullName || artist.fullName)?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{artist.FullName || artist.fullName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {artist.DepartmentName || artist.departmentName || 'Artist'} 
                              {artist.TeamName ? ` • ${artist.TeamName}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected && <span className="text-emerald-500 font-bold text-[10px] uppercase">Selected</span>}
                          {isSelected ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-sidebar-border" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

              {/* Target Bid & Remarks */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase font-bold">Target Bid</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="bg-sidebar-accent border-sidebar-border text-white text-sm font-mono"
                    value={targetBid}
                    onChange={(e) => setTargetBid(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase font-bold">Remarks (Optional)</Label>
                  <Input
                    className="bg-sidebar-accent border-sidebar-border text-white text-sm"
                    placeholder="e.g. Work allocation pass"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button className="bg-crimson hover:bg-crimson/90 flex-1 font-bold shadow-lg shadow-crimson/20" onClick={handleExecuteAssignment} disabled={assigning}>
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline flex items-center gap-3">
                <Briefcase className="text-yellow-400" /> Adjust Target: {selectedTask?.taskCode}
              </DialogTitle>
              <DialogDescription className="hidden">Form to adjust target bid.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Context Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Assigned Artist</p>
                  <p className="text-white font-bold text-sm flex items-center gap-2 mt-1">
                    <UserCircle className="w-4 h-4 text-blue-400" /> {selectedTask?.assignedArtist}
                  </p>
                </div>
                <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Client Estimate</p>
                  <p className="text-white font-mono font-bold text-sm mt-1">
                    {formattedBid(selectedTask?.estimatedBid !== undefined && selectedTask?.estimatedBid !== null ? selectedTask.estimatedBid : (selectedTask?.estimatedHours ? selectedTask.estimatedHours / 8 : 0))}
                  </p>
                </div>
                <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Actual Logged</p>
                  <p className="text-emerald-400 font-mono font-bold text-sm mt-1">
                    {formattedBid(selectedTask?.actualHours ? selectedTask.actualHours / 8 : 0)}
                  </p>
                </div>
                <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Target Remaining</p>
                  <p className="text-crimson font-mono font-bold text-sm mt-1">
                    {formattedBid(Math.max(0, (selectedTask?.targetHours || 0) - (selectedTask?.actualHours || 0)) / 8)}
                  </p>
                </div>
              </div>

              {/* Warning Area */}
              {selectedTask && (
                (() => {
                  const estBid = selectedTask.estimatedBid !== undefined && selectedTask.estimatedBid !== null ? selectedTask.estimatedBid : (selectedTask.estimatedHours ? selectedTask.estimatedHours / 8 : 0);
                  if (targetBid > estBid) {
                    return (
                      <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-xs text-red-400 font-medium">Warning: Target allocation ({targetBid.toFixed(2)} Bid) exceeds client estimate ({estBid.toFixed(2)} Bid).</p>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              {/* Input */}
              <div className="space-y-3">
                <Label className="text-xs uppercase font-bold text-muted-foreground">New Target Allocation (Bid)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={targetBid} 
                    onChange={(e) => setTargetBid(parseFloat(e.target.value) || 0)}
                    className="bg-sidebar-accent/40 border-sidebar-border text-white text-lg font-mono py-6 pl-4 font-bold rounded-xl"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase">Bid ({targetBid * 8} Hours)</div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Remarks (Optional)</Label>
                <textarea 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-sidebar-accent/40 border-sidebar-border text-white text-sm p-3 rounded-xl min-h-[80px] focus:outline-none focus:ring-1 focus:ring-crimson resize-none"
                  placeholder="Reason for adjustment..."
                />
              </div>
            </div>

            <DialogFooter className="border-t border-sidebar-border pt-4 gap-2">
              <Button variant="ghost" onClick={() => setAdjustModalOpen(false)} className="text-muted-foreground hover:text-white">Cancel</Button>
              <Button onClick={handleExecuteAdjustTarget} disabled={adjusting} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8">
                {adjusting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Briefcase className="w-4 h-4 mr-2" />}
                Save Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
