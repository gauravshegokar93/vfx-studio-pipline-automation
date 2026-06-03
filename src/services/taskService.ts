
import { Task, TaskStatus, TimeLog, Version } from '@/lib/types';

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

  getById: async (id: string): Promise<Task | null> => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return { 
      id, 
      shotId: 'SH_010', 
      pipelineStep: 'Comp', 
      taskName: 'Hero Comp', 
      assignedArtistId: 'u1', 
      leadId: 'l1', 
      supervisorId: 'sup1', 
      bidHours: 16, 
      spentHours: 4.5, 
      remainingHours: 11.5, 
      status: 'In Progress', 
      startDate: '2024-05-01', 
      dueDate: '2024-05-10', 
      priority: 'High' 
    };
  },

  getTimeLogs: async (taskId: string): Promise<TimeLog[]> => {
    await new Promise(r => setTimeout(r, 300));
    return [
      { id: 'log1', taskId, artistId: 'u1', startTime: '2024-05-01T09:00:00Z', endTime: '2024-05-01T12:00:00Z', totalMinutes: 180 },
      { id: 'log2', taskId, artistId: 'u1', startTime: '2024-05-02T10:00:00Z', endTime: '2024-05-02T11:30:00Z', totalMinutes: 90 },
    ];
  },

  getVersions: async (taskId: string): Promise<Version[]> => {
    await new Promise(r => setTimeout(r, 300));
    return [
      { id: 'v1', taskId, artistId: 'u1', versionNumber: 1, filePath: '/renders/SH_010_v001.mp4', reviewStatus: 'Retake', reviewComment: 'Fix the black levels in the corners.', createdAt: '2024-05-03T15:00:00Z' },
      { id: 'v2', taskId, artistId: 'u1', versionNumber: 2, filePath: '/renders/SH_010_v002.mp4', reviewStatus: 'Pending Review', createdAt: '2024-05-05T10:00:00Z' },
    ];
  },

  startTask: async (taskId: string): Promise<string> => {
    await new Promise(r => setTimeout(r, 200));
    return 'new-timelog-id';
  },

  pauseTask: async (timeLogId: string, minutes: number): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 200));
    return true;
  },

  completeTask: async (taskId: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 200));
    return true;
  },

  updateStatus: async (taskId: string, status: TaskStatus) => {
    await new Promise(r => setTimeout(r, 300));
    return { success: true };
  },

  getDepartmentQueue: async (deptId: string): Promise<Task[]> => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { id: 'q1', shotId: 'SH_999', taskName: 'FX Destruction', pipelineStep: 'CG', assignedArtistId: '', leadId: '', supervisorId: '', bidHours: 40, spentHours: 0, remainingHours: 40, status: 'Not Started', startDate: '', dueDate: '2024-06-01', priority: 'High' },
      { id: 'q2', shotId: 'SH_888', taskName: 'Matte Paint', pipelineStep: 'Paint', assignedArtistId: '', leadId: '', supervisorId: '', bidHours: 24, spentHours: 0, remainingHours: 24, status: 'Not Started', startDate: '', dueDate: '2024-06-05', priority: 'Medium' },
    ];
  }
};
