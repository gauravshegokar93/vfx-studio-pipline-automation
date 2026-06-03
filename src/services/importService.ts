import axios from 'axios';
import { ENDPOINTS } from '@/config/api';

const MOCK_DELAY = 2000;

export interface ImportSummary {
  projects: number;
  sequences: number;
  shots: number;
  tasks: number;
  failed: number;
}

export const importService = {
  importBidSheet: async (file: File): Promise<ImportSummary> => {
    // const formData = new FormData();
    // formData.append('file', file);
    // const response = await axios.post(ENDPOINTS.IMPORT, formData);
    // return response.data;
    
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    return {
      projects: 1,
      sequences: 5,
      shots: 24,
      tasks: 112,
      failed: 0
    };
  }
};
