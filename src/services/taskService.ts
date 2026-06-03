
import { Task, TaskStatus, TimeLog } from '@/lib/types';

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

  startTask: async (taskId: string): Promise<string> => {
    await new Promise(r => setTimeout(r, 200));
    // In SQL: INSERT INTO TimeLogs (TaskId, StartTime) ...
    return 'new-timelog-id';
  },

  pauseTask: async (timeLogId: string, minutes: number): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 200));
    // In SQL: UPDATE TimeLogs SET EndTime = NOW(), TotalMinutes = ...
    return true;
  },

  completeTask: async (taskId: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 200));
    // In SQL: UPDATE Tasks SET Status = 'Pending Review' ...
    return true;
  },

  updateStatus: async (taskId: string, status: TaskStatus) => {
    await new Promise(r => setTimeout(r, 300));
    return { success: true };
  },

  getDepartmentQueue: async (deptId: string): Promise<Task[]> => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { id: 'q1', shotId: 'SH_999', taskName: 'FX Destruction', pipelineStep: 'CG', assignedArtistId: '', leadId: '', supervisorId: '', bidHours: 40, spentHours: 0, remainingHours: 40, status: 'Not Started', startDate: '', dueDate: '2024-06-01', priority: 'High' }
    ];
  }
};
