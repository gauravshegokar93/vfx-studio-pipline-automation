import { Task, TaskStatus, TimeLog, Version } from '@/lib/types';
import { useLuminaStore } from '@/lib/store';

export const taskService = {
  getByArtist: async (artistId: string): Promise<Task[]> => {
    const store = useLuminaStore.getState();
    return (store.tasks || []).filter(t => t.assignedArtistId === artistId);
  },

  getById: async (id: string): Promise<Task | null> => {
    const store = useLuminaStore.getState();
    const task = store.tasks.find(t => t.id === id);
    return task || null;
  },

  getTimeLogs: async (taskId: string): Promise<TimeLog[]> => {
    // Return empty array if no logs exist, or fetch from backend if desired
    return [];
  },

  getVersions: async (taskId: string): Promise<Version[]> => {
    // Return empty array if no versions exist, or fetch from backend if desired
    return [];
  },

  getDepartmentQueue: async (deptId: string): Promise<Task[]> => {
    const store = useLuminaStore.getState();
    return (store.tasks || []).filter(t => 
      deptId === 'all' || t.pipelineStep.toLowerCase() === deptId.toLowerCase()
    );
  }
};
