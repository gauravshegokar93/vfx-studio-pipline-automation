"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projectService, DBProject, DBReel, DBSequence, DBShot } from '@/services/projectService';
import {
  Projector,
  Layers,
  Film,
  Search,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Loader2,
  Tv,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Trash2,
  AlertOctagon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProductionProjectsPage() {
  const { role: authRole } = useAuth();
  const isAdmin = authRole === 'Super Admin' || authRole === 'Admin';

  // Navigation & View State
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for Project List
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Detail View State
  const [activeProjectId, setActiveProjectId] = useState<string | number | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [activeProjectData, setActiveProjectData] = useState<{
    project: DBProject;
    reels: DBReel[];
    sequences: DBSequence[];
    shots: DBShot[];
  } | null>(null);

  // Deletion Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeletingProject, setIsDeletingProject] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteProjectConfirm = async () => {
    if (!activeProjectId) return;
    setIsDeletingProject(true);
    setDeleteError(null);
    try {
      const res = await projectService.deleteProject(activeProjectId);
      if (res && res.success) {
        setShowDeleteConfirm(false);
        setActiveProjectId(null);
        setActiveProjectData(null);
        loadProjects();
      } else {
        setDeleteError(res.message || 'Failed to delete project.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete project.';
      setDeleteError(msg);
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Hierarchy Navigation inside Detail View
  const [selectedReelId, setSelectedReelId] = useState<string | number | 'all'>('all');
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | number | 'all'>('all');
  const [shotSearchQuery, setShotSearchQuery] = useState<string>('');

  // Fetch Projects List on Mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err: any) {
      console.error('[ProjectsPage] Failed to load projects:', err);
      setError(err?.response?.data?.message || 'Failed to load projects from production database.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Project Hierarchy when a project is selected
  const handleSelectProject = async (projectId: string | number) => {
    setActiveProjectId(projectId);
    setDetailLoading(true);
    setSelectedReelId('all');
    setSelectedSequenceId('all');
    setShotSearchQuery('');
    try {
      const res = await projectService.getProjectHierarchy(projectId);
      if (res.success) {
        setActiveProjectData({
          project: res.project,
          reels: res.reels || [],
          sequences: res.sequences || [],
          shots: res.shots || []
        });
      }
    } catch (err: any) {
      console.error('[ProjectsPage] Failed to load project hierarchy:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Filtered Project List
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch =
        p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.clientName && p.clientName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Filtered Sequences for Active Project
  const availableSequences = useMemo(() => {
    if (!activeProjectData) return [];
    if (selectedReelId === 'all') return activeProjectData.sequences;
    return activeProjectData.sequences.filter(s => String(s.reelId) === String(selectedReelId));
  }, [activeProjectData, selectedReelId]);

  // Filtered Shots for Active Project
  const filteredShots = useMemo(() => {
    if (!activeProjectData) return [];
    return activeProjectData.shots.filter(sh => {
      const matchesReel = selectedReelId === 'all' || String(sh.reelId) === String(selectedReelId);
      const matchesSeq = selectedSequenceId === 'all' || String(sh.sequenceId) === String(selectedSequenceId);
      const matchesSearch = !shotSearchQuery || sh.shotCode.toLowerCase().includes(shotSearchQuery.toLowerCase());
      return matchesReel && matchesSeq && matchesSearch;
    });
  }, [activeProjectData, selectedReelId, selectedSequenceId, shotSearchQuery]);

  // Create Project Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newProjectCode, setNewProjectCode] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newClientName, setNewClientName] = useState<string>('');
  const [newStartDate, setNewStartDate] = useState<string>('');
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('In-Production');
  const [bidFile, setBidFile] = useState<File | null>(null);
  const [isSubmittingProject, setIsSubmittingProject] = useState<boolean>(false);

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectCode.trim() || !newProjectName.trim()) {
      alert('Project Code and Project Name are required.');
      return;
    }
    setIsSubmittingProject(true);
    try {
      const created = await projectService.createProject({
        projectCode: newProjectCode.trim(),
        projectName: newProjectName.trim(),
        clientName: newClientName.trim() || undefined,
        startDate: newStartDate || undefined,
        endDate: newEndDate || undefined,
        status: newStatus
      });

      if (bidFile && created?.id) {
        const { importService } = await import('@/services/importService');
        await importService.uploadExcel(bidFile, Number(created.id));
      }

      setShowCreateModal(false);
      setNewProjectCode('');
      setNewProjectName('');
      setNewClientName('');
      setNewStartDate('');
      setNewEndDate('');
      setBidFile(null);
      loadProjects();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to create project');
    } finally {
      setIsSubmittingProject(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto bg-slate-950/40">
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Projector className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Production Database Hierarchy
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                VFX Projects Module
                {activeProjectData && (
                  <Badge variant="outline" className="text-crimson border-crimson/40 text-xs">
                    {activeProjectData.project.projectCode}
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Production-approved hierarchy: Project → Reel → Sequence → Shot units
              </p>
            </div>

            <div className="flex gap-2 items-center">
              {!activeProjectId && (
                <Button onClick={() => setShowCreateModal(true)} className="bg-crimson hover:bg-crimson/90">
                  + Create Project
                </Button>
              )}
              {activeProjectId && (
                <>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteError(null);
                        setShowDeleteConfirm(true);
                      }}
                      className="bg-red-600/90 hover:bg-red-700 text-white gap-2 font-semibold text-xs"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Project
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveProjectId(null);
                      setActiveProjectData(null);
                    }}
                    className="gap-2 border-border/60 hover:border-border"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Projects List
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ERROR STATE */}

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* MAIN CONTAINER: LIST VIEW vs DETAIL HIERARCHY VIEW */}
          {!activeProjectId ? (
            /* ==================== PROJECT LIST VIEW ==================== */
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 p-4 rounded-xl border border-border/50">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by project name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background/50 border-border/60"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-44 bg-background/50 border-border/60">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="In-Production">In-Production</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-crimson" />
                  <p className="text-sm font-medium">Querying production database...</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border/60 rounded-2xl bg-card/20 text-center">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1">No Projects Found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    No matching production projects found in database. Approved imports will automatically appear here.
                  </p>
                </div>
              ) : (
                /* Projects Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((p) => (
                    <Card
                      key={p.id}
                      onClick={() => handleSelectProject(p.id)}
                      className="bg-card/70 border-border/60 hover:border-crimson/50 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <CardHeader className="pb-3 border-b border-border/30">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-crimson tracking-wider">
                            {p.projectCode}
                          </span>
                          <Badge
                            className={cn(
                              "text-[10px] uppercase font-semibold border-none px-2 py-0.5",
                              p.status === 'Approved' ? "bg-emerald-500/20 text-emerald-400" :
                              p.status === 'Completed' ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
                            )}
                          >
                            {p.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg font-bold text-white leading-snug">
                          {p.projectName}
                        </CardTitle>
                        {p.clientName && (
                          <p className="text-xs text-muted-foreground">Client: {p.clientName}</p>
                        )}
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4 text-xs">
                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-background/40 border border-border/40">
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Reels</span>
                            <span className="font-mono font-bold text-sm text-white">{p.reelCount}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Shots</span>
                            <span className="font-mono font-bold text-sm text-white">{p.shotCount}</span>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {p.startDate ? String(p.startDate).split('T')[0] : 'N/A'}
                          </span>
                          <span>→</span>
                          <span>{p.endDate ? String(p.endDate).split('T')[0] : 'N/A'}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                            <span>Production Progress</span>
                            <span className="font-mono text-white">{p.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-crimson transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ==================== PROJECT HIERARCHY DETAIL VIEW ==================== */
            <div>
              {detailLoading || !activeProjectData ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-crimson" />
                  <p className="text-sm font-medium">Loading project production hierarchy...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Project Overview Card */}
                  <Card className="bg-card/80 border-border/60">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white">
                              {activeProjectData.project.projectName}
                            </h2>
                            <Badge className="bg-crimson/20 text-crimson border-crimson/40 font-mono">
                              {activeProjectData.project.projectCode}
                            </Badge>
                            <Badge variant="outline" className="text-xs uppercase">
                              {activeProjectData.project.status}
                            </Badge>
                          </div>
                          {activeProjectData.project.clientName && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Client: {activeProjectData.project.clientName}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <span className="text-xs text-muted-foreground block uppercase">Total Reels</span>
                            <span className="font-mono font-bold text-white">{activeProjectData.project.reelCount}</span>
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-muted-foreground block uppercase">Total Shots</span>
                            <span className="font-mono font-bold text-white">{activeProjectData.project.shotCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress & Hierarchy Filter */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                        {/* Reel Selector */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Tv className="w-4 h-4 text-crimson" /> Select Reel:
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant={selectedReelId === 'all' ? 'default' : 'outline'}
                              onClick={() => {
                                setSelectedReelId('all');
                                setSelectedSequenceId('all');
                              }}
                              className={cn(selectedReelId === 'all' && "bg-crimson text-white")}
                            >
                              All Reels ({activeProjectData.reels.length})
                            </Button>
                            {activeProjectData.reels.map(r => (
                              <Button
                                key={r.reelId}
                                size="sm"
                                variant={selectedReelId === r.reelId ? 'default' : 'outline'}
                                onClick={() => {
                                  setSelectedReelId(r.reelId);
                                  setSelectedSequenceId('all');
                                }}
                                className={cn(selectedReelId === r.reelId && "bg-crimson text-white")}
                              >
                                Reel {r.reelName} ({r.shotCount})
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Shot Search Input */}
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Filter shots by code..."
                            value={shotSearchQuery}
                            onChange={(e) => setShotSearchQuery(e.target.value)}
                            className="pl-9 bg-background/50 border-border/60 text-xs"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sequence Tabs */}
                  {availableSequences.length > 0 && (
                    <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-1">
                        <Layers className="w-4 h-4 text-blue-400" /> Sequence:
                      </span>
                      <Button
                        size="sm"
                        variant={selectedSequenceId === 'all' ? 'secondary' : 'ghost'}
                        onClick={() => setSelectedSequenceId('all')}
                        className="text-xs"
                      >
                        All Sequences ({availableSequences.length})
                      </Button>
                      {availableSequences.map(s => (
                        <Button
                          key={s.sequenceId}
                          size="sm"
                          variant={selectedSequenceId === s.sequenceId ? 'secondary' : 'ghost'}
                          onClick={() => setSelectedSequenceId(s.sequenceId)}
                          className={cn("text-xs font-mono", selectedSequenceId === s.sequenceId && "border border-blue-500/40 text-blue-400")}
                        >
                          SEQ_{s.sequenceCode} ({s.shotCount})
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Shots View */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Film className="w-5 h-5 text-purple-400" />
                        Shots ({filteredShots.length})
                      </h3>
                    </div>

                    {filteredShots.length === 0 ? (
                      <div className="py-16 text-center border border-dashed border-border/60 rounded-xl bg-card/20">
                        <p className="text-sm text-muted-foreground">No shots found matching the selected Reel / Sequence / search criteria.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredShots.map(sh => (
                          <Card key={sh.shotId} className="bg-card/70 border-border/60 hover:border-purple-500/40 transition-colors">
                            <CardContent className="p-4 space-y-3">
                              {/* Shot Header */}
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-mono font-bold text-white text-sm tracking-tight">
                                  {sh.shotCode}
                                </span>
                                <Badge variant="outline" className="text-[10px] uppercase border-emerald-500/40 text-emerald-400">
                                  {sh.status}
                                </Badge>
                              </div>

                              {/* Thumbnail Display (Only if real ThumbnailPath exists) */}
                              {sh.thumbnailPath ? (
                                <div className="w-full h-32 rounded-lg overflow-hidden bg-black/60 border border-border/40 relative">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={sh.thumbnailPath}
                                    alt={sh.shotCode}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : null}

                              {/* Frame Range & Duration */}
                              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-background/50 border border-border/40 text-center font-mono text-xs">
                                <div>
                                  <span className="text-[9px] text-muted-foreground block uppercase font-sans">Start</span>
                                  <span className="text-white font-medium">{sh.frameStart ?? '-'}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-muted-foreground block uppercase font-sans">End</span>
                                  <span className="text-white font-medium">{sh.frameEnd ?? '-'}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-muted-foreground block uppercase font-sans">Duration</span>
                                  <span className="text-crimson font-bold">{sh.duration ? `${sh.duration}f` : '-'}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-white shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center justify-between">
                  <span>Create Production Project</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>✕</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Project Code *</label>
                      <Input
                        placeholder="e.g. PRJ_AVATAR"
                        value={newProjectCode}
                        onChange={e => setNewProjectCode(e.target.value)}
                        required
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Project Name *</label>
                      <Input
                        placeholder="e.g. Avatar 3"
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        required
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Client Name</label>
                      <Input
                        placeholder="e.g. Lightstorm"
                        value={newClientName}
                        onChange={e => setNewClientName(e.target.value)}
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger className="bg-slate-950 border-slate-800">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In-Production">In-Production</SelectItem>
                          <SelectItem value="Planning">Planning</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Start Date</label>
                      <Input
                        type="date"
                        value={newStartDate}
                        onChange={e => setNewStartDate(e.target.value)}
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">End Date</label>
                      <Input
                        type="date"
                        value={newEndDate}
                        onChange={e => setNewEndDate(e.target.value)}
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-3">
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Attach Bid Sheet Excel (Optional)
                    </label>
                    <Input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={e => setBidFile(e.target.files ? e.target.files[0] : null)}
                      className="bg-slate-950 border-slate-800"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Shot-level bids (Roto, Paint, Comp, CG, ETA, SOW) will be parsed from the uploaded Excel sheet.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmittingProject} className="bg-crimson hover:bg-crimson/90">
                      {isSubmittingProject ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create Project
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Permanent Project Delete Confirmation Modal */}
        {showDeleteConfirm && activeProjectData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <Card className="w-full max-w-lg bg-slate-900 border-red-900/60 text-white shadow-2xl">
              <CardHeader className="border-b border-red-900/40 pb-4">
                <CardTitle className="text-xl font-bold text-red-400 flex items-center gap-2">
                  <AlertOctagon className="w-6 h-6 text-red-500" />
                  Delete Project Permanently?
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Are you sure you want to permanently delete project{' '}
                  <strong className="text-white font-bold">{activeProjectData.project.projectName}</strong>{' '}
                  (<span className="font-mono text-red-400">{activeProjectData.project.projectCode}</span>)?
                </p>

                <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-xs text-red-300 space-y-2">
                  <p className="font-bold uppercase tracking-wider text-[11px] text-red-400">
                    Warning — Destruction Scope:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>Project Master record ({activeProjectData.project.projectCode})</li>
                    <li>{activeProjectData.project.reelCount} Reels & Sequences</li>
                    <li>{activeProjectData.project.shotCount} Shots & associated Tasks</li>
                    <li>Task Assignments & Assignment History</li>
                    <li>Time Logs & Active Work Sessions</li>
                    <li>Review & Rework Iteration Records</li>
                    <li>Import Batches & Parsed Row Data</li>
                  </ul>
                  <p className="text-[11px] text-slate-400 border-t border-red-900/30 pt-2 font-medium">
                    ✓ Shared users, roles, departments, teams, and master settings will NOT be deleted.
                  </p>
                </div>

                {deleteError && (
                  <div className="p-3 rounded-md bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold">
                    {deleteError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletingProject}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleDeleteProjectConfirm} 
                    disabled={isDeletingProject} 
                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    {isDeletingProject ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Permanently Delete Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}


