"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  CheckSquare,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  Star,
  Clock,
  Film,
  User,
  Layers,
  Send,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatDateTimeLocal, formatDateLocal } from '@/lib/formatTime';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLuminaStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  taskService, 
  TaskReviewQueueItem, 
  TaskReviewItem, 
  TaskReworkItem 
} from '@/services/taskService';

export default function ReviewQueuePage() {
  const { currentUser } = useLuminaStore();
  const { toast } = useToast();

  const [queue, setQueue] = useState<TaskReviewQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected item for review detail modal
  const [selectedItem, setSelectedItem] = useState<TaskReviewQueueItem | null>(null);
  const [reviewHistory, setReviewHistory] = useState<{ reviews: TaskReviewItem[]; reworks: TaskReworkItem[] }>({ reviews: [], reworks: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Approve Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rating, setRating] = useState<string>('5');
  const [approveRemarks, setApproveRemarks] = useState('');
  const [approving, setApproving] = useState(false);

  // Rework Modal State
  const [reworkModalOpen, setReworkModalOpen] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [reworkRemarks, setReworkRemarks] = useState('');
  const [reworking, setReworking] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const items = await taskService.getReviewQueue();
      setQueue(items);
    } catch (err) {
      console.error('[ReviewQueuePage] Failed to load queue:', err);
      toast({ title: 'Error', description: 'Failed to load review queue.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleOpenReviewModal = async (item: TaskReviewQueueItem) => {
    setSelectedItem(item);
    setLoadingHistory(true);
    const hist = await taskService.getTaskReviewHistory(item.taskId);
    setReviewHistory(hist);
    setLoadingHistory(false);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !selectedItem.reviewId) return;

    setApproving(true);
    const parsedRating = rating ? parseInt(rating, 10) : undefined;
    const res = await taskService.approveReview(selectedItem.reviewId, parsedRating, approveRemarks);
    setApproving(false);

    if (res.success) {
      toast({ title: 'Task Approved', description: `Task ${selectedItem.taskCode} has been completed and locked.` });
      setApproveModalOpen(false);
      setSelectedItem(null);
      setApproveRemarks('');
      loadQueue();
    } else {
      toast({ title: 'Approval Error', description: res.message || 'Failed to approve review', variant: 'destructive' });
    }
  };

  const handleRequestRework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !selectedItem.reviewId) return;

    if (!reworkReason || reworkReason.trim() === '') {
      toast({ title: 'Validation Error', description: 'Reason for rework is required.', variant: 'destructive' });
      return;
    }

    setReworking(true);
    const res = await taskService.requestRework(selectedItem.reviewId, reworkReason, reworkRemarks);
    setReworking(false);

    if (res.success) {
      toast({ 
        title: 'Rework Requested', 
        description: `Task ${selectedItem.taskCode} has been sent back to artist for Rework Round #${res.reworkRound || 1}.` 
      });
      setReworkModalOpen(false);
      setSelectedItem(null);
      setReworkReason('');
      setReworkRemarks('');
      loadQueue();
    } else {
      toast({ title: 'Rework Error', description: res.message || 'Failed to request rework', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare className="text-crimson w-5 h-5" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Quality Control & Supervision</span>
            </div>
            <h1 className="text-4xl font-headline text-white mb-2">Review Queue</h1>
            <p className="text-muted-foreground">Approve completed artist submissions or send back tasks for rework rounds.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadQueue} disabled={loading} className="gap-2 border-sidebar-border">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh Queue
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-none p-6 shadow-lg">
            <p className="text-xs font-bold text-muted-foreground uppercase">Pending Reviews</p>
            <h3 className="text-3xl font-headline text-amber-400 mt-1">{queue.length} Tasks</h3>
          </Card>
          <Card className="bg-card border-none p-6 shadow-lg">
            <p className="text-xs font-bold text-muted-foreground uppercase">Total Submitted Bids</p>
            <h3 className="text-3xl font-headline text-white mt-1">
              {queue.reduce((acc, item) => acc + (item.actualWorkedBid || 0), 0).toFixed(2)} Bid
            </h3>
          </Card>
          <Card className="bg-card border-none p-6 shadow-lg">
            <p className="text-xs font-bold text-muted-foreground uppercase">Reviewer Roles</p>
            <h3 className="text-3xl font-headline text-green-500 mt-1">Authorized</h3>
          </Card>
        </div>

        <Card className="bg-card border-none overflow-hidden shadow-2xl">
          {queue.length > 0 ? (
            <Table>
              <TableHeader className="bg-sidebar-accent/50">
                <TableRow className="border-sidebar-border h-14">
                  <TableHead className="pl-6">Shot Code</TableHead>
                  <TableHead>Task Code / Name</TableHead>
                  <TableHead>Assigned Artist</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Est Bid</TableHead>
                  <TableHead>Target Bid</TableHead>
                  <TableHead>Actual Logged</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((item) => (
                  <TableRow key={item.taskId} className="border-sidebar-border h-20 transition-all hover:bg-sidebar-accent/20">
                    <TableCell className="pl-6 font-bold text-white text-lg font-mono">{item.shotCode || 'N/A'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white font-mono text-sm font-semibold">{item.taskCode}</p>
                        <p className="text-xs text-muted-foreground">{item.taskName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      {item.assignedArtistName || 'Artist'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-crimson border-crimson/20 uppercase text-[10px]">{item.stageName || 'Stage'}</Badge>
                    </TableCell>
                    <TableCell className="text-white font-mono text-xs">{item.estimatedBid.toFixed(2)} Bid</TableCell>
                    <TableCell className="text-yellow-500 font-mono text-xs font-bold">{item.targetBid.toFixed(2)} Bid</TableCell>
                    <TableCell className="text-crimson font-mono text-xs font-bold">
                      {item.actualWorkedHours.toFixed(1)} hrs <span className="text-muted-foreground text-[10px]">({item.actualWorkedBid.toFixed(2)} Bid)</span>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap text-xs">
                      {item.submissionDate ? formatDateTimeLocal(item.submissionDate) : 'N/A'}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 shadow-md text-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
                        onClick={() => handleOpenReviewModal(item)}
                      >
                        <CheckSquare className="w-4 h-4" /> REVIEW TASK
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-24 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-1.5 duration-200 ease-out">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-40" />
              <p className="text-lg font-semibold text-white">Review Queue is Empty</p>
              <p className="text-sm">All submitted artist tasks have been reviewed.</p>
            </div>
          )}
        </Card>

        {/* Review Detail Modal */}
        <Dialog open={selectedItem !== null} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
          <DialogContent className="sm:max-w-[700px] bg-sidebar border-sidebar-border text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline flex items-center justify-between">
                <span>Review Task: {selectedItem?.shotCode} - {selectedItem?.taskName}</span>
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase text-xs">SUBMITTED</Badge>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Task Code: <span className="text-white font-mono font-bold mr-3">{selectedItem?.taskCode}</span>
                Assigned Artist: <span className="text-white font-semibold">{selectedItem?.assignedArtistName}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Production Analytics Grid */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-card/70 rounded-lg border border-sidebar-border text-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Estimated Bid</p>
                  <p className="text-xl font-headline text-white">{selectedItem?.estimatedBid.toFixed(2)} Bid</p>
                  <p className="text-[10px] text-muted-foreground">{selectedItem?.estimatedHours} hrs</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Target Bid</p>
                  <p className="text-xl font-headline text-yellow-500">{selectedItem?.targetBid.toFixed(2)} Bid</p>
                  <p className="text-[10px] text-muted-foreground">{selectedItem?.targetHours} hrs</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Actual Logged</p>
                  <p className="text-xl font-headline text-crimson">{selectedItem?.actualWorkedHours.toFixed(1)} hrs</p>
                  <p className="text-[10px] text-muted-foreground">{selectedItem?.actualWorkedBid.toFixed(2)} Bid</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Submission Date</p>
                  <span className="font-medium text-white">
                    {selectedItem?.submissionDate ? formatDateLocal(selectedItem.submissionDate) : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Submission Remarks */}
              <div className="p-4 rounded-lg bg-card/40 border border-sidebar-border space-y-1">
                <p className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-crimson" /> Artist Submission Notes
                </p>
                <p className="text-sm text-white italic pl-5">
                  {selectedItem?.submissionRemarks ? `"${selectedItem.submissionRemarks}"` : 'No submission remarks provided by artist.'}
                </p>
              </div>

              {/* History Section */}
              <div className="space-y-3">
                <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Previous Review & Rework History</p>
                {loadingHistory ? (
                  <p className="text-xs text-muted-foreground">Loading history...</p>
                ) : (reviewHistory.reviews.length === 0 && reviewHistory.reworks.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic">First review submission for this task.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {reviewHistory.reviews.map((rev) => (
                      <div key={rev.reviewId} className="p-3 rounded bg-card/30 border border-sidebar-border text-xs flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-white">Review #{rev.reviewId}</span>
                          <span className="text-muted-foreground ml-2">Status: <strong className="text-white">{rev.reviewStatus}</strong></span>
                          {rev.remarks && <p className="text-muted-foreground italic mt-0.5">&quot;{rev.remarks}&quot;</p>}
                        </div>
                        <span className="text-muted-foreground font-mono">{rev.reviewDate ? formatDateLocal(rev.reviewDate) : ''}</span>
                      </div>
                    ))}
                    {reviewHistory.reworks.map((rw) => (
                      <div key={rw.reworkId} className="p-3 rounded bg-purple-500/10 border border-purple-500/20 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-purple-400">Rework Round #{rw.reworkRound}</span>
                          <span className="text-muted-foreground ml-2">Reason: <strong className="text-white">{rw.reason}</strong></span>
                          {rw.reviewerRemarks && <p className="text-muted-foreground italic mt-0.5">&quot;{rw.reviewerRemarks}&quot;</p>}
                        </div>
                        <span className="text-muted-foreground font-mono">{(rw.previousWorkedMinutes / 60).toFixed(1)} hrs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center pt-4 border-t border-sidebar-border">
              <Button 
                variant="outline" 
                onClick={() => setSelectedItem(null)}
                className="border-sidebar-border text-white hover:bg-sidebar-accent"
              >
                Close
              </Button>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setReworkModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> REQUEST REWORK
                </Button>
                <Button 
                  onClick={() => setApproveModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> APPROVE TASK
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Modal */}
        <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
          <DialogContent className="sm:max-w-[450px] bg-sidebar border-sidebar-border text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Approve Task
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Approve <span className="text-white font-mono font-bold">{selectedItem?.taskCode}</span> and mark task as Completed (Status 4 - Locked).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApprove} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="rating" className="text-sm font-semibold">Quality Rating (Optional, 1 to 5 Stars)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="bg-card border-sidebar-border text-white font-mono"
                  placeholder="5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="approveRemarks" className="text-sm font-semibold">Approval Remarks (Optional)</Label>
                <Textarea
                  id="approveRemarks"
                  placeholder="Great work! Approved for final delivery."
                  value={approveRemarks}
                  onChange={(e) => setApproveRemarks(e.target.value)}
                  className="bg-card border-sidebar-border text-white min-h-[80px]"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setApproveModalOpen(false)} className="border-sidebar-border text-white">
                  Cancel
                </Button>
                <Button type="submit" disabled={approving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2">
                  {approving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm Approval
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Request Rework Modal */}
        <Dialog open={reworkModalOpen} onOpenChange={setReworkModalOpen}>
          <DialogContent className="sm:max-w-[450px] bg-sidebar border-sidebar-border text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-400">
                <RotateCcw className="w-5 h-5 text-purple-400" /> Request Task Rework
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Send task <span className="text-white font-mono font-bold">{selectedItem?.taskCode}</span> back to artist for Rework (Status 5).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRequestRework} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="reworkReason" className="text-sm font-semibold text-white">
                  Rework Reason <span className="text-crimson">*</span>
                </Label>
                <Input
                  id="reworkReason"
                  placeholder="e.g. Edge noise in keying / Color mismatch / Tracking pop"
                  value={reworkReason}
                  onChange={(e) => setReworkReason(e.target.value)}
                  className="bg-card border-sidebar-border text-white font-medium"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reworkRemarks" className="text-sm font-semibold">Reviewer Detailed Remarks (Optional)</Label>
                <Textarea
                  id="reworkRemarks"
                  placeholder="Detailed notes on what specific frames or elements need fixing..."
                  value={reworkRemarks}
                  onChange={(e) => setReworkRemarks(e.target.value)}
                  className="bg-card border-sidebar-border text-white min-h-[90px]"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setReworkModalOpen(false)} className="border-sidebar-border text-white">
                  Cancel
                </Button>
                <Button type="submit" disabled={reworking} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-2">
                  {reworking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Request Rework
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
