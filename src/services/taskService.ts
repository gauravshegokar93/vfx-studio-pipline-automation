import { apiClient } from './apiClient';

export interface TaskItem {
  id: string | number;
  taskId: number;
  taskCode: string;
  taskName: string;
  shotId?: number;
  shotCode: string;
  sequenceCode?: string;
  reelCode?: string;
  projectId?: number;
  projectCode?: string;
  projectName?: string;
  workflowStageId?: number;
  stageId?: number;
  stageName?: string;
  stage?: string;
  departmentName?: string;
  estimatedHours: number;
  estimatedBid?: number;
  targetHours?: number;
  targetBid?: number;
  actualHours?: number;
  actualBid?: number;
  actualMinutes?: number;
  remainingHours?: number;
  remainingBid?: number;
  startDate?: string | null;
  dueDate?: string | null;
  priority?: string | null;
  priorityId?: number | null;
  status: string;
  statusId?: number | null;
  assignedArtistId?: number | null;
  assignedArtist?: string | null;
  assignedDate?: string | null;
  remarks?: string | null;
  complexity?: string;
}

export interface UserItem {
  id: number;
  userId: number;
  fullName: string;
  employeeCode: string;
  email: string;
  roleId: number;
  roleName: string;
  homeDepartmentId?: number;
  departmentName?: string;
  homeTeamId?: number;
  teamName?: string;
  isActive: boolean;
}

export interface DepartmentItem {
  id: number;
  name: string;
}

export interface AssignmentPayload {
  taskId: number;
  userId: number;
  targetBid?: number;
  targetHours?: number;
  remarks?: string;
}

export interface AssignmentHistoryItem {
  assignmentId: number;
  taskId: number;
  assignedToUserId: number;
  assignedArtistName: string;
  assignedByUserId: number;
  assignedByName: string;
  assignmentType: string;
  assignedDate: string;
  dueDate?: string | null;
  estimatedHours?: number | null;
  priority?: string | null;
  status?: string | null;
  remarks?: string | null;
}

export interface WorkloadResponse {
  success: boolean;
  artistId: number;
  artistName: string;
  allocatedHours: number;
  assignedTaskCount: number;
}

export interface DepartmentProgressItem {
  stageId: number;
  department: string;
  stageName: string;
  totalTasks: number;
  unassigned: number;
  assigned: number;
  inProgress: number;
  review: number;
  rework: number;
  completed: number;
  completionRate: number;
  estimatedHours: number;
  targetHours: number;
  actualHours: number;
  estimatedBid: number;
  targetBid: number;
  actualBid: number;
  remainingBid: number;
}

export interface ArtistWorkloadReportItem {
  artist: UserItem;
  taskCount: number;
  activeTaskCount: number;
  assignedCount: number;
  inProgressCount: number;
  reviewCount: number;
  reworkCount: number;
  completedCount: number;
  overdueCount: number;
  reviewSubmissions?: number;
  historicalReworkCount?: number;
  taskComplexities: string;
  allocatedBids: number;
  targetBid: number;
  actualBid: number;
  remainingBid: number;
}

export interface OverdueTaskItem {
  taskId: number;
  taskCode: string;
  taskName: string;
  projectId?: number;
  projectName?: string;
  shotCode: string;
  stageName: string;
  status: string;
  dueDate: string;
  assignedArtist?: string | null;
  assignedArtistId?: number | null;
  estimatedHours: number;
  estimatedBid: number;
  targetHours?: number;
  targetBid?: number;
  actualHours?: number;
  actualBid?: number;
  remainingBid?: number;
}

export interface TimeLogPayload {
  taskId: number;
  userId?: number;
  workDate?: string;
  hoursWorked: number;
  remarks?: string;
  startTime?: string;
  endTime?: string;
}

export interface TimeLogItem {
  timeLogId: number;
  id: number;
  taskId: number;
  userId: number;
  userName?: string;
  artistName?: string;
  workDate?: string;
  startTime?: string;
  endTime?: string;
  hoursWorked: number;
  totalMinutes?: number;
  remarks?: string;
  createdDate?: string;
}

export interface ActiveSessionInfo {
  timeLogId: number;
  userId: number;
  startTime: string;
  elapsedSeconds: number;
}

export interface TaskTimeSummary {
  success: boolean;
  taskId: number;
  estimatedHours: number;
  estimatedBid: number;
  targetHours: number;
  targetBid: number;
  actualWorkedHours: number;
  actualWorkedMinutes: number;
  remainingHours: number;
  sessionCount: number;
  activeSession: ActiveSessionInfo | null;
}

export const taskService = {
  getAllTasks: async (params?: { shotId?: number; projectId?: string; stageId?: string; statusId?: string; artistId?: string; search?: string }): Promise<TaskItem[]> => {
    try {
      const res = await apiClient.get('/tasks', { params });
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getAllTasks] Error:', err);
      return [];
    }
  },

  getDepartmentQueue: async (stageId: string | number, params?: { projectId?: string; statusId?: string; artistId?: string; search?: string }): Promise<TaskItem[]> => {
    try {
      const res = await apiClient.get(`/tasks/department-queue/${stageId}`, { params });
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getDepartmentQueue] Error:', err);
      return [];
    }
  },

  getByArtist: async (artistId: number | string): Promise<TaskItem[]> => {
    try {
      const res = await apiClient.get(`/tasks/artist/${artistId}`);
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getByArtist] Error:', err);
      return [];
    }
  },

  async assignTask(payload: AssignmentPayload) {
    try {
      const response = await apiClient.post('/assignments', payload);
      return response.data;
    } catch (err: any) {
      console.error('[taskService] assignTask error:', err);
      const message = err.response?.data?.message || err.message || 'Failed to assign task';
      throw new Error(message);
    }
  },

  async adjustTarget(taskId: number, payload: { targetBid?: number; targetHours?: number; remarks?: string }) {
    try {
      const response = await apiClient.put(`/assignments/${taskId}/target`, payload);
      return response.data;
    } catch (err: any) {
      console.error('[taskService] adjustTarget error:', err);
      const message = err.response?.data?.message || err.message || 'Failed to adjust target';
      throw new Error(message);
    }
  },

  createTask: async (payload: any): Promise<{ success: boolean; message: string; taskId?: number }> => {
    try {
      const res = await apiClient.post('/tasks', payload);
      return { success: true, message: res.data.message || 'Task created successfully', taskId: res.data.taskId };
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to create task';
      return { success: false, message };
    }
  },

  getEligibleArtists: async (taskId: number | string): Promise<any[]> => {
    try {
      const res = await apiClient.get(`/assignments/eligible-artists?taskId=${taskId}`);
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getEligibleArtists] Error:', err);
      return [];
    }
  },

  getAssignmentHistory: async (taskId: number | string): Promise<AssignmentHistoryItem[]> => {
    try {
      const res = await apiClient.get(`/assignments/history/${taskId}`);
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getAssignmentHistory] Error:', err);
      return [];
    }
  },

  getArtistWorkload: async (artistId: number | string): Promise<WorkloadResponse | null> => {
    try {
      const res = await apiClient.get(`/assignments/workload/${artistId}`);
      return res.data;
    } catch (err) {
      console.error('[taskService.getArtistWorkload] Error:', err);
      return null;
    }
  },

  getDepartmentProgressReport: async (params?: { projectId?: string; dateRange?: string; startDate?: string; endDate?: string }): Promise<DepartmentProgressItem[]> => {
    try {
      const res = await apiClient.get('/reports/department-progress', { params });
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getDepartmentProgressReport] Error:', err);
      return [];
    }
  },

  getArtistWorkloadReport: async (params?: { departmentId?: string; searchQuery?: string }): Promise<ArtistWorkloadReportItem[]> => {
    try {
      const res = await apiClient.get('/reports/artist-workload', { params });
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getArtistWorkloadReport] Error:', err);
      return [];
    }
  },

  getOverdueTasks: async (params?: { projectId?: string; stageId?: string }): Promise<OverdueTaskItem[]> => {
    try {
      const res = await apiClient.get('/reports/overdue-tasks', { params });
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getOverdueTasks] Error:', err);
      return [];
    }
  },

  getById: async (id: string | number): Promise<TaskItem | null> => {
    try {
      const res = await apiClient.get(`/tasks/${id}`);
      if (res.data && res.data.item) {
        return res.data.item;
      }
      const parsedId = parseInt(String(id), 10);
      const allTasks = await taskService.getAllTasks();
      return allTasks.find(t => t.taskId === parsedId || String(t.id) === String(id)) || null;
    } catch {
      const parsedId = parseInt(String(id), 10);
      const allTasks = await taskService.getAllTasks();
      return allTasks.find(t => t.taskId === parsedId || String(t.id) === String(id)) || null;
    }
  },

  getTimeLogs: async (taskId: string | number): Promise<TimeLogItem[]> => {
    try {
      const res = await apiClient.get(`/time-logs/task/${taskId}`);
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getTimeLogs] Error:', err);
      return [];
    }
  },

  getTaskTimeSummary: async (taskId: string | number): Promise<TaskTimeSummary | null> => {
    try {
      const res = await apiClient.get(`/time-logs/task/${taskId}/summary`);
      return res.data;
    } catch (err) {
      console.error('[taskService.getTaskTimeSummary] Error:', err);
      return null;
    }
  },

  startWorkSession: async (taskId: number | string): Promise<{ success: boolean; error?: string; message?: string; activeSession?: any; timeLog?: any }> => {
    try {
      const res = await apiClient.post('/time-logs/start', { taskId: Number(taskId) });
      return { success: true, message: res.data.message, timeLog: res.data.timeLog };
    } catch (err: any) {
      const error = err.response?.data?.error || 'START_FAILED';
      const message = err.response?.data?.message || err.message || 'Failed to start session';
      const activeSession = err.response?.data?.activeSession;
      return { success: false, error, message, activeSession };
    }
  },

  stopWorkSession: async (taskId: number | string): Promise<{ success: boolean; error?: string; message?: string; timeLog?: any }> => {
    try {
      const res = await apiClient.post('/time-logs/stop', { taskId: Number(taskId) });
      return { success: true, message: res.data.message, timeLog: res.data.timeLog };
    } catch (err: any) {
      const error = err.response?.data?.error || 'STOP_FAILED';
      const message = err.response?.data?.message || err.message || 'Failed to stop session';
      return { success: false, error, message };
    }
  },

  createTimeLog: async (payload: TimeLogPayload): Promise<{ success: boolean; message: string; error?: string; timeLog?: any }> => {
    try {
      const res = await apiClient.post('/time-logs', payload);
      return { success: true, message: res.data.message || 'Time log recorded successfully', timeLog: res.data.timeLog };
    } catch (err: any) {
      const error = err.response?.data?.error || 'LOG_FAILED';
      const message = err.response?.data?.message || err.message || 'Failed to record time log';
      return { success: false, error, message };
    }
  },

  getVersions: async (taskId?: string | number): Promise<any[]> => {
    return [];
  },

  getUsers: async (): Promise<UserItem[]> => {
    try {
      const res = await apiClient.get('/users');
      return res.data.items || res.data || [];
    } catch (err) {
      console.error('[taskService.getUsers] Error:', err);
      return [];
    }
  },

  getDepartments: async (): Promise<DepartmentItem[]> => {
    try {
      const res = await apiClient.get('/departments');
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getDepartments] Error:', err);
      return [];
    }
  },

  submitTaskForReview: async (taskId: number | string, remarks?: string): Promise<{ success: boolean; message: string; error?: string; reviewId?: number; statusId?: number }> => {
    try {
      const res = await apiClient.post(`/tasks/${taskId}/submit-review`, { remarks });
      return { success: true, message: res.data.message, reviewId: res.data.reviewId, statusId: res.data.statusId };
    } catch (err: any) {
      const error = err.response?.data?.error || 'SUBMIT_FAILED';
      const message = err.response?.data?.message || err.message || 'Failed to submit task for review';
      return { success: false, error, message };
    }
  },

  getReviewQueue: async (): Promise<TaskReviewQueueItem[]> => {
    try {
      const res = await apiClient.get('/reviews/queue');
      return res.data.tasks || [];
    } catch (err) {
      console.error('[taskService.getReviewQueue] Error:', err);
      return [];
    }
  },

  getTaskReviewHistory: async (taskId: number | string): Promise<{ reviews: TaskReviewItem[]; reworks: TaskReworkItem[] }> => {
    try {
      const res = await apiClient.get(`/tasks/${taskId}/reviews`);
      return { reviews: res.data.reviews || [], reworks: res.data.reworks || [] };
    } catch (err) {
      console.error('[taskService.getTaskReviewHistory] Error:', err);
      return { reviews: [], reworks: [] };
    }
  },

  approveReview: async (reviewId: number | string, rating?: number, remarks?: string): Promise<{ success: boolean; message: string; error?: string; statusId?: number }> => {
    try {
      const res = await apiClient.post(`/reviews/${reviewId}/approve`, { rating, remarks });
      return { success: true, message: res.data.message, statusId: res.data.statusId };
    } catch (err: any) {
      const error = err.response?.data?.error || 'APPROVE_FAILED';
      const message = err.response?.data?.message || err.message || 'Failed to approve review';
      return { success: false, error, message };
    }
  },

  requestRework: async (reviewId: number | string, reason: string, reviewerRemarks?: string): Promise<{ success: boolean; message: string; error?: string; statusId?: number; reworkRound?: number }> => {
    try {
      const res = await apiClient.post(`/reviews/${reviewId}/rework`, { reason, reviewerRemarks });
      return { success: true, message: res.data.message, statusId: res.data.statusId, reworkRound: res.data.reworkRound };
    } catch (err: any) {
      const error = err.response?.data?.error || 'REWORK_FAILED';
      const message = err.response?.data?.message || err.message || 'Failed to request rework';
      return { success: false, error, message };
    }
  },

  getTimeline: async (taskId: number | string): Promise<any[]> => {
    try {
      const res = await apiClient.get(`/tasks/${taskId}/timeline`);
      return res.data.items || [];
    } catch (err) {
      console.error('[taskService.getTimeline] Error:', err);
      return [];
    }
  },

  reopenForClientRevision: async (taskId: number | string): Promise<{ success: boolean; message: string; error?: string; statusId?: number }> => {
    try {
      const res = await apiClient.post(`/tasks/${taskId}/client-revision`);
      return { success: true, message: res.data.message, statusId: res.data.statusId };
    } catch (err: any) {
      const error = err.response?.data?.error || 'REOPEN_FAILED';
      const message = err.response?.data?.message || err.message || 'Failed to reopen task for client revision';
      return { success: false, error, message };
    }
  }
};

export interface TaskReviewItem {
  reviewId: number;
  taskId: number;
  reviewerId?: number | null;
  reviewerName?: string | null;
  artistName?: string | null;
  reviewDate?: string | null;
  reviewStatus: string;
  rating?: number | null;
  remarks?: string | null;
}

export interface TaskReworkItem {
  reworkId: number;
  taskId: number;
  requestedBy?: number | null;
  requestedByName?: string | null;
  requestedDate?: string | null;
  reason: string;
  reviewId?: number | null;
  assignedToUserId?: number | null;
  assignedToUserName?: string | null;
  assignedByUserId?: number | null;
  reworkRound: number;
  previousWorkedMinutes: number;
  additionalWorkedMinutes: number;
  totalWorkedMinutes: number;
  reviewerRemarks?: string | null;
  isCompleted: boolean;
  createdDate?: string | null;
}

export interface TaskReviewQueueItem {
  taskId: number;
  taskCode: string;
  taskName: string;
  estimatedHours: number;
  estimatedBid: number;
  targetHours: number;
  targetBid: number;
  statusId: number;
  statusName: string;
  stageId?: number;
  stageName?: string;
  assignedUserId?: number;
  assignedArtistName?: string;
  assignedArtistEmail?: string;
  shotId?: number;
  shotCode?: string;
  reel?: string;
  sequence?: string;
  projectId?: number;
  projectName?: string;
  reviewId?: number;
  submissionDate?: string;
  submissionRemarks?: string;
  actualWorkedHours: number;
  actualWorkedBid: number;
}
