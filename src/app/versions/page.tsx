"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { taskService } from '@/services/taskService';
import { Version } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Filter, PlayCircle, Eye, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VersionHistoryPage() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Simulation of a global version fetch
      const data = await taskService.getVersions('all');
      setVersions(data);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">Version Audit Trail</h1>
              <p className="text-muted-foreground">Browse all rendered submissions and QC history.</p>
            </div>
            <div className="flex gap-2">
               <div className="relative">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <input placeholder="Search renders..." className="bg-sidebar-accent border-none rounded-md py-2 pl-9 pr-4 text-sm outline-none text-white w-64" />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {versions.map(v => (
              <Card key={v.id} className="bg-card border-none overflow-hidden group shadow-lg">
                <div className="aspect-video bg-black relative">
                  <img src={`https://picsum.photos/seed/${v.id}/400/225`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Shot Render" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                     <PlayCircle className="w-12 h-12 text-white" />
                  </div>
                  <Badge className="absolute top-2 left-2 bg-black/80 backdrop-blur-md">v{v.versionNumber.toString().padStart(3, '0')}</Badge>
                  <Badge className={cn(
                    "absolute bottom-2 right-2",
                    v.reviewStatus === 'Approved' ? "bg-green-500" : 
                    v.reviewStatus === 'Retake' ? "bg-red-500" : "bg-yellow-500"
                  )}>{v.reviewStatus}</Badge>
                </div>
                <CardContent className="p-4 space-y-3">
                   <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-crimson font-bold uppercase tracking-widest">SH_010</p>
                        <p className="text-sm font-bold text-white">Compositing</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</span>
                   </div>
                   {v.reviewComment && (
                     <p className="text-xs text-muted-foreground italic line-clamp-2 border-l-2 border-sidebar-border pl-2">
                       "{v.reviewComment}"
                     </p>
                   )}
                   <div className="flex items-center gap-2 pt-2 border-t border-sidebar-border">
                      <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center text-[8px] font-bold">AR</div>
                      <span className="text-[10px] text-muted-foreground">Alex Rivera</span>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
