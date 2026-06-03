
import { Task, TaskStatus, TimeLog, Version } from '@/lib/types';
import { useLuminaStore } from '@/lib/store';

const MOCK_DELAY = 400;

export const taskService = {
  getByArtist: async (artistId: string): Promise<Task[]> => {
    // Check global store first (Single Source of Truth)
    const store = useLuminaStore.getState();
    if (store.tasks.length > 0) {
      // In a real app, the artist ID would filter the SQL query. 
      // For the prototype, we return all tasks if store is populated to show the import results.
      return store.tasks;
    }

    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { 
        id: 't1', 
        shotId: 'SH_010', 
        pipelineStep: 'Comp', 
        taskName: 'Hero Comp', 
        assignedArtistId: artistId, 
        leadId: 'l1', 
        supervisorId: 'sup1', 
        bidHours: 16, 
        spentHours: 4.5, 
        remainingHours: 11.5, 
        status: 'In Progress', 
        startDate: '2024-05-01', 
        dueDate: '2024-05-10', 
        priority: 'High' 
      }
    ];
  },

  getById: async (id: string): Promise<Task | null> => {
    const store = useLuminaStore.getState();
    const task = store.tasks.find(t => t.id === id);
    if (task) return task;

    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return null;
  },

  getTimeLogs: async (taskId: string): Promise<TimeLog[]> => {
    await new Promise(r => setTimeout(r, 300));
    return [
      { id: 'log1', taskId, artistId: 'u1', startTime: '2024-05-01T09:00:00Z', endTime: '2024-05-01T12:00:00Z', totalMinutes: 180 },
    ];
  },

  getVersions: async (taskId: string): Promise<Version[]> => {
    await new Promise(r => setTimeout(r, 300));
    return [];
  },

  getDepartmentQueue: async (deptId: string): Promise<Task[]> => {
    const store = useLuminaStore.getState();
    if (store.tasks.length > 0) {
      return store.tasks.filter(t => deptId === 'all' || t.pipelineStep === deptId);
    }
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [];
  }
};
