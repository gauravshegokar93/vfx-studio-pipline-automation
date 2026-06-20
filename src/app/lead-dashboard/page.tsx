
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, UserPlus, MessageSquare, Zap, Film, AlertTriangle, UserCheck, ShieldCheck, Mail, Lock, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LeadDashboardPage() {
  const { tasks, shots, currentUser, assignTaskArtist, leadReviewTask, users, userCredentials, updateUserCredentials } = useLuminaStore();
  
  // Filter context
  const teamMembers = users.filter(u => u.leadId === currentUser?.id || (u.departmentId === currentUser?.departmentId && u.role === 'Artist'));
  const leadTasks = tasks.filter(t => t.leadId === currentUser?.id || t.pipelineStep === 'Comp'); 

  const getShotName = (shotId: string) => shots.find(s => s.id === shotId)?.shotCode || "N/A";

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState('');

  // Profile Drawer State
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [selectedArtistProfile, setSelectedArtistProfile] = useState<any>(null);
  const [newTempPass, setNewTempPass] = useState('');

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
    toast({ title: action === 'Approved' ? "Task Approved" : "Changes Requested", description: `${getShotName(selectedTaskForReview.shotId)} status updated.` });
  };

  const handleOpenProfile = (artist: any) => {
    setSelectedArtistProfile(artist);
    setNewTempPass('');
    setProfileDrawerOpen(true);
  };

  const handleResetTeamPass = () => {
    if (!selectedArtistProfile || !newTempPass) return;
    const cred = userCredentials.find(c => c.userId === selectedArtistProfile.id);
    updateUserCredentials(selectedArtistProfile.id, cred?.username || '', newTempPass);
    toast({ title: "Credential Update", description: `Security profile for ${selectedArtistProfile.name} synchronized.` });
    setNewTempPass('');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-8 space-y-8 pb-20">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lead Assignment Center</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Team Control Hub</h1>
              <p className="text-muted-foreground">Orchestrating artist allocation and technical QC for your reporting group.</p>
            </div>
            <CreateTaskDialog />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all"><Users className="w-12 h-12" /></div>
               <p className="text-xs font-bold text-muted-foreground uppercase">Managed Artists</p>
               <h3 className="text-3xl font-headline text-white mt-1">{teamMembers.length}</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all"><Clock className="w-12 h-12" /></div>
               <p className="text-xs font-bold text-muted-foreground uppercase">Unassigned Bids</p>
               <h3 className="text-3xl font-headline text-yellow-500 mt-1">{stats.pendingAssignment}</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all"><ShieldCheck className="w-12 h-12" /></div>
               <p className="text-xs font-bold text-muted-foreground uppercase">QC Queue</p>
               <h3 className="text-3xl font-headline text-accent mt-1">{stats.pendingReview}</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all"><UserCheck className="w-12 h-12 text-green-500" /></div>
               <p className="text-xs font-bold text-muted-foreground uppercase">Team Health</p>
               <h3 className="text-3xl font-headline text-green-500 mt-1">Stable</h3>
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
                      <TableHead>Task Status</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border hover:bg-sidebar-accent/20 transition-colors h-20">
                        <TableCell className="pl-6">
                          <p className="font-bold text-white text-lg font-mono tracking-tighter">{getShotName(task.shotId)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{task.taskName}</p>
                        </TableCell>
                        <TableCell>
                           <Badge className={cn(
                             "text-[10px] uppercase font-bold",
                             task.status === 'Approved' ? "bg-green-500/20 text-green-500" : 
                             task.status === 'Pending Review' ? "bg-accent/20 text-accent" : "bg-sidebar-accent text-muted-foreground"
                           )}>{task.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {task.assignedArtistId ? (
                            <div className="flex items-center gap-2 cursor-pointer hover:text-crimson transition-colors" onClick={() => handleOpenProfile(teamMembers.find(m => m.id === task.assignedArtistId))}>
                              <div className="w-7 h-7 rounded-full bg-crimson/20 text-crimson text-[8px] flex items-center justify-center font-bold">
                                {teamMembers.find(m => m.id === task.assignedArtistId)?.name.charAt(0) || 'A'}
                              </div>
                              <span className="text-sm text-white font-medium">{teamMembers.find(m => m.id === task.assignedArtistId)?.name || 'Unknown'}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-yellow-500/80 border-yellow-500/20 italic text-[10px]">Unassigned</Badge>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            {task.status === 'Pending Review' && (
                              <Button size="sm" className="bg-accent" onClick={() => handleOpenReview(task)}><MessageSquare className="w-4 h-4 mr-2" /> QC</Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild><Button size="sm" variant="outline" className="border-sidebar-border hover:text-crimson">Allocate</Button></DialogTrigger>
                              <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-2xl">
                                <DialogHeader><DialogTitle className="font-headline">Assign Artist: {getShotName(task.shotId)}</DialogTitle></DialogHeader>
                                <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                  {teamMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-4 bg-sidebar-accent/50 rounded-xl border border-sidebar-border hover:border-crimson cursor-pointer group" onClick={() => { assignTaskArtist(task.id, member.id); toast({ title: "Task Assigned", description: `${member.name} assigned to shot.` }); }}>
                                       <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-lg bg-sidebar border border-sidebar-border flex items-center justify-center font-bold text-crimson group-hover:bg-crimson group-hover:text-white transition-colors">{member.name.charAt(0)}</div>
                                          <div><p className="font-bold text-white text-sm">{member.name}</p><p className="text-[10px] text-muted-foreground uppercase">{member.employeeCode}</p></div>
                                       </div>
                                       <Button size="sm" variant="ghost" className="group-hover:text-crimson">Assign</Button>
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

            <div className="space-y-6">
              <Card className="bg-card border-none shadow-2xl p-6">
                <CardHeader className="p-0 mb-6"><CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">My Team Performance <Users className="w-4 h-4" /></CardTitle></CardHeader>
                <div className="space-y-8">
                  {teamMembers.map(member => {
                    const memberTasks = tasks.filter(t => t.assignedArtistId === member.id);
                    const util = Math.round((memberTasks.reduce((acc, t) => acc + t.bidHours, 0) / 40) * 100);
                    return (
                      <div key={member.id} className="space-y-3 cursor-pointer group" onClick={() => handleOpenProfile(member)}>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white font-bold group-hover:text-crimson transition-colors">{member.name}</span>
                          <span className={cn("font-bold", util > 90 ? "text-red-500" : "text-green-500")}>{util}% Load</span>
                        </div>
                        <Progress value={util} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="bg-crimson/5 border border-crimson/20 p-6 flex gap-4"><Clock className="text-crimson w-6 h-6 shrink-0" /><div><h4 className="text-sm font-bold text-white mb-2">Production Alert</h4><p className="text-xs text-muted-foreground leading-relaxed">You have {stats.pendingAssignment} shots in the pool waiting for artist allocation.</p></div></Card>
            </div>
          </div>
        </div>

        {/* Lead Review Dialog */}
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white max-xl">
            <DialogHeader><DialogTitle className="text-2xl font-headline flex items-center gap-3"><MessageSquare className="text-accent" /> Technical QC: {getShotName(selectedTaskForReview?.shotId || "")}</DialogTitle></DialogHeader>
            <div className="space-y-6 py-6">
              <div className="bg-sidebar-accent/50 p-5 rounded-xl border border-sidebar-border"><p className="text-[10px] font-bold text-muted-foreground uppercase mb-3 tracking-widest">Artist Notes</p><p className="text-sm italic text-white leading-relaxed">"{selectedTaskForReview?.latestArtistComment || "None"}"</p></div>
              <div className="space-y-3"><label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Feedback / Retake Instructions</label><Textarea className="bg-sidebar-accent border-sidebar-border h-40 text-sm focus:ring-accent" placeholder="Enter technical feedback..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} /></div>
            </div>
            <DialogFooter className="flex gap-4"><Button variant="outline" className="flex-1 h-12" onClick={() => handleReviewAction('Changes Requested')}>Retake (Artist)</Button><Button className="bg-accent hover:bg-accent/90 flex-1 h-12 font-bold shadow-lg shadow-accent/20" onClick={() => handleReviewAction('Approved')}>Promote to Supervisor</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Artist Profile Drawer */}
        <Sheet open={profileDrawerOpen} onOpenChange={setProfileDrawerOpen}>
          <SheetContent className="bg-sidebar border-sidebar-border text-white sm:max-w-md">
            <SheetHeader className="border-b border-sidebar-border pb-6">
              <SheetTitle className="text-2xl font-headline flex items-center gap-3"><ShieldCheck className="text-crimson" /> Staff Identity Profile</SheetTitle>
              <SheetDescription className="text-muted-foreground">Managing access and status for {selectedArtistProfile?.name}.</SheetDescription>
            </SheetHeader>
            
            {selectedArtistProfile && (
              <div className="py-8 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-crimson/10 border border-crimson/20 flex items-center justify-center text-3xl font-bold text-crimson">{selectedArtistProfile.name.charAt(0)}</div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white">{selectedArtistProfile.name}</h3>
                    <Badge variant="outline" className="bg-sidebar-accent text-[8px] uppercase">{selectedArtistProfile.role}</Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1"><Mail className="w-3 h-3" /> {selectedArtistProfile.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-sidebar-accent/30 rounded-xl border border-sidebar-border"><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Emp Code</p><p className="text-sm font-mono text-white">{selectedArtistProfile.employeeCode}</p></div>
                   <div className="p-4 bg-sidebar-accent/30 rounded-xl border border-sidebar-border"><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Status</p><Badge className={cn("text-[8px] uppercase", selectedArtistProfile.isActive ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>{selectedArtistProfile.isActive ? 'Active' : 'Inactive'}</Badge></div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Lock className="w-3 h-3 text-crimson" /> Team Security Support</h4>
                  <div className="p-6 bg-crimson/5 border border-crimson/20 rounded-xl space-y-6">
                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-white">SSoT Username</span><span className="text-xs font-mono text-crimson">{userCredentials.find(c => c.userId === selectedArtistProfile.id)?.username || '--'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-white">Current Temp Pass</span><span className="text-xs font-mono text-muted-foreground italic">"{userCredentials.find(c => c.userId === selectedArtistProfile.id)?.tempPassword || 'SECURED'}"</span></div>
                    
                    <div className="space-y-3 pt-2 border-t border-crimson/10">
                      <Label className="text-xs text-white">Issue New Temporary Password</Label>
                      <div className="flex gap-2">
                        <Input className="bg-sidebar border-sidebar-border h-9 text-xs" placeholder="e.g. NewPass123!" value={newTempPass} onChange={(e) => setNewTempPass(e.target.value)} />
                        <Button className="bg-crimson h-9 px-4 text-xs font-bold" onClick={handleResetTeamPass}>Reset</Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground italic flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> Forces a secure password change on next login.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><History className="w-3 h-3" /> Recent Activity</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-sidebar-accent/20 rounded-lg text-[10px] flex justify-between">
                       <span className="text-white">Profile Synchronized to SSoT</span>
                       <span className="text-muted-foreground">Today</span>
                    </div>
                    <div className="p-3 bg-sidebar-accent/20 rounded-lg text-[10px] flex justify-between">
                       <span className="text-white">Credentials Exported</span>
                       <span className="text-muted-foreground">2h ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}
