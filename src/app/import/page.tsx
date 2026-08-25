"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  RefreshCw
} from 'lucide-react';
import { importService } from '@/services/importService';
import { useToast } from '@/hooks/use-toast';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{success: boolean, importedRows: number} | null>(null);
  const { toast } = useToast();

  // Staging rows state
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Sorting, Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('ImportedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Custom Filtering state
  const [complexityFilter, setComplexityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchRows = async () => {
    setLoading(true);
    try {
      const data = await importService.getImportedRows();
      if (data && data.items) {
        setRows(data.items);
      }
    } catch (e: any) {
      console.error('[ImportPage] Error fetching imported rows:', e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch imported rows from SQL Server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const data = await importService.simpleImport(file);
      setResult(data);
      toast({ title: 'Success', description: `Excel imported successfully: ${data.importedRows} rows stored.` });
      setFile(null);
      // Automatically refresh the preview table directly from SQL Server
      await fetchRows();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setUploading(false);
    }
  };

  // 1. Search and Filtering
  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      if (complexityFilter !== 'All' && row.Complexity !== complexityFilter) {
        return false;
      }
      if (statusFilter !== 'All' && row.Status !== statusFilter) {
        return false;
      }
      const searchStr = `${row.ClientShotName || ''} ${row.ShotName || ''} ${row.ShotType || ''} ${row.Episode || ''} ${row.VFXWorkDescription || ''} ${row.Complexity || ''} ${row.Artist || ''} ${row.Lead || ''} ${row.Status || ''}`.toLowerCase();
      return searchStr.includes(searchTerm.toLowerCase());
    });
  }, [rows, searchTerm, complexityFilter, statusFilter]);

  const uniqueComplexities = React.useMemo(() => {
    const values = rows.map(r => r.Complexity).filter(Boolean);
    return ['All', ...Array.from(new Set(values))];
  }, [rows]);

  const uniqueStatuses = React.useMemo(() => {
    const values = rows.map(r => r.Status).filter(Boolean);
    return ['All', ...Array.from(new Set(values))];
  }, [rows]);

  // 2. Sorting
  const sortedRows = React.useMemo(() => {
    if (!sortField) return filteredRows;
    const sorted = [...filteredRows].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aString = String(aVal).toLowerCase();
      const bString = String(bVal).toLowerCase();

      if (aString < bString) return sortDirection === 'asc' ? -1 : 1;
      if (aString > bString) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRows, sortField, sortDirection]);

  // 3. Pagination
  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const paginatedRows = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const columns = [
    { key: 'RowNumber', label: 'Row Number' },
    { key: 'ClientShotName', label: 'Client Shot Name' },
    { key: 'ShotName', label: 'Shot Name' },
    { key: 'ShotType', label: 'Shot Type' },
    { key: 'Episode', label: 'Episode' },
    { key: 'FrameRange', label: 'Frame Range' },
    { key: 'CutSummary', label: 'Cut Summary' },
    { key: 'VFXWorkDescription', label: 'VFX Work Description' },
    { key: 'Complexity', label: 'Complexity' },
    { key: 'RotoBid', label: 'Roto Bid' },
    { key: 'PaintBid', label: 'Paint Bid' },
    { key: 'CompBid', label: 'Comp Bid' },
    { key: 'CGBid', label: 'CG Bid' },
    { key: 'RetimeRepo', label: 'Retime Repo' },
    { key: 'TotalBid', label: 'Total Bid' },
    { key: 'Artist', label: 'Artist' },
    { key: 'Lead', label: 'Lead' },
    { key: 'StartDate', label: 'Start Date' },
    { key: 'ETA', label: 'ETA' },
    { key: 'Status', label: 'Status' },
    { key: 'ClientETA', label: 'Client ETA' },
    { key: 'DeliveryDate', label: 'Delivery Date' },
    { key: 'ImportedAt', label: 'Imported At' }
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">Excel Import & Preview</h1>
              <p className="text-muted-foreground">Upload and inspect imported Bid Sheet staging records.</p>
            </div>
            <Button variant="outline" className="border-sidebar-border" onClick={fetchRows} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Staging Data
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Upload Area */}
            <Card className="bg-card border-dashed border-2 border-sidebar-border lg:col-span-1">
              <CardContent className="p-6 flex flex-col items-center text-center">
                {uploading ? (
                  <div className="py-6 space-y-4">
                    <RefreshCw className="w-12 h-12 text-crimson animate-spin mx-auto" />
                    <p className="text-sm font-medium text-white">Parsing spreadsheet...</p>
                  </div>
                ) : result ? (
                  <div className="py-2 space-y-4">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                    <h2 className="text-lg font-bold text-white">Import Complete</h2>
                    <p className="text-xs text-muted-foreground">Successfully loaded {result.importedRows} rows into SQL Server.</p>
                    <Button size="sm" className="bg-crimson w-full" onClick={() => setResult(null)}>
                      Upload New File
                    </Button>
                  </div>
                ) : (
                  <div className="py-2 space-y-4 w-full">
                    <FileSpreadsheet className="w-12 h-12 text-crimson mx-auto" />
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      <div className="bg-crimson/10 hover:bg-crimson/20 px-4 py-3 rounded-lg transition-colors border border-crimson/20">
                        <span className="text-crimson text-xs font-semibold block truncate max-w-[180px] mx-auto">
                          {file ? file.name : 'Select Excel spreadsheet'}
                        </span>
                      </div>
                    </label>
                    {file && (
                      <Button 
                        size="sm"
                        className="w-full bg-crimson shadow-md shadow-crimson/20 font-bold"
                        onClick={handleUpload}
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Execute Upload
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:col-span-1 h-full">
              <Card className="bg-card border-none p-6 shadow-xl flex flex-col justify-center h-full min-h-[120px]">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Staging Source of Truth</p>
                <h3 className="text-3xl font-headline text-white">dbo.BidSheetImport</h3>
              </Card>
              <Card className="bg-card border-none p-6 shadow-xl flex flex-col justify-center h-full min-h-[120px] border-l-4 border-crimson">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Imported Rows</p>
                <h3 className="text-3xl font-headline text-white">{rows.length}</h3>
              </Card>
            </div>
          </div>

          {/* Staging Data Grid */}
          <Card className="bg-card border-none shadow-2xl overflow-hidden">
            <CardHeader className="bg-sidebar-accent/20 border-b border-sidebar-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-6">
              <div>
                <CardTitle className="text-white font-headline text-lg">Staging Data Preview</CardTitle>
                <CardDescription>
                  Direct, real-time read of the staging records in SQL Server. | <span className="font-bold text-crimson">Imported Rows : {rows.length}</span>
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search imported values..." 
                    className="pl-10 bg-sidebar border-none text-white placeholder:text-muted-foreground w-full" 
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <select
                  value={complexityFilter}
                  onChange={(e) => { setComplexityFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-sidebar text-white border-none rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-crimson outline-none h-10 min-w-[120px] cursor-pointer"
                >
                  <option value="All">All Complexities</option>
                  {uniqueComplexities.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-sidebar text-white border-none rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-crimson outline-none h-10 min-w-[120px] cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  {uniqueStatuses.filter(s => s !== 'All').map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full custom-scrollbar">
                <div className="min-w-max">
                  <Table>
                    <TableHeader className="bg-sidebar-accent/50 border-b border-sidebar-border">
                      <TableRow className="border-sidebar-border hover:bg-transparent">
                        {columns.map(col => (
                          <TableHead 
                            key={col.key} 
                            onClick={() => handleSort(col.key)}
                            className="cursor-pointer select-none text-white hover:text-crimson transition-colors font-semibold py-4"
                          >
                            <div className="flex items-center gap-2">
                              {col.label}
                              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-sidebar-border">
                      {loading ? (
                        <TableRow className="border-none hover:bg-transparent">
                          <TableCell colSpan={columns.length} className="text-center py-20 text-muted-foreground">
                            <RefreshCw className="w-8 h-8 text-crimson animate-spin mx-auto mb-4" />
                            Reading staging data from SQL Server...
                          </TableCell>
                        </TableRow>
                      ) : paginatedRows.length === 0 ? (
                        <TableRow className="border-none hover:bg-transparent">
                          <TableCell colSpan={columns.length} className="text-center py-20 text-muted-foreground font-medium">
                            No imported staging records found in the database.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRows.map((row: any, idx: number) => (
                          <TableRow key={row.Id || idx} className="border-sidebar-border hover:bg-sidebar-accent/10 transition-colors">
                            {columns.map(col => {
                              let val = row[col.key];
                              // Format dates
                              if (val && (col.key === 'ImportedAt' || col.key === 'StartDate' || col.key === 'ETA' || col.key === 'ClientETA' || col.key === 'DeliveryDate')) {
                                try {
                                  val = new Date(val).toISOString().split('T')[0];
                                } catch (e) {}
                              }
                              return (
                                <TableCell key={col.key} className="py-4 text-xs max-w-[250px] truncate text-white/90">
                                  {val === null || val === undefined ? (
                                    <span className="text-muted-foreground italic font-light opacity-50">null</span>
                                  ) : (
                                    String(val)
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination Footer */}
              {!loading && sortedRows.length > 0 && (
                <div className="p-4 bg-sidebar-accent/20 border-t border-sidebar-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">
                    Showing <span className="font-bold text-white">{Math.min(sortedRows.length, (currentPage - 1) * pageSize + 1)}</span> to{" "}
                    <span className="font-bold text-white">{Math.min(sortedRows.length, currentPage * pageSize)}</span> of{" "}
                    <span className="font-bold text-white">{sortedRows.length}</span> staging rows
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                      disabled={currentPage === 1}
                      className="border-sidebar-border h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-white">
                      Page <span className="font-bold">{currentPage}</span> of {totalPages || 1}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                      disabled={currentPage === totalPages}
                      className="border-sidebar-border h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
