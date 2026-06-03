
import { useLuminaStore } from '@/lib/store';
import { Task, Shot, Project, User } from '@/lib/types';

export interface PerformanceMetric {
  name: string;
  productivity: number;
  bidHours: number;
  actualHours: number;
}

export const analyticsService = {
  // Global Aggregations
  getStudioStats: () => {
    const { tasks, shots, projects, users } = useLuminaStore.getState();
    const bid = tasks.reduce((acc, t) => acc + t.bidHours, 0);
    const actual = tasks.reduce((acc, t) => acc + t.spentHours, 0);
    const remaining = tasks.reduce((acc, t) => acc + t.remainingHours, 0);
    const approvedShots = shots.filter(s => s.status === 'Approved').length;
    
    const now = new Date();
    const overdue = tasks.filter(t => t.status !== 'Approved' && new Date(t.dueDate) < now).length;
    const highRisk = shots.filter(s => s.priority === 'Critical' && s.status !== 'Approved').length;

    return {
      assignedBid: bid,
      utilizedBid: actual,
      remainingBid: remaining,
      efficiency: actual > 0 ? Math.round((bid / actual) * 100) : 100,
      shotCompletion: shots.length > 0 ? Math.round((approvedShots / shots.length) * 100) : 0,
      overdueTasks: overdue,
      riskFactor: highRisk > 3 ? 'High' : (highRisk > 0 ? 'Medium' : 'Low'),
      activeArtists: users.filter(u => u.isActive).length
    };
  },

  // Project Health drill-down
  getProjectHealthData: () => {
    const { projects, shots, tasks } = useLuminaStore.getState();
    return projects.map(p => {
      const pShots = shots.filter(s => s.projectId === p.id);
      const pTasks = tasks.filter(t => pShots.some(ps => ps.id === t.shotId));
      const bid = pTasks.reduce((acc, t) => acc + t.bidHours, 0);
      const actual = pTasks.reduce((acc, t) => acc + t.spentHours, 0);
      const done = pShots.filter(s => s.status === 'Approved').length;
      
      return {
        id: p.id,
        name: p.projectName,
        code: p.projectCode,
        progress: pShots.length > 0 ? Math.round((done / pShots.length) * 100) : 0,
        bid,
        actual,
        efficiency: actual > 0 ? Math.round((bid / actual) * 100) : 100,
        status: p.status
      };
    });
  },

  // Department Analytics
  getDepartmentMetrics: () => {
    const { tasks } = useLuminaStore.getState();
    const depts = ['Roto', 'Paint', 'Comp', 'CG', 'Matchmove'];
    
    return depts.map(dept => {
      const dTasks = tasks.filter(t => t.pipelineStep === dept);
      const bid = dTasks.reduce((acc, t) => acc + t.bidHours, 0);
      const actual = dTasks.reduce((acc, t) => acc + t.spentHours, 0);
      const pendingReview = dTasks.filter(t => t.status === 'Pending Review').length;
      
      return {
        name: dept,
        utilization: Math.min(100, Math.round((dTasks.length / 20) * 100)), // Mock capacity 20 shots
        efficiency: actual > 0 ? Math.round((bid / actual) * 100) : 100,
        pendingReview,
        bidHours: bid,
        actualHours: actual
      };
    });
  },

  // Capacity Planning
  getCapacityData: () => {
    const { users, tasks } = useLuminaStore.getState();
    const artists = users.filter(u => u.role === 'Artist');
    
    return artists.map(a => {
      const aTasks = tasks.filter(t => t.assignedArtistId === a.id);
      const assigned = aTasks.reduce((acc, t) => acc + t.bidHours, 0);
      const capacity = 40; // Weekly hour cap
      
      return {
        name: a.name,
        assigned,
        remaining: Math.max(0, capacity - assigned),
        utilization: Math.round((assigned / capacity) * 100),
        status: !a.isActive ? 'Leave' : (assigned > capacity ? 'Overload' : 'Available')
      };
    });
  },

  // Lead and Artist Performance
  getPerformanceRankings: () => {
    const { users, tasks } = useLuminaStore.getState();
    return users.filter(u => u.role === 'Artist' || u.role === 'Lead').map(u => {
      const uTasks = tasks.filter(t => t.assignedArtistId === u.id || t.leadId === u.id);
      const bid = uTasks.reduce((acc, t) => acc + t.bidHours, 0);
      const actual = uTasks.reduce((acc, t) => acc + t.spentHours, 0);
      
      return {
        name: u.name,
        role: u.role,
        efficiency: actual > 0 ? Math.round((bid / actual) * 100) : 100,
        taskCount: uTasks.length
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  }
};
