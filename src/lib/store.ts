
"use client";

import { create } from 'zustand';
import { User, Project, Task, Shot, Department, Role } from './types';

interface LuminaState {
  currentUser: User | null;
  currentRole: Role;
  projects: Project[];
  tasks: Task[];
  shots: Shot[];
  departments: Department[];
  
  setCurrentUser: (user: User | null) => void;
  setRole: (role: Role) => void;
  setProjects: (projects: Project[]) => void;
  setTasks: (tasks: Task[]) => void;
  updateTaskTimer: (taskId: string, isRunning: boolean) => void;
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
  shots: [],
  tasks: [],

  setCurrentUser: (user) => set({ currentUser: user }),
  setRole: (role) => set({ currentRole: role }),
  setProjects: (projects) => set({ projects }),
  setTasks: (tasks) => set({ tasks }),
  updateTaskTimer: (taskId, isRunning) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { ...t, isTimerRunning: isRunning, lastTimerStart: isRunning ? Date.now() : t.lastTimerStart } 
        : t
    )
  })),
}));
