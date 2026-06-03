
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table as TableIcon, CheckCircle2, Loader2, Eye, FileSpreadsheet, Search } from 'lucide-react';
import { importService, ImportSummary } from '@/services/importService';
import { useLuminaStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const { bootstrapStudio } = useLuminaStore();
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateParsing(e.target.files[0]);
    }
  };

  const simulateParsing = async (file: File) => {
    setImporting(true);
    try {
      const data = await importService.importBidSheet(file);
      setSummary(data);
      setStep('preview');
    } catch (e) {
      toast({ variant: "destructive", title: "Parsing Failed", description: "Invalid NTM Bid Sheet format." });
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = () => {
    if (!summary) return;
    bootstrapStudio({
      projects: summary.projects,
      sequences: summary.sequences,
      shots: summary.shots,
      tasks: summary.tasks
    });
    setStep('result');
    toast({
      title: "Bootstrap Complete",
      description: "App populated from NTM Bid Sheet. Single Source of Truth active.",
    });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-headline text-white">Bootstrap Production Hub</h1>
            <p className="text-muted-foreground">The one-time ingestion engine to initialize your studio pipeline.</p>
          </div>

          {step === 'upload' && (
            <Card className="bg-card border-dashed border-2 border-sidebar-border hover:border-crimson/50 transition-colors">
              <CardContent className="p-16 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-crimson/10 rounded-full flex items-center justify-center mb-6">
                  <FileSpreadsheet className="w-10 h-10 text-crimson" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Select NTM Bid Sheet</h3>
                <p className="text-sm text-muted-foreground mb-10 max-w-sm">
                  Upload .xlsx or .csv. The engine will dynamically create Tasks based on Roto, Paint, Comp, and CG bids.
                </p>
                <input type="file" id="bid-sheet" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                <label htmlFor="bid-sheet" className="cursor-pointer bg-crimson hover:bg-crimson/90 text-white px-10 py-4 rounded-xl flex items-center gap-3 shadow-lg shadow-crimson/20 transition-all font-bold">
                  {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <TableIcon className="w-5 h-5" />}
                  {importing ? "Processing NTM Format..." : "Upload NTM Bid Sheet"}
                </label>
              </CardContent>
            </Card>
          )}

          {step === 'preview' && summary && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Eye className="text-crimson w-5 h-5" />
                  Extraction Preview ({summary.tasks.length} Tasks Generated)
                </h3>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('upload')}>Cancel</Button>
                  <Button className="bg-crimson" onClick={handleConfirmImport}>
                    Confirm & Bootstrap SQL DB
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Projects", val: summary.stats.projectCount },
                  { label: "Sequences", val: summary.stats.sequenceCount },
                  { label: "Shots", val: summary.stats.shotCount },
                  { label: "Tasks", val: summary.stats.taskCount }
                ].map(stat => (
                  <Card key={stat.label} className="bg-sidebar border-none p-4">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-headline text-white">{stat.val}</p>
                  </Card>
                ))}
              </div>

              <Card className="bg-card border-none overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-sidebar-accent sticky top-0 z-10">
                      <TableRow className="border-sidebar-border">
                        <TableHead>Seq / Reel</TableHead>
                        <TableHead>Shot Name</TableHead>
                        <TableHead>Pipeline Step</TableHead>
                        <TableHead>Bid Hours</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>ETA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.tasks.map((task, i) => {
                        const shot = summary.shots.find(s => s.id === task.shotId);
                        const seq = summary.sequences.find(sq => sq.id === shot?.sequenceId);
                        return (
                          <TableRow key={i} className="border-sidebar-border hover:bg-sidebar-accent/30 transition-colors">
                            <TableCell className="text-white">
                              <span className="text-crimson font-bold">NTM</span> / {seq?.sequenceCode}
                            </TableCell>
                            <TableCell className="font-bold text-white">{shot?.shotCode}</TableCell>
                            <TableCell><Badge variant="outline" className="text-crimson border-crimson/20">{task.pipelineStep}</Badge></TableCell>
                            <TableCell className="font-mono">{task.bidHours}h</TableCell>
                            <TableCell>
                               <Badge className={task.priority === 'Critical' ? "bg-red-500/20 text-red-500" : ""}>{task.priority}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{task.dueDate}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}

          {step === 'result' && summary && (
            <div className="space-y-8 animate-in zoom-in">
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-white">Bootstrap Successful</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Verification Report: {summary.stats.shotCount} shots and {summary.stats.taskCount} tasks are now live in the store.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Verification: First 10 Shots */}
                <Card className="bg-card border-none">
                  <div className="p-4 border-b border-sidebar-border flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm uppercase tracking-widest">First 10 Shots Created</h3>
                    <Badge variant="outline">{summary.shots.slice(0, 10).length} Records</Badge>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableBody>
                        {summary.shots.slice(0, 10).map(s => (
                          <TableRow key={s.id} className="border-sidebar-border h-10">
                            <TableCell className="text-white font-bold">{s.shotCode}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{s.priority}</TableCell>
                            <TableCell className="text-right"><Badge className="bg-sidebar-accent">Live</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                {/* Verification: First 20 Tasks */}
                <Card className="bg-card border-none">
                  <div className="p-4 border-b border-sidebar-border flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm uppercase tracking-widest">First 20 Tasks Created</h3>
                    <Badge variant="outline">{summary.tasks.slice(0, 20).length} Records</Badge>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableBody>
                        {summary.tasks.slice(0, 20).map(t => {
                          const shot = summary.shots.find(s => s.id === t.shotId);
                          return (
                            <TableRow key={t.id} className="border-sidebar-border h-10 text-xs">
                              <TableCell className="text-white font-bold">{shot?.shotCode}</TableCell>
                              <TableCell className="text-crimson font-bold">{t.pipelineStep}</TableCell>
                              <TableCell className="text-white">{t.bidHours}h</TableCell>
                              <TableCell className="text-muted-foreground truncate max-w-[100px]">{t.taskName}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>

              <div className="flex justify-center gap-4 py-8">
                <Button variant="outline" size="lg" onClick={() => router.push('/projects')}>View Hierarchy</Button>
                <Button className="bg-crimson px-10 h-12 text-lg font-bold" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
