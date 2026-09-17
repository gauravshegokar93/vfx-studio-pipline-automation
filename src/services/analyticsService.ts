import { apiClient } from './apiClient';
import { useLuminaStore } from '@/lib/store';

export interface AnalyticsFilterParams {
  projectId?: string;
  stageId?: string;
  artistId?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  complexity?: string;
}

export interface AnalyticsKpi {
  activeProjects: number;
  totalShots: number;
  activeTasks: number;
  activeArtists: number;
  estimatedBid: number;
  allocatedTargetBid: number;
  actualBid: number;
  remainingBid: number;
  unassignedTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  reworkTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface TaskStatusDistributionItem {
  name: string;
  count: number;
  statusId: number | null;
  fill: string;
}

export interface DepartmentWorkloadItem {
  stageId: number;
  stageName: string;
  unassigned: number;
  assigned: number;
  inProgress: number;
  review: number;
  rework: number;
  completed: number;
  totalTasks: number;
}

export interface ProjectProgressItem {
  projectId: number | string;
  projectCode: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

export interface BidVsActualItem {
  projectId: number | string;
  projectCode: string;
  projectName: string;
  estimatedBid: number;
  targetBid: number;
  actualBid: number;
  remainingBid: number;
}

export interface ArtistWorkloadRow {
  artistId: number;
  artistName: string;
  employeeCode: string;
  department: string;
  activeTasks: number;
  totalAssignedTasks: number;
  targetBid: number;
  actualBid: number;
  remainingBid: number;
  assigned: number;
  inProgress: number;
  review: number;
  rework: number;
  completed: number;
  overdue: number;
}

export interface ProductionTrendItem {
  workDate: string;
  actualBid: number;
}

export interface ReviewAnalyticsData {
  outcomes: Array<{ name: string; count: number; fill: string }>;
  reviewQueueCount: number;
  reworkQueueCount: number;
}

export interface OverdueAnalyticsItem {
  name: string;
  count: number;
}

export interface OverdueAnalyticsData {
  totalOverdue: number;
  byProject: OverdueAnalyticsItem[];
  byStage: OverdueAnalyticsItem[];
}

export interface ComplexityAnalyticsItem {
  complexity: string;
  taskVolume: number;
  overdueCount: number;
  completedCount: number;
  reworkCount: number;
  actualHours: number;
  estimatedHours: number;
}

export interface AttentionRequiredItem {
  taskId: number;
  taskCode: string;
  taskName: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  artistId: number | null;
  artistName: string;
  status: string;
  statusId: number | null;
  priority: string;
  dueDate: string | null;
  remainingBid: number;
  issueReason: string;
}

export interface AnalyticsResponse {
  success: boolean;
  filter: AnalyticsFilterParams;
  options: {
    projects: Array<{ id: number | string; projectCode: string; projectName: string }>;
    stages: Array<{ id: number; stageName: string }>;
    artists: Array<{ id: number; fullName: string; employeeCode: string; departmentName: string }>;
    complexities: string[];
  };
  kpis: AnalyticsKpi;
  taskStatusDistribution: TaskStatusDistributionItem[];
  departmentWorkload: DepartmentWorkloadItem[];
  projectProgress: ProjectProgressItem[];
  bidVsActual: BidVsActualItem[];
  artistWorkload: {
    chartData: Array<{ artistId: number; artistName: string; targetBid: number; actualBid: number }>;
    tableData: ArtistWorkloadRow[];
  };
  productionTrend: ProductionTrendItem[];
  reviewAnalytics: ReviewAnalyticsData;
  overdueAnalytics: OverdueAnalyticsData;
  attentionRequired: AttentionRequiredItem[];
  complexityAnalytics: ComplexityAnalyticsItem[];
}

export interface PerformanceMetric {
  name: string;
  productivity: number;
  bidHours: number;
  actualHours: number;
}

export const analyticsService = {
  // Main Real-Data Analytics Endpoint
  getAnalyticsData: async (params?: AnalyticsFilterParams): Promise<AnalyticsResponse | null> => {
    try {
      const res = await apiClient.get('/reports/analytics', { params });
      return res.data;
    } catch (err) {
      console.error('[analyticsService.getAnalyticsData] Error:', err);
      return null;
    }
  },

  // Legacy client-store fallbacks kept for safety
  getStudioStats: () => {
    const { tasks, shots, projects, users } = useLuminaStore.getState();
    const totalBid = tasks.reduce((acc, t) => acc + t.bidHours, 0);
    const totalActual = tasks.reduce((acc, t) => acc + t.spentHours, 0);
    const remaining = tasks.reduce((acc, t) => acc + t.remainingHours, 0);
    const approvedShots = shots.filter(s => s.status === 'Approved').length;
    
    return {
      totalProjects: projects.length,
      totalShots: shots.length,
      totalArtists: users.filter(u => u.role === 'Artist').length,
      totalDepartments: 5,
      assignedBid: totalBid,
      utilizedBid: totalActual,
      remainingBid: remaining,
      revenueForecast: totalBid * 150,
      revenueRecognized: totalActual * 150,
      efficiency: totalActual > 0 ? Math.round((totalBid / totalActual) * 100) : 100,
      shotCompletion: shots.length > 0 ? Math.round((approvedShots / shots.length) * 100) : 0,
      overdueTasks: tasks.filter(t => t.status !== 'Approved' && new Date(t.dueDate) < new Date()).length,
      riskFactor: 'Low',
      activeArtists: users.filter(u => u.isActive).length
    };
  },

  getProjectHealthData: () => [],
  getDepartmentMetrics: () => [],
  getCapacityData: () => [],
  getPerformanceRankings: () => [],
  getLeadPerformance: () => [],
  getDepartmentUtilization: () => []
};