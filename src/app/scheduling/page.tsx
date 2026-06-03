
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { 
  BrainCircuit, 
  UserPlus, 
  Calendar as CalendarIcon, 
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { intelligentSchedulingAssistant, IntelligentSchedulingAssistantOutput } from '@/ai/flows/intelligent-scheduling-assistant';
import { Skeleton } from '@/components/ui/skeleton';

// Mock data for scheduling input
const unassignedTasks = [
  { id: 't1', taskName: 'Hero Comp', pipelineStep: 'Comp', bidHours: 40, dueDate: '2024-05-20', requiredSkills: ['Nuke', 'Deep Compositing'], description: 'Main character shot' },
  { id: 't2', taskName: 'Building Destruction', pipelineStep: 'CG', bidHours: 80, dueDate: '2024-06-15', requiredSkills: ['Houdini', 'FX'], description: 'Large scale destruction' },
  { id: 't3', taskName: 'Face Paint-out', pipelineStep: 'Paint', bidHours: 16, dueDate: '2024-05-10', requiredSkills: ['Silhouette', 'Photoshop'], description: 'Skin cleanup' },
];

const artists = [
  { id: 'a1', name: 'Alex Rivera', departmentId: 'dept-comp', skillSets: ['Nuke', 'Deep Compositing', 'Python'], availableHoursPerDay: 8, currentAssignedTasks: [], vacationDays: [] },
  { id: 'a2', name: 'Zoe Chen', departmentId: 'dept-cg', skillSets: ['Houdini', 'FX', 'Maya'], availableHoursPerDay: 8, currentAssignedTasks: [{ taskId: 'old-1', estimatedHoursRemaining: 12, dueDate: '2024-05-05' }], vacationDays: [] },
];

export default function SchedulingPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntelligentSchedulingAssistantOutput | null>(null);

  const handleGenerateSchedule = async () => {
    setLoading(true);
    try {
      const output = await intelligentSchedulingAssistant({
        unassignedTasks,
        artists,
        currentDate: new Date().toISOString().split('T')[0]
      });
      setResult(output);
    } catch (error) {
      console.error("Scheduling failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="text-crimson w-6 h-6" />
                <h1 className="text-4xl font-headline text-white">Intelligent Scheduling</h1>
              </div>
              <p className="text-muted-foreground font-body">AI-optimized task assignments and resource management.</p>
            </div>
            <Button 
              onClick={handleGenerateSchedule} 
              disabled={loading}
              className="bg-accent text-white hover:bg-accent/90 shadow-[0_0_20px_rgba(166,50,230,0.3)] transition-all"
            >
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {loading ? 'Optimizing Pipeline...' : 'Run Smart Scheduler'}
            </Button>
          </div>

          {!result && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white">Unassigned Workload</CardTitle>
                  <CardDescription>Tasks waiting for allocation.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {unassignedTasks.map(task => (
                      <div key={task.id} className="p-4 rounded-lg bg-sidebar-accent border border-sidebar-border flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-white">{task.taskName}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{task.pipelineStep}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {task.bidHours}h
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-white/10 text-white">Due {task.dueDate}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white">Resource Pool</CardTitle>
                  <CardDescription>Available artists for this cycle.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {artists.map(artist => (
                      <div key={artist.id} className="p-4 rounded-lg bg-sidebar-accent border border-sidebar-border flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-crimson/20 flex items-center justify-center text-crimson font-bold">
                            {artist.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{artist.name}</p>
                            <p className="text-xs text-muted-foreground">{artist.skillSets?.join(', ')}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-500 border-green-500/30">Available</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {loading && (
            <div className="space-y-6">
              <Skeleton className="h-[200px] w-full bg-sidebar-accent rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-[300px] bg-sidebar-accent" />
                <Skeleton className="h-[300px] bg-sidebar-accent" />
                <Skeleton className="h-[300px] bg-sidebar-accent" />
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <Card className="bg-accent/10 border border-accent/20 overflow-hidden shadow-2xl">
                <CardHeader className="bg-accent/5">
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="text-green-500 w-5 h-5" />
                    AI Recommendation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-white leading-relaxed">{result.overallSummary}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-card border-none shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white">Proposed Assignments</CardTitle>
                    <CardDescription>Optimal resource distribution.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.suggestedAssignments.map((assign, i) => (
                        <div key={i} className="p-4 rounded-lg bg-sidebar-accent border border-sidebar-border hover:border-crimson/50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-white uppercase text-xs tracking-widest text-muted-foreground">Task: {assign.taskId}</h4>
                            <Badge className="bg-crimson">Start: {assign.suggestedStartDate}</Badge>
                          </div>
                          <div className="flex items-center gap-3 my-3">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                              <UserPlus className="text-accent w-4 h-4" />
                            </div>
                            <span className="text-sm text-white">Assign to <span className="font-bold text-accent">Artist {assign.artistId}</span></span>
                          </div>
                          <p className="text-xs text-muted-foreground italic">&quot;{assign.rationale}&quot;</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-8">
                  <Card className="bg-card border-none shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="text-yellow-500 w-5 h-5" />
                        Potential Bottlenecks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.potentialBottlenecks.map((b, i) => (
                          <div key={i} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-yellow-500 text-black text-[10px] font-bold">{b.type.toUpperCase()}</Badge>
                              <span className="text-sm font-semibold text-white">ID: {b.id}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{b.reason}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-none shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <XCircle className="text-red-500 w-5 h-5" />
                        Scheduling Conflicts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.schedulingConflicts.length > 0 ? (
                          result.schedulingConflicts.map((c, i) => (
                            <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                              <p className="text-sm font-semibold text-white mb-1">{c.conflictReason}</p>
                              <p className="text-[10px] text-muted-foreground">Involved: Artists {c.artistIds.join(', ')}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
                            <p className="text-sm">No critical conflicts detected.</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pb-8">
                <Button variant="outline" onClick={() => setResult(null)}>Reset Plan</Button>
                <Button className="bg-crimson">Commit & Notify Teams</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
