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

const ArtistCell = ({ task, parsedAssignments, handleOpenReassignModal, handleOpenUnassignModal, handleOpenAssignModal, tgtBid }: any) => {
  const [expanded, setExpanded] = useState(false);

  const formattedBid = (val?: number) => {
    if (val === undefined || val === null) return '0.00';
    return val.toFixed(2);
  };

  if (parsedAssignments.length === 0) {
    if (task.assignedArtist) {
      return (
        <div className="flex flex-col gap-1 bg-sidebar-accent/20 p-1.5 rounded-lg border border-sidebar-border/50">
          <div className="flex items-center gap-1.5">
            <UserCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-bold text-[11px] truncate">{task.assignedArtist}</span>
          </div>
          <div className="flex items-center justify-between pl-5">
            <span className="text-muted-foreground text-[10px] font-mono">
              {formattedBid(tgtBid)} Bid
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-3 border border-dashed border-sidebar-border rounded-md bg-sidebar-accent/5">
        <span className="text-muted-foreground uppercase text-[10px] font-bold mb-1 tracking-widest">Unassigned</span>
        <div className="flex items-center gap-3 text-[10px] font-mono mb-2">
          <div className="flex flex-col items-center">
            <span className="text-muted-foreground text-[8px] uppercase">Estimate</span>
            <span className="text-white font-bold">{formattedBid(task.estimatedBid || task.estimatedHours / 8)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-muted-foreground text-[8px] uppercase">Remain</span>
            <span className="text-crimson font-bold">{formattedBid(task.remainingBid)}</span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-3 text-[10px] uppercase tracking-wider text-white border-sidebar-border hover:bg-crimson hover:border-crimson"
          onClick={(e) => handleOpenAssignModal(e, task)}
        >
          Assign Artist
        </Button>
      </div>
    );
  }

  const visibleArtists = expanded ? parsedAssignments : parsedAssignments.slice(0, 3);
  const hiddenCount = parsedAssignments.length - 3;

  return (
    <div className="flex flex-col gap-1.5 min-w-[280px]">
      {parsedAssignments.length > 1 && (
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="bg-sidebar-accent/30 text-blue-400 border-blue-500/20 text-[9px] uppercase font-bold px-1.5 py-0 h-4">
            ARTISTS · {parsedAssignments.length}
          </Badge>
        </div>
      )}
      <div className="flex flex-col border border-sidebar-border rounded-md overflow-hidden bg-sidebar-accent/5 w-full">
        {visibleArtists.map((a: any, i: number) => {
          const tBid = (a.targetHours || 0) / 8;
          const aBid = (a.actualHours || 0) / 8;
          const rBid = tBid - aBid;

          return (
            <div key={i} className={cn("flex flex-col p-2 gap-1.5", i !== visibleArtists.length - 1 && "border-b border-sidebar-border/50")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UserCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="font-bold text-[11px] text-white truncate max-w-[160px]" title={a.artistName}>{a.artistName}</span>
                </div>
                <Badge variant="outline" className={cn(
                  "uppercase text-[8px] font-bold px-1.5 py-0 h-4 border-sidebar-border/50",
                  a.status === 'Completed' ? "bg-emerald-500/10 text-emerald-400" :
                  a.status === 'Review' ? "bg-amber-500/10 text-amber-400" :
                  a.status === 'In Progress' ? "bg-blue-500/10 text-blue-400" :
                  a.status === 'Rework' ? "bg-purple-500/10 text-purple-400" :
                  "bg-sidebar-accent text-muted-foreground"
                )}>
                  {a.status || 'Assigned'}
                </Badge>
              </div>

              <div className="flex items-end justify-between pl-5">
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[8px] uppercase">Target</span>
                    <span className="text-yellow-400 font-bold">{formattedBid(tBid)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[8px] uppercase">Actual</span>
                    <span className="text-emerald-400 font-bold">{formattedBid(aBid)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[8px] uppercase">Remain</span>
                    <span className="text-crimson font-bold">{formattedBid(rBid)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {rBid > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 px-1.5 text-[9px] uppercase tracking-wider text-blue-400 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-300"
                      onClick={(e) => handleOpenReassignModal(e, a, task)}
                    >
                      Reassign
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-5 px-1.5 text-[9px] uppercase tracking-wider text-muted-foreground border-sidebar-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                    onClick={(e) => handleOpenUnassignModal(e, a, task)}
                  >
                    Unassign
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!expanded && hiddenCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-muted-foreground hover:text-white justify-center border border-dashed border-sidebar-border mt-1"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
        >
          + Show {hiddenCount} more artists
        </Button>
      )}
      {expanded && hiddenCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-muted-foreground hover:text-white justify-center border border-dashed border-sidebar-border mt-1"
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
        >
          Hide artists
        </Button>
      )}
    </div>
  );
};

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
  const [selectedArtistsData, setSelectedArtistsData] = useState<{ [key: string]: { artist: any; targetBid: number | string } }>({});
  const [currentAssignments, setCurrentAssignments] = useState<any[]>([]);
  const [globalRemarks, setGlobalRemarks] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Derive Modal Variables
  const modalEstBid = selectedTask?.estimatedBid !== undefined && selectedTask?.estimatedBid !== null ? selectedTask.estimatedBid : (selectedTask?.estimatedHours ? selectedTask.estimatedHours / 8 : 0);
  const modalTgtBid = selectedTask?.targetBid !== undefined && selectedTask?.targetBid !== null ? selectedTask.targetBid : modalEstBid;
  let modalAllocatedBid = 0;
  if (selectedTask?.assignmentsJson) {
    try {
      const parsed = typeof selectedTask.assignmentsJson === 'string' ? JSON.parse(selectedTask.assignmentsJson) : selectedTask.assignmentsJson;
      if (Array.isArray(parsed) && parsed.length > 0) {
        modalAllocatedBid = parsed.reduce((sum: number, a: any) => sum + ((a.targetHours || 0) / 8), 0);
      } else if (selectedTask?.assignedArtist) {
        modalAllocatedBid = modalTgtBid;
      }
    } catch (e) {}
  } else if (selectedTask?.assignedArtist) {
    modalAllocatedBid = modalTgtBid;
  }
  const newAssignmentsBid = Object.values(selectedArtistsData).reduce((sum, data) => sum + (Number(data.targetBid) || 0), 0);
  const modalRemainingBid = modalEstBid - modalAllocatedBid - newAssignmentsBid;

  // Adjust Target Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [targetBid, setTargetBid] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('');
  const [adjusting, setAdjusting] = useState(false);

  // Unassign Modal
  const [unassignModalOpen, setUnassignModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [unassigning, setUnassigning] = useState(false);

  // Reassign Modal
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [newUserId, setNewUserId] = useState<string>('');
  const [reassigning, setReassigning] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setCurrentUser(JSON.parse(u));
    } catch(e) {}
  }, []);

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
    setSelectedArtistsData({});
    setActiveArtists([]);
    setCurrentAssignments([]);
    setAssignModalOpen(true);
    setLoadingArtists(true);
    try {
      const [eligible, history] = await Promise.all([
        taskService.getEligibleArtists(task.taskId),
        taskService.getAssignmentHistory(task.taskId)
      ]);

      const assigns = history.filter(h => h.assignmentType === 'Assign');
      const uniqueAssigns = Array.from(new Map(assigns.map(a => [a.assignedToUserId, a])).values());
      setCurrentAssignments(uniqueAssigns);

      const assignedIds = new Set(uniqueAssigns.map(a => String(a.assignedToUserId)));
      const filteredEligible = eligible.filter(a => {
         const id = String(a.userId || a.id || (a as any).UserId);
         return !assignedIds.has(id);
      });

      setActiveArtists(filteredEligible);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load eligible artists', variant: 'destructive' });
    } finally {
      setLoadingArtists(false);
    }
    setGlobalRemarks('');
  };

  const handleExecuteAssignment = async () => {
    const selectedIds = Object.keys(selectedArtistsData);
    if (!selectedTask || selectedIds.length === 0) {
      toast({ title: 'Validation Error', description: 'Please select at least one artist to assign.', variant: 'destructive' });
      return;
    }

    if (modalRemainingBid < -0.001) {
      toast({ title: 'Validation Error', description: `Allocation exceeds the available ${(modalEstBid - modalAllocatedBid).toFixed(2)} Bid.`, variant: 'destructive' });
      return;
    }

    setAssigning(true);
    let successCount = 0;
    let failCount = 0;

    for (const artistId of selectedIds) {
      const data = selectedArtistsData[artistId];
      try {
        const result = await taskService.assignTask({
          taskId: selectedTask.taskId,
          userId: parseInt(artistId, 10),
          targetBid: Number(data.targetBid) || 0,
          remarks: globalRemarks
        });
        if (result.success) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }
    }

    setAssigning(false);

    if (successCount > 0 && failCount === 0) {
      toast({ title: 'Tasks Assigned', description: `Successfully assigned ${successCount} artist(s).` });
      setAssignModalOpen(false);
      loadData();
    } else if (successCount > 0 && failCount > 0) {
      toast({ title: 'Partial Success', description: `Assigned ${successCount} artist(s), but ${failCount} failed.`, variant: 'destructive' });
      setAssignModalOpen(false);
      loadData();
    } else {
      toast({ title: 'Assignment Failed', description: 'Failed to assign artists.', variant: 'destructive' });
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

  const handleOpenUnassignModal = (e: React.MouseEvent, assignment: any, task: TaskItem) => {
    e.stopPropagation();
    setSelectedTask(task);
    setSelectedAssignment(assignment);
    setUnassignModalOpen(true);
  };

  const handleExecuteUnassign = async () => {
    if (!selectedAssignment) return;
    setUnassigning(true);
    try {
      await taskService.unassignTask(selectedAssignment.assignmentId);
      toast({ title: 'Artist Unassigned', description: 'The artist has been removed from this task.' });
      setUnassignModalOpen(false);
      loadData();
    } catch (err: any) {
      if (err.message && err.message.includes('Safe historical unassignment is not supported')) {
        toast({ title: 'Limitation Reached', description: 'Historical work will be preserved. Safe historical unassignment without schema changes is not supported in the existing schema.', variant: 'destructive', duration: 8000 });
      } else {
        toast({ title: 'Unassign Failed', description: err.message, variant: 'destructive' });
      }
      setUnassignModalOpen(false);
    } finally {
      setUnassigning(false);
    }
  };

  const handleOpenReassignModal = (e: React.MouseEvent, assignment: any, task: TaskItem) => {
    e.stopPropagation();
    setSelectedTask(task);
    setSelectedAssignment(assignment);
    setNewUserId('');
    setReassignModalOpen(true);
  };

  const handleExecuteReassign = async () => {
    if (!selectedAssignment || !newUserId) return;
    setReassigning(true);
    try {
      await taskService.reassignRemainingBid(selectedAssignment.assignmentId, parseInt(newUserId, 10));
      toast({ title: 'Reassignment Successful', description: 'The remaining bid has been transferred.' });
      setReassignModalOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Reassign Failed', description: err.message, variant: 'destructive' });
    } finally {
      setReassigning(false);
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

                  let parsedAssignments: any[] = [];
                  if (task.assignmentsJson) {
                    try {
                      parsedAssignments = typeof task.assignmentsJson === 'string'
                        ? JSON.parse(task.assignmentsJson)
                        : task.assignmentsJson;
                      if (!Array.isArray(parsedAssignments)) {
                        parsedAssignments = [];
                      }
                    } catch (e) {
                      console.error("Failed to parse assignmentsJson", e);
                    }
                  }

                  let allocatedBid = 0;
                  if (parsedAssignments.length > 0) {
                    allocatedBid = parsedAssignments.reduce((sum: number, a: any) => sum + ((a.targetHours || 0) / 8), 0);
                  } else if (task.assignedArtist) {
                    allocatedBid = tgtBid;
                  }

                  const actionRemainingBid = estBid - allocatedBid;
                  const hasAnyArtists = parsedAssignments.length > 0 || !!task.assignedArtistId;

                  return (
                    <TableRow
                      key={`task-${task.taskId || task.id || idx}`}
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

                      <TableCell className="text-xs text-white font-medium py-2 align-top">
                        <ArtistCell
                          task={task}
                          parsedAssignments={parsedAssignments}
                          handleOpenReassignModal={handleOpenReassignModal}
                          handleOpenUnassignModal={handleOpenUnassignModal}
                          handleOpenAssignModal={handleOpenAssignModal}
                          tgtBid={tgtBid}
                        />
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
                        {!hasAnyArtists ? (
                          <Button size="sm" variant="outline" className="hover:bg-crimson hover:text-white transition-all text-xs border-sidebar-border" onClick={(e) => handleOpenAssignModal(e, task)}>
                            Assign Artist
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" className="hover:bg-yellow-500 hover:text-white transition-all text-xs border-sidebar-border" onClick={(e) => handleOpenAdjustModal(e, task)}>
                              Adjust Target
                            </Button>
                            {actionRemainingBid > 0.001 ? (
                              <Button size="sm" variant="outline" className="hover:bg-crimson hover:text-white transition-all text-xs border-sidebar-border text-crimson" onClick={(e) => handleOpenAssignModal(e, task)}>
                                Assign Artist
                              </Button>
                            ) : actionRemainingBid >= -0.001 ? (
                              <Badge variant="outline" className="text-muted-foreground border-sidebar-border bg-sidebar-accent/20 cursor-default px-3 py-1.5 rounded-md font-normal h-8 flex items-center justify-center">
                                Fully Allocated
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10 cursor-default px-3 py-1.5 rounded-md font-normal h-8 flex items-center justify-center">
                                Over Allocated
                              </Badge>
                            )}
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
              <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Shot / Stage</p>
                  <p className="text-white font-bold text-sm">{selectedTask?.shotCode} — {selectedTask?.stage}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Task Bid</p>
                  <p className="text-white font-mono font-bold text-sm">
                    {formattedBid(modalEstBid)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Remaining Bid</p>
                  <p className={cn("font-mono font-bold text-sm", modalRemainingBid < -0.001 ? "text-red-400" : "text-crimson")}>
                    {formattedBid(modalRemainingBid)}
                  </p>
                </div>
              </div>

              {/* Current Assignments */}
              {currentAssignments.length > 0 && (
                <div className="space-y-3 mb-6">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Current Assignments</Label>
                  <div className="space-y-2">
                    {currentAssignments.map((assign, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-sidebar-border bg-sidebar-accent/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-sidebar text-muted-foreground">
                            {assign.assignedArtistName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{assign.assignedArtistName}</p>
                            <p className="text-[10px] text-muted-foreground">{assign.status || 'Assigned'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-yellow-400">{formattedBid(assign.estimatedHours ? assign.estimatedHours / 8 : 0)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Assigned</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artist Selection */}
              <div className="space-y-3">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Add Artists</Label>
                {loadingArtists ? (
                  <div className="text-center py-4 text-muted-foreground text-xs">Loading eligible artists...</div>
                ) : activeArtists.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-xs font-bold border border-sidebar-border rounded-xl bg-sidebar-accent/20">
                    No eligible active artists are available for this pipeline stage.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {activeArtists.map((artist, idx) => {
                      const artistKey = String(artist.userId || artist.id || (artist as any).UserId || `artist-${idx}`);
                      const isSelected = !!selectedArtistsData[artistKey];
                      const artistBid = isSelected ? selectedArtistsData[artistKey].targetBid : 0;

                      const toggleArtist = () => {
                        const newData = { ...selectedArtistsData };
                        if (isSelected) {
                          delete newData[artistKey];
                        } else {
                          newData[artistKey] = { artist, targetBid: '' };
                        }
                        setSelectedArtistsData(newData);
                      };

                      const handleBidChange = (val: number | '') => {
                        if (!isSelected) return;
                        setSelectedArtistsData({
                          ...selectedArtistsData,
                          [artistKey]: { ...selectedArtistsData[artistKey], targetBid: val }
                        });
                      };

                      return (
                      <div
                        key={artistKey}
                        className={cn(
                          "p-3 rounded-xl border transition-all flex flex-col gap-3",
                          isSelected ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500" : "bg-sidebar-accent/40 border-sidebar-border hover:border-emerald-500/50"
                        )}
                      >
                        <div className="flex items-center justify-between cursor-pointer" onClick={toggleArtist}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                              isSelected ? "bg-emerald-500 text-white" : "bg-sidebar text-muted-foreground"
                            )}>
                              {(artist.FullName || artist.fullName)?.charAt(0)}
                            </div>
                            <div>
                              <p className={cn("text-sm font-bold", isSelected ? "text-white" : "text-muted-foreground")}>{artist.FullName || artist.fullName}</p>
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
                        {isSelected && (
                          <div className="pl-11 pr-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                            <Label className="text-xs text-emerald-500 uppercase font-bold">Target Bid</Label>
                            <Input
                              type="number"
                              step="0.1"
                              className="w-24 bg-sidebar border-sidebar-border text-white text-xs font-mono h-8"
                              value={artistBid}
                              onChange={(e) => handleBidChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

              {/* Remarks */}
              <div className="grid grid-cols-1 gap-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase font-bold">Remarks (Optional)</Label>
                  <Input
                    className="bg-sidebar-accent border-sidebar-border text-white text-sm"
                    placeholder="e.g. Work allocation pass"
                    value={globalRemarks}
                    onChange={(e) => setGlobalRemarks(e.target.value)}
                  />
                </div>
              </div>

              {modalRemainingBid < -0.001 && (
                <div className="p-3 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold flex items-center justify-center">
                  Allocation exceeds the available {formattedBid(modalEstBid - modalAllocatedBid)}.
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button className="bg-crimson hover:bg-crimson/90 flex-1 font-bold shadow-lg shadow-crimson/20" onClick={handleExecuteAssignment} disabled={assigning || modalRemainingBid < -0.001}>
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
                  <div className="text-white font-bold text-sm flex flex-col gap-1 mt-1">
                    {(() => {
                      if (selectedTask?.assignmentsJson) {
                        try {
                          const assignments = typeof selectedTask.assignmentsJson === 'string' ? JSON.parse(selectedTask.assignmentsJson) : selectedTask.assignmentsJson;
                          if (Array.isArray(assignments) && assignments.length > 0) {
                            return assignments.map((a: any, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                <UserCircle className="w-4 h-4 text-blue-400 shrink-0" />
                                <span>{a.artistName} <span className="text-muted-foreground text-[10px] font-normal ml-1">({(a.targetHours / 8).toFixed(1)})</span></span>
                              </div>
                            ));
                          }
                        } catch (e) {}
                      }
                      return (
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-blue-400" />
                          <span>{selectedTask?.assignedArtist || 'Unassigned'}</span>
                        </div>
                      );
                    })()}
                  </div>
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
      <Dialog open={unassignModalOpen} onOpenChange={setUnassignModalOpen}>
        <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline flex items-center gap-3">
              <AlertCircle className="text-red-500" /> Unassign Artist
            </DialogTitle>
            <DialogDescription className="hidden">Confirm unassigning the artist.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Artist</p>
              <p className="text-white font-bold text-lg">{selectedAssignment?.artistName}</p>
              <div className="h-px bg-sidebar-border my-3" />
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Task</p>
              <p className="text-white font-mono text-sm">{selectedTask?.taskCode}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-sidebar-accent/30 p-3 rounded-lg border border-sidebar-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Allocated</p>
                <p className="text-sm font-mono font-bold text-yellow-400 mt-1">
                  {formattedBid((selectedAssignment?.targetHours || 0) / 8)}
                </p>
              </div>
              <div className="bg-sidebar-accent/30 p-3 rounded-lg border border-sidebar-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Remaining</p>
                <p className="text-sm font-mono font-bold text-emerald-400 mt-1">
                  {formattedBid((selectedAssignment?.targetHours || 0) / 8)}
                </p>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-400 text-sm">
              <p className="font-bold mb-1">Warning:</p>
              <p>This will remove this artist's assignment from the task.</p>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setUnassignModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600 flex-1 font-bold text-white shadow-lg shadow-red-500/20" onClick={handleExecuteUnassign} disabled={unassigning}>
              {unassigning ? 'Unassigning...' : 'Unassign Artist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Modal */}
      <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
        <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline flex items-center gap-3">
              <Briefcase className="text-blue-500 w-6 h-6" /> Reassign Remaining Bid
            </DialogTitle>
          </DialogHeader>

          {(() => {
            const origTargetHours = selectedAssignment?.targetHours || 0;
            const origActualHours = selectedAssignment?.actualHours || 0;
            const remHours = Math.max(0, origTargetHours - origActualHours);
            const origTargetBid = origTargetHours / 8;
            const origActualBid = origActualHours / 8;
            const remBid = remHours / 8;

            const selectedUser = users.find(u => String(u.userId) === newUserId);

            let isAlreadyAssigned = false;
            if (selectedTask?.assignmentsJson && newUserId) {
              try {
                const assignments = typeof selectedTask.assignmentsJson === 'string'
                  ? JSON.parse(selectedTask.assignmentsJson)
                  : selectedTask.assignmentsJson;
                if (Array.isArray(assignments)) {
                  isAlreadyAssigned = assignments.some((a: any) => String(a.userId) === newUserId);
                }
              } catch (e) {}
            }

            return (
              <div className="space-y-6 py-2 max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">

                {/* 1. Task Info */}
                <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Task</p>
                    <p className="text-white font-bold text-base">{selectedTask?.taskCode}</p>
                    <p className="text-xs text-muted-foreground">{selectedTask?.shotCode} {selectedTask?.taskName ? `- ${selectedTask.taskName}` : ''}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Department / Stage</p>
                    <Badge variant="outline" className="text-crimson border-crimson/20 uppercase text-xs font-bold">
                      {selectedTask?.stage || 'General'}
                    </Badge>
                  </div>
                </div>

                {/* PERFORMED BY */}
                <div className="bg-sidebar-accent/50 p-3 rounded-lg border border-sidebar-border flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Performed By</p>
                    <p className="text-white font-bold text-sm">{currentUser?.fullName || currentUser?.FullName || 'Super Admin'}</p>
                    <p className="text-xs text-muted-foreground">{currentUser?.roleName || currentUser?.RoleName || 'Super Admin'}</p>
                  </div>
                </div>

                {/* Visual Transfer Overview */}
                <div className="flex flex-col items-center">
                  {/* FROM */}
                  <div className="w-full bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-2">FROM — CURRENT ARTIST</p>
                    <p className="text-white font-bold text-lg">{selectedAssignment?.artistName}</p>
                    <p className="text-xs text-muted-foreground mb-3">{selectedTask?.stage || 'General'}</p>
                    <div className="flex justify-center gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Target: </span>
                        <span className="font-mono text-yellow-400 font-bold">{origTargetBid.toFixed(2)} Bid</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Actual: </span>
                        <span className="font-mono text-emerald-400 font-bold">{origActualBid.toFixed(2)} Bid</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Remaining: </span>
                        <span className="font-mono text-crimson font-bold">{remBid.toFixed(2)} Bid</span>
                      </div>
                    </div>
                  </div>

                  {/* TRANSFER AMOUNT */}
                  <div className="my-2 flex flex-col items-center justify-center">
                    <div className="h-4 w-px bg-sidebar-border"></div>
                    <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-6 py-3 rounded-xl flex flex-col items-center justify-center shadow-lg shadow-blue-500/5 my-2">
                      <p className="text-xs uppercase font-bold tracking-widest mb-1 text-center">Transfer Remaining</p>
                      <p className="font-mono font-bold text-xl">{remBid.toFixed(2)} BID</p>
                      <p className="text-[10px] opacity-80 mt-1">{remHours.toFixed(2)} HOURS</p>
                      <p className="text-[9px] text-blue-400/70 mt-2 text-center max-w-[200px]">Only remaining/unworked allocation will be transferred.</p>
                    </div>
                    <div className="h-4 w-px bg-sidebar-border"></div>
                    <div className="text-sidebar-border font-bold my-1">↓</div>
                  </div>

                  {/* TO */}
                  <div className={cn(
                    "w-full p-4 rounded-xl border text-center transition-all",
                    selectedUser ? "bg-blue-500/10 border-blue-500/30" : "bg-sidebar-accent/20 border-sidebar-border border-dashed"
                  )}>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-2">TO — NEW ARTIST</p>
                    {selectedUser ? (
                      <>
                        <p className="text-blue-400 font-bold text-lg mb-1">{selectedUser.fullName || (selectedUser as any).FullName}</p>
                        <p className="text-xs text-blue-400/70 mb-3">{selectedUser.departmentName || (selectedUser as any).DepartmentName || 'Artist'}</p>
                        <div className="flex justify-center gap-6 text-sm">
                          <div>
                            <span className="text-blue-400/70">Target after transfer: </span>
                            <span className="font-mono text-blue-400 font-bold">{remBid.toFixed(2)} Bid</span>
                          </div>
                          <div>
                            <span className="text-blue-400/70">Actual: </span>
                            <span className="font-mono text-emerald-400 font-bold">0.00 Bid</span>
                          </div>
                          <div>
                            <span className="text-blue-400/70">Remaining: </span>
                            <span className="font-mono text-crimson font-bold">{remBid.toFixed(2)} Bid</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic py-4">Select an artist below...</p>
                    )}
                  </div>
                </div>

                {/* New Artist Selection */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Select New Artist</Label>
                  <select
                    className="w-full bg-sidebar border border-sidebar-border text-white text-sm p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                  >
                    <option value="">-- Select an artist --</option>
                    {users
                      .filter(u => u.roleName === 'Artist' || u.roleName === 'QC Artist')
                      .filter(u => String(u.userId) !== String(selectedAssignment?.userId))
                      .map((u) => (
                        <option key={u.userId} value={String(u.userId)}>
                          {u.fullName || (u as any).FullName} ({(u as any).departmentName || (u as any).DepartmentName})
                        </option>
                    ))}
                  </select>
                  {isAlreadyAssigned && (
                    <p className="text-red-400 text-xs font-bold mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      This artist is already assigned to this task. Transfer not permitted.
                    </p>
                  )}
                </div>

                {/* Confirmation Warning */}
                <div className="bg-sidebar-accent/30 border border-sidebar-border p-3 rounded-lg text-muted-foreground text-xs leading-relaxed mt-2">
                  <span className="font-bold text-white mr-1">Warning:</span>
                  Only the remaining unworked allocation is transferred. The original artist's completed work and TimeLogs remain unchanged.
                </div>
              </div>
            );
          })()}

          <DialogFooter className="flex gap-3 pt-4 border-t border-sidebar-border mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setReassignModalOpen(false)}>Cancel</Button>
            {(() => {
              const selectedUser = users.find(u => String(u.userId) === newUserId);

              let isAlreadyAssigned = false;
              if (selectedTask?.assignmentsJson && newUserId) {
                try {
                  const assignments = typeof selectedTask.assignmentsJson === 'string' ? JSON.parse(selectedTask.assignmentsJson) : selectedTask.assignmentsJson;
                  if (Array.isArray(assignments)) {
                    isAlreadyAssigned = assignments.some((a: any) => String(a.userId) === newUserId);
                  }
                } catch (e) {}
              }

              const remHours = Math.max(0, (selectedAssignment?.targetHours || 0) - (selectedAssignment?.actualHours || 0));
              const remBid = remHours / 8;

              const btnText = selectedUser
                ? `Transfer ${remBid.toFixed(2)} Bid → ${selectedUser.fullName || (selectedUser as any).FullName}`
                : 'Transfer Remaining';

              return (
                <Button
                  className="bg-blue-500 hover:bg-blue-600 flex-[2] font-bold text-white shadow-lg shadow-blue-500/20 truncate"
                  onClick={handleExecuteReassign}
                  disabled={reassigning || !newUserId || isAlreadyAssigned}
                >
                  {reassigning ? 'Transferring...' : btnText}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </DashboardLayout>
);
}
