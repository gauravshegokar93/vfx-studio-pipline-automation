
"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { 
  PlayCircle, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  Filter,
  XCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { reviewFeedbackSummary } from '@/ai/flows/review-feedback-summary-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLuminaStore } from '@/lib/store';

export default function ReviewPage() {
  const { tasks, shots } = useLuminaStore();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  // Filter tasks waiting for review
  const pendingTasks = tasks.filter(t => t.status === 'Pending Review' || t.status === 'Assigned');

  const fetchSummary = async (task: any) => {
    setSummaryLoading(true);
    try {
      const result = await reviewFeedbackSummary({
        shotId: task.shotId,
        versions: [],
        comments: []
      });
      setSummary(result);
    } catch (e) {
      console.error(e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleOpenReview = (task: any) => {
    setSelectedTask(task);
    setSummary(null);
    fetchSummary(task);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto flex">
        <div className={cn("p-8 space-y-6 transition-all duration-300", selectedTask ? "w-1/2" : "w-full")}>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">Review Queue</h1>
              <p className="text-muted-foreground font-body">Manage daily submissions and quality control.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-sidebar-border h-9">
                <Filter className="w-4 h-4 mr-2" /> Filter
              </Button>
            </div>
          </div>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="bg-sidebar border border-sidebar-border">
              <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
              <TabsTrigger value="all">All Submissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingTasks.map((t) => (
                  <Card 
                    key={t.id} 
                    className={cn(
                      "bg-card border-none hover:ring-1 hover:ring-crimson transition-all cursor-pointer overflow-hidden group",
                      selectedTask?.id === t.id ? "ring-2 ring-crimson" : "shadow-lg"
                    )}
                    onClick={() => handleOpenReview(t)}
                  >
                    <div className="relative aspect-video bg-black">
                      <img src={`https://picsum.photos/seed/${t.id}/400/225`} alt={t.shotId} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="w-12 h-12 text-white" />
                      </div>
                      <Badge className="absolute top-2 left-2 bg-black/60 backdrop-blur-md border-none">{t.shotId}</Badge>
                      <Badge className="absolute bottom-2 right-2 bg-crimson text-white">{t.pipelineStep}</Badge>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-white text-lg">{t.taskName}</p>
                          <p className="text-xs text-muted-foreground">Due: {t.dueDate}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold uppercase tracking-wider">
                          <Clock className="w-3 h-3" /> {t.status}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {selectedTask && (
          <div className="w-1/2 border-l border-sidebar-border bg-sidebar overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-sidebar/95 backdrop-blur-md p-6 border-b border-sidebar-border z-10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-headline text-white">{selectedTask.shotId} - {selectedTask.pipelineStep}</h2>
                <p className="text-sm text-muted-foreground">Bid: {selectedTask.bidHours}h | Status: {selectedTask.status}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedTask(null)}>
                <XCircle className="w-6 h-6 text-muted-foreground" />
              </Button>
            </div>

            <div className="p-6 space-y-8">
              <div className="aspect-video bg-black rounded-xl border border-sidebar-border flex items-center justify-center relative group overflow-hidden">
                 <img src={`https://picsum.photos/seed/${selectedTask.id}/800/450`} className="w-full h-full object-contain" />
                 <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4">
                    <Button variant="secondary" size="sm" className="bg-white/10 backdrop-blur-md hover:bg-white/20 border-none">
                      <ThumbsDown className="w-4 h-4 mr-2" /> Retake
                    </Button>
                    <Button variant="default" size="sm" className="bg-crimson hover:bg-crimson/90 border-none">
                      <ThumbsUp className="w-4 h-4 mr-2" /> Approve
                    </Button>
                 </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-accent w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">AI Intelligence Summary</h3>
                </div>
                
                {summaryLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-sidebar-accent" />
                    <Skeleton className="h-20 w-full bg-sidebar-accent" />
                  </div>
                ) : summary ? (
                  <Card className="bg-accent/5 border border-accent/20">
                    <CardContent className="p-4 space-y-4">
                      <div>
                         <p className="text-xs font-bold text-accent uppercase mb-1">Feedback Context</p>
                         <p className="text-sm text-white">{summary.summary}</p>
                      </div>
                      <div>
                         <p className="text-xs font-bold text-accent uppercase mb-1">Action Items</p>
                         <ul className="space-y-1">
                            {summary.actionItems.map((item: string, i: number) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                <span className="text-accent">•</span> {item}
                              </li>
                            ))}
                         </ul>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
