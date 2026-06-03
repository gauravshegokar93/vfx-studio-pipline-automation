
import { Project, Sequence, Shot } from '@/lib/types';

const MOCK_DELAY = 600;

export const projectService = {
  getAll: async (): Promise<Project[]> => {
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
      },
      { 
        id: 'p2', 
        projectCode: 'NEON', 
        projectName: 'Neon Genesis Live', 
        clientName: 'Netflix', 
        startDate: '2024-03-15', 
        endDate: '2025-06-30', 
        status: 'Pre-Production' 
      }
    ];
  },
  
  getSequences: async (projectId: string): Promise<Sequence[]> => {
    await new Promise(r => setTimeout(r, 400));
    return [
      { id: 'seq1', projectId, sequenceCode: '010' },
      { id: 'seq2', projectId, sequenceCode: '020' },
      { id: 'seq3', projectId, sequenceCode: '030' },
    ];
  },

  getShots: async (sequenceId: string): Promise<Shot[]> => {
    await new Promise(r => setTimeout(r, 400));
    return [
      { id: 'sh1', projectId: 'p1', sequenceId, shotCode: '0010', status: 'In Progress', priority: 'High', dueDate: '2024-06-01', description: 'Hero space battle' },
      { id: 'sh2', projectId: 'p1', sequenceId, shotCode: '0020', status: 'Not Started', priority: 'Medium', dueDate: '2024-06-15', description: 'Explosion sequence' },
    ];
  }
};
