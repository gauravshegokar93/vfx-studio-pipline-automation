
import { User, Leave } from '@/lib/types';

const MOCK_DELAY = 400;

export const userService = {
  getDepartmentStaff: async (deptId: string): Promise<User[]> => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { id: 'u1', employeeCode: 'EMP001', name: 'Alex Rivera', email: 'alex@lumina.vfx', role: 'Artist', departmentId: deptId, isActive: true },
      { id: 'u2', employeeCode: 'EMP002', name: 'Zoe Chen', email: 'zoe@lumina.vfx', role: 'Lead', departmentId: deptId, isActive: true },
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
      avatarUrl: 'https://picsum.photos/seed/sarah/100/100' 
    };
  },

  submitLeave: async (leave: Omit<Leave, 'id' | 'status'>): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 300));
    // In SQL: INSERT INTO Leaves (UserId, StartDate, EndDate, Type, Status) VALUES (..., 'Pending')
    return true;
  },

  getLeaves: async (): Promise<Leave[]> => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { id: 'l1', userId: 'u1', startDate: '2024-06-01', endDate: '2024-06-05', type: 'Vacation', status: 'Approved' }
    ];
  }
};
