import axios from 'axios';
import { Task, TaskStatus } from '@/lib/types';
import { ENDPOINTS } from '@/config/api';

const MOCK_DELAY = 500;

export const taskService = {
  getByArtist: async (artistId: string): Promise<Task[]> => {
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
      },
      { 
        id: 't2', 
        shotId: 'SH_045', 
        taskName: 'Building Cleanup', 
        pipelineStep: 'Paint', 
        assignedArtistId: artistId, 
        leadId: 'l1', 
        supervisorId: 'sup1', 
        bidHours: 8, 
        spentHours: 10.2, 
        remainingHours: 0, 
        status: 'Assigned', 
        startDate: '2024-05-05', 
        dueDate: '2024-05-15', 
        priority: 'Medium' 
      }
    ];
  },

  updateStatus: async (taskId: string, status: TaskStatus) => {
    // await axios.patch(`${ENDPOINTS.TASKS}/${taskId}`, { status });
    await new Promise(r => setTimeout(r, 300));
    return { success: true };
  },

  logTime: async (taskId: string, minutes: number) => {
    // await axios.post(`${ENDPOINTS.TASKS}/${taskId}/time`, { minutes });
    await new Promise(r => setTimeout(r, 300));
    return { success: true };
  }
};
