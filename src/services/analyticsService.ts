import { ENDPOINTS } from '@/config/api';

const MOCK_DELAY = 700;

export interface PerformanceMetric {
  name: string;
  productivity: number;
  bidHours: number;
  actualHours: number;
}

export const analyticsService = {
  getDepartmentPerformance: async (): Promise<PerformanceMetric[]> => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { name: 'Paint', productivity: 112, bidHours: 450, actualHours: 401 },
      { name: 'Roto', productivity: 95, bidHours: 1200, actualHours: 1263 },
      { name: 'Comp', productivity: 124, bidHours: 800, actualHours: 645 },
      { name: 'Matchmove', productivity: 88, bidHours: 300, actualHours: 341 },
      { name: 'CG', productivity: 105, bidHours: 2000, actualHours: 1904 },
    ];
  },

  getProjectHealth: async () => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { day: 'Mon', completion: 45 },
      { day: 'Tue', completion: 52 },
      { day: 'Wed', completion: 58 },
      { day: 'Thu', completion: 64 },
      { day: 'Fri', completion: 72 },
    ];
  }
};
