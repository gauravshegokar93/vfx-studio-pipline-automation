"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { analyticsService } from '@/services/analyticsService';
import { userService } from '@/services/userService';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, UserMinus, UserCheck, Activity, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

export default function WorkloadPage() {
  const [capacity, setCapacity] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [capData, artData] = await Promise.all([
        analyticsService.getDepartmentUtilization(),
        userService.getDepartmentStaff('all')
      ]);
      setCapacity(capData);
      setArtists(artData);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-headline text-white">Workload & Capacity</h1>
            <p className="text-muted-foreground">Departmental allocation and artist efficiency tracking.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <Card className="bg-card border-none p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Global Capacity</p>
                      <h3 className="text-3xl font-headline text-white mt-1">82%</h3>
                   </div>
                   <Activity className="text-blue-500 w-5 h-5" />
                </div>
                <Progress value={82} className="h-1 mt-4" />
             </Card>
             <Card className="bg-card border-none p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Artists Active</p>
                      <h3 className="text-3xl font-headline text-white mt-1">142</h3>
                   </div>
                   <UserCheck className="text-green-500 w-5 h-5" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 uppercase">92% Engagement Rate</p>
             </Card>
             <Card className="bg-card border-none p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">On Leave</p>
                      <h3 className="text-3xl font-headline text-white mt-1">12</h3>
                   </div>
                   <UserMinus className="text-yellow-500 w-5 h-5" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 uppercase">Reducing total capacity by 8%</p>
             </Card>
             <Card className="bg-card border-none p-6">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Production Health</p>
                      <h3 className="text-3xl font-headline text-white mt-1">STABLE</h3>
                   </div>
                   <BarChart2 className="text-crimson w-5 h-5" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 uppercase">Based on Bid vs Actual variance</p>
             </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="bg-card border-none lg:col-span-2 shadow-xl">
               <CardHeader>
                  <CardTitle className="text-white text-xl font-headline">Departmental Capacity Allocation</CardTitle>
                  <CardDescription>Target utilization is between 75% and 85%.</CardDescription>
               </CardHeader>
               <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={capacity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                           {capacity.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.value > 90 ? '#E6192E' : entry.value > 70 ? '#3266E6' : '#666'} />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-xl">
               <CardHeader>
                  <CardTitle className="text-white text-xl font-headline">Artist Efficiency</CardTitle>
                  <CardDescription>Top producers (Bid / Actual ratio)</CardDescription>
               </CardHeader>
               <CardContent className="space-y-6">
                  {artists.slice(0, 5).map((artist, i) => (
                    <div key={artist.id} className="space-y-2">
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-white font-bold">{artist.name}</span>
                          <span className="text-green-500 font-bold">112% Efficiency</span>
                       </div>
                       <Progress value={85} className="h-1 bg-sidebar-accent" />
                       <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Department: {artist.departmentId}</span>
                          <span>Tasks: 12</span>
                       </div>
                    </div>
                  ))}
               </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
