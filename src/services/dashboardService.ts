import { apiClient } from '@/services/apiClient';

export interface DashboardFilterParams {
  projectId?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

export interface DashboardResponse {
  success: boolean;
  filter: {
    projectId: string;
    dateRange: string;
    startDate: string | null;
    endDate: string | null;
    appliedDateRangeText: string;
  };
  projectsList: {
    id: string;
    projectCode: string;
    projectName: string;
  }[];
  kpi: {
    activeProjects: number;
    totalReels?: number;
    totalShots: number;
    activeTasks: number;
    overallCompletion: number;
    totalEstimatedBid?: number;
    totalTargetBid?: number;
    totalActualBid?: number;
    totalRemainingBid?: number;
  };
  projectProduction: {
    id: string;
    projectCode: string;
    projectName: string;
    status?: string | null;
    reels?: number;
    shots: number;
    tasks: number;
    unassigned?: number;
    assigned?: number;
    inProgress?: number;
    completed: number;
    wip: number;
    pendingReview: number;
    rework?: number;
    completionRate: number;
    estimatedHours: number;
    estimatedBid?: number;
    targetBid?: number;
    actualBid?: number;
    remainingBid?: number;
  }[];
  departmentStatus: {
    stageId?: number;
    department: string;
    totalTasks: number;
    unassigned?: number;
    assigned?: number;
    inProgress?: number;
    completed: number;
    wip: number;
    pendingReview: number;
    rework?: number;
    completionRate: number;
    estimatedBid?: number;
    targetBid?: number;
    actualBid?: number;
    remainingBid?: number;
  }[];
  attentionRequired: {
    unassignedTasks: number;
    pendingReviews: number;
    overdueTasks: number;
    blockedTasks: number;
  };
  bidVsActual: {
    totalBidHours: number;
    totalActualHours: number;
    totalEstimatedBid?: number;
    totalTargetBid?: number;
    totalActualBid?: number;
    totalRemainingBid?: number;
    hasReliableLogs: boolean;
  };
}

export const dashboardService = {
  getExecutiveDashboard: async (params?: DashboardFilterParams): Promise<DashboardResponse> => {
    const response = await apiClient.get<DashboardResponse>('/reports/dashboard', {
      params
    });
    return response.data;
  }
};
