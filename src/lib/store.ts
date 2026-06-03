
"use client";

import { create } from 'zustand';
import { User, Project, Task, Shot, Department } from './types';

interface LuminaState {
  currentUser: User | null;
  projects: Project[];
  tasks: Task[];
  shots: Shot[];
  departments: Department[];
  setCurrentUser: (user: User | null) => void;
  setProjects: (projects: Project[]) => void;
  setTasks: (tasks: Task[]) => void;
}

export const useLuminaStore = create<LuminaState>((set) => ({
  currentUser: {
    id: 'u1',
    name: 'Sarah Connor',
    email: 'sarah.c@lumina.vfx',
    role: 'Producer',
    employeeCode: 'EMP001',
    departmentId: 'dept-prod',
    isActive: true,
    avatarUrl: 'https://picsum.photos/seed/sarah/100/100'
  },
  departments: [
    { id: 'dept-paint', name: 'Paint' },
    { id: 'dept-roto', name: 'Roto' },
    { id: 'dept-comp', name: 'Comp' },
    { id: 'dept-mm', name: 'Matchmove' },
    { id: 'dept-cg', name: 'CG' },
  ],
  projects: [
    {
      id: 'p1',
      projectCode: 'NGHT',
      projectName: 'The Night Walker',
      clientName: 'Warner Studios',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'In-Production',
      thumbnailUrl: 'https://picsum.photos/seed/night/800/400'
    },
    {
      id: 'p2',
      projectCode: 'NEON',
      projectName: 'Neon Genesis Live',
      clientName: 'Netflix',
      startDate: '2024-03-15',
      endDate: '2025-06-30',
      status: 'Pre-Production',
      thumbnailUrl: 'https://picsum.photos/seed/neon/800/400'
    }
  ],
  shots: [],
  tasks: [],
  setCurrentUser: (user) => set({ currentUser: user }),
  setProjects: (projects) => set({ projects }),
  setTasks: (tasks) => set({ tasks }),
}));
