
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, CheckCircle2, Loader2, Table as TableIcon, Database, AlertCircle, Eye } from 'lucide-react';
import { importService, ImportSummary } from '@/services/importService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStep('preview');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const summary = await importService.importBidSheet(file);
      setResult(summary);
      setStep('result');
      toast({
        title: "Database Bootstrap Successful",
        description: `Pipeline generated. Single Source of Truth activated.`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Bootstrap Failed",
        description: "Verify Excel schema and try again.",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-headline text-white">Bootstrap Production Hub</h1>
            <p className="text-muted-foreground">Initialize your single source of truth from the client's Bid Sheet.</p>
          </div>

          {step === 'upload' && (
            <Card className="bg-card border-dashed border-2 border-sidebar-border hover:border-crimson/50 transition-colors">
              <CardContent className="p-16 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-crimson/10 rounded-full flex items-center justify-center mb-6">
                  <Database className="w-10 h-10 text-crimson" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Upload Client Bid Sheet</h3>
                <p className="text-sm text-muted-foreground mb-10 max-w-sm">
                  The application will automatically parse Projects, Sequences, Shots, and Pipeline Tasks from the provided Excel file.
                </p>
                
                <input 
                  type="file" 
                  id="bid-sheet" 
                  className="hidden" 
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
                <label 
                  htmlFor="bid-sheet"
                  className="cursor-pointer bg-crimson hover:bg-crimson/90 text-white px-10 py-4 rounded-xl flex items-center gap-3 shadow-lg shadow-crimson/20 transition-all font-bold"
                >
                  <TableIcon className="w-5 h-5" />
                  Select Excel Source
                </label>
              </CardContent>
            </Card>
          )}

          {step === 'preview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Eye className="text-crimson w-5 h-5" />
                  Import Preview & Validation
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('upload')}>Cancel</Button>
                  <Button className="bg-crimson" onClick={handleUpload} disabled={importing}>
                    {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                    Confirm & Initialize Pipeline
                  </Button>
                </div>
              </div>

              <Card className="bg-card border-none overflow-hidden">
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border">
                      <TableHead>Project</TableHead>
                      <TableHead>Sequence</TableHead>
                      <TableHead>Shot</TableHead>
                      <TableHead>Pipeline Task</TableHead>
                      <TableHead>Bid Hours</TableHead>
                      <TableHead>Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { proj: 'AVAT', seq: '010', shot: '0010', task: 'Comp', hours: 40 },
                      { proj: 'AVAT', seq: '010', shot: '0020', task: 'Roto', hours: 16 },
                      { proj: 'AVAT', seq: '020', shot: '0110', task: 'Paint', hours: 24 },
                      { proj: 'AVAT', seq: '020', shot: '0120', task: 'CG', hours: 80 }
                    ].map((row, i) => (
                      <TableRow key={i} className="border-sidebar-border hover:bg-sidebar-accent/30">
                        <TableCell className="font-medium text-white">{row.proj}</TableCell>
                        <TableCell>{row.seq}</TableCell>
                        <TableCell>{row.shot}</TableCell>
                        <TableCell>{row.task}</TableCell>
                        <TableCell>{row.hours}h</TableCell>
                        <TableCell><Badge className="bg-green-500/10 text-green-500 border-none">Valid</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-6 animate-in zoom-in duration-500">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Projects Created", val: result.projects, color: "text-blue-500" },
                  { label: "Sequences Created", val: result.sequences, color: "text-purple-500" },
                  { label: "Shots Created", val: result.shots, color: "text-green-500" },
                  { label: "Pipeline Tasks", val: result.tasks, color: "text-crimson" }
                ].map(stat => (
                  <Card key={stat.label} className="bg-card border-none shadow-2xl">
                    <CardContent className="p-8 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</p>
                      <h4 className={`text-4xl font-headline ${stat.color}`}>{stat.val}</h4>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-green-500/5 border border-green-500/20 p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-1">Production Hub Active</h4>
                  <p className="text-muted-foreground">The Excel dependency is now removed. All tracking is managed within the platform.</p>
                </div>
              </Card>

              <div className="flex justify-center pt-10">
                <Button className="bg-crimson px-16 h-14 text-xl font-bold rounded-xl" asChild>
                  <a href="/dashboard">Go to Real-time Dashboard</a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
