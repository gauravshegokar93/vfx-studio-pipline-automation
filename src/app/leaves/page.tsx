
"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { userService } from '@/services/userService';
import { Leave } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, Plane, Plus, CheckCircle2, XCircle, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLuminaStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export default function LeavesPage() {
  const { currentUser } = useLuminaStore();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'Vacation',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  const fetchLeaves = async () => {
    setLoading(true);
    const data = await userService.getLeaves();
    setLeaves(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleSubmit = async () => {
    if (!formData.fromDate || !formData.toDate || !formData.reason) {
      toast({ variant: 'destructive', title: 'Error', description: 'All fields are required.' });
      return;
    }
    
    // Calculate days
    const start = new Date(formData.fromDate);
    const end = new Date(formData.toDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    
    if (days <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid date range.' });
      return;
    }

    const success = await userService.submitLeave({ ...formData, totalDays: days });
    if (success) {
      toast({ title: 'Success', description: 'Leave request submitted successfully.' });
      setIsSubmitModalOpen(false);
      setFormData({ leaveType: 'Vacation', fromDate: '', toDate: '', reason: '' });
      fetchLeaves();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit leave request.' });
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    let remarks = '';
    if (status === 'Rejected') {
      const promptRes = window.prompt("Reason for rejection?");
      if (promptRes === null) return;
      remarks = promptRes;
    }
    
    const success = await userService.updateLeaveStatus(id, status, remarks);
    if (success) {
      toast({ title: 'Success', description: `Leave request ${status.toLowerCase()}.` });
      fetchLeaves();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update status.` });
    }
  };

  const filteredLeaves = leaves.filter(l => filter === 'All' || l.status === filter);

  const canManageLeaves = currentUser?.role === 'Team Lead' || currentUser?.role === 'Project Manager' || currentUser?.role === 'Production Head' || currentUser?.role === 'Department Supervisor' || currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

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
            <Button className="bg-crimson font-bold shadow-lg shadow-crimson/20" onClick={() => setIsSubmitModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Request Leave
            </Button>
          </div>

          <div className="flex gap-2">
            {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
              <Badge 
                key={f}
                variant={filter === f ? 'default' : 'outline'} 
                className={cn("cursor-pointer px-4 py-1", filter === f ? "bg-sidebar-accent hover:bg-sidebar-accent text-white" : "border-sidebar-border text-muted-foreground hover:bg-sidebar-accent/50")}
                onClick={() => setFilter(f as any)}
              >
                {f}
              </Badge>
            ))}
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
                    {filteredLeaves.map(leave => (
                      <TableRow key={leave.id} className="border-sidebar-border hover:bg-sidebar-accent/30 transition-colors h-16">
                        <TableCell className="pl-6 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-[10px] font-bold text-crimson">
                            {leave.userName?.charAt(0)}
                          </div>
                          <div>
                            <span className="text-white font-medium block">{leave.userName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{leave.employeeCode}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="border-sidebar-border text-muted-foreground w-fit">{leave.type}</Badge>
                            {leave.reason && <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={leave.reason}>{leave.reason}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-white">
                          <span className="font-mono">{leave.startDate}</span> to <span className="font-mono">{leave.endDate}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">({leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''})</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={cn(
                              "text-[10px] font-bold uppercase w-fit",
                              leave.status === 'Approved' ? "bg-green-500/20 text-green-500" :
                              leave.status === 'Rejected' ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"
                            )}>{leave.status}</Badge>
                            {leave.status === 'Rejected' && leave.remarks && (
                              <span className="text-[10px] text-red-400 italic">"{leave.remarks}"</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          {canManageLeaves && leave.status === 'Pending' && (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" className="text-green-500 hover:bg-green-500/10" onClick={() => handleUpdateStatus(leave.id, 'Approved')}><CheckCircle2 className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-500/10" onClick={() => handleUpdateStatus(leave.id, 'Rejected')}><XCircle className="w-4 h-4" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredLeaves.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No leave requests found.</TableCell>
                      </TableRow>
                    )}
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

        {/* Submit Leave Dialog */}
        <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">Submit Leave Request</DialogTitle>
              <DialogDescription>Your request will be sent to your supervisor for approval.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={formData.leaveType} onValueChange={v => setFormData({...formData, leaveType: v})}>
                  <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-sidebar border-sidebar-border text-white">
                    <SelectItem value="Vacation">Vacation</SelectItem>
                    <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                    <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                    <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" className="bg-sidebar-accent border-sidebar-border" value={formData.fromDate} onChange={e => setFormData({...formData, fromDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" className="bg-sidebar-accent border-sidebar-border" value={formData.toDate} onChange={e => setFormData({...formData, toDate: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea className="bg-sidebar-accent border-sidebar-border min-h-[100px]" placeholder="Explain why you are requesting leave..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-sidebar-border" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
              <Button className="bg-crimson font-bold shadow-lg shadow-crimson/20" onClick={handleSubmit}>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
