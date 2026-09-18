'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Users, LayoutDashboard, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/services/apiClient';
import EmployeePerformanceDrawer from './components/EmployeePerformanceDrawer';

interface ArtistWorkloadRow {
  artist: {
    id: number;
    userId: number;
    fullName: string;
    employeeCode: string;
    email: string;
    departmentId: number;
    departmentName: string;
    isActive: boolean;
  };

  taskCount: number;
  activeTaskCount: number;
  assignedCount: number;
  inProgressCount: number;
  reviewCount: number;
  reworkCount: number;
  completedCount: number;
  overdueCount: number;
  reviewSubmissions: number;
  historicalReworkCount: number;
  taskComplexities: string;

  allocatedBids: number;
  targetBid: number;
  actualBid: number;
  remainingBid: number;

  estimatedHours: number;
  targetHours: number;
  actualHours: number;
}

export default function EmployeePerformancePage() {
  const { user } = useAuth();
  const [data, setData] = useState<ArtistWorkloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  
  const [departments, setDepartments] = useState<{ id: number, name: string }[]>([]);
  
  // Drawer state
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);

  useEffect(() => {
    fetchDepartments();
    fetchData();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get('/departments');
      const validDepts = res.data.items.filter((d: any) => 
        ['Roto', 'Paint', 'Comp', 'CG'].includes(d.name)
      );
      setDepartments(validDepts);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/artist-workload', {
        params: {
          departmentId: selectedDept !== 'all' ? selectedDept : undefined,
          searchQuery: search
        }
      });
      setData(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData();
  };

  const formattedBid = (val: number) => {
    return `${val.toFixed(2)} Bid`;
  };

  if (loading && data.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex-1 p-8 text-white flex items-center justify-center">
          Loading...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-full w-full bg-background text-white overflow-hidden relative">
        
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sidebar-accent/20 via-background to-background pointer-events-none" />

        <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
          <div className="p-8 pb-4 border-b border-sidebar-border relative z-10 flex flex-col gap-6">
            <div>
              <h1 className="text-4xl font-headline tracking-tight">Employee Performance</h1>
              <p className="text-muted-foreground mt-2 text-sm flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Comprehensive production metrics and workflow history
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search employee..." 
                  className="pl-9 bg-sidebar-accent border-sidebar-border"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Select value={selectedDept} onValueChange={(val) => { setSelectedDept(val); setTimeout(fetchData, 100); }}>
                <SelectTrigger className="w-[180px] bg-sidebar-accent border-sidebar-border">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={fetchData} variant="outline" className="gap-2">
                <Filter className="w-4 h-4" /> Apply Filters
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8 relative z-10">
            <Card className="bg-sidebar border-sidebar-border shadow-xl">
              <CardHeader className="border-b border-sidebar-border">
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" /> Active Employees
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border hover:bg-transparent">
                      <TableHead className="pl-6 text-white font-bold">Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Active Tasks</TableHead>
                      <TableHead className="text-right">In Progress</TableHead>
                      <TableHead className="text-right">Reviews</TableHead>
                      <TableHead className="text-right">Reworks</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                      <TableHead className="text-right">Target Bid</TableHead>
                      <TableHead className="text-right">Actual Bid</TableHead>
                      <TableHead className="text-right pr-6">Remaining Bid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow 
                        key={row.artist.userId} 
                        className="border-sidebar-border hover:bg-sidebar-accent/40 cursor-pointer transition-colors"
                        onClick={() => setSelectedArtistId(row.artist.userId)}
                      >
                        <TableCell className="pl-6 font-bold">{row.artist.fullName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-blue-400 border-blue-400/30 uppercase text-[10px]">
                            {row.artist.departmentName || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{row.activeTaskCount}</TableCell>
                        <TableCell className="text-right text-blue-400 font-bold">{row.inProgressCount}</TableCell>
                        <TableCell className="text-right text-yellow-400 font-bold">{row.reviewCount}</TableCell>
                        <TableCell className="text-right text-red-400 font-bold">{row.reworkCount}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-bold">{row.completedCount}</TableCell>
                        <TableCell className="text-right text-crimson font-bold">{row.overdueCount}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formattedBid(row.targetBid)}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-400 font-bold">{formattedBid(row.actualBid)}</TableCell>
                        <TableCell className="text-right pr-6 font-mono text-xs">{formattedBid(row.remainingBid)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          
          <EmployeePerformanceDrawer 
            artistId={selectedArtistId} 
            onClose={() => setSelectedArtistId(null)} 
          />
        </main>
      </div>
    </DashboardLayout>
  );
}
