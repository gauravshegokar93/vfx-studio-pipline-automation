
"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { taskService } from '@/services/taskService';
import { userService } from '@/services/userService';
import { Task, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutList, UserPlus, Search, Filter, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

export default function DepartmentQueuePage() {
  const [queue, setQueue] = useState<Task[]>([]);
  const [artists, setArtists] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [q, a] = await Promise.all([
        taskService.getDepartmentQueue('dept-comp'),
        userService.getDepartmentStaff('dept-comp')
      ]);
      setQueue(q);
      setArtists(a);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">Department Queue</h1>
              <p className="text-muted-foreground">Manage task assignments and artist capacity for <span className="text-crimson font-bold uppercase">Compositing</span>.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input placeholder="Search queue..." className="bg-sidebar-accent border-none rounded-md py-2 pl-9 pr-4 text-sm outline-none text-white w-64" />
              </div>
              <Button variant="outline" className="border-sidebar-border"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <Card className="bg-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <LayoutList className="text-crimson w-5 h-5" /> Pending Assignment
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border h-12">
                      <TableHead className="pl-6">Shot</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Bid</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="pr-6 text-right">Assign</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? [1,2,3].map(i => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 bg-sidebar-accent" /></TableCell></TableRow>) : queue.map(task => (
                      <TableRow key={task.id} className="border-sidebar-border hover:bg-sidebar-accent/30 h-16 transition-colors">
                        <TableCell className="pl-6 font-bold text-white">{task.shotId}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-crimson/10 text-crimson border-crimson/20">{task.pipelineStep}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{task.bidHours}h</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[10px] font-bold uppercase",
                            task.priority === 'High' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                          )}>{task.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-white text-sm">{task.dueDate}</TableCell>
                        <TableCell className="pr-6 text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="hover:bg-crimson/10 hover:text-crimson">
                                <UserPlus className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-sidebar border-sidebar-border text-white">
                              <DialogHeader>
                                <DialogTitle>Assign Task: {task.shotId} - {task.taskName}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <p className="text-sm text-muted-foreground">Select an artist from the Compositing department pool.</p>
                                <div className="space-y-2">
                                  {artists.map(artist => (
                                    <div key={artist.id} className="flex items-center justify-between p-3 rounded-lg bg-sidebar-accent border border-sidebar-border hover:border-crimson transition-all cursor-pointer">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-crimson flex items-center justify-center text-xs font-bold">{artist.name.charAt(0)}</div>
                                        <div>
                                          <p className="text-sm font-bold">{artist.name}</p>
                                          <p className="text-[10px] text-muted-foreground uppercase">{artist.role}</p>
                                        </div>
                                      </div>
                                      <Button size="sm" className="bg-crimson">Assign</Button>
                                    </div>
                                  ))}
                                </div>
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

            <div className="space-y-8">
              <Card className="bg-card border-none shadow-xl">
                <CardHeader><CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Resource Capacity</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {artists.map(artist => (
                    <div key={artist.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white font-bold">{artist.name}</span>
                        <span className="text-muted-foreground">85% Utilization</span>
                      </div>
                      <div className="h-1.5 w-full bg-sidebar-accent rounded-full overflow-hidden">
                        <div className="h-full bg-crimson" style={{ width: '85%' }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-yellow-500/5 border border-yellow-500/20">
                <CardContent className="p-4 flex gap-3">
                  <AlertCircle className="text-yellow-500 w-5 h-5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Bottleneck Alert</h4>
                    <p className="text-xs text-muted-foreground">3 High priority shots are unassigned in SEQ_010. Delivery at risk.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
