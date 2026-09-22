"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { formatDateLocal } from '@/lib/formatTime';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  analyticsService,
  AnalyticsResponse,
  AnalyticsFilterParams
} from '@/services/analyticsService';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  BarChart3,
  Target,
  Clock,
  AlertTriangle,
  Layers,
  TrendingUp,
  RefreshCw,
  Filter,
  Calendar,
  Users,
  Briefcase,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  PieChart as PieIcon,
  Activity,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const router = useRouter();

  // Filters State
  const [projectId, setProjectId] = useState<string>('all');
  const [stageId, setStageId] = useState<string>('all');
  const [artistId, setArtistId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [complexity, setComplexity] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Data & UI State
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AnalyticsFilterParams = {
        projectId,
        stageId,
        artistId,
        complexity,
        dateRange,
        ...(dateRange === 'custom' ? { startDate, endDate } : {})
      };
      const res = await analyticsService.getAnalyticsData(params);
      if (res && res.success) {
        setData(res);
      } else {
        setError('Failed to load studio analytics data from backend.');
      }
    } catch (err: any) {
      console.error('[AnalyticsPage] Error:', err);
      setError(err.message || 'An unexpected error occurred while fetching analytics.');
    } finally {
      setLoading(false);
    }
  }, [projectId, stageId, artistId, complexity, dateRange, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const kpis = data?.kpis;
  const options = data?.options;

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 pb-24 text-white">

        {/* 1. HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sidebar-border/40 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="text-crimson w-5 h-5" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                VFX Studio Intelligence
              </span>
            </div>
            <h1 className="text-3xl font-headline font-bold text-white tracking-tight">
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Studio-wide production intelligence and performance analytics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              disabled={loading}
              className="bg-card border-sidebar-border text-xs font-semibold hover:bg-sidebar-accent"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* 2. GLOBAL FILTERS */}
        <Card className="bg-card/80 backdrop-blur border-sidebar-border shadow-xl">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Filter className="w-4 h-4 text-crimson" />
                <span>Filters:</span>
              </div>

              {/* Project Filter */}
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="w-[180px] h-9 text-xs bg-sidebar border-sidebar-border">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-sidebar-border text-white text-xs">
                    <SelectItem value="all">All Projects</SelectItem>
                    {options?.projects.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.projectCode} - {p.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department / Stage Filter */}
              <div className="flex flex-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger className="w-[150px] h-9 text-xs bg-sidebar border-sidebar-border">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-sidebar-border text-white text-xs">
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="1">Roto</SelectItem>
                    <SelectItem value="2">Paint</SelectItem>
                    <SelectItem value="3">Comp</SelectItem>
                    <SelectItem value="4">CG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Complexity Filter */}
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <Select value={complexity} onValueChange={setComplexity}>
                  <SelectTrigger className="w-[150px] h-9 text-xs bg-sidebar border-sidebar-border">
                    <SelectValue placeholder="All Complexities" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-sidebar-border text-white text-xs">
                    <SelectItem value="all">All Complexities</SelectItem>
                    {options?.complexities?.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[150px] h-9 text-xs bg-sidebar border-sidebar-border">
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-sidebar-border text-white text-xs">
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Pickers */}
              {dateRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 px-3 rounded-md bg-sidebar border border-sidebar-border text-xs text-white"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 px-3 rounded-md bg-sidebar border border-sidebar-border text-xs text-white"
                  />
                </div>
              )}

              {/* Artist Filter */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Select value={artistId} onValueChange={setArtistId}>
                  <SelectTrigger className="w-[180px] h-9 text-xs bg-sidebar border-sidebar-border">
                    <SelectValue placeholder="All Artists" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-sidebar-border text-white text-xs">
                    <SelectItem value="all">All Artists</SelectItem>
                    {options?.artists.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.fullName} ({a.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Button */}
              {(projectId !== 'all' || stageId !== 'all' || artistId !== 'all' || complexity !== 'all' || dateRange !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setProjectId('all');
                    setStageId('all');
                    setArtistId('all');
                    setComplexity('all');
                    setDateRange('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="h-9 text-xs text-muted-foreground hover:text-white"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ERROR STATE */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-red-400">
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold">Analytics API Error</p>
                <p className="text-xs text-red-300/80">{error}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={fetchAnalytics} className="border-red-500/40 text-red-300 hover:bg-red-500/20">
              Retry
            </Button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && !data && (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin text-crimson" />
            <p className="text-sm font-semibold">Aggregating production telemetry from SQL Server...</p>
          </div>
        )}

        {/* MAIN DASHBOARD CONTENT */}
        {data && (
          <div className="space-y-8">

            {/* 3. KPI SUMMARY GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <Card className="bg-card border-sidebar-border p-4 flex flex-col justify-between shadow-lg">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Active Projects</p>
                <h3 className="text-2xl font-headline font-bold text-white mt-1">{kpis?.activeProjects}</h3>
                <p className="text-[10px] text-muted-foreground mt-2">Live Productions</p>
              </Card>

              <Card className="bg-card border-sidebar-border p-4 flex flex-col justify-between shadow-lg">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Shots</p>
                <h3 className="text-2xl font-headline font-bold text-white mt-1">{kpis?.totalShots}</h3>
                <p className="text-[10px] text-muted-foreground mt-2">Tracked Shots</p>
              </Card>

              <Card className="bg-card border-sidebar-border p-4 flex flex-col justify-between shadow-lg">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Active Tasks</p>
                <h3 className="text-2xl font-headline font-bold text-white mt-1">{kpis?.activeTasks}</h3>
                <p className="text-[10px] text-muted-foreground mt-2">Production Scope</p>
              </Card>

              <Card className="bg-card border-sidebar-border p-4 flex flex-col justify-between shadow-lg">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Active Artists</p>
                <h3 className="text-2xl font-headline font-bold text-white mt-1">{kpis?.activeArtists}</h3>
                <p className="text-[10px] text-muted-foreground mt-2">Assigned Talent</p>
              </Card>

              <Card className="bg-card border-sidebar-border p-4 flex flex-col justify-between shadow-lg">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Estimated</p>
                <h3 className="text-2xl font-headline font-bold text-white mt-1">{kpis?.estimatedBid} Bid</h3>
              </Card>

              <Card className="bg-card border-sidebar-border p-4 flex flex-col justify-between shadow-lg">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Target</p>
                <h3 className="text-2xl font-headline font-bold text-cyan-400 mt-1">{kpis?.allocatedTargetBid} Bid</h3>
              </Card>

              <Card className="bg-card border-sidebar-border p-4 flex flex-col justify-between shadow-lg">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Actual Logged</p>
                <h3 className="text-2xl font-headline font-bold text-green-400 mt-1">{kpis?.actualBid} Bid</h3>
              </Card>

              <Card className="bg-card border-sidebar-border p-4 flex flex-col justify-between shadow-lg">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Remaining</p>
                <h3 className="text-2xl font-headline font-bold text-amber-400 mt-1">{kpis?.remainingBid} Bid</h3>
              </Card>
            </div>

            {/* STATUS BREAKDOWN BADGES */}
            <Card className="bg-sidebar-accent/20 border border-sidebar-border p-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">
                    Unassigned: {kpis?.unassignedTasks}
                  </Badge>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Assigned: {kpis?.assignedTasks}
                  </Badge>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    In Progress: {kpis?.inProgressTasks}
                  </Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    Review: {kpis?.reviewTasks}
                  </Badge>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    Rework: {kpis?.reworkTasks}
                  </Badge>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Completed: {kpis?.completedTasks}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-crimson/20 text-crimson border-crimson/40 px-3 py-1 font-bold">
                    Overdue Tasks: {kpis?.overdueTasks}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* CHARTS GRID — ROW 1: STATUS DISTRIBUTION & DEPARTMENT WORKLOAD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* 5. TASK STATUS DISTRIBUTION (PIE/DONUT CHART) */}
              <Card className="bg-card border-sidebar-border shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white font-headline flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-crimson" />
                    Task Status Distribution
                  </CardTitle>
                  <CardDescription>
                    Current distribution of studio production tasks by workflow status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.taskStatusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="count"
                        label={({ name, count }) => (count > 0 ? `${name}: ${count}` : '')}
                      >
                        {data.taskStatusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                        formatter={(val: number) => [`${val} tasks`, 'Count']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 6. DEPARTMENT WORKLOAD (STACKED BAR CHART) */}
              <Card className="bg-card border-sidebar-border shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white font-headline flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" />
                    Department Production Status
                  </CardTitle>
                  <CardDescription>
                    Task volume by status across workflow stages (Roto, Paint, Comp, CG).
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.departmentWorkload}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="stageName" stroke="#a1a1aa" fontSize={12} />
                      <YAxis stroke="#a1a1aa" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} />
                      <Legend />
                      <Bar dataKey="unassigned" name="Unassigned" stackId="a" fill="#6b7280" />
                      <Bar dataKey="assigned" name="Assigned" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#06b6d4" />
                      <Bar dataKey="review" name="Review" stackId="a" fill="#eab308" />
                      <Bar dataKey="rework" name="Rework" stackId="a" fill="#ef4444" />
                      <Bar dataKey="completed" name="Completed" stackId="a" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

            </div>

            {/* CHARTS GRID — ROW 2: PROJECT PROGRESS & BID VS ACTUAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* 7. PROJECT PRODUCTION PROGRESS (HORIZONTAL BAR CHART) */}
              <Card className="bg-card border-sidebar-border shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white font-headline flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Project Production Progress
                  </CardTitle>
                  <CardDescription>
                    Production completion % per live project (Completed Tasks / Total Tasks * 100).
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.projectProgress}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis type="number" domain={[0, 100]} unit="%" stroke="#a1a1aa" fontSize={12} />
                      <YAxis type="category" dataKey="projectCode" stroke="#a1a1aa" fontSize={12} width={70} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                        formatter={(val: number) => [`${val}%`, 'Completion Rate']}
                      />
                      <Bar dataKey="completionRate" name="Completion %" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 8. BID VS ACTUAL PRODUCTION (GROUPED BAR CHART) */}
              <Card className="bg-card border-sidebar-border shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white font-headline flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-400" />
                    Bid vs Actual Production
                  </CardTitle>
                  <CardDescription>
                    Comparison of Estimated Bid, Target Allocated Bid, and Actual Worked Bid by project.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.bidVsActual}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="projectCode" stroke="#a1a1aa" fontSize={12} />
                      <YAxis stroke="#a1a1aa" fontSize={12} unit=" Bid" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                        formatter={(val: number) => [`${val} Bid`, 'Bid Value']}
                      />
                      <Legend />
                      <Bar dataKey="estimatedBid" name="Estimated Bid" fill="#64748b" />
                      <Bar dataKey="targetBid" name="Target Allocated Bid" fill="#38bdf8" />
                      <Bar dataKey="actualBid" name="Actual Worked Bid" fill="#4ade80" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

            </div>

            {/* CHARTS GRID — ROW 3: ARTIST WORKLOAD & PRODUCTION TREND */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* 9. ARTIST WORKLOAD CHART */}
              <Card className="bg-card border-sidebar-border shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white font-headline flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-purple-400" />
                    Artist Workload Allocation
                  </CardTitle>
                  <CardDescription>
                    Target Allocated Bid vs Actual Worked Bid per active artist.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.artistWorkload.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis type="number" stroke="#a1a1aa" fontSize={12} unit=" Bid" />
                      <YAxis type="category" dataKey="artistName" stroke="#a1a1aa" fontSize={12} width={110} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                        formatter={(val: number) => [`${val} Bid`, 'Bid Value']}
                      />
                      <Legend />
                      <Bar dataKey="targetBid" name="Target Allocated Bid" fill="#a855f7" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="actualBid" name="Actual Worked Bid" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 10. PRODUCTION TREND (LINE CHART) */}
              <Card className="bg-card border-sidebar-border shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white font-headline flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Actual Production Trend
                  </CardTitle>
                  <CardDescription>
                    Actual logged production converted from hours to Bid (TimeLog.WorkDate).
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {data.productionTrend.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                      No time log entries recorded for selected date range.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.productionTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="workDate" stroke="#a1a1aa" fontSize={12} />
                        <YAxis stroke="#a1a1aa" fontSize={12} unit=" Bid" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                          formatter={(val: number) => [`${val} Bid`, 'Worked Bid']}
                        />
                        <Line type="monotone" dataKey="actualBid" name="Actual Worked Bid" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* ARTIST WORKLOAD DETAILED ROSTER TABLE */}
            <Card className="bg-card border-sidebar-border shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white font-headline flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Artist Workload Roster
                </CardTitle>
                <CardDescription>
                  Active artist production breakdown ordered by Target Allocated Bid descending.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-sidebar border-b border-sidebar-border text-muted-foreground uppercase text-[10px] font-bold">
                      <th className="p-4">Artist</th>
                      <th className="p-4">Department</th>
                      <th className="p-4 text-center">Active Tasks</th>
                      <th className="p-4 text-center">In Progress</th>
                      <th className="p-4 text-center" title="Total Review Submissions">Reviews</th>
                      <th className="p-4 text-center" title="Total Rework Instances">Reworks</th>
                      <th className="p-4 text-center">Completed</th>
                      <th className="p-4 text-center">Overdue</th>
                      <th className="p-4 text-center">Complexity</th>
                      <th className="p-4 text-right">Target Bid</th>
                      <th className="p-4 text-right">Actual Bid</th>
                      <th className="p-4 text-right">Remaining Bid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sidebar-border/50 font-medium">
                    {data.artistWorkload.tableData.map(a => (
                      <tr key={a.artistId} className="hover:bg-sidebar-accent/30 transition-colors">
                        <td className="p-4 font-bold text-white">
                          {a.artistName}
                          <span className="block text-[10px] font-normal text-muted-foreground">{a.employeeCode}</span>
                        </td>
                        <td className="p-4 text-muted-foreground">{a.department}</td>
                        <td className="p-4 text-center font-bold text-white">{a.activeTasks}</td>
                        <td className="p-4 text-center text-blue-400 font-bold">{a.inProgress || '-'}</td>
                        <td className="p-4 text-center text-amber-400 font-bold">{a.reviewSubmissions || '-'}</td>
                        <td className="p-4 text-center text-purple-400 font-bold">{a.historicalReworkCount || '-'}</td>
                        <td className="p-4 text-center text-green-400 font-bold">{a.completed || '-'}</td>
                        <td className="p-4 text-center">
                          {a.overdue > 0 ? (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                              {a.overdue}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground font-bold">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center text-[10px] font-mono">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {(() => {
                              const comps = (a.taskComplexities || '').split(',').filter(Boolean);
                              const counts = comps.reduce((acc: Record<string, number>, c: string) => {
                                acc[c] = (acc[c] || 0) + 1;
                                return acc;
                              }, {});
                              return Object.entries(counts).map(([comp, count], i) => (
                                <Badge key={i} variant="outline" className={cn(
                                  "uppercase text-[9px] font-bold px-1 py-0",
                                  comp.toLowerCase().includes('hard') ? "text-red-400 border-red-400/30 bg-red-400/10" :
                                  comp.toLowerCase().includes('mid') ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                                  comp.toLowerCase().includes('easy') ? "text-green-400 border-green-400/30 bg-green-400/10" :
                                  "text-blue-400 border-blue-400/30 bg-blue-400/10"
                                )}>
                                  {count > 1 ? `${count}x ` : ''}{comp}
                                </Badge>
                              ));
                            })()}
                          </div>
                        </td>
                        <td className="p-4 text-right font-bold text-yellow-400 font-mono">{a.targetBid} Bid</td>
                        <td className="p-4 text-right font-bold text-emerald-400 font-mono">{a.actualBid} Bid</td>
                        <td className="p-4 text-right font-bold text-crimson font-mono">{a.remainingBid} Bid</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* 11. REVIEW / REWORK ANALYTICS & QUEUE METRICS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* REVIEW OUTCOMES CHART */}
              <Card className="bg-card border-sidebar-border shadow-2xl lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white font-headline flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                    Review Outcomes Composition
                  </CardTitle>
                  <CardDescription>
                    Historical review status distribution from TaskReview records.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.reviewAnalytics.outcomes}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="count"
                        label={({ name, count }) => `${name}: ${count}`}
                      >
                        {data.reviewAnalytics.outcomes.map((entry, idx) => (
                          <Cell key={`rev-cell-${idx}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* CURRENT QUEUE CARDS */}
              <div className="space-y-6 flex flex-col justify-between">
                <Card className="bg-card border-sidebar-border p-6 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Current Review Queue</p>
                      <h3 className="text-4xl font-headline font-bold text-yellow-400 mt-2">
                        {data.reviewAnalytics.reviewQueueCount}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2">Tasks in Status 3 (Review)</p>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      Pending QC
                    </Badge>
                  </div>
                </Card>

                <Card className="bg-card border-sidebar-border p-6 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Current Rework Queue</p>
                      <h3 className="text-4xl font-headline font-bold text-red-500 mt-2">
                        {data.reviewAnalytics.reworkQueueCount}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2">Tasks in Status 5 (Rework)</p>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      Action Required
                    </Badge>
                  </div>
                </Card>

                <Card className="bg-card border-sidebar-border p-6 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Total Overdue Pipeline</p>
                      <h3 className="text-4xl font-headline font-bold text-crimson mt-2">
                        {data.overdueAnalytics.totalOverdue}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2">DueDate &lt; Current Date</p>
                    </div>
                    <Badge className="bg-crimson/20 text-crimson border-crimson/40">
                      Overdue
                    </Badge>
                  </div>
                </Card>
              </div>

            </div>

            {/* 12. COMPLEXITY ANALYTICS */}
            {data.complexityAnalytics && data.complexityAnalytics.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-card border-sidebar-border shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-white font-headline flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-400" />
                      Complexity Volume & Delivery
                    </CardTitle>
                    <CardDescription>
                      Task count and delivery consistency (On-Time vs Overdue) per complexity tier.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.complexityAnalytics} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="complexity" stroke="#71717a" tick={{ fill: '#71717a', fontSize: 12 }} />
                        <YAxis stroke="#71717a" tick={{ fill: '#71717a', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                          cursor={{ fill: '#27272a', opacity: 0.4 }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="taskVolume" name="Total Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completedCount" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="overdueCount" name="Overdue" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card border-sidebar-border shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-white font-headline flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      Complexity Effort Variance
                    </CardTitle>
                    <CardDescription>
                      Estimated vs Actual logged hours grouped by shot complexity.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.complexityAnalytics} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="complexity" stroke="#71717a" tick={{ fill: '#71717a', fontSize: 12 }} />
                        <YAxis stroke="#71717a" tick={{ fill: '#71717a', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                          cursor={{ fill: '#27272a', opacity: 0.4 }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="estimatedHours" name="Estimated Hrs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actualHours" name="Actual Hrs" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 13. ATTENTION REQUIRED OPERATIONAL TABLE */}
            <Card className="bg-card border-sidebar-border shadow-2xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white font-headline flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Attention Required — Operational Bottlenecks
                    </CardTitle>
                    <CardDescription>
                      Prioritized list of overdue tasks, unassigned work, rework loops, and pending reviews.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs border-sidebar-border">
                    Showing Top {data.attentionRequired.length} Items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-sidebar border-b border-sidebar-border text-muted-foreground uppercase text-[10px] font-bold">
                      <th className="p-4">Priority</th>
                      <th className="p-4">Task</th>
                      <th className="p-4">Project</th>
                      <th className="p-4">Assigned Artist</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4 text-right">Remaining Bid</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sidebar-border/50 font-medium">
                    {data.attentionRequired.map((item, index) => (
                      <tr
                        key={`attention-${item.taskId}-${index}`}
                        onClick={() => router.push(`/tasks/${item.taskId}`)}
                        className="hover:bg-sidebar-accent/40 cursor-pointer transition-colors"
                      >
                        <td className="p-4">
                          <Badge className={cn(
                            "text-[10px] uppercase font-bold",
                            item.issueReason === 'Overdue' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            item.issueReason === 'In Rework' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                            item.issueReason === 'Pending Review' ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                            "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          )}>
                            {item.issueReason}
                          </Badge>
                        </td>
                        <td className="p-4 font-bold text-white">
                          {item.taskCode}
                          <span className="block text-[10px] font-normal text-muted-foreground">{item.taskName}</span>
                        </td>
                        <td className="p-4 text-muted-foreground font-semibold">{item.projectCode}</td>
                        <td className="p-4 text-white font-medium">{item.artistName}</td>
                        <td className="p-4">
                          <span className={cn(
                            "font-bold",
                            item.status === 'Review' ? "text-yellow-400" :
                            item.status === 'Rework' ? "text-red-400" :
                            item.status === 'In Progress' ? "text-cyan-400" : "text-muted-foreground"
                          )}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {item.dueDate ? formatDateLocal(item.dueDate) : '-'}
                        </td>
                        <td className="p-4 text-right font-bold text-amber-400">
                          {item.remainingBid} Bid
                        </td>
                        <td className="p-4 text-center">
                          <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-sidebar-accent text-muted-foreground hover:text-white">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {data.attentionRequired.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                          No urgent operational issues detected for the selected filter set.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
