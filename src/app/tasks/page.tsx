
"use client";

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Play,
  Pause, 
  Clock, 
  CheckCircle2,
  ExternalLink,
  Timer,
  AlertCircle,
  FileEdit,
  Target,
  Film
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLuminaStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';

export default function ArtistTasksPage() {
  const { tasks, shots, currentUser, updateTaskStatus } = useLuminaStore();
  const { toast } = useToast();

  const artistTasks = tasks.filter(t => t.assignedArtistId === currentUser?.id || t.assignedArtistId === 'u3');
  
  const getShotName = (shotId: string) => {
    return shots.find(s => s.id === shotId)?.shotCode || "N/A";
  };

  const totalAssignedBid = artistTasks.reduce((acc, t) => acc + t.bidHours, 0);
  const totalUtilizedBid = artistTasks.reduce((acc, t) => acc + t.spentHours, 0);
  const totalRemainingBid = artistTasks.reduce((acc, t) => acc + t.remainingHours, 0);



  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Film className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Artist Production Hub</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">My Workbench</h1>
              <p className="text-muted-foreground">Managing your shot-based pipeline assignments.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card border-none p-6 shadow-lg">
              <p className="text-xs font-bold text-muted-foreground uppercase">Assigned Bid</p>
              <h3 className="text-3xl font-headline text-white mt-1">{totalAssignedBid}h</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-lg">
              <p className="text-xs font-bold text-muted-foreground uppercase">Utilized Hours</p>
              <h3 className="text-3xl font-headline text-blue-500 mt-1">{totalUtilizedBid}h</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-lg">
              <p className="text-xs font-bold text-muted-foreground uppercase">Remaining Hours</p>
              <h3 className="text-3xl font-headline text-yellow-500 mt-1">{totalRemainingBid}h</h3>
            </Card>
            <Card className="bg-card border-none p-6 shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Productivity Target</p>
                  <h3 className="text-3xl font-headline text-green-500 mt-1">100%</h3>
                </div>
                <Target className="text-green-500 w-5 h-5" />
              </div>
            </Card>
          </div>

          <Card className="bg-card border-none overflow-hidden shadow-2xl">
            {artistTasks.length > 0 ? (
              <Table>
                <TableHeader className="bg-sidebar-accent/50">
                  <TableRow className="border-sidebar-border h-14">
                    <TableHead className="pl-6">Shot Name</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Bid / Utilized</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artistTasks.map((task) => {
                    const shotName = getShotName(task.shotId);
                    return (
                      <TableRow key={task.id} className={cn(
                        "border-sidebar-border h-20 transition-all"
                      )}>
                        <TableCell className="pl-6 font-bold text-white text-lg">{shotName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-crimson border-crimson/20">{task.pipelineStep}</Badge></TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "uppercase text-[10px] font-bold",
                            task.status === 'In Progress' ? "bg-blue-500/20 text-blue-500" : 
                            task.status === 'Retake' ? "bg-red-500/20 text-red-500" : 
                            task.status === 'Approved' ? "bg-green-500/20 text-green-500" : "bg-sidebar-accent text-muted-foreground"
                          )}>{task.status}</Badge>
                        </TableCell>
                        <TableCell className="w-48">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-muted-foreground">Completion</span>
                              <span className="text-white">{task.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-sidebar-accent rounded-full overflow-hidden">
                              <div className="h-full bg-crimson transition-all duration-500" style={{ width: `${task.progress}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-mono text-xs">{task.bidHours}h / {task.spentHours}h</TableCell>
                        <TableCell className={cn(
                          "font-mono text-xs font-bold",
                          task.remainingHours < 0 ? "text-red-500" : "text-yellow-500"
                        )}>{task.remainingHours}h</TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="border-sidebar-border" asChild>
                              <Link href={`/tasks/${task.id}`}>
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-24 text-center text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No shots currently assigned to you.</p>
                <p className="text-sm">Wait for your Lead to allocate tasks from the project pool.</p>
              </div>
            )}
          </Card>
        </div>


    </DashboardLayout>
  );
}
