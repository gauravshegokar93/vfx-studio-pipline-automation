
"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { projectService } from '@/services/projectService';
import { Project, Sequence, Shot } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Film, Layers, Projector, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const data = await projectService.getAll();
      setProjects(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSelectProject = async (id: string) => {
    setSelectedProjectId(id);
    setSelectedSequenceId(null);
    setShots([]);
    const seqs = await projectService.getSequences(id);
    setSequences(seqs);
  };

  const handleSelectSequence = async (id: string) => {
    setSelectedSequenceId(id);
    const s = await projectService.getShots(id);
    setShots(s);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">Production Hierarchy</h1>
              <p className="text-muted-foreground font-body">Manage Projects, Sequences, and Shots from the single source of truth.</p>
            </div>
            <Button className="bg-crimson">
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Projects Column */}
            <Card className="bg-card border-none shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Projector className="text-crimson w-5 h-5" /> Projects
                </CardTitle>
                <Badge variant="outline">{projects.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? <Skeleton className="h-40 bg-sidebar-accent" /> : projects.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleSelectProject(p.id)}
                    className={cn(
                      "p-4 rounded-lg bg-sidebar-accent/50 border border-sidebar-border cursor-pointer transition-all hover:border-crimson/50",
                      selectedProjectId === p.id && "border-crimson bg-crimson/5"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-crimson uppercase tracking-widest">{p.projectCode}</span>
                      <Badge className="text-[9px] uppercase">{p.status}</Badge>
                    </div>
                    <h4 className="text-white font-bold">{p.projectName}</h4>
                    <p className="text-xs text-muted-foreground">{p.clientName}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Sequences Column */}
            <Card className="bg-card border-none shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Layers className="text-blue-500 w-5 h-5" /> Sequences
                </CardTitle>
                <Badge variant="outline">{sequences.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedProjectId ? (
                  <div className="text-center py-20 text-muted-foreground italic text-sm">Select a project to view sequences</div>
                ) : sequences.map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => handleSelectSequence(s.id)}
                    className={cn(
                      "p-4 rounded-lg bg-sidebar-accent/50 border border-sidebar-border cursor-pointer transition-all hover:border-blue-500/50",
                      selectedSequenceId === s.id && "border-blue-500 bg-blue-500/5"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-white font-bold">SEQ_{s.sequenceCode}</h4>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Shots Column */}
            <Card className="bg-card border-none shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Film className="text-purple-500 w-5 h-5" /> Shots
                </CardTitle>
                <Badge variant="outline">{shots.length}</Badge>
              </CardHeader>
              <CardContent>
                {!selectedSequenceId ? (
                  <div className="text-center py-20 text-muted-foreground italic text-sm">Select a sequence to view shots</div>
                ) : (
                  <div className="space-y-3">
                    {shots.map(sh => (
                      <div key={sh.id} className="p-3 rounded-lg bg-sidebar-accent border border-sidebar-border flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white text-sm">SH_{sh.shotCode}</p>
                          <Badge variant="outline" className="text-[9px] mt-1">{sh.status}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Due Date</p>
                          <p className="text-[11px] text-white">{sh.dueDate}</p>
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" className="w-full text-muted-foreground text-xs hover:text-white mt-4 border border-dashed border-sidebar-border">
                      <Plus className="w-3 h-3 mr-2" /> Add Shot
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
