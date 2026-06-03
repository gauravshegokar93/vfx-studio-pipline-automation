
"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, CheckCircle2, Clock, AlertCircle, UserPlus, MessageSquare, Gauge, Zap } from 'lucide-react';
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
  const { tasks, currentUser, assignTaskArtist, leadReviewTask } = useLuminaStore();
  
  // Simulated team filtering based on department
  const leadTasks = tasks.filter(t => t.pipelineStep === 'Comp'); // Mocking lead for Comp
  const teamMembers = [
    { id: 'u3', name: 'Alex Artist', role: 'Senior Artist', avatar: 'AA', capacity: 40, utilized: 32 },
    { id: 'u4', name: 'Zoe Paint', role: 'Paint Artist', avatar: 'ZP', capacity: 40, utilized: 38 },
    { id: 'u5', name: 'Ben Roto', role: 'Roto Artist', avatar: 'BR', capacity: 40, utilized: 20 },
  ];

  // Review State
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
      description: `Task for ${selectedTaskForReview.shotId} has been updated.`
    });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">Lead Control Center</h1>
              <p className="text-muted-foreground">Overseeing team tasks, capacity, and utilization.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card border-none p-6">
              <p className="text-xs font-bold text-muted-foreground uppercase">Team Utilization</p>
              <div className="flex justify-between items-end mt-1">
                <h3 className={cn("text-3xl font-headline", teamUtilization > 90 ? "text-red-500" : "text-green-500")}>{teamUtilization}%</h3>
                <Gauge className="w-5 h-5 mb-1" />
              </div>
            </Card>
            <Card className="bg-card border-none p-6">
              <p className="text-xs font-bold text-muted-foreground uppercase">Team Capacity</p>
              <h3 className="text-3xl font-headline text-blue-500 mt-1">120h/wk</h3>
            </Card>
            <Card className="bg-card border-none p-6">
              <p className="text-xs font-bold text-muted-foreground uppercase">Active Tasks</p>
              <h3 className="text-3xl font-headline text-white mt-1">{stats.active}</h3>
            </Card>
            <Card className="bg-card border-none p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Team Productivity</p>
                  <h3 className="text-3xl font-headline text-green-500 mt-1">104%</h3>
                </div>
                <Zap className="text-green-500 w-5 h-5" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Clock className="text-crimson w-5 h-5" /> Team Queue
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border">
                      <TableHead className="pl-6">Shot</TableHead>
                      <TableHead>Bid / Utilized</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border h-16">
                        <TableCell className="pl-6 text-white font-bold">{task.shotId}</TableCell>
                        <TableCell className="text-xs text-white">
                          <span className="font-mono">{task.bidHours}h / {task.spentHours}h</span>
                        </TableCell>
                        <TableCell>
                          {task.assignedArtistId ? (
                            <span className="text-xs text-white">Artist {task.assignedArtistId}</span>
                          ) : (
                            <span className="text-xs text-yellow-500 italic">Unassigned</span>
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
                                  <DialogTitle>Assign Artist to {task.shotId}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-4">
                                  {teamMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-sidebar-accent rounded-lg">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-crimson rounded-full flex items-center justify-center text-xs font-bold">{member.avatar}</div>
                                        <div>
                                          <p className="text-sm font-bold">{member.name}</p>
                                          <p className="text-[10px] text-muted-foreground">{member.role}</p>
                                        </div>
                                      </div>
                                      <Button size="sm" onClick={() => {
                                        assignTaskArtist(task.id, member.id);
                                        toast({ title: "Artist Assigned", description: `${member.name} is now on ${task.shotId}` });
                                      }}>Assign</Button>
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

            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Users className="text-blue-500 w-5 h-5" /> Team Utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {teamMembers.map(member => {
                  const util = Math.round((member.utilized / member.capacity) * 100);
                  return (
                    <div key={member.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white font-bold">{member.name}</span>
                        <span className={cn("font-bold", util > 90 ? "text-red-500" : "text-green-500")}>{util}% Utilized</span>
                      </div>
                      <Progress value={util} className="h-1.5" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Bid: {member.utilized}h</span>
                        <span>Capacity: {member.capacity}h</span>
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
              <DialogTitle>Lead Review: {selectedTaskForReview?.shotId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-sidebar-accent p-3 rounded-lg border border-sidebar-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Artist Comment</p>
                <p className="text-xs italic">"{selectedTaskForReview?.latestArtistComment || "No artist notes."}"</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Feedback / Instructions</label>
                <Textarea 
                  className="bg-sidebar-accent border-sidebar-border h-32" 
                  placeholder="Enter feedback for the artist..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => handleReviewAction('Changes Requested')}>Request Changes</Button>
              <Button className="bg-green-600 hover:bg-green-700 flex-1" onClick={() => handleReviewAction('Approved')}>Approve to Supervisor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
