"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Filter, 
  TrendingUp,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskService, DepartmentProgressItem } from '@/services/taskService';
import { dashboardService } from '@/services/dashboardService';

export default function DepartmentProgressPage() {
  const [items, setItems] = useState<DepartmentProgressItem[]>([]);
  const [projects, setProjects] = useState<{ id: string; projectCode: string; projectName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  const loadProgressData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptProgress, dashData] = await Promise.all([
        taskService.getDepartmentProgressReport({
          projectId: selectedProjectId !== 'all' ? selectedProjectId : undefined,
          dateRange: dateRange !== 'all' ? dateRange : undefined
        }),
        dashboardService.getExecutiveDashboard()
      ]);
      setItems(deptProgress);
      if (dashData?.projectsList) {
        setProjects(dashData.projectsList);
      }
    } catch (err) {
      console.error('[DepartmentProgressPage] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, dateRange]);

  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);

  const formattedBid = (val?: number) => {
    if (val === undefined || val === null) return '0.00 Bid';
    return `${val.toFixed(2)} Bid`;
  };

  const totalEstimatedBid = items.reduce((acc, i) => acc + (i.estimatedBid || 0), 0);
  const totalTargetBid = items.reduce((acc, i) => acc + (i.targetBid || 0), 0);
  const totalActualBid = items.reduce((acc, i) => acc + (i.actualBid || 0), 0);
  const totalRemainingBid = items.reduce((acc, i) => acc + (i.remainingBid || 0), 0);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 pb-24">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="text-crimson w-5 h-5" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">PRODUCTION OPERATIONS</span>
            </div>
            <h1 className="text-4xl font-headline text-white mb-2">Department Production Progress</h1>
            <p className="text-muted-foreground">Departmental throughput, task status distribution, and Bid volume tracking.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadProgressData} disabled={loading} className="gap-2 border-sidebar-border">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh Metrics
            </Button>
          </div>
        </div>

        {/* Filter Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border border-sidebar-border shadow-md">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-crimson shrink-0" />
              <span className="text-xs text-muted-foreground uppercase font-bold">Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-sidebar border border-sidebar-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-crimson"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.projectName} ({p.projectCode})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-crimson shrink-0" />
              <span className="text-xs text-muted-foreground uppercase font-bold">Timeframe:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-sidebar border border-sidebar-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-crimson"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-mono text-muted-foreground">
            Authoritative SQL Server Calculations (1 Bid = 8 Hours)
          </div>
        </div>

        {/* Studio Bid Overview Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border-none p-6 shadow-xl">
            <p className="text-xs font-bold text-muted-foreground uppercase">Total Estimated Bid</p>
            <h3 className="text-3xl font-headline text-white mt-1">{formattedBid(totalEstimatedBid)}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">Planned Production Volume</p>
          </Card>

          <Card className="bg-card border-none p-6 shadow-xl">
            <p className="text-xs font-bold text-muted-foreground uppercase">Allocated Target Bid</p>
            <h3 className="text-3xl font-headline text-yellow-400 mt-1">{formattedBid(totalTargetBid)}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">Allocated Artist Targets</p>
          </Card>

          <Card className="bg-card border-none p-6 shadow-xl">
            <p className="text-xs font-bold text-muted-foreground uppercase">Actual Worked Bid</p>
            <h3 className="text-3xl font-headline text-emerald-400 mt-1">{formattedBid(totalActualBid)}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">Logged Execution Time</p>
          </Card>

          <Card className="bg-card border-none p-6 shadow-xl">
            <p className="text-xs font-bold text-muted-foreground uppercase">Remaining Bid</p>
            <h3 className="text-3xl font-headline text-crimson mt-1">{formattedBid(totalRemainingBid)}</h3>
            <p className="text-[10px] text-muted-foreground mt-2 uppercase font-semibold">Outstanding Target Balance</p>
          </Card>
        </div>

        {/* Department Stage Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((dept) => (
            <Card key={dept.stageId || dept.department} className="bg-card border-none shadow-xl p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-crimson/10 rounded-xl">
                  <Layers className="text-crimson w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Completion Rate</p>
                  <h3 className="text-3xl font-headline text-white">{dept.completionRate}%</h3>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-white font-bold text-base">{dept.department}</span>
                  <span className="text-muted-foreground font-mono">{dept.completed} / {dept.totalTasks} Done</span>
                </div>
                <Progress value={dept.completionRate} className="h-2 bg-sidebar-accent" />
              </div>

              <div className="space-y-2 pt-2 border-t border-sidebar-border text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Unassigned Tasks:</span>
                  <span className="font-mono text-amber-400 font-bold">{dept.unassigned}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>In Progress Tasks:</span>
                  <span className="font-mono text-blue-400 font-bold">{dept.inProgress}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Pending Review:</span>
                  <span className="font-mono text-amber-300 font-bold">{dept.review}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Rework Tasks:</span>
                  <span className="font-mono text-purple-400 font-bold">{dept.rework}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-sidebar-border grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase">Target Bid</span>
                  <span className="text-yellow-400 font-bold">{formattedBid(dept.targetBid)}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[9px] uppercase">Actual Worked</span>
                  <span className="text-emerald-400 font-bold">{formattedBid(dept.actualBid)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Detailed Department Production Matrix Table */}
        <Card className="bg-card border-none shadow-2xl overflow-hidden">
          <CardHeader className="bg-sidebar-accent/30 border-b border-sidebar-border py-4">
            <CardTitle className="text-white text-base font-bold uppercase tracking-wider font-headline flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-crimson" /> Department Operations Matrix
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-sidebar-accent/50 text-[11px] uppercase font-bold text-muted-foreground">
                <TableRow className="border-sidebar-border h-12">
                  <TableHead className="pl-6">Department Stage</TableHead>
                  <TableHead className="text-center">Total Tasks</TableHead>
                  <TableHead className="text-center">Unassigned</TableHead>
                  <TableHead className="text-center">Assigned</TableHead>
                  <TableHead className="text-center">In Progress</TableHead>
                  <TableHead className="text-center">Review</TableHead>
                  <TableHead className="text-center">Rework</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-right">Estimated Bid</TableHead>
                  <TableHead className="text-right">Target Bid</TableHead>
                  <TableHead className="text-right">Actual Bid</TableHead>
                  <TableHead className="pr-6 text-right">Remaining Bid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.stageId || r.department} className="border-sidebar-border h-16 hover:bg-sidebar-accent/20 transition-colors text-xs font-mono">
                    <TableCell className="pl-6 font-bold text-white font-sans text-sm">{r.department}</TableCell>
                    <TableCell className="text-center font-bold text-white">{r.totalTasks}</TableCell>
                    <TableCell className="text-center text-amber-400">{r.unassigned}</TableCell>
                    <TableCell className="text-center text-blue-400">{r.assigned}</TableCell>
                    <TableCell className="text-center text-blue-500">{r.inProgress}</TableCell>
                    <TableCell className="text-center text-amber-300">{r.review}</TableCell>
                    <TableCell className="text-center text-purple-400">{r.rework}</TableCell>
                    <TableCell className="text-center text-emerald-400 font-bold">{r.completed}</TableCell>
                    <TableCell className="text-right text-white">{formattedBid(r.estimatedBid)}</TableCell>
                    <TableCell className="text-right text-yellow-400 font-bold">{formattedBid(r.targetBid)}</TableCell>
                    <TableCell className="text-right text-emerald-400 font-bold">{formattedBid(r.actualBid)}</TableCell>
                    <TableCell className="pr-6 text-right text-crimson font-bold">{formattedBid(r.remainingBid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
