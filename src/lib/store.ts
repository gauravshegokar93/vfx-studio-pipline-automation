"use client";

import { create } from 'zustand';
import { User, Project, Task, Shot, Sequence, Department, Role, ReviewStatus, TaskStatus, UserCredential } from './types';
import { apiClient } from '@/services/apiClient';

interface LuminaState {
  currentUser: User | null;
  currentRole: Role;
  // In-memory JWT — always up-to-date; avoids stale localStorage reads
  accessToken: string | null;
  users: User[];
  userCredentials: UserCredential[];
  projects: Project[];
  sequences: Sequence[];
  shots: Shot[];
  tasks: Task[];
  departments: Department[];
  teams: any[];
  roles: any[];
  permissions: any[];
  

  
  setCurrentUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setRole: (role: Role) => void;
  
  // User Management
  fetchUsers: () => Promise<void>;
  fetchDepartments: () => Promise<void>;
  fetchTeams: () => Promise<void>;
  fetchRoles: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  addUser: (user: User, credential?: Partial<UserCredential>) => Promise<void>;
  bulkImportUsers: (users: User[]) => void;
  toggleUserStatus: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string) => void;
  updateUserCredentials: (userId: string, username: string, password?: string) => Promise<void>;
  
  // Task Management
  addTask: (task: Task) => void;
  
  bootstrapStudio: (data: {
    projects: Project[];
    sequences: Sequence[];
    shots: Shot[];
    tasks: Task[];
  }) => void;
  
  updateTaskTimer: (taskId: string, isRunning: boolean) => void;
}

export const useLuminaStore = create<LuminaState>((set) => ({
  currentUser: null,
  currentRole: 'Production Head',
  accessToken: null,
  users: [],
  userCredentials: [],
  departments: [],
  teams: [],
  projects: [],
  sequences: [],
  shots: [],
  tasks: [],
  roles: [],
  permissions: [],


  setCurrentUser: (user) => set({ currentUser: user }),
  setAccessToken: (token) => set({ accessToken: token }),
  setRole: (role) => {
    set({ currentRole: role });
  },
  
  fetchUsers: async () => {
    try {
      const res = await apiClient.get('/users');
      console.log('[fetchUsers] SUCCESS status:', res.status, 'count:', res.data.items?.length ?? 0);
      set({ users: res.data.items || [] });
    } catch (e: any) {
      console.error('[fetchUsers] API Error — status:', e?.response?.status, 'message:', e?.response?.data?.message || e?.message);
    }
  },
  
  fetchDepartments: async () => {
    try {
      const res = await apiClient.get('/departments');
      set({ departments: res.data.items || [] });
    } catch (e) {
      console.error('[fetchDepartments] API Error:', e);
    }
  },

  fetchTeams: async () => {
    try {
      const res = await apiClient.get('/teams');
      set({ teams: res.data.items || [] });
    } catch (e) {
      console.error('[fetchTeams] API Error:', e);
    }
  },
  
  fetchRoles: async () => {
    try {
      const res = await apiClient.get('/roles');
      set({ roles: res.data.roles || [] });
    } catch (e) {
      console.error('[fetchRoles] API Error:', e);
    }
  },
  
  fetchPermissions: async () => {
    try {
      const res = await apiClient.get('/permissions');
      set({ permissions: res.data.permissions || [] });
    } catch (e) {
      console.error('[fetchPermissions] API Error:', e);
    }
  },

  addUser: async (user, manualCred) => {
    try {
      await apiClient.post('/users', {
        employeeCode: user.employeeCode,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        teamId: user.teamId || null,
        leadId: user.leadId || null,
        username: manualCred?.username || null,
        password: manualCred?.tempPassword || null
      });
      const [usersRes, credentialsRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/users/credentials')
      ]);
      set({ 
        users: usersRes.data.items || [],
        userCredentials: credentialsRes.data.items || []
      });
    } catch (e) {
      console.error('[addUser] API Error:', e);
      throw e;
    }
  },

  bulkImportUsers: (newUsers) => set((state) => {
    const newCreds = newUsers.map(u => ({
      id: `cred_${Math.random().toString(36).substr(2, 9)}`,
      userId: u.id,
      username: u.email.split('@')[0],
      tempPassword: `SMFX${u.employeeCode}!`,
      lastChangedAt: new Date().toISOString()
    }));
    return {
      users: [...state.users, ...newUsers],
      userCredentials: [...state.userCredentials, ...newCreds]
    };
  }),

  toggleUserStatus: async (userId) => {
    try {
      await apiClient.put(`/users/${userId}/status`);
      const usersRes = await apiClient.get('/users');
      set({ users: usersRes.data.items || [] });
    } catch (e) {
      console.error('[toggleUserStatus] API Error:', e);
    }
  },

  resetUserPassword: (userId) => set((state) => ({
    users: state.users.map(u => u.id === userId ? { ...u, isFirstLogin: true } : u),
    userCredentials: state.userCredentials.map(c => 
      c.userId === userId 
        ? { ...c, tempPassword: `SMFXReset${Math.floor(Math.random() * 1000)}!`, lastChangedAt: new Date().toISOString() } 
        : c
    )
  })),

  updateUserCredentials: async (userId, username, password) => {
    try {
      await apiClient.put(`/users/${userId}/credentials`, { username, password });
      const [usersRes, credentialsRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/users/credentials')
      ]);
      set({ 
        users: usersRes.data.items || [],
        userCredentials: credentialsRes.data.items || []
      });
    } catch (e) {
      console.error('[updateUserCredentials] API Error:', e);
    }
  },
  
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  
  bootstrapStudio: (data) => set({
    projects: data.projects,
    sequences: data.sequences,
    shots: data.shots,
    tasks: data.tasks.map(t => ({
      ...t,
      progress: t.progress || 0,
      reviewStatus: t.reviewStatus || 'Pending',
      internalEta: t.internalEta || t.dueDate,
      leadId: t.leadId || '',
      assignedArtistId: t.assignedArtistId || '',
    })),
  }),

  updateTaskTimer: (taskId, isRunning) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { ...t, isTimerRunning: isRunning, lastTimerStart: isRunning ? Date.now() : t.lastTimerStart } 
        : t
    )
  })),
}));
