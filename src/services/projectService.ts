import { Project, Sequence, Shot } from '@/lib/types';
import { useLuminaStore } from '@/lib/store';

export const projectService = {
  getAll: async (): Promise<Project[]> => {
    const store = useLuminaStore.getState();
    return store.projects || [];
  },
  
  getSequences: async (projectId: string): Promise<Sequence[]> => {
    const store = useLuminaStore.getState();
    return (store.sequences || []).filter(s => s.projectId === projectId);
  },

  getShots: async (sequenceId: string): Promise<Shot[]> => {
    const store = useLuminaStore.getState();
    return (store.shots || []).filter(s => s.sequenceId === sequenceId);
  }
};
