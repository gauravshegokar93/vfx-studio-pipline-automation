import { useLuminaStore } from '@/lib/store';
import { Task, Shot, Project, User } from '@/lib/types';

export interface PerformanceMetric {
  name: string;
  productivity: number;
  bidHours: number;
  actualHours: number;
}

export const analyticsService = {
  // Executive Overview Stats
  getStudioStats: () => {
    const { tasks, shots, projects, users } = useLuminaStore.getState();
    const totalBid = tasks.reduce((acc, t) => acc + t.bidHours, 0);
    const totalActual = tasks.reduce((acc, t) => acc + t.spentHours, 0);
    const remaining = tasks.reduce((acc, t) => acc + t.remainingHours, 0);
    const approvedShots = shots.filter(s => s.status === 'Approved').length;
    
    // Revenue Forecast: Assume $150 standard hourly rate for SSoT modeling
    const hourlyRate = 150;
    const revenueForecast = totalBid * hourlyRate;
    const revenueRecognized = totalActual * hourlyRate;

    const now = new Date();
    const overdue = tasks.filter(t => t.status !== 'Approved' && new Date(t.dueDate) < now).length;
    const highRisk = shots.filter(s => s.priority === 'Critical' && s.status !== 'Approved').length;

    return {
      totalProjects: projects.length,
      totalShots: shots.length,
      totalArtists: users.filter(u => u.role === 'Artist').length,
      totalDepartments: 5, // Static from project structure
      assignedBid: totalBid,
      utilizedBid: totalActual,
      remainingBid: remaining,
      revenueForecast,
      revenueRecognized,
      efficiency: totalActual > 0 ? Math.round((totalBid / totalActual) * 100) : 100,
      shotCompletion: shots.length > 0 ? Math.round((approvedShots / shots.length) * 100) : 0,
      overdueTasks: overdue,
      riskFactor: highRisk > 3 ? 'High' : (highRisk > 0 ? 'Medium' : 'Low'),
      activeArtists: users.filter(u => u.isActive).length
    };
  },

  // Project Burn Rate & Health
  getProjectHealthData: () => {
    const { projects, shots, tasks } = useLuminaStore.getState();
    return projects.map(p => {
      const pShots = shots.filter(s => s.projectId === p.id);
      const pTasks = tasks.filter(t => pShots.some(ps => ps.id === t.shotId));
      const bid = pTasks.reduce((acc, t) => acc + t.bidHours, 0);
      const actual = pTasks.reduce((acc, t) => acc + t.spentHours, 0);
      const done = pShots.filter(s => s.status === 'Approved').length;
      
      // Delivery Forecast
      const completionRate = pShots.length > 0 ? done / pShots.length : 0;
      const forecastStatus = completionRate > 0.8 ? 'On Track' : (completionRate > 0.4 ? 'Normal' : 'At Risk');

      return {
        id: p.id,
        name: p.projectName,
        code: p.projectCode,
        progress: Math.round(completionRate * 100),
        bid,
        actual,
        efficiency: actual > 0 ? Math.round((bid / actual) * 100) : 100,
        status: p.status,
        forecastStatus,
        dueDate: p.endDate
      };
    });
  },

  // Departmental Performance Efficiency
  getDepartmentMetrics: () => {
    const { tasks } = useLuminaStore.getState();
    const depts = ['Roto', 'Paint', 'Comp', 'CG', 'Matchmove'];
    
    return depts.map(dept => {
      const dTasks = tasks.filter(t => t.pipelineStep === dept);
      const bid = dTasks.reduce((acc, t) => acc + t.bidHours, 0);
      const actual = dTasks.reduce((acc, t) => acc + t.spentHours, 0);
      
      return {
        name: dept,
        capacityUtilization: Math.min(100, Math.round((dTasks.length / 20) * 100)),
        efficiency: actual > 0 ? Math.round((bid / actual) * 100) : 100,
        bidHours: bid,
        actualHours: actual
      };
    });
  },

  // Capacity & Allocation Analysis
  getCapacityData: () => {
    const { users, tasks } = useLuminaStore.getState();
    const artists = users.filter(u => u.role === 'Artist');
    
    return artists.map(a => {
      const aTasks = tasks.filter(t => t.assignedArtistId === a.id);
      const assigned = aTasks.reduce((acc, t) => acc + t.bidHours, 0);
      const capacity = 40; 
      
      return {
        name: a.name,
        assigned,
        remaining: Math.max(0, capacity - assigned),
        utilization: Math.round((assigned / capacity) * 100),
        status: !a.isActive ? 'Leave' : (assigned > capacity ? 'Busy' : 'Available')
      };
    });
  },

  // Lead Efficiency Rankings
  getLeadPerformance: () => {
    const { users, tasks } = useLuminaStore.getState();
    return users.filter(u => u.role === 'Lead').map(u => {
      const uTasks = tasks.filter(t => t.leadId === u.id);
      const bid = uTasks.reduce((acc, t) => acc + t.bidHours, 0);
      const actual = uTasks.reduce((acc, t) => acc + t.spentHours, 0);
      
      return {
        name: u.name,
        efficiency: actual > 0 ? Math.round((bid / actual) * 100) : 100,
        managedShots: new Set(uTasks.map(t => t.shotId)).size
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  }
};