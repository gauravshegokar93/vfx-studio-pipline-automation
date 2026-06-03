
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutList, UserPlus, Search, Filter, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

export default function DepartmentQueuePage() {
  const { tasks, assignTaskLead } = useLuminaStore();
  
  // Supervisor view: Show all tasks in department that need a Lead
  const unassignedTasks = tasks.filter(t => t.status === 'Not Started' || !t.leadId);
  const leads = [
    { id: 'l1', name: 'Kyle Reese', department: 'Comp', activeProjects: 2 },
    { id: 'l2', name: 'John Matrix', department: 'Comp', activeProjects: 1 },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">Supervisor Queue</h1>
              <p className="text-muted-foreground">Assigning Leads and managing departmental throughput.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="bg-card border-none lg:col-span-2 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <LayoutList className="text-crimson w-5 h-5" /> Pending Lead Assignment
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader className="bg-sidebar-accent/50">
                  <TableRow className="border-sidebar-border h-12">
                    <TableHead className="pl-6">Shot</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Bid</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="pr-6 text-right">Assign Lead</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassignedTasks.map(task => (
                    <TableRow key={task.id} className="border-sidebar-border hover:bg-sidebar-accent/30 h-16 transition-colors">
                      <TableCell className="pl-6 font-bold text-white">{task.shotId}</TableCell>
                      <TableCell><Badge variant="outline" className="text-crimson">{task.pipelineStep}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{task.bidHours}h</TableCell>
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
                                  <Button size="sm" onClick={() => assignTaskLead(task.id, lead.id)}>Assign</Button>
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

            <div className="space-y-6">
              <Card className="bg-card border-none shadow-xl p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">Lead Workload</h3>
                <div className="space-y-4">
                  {leads.map(lead => (
                    <div key={lead.id} className="space-y-2">
                       <div className="flex justify-between items-center text-xs">
                         <span className="text-white">{lead.name}</span>
                         <span className="text-muted-foreground">{lead.activeProjects * 3} Tasks</span>
                       </div>
                       <div className="h-1 w-full bg-sidebar-accent rounded-full">
                         <div className="h-full bg-crimson rounded-full" style={{ width: `${(lead.activeProjects / 5) * 100}%` }} />
                       </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-yellow-500/5 border border-yellow-500/20 p-4 flex gap-3">
                <AlertCircle className="text-yellow-500 w-5 h-5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">Queue Alert</h4>
                  <p className="text-[10px] text-muted-foreground">{unassignedTasks.length} tasks awaiting Lead assignment in this cycle.</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
