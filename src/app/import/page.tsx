
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, CheckCircle2, Loader2, Table as TableIcon, Database } from 'lucide-react';
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
        title: "Database Bootstrap Successful",
        description: `Pipeline generated from Client Bid. Single Source of Truth activated.`,
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
        <div className="p-8 max-w-4xl mx-auto space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-headline text-white">One-Time Client Import</h1>
            <p className="text-muted-foreground">Bootstrap your studio database from the client's initial Excel bid sheet.</p>
          </div>

          {!result ? (
            <Card className="bg-card border-dashed border-2 border-sidebar-border hover:border-crimson/50 transition-colors">
              <CardContent className="p-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-crimson/10 rounded-full flex items-center justify-center mb-6">
                  <Database className="w-8 h-8 text-crimson" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Initialize Single Source of Truth</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-sm">
                  After this import, all project tracking moves to the Lumina Platform. Excel updates will no longer be required.
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
                    {file ? file.name : "Select Initial Client File"}
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
                          Bootstrapping Production Hub...
                        </>
                      ) : "Generate Pipeline & Activate"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Projects Created", val: result.projects, color: "text-blue-500" },
                  { label: "Sequences Created", val: result.sequences, color: "text-purple-500" },
                  { label: "Shots Created", val: result.shots, color: "text-green-500" },
                  { label: "Pipeline Tasks", val: result.tasks, color: "text-crimson" }
                ].map(stat => (
                  <Card key={stat.label} className="bg-card border-none">
                    <CardContent className="p-6 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                      <h4 className={`text-3xl font-headline ${stat.color}`}>{stat.val}</h4>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-green-500 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Pipeline Initialized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    All data has been committed to SQL Server. Daily tracking is now automated within the app.
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center pt-6">
                <Button className="bg-crimson px-12 h-12 text-lg" asChild>
                  <a href="/dashboard">Enter Production Dashboard</a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
