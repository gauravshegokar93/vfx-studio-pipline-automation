"use client";

import { create } from 'zustand';
import { User, Project, Task, Shot, Sequence, Department, Role, ReviewStatus, TaskStatus, UserCredential } from './types';

interface LuminaState {
  currentUser: User | null;
  currentRole: Role;
  users: User[];
  userCredentials: UserCredential[];
  projects: Project[];
  sequences: Sequence[];
  shots: Shot[];
  tasks: Task[];
  departments: Department[];
  
  setCurrentUser: (user: User | null) => void;
  setRole: (role: Role) => void;
  
  // User Management
  addUser: (user: User, credential?: Partial<UserCredential>) => void;
  bulkImportUsers: (users: User[]) => void;
  toggleUserStatus: (userId: string) => void;
  resetUserPassword: (userId: string) => void;
  updateUserCredentials: (userId: string, username: string, password?: string) => void;
  
  // Task Management
  addTask: (task: Task) => void;
  
  bootstrapStudio: (data: {
    projects: Project[];
    sequences: Sequence[];
    shots: Shot[];
    tasks: Task[];
  }) => void;
  
  updateTaskTimer: (taskId: string, isRunning: boolean) => void;
  assignTaskLead: (taskId: string, leadId: string) => void;
  assignTaskArtist: (taskId: string, artistId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  
  artistUpdateProgress: (taskId: string, progress: number, comment: string, internalEta: string) => void;
  leadReviewTask: (taskId: string, status: ReviewStatus, comment: string) => void;
  supervisorApproveTask: (taskId: string, status: ReviewStatus, comment: string) => void;
}

export const useLuminaStore = create<LuminaState>((set) => ({
  currentUser: {
    id: 'u1',
    name: 'John Matrix',
    email: 'john.m@smfx.vfx',
    role: 'Production Head',
    employeeCode: 'EMP-PH-01',
    departmentId: 'dept-prod',
    isActive: true,
    avatarUrl: 'https://picsum.photos/seed/john/100/100',
    isFirstLogin: false
  },
  currentRole: 'Production Head',
  users: [
    { id: 'u1', employeeCode: 'EMP-PH-01', name: 'John Matrix', email: 'john.m@smfx.vfx', role: 'Production Head', departmentId: 'dept-prod', isActive: true, isFirstLogin: false },
    { id: 'u2', employeeCode: 'EMP-SUP-01', name: 'Kyle Reese', email: 'kyle.r@smfx.vfx', role: 'Department Supervisor', departmentId: 'dept-comp', isActive: true, isFirstLogin: false },
    { id: 'u3', employeeCode: 'EMP-ART-01', name: 'Sarah Connor', email: 'sarah.c@smfx.vfx', role: 'Artist', departmentId: 'dept-comp', leadId: 'u4', isActive: true, isFirstLogin: false },
    { id: 'u4', employeeCode: 'EMP-LD-01', name: 'Ellen Ripley', email: 'ellen.r@smfx.vfx', role: 'Lead', departmentId: 'dept-comp', isActive: true, isFirstLogin: false },
  ],
  userCredentials: [
    { id: 'cred_1', userId: 'u1', username: 'john.m', tempPassword: '', lastChangedAt: new Date().toISOString() },
    { id: 'cred_2', userId: 'u2', username: 'kyle.r', tempPassword: '', lastChangedAt: new Date().toISOString() },
    { id: 'cred_3', userId: 'u3', username: 'sarah.c', tempPassword: 'SMFXSarah123!', lastChangedAt: new Date().toISOString() },
    { id: 'cred_4', userId: 'u4', username: 'ellen.r', tempPassword: '', lastChangedAt: new Date().toISOString() },
  ],
  departments: [
    { id: 'dept-paint', name: 'Paint' },
    { id: 'dept-roto', name: 'Roto' },
    { id: 'dept-comp', name: 'Comp' },
    { id: 'dept-mm', name: 'Matchmove' },
    { id: 'dept-cg', name: 'CG' },
  ],
  projects: [],
  sequences: [],
  shots: [],
  tasks: [],

  setCurrentUser: (user) => set({ currentUser: user }),
  setRole: (role) => set({ currentRole: role }),

  addUser: (user, manualCred) => set((state) => {
    const cred: UserCredential = {
      id: `cred_${Date.now()}`,
      userId: user.id,
      username: manualCred?.username || user.email.split('@')[0],
      tempPassword: manualCred?.tempPassword || `SMFX${user.employeeCode}!`,
      lastChangedAt: new Date().toISOString()
    };
    return { 
      users: [...state.users, user],
      userCredentials: [...state.userCredentials, cred]
    };
  }),

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

  toggleUserStatus: (userId) => set((state) => ({
    users: state.users.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u)
  })),

  resetUserPassword: (userId) => set((state) => ({
    users: state.users.map(u => u.id === userId ? { ...u, isFirstLogin: true } : u),
    userCredentials: state.userCredentials.map(c => 
      c.userId === userId 
        ? { ...c, tempPassword: `SMFXReset${Math.floor(Math.random() * 1000)}!`, lastChangedAt: new Date().toISOString() } 
        : c
    )
  })),

  updateUserCredentials: (userId, username, password) => set((state) => ({
    users: state.users.map(u => u.id === userId ? { ...u, isFirstLogin: !!password } : u),
    userCredentials: state.userCredentials.map(c => 
      c.userId === userId 
        ? { 
            ...c, 
            username, 
            ...(password ? { tempPassword: password } : {}), 
            lastChangedAt: new Date().toISOString() 
          } 
        : c
    )
  })),
  
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

  assignTaskLead: (taskId, leadId) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, leadId, status: t.status === 'Not Started' ? 'Assigned' : t.status } : t)
  })),

  assignTaskArtist: (taskId, artistId) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, assignedArtistId: artistId, status: t.status === 'Not Started' || t.status === 'Assigned' ? 'In Progress' : t.status } : t)
  })),

  updateTaskStatus: (taskId, status) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, status } : t)
  })),

  artistUpdateProgress: (taskId, progress, comment, internalEta) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            progress, 
            latestArtistComment: comment, 
            internalEta, 
            reviewStatus: 'Pending',
            status: progress === 100 ? 'Pending Review' : 'In Progress' 
          } 
        : t
    )
  })),

  leadReviewTask: (taskId, status, comment) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            reviewStatus: status, 
            latestLeadComment: comment,
            status: status === 'Approved' ? 'Pending Review' : (status === 'Changes Requested' ? 'Retake' : t.status)
          } 
        : t
    )
  })),

  supervisorApproveTask: (taskId, status, comment) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            reviewStatus: status, 
            latestSupComment: comment,
            status: status === 'Approved' ? 'Approved' : (status === 'Changes Requested' ? 'Retake' : t.status)
          } 
        : t
    )
  })),
}));
