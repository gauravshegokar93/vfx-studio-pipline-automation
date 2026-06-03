
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutList, UserPlus, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
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
  const { tasks, assignTaskLead, supervisorApproveTask } = useLuminaStore();
  
  // Supervisor view: Show all tasks in department that need a Lead or Approval
  const unassignedTasks = tasks.filter(t => t.status === 'Not Started' || !t.leadId);
  const reviewTasks = tasks.filter(t => t.status === 'Pending Review' && t.reviewStatus === 'Approved');

  const leads = [
    { id: 'l1', name: 'Kyle Reese', department: 'Comp', activeProjects: 2 },
    { id: 'l2', name: 'John Matrix', department: 'Comp', activeProjects: 1 },
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
      title: action === 'Approved' ? "Final Approval Complete" : "Rejected for Retake",
      description: `${selectedTaskForSupReview.shotId} status updated globally.`
    });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">Supervisor Hub</h1>
              <p className="text-muted-foreground">Assigning Leads and final quality approval.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Allocation Section */}
              <Card className="bg-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <LayoutList className="text-crimson w-5 h-5" /> Pending Lead Allocation
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border h-12">
                      <TableHead className="pl-6">Shot</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="pr-6 text-right">Assign Lead</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unassignedTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border hover:bg-sidebar-accent/30 h-16 transition-colors">
                        <TableCell className="pl-6 font-bold text-white">{task.shotId}</TableCell>
                        <TableCell><Badge variant="outline" className="text-crimson">{task.pipelineStep}</Badge></TableCell>
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
                                <ShieldCheck className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-sidebar border-sidebar-border text-white">
                              <DialogHeader>
                                <DialogTitle>Assign Lead for {task.shotId}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 py-4">
                                {leads.map(lead => (
                                  <div key={lead.id} className="flex items-center justify-between p-3 bg-sidebar-accent rounded-lg border border-sidebar-border hover:border-crimson cursor-pointer">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-crimson rounded-lg flex items-center justify-center text-[10px] font-bold">LD</div>
                                      <div>
                                        <p className="text-sm font-bold">{lead.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{lead.activeProjects} active projects</p>
                                      </div>
                                    </div>
                                    <Button size="sm" onClick={() => {
                                      assignTaskLead(task.id, lead.id);
                                      toast({ title: "Lead Assigned", description: `${lead.name} is now leading ${task.shotId}` });
                                    }}>Assign</Button>
                                  </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Approval Section */}
              <Card className="bg-card border-none shadow-xl border-l-4 border-accent">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <CheckCircle className="text-accent w-5 h-5" /> Supervisor Approval Queue
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border h-12">
                      <TableHead className="pl-6">Shot</TableHead>
                      <TableHead>Artist / Lead</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="pr-6 text-right">Final Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border h-16">
                        <TableCell className="pl-6 font-bold text-white">{task.shotId}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs text-white">Artist {task.assignedArtistId}</span>
                            <span className="text-[10px] text-muted-foreground">Lead {task.leadId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-40">
                          <Progress value={task.progress} className="h-1 bg-sidebar-accent" />
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={() => handleOpenSupReview(task)}>Review & Approve</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reviewTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">No tasks waiting for final supervisor sign-off.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-card border-none shadow-xl p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">Department Load</h3>
                <div className="space-y-4">
                  {leads.map(lead => (
                    <div key={lead.id} className="space-y-2">
                       <div className="flex justify-between items-center text-xs">
                         <span className="text-white">{lead.name}</span>
                         <span className="text-muted-foreground">{lead.activeProjects * 3} Tasks</span>
                       </div>
                       <Progress value={(lead.activeProjects / 5) * 100} className="h-1" />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-yellow-500/5 border border-yellow-500/20 p-4 flex gap-3">
                <AlertCircle className="text-yellow-500 w-5 h-5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">Approval Warning</h4>
                  <p className="text-[10px] text-muted-foreground">{reviewTasks.length} tasks approved by Leads are waiting for your final verification.</p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Supervisor Final Review Dialog */}
        <Dialog open={supReviewModalOpen} onOpenChange={setSupReviewModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white">
            <DialogHeader>
              <DialogTitle>Final Approval: {selectedTaskForSupReview?.shotId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-sidebar-accent p-3 rounded-lg border border-sidebar-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Artist Note</p>
                  <p className="text-[10px] italic">"{selectedTaskForSupReview?.latestArtistComment || "None"}"</p>
                </div>
                <div className="bg-sidebar-accent p-3 rounded-lg border border-sidebar-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Lead Note</p>
                  <p className="text-[10px] italic">"{selectedTaskForSupReview?.latestLeadComment || "None"}"</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Supervisor Remarks</label>
                <Textarea 
                  className="bg-sidebar-accent border-sidebar-border h-32" 
                  placeholder="Final feedback or approval notes..."
                  value={supComment}
                  onChange={(e) => setSupComment(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => handleSupAction('Changes Requested')}>Reject / Retake</Button>
              <Button className="bg-crimson hover:bg-crimson/90 flex-1 font-bold" onClick={() => handleSupAction('Approved')}>Final Approve</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
