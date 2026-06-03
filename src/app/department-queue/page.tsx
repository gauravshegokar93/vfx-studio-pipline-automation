
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutList, ShieldCheck, AlertCircle, CheckCircle, Film, UserCircle } from 'lucide-react';
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

export default function DepartmentQueuePage() {
  const { tasks, shots, assignTaskLead, supervisorApproveTask } = useLuminaStore();
  
  const getShotName = (shotId: string) => shots.find(s => s.id === shotId)?.shotCode || "N/A";

  const unassignedTasks = tasks.filter(t => t.status === 'Not Started' || !t.leadId);
  const reviewTasks = tasks.filter(t => t.status === 'Pending Review' && t.reviewStatus === 'Approved');

  const leads = [
    { id: 'l1', name: 'Kyle Reese', department: 'Comp', activeShots: 4 },
    { id: 'l2', name: 'John Matrix', department: 'Comp', activeShots: 2 },
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
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Supervisor Queue Control</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Department Hub</h1>
              <p className="text-muted-foreground">Orchestrating shot delivery and final quality sign-offs.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="bg-card border-none shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <LayoutList className="text-crimson w-5 h-5" /> Pending Lead Assignments
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border h-12">
                      <TableHead className="pl-6">Shot Name</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="pr-6 text-right">Assign Lead</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unassignedTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border hover:bg-sidebar-accent/30 h-16 transition-colors">
                        <TableCell className="pl-6 font-bold text-white text-lg">{getShotName(task.shotId)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-crimson border-crimson/20">{task.pipelineStep}</Badge></TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[10px] font-bold uppercase",
                            task.priority === 'High' || task.priority === 'Critical' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                          )}>{task.priority}</Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="hover:text-crimson">
                                <UserCircle className="w-5 h-5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-sidebar border-sidebar-border text-white">
                              <DialogHeader>
                                <DialogTitle>Delegate Lead: {getShotName(task.shotId)}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 py-4">
                                {leads.map(lead => (
                                  <div key={lead.id} className="flex items-center justify-between p-4 bg-sidebar-accent rounded-lg border border-sidebar-border hover:border-crimson cursor-pointer transition-colors" onClick={() => {
                                    assignTaskLead(task.id, lead.id);
                                    toast({ title: "Lead Assigned", description: `${lead.name} is now supervising ${getShotName(task.shotId)}` });
                                  }}>
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-crimson/10 text-crimson rounded-lg flex items-center justify-center text-xs font-bold">LD</div>
                                      <div>
                                        <p className="text-sm font-bold">{lead.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{lead.activeShots} active shots</p>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="outline">Delegate</Button>
                                  </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {unassignedTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">All departmental shots have been delegated to Leads.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>

              <Card className="bg-card border-none shadow-2xl border-l-4 border-accent">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <CheckCircle className="text-accent w-5 h-5" /> Final QC / Supervisor Sign-off
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border h-12">
                      <TableHead className="pl-6">Shot Name</TableHead>
                      <TableHead>Production Team</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="pr-6 text-right">Final Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border h-20 hover:bg-sidebar-accent/20 transition-colors">
                        <TableCell className="pl-6 font-bold text-white text-lg">{getShotName(task.shotId)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Artist {task.assignedArtistId}</span>
                            <span className="text-[10px] font-bold text-crimson uppercase">Lead {task.leadId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-44">
                          <div className="space-y-1">
                            <Progress value={task.progress} className="h-1.5 bg-sidebar-accent" />
                            <p className="text-[10px] text-white font-bold">{task.progress}% Rendered</p>
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button size="sm" className="bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20" onClick={() => handleOpenSupReview(task)}>Final Verify</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reviewTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">No shots currently awaiting final supervisor verification.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-card border-none shadow-xl p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-6 tracking-widest">Department Lead Load</h3>
                <div className="space-y-6">
                  {leads.map(lead => (
                    <div key={lead.id} className="space-y-3">
                       <div className="flex justify-between items-center text-xs">
                         <span className="text-white font-bold">{lead.name}</span>
                         <span className="text-muted-foreground font-mono">{lead.activeShots} Shots</span>
                       </div>
                       <Progress value={(lead.activeShots / 10) * 100} className="h-2 bg-sidebar-accent" />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-yellow-500/5 border border-yellow-500/20 p-6 flex gap-4">
                <AlertCircle className="text-yellow-500 w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">Sign-off Warning</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {reviewTasks.length} shots have passed Lead QC and require your final verification for client delivery.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Supervisor Final Review Dialog */}
        <Dialog open={supReviewModalOpen} onOpenChange={setSupReviewModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white">
            <DialogHeader>
              <DialogTitle>Final Approval: {getShotName(selectedTaskForSupReview?.shotId || "")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-sidebar-accent p-4 rounded-lg border border-sidebar-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Artist Submission</p>
                  <p className="text-xs italic text-white/80">"{selectedTaskForSupReview?.latestArtistComment || "None"}"</p>
                </div>
                <div className="bg-sidebar-accent p-4 rounded-lg border border-sidebar-border">
                  <p className="text-[10px] font-bold text-crimson uppercase mb-2">Lead QC Feedback</p>
                  <p className="text-xs italic text-white/80">"{selectedTaskForSupReview?.latestLeadComment || "None"}"</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Final Supervisor Remarks</label>
                <Textarea 
                  className="bg-sidebar-accent border-sidebar-border h-32 text-sm" 
                  placeholder="Final feedback or sign-off instructions..."
                  value={supComment}
                  onChange={(e) => setSupComment(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => handleSupAction('Changes Requested')}>Reject (Internal Retake)</Button>
              <Button className="bg-crimson hover:bg-crimson/90 flex-1 font-bold shadow-lg shadow-crimson/20" onClick={() => handleSupAction('Approved')}>Final Sign-off</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
