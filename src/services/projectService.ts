
import { Project, Sequence, Shot } from '@/lib/types';
import { useLuminaStore } from '@/lib/store';

const MOCK_DELAY = 400;

export const projectService = {
  getAll: async (): Promise<Project[]> => {
    const store = useLuminaStore.getState();
    if (store.projects.length > 0) return store.projects;

    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { 
        id: 'p1', 
        projectCode: 'NGHT', 
        projectName: 'The Night Walker', 
        clientName: 'Warner Studios', 
        startDate: '2024-01-01', 
        endDate: '2024-12-31', 
        status: 'In-Production' 
      }
    ];
  },
  
  getSequences: async (projectId: string): Promise<Sequence[]> => {
    const store = useLuminaStore.getState();
    if (store.sequences.length > 0) {
      return store.sequences.filter(s => s.projectId === projectId);
    }
    await new Promise(r => setTimeout(r, 300));
    return [];
  },

  getShots: async (sequenceId: string): Promise<Shot[]> => {
    const store = useLuminaStore.getState();
    if (store.shots.length > 0) {
      return store.shots.filter(s => s.sequenceId === sequenceId);
    }
    await new Promise(r => setTimeout(r, 300));
    return [];
  }
};
