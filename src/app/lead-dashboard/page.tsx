
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, UserPlus, MessageSquare, Gauge, Zap, Film, AlertTriangle, UserCheck, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';

export default function LeadDashboardPage() {
  const { tasks, shots, currentUser, assignTaskArtist, leadReviewTask, users } = useLuminaStore();
  
  // Filter tasks delegated to this lead (by department for simulation)
  const leadTasks = tasks.filter(t => t.pipelineStep === 'Comp'); 
  
  // Get team members from the store instead of static mock
  const teamMembers = users.filter(u => u.departmentId === 'dept-comp' && (u.role === 'Artist' || u.role === 'Lead'));

  const getShotName = (shotId: string) => shots.find(s => s.id === shotId)?.shotCode || "N/A";

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState('');

  const stats = {
    total: leadTasks.length,
    pendingAssignment: leadTasks.filter(t => !t.assignedArtistId).length,
    inProgress: leadTasks.filter(t => t.assignedArtistId && t.status === 'In Progress').length,
    pendingReview: leadTasks.filter(t => t.status === 'Pending Review' && t.reviewStatus !== 'Approved').length,
  };

  const handleOpenReview = (task: any) => {
    setSelectedTaskForReview(task);
    setReviewComment(task.latestLeadComment || '');
    setReviewModalOpen(true);
  };

  const handleReviewAction = (action: 'Approved' | 'Changes Requested') => {
    if (!selectedTaskForReview) return;
    leadReviewTask(selectedTaskForReview.id, action, reviewComment);
    setReviewModalOpen(false);
    toast({
      title: action === 'Approved' ? "Task Approved" : "Changes Requested",
      description: `${getShotName(selectedTaskForReview.shotId)} status updated.`
    });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lead Assignment Center</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Comp Team Control Hub</h1>
              <p className="text-muted-foreground">Orchestrating artist allocation for shots delegated by Supervisors.</p>
            </div>
            <CreateTaskDialog />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card border-none p-6 shadow-xl">
              <p className="text-xs font-bold text-muted-foreground uppercase">Unassigned Shots</p>
              <h3 className="text-3xl font-headline text-yellow-500 mt-1">{stats.pendingAssignment}</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-xl">
              <p className="text-xs font-bold text-muted-foreground uppercase">Active In-Progress</p>
              <h3 className="text-3xl font-headline text-blue-500 mt-1">{stats.inProgress}</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-xl">
              <p className="text-xs font-bold text-muted-foreground uppercase">Review Backlog</p>
              <h3 className="text-3xl font-headline text-accent mt-1">{stats.pendingReview}</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Team Load Health</p>
                  <h3 className="text-3xl font-headline text-green-500 mt-1">Stable</h3>
                </div>
                <UserCheck className="text-green-500 w-5 h-5" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              <Card className="bg-card border-none shadow-2xl overflow-hidden">
                <CardHeader className="bg-sidebar-accent/30 border-b border-sidebar-border">
                  <CardTitle className="text-white text-lg flex items-center gap-2 font-headline">
                    <Film className="text-crimson w-5 h-5" /> Shot Allocation Queue
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border h-14">
                      <TableHead className="pl-6">Shot Name</TableHead>
                      <TableHead>Task Name</TableHead>
                      <TableHead>Bid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Artist</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border hover:bg-sidebar-accent/20 transition-colors h-20">
                        <TableCell className="pl-6 font-bold text-white text-lg font-mono tracking-tighter">
                          {getShotName(task.shotId)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium uppercase">{task.taskName}</TableCell>
                        <TableCell className="text-white font-mono">{task.bidHours}h</TableCell>
                        <TableCell>
                           <Badge className={cn(
                             "text-[10px] uppercase font-bold",
                             task.status === 'Approved' ? "bg-green-500/20 text-green-500" : 
                             task.status === 'Pending Review' ? "bg-accent/20 text-accent" : 
                             task.status === 'Retake' ? "bg-red-500/20 text-red-500" : "bg-sidebar-accent text-muted-foreground"
                           )}>{task.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {task.assignedArtistId ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-crimson/20 text-crimson text-[8px] flex items-center justify-center font-bold">
                                {teamMembers.find(m => m.id === task.assignedArtistId)?.name.charAt(0) || 'AR'}
                              </div>
                              <span className="text-sm text-white">
                                {teamMembers.find(m => m.id === task.assignedArtistId)?.name || `Artist ${task.assignedArtistId}`}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-yellow-500/80 border-yellow-500/20 italic text-[10px]">Unassigned</Badge>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            {task.status === 'Pending Review' && (
                              <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={() => handleOpenReview(task)}>
                                <MessageSquare className="w-4 h-4 mr-2" /> QC
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="border-sidebar-border hover:text-crimson transition-all">
                                  <UserPlus className="w-4 h-4 mr-2" /> {task.assignedArtistId ? 'Reassign' : 'Assign'}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2 text-xl font-headline">
                                    <UserPlus className="text-crimson" /> Assign Artist: {getShotName(task.shotId)}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-6">
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="p-4 bg-sidebar-accent rounded-xl border border-sidebar-border">
                                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Task Info</p>
                                      <p className="text-lg font-bold text-white">{task.taskName}</p>
                                      <Badge variant="outline" className="mt-2 text-crimson border-crimson/20">{task.bidHours}h Bid</Badge>
                                    </div>
                                    <div className="p-4 bg-sidebar-accent rounded-xl border border-sidebar-border">
                                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Priority</p>
                                      <Badge className={cn(
                                        "text-xs font-bold uppercase",
                                        task.priority === 'High' || task.priority === 'Critical' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                                      )}>{task.priority}</Badge>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest px-1">Team Availability & Capacity</p>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                      {teamMembers.map(member => {
                                        const memberTasks = tasks.filter(t => t.assignedArtistId === member.id);
                                        const utilized = memberTasks.reduce((acc, t) => acc + t.bidHours, 0);
                                        const capacity = 40;
                                        const remaining = capacity - utilized;
                                        const isOverloaded = utilized > capacity;
                                        const isOnLeave = !member.isActive;

                                        return (
                                          <div key={member.id} className={cn(
                                            "flex items-center justify-between p-4 bg-sidebar-accent/50 rounded-xl border border-sidebar-border transition-all group",
                                            isOnLeave ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer hover:border-crimson hover:bg-crimson/5",
                                            task.assignedArtistId === member.id && "border-crimson bg-crimson/10"
                                          )} onClick={() => {
                                            if (isOnLeave) return;
                                            assignTaskArtist(task.id, member.id);
                                            toast({ title: "Task Assigned", description: `${member.name} assigned to ${getShotName(task.shotId)}` });
                                          }}>
                                            <div className="flex items-center gap-4">
                                              <div className="w-12 h-12 bg-sidebar-accent border border-sidebar-border rounded-xl flex items-center justify-center text-sm font-bold group-hover:bg-crimson group-hover:text-white transition-colors">
                                                {member.name.charAt(0)}
                                              </div>
                                              <div>
                                                <p className="font-bold text-white text-sm">{member.name}</p>
                                                <div className="flex items-center gap-2">
                                                  <Badge className={cn(
                                                    "text-[8px] uppercase font-bold h-4",
                                                    isOnLeave ? "bg-red-500/20 text-red-500" :
                                                    isOverloaded ? "bg-orange-500/20 text-orange-500" : "bg-green-500/20 text-green-500"
                                                  )}>{isOnLeave ? "Inactive" : "Available"}</Badge>
                                                  <span className="text-[10px] text-muted-foreground">{member.role}</span>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-right space-y-2 min-w-[140px]">
                                              <div className="flex justify-between text-[10px]">
                                                <span className="text-muted-foreground">Load: {utilized}h / {capacity}h</span>
                                                <span className={cn("font-bold", isOverloaded ? "text-red-500" : "text-white")}>
                                                  {isOverloaded ? "OVERLOAD" : `${remaining}h avail`}
                                                </span>
                                              </div>
                                              <Progress value={(utilized / capacity) * 100} className={cn("h-1.5", isOverloaded ? "bg-red-500/20" : "bg-sidebar-accent")} />
                                              {isOverloaded && <p className="text-[8px] text-red-500 font-bold uppercase flex items-center justify-end gap-1"><AlertTriangle className="w-2 h-2" /> Risk Detected</p>}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-card border-none shadow-2xl p-6">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                    Team Load Distribution
                    <Users className="w-4 h-4" />
                  </CardTitle>
                </CardHeader>
                <div className="space-y-8">
                  {teamMembers.map(member => {
                    const memberTasks = tasks.filter(t => t.assignedArtistId === member.id);
                    const utilized = memberTasks.reduce((acc, t) => acc + t.bidHours, 0);
                    const capacity = 40;
                    const util = Math.round((utilized / capacity) * 100);
                    const isOverloaded = util > 100;
                    return (
                      <div key={member.id} className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{member.name}</span>
                            {isOverloaded && <AlertTriangle className="text-red-500 w-3 h-3" />}
                          </div>
                          <span className={cn("font-bold", isOverloaded ? "text-red-500" : "text-green-500")}>{util}% Cap</span>
                        </div>
                        <Progress value={util} className={cn("h-2 bg-sidebar-accent")} />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>Bid Assigned: {utilized}h</span>
                          <span>Weekly Cap: {capacity}h</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="bg-accent/5 border border-accent/20 p-6 flex gap-4">
                <Clock className="text-accent w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">Lead Duty</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You have {stats.pendingAssignment} shots waiting for artist allocation and {stats.pendingReview} versions needing QC review.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Lead Review Dialog */}
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white max-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline flex items-center gap-3">
                <MessageSquare className="text-accent" /> Lead QC: {getShotName(selectedTaskForReview?.shotId || "") || "N/A"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="bg-sidebar-accent/50 p-5 rounded-xl border border-sidebar-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3 tracking-widest">Artist Production Notes</p>
                <p className="text-sm italic text-white leading-relaxed">
                  "{selectedTaskForReview?.latestArtistComment || "No production notes provided by artist."}"
                </p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Feedback / Retake Instructions</label>
                <Textarea 
                  className="bg-sidebar-accent border-sidebar-border h-40 text-sm focus:ring-accent" 
                  placeholder="Enter detailed technical feedback for the artist..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-4">
              <Button variant="outline" className="flex-1 h-12" onClick={() => handleReviewAction('Changes Requested')}>Retake (Artist)</Button>
              <Button className="bg-accent hover:bg-accent/90 flex-1 h-12 font-bold shadow-lg shadow-accent/20" onClick={() => handleReviewAction('Approved')}>Promote to Supervisor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
