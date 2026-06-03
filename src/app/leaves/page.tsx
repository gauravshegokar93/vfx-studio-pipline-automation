
"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { userService } from '@/services/userService';
import { Leave } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, Plane, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const data = await userService.getLeaves();
      setLeaves(data);
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
              <h1 className="text-4xl font-headline text-white mb-2">Resource Availability</h1>
              <p className="text-muted-foreground">Manage time-off requests and studio holidays to optimize scheduling.</p>
            </div>
            <Button className="bg-crimson">
              <Plus className="w-4 h-4 mr-2" /> Request Leave
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <Card className="bg-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <CalendarIcon className="text-crimson w-5 h-5" /> Leave Requests
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border">
                      <TableHead className="pl-6">Artist</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map(leave => (
                      <TableRow key={leave.id} className="border-sidebar-border hover:bg-sidebar-accent/30 transition-colors h-16">
                        <TableCell className="pl-6 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-[10px] font-bold">AR</div>
                          <span className="text-white font-medium">Alex Rivera</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-sidebar-border text-muted-foreground">{leave.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-white">{leave.startDate} to {leave.endDate}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[10px] font-bold uppercase",
                            leave.status === 'Approved' ? "bg-green-500/20 text-green-500" :
                            leave.status === 'Rejected' ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"
                          )}>{leave.status}</Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" className="text-green-500 hover:bg-green-500/10"><CheckCircle2 className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-500/10"><XCircle className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="bg-card border-none shadow-xl">
                <CardHeader><CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Holiday Schedule</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { date: '2024-07-04', label: 'Independence Day' },
                    { date: '2024-09-02', label: 'Labor Day' },
                    { date: '2024-11-28', label: 'Thanksgiving' }
                  ].map(h => (
                    <div key={h.label} className="flex justify-between items-center p-3 bg-sidebar-accent/50 rounded-lg border border-sidebar-border">
                      <div>
                        <p className="text-xs font-bold text-white">{h.label}</p>
                        <p className="text-[10px] text-muted-foreground">{h.date}</p>
                      </div>
                      <Plane className="w-4 h-4 text-crimson" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-crimson/5 border border-crimson/20">
                <CardContent className="p-4 flex gap-3">
                  <Clock className="text-crimson w-5 h-5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Capacity Notice</h4>
                    <p className="text-xs text-muted-foreground">Compositing capacity will be reduced by 25% during June 1st - June 5th due to approved leaves.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
