
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, CheckCircle2, Clock, AlertCircle, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

export default function LeadDashboardPage() {
  const { tasks, currentRole, currentUser, assignTaskArtist } = useLuminaStore();
  
  // Lead-specific filtering: Only tasks assigned to this lead
  const leadTasks = tasks.filter(t => t.leadId === 'l1'); // Using l1 as current lead ID
  const teamMembers = [
    { id: 'u3', name: 'Alex Artist', role: 'Senior Artist', avatar: 'AA' },
    { id: 'u4', name: 'Zoe Paint', role: 'Paint Artist', avatar: 'ZP' },
    { id: 'u5', name: 'Ben Roto', role: 'Roto Artist', avatar: 'BR' },
  ];

  const stats = {
    total: leadTasks.length,
    pending: leadTasks.filter(t => t.status === 'Assigned' && !t.assignedArtistId).length,
    active: leadTasks.filter(t => t.assignedArtistId && t.status !== 'Approved').length,
    completed: leadTasks.filter(t => t.status === 'Approved').length,
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div>
            <h1 className="text-4xl font-headline text-white mb-2">Lead Control Center</h1>
            <p className="text-muted-foreground">Overseeing team tasks and artist assignments.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card border-none p-6">
              <p className="text-xs font-bold text-muted-foreground uppercase">Managed Tasks</p>
              <h3 className="text-3xl font-headline text-white mt-1">{stats.total}</h3>
            </Card>
            <Card className="bg-card border-none p-6">
              <p className="text-xs font-bold text-muted-foreground uppercase">Need Artist</p>
              <h3 className="text-3xl font-headline text-yellow-500 mt-1">{stats.pending}</h3>
            </Card>
            <Card className="bg-card border-none p-6">
              <p className="text-xs font-bold text-muted-foreground uppercase">Active</p>
              <h3 className="text-3xl font-headline text-blue-500 mt-1">{stats.active}</h3>
            </Card>
            <Card className="bg-card border-none p-6">
              <p className="text-xs font-bold text-muted-foreground uppercase">Approved</p>
              <h3 className="text-3xl font-headline text-green-500 mt-1">{stats.completed}</h3>
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
                      <TableHead>Task</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadTasks.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border h-16">
                        <TableCell className="pl-6 text-white font-bold">{task.shotId}</TableCell>
                        <TableCell><Badge variant="outline" className="text-crimson">{task.pipelineStep}</Badge></TableCell>
                        <TableCell>
                          {task.assignedArtistId ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center text-[8px] font-bold">AR</div>
                              <span className="text-xs text-white">Artist {task.assignedArtistId}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-yellow-500 italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                           <Badge className={cn(
                             "text-[10px] uppercase font-bold",
                             task.status === 'Approved' ? "bg-green-500/20 text-green-500" : "bg-sidebar-accent text-muted-foreground"
                           )}>{task.status}</Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
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
                                    <Button size="sm" onClick={() => assignTaskArtist(task.id, member.id)}>Assign</Button>
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
            </div>

            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Users className="text-blue-500 w-5 h-5" /> Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamMembers.map(member => {
                  const activeTasks = leadTasks.filter(t => t.assignedArtistId === member.id).length;
                  return (
                    <div key={member.id} className="p-4 bg-sidebar-accent rounded-lg border border-sidebar-border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-bold">{member.name}</span>
                        <Badge variant="outline" className="text-[10px]">{activeTasks} Active</Badge>
                      </div>
                      <div className="h-1.5 w-full bg-black rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(activeTasks / 5) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
