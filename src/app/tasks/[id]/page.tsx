
"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppSidebar } from '@/components/layout/sidebar';
import { taskService } from '@/services/taskService';
import { Task, TimeLog, Version } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  History, 
  Layers, 
  MessageSquare, 
  PlayCircle, 
  ArrowLeft,
  Calendar,
  User,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function TaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (id) {
        const [t, l, v] = await Promise.all([
          taskService.getById(id as string),
          taskService.getTimeLogs(id as string),
          taskService.getVersions(id as string)
        ]);
        setTask(t);
        setLogs(l);
        setVersions(v);
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading || !task) return <div className="p-8"><Skeleton className="h-full w-full bg-sidebar-accent" /></div>;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/tasks"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Workbench</Link>
          </Button>

          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-crimson text-white">{task.pipelineStep}</Badge>
                <h1 className="text-4xl font-headline text-white">{task.shotId} - {task.taskName}</h1>
              </div>
              <p className="text-muted-foreground">Single Source of Truth Tracking ID: <span className="text-white font-mono">{task.id}</span></p>
            </div>
            <div className="flex gap-2">
              <Button className="bg-crimson">Submit New Version</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="bg-card border-none col-span-1">
              <CardHeader><CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Meta Data</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <User className="text-crimson w-4 h-4" />
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Artist</p><p className="text-white text-sm">Sarah Connor</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="text-yellow-500 w-4 h-4" />
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Lead</p><p className="text-white text-sm">Kyle Reese</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Layers className="text-blue-500 w-4 h-4" />
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Supervisor</p><p className="text-white text-sm">John Matrix</p></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-none col-span-3">
              <CardHeader><CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Auto-Calculated Production Analytics</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-4 gap-8">
                <div><p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Client Bid</p><p className="text-3xl font-headline text-white">{task.bidHours}h</p></div>
                <div><p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Actual Logged</p><p className="text-3xl font-headline text-white">{task.spentHours}h</p></div>
                <div><p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Remaining</p><p className="text-3xl font-headline text-white">{task.remainingHours}h</p></div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Productivity</p>
                  <p className={cn(
                    "text-3xl font-headline",
                    task.bidHours >= task.spentHours ? "text-green-500" : "text-yellow-500"
                  )}>
                    {Math.round((task.bidHours / task.spentHours) * 100)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="versions" className="w-full">
            <TabsList className="bg-sidebar border border-sidebar-border">
              <TabsTrigger value="versions"><Layers className="w-4 h-4 mr-2" /> Versions ({versions.length})</TabsTrigger>
              <TabsTrigger value="logs"><History className="w-4 h-4 mr-2" /> Time Logs ({logs.length})</TabsTrigger>
              <TabsTrigger value="comments"><MessageSquare className="w-4 h-4 mr-2" /> Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="versions" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {versions.map(v => (
                  <Card key={v.id} className="bg-card border-none overflow-hidden group">
                    <div className="aspect-video bg-black relative">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <PlayCircle className="w-12 h-12 text-white" />
                      </div>
                      <Badge className="absolute top-2 left-2 bg-black/60">v{v.versionNumber.toString().padStart(3, '0')}</Badge>
                      <Badge className={cn(
                        "absolute bottom-2 right-2",
                        v.reviewStatus === 'Approved' ? "bg-green-500" : v.reviewStatus === 'Retake' ? "bg-red-500" : "bg-yellow-500"
                      )}>{v.reviewStatus}</Badge>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(v.createdAt).toLocaleDateString()}</p>
                      {v.reviewComment && <p className="text-sm text-white italic">&quot;{v.reviewComment}&quot;</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="mt-6">
              <Card className="bg-card border-none">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-sidebar-accent/30">
                      <TableRow className="border-sidebar-border">
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Verified By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map(log => (
                        <TableRow key={log.id} className="border-sidebar-border">
                          <TableCell className="text-white">{new Date(log.startTime).toLocaleString()}</TableCell>
                          <TableCell className="text-white">{log.endTime ? new Date(log.endTime).toLocaleString() : 'Active'}</TableCell>
                          <TableCell className="text-crimson font-bold">{log.totalMinutes} min</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">AUTO-SYSTEM</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
