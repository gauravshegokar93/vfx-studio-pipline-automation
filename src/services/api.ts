
import axios from 'axios';
import { Project, Shot, Task, User, Role } from '@/lib/types';

// Mock implementation of API calls. 
// In production, this would use axios to call your SQL Server backend.
const MOCK_DELAY = 800;

export const apiService = {
  auth: {
    login: async (email: string) => {
      await new Promise(r => setTimeout(r, MOCK_DELAY));
      return { token: 'mock-jwt-token', refreshToken: 'mock-refresh-token' };
    }
  },
  projects: {
    getAll: async (): Promise<Project[]> => {
      await new Promise(r => setTimeout(r, MOCK_DELAY));
      return [
        { id: 'p1', projectCode: 'NGHT', projectName: 'The Night Walker', clientName: 'Warner Studios', startDate: '2024-01-01', endDate: '2024-12-31', status: 'In-Production' },
        { id: 'p2', projectCode: 'NEON', projectName: 'Neon Genesis Live', clientName: 'Netflix', startDate: '2024-03-15', endDate: '2025-06-30', status: 'Pre-Production' }
      ];
    },
    importBidSheet: async (file: any) => {
      await new Promise(r => setTimeout(r, 2000));
      return {
        projects: 1,
        sequences: 5,
        shots: 24,
        tasks: 112,
        failed: 0
      };
    }
  },
  tasks: {
    getByArtist: async (artistId: string): Promise<Task[]> => {
      await new Promise(r => setTimeout(r, MOCK_DELAY));
      return [
        { 
          id: 't1', shotId: 's1', pipelineStep: 'Comp', taskName: 'Main Hero Comp', 
          assignedArtistId: artistId, leadId: 'l1', supervisorId: 'sup1', 
          bidHours: 16, spentHours: 4, remainingHours: 12, status: 'In Progress', 
          startDate: '2024-05-01', dueDate: '2024-05-10', priority: 'High',
          progress: 25, internalEta: '2024-05-10', reviewStatus: 'Pending'
        }
      ];
    },
    updateTime: async (taskId: string, minutes: number) => {
      await new Promise(r => setTimeout(r, 300));
      return { success: true };
    }
  },
  users: {
    getTeam: async (leadId: string): Promise<User[]> => {
      await new Promise(r => setTimeout(r, MOCK_DELAY));
      return [
        { id: 'a1', employeeCode: 'E101', name: 'John Doe', email: 'john@vfx.com', role: 'Artist', departmentId: 'dept-comp', isActive: true, isFirstLogin: false },
        { id: 'a2', employeeCode: 'E102', name: 'Jane Smith', email: 'jane@vfx.com', role: 'Artist', departmentId: 'dept-comp', isActive: true, isFirstLogin: false }
      ];
    }
  }
};
