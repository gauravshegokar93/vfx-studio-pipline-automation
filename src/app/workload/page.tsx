"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  UserCheck, 
  Briefcase, 
  RefreshCw, 
  ChevronRight, 
  UserCircle,
  FileText,
  Filter,
  AlertTriangle
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
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { 
  taskService, 
  TaskItem, 
  UserItem, 
  DepartmentItem, 
  ArtistWorkloadReportItem 
} from '@/services/taskService';

export default function WorkloadPage() {
  const [workloads, setWorkloads] = useState<ArtistWorkloadReportItem[]>([]);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  // Artist Detail Drawer state
  const [selectedArtistItem, setSelectedArtistItem] = useState<ArtistWorkloadReportItem | null>(null);
  const [artistTasks, setArtistTasks] = useState<TaskItem[]>([]);
  const [loadingArtistTasks, setLoadingArtistTasks] = useState<boolean>(false);

  // Task Assignment Dialog state
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [selectedTaskToAssign, setSelectedTaskToAssign] = useState<TaskItem | null>(null);
  const [targetArtist, setTargetArtist] = useState<UserItem | null>(null);
  const [targetBid, setTargetBid] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('');
  const [submittingAssign, setSubmittingAssign] = useState<boolean>(false);

  // Adjust Target Modal state
  const [adjustModalOpen, setAdjustModalOpen] = useState<boolean>(false);
  const [selectedTaskToAdjust, setSelectedTaskToAdjust] = useState<TaskItem | null>(null);
  const [adjustingTarget, setAdjustingTarget] = useState<boolean>(false);

  // Master Data Loader
  const loadMasterData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [reportRes, tasksRes, deptsRes] = await Promise.all([
        taskService.getArtistWorkloadReport({
          departmentId: selectedDeptId !== 'all' ? selectedDeptId : undefined,
          searchQuery: searchQuery.trim() ? searchQuery.trim() : undefined
        }),
        taskService.getAllTasks({ statusId: 'unassigned' }),
        taskService.getDepartments()
      ]);
      setWorkloads(reportRes);
      setAllTasks(tasksRes);
      setDepartments(deptsRes);
    } catch (err: any) {
      console.error('[WorkloadPage] Load error:', err);
      setErrorMsg('Unable to load artist workload data. Please verify database connection.');
    } finally {
      setLoading(false);
    }
  }, [selectedDeptId, searchQuery]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  const formattedBid = (val?: number) => {
    if (val === undefined || val === null) return '0.00 Bid';
    return `${val.toFixed(2)} Bid`;
  };

  // Summary Metrics based strictly on real DB report data
  const metrics = useMemo(() => {
    const totalArtistsCount = workloads.length;
    const totalAssignedTasks = workloads.reduce((acc, w) => acc + w.taskCount, 0);
    const totalTargetAllocatedBids = workloads.reduce((acc, w) => acc + (w.targetBid || 0), 0);
    const totalActualBids = workloads.reduce((acc, w) => acc + (w.actualBid || 0), 0);
    const unassignedTasksCount = allTasks.length;

    return {
      totalArtistsCount,
      totalAssignedTasks,
      totalTargetAllocatedBids: Number(totalTargetAllocatedBids.toFixed(2)),
      totalActualBids: Number(totalActualBids.toFixed(2)),
      unassignedTasksCount
    };
  }, [workloads, allTasks]);

  // Handle Artist Selection for Detailed Task Drawer
  const handleSelectArtist = async (item: ArtistWorkloadReportItem) => {
    setSelectedArtistItem(item);
    setLoadingArtistTasks(true);
    try {
      const tasks = await taskService.getByArtist(item.artist.userId || item.artist.id);
      setArtistTasks(tasks);
    } catch (err) {
      console.error('[WorkloadPage] Error loading artist tasks:', err);
      toast({ title: 'Error', description: 'Failed to fetch artist tasks.', variant: 'destructive' });
    } finally {
      setLoadingArtistTasks(false);
    }
  };

  // Open Assign Modal for Unassigned Task
  const handleOpenAssignModal = (task: TaskItem) => {
    setSelectedTaskToAssign(task);
    setTargetArtist(null);
    const initialBid = task.targetBid !== undefined && task.targetBid !== null 
      ? task.targetBid 
      : (task.estimatedBid !== undefined && task.estimatedBid !== null ? task.estimatedBid : (task.estimatedHours ? task.estimatedHours / 8 : 0));
    setTargetBid(initialBid);
    setRemarks('');
    setAssignModalOpen(true);
  };

  // Execute Assignment
  const handleConfirmAssignment = async () => {
    if (!selectedTaskToAssign || !targetArtist) {
      toast({ title: 'Validation Error', description: 'Please select a task and an artist.', variant: 'destructive' });
      return;
    }

    setSubmittingAssign(true);
    const res = await taskService.assignTask({
      taskId: selectedTaskToAssign.taskId,
      userId: targetArtist.userId || targetArtist.id,
      targetBid: targetBid,
      remarks: remarks
    });
    setSubmittingAssign(false);

    if (res.success) {
      toast({ title: 'Task Assigned', description: `${selectedTaskToAssign.taskCode} assigned to ${targetArtist.fullName}.` });
      setAssignModalOpen(false);
      loadMasterData();
    } else {
      toast({ title: 'Assignment Failed', description: res.message, variant: 'destructive' });
    }
  };

  const handleOpenAdjustModal = (task: TaskItem) => {
    setSelectedTaskToAdjust(task);
    setTargetBid(task.targetBid !== undefined && task.targetBid !== null ? task.targetBid : (task.targetHours ? task.targetHours / 8 : 0));
    setRemarks('');
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjustTarget = async () => {
    if (!selectedTaskToAdjust) return;
    setAdjustingTarget(true);
    try {
      await taskService.adjustTarget(selectedTaskToAdjust.taskId, {
        targetBid: targetBid,
        remarks: remarks
      });
      toast({ title: 'Target Adjusted', description: `Target bid for ${selectedTaskToAdjust.taskCode} updated to ${targetBid} Bid.` });
      setAdjustModalOpen(false);
      loadMasterData();
      if (selectedArtistItem) {
        handleSelectArtist(selectedArtistItem);
      }
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    } finally {
      setAdjustingTarget(false);
    }
  };

  const activeArtistsList = workloads.map(w => w.artist);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 pb-24">
        {/* Top Header */}
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="text-crimson w-5 h-5" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Studio Production Operations</span>
            </div>
            <h1 className="text-4xl font-headline text-white mb-2">Artist Workload & Allocation</h1>
            <p className="text-muted-foreground">Real-time capacity analysis, artist effort allocation, and status distribution.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadMasterData} disabled={loading} className="gap-2 border-sidebar-border">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh Workload Data
          </Button>
        </div>

        {/* Error Alert if API Fails */}
        {errorMsg && (
          <Card className="bg-red-500/10 border border-red-500/30 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-400 w-5 h-5 shrink-0" />
              <p className="text-xs text-red-200">{errorMsg}</p>
            </div>
            <Button size="sm" variant="outline" onClick={loadMasterData} className="text-xs border-red-500/30 text-red-300">Retry</Button>
          </Card>
        )}

        {/* Summary Metrics Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border-none p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Active Artists</p>
                <h3 className="text-3xl font-headline text-white mt-1">{metrics.totalArtistsCount}</h3>
              </div>
              <Users className="text-blue-500 w-5 h-5" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">Active Artist Roster</p>
          </Card>

          <Card className="bg-card border-none p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Assigned Tasks</p>
                <h3 className="text-3xl font-headline text-green-400 mt-1">{metrics.totalAssignedTasks}</h3>
              </div>
              <CheckCircle className="text-green-500 w-5 h-5" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">Tasks Allocated in Pipeline</p>
          </Card>

          <Card className="bg-card border-none p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Allocated Target Bid</p>
                <h3 className="text-3xl font-headline text-yellow-400 mt-1">{formattedBid(metrics.totalTargetAllocatedBids)}</h3>
              </div>
              <Clock className="text-yellow-400 w-5 h-5" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">Total Target Allocation</p>
          </Card>

          <Card className="bg-card border-none p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Actual Worked Bid</p>
                <h3 className="text-3xl font-headline text-emerald-400 mt-1">{formattedBid(metrics.totalActualBids)}</h3>
              </div>
              <UserCheck className="text-emerald-400 w-5 h-5" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">Logged Execution Volume</p>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-card p-4 rounded-xl shadow-md border border-sidebar-border">
          {/* Department Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <Button
              variant={selectedDeptId === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDeptId('all')}
              className={selectedDeptId === 'all' ? 'bg-crimson text-white' : 'border-sidebar-border text-muted-foreground'}
            >
              All Departments
            </Button>
            {departments.map(dept => (
              <Button
                key={dept.id}
                variant={selectedDeptId === String(dept.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDeptId(String(dept.id))}
                className={selectedDeptId === String(dept.id) ? 'bg-crimson text-white' : 'border-sidebar-border text-muted-foreground'}
              >
                {dept.name}
              </Button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="bg-sidebar border-sidebar-border pl-9 text-xs text-white placeholder:text-muted-foreground"
              placeholder="Search artist name, emp code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Main Workload & Allocation View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Artist Workload Roster Table */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-none shadow-2xl overflow-hidden">
              <CardHeader className="bg-sidebar-accent/30 border-b border-sidebar-border flex flex-row items-center justify-between py-4">
                <CardTitle className="text-white text-base font-bold flex items-center gap-2 font-headline uppercase tracking-wider">
                  <UserCheck className="text-crimson w-5 h-5" /> Artist Allocation Roster ({workloads.length})
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-sidebar-accent/50 text-[11px] uppercase font-bold text-muted-foreground">
                    <TableRow className="border-sidebar-border h-12">
                      <TableHead className="pl-6">Artist / Code</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-center">In Progress</TableHead>
                      <TableHead className="text-center" title="Total Review Submissions">Reviews</TableHead>
                      <TableHead className="text-center" title="Total Rework Instances">Reworks</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center text-crimson">Overdue</TableHead>
                      <TableHead className="text-center">Complexity</TableHead>
                      <TableHead className="text-right">Target Bid</TableHead>
                      <TableHead className="text-right">Actual Bid</TableHead>
                      <TableHead className="text-right">Remaining Bid</TableHead>
                      <TableHead className="pr-6 text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workloads.map((item) => {
                      const { artist } = item;
                      const hasOverdue = item.overdueCount > 0;

                      return (
                        <TableRow 
                          key={artist.userId || artist.id} 
                          className="border-sidebar-border hover:bg-sidebar-accent/30 h-16 cursor-pointer transition-colors"
                          onClick={() => handleSelectArtist(item)}
                        >
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-crimson/10 text-crimson font-bold text-xs flex items-center justify-center border border-crimson/20">
                                {artist.fullName?.charAt(0) || 'A'}
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{artist.fullName}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{artist.employeeCode}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white text-xs">
                            {artist.departmentName || 'CG'}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono">
                            <span className="text-white font-bold">{item.activeTaskCount}</span>
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono font-bold text-blue-400">
                            {item.inProgressCount || '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono font-bold text-amber-400">
                            {item.reviewSubmissions || '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono font-bold text-purple-400">
                            {item.historicalReworkCount || '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono font-bold text-green-400">
                            {item.completedCount || '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono font-bold text-red-500">
                            {item.overdueCount || '-'}
                          </TableCell>
                          <TableCell className="text-center text-[10px] font-mono">
                            {(() => {
                              const comps = (item.taskComplexities || '').split(',').filter(Boolean);
                              const counts = comps.reduce((acc: Record<string, number>, c: string) => {
                                acc[c] = (acc[c] || 0) + 1;
                                return acc;
                              }, {});
                              return Object.entries(counts).map(([comp, count], i) => (
                                <span key={i} className="mr-1 text-muted-foreground border border-muted-foreground/30 px-1 rounded-sm" title={comp}>
                                  {count}{comp.charAt(0).toUpperCase()}
                                </span>
                              ));
                            })()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-yellow-400 font-bold">
                            {formattedBid(item.targetBid)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-emerald-400 font-bold">
                            {formattedBid(item.actualBid)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-crimson font-bold">
                            {formattedBid(item.remainingBid)}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button size="sm" variant="ghost" className="hover:text-crimson">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {workloads.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-base font-bold text-white mb-1">No Active Artists Found</p>
                          <p className="text-xs">No active artists match the selected department or search criteria.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Right Column: Unassigned Tasks & Direct Allocation */}
          <div className="space-y-6">
            <Card className="bg-card border-none shadow-xl">
              <CardHeader className="bg-sidebar-accent/30 border-b border-sidebar-border">
                <CardTitle className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="text-yellow-500 w-4 h-4" /> Unassigned Task Queue ({allTasks.length})
                </CardTitle>
              </CardHeader>
              <div className="p-4 space-y-4 max-h-[550px] overflow-y-auto custom-scrollbar">
                {allTasks.map((task) => (
                  <div key={task.taskId} className="p-4 bg-sidebar-accent/30 rounded-xl border border-sidebar-border space-y-3 hover:border-crimson/40 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-white font-mono">{task.taskCode}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{task.shotCode} — {task.stage}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-crimson border-crimson/30">
                        {formattedBid(task.estimatedBid !== undefined && task.estimatedBid !== null ? task.estimatedBid : (task.estimatedHours ? task.estimatedHours / 8 : 0))}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-sidebar-border/50 text-xs">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Priority: {task.priority || 'Medium'}</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-sidebar-border hover:bg-crimson hover:text-white" onClick={() => handleOpenAssignModal(task)}>
                        Assign Task
                      </Button>
                    </div>
                  </div>
                ))}

                {allTasks.length === 0 && !loading && (
                  <div className="p-8 text-center text-muted-foreground">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500/30" />
                    <p className="text-xs font-bold text-white">All Work Allocated</p>
                    <p className="text-[10px]">All visible production tasks have an assigned artist.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Artist Task Detail Drawer */}
        <Sheet open={!!selectedArtistItem} onOpenChange={(open) => !open && setSelectedArtistItem(null)}>
          <SheetContent className="bg-sidebar border-sidebar-border text-white sm:max-w-md">
            <SheetHeader className="border-b border-sidebar-border pb-4">
              <SheetTitle className="text-xl font-headline flex items-center gap-3">
                <UserCircle className="text-crimson w-6 h-6" /> {selectedArtistItem?.artist.fullName}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {selectedArtistItem?.artist.employeeCode} • {selectedArtistItem?.artist.departmentName || 'Artist'} Department
              </SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-6">
              {loadingArtistTasks ? (
                <div className="p-8 text-center text-muted-foreground text-xs animate-pulse">Loading assigned tasks...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Assigned Tasks</p>
                      <p className="text-xl font-bold text-white mt-0.5">{selectedArtistItem?.taskCount} Tasks</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Target Bid</p>
                      <p className="text-xl font-bold text-yellow-400 mt-0.5">{formattedBid(selectedArtistItem?.targetBid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Actual Worked</p>
                      <p className="text-xl font-bold text-emerald-400 mt-0.5">{formattedBid(selectedArtistItem?.actualBid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Remaining Bid</p>
                      <p className="text-xl font-bold text-crimson mt-0.5">{formattedBid(selectedArtistItem?.remainingBid)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" /> Assigned Task Breakdown ({artistTasks.length})
                    </h4>
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                      {artistTasks.map((t) => (
                        <div key={t.taskId} className="p-4 bg-sidebar-accent/30 rounded-xl border border-sidebar-border space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-white font-mono">{t.taskCode}</p>
                              <p className="text-[10px] text-muted-foreground">{t.shotCode} ({t.stage})</p>
                            </div>
                            <Badge className="text-[9px] uppercase bg-blue-500/20 text-blue-400">{t.status}</Badge>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-sidebar-border/40 text-xs">
                            <div className="flex flex-col gap-1 font-mono text-[10px]">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                Est: {formattedBid(t.estimatedBid !== undefined && t.estimatedBid !== null ? t.estimatedBid : (t.estimatedHours ? t.estimatedHours / 8 : 0))}
                                {(t.targetBid !== undefined && t.targetBid !== null ? t.targetBid : (t.targetHours ? t.targetHours / 8 : 0)) > (t.estimatedBid !== undefined && t.estimatedBid !== null ? t.estimatedBid : (t.estimatedHours ? t.estimatedHours / 8 : 0)) && (
                                  <span title="Target exceeds Client Estimate"><AlertCircle className="w-3 h-3 text-red-500" /></span>
                                )}
                              </span>
                              <span className="text-yellow-400 font-bold">Tgt: {formattedBid(t.targetBid !== undefined && t.targetBid !== null ? t.targetBid : (t.targetHours ? t.targetHours / 8 : 0))}</span>
                            </div>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] border-sidebar-border hover:bg-yellow-500 hover:text-white transition-all px-2" onClick={() => handleOpenAdjustModal(t)}>
                              Adjust Target
                            </Button>
                          </div>
                        </div>
                      ))}

                      {artistTasks.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground text-xs italic">
                          No active tasks currently assigned.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Task Assignment Modal */}
        <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-headline flex items-center gap-3">
                <UserCircle className="text-crimson" /> Assign Task: {selectedTaskToAssign?.taskCode}
              </DialogTitle>
              <DialogDescription className="hidden">
                Form to assign an eligible artist to the selected task from the workload view.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-3">
              <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border flex justify-between items-center text-xs">
                <div>
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Shot / Stage</p>
                  <p className="text-white font-bold">{selectedTaskToAssign?.shotCode} — {selectedTaskToAssign?.stage}</p>
                </div>
                {selectedTaskToAssign?.complexity && (
                  <div className="text-center">
                    <p className="text-muted-foreground uppercase font-bold text-[10px]">Complexity</p>
                    <Badge variant="outline" className={cn(
                      "uppercase text-[10px] font-bold mt-0.5",
                      selectedTaskToAssign.complexity.toLowerCase().includes('hard') ? "text-red-400 border-red-400/30 bg-red-400/10" :
                      selectedTaskToAssign.complexity.toLowerCase().includes('mid') ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                      selectedTaskToAssign.complexity.toLowerCase().includes('easy') ? "text-green-400 border-green-400/30 bg-green-400/10" :
                      "text-blue-400 border-blue-400/30 bg-blue-400/10"
                    )}>
                      {selectedTaskToAssign.complexity}
                    </Badge>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Estimated Bid</p>
                  <p className="text-crimson font-mono font-bold">{formattedBid(selectedTaskToAssign ? (selectedTaskToAssign.estimatedBid !== undefined && selectedTaskToAssign.estimatedBid !== null ? selectedTaskToAssign.estimatedBid : (selectedTaskToAssign.estimatedHours ? selectedTaskToAssign.estimatedHours / 8 : 0)) : 0)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Select Active Artist</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {activeArtistsList.map((artist) => {
                    const isSelected = !!targetArtist && (
                      (targetArtist.userId !== undefined && targetArtist.userId === artist.userId) ||
                      (targetArtist.id !== undefined && targetArtist.id === artist.id)
                    );
                    return (
                      <div
                        key={artist.userId || artist.id}
                        className={cn(
                          "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs",
                          isSelected ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500 text-white" : "bg-sidebar-accent/40 border-sidebar-border text-muted-foreground hover:border-emerald-500/50"
                        )}
                        onClick={() => setTargetArtist(artist)}
                      >
                        <div>
                          <p className="font-bold text-white">{artist.fullName}</p>
                          <p className="text-[10px] text-muted-foreground">{artist.employeeCode} • {artist.departmentName || 'Artist'}</p>
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
              </div>

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
                    placeholder="e.g. Workload allocation pass"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button className="bg-crimson hover:bg-crimson/90 flex-1 font-bold shadow-lg shadow-crimson/20" onClick={handleConfirmAssignment} disabled={submittingAssign}>
                {submittingAssign ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjust Target Modal */}
        <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline flex items-center gap-3">
                <Briefcase className="text-yellow-400" /> Adjust Target: {selectedTaskToAdjust?.taskCode}
              </DialogTitle>
              <DialogDescription className="hidden">Form to adjust target bid.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Context Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Assigned Artist</p>
                  <p className="text-white font-bold text-sm flex items-center gap-2 mt-1">
                    <UserCircle className="w-4 h-4 text-blue-400" /> {selectedTaskToAdjust?.assignedArtist || selectedArtistItem?.artist.fullName}
                  </p>
                </div>
                <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Client Estimate</p>
                  <p className="text-white font-mono font-bold text-sm mt-1">
                    {formattedBid(selectedTaskToAdjust?.estimatedBid !== undefined && selectedTaskToAdjust?.estimatedBid !== null ? selectedTaskToAdjust.estimatedBid : (selectedTaskToAdjust?.estimatedHours ? selectedTaskToAdjust.estimatedHours / 8 : 0))}
                  </p>
                </div>
                <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Actual Logged</p>
                  <p className="text-emerald-400 font-mono font-bold text-sm mt-1">
                    {formattedBid(selectedTaskToAdjust?.actualHours ? selectedTaskToAdjust.actualHours / 8 : 0)}
                  </p>
                </div>
                <div className="bg-sidebar-accent/50 p-4 rounded-xl border border-sidebar-border">
                  <p className="text-muted-foreground uppercase font-bold text-[10px]">Target Remaining</p>
                  <p className="text-crimson font-mono font-bold text-sm mt-1">
                    {formattedBid(Math.max(0, (selectedTaskToAdjust?.targetHours || 0) - (selectedTaskToAdjust?.actualHours || 0)) / 8)}
                  </p>
                </div>
              </div>

              {/* Warning Area */}
              {selectedTaskToAdjust && (
                (() => {
                  const estBid = selectedTaskToAdjust.estimatedBid !== undefined && selectedTaskToAdjust.estimatedBid !== null ? selectedTaskToAdjust.estimatedBid : (selectedTaskToAdjust.estimatedHours ? selectedTaskToAdjust.estimatedHours / 8 : 0);
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
              <Button onClick={handleConfirmAdjustTarget} disabled={adjustingTarget} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8">
                {adjustingTarget ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Briefcase className="w-4 h-4 mr-2" />}
                Save Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
