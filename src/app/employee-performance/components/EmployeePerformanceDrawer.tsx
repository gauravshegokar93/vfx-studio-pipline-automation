'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Clock, Briefcase, AlertCircle, BarChart3, ListTodo, History, CheckCircle2, AlertTriangle, PlayCircle, PauseCircle, ChevronRight, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/apiClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface Props {
  artistId: number | null;
  onClose: () => void;
}

export default function EmployeePerformanceDrawer({ artistId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null); // For Task Drill-down

  useEffect(() => {
    if (artistId) {
      fetchData(artistId);
      setSelectedTask(null);
    }
  }, [artistId]);

  const fetchData = async (id: number) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/reports/employee-performance/${id}`);
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formattedBid = (val: number) => `${(val || 0).toFixed(2)} Bid`;

  if (!artistId) return null;

  return (
    <Dialog open={!!artistId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] w-[1400px] h-[90vh] bg-sidebar border-sidebar-border text-white flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-sidebar-border bg-sidebar-accent/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-headline flex items-center gap-3">
              <UserCircle className="w-8 h-8 text-blue-400" />
              {selectedTask ? 'Task Detail Drill-down' : 'Employee Performance Profile'}
            </DialogTitle>
            {selectedTask && (
              <button 
                onClick={() => setSelectedTask(null)}
                className="text-xs bg-sidebar-accent border border-sidebar-border px-3 py-1.5 rounded-full hover:bg-blue-500/20 hover:text-blue-400 transition-colors flex items-center gap-2"
              >
                <ChevronRight className="w-3 h-3 rotate-180" /> Back to Employee Overview
              </button>
            )}
          </div>
          <DialogDescription className="hidden">Detailed employee performance metrics and history.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto custom-scrollbar bg-background/50">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading production data...</div>
          ) : !data ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">No data found.</div>
          ) : (
            <div className="p-6 space-y-6">
              
              {!selectedTask ? (
                <>
                  {/* --- OVERVIEW MODE --- */}

                  {/* 1. Employee Info & Complexity Breakdown */}
                  <div className="grid grid-cols-3 gap-6">
                    <Card className="bg-sidebar border-sidebar-border col-span-2 shadow-lg">
                      <CardHeader className="pb-2 border-b border-sidebar-border bg-sidebar-accent/20">
                        <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Employee Information</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Name</p>
                          <p className="text-white font-bold">{data.employeeInfo.fullName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Employee Code</p>
                          <p className="text-white font-mono text-sm">{data.employeeInfo.employeeCode || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Department</p>
                          <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10 mt-1 uppercase text-[10px]">{data.employeeInfo.departmentName || 'Artist'}</Badge>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Role</p>
                          <p className="text-white text-sm">{data.employeeInfo.roleName || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Reporting Manager</p>
                          <p className="text-white text-sm">{data.employeeInfo.reportingManager || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Joining Date</p>
                          <p className="text-white text-sm">{data.employeeInfo.joiningDate ? new Date(data.employeeInfo.joiningDate).toLocaleDateString() : '-'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-sidebar border-sidebar-border shadow-lg">
                      <CardHeader className="pb-2 border-b border-sidebar-border bg-sidebar-accent/20">
                        <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Complexity Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {data.complexityBreakdown.map((c: any, i: number) => (
                            <div key={i} className="flex justify-between items-center bg-sidebar-accent/30 p-2 rounded-lg border border-sidebar-border">
                              <Badge variant="outline" className={cn(
                                "uppercase text-[10px] font-bold",
                                c.complexity?.toLowerCase().includes('hard') ? "text-red-400 border-red-400/30 bg-red-400/10" :
                                c.complexity?.toLowerCase().includes('mid') ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                                c.complexity?.toLowerCase().includes('easy') ? "text-green-400 border-green-400/30 bg-green-400/10" :
                                "text-blue-400 border-blue-400/30 bg-blue-400/10"
                              )}>
                                {c.complexity || 'UNKNOWN-DB'}
                              </Badge>
                              <span className="font-mono text-sm font-bold">{c.taskCount} tasks</span>
                            </div>
                          ))}
                          {data.complexityBreakdown.length === 0 && <p className="text-xs text-muted-foreground">No complexity data available.</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 2. Employee Production Summary (KPIs) */}
                  <div className="grid grid-cols-6 gap-4">
                    <Card className="bg-sidebar border-sidebar-border shadow-sm"><CardContent className="p-4 text-center"><p className="text-[10px] uppercase font-bold text-muted-foreground">Active Tasks</p><p className="text-2xl font-bold mt-1">{data.kpi.activeTasks}</p></CardContent></Card>
                    <Card className="bg-sidebar border-sidebar-border shadow-sm"><CardContent className="p-4 text-center"><p className="text-[10px] uppercase font-bold text-blue-400">In Progress</p><p className="text-2xl font-bold mt-1">{data.kpi.inProgress}</p></CardContent></Card>
                    <Card className="bg-sidebar border-sidebar-border shadow-sm"><CardContent className="p-4 text-center"><p className="text-[10px] uppercase font-bold text-yellow-400">Reviews</p><p className="text-2xl font-bold mt-1">{data.kpi.reviews}</p></CardContent></Card>
                    <Card className="bg-sidebar border-sidebar-border shadow-sm"><CardContent className="p-4 text-center"><p className="text-[10px] uppercase font-bold text-red-400">Reworks</p><p className="text-2xl font-bold mt-1">{data.kpi.reworks}</p></CardContent></Card>
                    <Card className="bg-sidebar border-sidebar-border shadow-sm"><CardContent className="p-4 text-center"><p className="text-[10px] uppercase font-bold text-emerald-400">Completed</p><p className="text-2xl font-bold mt-1">{data.kpi.completed}</p></CardContent></Card>
                    <Card className="bg-sidebar border-sidebar-border shadow-sm"><CardContent className="p-4 text-center"><p className="text-[10px] uppercase font-bold text-crimson">Overdue</p><p className="text-2xl font-bold mt-1 text-crimson">{data.kpi.overdue}</p></CardContent></Card>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-sidebar-accent/30 border-sidebar-border"><CardContent className="p-4 flex items-center justify-between"><p className="text-xs uppercase font-bold text-muted-foreground">Target Bid</p><p className="font-mono text-xl font-bold">{formattedBid(data.kpi.targetBid)}</p></CardContent></Card>
                    <Card className="bg-sidebar-accent/30 border-emerald-500/30"><CardContent className="p-4 flex items-center justify-between"><p className="text-xs uppercase font-bold text-emerald-400">Actual Bid</p><p className="font-mono text-xl font-bold text-emerald-400">{formattedBid(data.kpi.actualBid)}</p></CardContent></Card>
                    <Card className="bg-sidebar-accent/30 border-sidebar-border"><CardContent className="p-4 flex items-center justify-between"><p className="text-xs uppercase font-bold text-muted-foreground">Remaining Bid</p><p className="font-mono text-xl font-bold">{formattedBid(data.kpi.remainingBid)}</p></CardContent></Card>
                  </div>

                  {/* 3. Performance Trends */}
                  <Card className="bg-sidebar border-sidebar-border shadow-lg">
                    <CardHeader className="pb-2 border-b border-sidebar-border bg-sidebar-accent/20">
                      <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Performance Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-sidebar-border hover:bg-transparent">
                            <TableHead className="text-xs uppercase">Timeframe</TableHead>
                            <TableHead className="text-right text-xs uppercase">Tasks Started</TableHead>
                            <TableHead className="text-right text-xs uppercase">Tasks Completed</TableHead>
                            <TableHead className="text-right text-xs uppercase">Reviews Submitted</TableHead>
                            <TableHead className="text-right text-xs uppercase">Reworks</TableHead>
                            <TableHead className="text-right text-xs uppercase">Logged Hours</TableHead>
                            <TableHead className="text-right text-xs uppercase">Logged Bid</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {['7Days', '30Days', '90Days'].map(tf => {
                            const tr = data.trends[tf];
                            if (!tr) return null;
                            return (
                              <TableRow key={tf} className="border-sidebar-border hover:bg-sidebar-accent/30">
                                <TableCell className="font-bold text-blue-400">Last {tr.days} Days</TableCell>
                                <TableCell className="text-right font-mono">{tr.tasksStarted}</TableCell>
                                <TableCell className="text-right font-mono text-emerald-400 font-bold">{tr.tasksCompleted}</TableCell>
                                <TableCell className="text-right font-mono text-yellow-400">{tr.reviewSubmissions}</TableCell>
                                <TableCell className="text-right font-mono text-red-400">{tr.reworks}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">{tr.loggedHours.toFixed(2)} hrs</TableCell>
                                <TableCell className="text-right font-mono font-bold text-emerald-400">{formattedBid(tr.loggedHours / 8)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* 4. Overdue Tasks */}
                  {data.overdueTasks.length > 0 && (
                    <Card className="bg-sidebar border-crimson/30 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-crimson" />
                      <CardHeader className="pb-2 border-b border-crimson/20 bg-crimson/5">
                        <CardTitle className="text-sm font-bold uppercase text-crimson flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Overdue Work
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 p-0">
                        <Table>
                          <TableHeader className="bg-crimson/10">
                            <TableRow className="border-crimson/20 hover:bg-transparent text-[10px]">
                              <TableHead className="text-crimson font-bold pl-4">Task Code</TableHead>
                              <TableHead className="text-crimson font-bold">Stage</TableHead>
                              <TableHead className="text-crimson font-bold">Due Date</TableHead>
                              <TableHead className="text-crimson font-bold">Days Overdue</TableHead>
                              <TableHead className="text-crimson font-bold">Complexity</TableHead>
                              <TableHead className="text-crimson font-bold text-right">Target Bid</TableHead>
                              <TableHead className="text-crimson font-bold text-right pr-4">Actual Bid</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.overdueTasks.map((t: any) => (
                              <TableRow key={`ov-${t.taskId}`} className="border-crimson/10 hover:bg-crimson/5">
                                <TableCell className="font-mono text-xs pl-4">{t.taskCode}</TableCell>
                                <TableCell><Badge variant="outline" className="text-crimson border-crimson/20 uppercase text-[9px]">{t.stage}</Badge></TableCell>
                                <TableCell className="text-xs">{new Date(t.dueDate).toLocaleDateString()}</TableCell>
                                <TableCell className="text-xs font-bold text-crimson">{t.daysOverdue} days</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cn(
                                    "uppercase text-[9px] font-bold",
                                    t.complexity?.toLowerCase().includes('hard') ? "text-red-400 border-red-400/30 bg-red-400/10" :
                                    t.complexity?.toLowerCase().includes('mid') ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                                    t.complexity?.toLowerCase().includes('easy') ? "text-green-400 border-green-400/30 bg-green-400/10" :
                                    "text-blue-400 border-blue-400/30 bg-blue-400/10"
                                  )}>
                                    {t.complexity || 'UNKNOWN-DB'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">{formattedBid(t.targetBid)}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-crimson pr-4">{formattedBid(t.actualBid)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* 5. Current Tasks */}
                  <Card className="bg-sidebar border-sidebar-border shadow-lg">
                    <CardHeader className="pb-2 border-b border-sidebar-border bg-sidebar-accent/20">
                      <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> Current Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 p-0">
                      <Table>
                        <TableHeader className="bg-sidebar-accent/50">
                          <TableRow className="border-sidebar-border hover:bg-transparent text-[10px]">
                            <TableHead className="pl-4 text-white font-bold">Shot</TableHead>
                            <TableHead>Task Code</TableHead>
                            <TableHead>Task Name</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Complexity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Estimated Bid</TableHead>
                            <TableHead className="text-right">Target Bid</TableHead>
                            <TableHead className="text-right">Actual Bid</TableHead>
                            <TableHead className="text-right">Remaining Bid</TableHead>
                            <TableHead className="text-right pr-4">Due Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.currentTasks?.map((t: any) => (
                            <TableRow 
                              key={t.taskId} 
                              className="border-sidebar-border hover:bg-sidebar-accent/40 cursor-pointer transition-colors"
                              onClick={() => setSelectedTask(t)}
                            >
                              <TableCell className="pl-4 font-bold">{t.shotCode || '-'}</TableCell>
                              <TableCell className="font-mono text-xs">{t.taskCode}</TableCell>
                              <TableCell className="text-xs">{t.taskName || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-blue-400 border-blue-400/30 uppercase text-[9px]">{t.stage}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(
                                  "uppercase text-[9px] font-bold",
                                  t.complexity?.toLowerCase().includes('hard') ? "text-red-400 border-red-400/30 bg-red-400/10" :
                                  t.complexity?.toLowerCase().includes('mid') ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                                  t.complexity?.toLowerCase().includes('easy') ? "text-green-400 border-green-400/30 bg-green-400/10" :
                                  "text-blue-400 border-blue-400/30 bg-blue-400/10"
                                )}>
                                  {t.complexity || 'Unknown'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{t.status}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{formattedBid(t.estimatedBid)}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{formattedBid(t.targetBid)}</TableCell>
                              <TableCell className="text-right font-mono text-xs text-emerald-400 font-bold">{formattedBid(t.actualBid)}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{formattedBid(t.remainingBid)}</TableCell>
                              <TableCell className="text-right pr-4 text-xs">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</TableCell>
                            </TableRow>
                          ))}
                          {(!data.currentTasks || data.currentTasks.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={11} className="text-center text-muted-foreground text-xs py-4 italic">No tasks assigned to this employee.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* 6. Workflow Activity / History */}
                  <Card className="bg-sidebar border-sidebar-border shadow-lg">
                    <CardHeader className="pb-2 border-b border-sidebar-border bg-sidebar-accent/20">
                      <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <History className="w-4 h-4" /> Workflow Activity Feed (Recent)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 max-h-[300px] overflow-auto custom-scrollbar">
                      <div className="relative border-l border-sidebar-border ml-3 space-y-4 pb-4">
                        {data.history.map((h: any, i: number) => {
                          let Icon = Activity;
                          let iconColor = "text-blue-400";
                          let bg = "bg-blue-400/10";
                          
                          if (h.eventType === 'Status Change') {
                            if (h.description.includes('Completed')) { Icon = CheckCircle2; iconColor = "text-emerald-400"; bg = "bg-emerald-400/10"; }
                            else if (h.description.includes('Rework')) { Icon = AlertTriangle; iconColor = "text-red-400"; bg = "bg-red-400/10"; }
                          } else if (h.eventType === 'Work Logged') {
                            Icon = Clock; iconColor = "text-emerald-400"; bg = "bg-emerald-400/10";
                          } else if (h.eventType === 'Review Submitted') {
                            Icon = PlayCircle; iconColor = "text-yellow-400"; bg = "bg-yellow-400/10";
                          } else if (h.eventType === 'Task Assigned') {
                            Icon = Briefcase; iconColor = "text-purple-400"; bg = "bg-purple-400/10";
                          }

                          return (
                            <div key={i} className="relative pl-6">
                              <div className={cn("absolute -left-[13px] top-1 w-6 h-6 rounded-full border border-sidebar-border flex items-center justify-center", bg)}>
                                <Icon className={cn("w-3 h-3", iconColor)} />
                              </div>
                              <div className="bg-sidebar-accent/30 p-3 rounded-lg border border-sidebar-border text-sm flex justify-between items-start cursor-pointer hover:border-blue-500/50 transition-colors"
                                onClick={() => {
                                  const actualTask = data.currentTasks?.find((t: any) => t.taskId === h.taskId);
                                  setSelectedTask(actualTask || h);
                                }}
                              >
                                <div>
                                  <p className="font-bold text-white flex items-center gap-2">
                                    {h.eventType} 
                                    <span className="text-[10px] text-muted-foreground font-mono bg-sidebar border border-sidebar-border px-1.5 rounded">{h.taskCode}</span>
                                  </p>
                                  <p className="text-muted-foreground mt-1 text-xs">{h.description}</p>
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(h.eventDate).toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                        {data.history.length === 0 && <p className="text-xs text-muted-foreground pl-6">No workflow history found.</p>}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  {/* --- TASK DRILL-DOWN MODE --- */}
                  
                  <Card className="bg-sidebar border-sidebar-border shadow-lg">
                    <CardHeader className="pb-2 border-b border-sidebar-border bg-sidebar-accent/20">
                      <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <ListTodo className="w-4 h-4" /> Task Context
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border">
                        <p className="text-muted-foreground uppercase font-bold text-[10px]">Shot</p>
                        <p className="text-white font-bold text-sm mt-1">{selectedTask.shotCode || '-'}</p>
                      </div>
                      <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border">
                        <p className="text-muted-foreground uppercase font-bold text-[10px]">Task Code</p>
                        <p className="text-white font-mono font-bold text-sm mt-1">{selectedTask.taskCode}</p>
                      </div>
                      <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border flex flex-col justify-center">
                        <p className="text-muted-foreground uppercase font-bold text-[10px] mb-2">Stage</p>
                        <div><Badge variant="outline" className="text-blue-400 border-blue-400/30 uppercase text-[9px]">{selectedTask.stage}</Badge></div>
                      </div>
                      <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border flex flex-col justify-center">
                        <p className="text-muted-foreground uppercase font-bold text-[10px] mb-2">Complexity</p>
                        <div>
                          <Badge variant="outline" className={cn(
                                "uppercase text-[9px] font-bold",
                                selectedTask.complexity?.toLowerCase().includes('hard') ? "text-red-400 border-red-400/30 bg-red-400/10" :
                                selectedTask.complexity?.toLowerCase().includes('mid') ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                                selectedTask.complexity?.toLowerCase().includes('easy') ? "text-green-400 border-green-400/30 bg-green-400/10" :
                                "text-blue-400 border-blue-400/30 bg-blue-400/10"
                              )}>
                            {selectedTask.complexity || 'Check Main View'}
                          </Badge>
                        </div>
                      </div>
                      <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border">
                        <p className="text-muted-foreground uppercase font-bold text-[10px]">Status</p>
                        <p className="text-white font-bold text-sm mt-1">{selectedTask.status}</p>
                      </div>
                      
                      <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border">
                        <p className="text-muted-foreground uppercase font-bold text-[10px]">Estimated Bid</p>
                        <p className="text-white font-mono text-sm mt-1">{formattedBid(selectedTask.estimatedBid)}</p>
                      </div>
                      <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border">
                        <p className="text-muted-foreground uppercase font-bold text-[10px]">Target Bid</p>
                        <p className="text-white font-mono text-sm mt-1">{formattedBid(selectedTask.targetBid)}</p>
                      </div>
                      <div className="bg-sidebar-accent/30 border-emerald-500/30 p-4 rounded-xl border">
                        <p className="text-emerald-400 uppercase font-bold text-[10px]">Actual Bid</p>
                        <p className="text-emerald-400 font-mono font-bold text-sm mt-1">{formattedBid(selectedTask.actualBid)}</p>
                      </div>
                      <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border">
                        <p className="text-muted-foreground uppercase font-bold text-[10px]">Remaining Bid</p>
                        <p className="text-white font-mono text-sm mt-1">{formattedBid(selectedTask.remainingBid)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* TIMELOG ACTIVITY */}
                  {(() => {
                    const taskLogs = data.timeLogs?.filter((l: any) => l.taskId === selectedTask.taskId) || [];
                    const totalLoggedHours = taskLogs.reduce((acc: number, l: any) => acc + (l.hoursWorked || 0), 0);
                    const totalLoggedBid = totalLoggedHours / 8;
                    const numSessions = taskLogs.length;
                    const activeLog = taskLogs.find((l: any) => l.isActive === 1);
                    
                    return (
                      <Card className="bg-sidebar border-sidebar-border shadow-lg">
                        <CardHeader className="pb-2 border-b border-sidebar-border bg-sidebar-accent/20">
                          <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-400" /> Timelog Activity
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border">
                              <p className="text-muted-foreground uppercase font-bold text-[10px]">Total Logged Hours</p>
                              <p className="text-white font-mono font-bold text-lg mt-1">{totalLoggedHours.toFixed(2)} hrs</p>
                            </div>
                            <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-emerald-500/30">
                              <p className="text-emerald-400 uppercase font-bold text-[10px]">Total Logged Bid</p>
                              <p className="text-emerald-400 font-mono font-bold text-lg mt-1">{formattedBid(totalLoggedBid)}</p>
                            </div>
                            <div className="bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border">
                              <p className="text-muted-foreground uppercase font-bold text-[10px]">Number of Sessions</p>
                              <p className="text-white font-mono font-bold text-lg mt-1">{numSessions}</p>
                            </div>
                            {activeLog && (
                              <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30 flex items-center justify-between">
                                <div>
                                  <p className="text-blue-400 uppercase font-bold text-[10px]">Currently Working</p>
                                  <p className="text-blue-400 text-xs font-bold mt-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Active Session
                                  </p>
                                </div>
                                <Clock className="w-6 h-6 text-blue-400 opacity-50" />
                              </div>
                            )}
                          </div>
                          
                          <Table>
                            <TableHeader>
                              <TableRow className="border-sidebar-border hover:bg-transparent text-[10px]">
                                <TableHead>Start Time</TableHead>
                                <TableHead>End Time</TableHead>
                                <TableHead className="text-right">Hours Worked</TableHead>
                                <TableHead>Session Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {taskLogs.map((l: any) => (
                                <TableRow key={l.logId} className="border-sidebar-border hover:bg-sidebar-accent/30">
                                  <TableCell className="text-xs">{new Date(l.startTime).toLocaleString()}</TableCell>
                                  <TableCell className="text-xs">{l.endTime ? new Date(l.endTime).toLocaleString() : '-'}</TableCell>
                                  <TableCell className="text-right font-mono text-xs">{l.hoursWorked ? l.hoursWorked.toFixed(2) + ' hrs' : '-'}</TableCell>
                                  <TableCell>
                                    {l.isActive === 1 ? (
                                      <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10 uppercase text-[9px]">Currently Working</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-muted-foreground border-sidebar-border uppercase text-[9px]">Completed</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {taskLogs.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-4">No time logged for this task.</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  <Card className="bg-sidebar border-sidebar-border shadow-lg">
                    <CardHeader className="pb-2 border-b border-sidebar-border bg-sidebar-accent/20">
                      <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <History className="w-4 h-4" /> Filtered Task History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 max-h-[400px] overflow-auto custom-scrollbar">
                      <div className="relative border-l border-sidebar-border ml-3 space-y-4 pb-4">
                        {data.history.filter((h: any) => h.taskId === selectedTask.taskId).map((h: any, i: number) => {
                          let Icon = Activity;
                          let iconColor = "text-blue-400";
                          let bg = "bg-blue-400/10";
                          if (h.eventType === 'Status Change') {
                            if (h.description.includes('Completed')) { Icon = CheckCircle2; iconColor = "text-emerald-400"; bg = "bg-emerald-400/10"; }
                            else if (h.description.includes('Rework')) { Icon = AlertTriangle; iconColor = "text-red-400"; bg = "bg-red-400/10"; }
                          } else if (h.eventType === 'Work Logged') {
                            Icon = Clock; iconColor = "text-emerald-400"; bg = "bg-emerald-400/10";
                          } else if (h.eventType === 'Review Submitted') {
                            Icon = PlayCircle; iconColor = "text-yellow-400"; bg = "bg-yellow-400/10";
                          }
                          return (
                            <div key={i} className="relative pl-6">
                              <div className={cn("absolute -left-[13px] top-1 w-6 h-6 rounded-full border border-sidebar-border flex items-center justify-center", bg)}>
                                <Icon className={cn("w-3 h-3", iconColor)} />
                              </div>
                              <div className="bg-sidebar-accent/30 p-3 rounded-lg border border-sidebar-border text-sm flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-white">{h.eventType}</p>
                                  <p className="text-muted-foreground mt-1 text-xs">{h.description}</p>
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(h.eventDate).toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                        {data.history.filter((h: any) => h.taskId === selectedTask.taskId).length === 0 && <p className="text-xs text-muted-foreground pl-6">No history found for this task.</p>}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
