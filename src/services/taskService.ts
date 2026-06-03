
import { Task, TaskStatus, TimeLog, Version } from '@/lib/types';
import { useLuminaStore } from '@/lib/store';

const MOCK_DELAY = 100;

export const taskService = {
  getByArtist: async (artistId: string): Promise<Task[]> => {
    const store = useLuminaStore.getState();
    if (store.tasks.length > 0) {
      return store.tasks;
    }

    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [];
  },

  getById: async (id: string): Promise<Task | null> => {
    const store = useLuminaStore.getState();
    const task = store.tasks.find(t => t.id === id);
    if (task) return task;
    return null;
  },

  getTimeLogs: async (taskId: string): Promise<TimeLog[]> => {
    await new Promise(r => setTimeout(r, 100));
    return [];
  },

  getVersions: async (taskId: string): Promise<Version[]> => {
    await new Promise(r => setTimeout(r, 100));
    return [];
  },

  getDepartmentQueue: async (deptId: string): Promise<Task[]> => {
    const store = useLuminaStore.getState();
    if (store.tasks.length > 0) {
      return store.tasks.filter(t => deptId === 'all' || t.pipelineStep === deptId);
    }
    return [];
  }
};
