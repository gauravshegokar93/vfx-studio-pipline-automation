"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  BarChart3,
  Film,
  Layers,
  CheckSquare,
  TrendingUp,
  AlertCircle,
  Clock,
  Filter,
  Calendar as CalendarIcon,
  HelpCircle,
  UserX,
  FileCheck,
  AlertTriangle,
  Ban,
  Users,
  Briefcase,
  ChevronRight,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { dashboardService, DashboardResponse } from '@/services/dashboardService';
import { taskService, OverdueTaskItem } from '@/services/taskService';

export default function ProductionHeadDashboard() {
  const [projectId, setProjectId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, overdueRes] = await Promise.all([
        dashboardService.getExecutiveDashboard({
          projectId,
          dateRange,
          startDate: dateRange === 'custom' ? startDate : undefined,
          endDate: dateRange === 'custom' ? endDate : undefined
        }),
        taskService.getOverdueTasks({
          projectId: projectId !== 'all' ? projectId : undefined
        })
      ]);
      setData(res);
      setOverdueTasks(overdueRes);
    } catch (err: any) {
      console.error('[ProductionHeadDashboard] Error fetching dashboard data:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [projectId, dateRange, startDate, endDate]);

  useEffect(() => {
    if (dateRange === 'custom' && (!startDate || !endDate)) {
      return;
    }
    fetchDashboardData();
  }, [fetchDashboardData, dateRange, startDate, endDate]);

  const formattedBid = (val?: number) => {
    if (val === undefined || val === null) return '0.00 Bid';
    return `${val.toFixed(2)} Bid`;
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 pb-20 select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="text-crimson w-5 h-5" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                PRODUCTION CONTROL CENTER
              </span>
            </div>
            <h1 className="text-4xl font-headline text-white mb-2">Production Head Dashboard</h1>
            <p className="text-muted-foreground">Operational pipeline status, department throughput, and Bid control.</p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-sidebar-accent/40 p-3 rounded-xl border border-sidebar-border/60">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-crimson shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Project:</span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="bg-sidebar border border-sidebar-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-crimson font-medium"
              >
                <option value="all">All Projects</option>
                {data?.projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName} ({p.projectCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-crimson shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Date:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-sidebar border border-sidebar-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-crimson font-medium"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-sidebar border border-sidebar-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-crimson"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-sidebar border border-sidebar-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-crimson"
                />
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Fetching live SQL database production metrics...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-red-950/30 border border-red-800/50 rounded-2xl flex items-center gap-4 text-red-200">
            <AlertCircle className="w-6 h-6 shrink-0 text-crimson" />
            <div>
              <p className="font-bold text-sm">Failed to query production database</p>
              <p className="text-xs text-red-300/80">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboardData} className="ml-auto text-xs border-red-800 text-white">
              Retry Query
            </Button>
          </div>
        )}

        {/* Executive & Production Head Content */}
        {data && (
          <>
            {/* KPI Cards: Project & Task Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card border-none p-6 shadow-xl">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ACTIVE PROJECTS</p>
                  <Film className="w-5 h-5 text-crimson" />
                </div>
                <h3 className="text-4xl font-headline text-white">{data.kpi.activeProjects}</h3>
                <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">
                  {data.kpi.totalShots} Linked Shots Across Pipeline
                </p>
              </Card>

              <Card className="bg-card border-none p-6 shadow-xl">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">TOTAL ESTIMATED BID</p>
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="text-3xl font-headline text-white">{formattedBid(data.kpi.totalEstimatedBid)}</h3>
                <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">Target Bid: {formattedBid(data.kpi.totalTargetBid)}</p>
              </Card>

              <Card className="bg-card border-none p-6 shadow-xl">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ACTUAL WORKED BID</p>
                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-headline text-emerald-400">{formattedBid(data.kpi.totalActualBid)}</h3>
                <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">Logged Execution (TimeLog)</p>
              </Card>

              <Card className="bg-card border-none p-6 shadow-xl">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">OVERALL COMPLETION</p>
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-4xl font-headline text-white">{data.kpi.overallCompletion}%</h3>
                <div className="mt-3">
                  <Progress value={data.kpi.overallCompletion} className="h-1.5 bg-sidebar-accent" />
                </div>
              </Card>
            </div>

            {/* Attention Required & Operational Queues Banner */}
            <Card className="bg-card border-none shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-sidebar-border">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white uppercase tracking-wider font-headline">PRODUCTION CONTROL WATCHDOG</h3>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Real DB Operational Queues & Exceptions
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/department-queue" className="group">
                  <div className="p-4 rounded-xl bg-sidebar-accent/30 border border-sidebar-border group-hover:border-amber-400/50 flex items-center gap-4 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <UserX className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase block">Unassigned Tasks</span>
                      <span className="text-2xl font-bold text-white font-mono">{data.attentionRequired.unassignedTasks}</span>
                    </div>
                  </div>
                </Link>

                <Link href="/reviews" className="group">
                  <div className="p-4 rounded-xl bg-sidebar-accent/30 border border-sidebar-border group-hover:border-blue-400/50 flex items-center gap-4 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase block">Waiting for Review</span>
                      <span className="text-2xl font-bold text-white font-mono">{data.attentionRequired.pendingReviews}</span>
                    </div>
                  </div>
                </Link>

                <Link href="/department-queue" className="group">
                  <div className="p-4 rounded-xl bg-sidebar-accent/30 border border-sidebar-border group-hover:border-purple-400/50 flex items-center gap-4 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Ban className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase block">In Rework Status</span>
                      <span className="text-2xl font-bold text-white font-mono">{data.attentionRequired.blockedTasks}</span>
                    </div>
                  </div>
                </Link>

                <div className="p-4 rounded-xl bg-sidebar-accent/30 border border-sidebar-border flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase block">Overdue Tasks</span>
                    <span className="text-2xl font-bold text-red-400 font-mono">{data.attentionRequired.overdueTasks}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Project Production Matrix Table */}
            <Card className="bg-card border-none shadow-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-sidebar-accent/20 border-b border-sidebar-border py-4">
                <div>
                  <CardTitle className="text-white text-base font-bold uppercase tracking-wider font-headline">PROJECT PRODUCTION CONTROL</CardTitle>
                  <CardDescription className="text-xs">Live shot, task, and Bid allocation breakdown per project.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-sidebar-accent/50 text-[11px] uppercase font-bold text-muted-foreground border-b border-sidebar-border font-sans">
                      <tr>
                        <th className="px-6 py-3.5">Project</th>
                        <th className="px-6 py-3.5 text-center">Shots</th>
                        <th className="px-6 py-3.5 text-center">Tasks</th>
                        <th className="px-6 py-3.5 text-center">Unassigned</th>
                        <th className="px-6 py-3.5 text-center">Assigned</th>
                        <th className="px-6 py-3.5 text-center">In Progress</th>
                        <th className="px-6 py-3.5 text-center">Review</th>
                        <th className="px-6 py-3.5 text-center">Rework</th>
                        <th className="px-6 py-3.5 text-center">Completed</th>
                        <th className="px-6 py-3.5 text-right">Target Bid</th>
                        <th className="px-6 py-3.5 text-right">Actual Bid</th>
                        <th className="px-6 py-3.5 text-right">Remaining Bid</th>
                        <th className="px-6 py-3.5 w-36 text-right">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sidebar-border/60 text-xs">
                      {data.projectProduction.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="px-6 py-8 text-center text-muted-foreground font-sans">
                            No projects match the selected filter criteria.
                          </td>
                        </tr>
                      ) : (
                        data.projectProduction.map((p) => (
                          <tr key={p.id} className="hover:bg-sidebar-accent/20 transition-colors">
                            <td className="px-6 py-4 font-bold text-white font-sans">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-white">{p.projectName}</span>
                                <span className="text-[10px] text-muted-foreground">{p.projectCode}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center text-white">{p.shots}</td>
                            <td className="px-6 py-4 text-center text-white">{p.tasks}</td>
                            <td className="px-6 py-4 text-center text-amber-400">{p.unassigned || 0}</td>
                            <td className="px-6 py-4 text-center text-blue-400">{p.assigned || 0}</td>
                            <td className="px-6 py-4 text-center text-blue-500">{p.inProgress || 0}</td>
                            <td className="px-6 py-4 text-center text-amber-300">{p.pendingReview}</td>
                            <td className="px-6 py-4 text-center text-purple-400">{p.rework || 0}</td>
                            <td className="px-6 py-4 text-center text-emerald-400 font-bold">{p.completed}</td>
                            <td className="px-6 py-4 text-right text-yellow-400 font-bold">{formattedBid(p.targetBid)}</td>
                            <td className="px-6 py-4 text-right text-emerald-400 font-bold">{formattedBid(p.actualBid)}</td>
                            <td className="px-6 py-4 text-right text-crimson font-bold">{formattedBid(p.remainingBid)}</td>
                            <td className="px-6 py-4 text-right font-sans">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={p.completionRate} className="h-1.5 w-16 bg-sidebar-accent" />
                                <span className="text-[11px] font-semibold text-white">{p.completionRate}%</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Department Status & Overdue Tasks Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Department Status Table */}
              <Card className="bg-card border-none shadow-2xl overflow-hidden lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between bg-sidebar-accent/20 border-b border-sidebar-border py-4">
                  <div>
                    <CardTitle className="text-white text-base font-bold uppercase tracking-wider font-headline">DEPARTMENT PRODUCTION MATRIX</CardTitle>
                    <CardDescription className="text-xs">Task queue distribution and Bid metrics for Roto, Paint, Comp, and CG.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs border-sidebar-border" asChild>
                    <Link href="/department-progress">
                      Full Operations View <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-sidebar-accent/50 text-[11px] uppercase font-bold text-muted-foreground border-b border-sidebar-border font-sans">
                        <tr>
                          <th className="px-6 py-3.5">Department</th>
                          <th className="px-6 py-3.5 text-center">Total</th>
                          <th className="px-6 py-3.5 text-center">Unassigned</th>
                          <th className="px-6 py-3.5 text-center">WIP</th>
                          <th className="px-6 py-3.5 text-center">Review</th>
                          <th className="px-6 py-3.5 text-center">Rework</th>
                          <th className="px-6 py-3.5 text-center">Completed</th>
                          <th className="px-6 py-3.5 text-right">Target Bid</th>
                          <th className="px-6 py-3.5 text-right">Actual Bid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sidebar-border/60 text-xs">
                        {data.departmentStatus.map((dept) => (
                          <tr key={dept.department} className="hover:bg-sidebar-accent/20 transition-colors">
                            <td className="px-6 py-4 font-bold text-white font-sans text-sm">{dept.department}</td>
                            <td className="px-6 py-4 text-center text-white">{dept.totalTasks}</td>
                            <td className="px-6 py-4 text-center text-amber-400">{dept.unassigned || 0}</td>
                            <td className="px-6 py-4 text-center text-blue-400">{dept.wip}</td>
                            <td className="px-6 py-4 text-center text-amber-300">{dept.pendingReview}</td>
                            <td className="px-6 py-4 text-center text-purple-400">{dept.rework || 0}</td>
                            <td className="px-6 py-4 text-center text-emerald-400 font-bold">{dept.completed}</td>
                            <td className="px-6 py-4 text-right text-yellow-400 font-bold">{formattedBid(dept.targetBid)}</td>
                            <td className="px-6 py-4 text-right text-emerald-400 font-bold">{formattedBid(dept.actualBid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Overdue Tasks Control List */}
              <Card className="bg-card border-none shadow-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h3 className="text-base font-bold text-white uppercase tracking-wider font-headline">OVERDUE TASKS WATCHLIST</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Active tasks past due date requiring immediate attention.
                  </p>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {overdueTasks.map((task) => (
                      <div 
                        key={task.taskId} 
                        className="p-3 bg-sidebar-accent/30 rounded-xl border border-red-500/30 space-y-1.5 hover:border-red-500/60 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/tasks/${task.taskId}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-white font-mono">{task.taskCode}</p>
                            <p className="text-[10px] text-muted-foreground">{task.shotCode} ({task.stageName})</p>
                          </div>
                          <Badge className="bg-red-500/20 text-red-400 text-[9px] uppercase">
                            Due {new Date(task.dueDate).toISOString().split('T')[0]}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t border-sidebar-border/40 font-mono">
                          <span>Artist: {task.assignedArtist || 'Unassigned'}</span>
                          <span className="text-crimson font-bold">{formattedBid(task.targetBid || task.estimatedBid)}</span>
                        </div>
                      </div>
                    ))}

                    {overdueTasks.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-xs italic">
                        <CheckCircle2 className="w-8 h-8 text-green-500/30 mx-auto mb-2" />
                        No overdue tasks in pipeline.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-sidebar-border text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>Strict DB Rule: Completed tasks excluded</span>
                  <Link href="/department-queue" className="text-crimson font-bold hover:underline">
                    View Queue
                  </Link>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
