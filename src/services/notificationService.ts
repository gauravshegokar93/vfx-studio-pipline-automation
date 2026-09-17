import { apiClient } from './apiClient';

export interface NotificationItem {
  id: string | number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdDate: string;
  referenceId?: string | number;
}

export const notificationService = {
  /**
   * Fetch all unread notifications for the current user
   */
  getUnread: async (): Promise<NotificationItem[]> => {
    try {
      const response = await apiClient.get('/notifications');
      return response.data?.notifications || [];
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      return [];
    }
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId: string | number): Promise<boolean> => {
    try {
      await apiClient.post(`/notifications/${notificationId}/read`);
      return true;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      return false;
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<boolean> => {
    try {
      await apiClient.post('/notifications/mark-all-read');
      return true;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      return false;
    }
  }
};
