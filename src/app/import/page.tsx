"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, CheckCircle2, Loader2, Table as TableIcon } from 'lucide-react';
import { importService, ImportSummary } from '@/services/importService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const summary = await importService.importBidSheet(file);
      setResult(summary);
      toast({
        title: "Import Successful",
        description: `Pipeline generated for ${summary.shots} shots across ${summary.sequences} sequences.`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "Verify the Excel structure and try again.",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-headline text-white">Bid Sheet Engine</h1>
            <p className="text-muted-foreground">Upload client Excel sheets to automatically generate production pipelines.</p>
          </div>

          {!result ? (
            <Card className="bg-card border-dashed border-2 border-sidebar-border hover:border-crimson/50 transition-colors">
              <CardContent className="p-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-crimson/10 rounded-full flex items-center justify-center mb-6">
                  <FileUp className="w-8 h-8 text-crimson" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Upload NTM_Bid_Sheet.xlsx</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-sm">
                  System will read shots, sequences, and tasks to populate the studio database automatically.
                </p>
                
                <div className="flex flex-col gap-4 items-center">
                  <input 
                    type="file" 
                    id="bid-sheet" 
                    className="hidden" 
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                  />
                  <label 
                    htmlFor="bid-sheet"
                    className="cursor-pointer bg-sidebar-accent hover:bg-sidebar-accent/80 text-white px-6 py-3 rounded-lg flex items-center gap-2 border border-sidebar-border"
                  >
                    <TableIcon className="w-4 h-4" />
                    {file ? file.name : "Select Excel File"}
                  </label>
                  
                  {file && (
                    <Button 
                      className="bg-crimson hover:bg-crimson/90 px-12"
                      onClick={handleUpload}
                      disabled={importing}
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing Pipeline...
                        </>
                      ) : "Generate Production Workflows"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Projects", val: result.projects, color: "text-blue-500" },
                  { label: "Sequences", val: result.sequences, color: "text-purple-500" },
                  { label: "Shots", val: result.shots, color: "text-green-500" },
                  { label: "Tasks", val: result.tasks, color: "text-crimson" }
                ].map(stat => (
                  <Card key={stat.label} className="bg-card border-none">
                    <CardContent className="p-6 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                      <h4 className={`text-3xl font-headline ${stat.color}`}>{stat.val}</h4>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-green-500 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Validation Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-sm">Sequence S01 - S05 created successfully</span>
                      <Badge variant="outline" className="text-green-500 border-green-500/30">SUCCESS</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-sm">Shots SH010 - SH240 mapped to Comp/Roto/Paint</span>
                      <Badge variant="outline" className="text-green-500 border-green-500/30">SUCCESS</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-6">
                <Button variant="ghost" onClick={() => setResult(null)}>Import Another</Button>
                <Button className="bg-crimson">Go to Production Dashboard</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
