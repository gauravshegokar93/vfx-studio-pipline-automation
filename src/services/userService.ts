import { User, Leave } from '@/lib/types';
import { apiClient } from './apiClient';

const MOCK_DELAY = 400;

export const userService = {
  getDepartmentStaff: async (deptId: string): Promise<User[]> => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { id: 'u1', employeeCode: 'EMP001', name: 'Alex Rivera', email: 'alex@lumina.vfx', role: 'Artist', departmentId: deptId, isActive: true, isFirstLogin: false },
      { id: 'u2', employeeCode: 'EMP002', name: 'Zoe Chen', email: 'zoe@lumina.vfx', role: 'Lead', departmentId: deptId, isActive: true, isFirstLogin: false },
    ];
  },

  getProfile: async (id: string): Promise<User> => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return { 
      id, 
      employeeCode: 'EMP001', 
      name: 'Sarah Connor', 
      email: 'sarah.c@lumina.vfx', 
      role: 'Production Head', 
      departmentId: 'dept-prod', 
      isActive: true, 
      avatarUrl: 'https://picsum.photos/seed/sarah/100/100',
      isFirstLogin: false
    };
  },

  submitLeave: async (leave: any): Promise<boolean> => {
    try {
      await apiClient.post('/leaves', leave);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  getLeaves: async (): Promise<Leave[]> => {
    try {
      const res = await apiClient.get('/leaves');
      return res.data.items || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  updateLeaveStatus: async (id: string, status: string, remarks?: string): Promise<boolean> => {
    try {
      await apiClient.put(`/leaves/${id}/status`, { status, remarks });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
};
