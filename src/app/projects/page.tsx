
"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Project, Sequence, Shot } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Film, Layers, Projector, ChevronRight, AlertCircle } from 'lucide-react';
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
              <h1 className="text-4xl font-headline text-white mb-2">Production Hierarchy</h1>
              <p className="text-muted-foreground">Manage live projects and shot delivery schedules.</p>
            </div>
            {projects.length === 0 && (
              <Button className="bg-crimson" asChild>
                <Link href="/import">Initialize from Bid Sheet</Link>
              </Button>
            )}
          </div>

          {projects.length === 0 ? (
            <Card className="bg-sidebar border-dashed border-2 border-sidebar-border p-20 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Projects Found</h3>
              <p className="text-muted-foreground mb-6">You must bootstrap the studio by importing a Client Bid Sheet.</p>
              <Button variant="outline" asChild><Link href="/import">Go to Import Hub</Link></Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Projects Column */}
              <Card className="bg-card border-none shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between border-b border-sidebar-border pb-4 mb-4">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Projector className="text-crimson w-5 h-5" /> Projects
                  </CardTitle>
                  <Badge variant="outline">{projects.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {projects.map(p => (
                    <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className={cn(
                        "p-4 rounded-lg bg-sidebar-accent/50 border border-sidebar-border cursor-pointer transition-all hover:border-crimson/50",
                        selectedProjectId === p.id && "border-crimson bg-crimson/5 shadow-[0_0_15px_rgba(230,25,46,0.1)]"
                    )}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-crimson uppercase tracking-widest">{p.projectCode}</span>
                        <Badge className="text-[8px] uppercase">{p.status}</Badge>
                      </div>
                      <h4 className="text-white font-bold">{p.projectName}</h4>
                      <p className="text-xs text-muted-foreground">{p.clientName}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Sequences Column */}
              <Card className="bg-card border-none shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between border-b border-sidebar-border pb-4 mb-4">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Layers className="text-blue-500 w-5 h-5" /> Sequences
                  </CardTitle>
                  <Badge variant="outline">{filteredSequences.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedProjectId ? (
                    <div className="text-center py-20 text-muted-foreground italic text-sm">Select a project</div>
                  ) : filteredSequences.map(s => (
                    <div key={s.id} onClick={() => setSelectedSequenceId(s.id)} className={cn(
                        "p-4 rounded-lg bg-sidebar-accent/50 border border-sidebar-border cursor-pointer transition-all hover:border-blue-500/50",
                        selectedSequenceId === s.id && "border-blue-500 bg-blue-500/5"
                    )}>
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
                <CardHeader className="flex flex-row items-center justify-between border-b border-sidebar-border pb-4 mb-4">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Film className="text-purple-500 w-5 h-5" /> Shots
                  </CardTitle>
                  <Badge variant="outline">{filteredShots.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!selectedSequenceId ? (
                    <div className="text-center py-20 text-muted-foreground italic text-sm">Select a sequence</div>
                  ) : filteredShots.map(sh => (
                    <div key={sh.id} className="p-3 rounded-lg bg-sidebar-accent border border-sidebar-border flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white text-sm">SH_{sh.shotCode}</p>
                        <Badge variant="outline" className="text-[8px] mt-1">{sh.status}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Due Date</p>
                        <p className="text-[11px] text-white">{sh.dueDate}</p>
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
