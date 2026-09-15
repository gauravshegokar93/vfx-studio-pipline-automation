"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLuminaStore } from '@/lib/store';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, Zap, Film, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import { taskService, TaskItem, UserItem } from '@/services/taskService';

export default function LeadDashboardPage() {
  const { currentUser } = useLuminaStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<UserItem | null>(null);
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTasks, allUsers] = await Promise.all([
        taskService.getAllTasks(),
        taskService.getUsers()
      ]);
      setTasks(allTasks);
      setUsers(allUsers);
    } catch (err) {
      console.error('[LeadDashboardPage] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeLeads = users.filter(u => u.isActive && (u.roleName === 'Lead' || u.roleId === 4));
  const activeArtists = users.filter(u => u.isActive && (u.roleName === 'Artist' || u.roleId === 5));

  const unassignedCount = tasks.filter(t => !t.assignedArtistId && t.status === 'Unassigned').length;
  const assignedCount = tasks.filter(t => t.assignedArtistId || t.status === 'Assigned').length;

  const handleOpenAssign = (task: TaskItem) => {
    setSelectedTask(task);
    setSelectedArtist(null);
    setAssignModalOpen(true);
  };

  const handleAssignArtist = async () => {
    if (!selectedTask || !selectedArtist) {
      toast({ title: 'Validation Error', description: 'Please select an artist.', variant: 'destructive' });
      return;
    }

    setAssigning(true);
    const res = await taskService.assignTask({
      taskId: selectedTask.taskId,
      userId: selectedArtist.userId || selectedArtist.id,
      targetHours: selectedTask.estimatedHours || 0,
      remarks: 'Assigned via Lead Dashboard'
    });
    setAssigning(false);

    if (res.success) {
      toast({ title: 'Success', description: `${selectedTask.taskCode} assigned to ${selectedArtist.fullName}` });
      setAssignModalOpen(false);
      loadData();
    } else {
      toast({ title: 'Assignment Error', description: res.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 pb-20">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="text-crimson w-5 h-5" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lead Assignment Center</span>
            </div>
            <h1 className="text-4xl font-headline text-white mb-2">Team Control Hub</h1>
            <p className="text-muted-foreground">Orchestrating artist allocation and technical QC for production groups.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2 border-sidebar-border">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh Hub
            </Button>
            <CreateTaskDialog />
          </div>
        </div>

        {/* Empty state banner if no active lead users in DB */}
        {activeLeads.length === 0 && (
          <Card className="bg-amber-500/10 border border-amber-500/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-amber-400 w-5 h-5 shrink-0" />
              <p className="text-xs text-amber-200">
                Notice: There are currently zero users with the <strong>Lead</strong> role in database. Supervisors can delegate tasks directly from the Department Queue.
              </p>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">No Lead Users</Badge>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
            <p className="text-xs font-bold text-muted-foreground uppercase">Active Artists</p>
            <h3 className="text-3xl font-headline text-white mt-1">{activeArtists.length}</h3>
          </Card>
          <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
            <p className="text-xs font-bold text-muted-foreground uppercase">Unassigned Tasks</p>
            <h3 className="text-3xl font-headline text-yellow-500 mt-1">{unassignedCount}</h3>
          </Card>
          <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
            <p className="text-xs font-bold text-muted-foreground uppercase">Assigned Tasks</p>
            <h3 className="text-3xl font-headline text-green-400 mt-1">{assignedCount}</h3>
          </Card>
          <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
            <p className="text-xs font-bold text-muted-foreground uppercase">Total Pipeline Bids</p>
            <h3 className="text-3xl font-headline text-blue-400 mt-1">{tasks.length}</h3>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <Card className="bg-card border-none shadow-2xl overflow-hidden">
              <CardHeader className="bg-sidebar-accent/30 border-b border-sidebar-border">
                <CardTitle className="text-white text-lg flex items-center gap-2 font-headline">
                  <Film className="text-crimson w-5 h-5" /> Pipeline Task Allocation Queue
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader className="bg-sidebar-accent/50">
                  <TableRow className="border-sidebar-border h-14">
                    <TableHead className="pl-6">Shot / Task Code</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Artist</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.slice(0, 15).map(task => (
                    <TableRow key={task.taskId} className="border-sidebar-border hover:bg-sidebar-accent/20 transition-colors h-16">
                      <TableCell className="pl-6">
                        <p className="font-bold text-white text-sm font-mono tracking-tighter">{task.taskCode}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{task.shotCode}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">{task.stageName || task.stage || 'General'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[10px] uppercase font-bold",
                          task.status === 'Assigned' ? "bg-green-500/20 text-green-400" : "bg-sidebar-accent text-muted-foreground"
                        )}>{task.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-white font-medium">
                        {task.assignedArtist || <span className="text-yellow-500/80 text-xs italic">Unassigned</span>}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {!task.assignedArtistId && (
                          <Button size="sm" variant="outline" className="hover:text-crimson border-sidebar-border" onClick={() => handleOpenAssign(task)}>
                            Allocate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {tasks.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic text-xs">
                        No tasks currently in pipeline database.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card border-none shadow-2xl p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                  Artist Roster ({activeArtists.length}) <Users className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {activeArtists.map((artist) => (
                  <div key={artist.userId || artist.id} className="p-3 bg-sidebar-accent/30 rounded-xl border border-sidebar-border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{artist.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">{artist.employeeCode} • {artist.departmentName || 'Artist'}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase border-green-500/30 text-green-400">Ready</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Allocate Dialog */}
        <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline">Assign Task: {selectedTask?.taskCode}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <p className="text-xs text-muted-foreground">Select an active artist to assign this task:</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {activeArtists.map(artist => (
                  <div
                    key={artist.userId || artist.id}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer flex justify-between items-center text-xs",
                      selectedArtist?.userId === artist.userId ? "bg-crimson/20 border-crimson text-white" : "bg-sidebar-accent/30 border-sidebar-border"
                    )}
                    onClick={() => setSelectedArtist(artist)}
                  >
                    <span>{artist.fullName} ({artist.employeeCode})</span>
                    <Button size="sm" variant="ghost">{selectedArtist?.userId === artist.userId ? 'Selected' : 'Select'}</Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button className="bg-crimson text-white font-bold" onClick={handleAssignArtist} disabled={assigning}>
                {assigning ? 'Assigning...' : 'Assign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
