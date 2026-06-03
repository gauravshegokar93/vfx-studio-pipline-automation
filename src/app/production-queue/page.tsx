"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { taskService } from '@/services/taskService';
import { Task } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Clock, MoreHorizontal, LayoutList } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ProductionQueuePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // In a real app, this would be a global task fetch
      const data = await taskService.getDepartmentQueue('all');
      setTasks(data);
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
              <h1 className="text-4xl font-headline text-white mb-2">Production Queue</h1>
              <p className="text-muted-foreground">Global view of all pipeline tasks across studio departments.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input placeholder="Search production..." className="bg-sidebar-accent border-none rounded-md py-2 pl-9 pr-4 text-sm outline-none text-white w-64" />
              </div>
              <Badge variant="outline" className="border-sidebar-border h-9 px-4 flex items-center gap-2">
                <Filter className="w-3 h-3" /> Filters
              </Badge>
            </div>
          </div>

          <Card className="bg-card border-none shadow-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-sidebar-accent/50">
                <TableRow className="border-sidebar-border h-12">
                  <TableHead className="pl-6">Project / Shot</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bid</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Productivity</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? [1,2,3,4,5].map(i => (
                  <TableRow key={i} className="border-sidebar-border">
                    <TableCell colSpan={9}><Skeleton className="h-10 w-full bg-sidebar-accent" /></TableCell>
                  </TableRow>
                )) : tasks.map(task => {
                  const productivity = task.spentHours > 0 ? Math.round((task.bidHours / task.spentHours) * 100) : 100;
                  return (
                    <TableRow key={task.id} className="border-sidebar-border hover:bg-sidebar-accent/30 transition-colors h-16">
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="text-xs text-crimson font-bold uppercase tracking-tighter">NGHT</span>
                          <span className="text-white font-bold">{task.shotId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-sidebar-accent border-none">{task.pipelineStep}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center text-[8px] font-bold">JD</div>
                          <span className="text-sm text-white">John Doe</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "text-[10px] font-bold uppercase",
                          task.status === 'In Progress' ? "bg-blue-500/20 text-blue-500" :
                          task.status === 'Pending Review' ? "bg-yellow-500/20 text-yellow-500" :
                          task.status === 'Approved' ? "bg-green-500/20 text-green-500" :
                          "bg-sidebar-accent text-muted-foreground"
                        )}>{task.status}</Badge>
                      </TableCell>
                      <TableCell className="text-white">{task.bidHours}h</TableCell>
                      <TableCell className="text-white">{task.spentHours}h</TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-bold",
                          productivity < 100 ? "text-red-500" : "text-green-500"
                        )}>{productivity}%</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{task.dueDate}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground ml-auto cursor-pointer" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  );
}
