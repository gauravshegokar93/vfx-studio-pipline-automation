
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutList, ShieldCheck, AlertCircle, CheckCircle, Film, UserCircle, Briefcase, Plus } from 'lucide-react';
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

export default function DepartmentQueuePage() {
  const { tasks, shots, assignTaskLead, supervisorApproveTask } = useLuminaStore();
  
  const getShotName = (shotId: string) => shots.find(s => s.id === shotId)?.shotCode || "N/A";

  const unassignedTasks = tasks.filter(t => !t.leadId);
  const reviewTasks = tasks.filter(t => t.status === 'Pending Review' && t.reviewStatus === 'Approved');

  const leads = [
    { id: 'l1', name: 'Kyle Reese', department: 'Comp', activeShots: 4 },
    { id: 'l2', name: 'John Matrix', department: 'Comp', activeShots: 2 },
    { id: 'l3', name: 'Zoe Chen', department: 'Paint', activeShots: 3 },
    { id: 'u4', name: 'Ellen Ripley', department: 'Comp', activeShots: 1 },
  ];

  const [supReviewModalOpen, setSupReviewModalOpen] = useState(false);
  const [selectedTaskForSupReview, setSelectedTaskForSupReview] = useState<any>(null);
  const [supComment, setSupComment] = useState('');

  const handleOpenSupReview = (task: any) => {
    setSelectedTaskForSupReview(task);
    setSupComment(task.latestSupComment || '');
    setSupReviewModalOpen(true);
  };

  const handleSupAction = (action: 'Approved' | 'Changes Requested') => {
    if (!selectedTaskForSupReview) return;
    supervisorApproveTask(selectedTaskForSupReview.id, action, supComment);
    setSupReviewModalOpen(false);
    toast({
      title: action === 'Approved' ? "Final Approval Issued" : "Shot Rejected",
      description: `${getShotName(selectedTaskForSupReview.shotId)} progress updated.`
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
                <ShieldCheck className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Supervisor Production Hub</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Department Orchestration</h1>
              <p className="text-muted-foreground">Delegating shot blocks to Leads and executing final quality sign-offs.</p>
            </div>
            <CreateTaskDialog />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="bg-card border-none shadow-2xl">
                <CardHeader className="bg-sidebar-accent/30 border-b border-sidebar-border">
                  <CardTitle className="text-white text-lg flex items-center gap-2 font-headline">
                    <LayoutList className="text-crimson w-5 h-5" /> Hierarchy Delegation Queue
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border h-12">
                      <TableHead className="pl-6">Shot Name</TableHead>
                      <TableHead>Pipeline Step</TableHead>
                      <TableHead>Bid</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="pr-6 text-right">Delegate to Lead</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unassignedTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border hover:bg-sidebar-accent/30 h-20 transition-colors">
                        <TableCell className="pl-6 font-bold text-white text-lg font-mono tracking-tighter">{getShotName(task.shotId)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-crimson border-crimson/20 uppercase text-[10px]">{task.pipelineStep}</Badge></TableCell>
                        <TableCell className="text-white font-mono">{task.bidHours}h</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[10px] font-bold uppercase",
                            task.priority === 'High' || task.priority === 'Critical' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                          )}>{task.priority}</Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="hover:bg-crimson hover:text-white transition-all">
                                <UserCircle className="w-4 h-4 mr-2" /> Assign Lead
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-sidebar border-sidebar-border text-white">
                              <DialogHeader>
                                <DialogTitle className="font-headline">Assign Department Lead: {getShotName(task.shotId)}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 py-4">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-2 px-1">Available Leads ({task.pipelineStep} Dept)</p>
                                {leads.filter(l => l.department === task.pipelineStep).map(lead => (
                                  <div key={lead.id} className="flex items-center justify-between p-4 bg-sidebar-accent rounded-xl border border-sidebar-border hover:border-crimson cursor-pointer transition-all group" onClick={() => {
                                    assignTaskLead(task.id, lead.id);
                                    toast({ title: "Lead Assigned", description: `${lead.name} is now supervising ${getShotName(task.shotId)}` });
                                  }}>
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-crimson/10 text-crimson rounded-xl flex items-center justify-center text-xs font-bold group-hover:bg-crimson group-hover:text-white transition-colors">LD</div>
                                      <div>
                                        <p className="text-sm font-bold text-white">{lead.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{lead.activeShots} active shots in queue</p>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="group-hover:text-crimson">Select</Button>
                                  </div>
                                ))}
                                {leads.filter(l => l.department === task.pipelineStep).length === 0 && (
                                  <div className="p-8 text-center bg-sidebar-accent/20 rounded-xl border border-dashed border-sidebar-border">
                                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                    <p className="text-sm text-muted-foreground italic">No leads found for {task.pipelineStep} department.</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {unassignedTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-24 text-muted-foreground">
                          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500/20" />
                          <p className="text-lg">All production shots have been delegated.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>

              <Card className="bg-card border-none shadow-2xl border-l-4 border-accent">
                <CardHeader className="bg-sidebar-accent/30 border-b border-sidebar-border">
                  <CardTitle className="text-white text-lg flex items-center gap-2 font-headline">
                    <CheckCircle className="text-accent w-5 h-5" /> Final Supervisor Verification
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border h-14">
                      <TableHead className="pl-6">Shot Name</TableHead>
                      <TableHead>Assigned Artist / Lead</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="pr-6 text-right">Final Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border h-24 hover:bg-sidebar-accent/20 transition-colors">
                        <TableCell className="pl-6 font-bold text-white text-xl font-mono tracking-tighter">{getShotName(task.shotId)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Artist {task.assignedArtistId || 'U-3'}</span>
                            <span className="text-[10px] font-bold text-crimson uppercase">Lead {task.leadId || 'L-1'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-44">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-white">{task.progress}% Rendered</span>
                            </div>
                            <Progress value={task.progress} className="h-2 bg-sidebar-accent" />
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button className="bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 font-bold" onClick={() => handleOpenSupReview(task)}>Final Sign-off</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reviewTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-24 text-muted-foreground italic">
                           No shots currently awaiting final supervisor verification.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-card border-none shadow-xl p-8">
                <CardHeader className="p-0 mb-6">
                   <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Dept Lead Utilization
                   </CardTitle>
                </CardHeader>
                <div className="space-y-8">
                  {leads.map(lead => (
                    <div key={lead.id} className="space-y-3">
                       <div className="flex justify-between items-center text-xs">
                         <div className="flex flex-col">
                           <span className="text-white font-bold">{lead.name}</span>
                           <span className="text-[10px] text-muted-foreground uppercase">{lead.department} Lead</span>
                         </div>
                         <Badge variant="outline" className="text-[10px] h-5">{lead.activeShots} Shots</Badge>
                       </div>
                       <Progress value={(lead.activeShots / 8) * 100} className="h-2 bg-sidebar-accent" />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-crimson/5 border border-crimson/20 p-6 flex gap-4">
                <AlertCircle className="text-crimson w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">Production Alert</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {unassignedTasks.length} shots have no departmental Lead assigned. Production is currently blocked until delegation occurs.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Supervisor Final Review Dialog */}
        <Dialog open={supReviewModalOpen} onOpenChange={setSupReviewModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline flex items-center gap-3">
                <ShieldCheck className="text-crimson" /> Final Verification: {getShotName(selectedTaskForSupReview?.shotId || "")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-sidebar-accent/50 p-5 rounded-xl border border-sidebar-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-widest">Artist Submission</p>
                  <p className="text-xs italic text-white/80 leading-relaxed">"{selectedTaskForSupReview?.latestArtistComment || "None"}"</p>
                </div>
                <div className="bg-sidebar-accent/50 p-5 rounded-xl border border-sidebar-border">
                  <p className="text-[10px] font-bold text-crimson uppercase mb-2 tracking-widest">Lead QC Verdict</p>
                  <p className="text-xs italic text-white/80 leading-relaxed">"{selectedTaskForSupReview?.latestLeadComment || "None"}"</p>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Final Supervisor Remarks</label>
                <Textarea 
                  className="bg-sidebar-accent border-sidebar-border h-40 text-sm focus:ring-crimson" 
                  placeholder="Final feedback or delivery sign-off instructions..."
                  value={supComment}
                  onChange={(e) => setSupComment(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-4">
              <Button variant="outline" className="flex-1 h-12" onClick={() => handleSupAction('Changes Requested')}>Reject (Internal Retake)</Button>
              <Button className="bg-crimson hover:bg-crimson/90 flex-1 h-12 font-bold shadow-lg shadow-crimson/20" onClick={() => handleSupAction('Approved')}>Final Sign-off</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
