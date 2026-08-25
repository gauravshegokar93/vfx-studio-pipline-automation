"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { importReviewService, ImportRow } from '@/services/importReviewService';
import { useToast } from '@/hooks/use-toast';
import { EditRowModal } from '@/components/import-review/EditRowModal';
import { RefreshCw, Play, Trash, Edit, CheckCircle } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';

const columnHelper = createColumnHelper<ImportRow>();

export default function ImportReviewPage() {
  const [data, setData] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingRow, setEditingRow] = useState<ImportRow | null>(null);
  const { toast } = useToast();

  const fetchRows = async () => {
    setLoading(true);
    try {
      const rows = await importReviewService.getPendingImports();
      setData(rows || []);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error fetching staging data', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await importReviewService.approveImports();
      if (res.success) {
        toast({ title: 'Success', description: `Successfully converted ${res.convertedRows} rows to Production.` });
        await fetchRows();
      } else {
        toast({ variant: 'destructive', title: 'Conversion Failed', description: res.message });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Conversion Failed', description: e.message });
    } finally {
      setApproving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this staging record?')) return;
    try {
      await importReviewService.deleteImportRow(id);
      setData(prev => prev.filter(r => r.Id !== id));
      toast({ title: 'Deleted', description: 'Row deleted successfully.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const columns = [
    columnHelper.accessor('ClientShotName', { header: 'Client Shot Name', cell: info => info.getValue() }),
    columnHelper.accessor('ShotName', { header: 'Shot Name', cell: info => <span className="font-bold text-crimson">{info.getValue()}</span> }),
    columnHelper.accessor('Episode', { header: 'Episode', cell: info => info.getValue() }),
    columnHelper.accessor('Complexity', { header: 'Complexity', cell: info => info.getValue() }),
    columnHelper.accessor('TotalBid', { header: 'Total Bid', cell: info => info.getValue() }),
    columnHelper.accessor('Artist', { header: 'Artist', cell: info => info.getValue() }),
    columnHelper.accessor('Lead', { header: 'Lead', cell: info => info.getValue() }),
    columnHelper.accessor('Status', { header: 'Status', cell: info => info.getValue() }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditingRow(info.row.original)} className="h-8 w-8 p-0 border-sidebar-border">
            <Edit className="h-4 w-4 text-blue-400" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(info.row.original.Id)} className="h-8 w-8 p-0 border-sidebar-border hover:bg-red-500/10">
            <Trash className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    })
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
          <div className="flex justify-between items-center bg-sidebar-accent/10 p-6 rounded-xl border border-sidebar-border shadow-xl">
            <div>
              <h1 className="text-3xl font-headline text-white mb-2">Production Import Review</h1>
              <p className="text-muted-foreground text-sm max-w-2xl">
                Review the staging data imported from Bid Sheets. Tweak missing leads, estimate times, and correct any formatting issues before officially injecting them into the active production pipeline.
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <Button variant="outline" className="border-sidebar-border" onClick={fetchRows} disabled={loading || approving}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh List
              </Button>
              <Button 
                onClick={handleApprove} 
                disabled={data.length === 0 || loading || approving}
                className="bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50"
              >
                {approving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
                Approve & Convert Pipeline
              </Button>
            </div>
          </div>

          <Card className="bg-card border-none shadow-2xl overflow-hidden">
            <CardHeader className="bg-sidebar-accent/20 border-b border-sidebar-border flex flex-row justify-between items-center p-6">
              <div>
                <CardTitle className="text-white font-headline text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-crimson" />
                  Staging Queue
                </CardTitle>
                <CardDescription>Records awaiting pipeline conversion ({data.length} pending)</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-sidebar-accent/50 text-muted-foreground border-b border-sidebar-border">
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th key={header.id} className="py-4 px-6 font-semibold select-none cursor-pointer" onClick={header.column.getToggleSortingHandler()}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' 🔼', desc: ' 🔽' }[header.column.getIsSorted() as string] ?? null}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-sidebar-border">
                    {loading ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-20 text-muted-foreground">
                          <RefreshCw className="w-8 h-8 text-crimson animate-spin mx-auto mb-4" />
                          Loading staging records...
                        </td>
                      </tr>
                    ) : table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-20 text-muted-foreground font-medium">
                          No pending imports. The staging queue is empty.
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="hover:bg-sidebar-accent/10 transition-colors">
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="py-4 px-6 text-white/90">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {editingRow && (
        <EditRowModal 
          row={editingRow} 
          onClose={() => setEditingRow(null)} 
          onSaved={() => { setEditingRow(null); fetchRows(); }} 
        />
      )}
    </div>
  );
}
