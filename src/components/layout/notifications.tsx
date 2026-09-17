"use client";

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateTimeLocal } from '@/lib/formatTime';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { notificationService, NotificationItem } from '@/services/notificationService';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    const fetched = await notificationService.getUnread();
    setNotifications(fetched);
  };

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    
    // Mark all as read when popover is opened
    if (isOpen) {
      const unreadExists = notifications.some(n => !n.isRead);
      if (unreadExists) {
        // Optimistic UI update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        await notificationService.markAllAsRead();
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRead = async (id: string | number, referenceId?: string | number, isRead?: boolean) => {
    if (!isRead) {
      const success = await notificationService.markAsRead(id);
      if (success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    }
    if (referenceId) {
      setOpen(false);
      router.push(`/tasks/${referenceId}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-sidebar-accent/80 group shrink-0 transition-all duration-200 hover:scale-105 active:scale-95">
          <Bell className="w-5 h-5 text-sidebar-foreground group-hover:text-white transition-colors" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 px-1 min-w-[1.25rem] h-5 flex items-center justify-center bg-crimson text-white border-2 border-sidebar-background rounded-full animate-pulse-subtle"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4 mt-2 shadow-2xl border-sidebar-border" align="end">
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border/50 bg-background/50">
          <h4 className="font-semibold leading-none tracking-tight">Notifications</h4>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-crimson/20 text-crimson">
              {unreadCount} Unread
            </Badge>
          )}
        </div>
        <ScrollArea className="h-80 w-full rounded-md">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm p-4 text-center">
              <Bell className="w-8 h-8 mb-2 opacity-20" />
              <p>You have no new notifications.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 border-b border-sidebar-border/30 hover:bg-sidebar-accent/10 cursor-pointer transition-colors",
                    !n.isRead && "bg-sidebar-accent/5"
                  )}
                  onClick={() => handleRead(n.id, n.referenceId, n.isRead)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 pr-2">
                      <span className={cn("text-sm leading-tight", !n.isRead ? "font-semibold" : "font-medium text-muted-foreground")}>{n.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {n.message}
                      </span>
                    </div>
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-crimson shrink-0 mt-1" />}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4 mt-2 block">
                    {formatDateTimeLocal(n.createdDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

