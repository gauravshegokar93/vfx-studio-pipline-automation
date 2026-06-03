
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, UserPlus, MessageSquare, Gauge, Zap, Film } from 'lucide-react';
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

export default function LeadDashboardPage() {
  const { tasks, shots, currentUser, assignTaskArtist, leadReviewTask } = useLuminaStore();
  
  // Simulated team filtering based on department (Comp Lead mock)
  const leadTasks = tasks.filter(t => t.pipelineStep === 'Comp');
  const teamMembers = [
    { id: 'u3', name: 'Alex Artist', role: 'Senior Artist', avatar: 'AA', capacity: 40, utilized: 32 },
    { id: 'u4', name: 'Zoe Paint', role: 'Paint Artist', avatar: 'ZP', capacity: 40, utilized: 38 },
    { id: 'u5', name: 'Ben Roto', role: 'Roto Artist', avatar: 'BR', capacity: 40, utilized: 20 },
  ];

  const getShotName = (shotId: string) => shots.find(s => s.id === shotId)?.shotCode || "N/A";

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState('');

  const stats = {
    total: leadTasks.length,
    pending: leadTasks.filter(t => t.status === 'Assigned' && !t.assignedArtistId).length,
    active: leadTasks.filter(t => t.assignedArtistId && t.status !== 'Approved').length,
    review: leadTasks.filter(t => t.status === 'Pending Review' && t.reviewStatus !== 'Approved').length,
  };

  const teamUtilization = Math.round((teamMembers.reduce((acc, m) => acc + m.utilized, 0) / teamMembers.reduce((acc, m) => acc + m.capacity, 0)) * 100);

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
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lead Operations Center</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Team Control Hub</h1>
              <p className="text-muted-foreground">Managing shot allocation and team productivity.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card border-none p-6 shadow-xl">
              <p className="text-xs font-bold text-muted-foreground uppercase">Team Utilization</p>
              <div className="flex justify-between items-end mt-1">
                <h3 className={cn("text-3xl font-headline", teamUtilization > 90 ? "text-red-500" : "text-green-500")}>{teamUtilization}%</h3>
                <Gauge className="w-5 h-5 mb-1" />
              </div>
            </Card>
            <Card className="bg-card border-none p-6 shadow-xl">
              <p className="text-xs font-bold text-muted-foreground uppercase">Active Shifts</p>
              <h3 className="text-3xl font-headline text-white mt-1">{teamMembers.length} Artists</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-xl">
              <p className="text-xs font-bold text-muted-foreground uppercase">Total Shots</p>
              <h3 className="text-3xl font-headline text-blue-500 mt-1">{new Set(leadTasks.map(t => t.shotId)).size}</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Review Backlog</p>
                  <h3 className="text-3xl font-headline text-accent mt-1">{stats.review}</h3>
                </div>
                <Clock className="text-accent w-5 h-5" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-card border-none shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Film className="text-crimson w-5 h-5" /> Shot Allocation Queue
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border">
                      <TableHead className="pl-6">Shot Name</TableHead>
                      <TableHead>Bid / Spent</TableHead>
                      <TableHead>Assigned Artist</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border h-16 hover:bg-sidebar-accent/30 transition-colors">
                        <TableCell className="pl-6 text-white font-bold">{getShotName(task.shotId)}</TableCell>
                        <TableCell className="text-xs text-white font-mono">
                          {task.bidHours}h / {task.spentHours}h
                        </TableCell>
                        <TableCell>
                          {task.assignedArtistId ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-sidebar-accent rounded-full text-[8px] flex items-center justify-center">AR</div>
                              <span className="text-xs text-white">Artist {task.assignedArtistId}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-yellow-500/60 italic">Waiting for allocation</span>
                          )}
                        </TableCell>
                        <TableCell>
                           <Badge className={cn(
                             "text-[10px] uppercase font-bold",
                             task.status === 'Approved' ? "bg-green-500/20 text-green-500" : 
                             task.status === 'Pending Review' ? "bg-accent/20 text-accent" : "bg-sidebar-accent text-muted-foreground"
                           )}>{task.status}</Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            {task.status === 'Pending Review' && (
                              <Button size="sm" variant="ghost" className="text-accent hover:bg-accent/10" onClick={() => handleOpenReview(task)}>
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="hover:text-crimson">
                                  <UserPlus className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-sidebar border-sidebar-border text-white">
                                <DialogHeader>
                                  <DialogTitle>Assign Artist: {getShotName(task.shotId)}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-4">
                                  {teamMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-sidebar-accent rounded-lg border border-sidebar-border hover:border-crimson cursor-pointer transition-colors" onClick={() => {
                                      assignTaskArtist(task.id, member.id);
                                      toast({ title: "Artist Assigned", description: `${member.name} is now working on ${getShotName(task.shotId)}` });
                                    }}>
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-crimson rounded-full flex items-center justify-center text-xs font-bold">{member.avatar}</div>
                                        <div>
                                          <p className="text-sm font-bold">{member.name}</p>
                                          <p className="text-[10px] text-muted-foreground">{member.role}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[10px] font-bold text-white">{Math.round((member.utilized / member.capacity) * 100)}% Utilized</p>
                                        <Progress value={(member.utilized / member.capacity) * 100} className="h-1 w-20" />
                                      </div>
                                    </div>
                                  ))}
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

            <Card className="bg-card border-none shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Users className="text-blue-500 w-5 h-5" /> Team Load Balancer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {teamMembers.map(member => {
                  const util = Math.round((member.utilized / member.capacity) * 100);
                  const memberTasks = leadTasks.filter(t => t.assignedArtistId === member.id);
                  return (
                    <div key={member.id} className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{member.name}</span>
                          <Badge variant="outline" className="text-[8px] h-4">{memberTasks.length} Shots</Badge>
                        </div>
                        <span className={cn("font-bold", util > 90 ? "text-red-500" : "text-green-500")}>{util}% Cap</span>
                      </div>
                      <Progress value={util} className={cn("h-2", util > 90 ? "bg-red-500/20" : "bg-sidebar-accent")} />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>Bid: {member.utilized}h</span>
                        <span>Avail: {member.capacity}h</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lead Review Dialog */}
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white">
            <DialogHeader>
              <DialogTitle>Lead QC: {getShotName(selectedTaskForReview?.shotId || "")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-sidebar-accent p-4 rounded-lg border border-sidebar-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Artist Submission Notes</p>
                <p className="text-xs italic text-white">"{selectedTaskForReview?.latestArtistComment || "No production notes provided by artist."}"</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Feedback / Retake Instructions</label>
                <Textarea 
                  className="bg-sidebar-accent border-sidebar-border h-32 text-sm" 
                  placeholder="Enter detailed feedback for the artist..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => handleReviewAction('Changes Requested')}>Retake (Artist)</Button>
              <Button className="bg-green-600 hover:bg-green-700 flex-1 font-bold" onClick={() => handleReviewAction('Approved')}>Approve to Supervisor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
