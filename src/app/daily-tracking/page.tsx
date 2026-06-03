
"use client";

import React from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileSpreadsheet, Search, Filter, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DailyTrackingPage() {
  const { tasks, shots } = useLuminaStore();

  const getShotName = (shotId: string) => shots.find(s => s.id === shotId)?.shotCode || 'N/A';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Live SSoT Production Summary</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Daily Shot Progress</h1>
              <p className="text-muted-foreground">Automated tracking engine replacing manual Excel management.</p>
            </div>
          </div>

          <Card className="bg-card border-none shadow-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-sidebar-accent/50">
                <TableRow className="border-sidebar-border h-14">
                  <TableHead className="pl-6">Shot Name</TableHead>
                  <TableHead>Pipeline Step</TableHead>
                  <TableHead>Artist / Lead</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Internal ETA</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="pr-6">Latest Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length > 0 ? tasks.map(task => (
                  <TableRow key={task.id} className="border-sidebar-border hover:bg-sidebar-accent/30 transition-colors h-20">
                    <TableCell className="pl-6 font-bold text-white text-lg">{getShotName(task.shotId)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-crimson border-crimson/20 uppercase text-[10px]">{task.pipelineStep}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-col text-[10px]">
                        <span className="text-white font-bold">A: {task.assignedArtistId || 'Unassigned'}</span>
                        <span className="text-muted-foreground">L: {task.leadId || 'Unassigned'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[10px] uppercase font-bold",
                        task.status === 'Approved' ? "bg-green-500/20 text-green-500" :
                        task.status === 'Retake' ? "bg-red-500/20 text-red-500" : 
                        task.status === 'Pending Review' ? "bg-accent/20 text-accent" : "bg-sidebar-accent text-muted-foreground"
                      )}>{task.status}</Badge>
                    </TableCell>
                    <TableCell className="w-48">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
                          <div className="h-full bg-crimson" style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-white font-bold">{task.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-white font-mono">{task.internalEta || '--/--'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        "text-[10px] uppercase",
                        task.reviewStatus === 'Approved' ? "text-green-500" : 
                        task.reviewStatus === 'Changes Requested' ? "text-red-500" : "text-yellow-500"
                      )}>{task.reviewStatus}</Badge>
                    </TableCell>
                    <TableCell className="pr-6 max-w-[200px] truncate text-[10px] text-muted-foreground italic">
                      {task.latestArtistComment || "No updates logged in SSoT"}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-24 text-muted-foreground">
                      <Film className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p className="text-lg">No production data available.</p>
                      <p className="text-sm">Bootstrap the studio from the Import Hub to see live tracking.</p>
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
