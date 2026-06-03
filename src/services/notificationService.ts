
import { Notification } from '@/lib/types';

const MOCK_DELAY = 300;

export const notificationService = {
  getForUser: async (userId: string): Promise<Notification[]> => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      {
        id: 'n1',
        userId,
        message: 'New task assigned: Hero Comp SH_010',
        type: 'TaskAssignment',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'n2',
        userId,
        message: 'Shot SH_025 needs retake. Comment: Edge noise.',
        type: 'ReviewRetake',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  },
  markAsRead: async (id: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 100));
    return true;
  }
};
