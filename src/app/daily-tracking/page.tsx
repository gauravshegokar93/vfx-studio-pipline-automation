
"use client";

import React from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileSpreadsheet, Search, Filter, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DailyTrackingPage() {
  const { tasks, shots } = useLuminaStore();

  const getShotCode = (shotId: string) => shots.find(s => s.id === shotId)?.shotCode || 'N/A';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Live SSoT Tracking</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Daily Production Summary</h1>
              <p className="text-muted-foreground">Automated tracking sheet generated from real-time artist updates.</p>
            </div>
          </div>

          <Card className="bg-card border-none shadow-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-sidebar-accent/50">
                <TableRow className="border-sidebar-border h-12">
                  <TableHead className="pl-6">Shot</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Internal ETA</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="pr-6">Latest Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length > 0 ? tasks.map(task => (
                  <TableRow key={task.id} className="border-sidebar-border hover:bg-sidebar-accent/30 transition-colors h-16">
                    <TableCell className="pl-6 font-bold text-white">{getShotCode(task.shotId)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-crimson border-crimson/20">{task.pipelineStep}</Badge></TableCell>
                    <TableCell className="text-xs text-white">Artist {task.assignedArtistId || 'Unassigned'}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[10px] uppercase font-bold",
                        task.status === 'Approved' ? "bg-green-500/20 text-green-500" :
                        task.status === 'Retake' ? "bg-red-500/20 text-red-500" : "bg-sidebar-accent text-muted-foreground"
                      )}>{task.status}</Badge>
                    </TableCell>
                    <TableCell className="w-48">
                      <div className="flex items-center gap-2">
                        <Progress value={task.progress} className="h-1.5" />
                        <span className="text-[10px] font-mono text-white">{task.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{task.internalEta}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        "text-[10px] uppercase",
                        task.reviewStatus === 'Approved' ? "text-green-500" : "text-yellow-500"
                      )}>{task.reviewStatus}</Badge>
                    </TableCell>
                    <TableCell className="pr-6 max-w-[200px] truncate text-[10px] text-muted-foreground italic">
                      {task.latestArtistComment || "No updates yet"}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-muted-foreground">
                      No production data available. Bootstrap the studio first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  );
}
