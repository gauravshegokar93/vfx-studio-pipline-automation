
"use client";

import React, { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useLuminaStore } from '@/lib/store';
import { PipelineStep, Task, Priority } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Plus, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateTaskDialogProps {
  trigger?: React.ReactNode;
}

export function CreateTaskDialog({ trigger }: CreateTaskDialogProps) {
  const { projects, shots, users, tasks, addTask, currentUser } = useLuminaStore();
  const [open, setOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    projectId: '',
    shotId: '',
    pipelineStep: 'Comp' as PipelineStep,
    taskName: '',
    bidHours: 0,
    priority: 'Medium' as Priority,
    leadId: '',
    assignedArtistId: '',
    reviewerId: '',
    dueDate: new Date().toISOString().split('T')[0],
  });

  // Derived Data
  const filteredShots = useMemo(() => shots.filter(s => s.projectId === formData.projectId), [shots, formData.projectId]);
  const leads = useMemo(() => users.filter(u => u.role === 'Lead'), [users]);
  const artists = useMemo(() => users.filter(u => u.role === 'Artist'), [users]);
  const reviewers = useMemo(() => users.filter(u => u.role === 'Lead' || u.role === 'Department Supervisor'), [users]);

  // Artist Analytics
  const selectedArtistStats = useMemo(() => {
    if (!formData.assignedArtistId) return null;
    const artist = users.find(u => u.id === formData.assignedArtistId);
    const artistTasks = tasks.filter(t => t.assignedArtistId === formData.assignedArtistId);
    const assignedBid = artistTasks.reduce((acc, t) => acc + t.bidHours, 0);
    const capacity = 40;
    const remaining = capacity - assignedBid;
    const status = !artist?.isActive ? 'On Leave' : (assignedBid > 32 ? 'Busy' : 'Available');
    
    return {
      name: artist?.name,
      tasksCount: artistTasks.length,
      assignedBid,
      capacity,
      remaining,
      status,
      isOverloaded: assignedBid > capacity
    };
  }, [formData.assignedArtistId, users, tasks]);

  const handleCreate = () => {
    if (!formData.shotId || !formData.taskName || formData.bidHours <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Data', description: 'Please fill out all required fields.' });
      return;
    }

    const newTask: Task = {
      id: `task_${Date.now()}`,
      shotId: formData.shotId,
      pipelineStep: formData.pipelineStep,
      taskName: formData.taskName,
      assignedArtistId: formData.assignedArtistId,
      leadId: formData.leadId,
      supervisorId: currentUser?.id || 'sup1',
      bidHours: formData.bidHours,
      spentHours: 0,
      remainingHours: formData.bidHours,
      status: formData.assignedArtistId ? 'In Progress' : 'Not Started',
      progress: 0,
      internalEta: formData.dueDate,
      reviewStatus: 'Pending',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: formData.dueDate,
      priority: formData.priority,
      reviewerId: formData.reviewerId
    };

    addTask(newTask);
    setOpen(false);
    toast({
      title: 'Task Created Successfully',
      description: `Task "${formData.taskName}" for shot ${shots.find(s => s.id === formData.shotId)?.shotCode} is now live.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-crimson shadow-lg shadow-crimson/20 font-bold">
            <Plus className="w-4 h-4 mr-2" /> Manual Production Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline flex items-center gap-2">
            <Plus className="text-crimson" /> Create Manual Production Task
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
          <div className="space-y-5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b border-sidebar-border pb-2">Task Configuration</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Project</Label>
                <Select value={formData.projectId} onValueChange={(val) => setFormData({...formData, projectId: val})}>
                  <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent className="bg-sidebar border-sidebar-border text-white">
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.projectCode}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Shot Name</Label>
                <Select value={formData.shotId} onValueChange={(val) => setFormData({...formData, shotId: val})} disabled={!formData.projectId}>
                  <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                    <SelectValue placeholder="Select Shot" />
                  </SelectTrigger>
                  <SelectContent className="bg-sidebar border-sidebar-border text-white">
                    {filteredShots.map(s => <SelectItem key={s.id} value={s.id}>{s.shotCode}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Task Name</Label>
              <Input 
                className="bg-sidebar-accent border-sidebar-border" 
                placeholder="e.g. Primary Cleanup" 
                value={formData.taskName}
                onChange={(e) => setFormData({...formData, taskName: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Department Step</Label>
                <Select value={formData.pipelineStep} onValueChange={(val: any) => setFormData({...formData, pipelineStep: val})}>
                  <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-sidebar border-sidebar-border text-white">
                    {['Roto', 'Paint', 'Comp', 'CG', 'Matchmove'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Complexity</Label>
                <Select value={formData.priority} onValueChange={(val: any) => setFormData({...formData, priority: val})}>
                  <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-sidebar border-sidebar-border text-white">
                    {['Low', 'Medium', 'High', 'Critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Bid Hours</Label>
                <Input 
                  type="number" 
                  className="bg-sidebar-accent border-sidebar-border" 
                  value={formData.bidHours}
                  onChange={(e) => setFormData({...formData, bidHours: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Due Date</Label>
                <Input 
                  type="date" 
                  className="bg-sidebar-accent border-sidebar-border" 
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b border-sidebar-border pb-2">Resource Allocation</p>
            
            <div className="space-y-2">
              <Label className="text-xs">Assign Lead</Label>
              <Select value={formData.leadId} onValueChange={(val) => setFormData({...formData, leadId: val})}>
                <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                  <SelectValue placeholder="Select Lead" />
                </SelectTrigger>
                <SelectContent className="bg-sidebar border-sidebar-border text-white">
                  {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Assign Reviewer</Label>
              <Select value={formData.reviewerId} onValueChange={(val) => setFormData({...formData, reviewerId: val})}>
                <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                  <SelectValue placeholder="Select Reviewer" />
                </SelectTrigger>
                <SelectContent className="bg-sidebar border-sidebar-border text-white">
                  {reviewers.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Assign Artist (Optional)</Label>
              <Select value={formData.assignedArtistId} onValueChange={(val) => setFormData({...formData, assignedArtistId: val})}>
                <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                  <SelectValue placeholder="Select Artist" />
                </SelectTrigger>
                <SelectContent className="bg-sidebar border-sidebar-border text-white">
                  {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedArtistStats && (
              <div className={cn(
                "p-4 rounded-xl border animate-in slide-in-from-top-2",
                selectedArtistStats.isOverloaded ? "bg-red-500/10 border-red-500/20" : "bg-sidebar-accent/50 border-sidebar-border"
              )}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Artist Capacity Analytics</p>
                    <p className="text-sm font-bold text-white mt-1">{selectedArtistStats.name}</p>
                  </div>
                  <Badge className={cn(
                    "text-[8px] uppercase",
                    selectedArtistStats.status === 'Available' ? "bg-green-500/20 text-green-500" : 
                    selectedArtistStats.status === 'Busy' ? "bg-orange-500/20 text-orange-500" : "bg-red-500/20 text-red-500"
                  )}>{selectedArtistStats.status}</Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Assigned Bid: {selectedArtistStats.assignedBid}h / {selectedArtistStats.capacity}h</span>
                    <span className={cn("font-bold", selectedArtistStats.isOverloaded ? "text-red-500" : "text-white")}>
                      {selectedArtistStats.remaining > 0 ? `${selectedArtistStats.remaining}h Avail` : 'CAPACITY EXCEEDED'}
                    </span>
                  </div>
                  <Progress value={(selectedArtistStats.assignedBid / selectedArtistStats.capacity) * 100} className="h-1.5" />
                  
                  {selectedArtistStats.isOverloaded && (
                    <div className="flex gap-2 items-center text-red-500 mt-2">
                      <AlertTriangle className="w-4 h-4" />
                      <p className="text-[10px] font-bold uppercase">Overload Warning: Department threshold exceeded.</p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Info className="w-3 h-3" />
                    <span>Artist currently has {selectedArtistStats.tasksCount} active tasks.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-sidebar-border pt-6 gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-crimson px-10 font-bold shadow-lg shadow-crimson/20" onClick={handleCreate}>
            <CheckCircle className="w-4 h-4 mr-2" /> Commit Task to SSoT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
