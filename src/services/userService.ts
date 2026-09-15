import { Leave } from '@/lib/types';
import { apiClient } from './apiClient';

export const userService = {
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
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiClient.patch(`/users/${userId}/status`, { isActive });
      return res.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || 'Failed to update user status');
    }
  },

  updateUser: async (userId: string, data: any): Promise<{ success: boolean; message?: string; user?: any }> => {
    try {
      const res = await apiClient.patch(`/users/${userId}`, data);
      return res.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || 'Failed to update user');
    }
  },

  deleteUser: async (userId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await apiClient.delete(`/users/${userId}`);
      return res.data;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to delete user';
      const err: any = new Error(msg);
      err.status = e.response?.status;
      throw err;
    }
  },

  getReportingLeads: async (departmentId?: string, teamId?: string): Promise<any[]> => {
    try {
      let url = '/users/reporting-leads';
      const params: string[] = [];
      if (departmentId) params.push(`departmentId=${departmentId}`);
      if (teamId) params.push(`teamId=${teamId}`);
      if (params.length) url += '?' + params.join('&');
      const res = await apiClient.get(url);
      return res.data.items || [];
    } catch (e) {
      console.error('[getReportingLeads]', e);
      return [];
    }
  },

  getOrgHierarchy: async (): Promise<any> => {
    try {
      const res = await apiClient.get('/users/hierarchy');
      return res.data;
    } catch (e) {
      console.error('[getOrgHierarchy]', e);
      return { hierarchy: [] };
    }
  },

  getTeams: async (departmentId?: string): Promise<any[]> => {
    try {
      let url = '/teams';
      if (departmentId) url += `?departmentId=${departmentId}`;
      const res = await apiClient.get(url);
      return res.data.items || [];
    } catch (e) {
      console.error('[getTeams]', e);
      return [];
    }
  },

  createTeam: async (data: { teamName: string; departmentId: string; teamCode?: string }): Promise<any> => {
    try {
      const res = await apiClient.post('/teams', data);
      return res.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || 'Failed to create team');
    }
  }
};
