"use client";

import React, { useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle2, AlertCircle, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLuminaStore } from '@/lib/store';

export default function NotificationsPage() {
  const { 
    currentUser, 
    notifications, 
    fetchNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
  } = useLuminaStore();

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser, fetchNotifications]);

  const handleMarkAll = async () => {
    await markAllNotificationsAsRead();
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-headline text-white mb-2">Notification Center</h1>
              <p className="text-muted-foreground">Manage alerts, assignments, and production updates.</p>
            </div>
            <Badge 
              variant="outline" 
              className="border-sidebar-border text-muted-foreground cursor-pointer hover:text-white"
              onClick={handleMarkAll}
            >
              Mark all as read
            </Badge>
          </div>

          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center p-12 bg-sidebar-accent/20 rounded-xl border border-sidebar-border border-dashed">
                <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">You have no notifications.</p>
              </div>
            ) : (
              notifications.map(n => (
                <Card 
                  key={n.id} 
                  className={cn(
                    "bg-card border-none transition-all hover:bg-sidebar-accent/20 cursor-pointer",
                    !n.isRead && "border-l-4 border-crimson bg-crimson/5"
                  )}
                  onClick={() => { if (!n.isRead) handleMarkRead(n.id); }}
                >
                  <CardContent className="p-6 flex items-start gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      n.type === 'TaskAssignment' ? "bg-blue-500/10 text-blue-500" :
                      n.type === 'ReviewRetake' ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"
                    )}>
                      {n.type === 'TaskAssignment' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className={cn("text-lg", !n.isRead ? "text-white font-bold" : "text-muted-foreground")}>{n.message}</p>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase border-sidebar-border">{n.type}</Badge>
                        {!n.isRead && <Badge className="bg-crimson text-white text-[8px] uppercase">New</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
