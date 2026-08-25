import { apiClient } from './apiClient';

export interface ImportRow {
  Id: number;
  ClientShotName: string;
  ShotName: string;
  ShotType: string;
  Episode: string;
  Complexity: string;
  TotalBid: number;
  Artist: string;
  Lead: string;
  Status: string;
  ETA: string;
  RotoBid: number;
  PaintBid: number;
  CompBid: number;
  CGBid: number;
  RetimeRepo: number;
}

export const importReviewService = {
  getPendingImports: async (): Promise<ImportRow[]> => {
    const res = await apiClient.get('/import-review');
    return res.data.items || [];
  },

  updateImportRow: async (id: number, data: Partial<ImportRow>): Promise<any> => {
    const res = await apiClient.put(`/import-review/${id}`, data);
    return res.data;
  },

  deleteImportRow: async (id: number): Promise<any> => {
    const res = await apiClient.delete(`/import-review/${id}`);
    return res.data;
  },

  approveImports: async (): Promise<any> => {
    const res = await apiClient.post(`/import-review/approve`);
    return res.data;
  }
};
