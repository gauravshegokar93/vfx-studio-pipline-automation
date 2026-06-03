
"use client";

import { create } from 'zustand';
import { User, Project, Task, Shot, Sequence, Department, Role } from './types';

interface LuminaState {
  currentUser: User | null;
  currentRole: Role;
  projects: Project[];
  sequences: Sequence[];
  shots: Shot[];
  tasks: Task[];
  departments: Department[];
  
  setCurrentUser: (user: User | null) => void;
  setRole: (role: Role) => void;
  
  // Single Source of Truth Actions
  bootstrapStudio: (data: {
    projects: Project[];
    sequences: Sequence[];
    shots: Shot[];
    tasks: Task[];
  }) => void;
  
  updateTaskTimer: (taskId: string, isRunning: boolean) => void;
  
  // Assignment Actions
  assignTaskLead: (taskId: string, leadId: string) => void;
  assignTaskArtist: (taskId: string, artistId: string) => void;
  updateTaskStatus: (taskId: string, status: any) => void;
}

export const useLuminaStore = create<LuminaState>((set) => ({
  currentUser: {
    id: 'u1',
    name: 'Sarah Connor',
    email: 'sarah.c@lumina.vfx',
    role: 'Production Head',
    employeeCode: 'EMP001',
    departmentId: 'dept-prod',
    isActive: true,
    avatarUrl: 'https://picsum.photos/seed/sarah/100/100'
  },
  currentRole: 'Production Head',
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
  
  bootstrapStudio: (data) => set({
    projects: data.projects,
    sequences: data.sequences,
    shots: data.shots,
    tasks: data.tasks,
  }),

  updateTaskTimer: (taskId, isRunning) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { ...t, isTimerRunning: isRunning, lastTimerStart: isRunning ? Date.now() : t.lastTimerStart } 
        : t
    )
  })),

  assignTaskLead: (taskId, leadId) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, leadId, status: 'Assigned' as any } : t)
  })),

  assignTaskArtist: (taskId, artistId) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, assignedArtistId: artistId, status: 'Assigned' as any } : t)
  })),

  updateTaskStatus: (taskId, status) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, status } : t)
  })),
}));
