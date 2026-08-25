import { Notification } from '@/lib/types';
import { apiClient } from './apiClient';

export const notificationService = {
  getForUser: async (): Promise<Notification[]> => {
    try {
      const res = await apiClient.get('/notifications');
      return res.data.notifications || [];
    } catch (e) {
      console.error('Failed to fetch notifications', e);
      return [];
    }
  },
  markAsRead: async (id: string): Promise<boolean> => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      return true;
    } catch (e) {
      console.error('Failed to mark notification as read', e);
      return false;
    }
  },
  markAllAsRead: async (): Promise<boolean> => {
    try {
      await apiClient.put(`/notifications/read-all`);
      return true;
    } catch (e) {
      console.error('Failed to mark all notifications as read', e);
      return false;
    }
  }
};
