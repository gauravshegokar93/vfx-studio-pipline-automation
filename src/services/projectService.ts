import axios from 'axios';
import { Project } from '@/lib/types';
import { ENDPOINTS } from '@/config/api';

const MOCK_DELAY = 600;

export const projectService = {
  getAll: async (): Promise<Project[]> => {
    // Simulated API call
    // return axios.get(ENDPOINTS.PROJECTS);
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
  
  getById: async (id: string): Promise<Project | null> => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return { 
      id, 
      projectCode: 'NGHT', 
      projectName: 'The Night Walker', 
      clientName: 'Warner Studios', 
      startDate: '2024-01-01', 
      endDate: '2024-12-31', 
      status: 'In-Production' 
    };
  }
};
