
"use client";

import React from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Layers, Activity, TrendingUp } from 'lucide-react';

export default function DepartmentProgressPage() {
  const { tasks, departments } = useLuminaStore();

  const getDeptProgress = (deptName: string) => {
    const deptTasks = tasks.filter(t => t.pipelineStep === deptName);
    if (deptTasks.length === 0) return 0;
    const totalProgress = deptTasks.reduce((acc, t) => acc + t.progress, 0);
    return Math.round(totalProgress / deptTasks.length);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div>
            <h1 className="text-4xl font-headline text-white mb-2">Departmental Throughput</h1>
            <p className="text-muted-foreground">High-level completion metrics per pipeline department.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {['Roto', 'Paint', 'Comp', 'CG'].map(dept => {
              const progress = getDeptProgress(dept);
              const deptTasks = tasks.filter(t => t.pipelineStep === dept);
              const approvedCount = deptTasks.filter(t => t.status === 'Approved').length;
              
              return (
                <Card key={dept} className="bg-card border-none shadow-xl p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-crimson/10 rounded-xl">
                      <Layers className="text-crimson w-6 h-6" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Overall Completion</p>
                      <h3 className="text-3xl font-headline text-white">{progress}%</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-bold">{dept} Pipeline</span>
                      <span className="text-muted-foreground">{approvedCount} / {deptTasks.length} Approved</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-sidebar-accent" />
                  </div>

                  <div className="pt-4 grid grid-cols-2 gap-4 border-t border-sidebar-border">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Efficiency</p>
                      <p className="text-sm text-green-500 font-bold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Optimal
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Status</p>
                      <p className="text-sm text-white font-bold">On Schedule</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
