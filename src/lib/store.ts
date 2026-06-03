
"use client";

import { create } from 'zustand';
import { User, Project, Task, Shot, Sequence, Department, Role, ReviewStatus, TaskStatus } from './types';

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
  
  // New Production-Driven Actions
  artistUpdateProgress: (taskId: string, progress: number, comment: string, internalEta: string) => void;
  leadReviewTask: (taskId: string, status: ReviewStatus, comment: string) => void;
  supervisorApproveTask: (taskId: string, status: ReviewStatus, comment: string) => void;
}

export const useLuminaStore = create<LuminaState>((set) => ({
  currentUser: {
    id: 'u3', // Defaulting to Artist for testing workbench
    name: 'Sarah Connor',
    email: 'sarah.c@lumina.vfx',
    role: 'Artist',
    employeeCode: 'EMP001',
    departmentId: 'dept-comp',
    isActive: true,
    avatarUrl: 'https://picsum.photos/seed/sarah/100/100'
  },
  currentRole: 'Artist',
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
    tasks: data.tasks.map(t => ({
      ...t,
      progress: t.progress || 0,
      reviewStatus: t.reviewStatus || 'Pending',
      internalEta: t.internalEta || t.dueDate
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
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, leadId, status: 'Assigned' } : t)
  })),

  assignTaskArtist: (taskId, artistId) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, assignedArtistId: artistId, status: 'Assigned' } : t)
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
