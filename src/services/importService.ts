import { apiClient as api } from './apiClient';

export interface ImportBatch {
    ImportBatchID: number;
    BatchNo: string;
    BatchName: string;
    ImportType: string;
    TotalRecords: number;
    SuccessRecords: number;
    FailedRecords: number;
    ImportStatus: string;
    StartedOn: string;
}

export interface ImportRow {
    BatchRowID: number;
    ImportBatchID: number;
    RowNumber: number;
    Project?: string;
    Episode?: string;
    ShotName?: string;
    ClientShotName?: string;
    Batch?: string;
    Department?: string;
    HeadIn?: number;
    TailOut?: number;
    FrameRange?: string;
    SOW?: string;
    Notes?: string;
    Vendor?: string;
    Complexity?: string;
    RotoBid?: number;
    PaintBid?: number;
    CompBid?: number;
    CGBid?: number;
    TotalBid?: number;
    ETA?: string;
    Status?: string;
    ThumbnailPath?: string;
    ValidationStatus: 'VALID' | 'INVALID';
    ValidationMessage?: string;
}

export const importService = {
    uploadExcel: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/import/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    getBatches: async (): Promise<ImportBatch[]> => {
        const response = await api.get('/import/batches');
        return response.data.data;
    },

    getBatchRows: async (batchId: number): Promise<ImportRow[]> => {
        const response = await api.get(`/import/batches/${batchId}/rows`);
        return response.data.data;
    },

    updateRow: async (rowId: number, updates: Partial<ImportRow>) => {
        const response = await api.put(`/import/rows/${rowId}`, updates);
        return response.data;
    },

    revalidateBatch: async (batchId: number) => {
        const response = await api.post(`/import/batches/${batchId}/revalidate`);
        return response.data.data;
    }
};
