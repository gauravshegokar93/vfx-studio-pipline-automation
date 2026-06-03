"use client";

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart,
  Line,
  Cell
} from 'recharts';
import { analyticsService, PerformanceMetric } from '@/services/analyticsService';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Users } from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState<PerformanceMetric[]>([]);
  const [health, setHealth] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [perfData, healthData] = await Promise.all([
          analyticsService.getDepartmentPerformance(),
          analyticsService.getProjectHealth()
        ]);
        setPerformance(perfData);
        setHealth(healthData);
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-headline text-white">Production Analytics</h1>
            <p className="text-muted-foreground">High-level insights into studio productivity and project status.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-card border-none p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Global Productivity</p>
                  <h3 className="text-3xl font-headline text-white mt-1">104.2%</h3>
                </div>
                <div className="p-2 bg-green-500/10 rounded-lg"><TrendingUp className="text-green-500 w-5 h-5" /></div>
              </div>
            </Card>
            <Card className="bg-card border-none p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Active Artists</p>
                  <h3 className="text-3xl font-headline text-white mt-1">142</h3>
                </div>
                <div className="p-2 bg-crimson/10 rounded-lg"><Users className="text-crimson w-5 h-5" /></div>
              </div>
            </Card>
            <Card className="bg-card border-none p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Shots Delivered</p>
                  <h3 className="text-3xl font-headline text-white mt-1">892</h3>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg"><Activity className="text-blue-500 w-5 h-5" /></div>
              </div>
            </Card>
            <Card className="bg-card border-none p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Risk Factor</p>
                  <h3 className="text-3xl font-headline text-white mt-1">Low</h3>
                </div>
                <div className="p-2 bg-yellow-500/10 rounded-lg"><TrendingDown className="text-yellow-500 w-5 h-5 rotate-180" /></div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white text-xl font-headline">Department Productivity Index</CardTitle>
                <CardDescription>Productivity = (Bid / Actual) * 100</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {loading ? <Skeleton className="w-full h-full bg-sidebar-accent" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Bar dataKey="productivity" radius={[4, 4, 0, 0]}>
                        {performance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.productivity >= 100 ? '#E6192E' : '#ca8a04'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-white text-xl font-headline">Weekly Shot Velocity</CardTitle>
                <CardDescription>Average shot completion trend over the current week.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {loading ? <Skeleton className="w-full h-full bg-sidebar-accent" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={health}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="day" stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                      <YAxis stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Line type="monotone" dataKey="completion" stroke="#E6192E" strokeWidth={3} dot={{ r: 6, fill: '#E6192E' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
