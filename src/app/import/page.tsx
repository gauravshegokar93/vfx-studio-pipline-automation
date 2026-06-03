
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table as TableIcon, Database, CheckCircle2, Loader2, Eye, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { importService, ImportSummary } from '@/services/importService';
import { useLuminaStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const { bootstrapStudio } = useLuminaStore();
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
      toast({ variant: "destructive", title: "Parsing Failed", description: "Invalid Excel format." });
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
      description: "Application state populated from Bid Sheet.",
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
                <h3 className="text-2xl font-bold text-white mb-2">Select Client Bid Sheet</h3>
                <p className="text-sm text-muted-foreground mb-10 max-w-sm">
                  Upload .xlsx or .csv. The system will auto-generate Projects, Sequences, Shots, and Pipeline Tasks.
                </p>
                <input type="file" id="bid-sheet" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                <label htmlFor="bid-sheet" className="cursor-pointer bg-crimson hover:bg-crimson/90 text-white px-10 py-4 rounded-xl flex items-center gap-3 shadow-lg shadow-crimson/20 transition-all font-bold">
                  {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <TableIcon className="w-5 h-5" />}
                  {importing ? "Parsing File..." : "Browse Local Files"}
                </label>
              </CardContent>
            </Card>
          )}

          {step === 'preview' && summary && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Eye className="text-crimson w-5 h-5" />
                  Parsed Data Preview ({summary.tasks.length} Tasks Identified)
                </h3>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('upload')}>Cancel</Button>
                  <Button className="bg-crimson" onClick={handleConfirmImport}>
                    Confirm & Bootstrap Studio
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
                        <TableHead>Project / Seq</TableHead>
                        <TableHead>Shot Code</TableHead>
                        <TableHead>Pipeline Task</TableHead>
                        <TableHead>Bid Hours</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.tasks.map((task, i) => {
                        const shot = summary.shots.find(s => s.id === task.shotId);
                        const seq = summary.sequences.find(sq => sq.id === shot?.sequenceId);
                        return (
                          <TableRow key={i} className="border-sidebar-border hover:bg-sidebar-accent/30 transition-colors">
                            <TableCell className="text-white">
                              <span className="text-crimson font-bold">VFX</span> / {seq?.sequenceCode}
                            </TableCell>
                            <TableCell className="font-bold">{shot?.shotCode}</TableCell>
                            <TableCell><Badge variant="outline">{task.pipelineStep}</Badge></TableCell>
                            <TableCell>{task.bidHours}h</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{task.dueDate}</TableCell>
                            <TableCell>
                               <Badge className={task.priority === 'Critical' ? "bg-red-500/20 text-red-500" : ""}>{task.priority}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-6 text-center py-12 animate-in zoom-in">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-white">Studio Bootstrapped Successfully</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                All projects, shots, and tasks are now in the SQL database. The single source of truth is active.
              </p>
              <div className="pt-8 flex justify-center gap-4">
                <Button variant="outline" onClick={() => router.push('/projects')}>Manage Shots</Button>
                <Button className="bg-crimson px-8" onClick={() => router.push('/dashboard')}>Go to Live Dashboard</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
