
import { useLuminaStore } from '@/lib/store';

const MOCK_DELAY = 100;

export interface PerformanceMetric {
  name: string;
  productivity: number;
  bidHours: number;
  actualHours: number;
}

export const analyticsService = {
  getDepartmentPerformance: async (): Promise<PerformanceMetric[]> => {
    const store = useLuminaStore.getState();
    if (store.tasks.length === 0) {
      return [
        { name: 'Paint', productivity: 100, bidHours: 0, actualHours: 0 },
        { name: 'Roto', productivity: 100, bidHours: 0, actualHours: 0 },
        { name: 'Comp', productivity: 100, bidHours: 0, actualHours: 0 },
        { name: 'CG', productivity: 100, bidHours: 0, actualHours: 0 },
      ];
    }

    const depts = ['Roto', 'Paint', 'Comp', 'CG'];
    return depts.map(dept => {
      const deptTasks = store.tasks.filter(t => t.pipelineStep === dept);
      const bid = deptTasks.reduce((acc, t) => acc + t.bidHours, 0);
      const actual = deptTasks.reduce((acc, t) => acc + t.spentHours, 0);
      return {
        name: dept,
        productivity: actual > 0 ? Math.round((bid / actual) * 100) : 100,
        bidHours: bid,
        actualHours: actual
      };
    });
  },

  getDepartmentUtilization: async () => {
    const store = useLuminaStore.getState();
    const depts = ['Roto', 'Paint', 'Comp', 'CG'];
    // In a real app, this would compare active tasks vs total artist capacity
    return depts.map(d => {
      const activeTasks = store.tasks.filter(t => t.pipelineStep === d && t.status !== 'Approved').length;
      const capacity = 10; // Mock capacity per department
      return {
        name: d,
        value: Math.min(100, Math.round((activeTasks / capacity) * 100))
      };
    });
  },

  getBidVsActual: async () => {
    const store = useLuminaStore.getState();
    const bid = store.tasks.reduce((acc, t) => acc + t.bidHours, 0);
    const actual = store.tasks.reduce((acc, t) => acc + t.spentHours, 0);
    return [
      { name: 'Target', bid: bid, actual: 0 },
      { name: 'Current', bid: bid, actual: actual },
    ];
  },

  getProjectHealth: async () => {
    const store = useLuminaStore.getState();
    const total = store.shots.length;
    const completed = store.shots.filter(s => s.status === 'Approved').length;
    return [
      { day: 'Start', completion: 0 },
      { day: 'Current', completion: total > 0 ? (completed / total) * 100 : 0 },
    ];
  },

  getArtistProductivity: async () => {
    return [
      { name: 'Sarah Connor', productivity: 105 },
      { name: 'Alex Rivera', productivity: 98 },
      { name: 'Zoe Chen', productivity: 112 },
    ];
  }
};
