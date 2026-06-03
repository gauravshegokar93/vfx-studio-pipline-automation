
"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Project, Sequence, Shot } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Film, Layers, Projector, ChevronRight, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ProjectManagementPage() {
  const { projects, sequences, shots } = useLuminaStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);

  const filteredSequences = sequences.filter(s => s.projectId === selectedProjectId);
  const filteredShots = shots.filter(s => s.sequenceId === selectedSequenceId);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Projector className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Enterprise Hierarchy Management</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Production Blueprint</h1>
              <p className="text-muted-foreground">Managing projects, sequences, and individual shot delivery units.</p>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-sidebar-border rounded-3xl bg-sidebar/20">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">Hierarchy Empty</h3>
              <p className="text-muted-foreground mb-10 text-center max-w-md">Your studio hierarchy is defined by the Client Bid Sheet. Bootstrap the studio to activate the production tree.</p>
              <Button className="bg-crimson h-14 px-10 rounded-2xl font-bold shadow-xl shadow-crimson/20" asChild>
                <Link href="/import">Initialize Production Hub</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Projects Column */}
              <Card className="bg-card border-none shadow-2xl h-[calc(100vh-250px)] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between border-b border-sidebar-border pb-6 mb-2">
                  <CardTitle className="text-white text-lg flex items-center gap-3">
                    <Projector className="text-crimson w-5 h-5" /> Live Projects
                  </CardTitle>
                  <Badge variant="outline" className="text-crimson font-mono">{projects.length}</Badge>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4 pt-4">
                  {projects.map(p => (
                    <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className={cn(
                        "p-5 rounded-xl bg-sidebar-accent/30 border border-sidebar-border cursor-pointer transition-all hover:scale-[1.02] hover:border-crimson/50",
                        selectedProjectId === p.id && "border-crimson bg-crimson/10 shadow-lg shadow-crimson/10"
                    )}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-crimson uppercase tracking-widest font-mono">{p.projectCode}</span>
                        <Badge className="text-[8px] uppercase bg-black/40 border-none">{p.status}</Badge>
                      </div>
                      <h4 className="text-white font-bold text-lg leading-tight">{p.projectName}</h4>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">{p.clientName}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Sequences Column */}
              <Card className="bg-card border-none shadow-2xl h-[calc(100vh-250px)] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between border-b border-sidebar-border pb-6 mb-2">
                  <CardTitle className="text-white text-lg flex items-center gap-3">
                    <Layers className="text-blue-500 w-5 h-5" /> Sequences
                  </CardTitle>
                  <Badge variant="outline" className="text-blue-500 font-mono">{filteredSequences.length}</Badge>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4 pt-4">
                  {!selectedProjectId ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 opacity-40">
                      <Layers className="w-12 h-12" />
                      <p className="italic text-sm">Select a project to view sequences</p>
                    </div>
                  ) : filteredSequences.map(s => (
                    <div key={s.id} onClick={() => setSelectedSequenceId(s.id)} className={cn(
                        "p-5 rounded-xl bg-sidebar-accent/30 border border-sidebar-border cursor-pointer transition-all hover:scale-[1.02] hover:border-blue-500/50",
                        selectedSequenceId === s.id && "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                    )}>
                      <div className="flex justify-between items-center">
                        <h4 className="text-white font-bold text-lg font-mono tracking-tighter">SEQ_{s.sequenceCode}</h4>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Shots Column */}
              <Card className="bg-card border-none shadow-2xl h-[calc(100vh-250px)] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between border-b border-sidebar-border pb-6 mb-2">
                  <CardTitle className="text-white text-lg flex items-center gap-3">
                    <Film className="text-purple-500 w-5 h-5" /> Shot Name Units
                  </CardTitle>
                  <Badge variant="outline" className="text-purple-500 font-mono">{filteredShots.length}</Badge>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-3 pt-4">
                  {!selectedSequenceId ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 opacity-40">
                      <Film className="w-12 h-12" />
                      <p className="italic text-sm">Select a sequence to view shots</p>
                    </div>
                  ) : filteredShots.map(sh => (
                    <div key={sh.id} className="p-4 rounded-xl bg-sidebar-accent/30 border border-sidebar-border flex justify-between items-center hover:bg-sidebar-accent/50 transition-colors">
                      <div className="space-y-1">
                        <p className="font-bold text-white text-lg font-mono tracking-tighter">{sh.shotCode}</p>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-[8px] uppercase tracking-widest">{sh.status}</Badge>
                          <Badge className={cn(
                            "text-[8px] uppercase border-none",
                            sh.priority === 'Critical' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                          )}>{sh.priority}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Due Date</p>
                        <p className="text-sm text-white font-mono">{sh.dueDate}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
