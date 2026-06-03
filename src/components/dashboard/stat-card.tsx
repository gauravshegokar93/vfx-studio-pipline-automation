
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconColor?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className, iconColor = "text-crimson" }: StatCardProps) {
  return (
    <Card className={cn("bg-card border-none shadow-md hover:ring-1 hover:ring-sidebar-border transition-all", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground font-body">{label}</p>
            <h3 className="text-3xl font-headline text-white">{value}</h3>
          </div>
          <div className={cn("p-2 rounded-lg bg-sidebar-accent", iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-2">
            <span className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              trend.isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            )}>
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">vs last week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
