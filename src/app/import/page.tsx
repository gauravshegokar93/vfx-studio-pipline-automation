"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importService, ImportBatch, ImportRow } from '@/services/importService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BidSheetImportPage() {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [batches, setBatches] = useState<ImportBatch[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
    const [rows, setRows] = useState<ImportRow[]>([]);
    const [filter, setFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
    const [editingRow, setEditingRow] = useState<number | null>(null);
    const [editData, setEditData] = useState<Partial<ImportRow>>({});

    useEffect(() => {
        loadBatches();
    }, []);

    const loadBatches = async () => {
        try {
            const data = await importService.getBatches();
            setBatches(data);
        } catch (error: any) {
            toast({ title: 'Error loading batches', description: error.message, variant: 'destructive' });
        }
    };

    const loadRows = async (batchId: number) => {
        try {
            const data = await importService.getBatchRows(batchId);
            setRows(data);
        } catch (error: any) {
            toast({ title: 'Error loading rows', description: error.message, variant: 'destructive' });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            const data = await importService.uploadExcel(file);
            toast({ title: 'Upload successful', description: `Imported ${data.TotalRecords} records.` });
            setFile(null);
            loadBatches();
            if (data.ImportBatchID) {
                const batch = await importService.getBatches().then(res => res.find(b => b.ImportBatchID === data.ImportBatchID));
                if (batch) selectBatch(batch);
            }
        } catch (error: any) {
            toast({ title: 'Upload failed', description: error.message || 'An error occurred', variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    const selectBatch = (batch: ImportBatch) => {
        setSelectedBatch(batch);
        loadRows(batch.ImportBatchID);
    };

    const startEditing = (row: ImportRow) => {
        setEditingRow(row.BatchRowID);
        setEditData(row);
    };

    const saveEdit = async () => {
        if (!editingRow) return;
        try {
            await importService.updateRow(editingRow, editData);
            setEditingRow(null);
            if (selectedBatch) {
                loadRows(selectedBatch.ImportBatchID);
            }
            toast({ title: 'Row updated' });
        } catch (error: any) {
            toast({ title: 'Failed to update row', description: error.message, variant: 'destructive' });
        }
    };

    const revalidate = async () => {
        if (!selectedBatch) return;
        try {
            await importService.revalidateBatch(selectedBatch.ImportBatchID);
            loadBatches();
            loadRows(selectedBatch.ImportBatchID);
            // Refresh selectedBatch context
            const batch = await importService.getBatches().then(res => res.find(b => b.ImportBatchID === selectedBatch.ImportBatchID));
            if (batch) setSelectedBatch(batch);
            toast({ title: 'Revalidation complete' });
        } catch (error: any) {
            toast({ title: 'Revalidation failed', description: error.message, variant: 'destructive' });
        }
    };

    const filteredRows = rows.filter(r => filter === 'ALL' || r.ValidationStatus === filter);

    return (
        <div className="flex h-screen bg-background text-foreground">
            <AppSidebar />
            <main className="flex-1 overflow-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-headline tracking-tight">Bid Sheet Import</h1>
                        <p className="text-muted-foreground mt-1">Upload and validate client bid sheets before production.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload Excel</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4">
                                <Input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
                                <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
                                    {isUploading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Upload Bid Sheet
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Recent Imports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {batches.map(batch => (
                                    <Button 
                                        key={batch.ImportBatchID} 
                                        variant={selectedBatch?.ImportBatchID === batch.ImportBatchID ? "default" : "outline"}
                                        onClick={() => selectBatch(batch)}
                                        className="whitespace-nowrap"
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        {batch.BatchName} 
                                        <Badge variant="secondary" className="ml-2">{new Date(batch.StartedOn).toLocaleDateString()}</Badge>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {selectedBatch && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold">{selectedBatch.TotalRecords}</div>
                                    <p className="text-sm text-muted-foreground">Total Rows</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-green-500">{selectedBatch.SuccessRecords}</div>
                                    <p className="text-sm text-muted-foreground">Valid Rows</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-red-500">{selectedBatch.FailedRecords}</div>
                                    <p className="text-sm text-muted-foreground">Invalid Rows</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6 flex items-center justify-between">
                                    <div>
                                        <div className="text-2xl font-bold">{selectedBatch.ImportStatus}</div>
                                        <p className="text-sm text-muted-foreground">Status</p>
                                    </div>
                                    <Button onClick={revalidate} variant="outline" size="sm">
                                        <RefreshCw className="mr-2 h-4 w-4" /> Revalidate
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                <CardTitle>Import Details</CardTitle>
                                <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Rows</SelectItem>
                                        <SelectItem value="VALID">Valid Only</SelectItem>
                                        <SelectItem value="INVALID">Invalid Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Row</TableHead>
                                                <TableHead>Validation</TableHead>
                                                <TableHead>Project</TableHead>
                                                <TableHead>Reel</TableHead>
                                                <TableHead>Shot</TableHead>
                                                <TableHead>Batch</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>HeadIn</TableHead>
                                                <TableHead>TailOut</TableHead>
                                                <TableHead>Frame Range</TableHead>
                                                <TableHead>SOW</TableHead>
                                                <TableHead>Vendor</TableHead>
                                                <TableHead>Complexity</TableHead>
                                                <TableHead>Roto</TableHead>
                                                <TableHead>Paint</TableHead>
                                                <TableHead>Comp</TableHead>
                                                <TableHead>CG</TableHead>
                                                <TableHead>Total</TableHead>
                                                <TableHead>ETA</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRows.map(row => (
                                                <TableRow key={row.BatchRowID} className={row.ValidationStatus === 'INVALID' ? 'bg-red-500/5' : ''}>
                                                    <TableCell>{row.RowNumber}</TableCell>
                                                    <TableCell>
                                                        {row.ValidationStatus === 'VALID' ? (
                                                            <CheckCircle className="text-green-500 h-5 w-5" />
                                                        ) : (
                                                            <div className="flex items-center text-red-500" title={row.ValidationMessage}>
                                                                <AlertCircle className="h-5 w-5 mr-1" />
                                                                <span className="text-xs truncate max-w-[120px]">{row.ValidationMessage}</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    {editingRow === row.BatchRowID ? (
                                                        <>
                                                            <TableCell><Input value={editData.Project || ''} onChange={e => setEditData({...editData, Project: e.target.value})} className="w-20" /></TableCell>
                                                            <TableCell><Input value={editData.Episode || ''} onChange={e => setEditData({...editData, Episode: e.target.value})} className="w-20" /></TableCell>
                                                            <TableCell><Input value={editData.ShotName || ''} onChange={e => setEditData({...editData, ShotName: e.target.value})} className="w-28" /></TableCell>
                                                            <TableCell><Input value={editData.Batch || ''} onChange={e => setEditData({...editData, Batch: e.target.value})} className="w-20" /></TableCell>
                                                            <TableCell><Input value={editData.Department || ''} onChange={e => setEditData({...editData, Department: e.target.value})} className="w-20" /></TableCell>
                                                            <TableCell><Input type="number" value={editData.HeadIn || 0} onChange={e => setEditData({...editData, HeadIn: parseInt(e.target.value)})} className="w-16" /></TableCell>
                                                            <TableCell><Input type="number" value={editData.TailOut || 0} onChange={e => setEditData({...editData, TailOut: parseInt(e.target.value)})} className="w-16" /></TableCell>
                                                            <TableCell><Input value={editData.FrameRange || ''} onChange={e => setEditData({...editData, FrameRange: e.target.value})} className="w-16" /></TableCell>
                                                            <TableCell><Input value={editData.SOW || ''} onChange={e => setEditData({...editData, SOW: e.target.value})} className="w-28" /></TableCell>
                                                            <TableCell><Input value={editData.Vendor || ''} onChange={e => setEditData({...editData, Vendor: e.target.value})} className="w-20" /></TableCell>
                                                            <TableCell><Input value={editData.Complexity || ''} onChange={e => setEditData({...editData, Complexity: e.target.value})} className="w-20" /></TableCell>
                                                            <TableCell><Input type="number" step="0.1" value={editData.RotoBid || 0} onChange={e => setEditData({...editData, RotoBid: parseFloat(e.target.value)})} className="w-16" /></TableCell>
                                                            <TableCell><Input type="number" step="0.1" value={editData.PaintBid || 0} onChange={e => setEditData({...editData, PaintBid: parseFloat(e.target.value)})} className="w-16" /></TableCell>
                                                            <TableCell><Input type="number" step="0.1" value={editData.CompBid || 0} onChange={e => setEditData({...editData, CompBid: parseFloat(e.target.value)})} className="w-16" /></TableCell>
                                                            <TableCell><Input type="number" step="0.1" value={editData.CGBid || 0} onChange={e => setEditData({...editData, CGBid: parseFloat(e.target.value)})} className="w-16" /></TableCell>
                                                            <TableCell><Input type="number" step="0.1" value={editData.TotalBid || 0} onChange={e => setEditData({...editData, TotalBid: parseFloat(e.target.value)})} className="w-16" /></TableCell>
                                                            <TableCell><Input value={editData.ETA || ''} onChange={e => setEditData({...editData, ETA: e.target.value})} className="w-24" /></TableCell>
                                                            <TableCell><Input value={editData.Status || ''} onChange={e => setEditData({...editData, Status: e.target.value})} className="w-20" /></TableCell>
                                                            <TableCell>
                                                                <Button size="sm" onClick={saveEdit}>Save</Button>
                                                            </TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableCell>{row.Project}</TableCell>
                                                            <TableCell>{row.Episode}</TableCell>
                                                            <TableCell className="font-mono text-xs">{row.ShotName || row.ClientShotName}</TableCell>
                                                            <TableCell>{row.Batch}</TableCell>
                                                            <TableCell>{row.Department}</TableCell>
                                                            <TableCell>{row.HeadIn}</TableCell>
                                                            <TableCell>{row.TailOut}</TableCell>
                                                            <TableCell>{row.FrameRange}</TableCell>
                                                            <TableCell className="max-w-[200px] truncate" title={row.SOW}>{row.SOW}</TableCell>
                                                            <TableCell>{row.Vendor}</TableCell>
                                                            <TableCell>{row.Complexity}</TableCell>
                                                            <TableCell>{row.RotoBid}</TableCell>
                                                            <TableCell>{row.PaintBid}</TableCell>
                                                            <TableCell>{row.CompBid}</TableCell>
                                                            <TableCell>{row.CGBid}</TableCell>
                                                            <TableCell className="font-bold">{row.TotalBid}</TableCell>
                                                            <TableCell>{row.ETA}</TableCell>
                                                            <TableCell>{row.Status}</TableCell>
                                                            <TableCell>
                                                                <Button size="sm" variant="ghost" onClick={() => startEditing(row)}>
                                                                    Edit
                                                                </Button>
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            ))}
                                            {filteredRows.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={21} className="text-center py-8 text-muted-foreground">
                                                        No rows match the current filter.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
