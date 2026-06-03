import axios from 'axios';
import { User } from '@/lib/types';
import { ENDPOINTS } from '@/config/api';

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
  }
};
