
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

  getDepartmentUtilization: async () => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { name: 'Paint', value: 85 },
      { name: 'Roto', value: 92 },
      { name: 'Comp', value: 78 },
      { name: 'Matchmove', value: 65 },
      { name: 'CG', value: 88 },
    ];
  },

  getBidVsActual: async () => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { name: 'Week 1', bid: 400, actual: 380 },
      { name: 'Week 2', bid: 450, actual: 480 },
      { name: 'Week 3', bid: 300, actual: 290 },
      { name: 'Week 4', bid: 500, actual: 520 },
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
  },

  getArtistProductivity: async () => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return [
      { name: 'Artist A', productivity: 120 },
      { name: 'Artist B', productivity: 105 },
      { name: 'Artist C', productivity: 95 },
      { name: 'Artist D', productivity: 110 },
      { name: 'Artist E', productivity: 85 },
    ];
  }
};
