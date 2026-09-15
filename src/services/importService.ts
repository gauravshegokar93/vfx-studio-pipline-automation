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

export interface BatchSummary {
    importBatchId: number;
    batchNo: string;
    batchName: string;
    importStatus: string;
    projectId?: number | null;
    projectName: string;
    reels: string[];
    totalShots: number;
    rotoHours: number;
    paintHours: number;
    compHours: number;
    cgHours: number;
    totalHours: number;
    earliestETA?: string | null;
    latestETA?: string | null;
}

export const importService = {
    uploadExcel: async (file: File, projectId?: number) => {
        const formData = new FormData();
        formData.append('file', file);
        if (projectId) {
            formData.append('projectId', projectId.toString());
        }
        const response = await api.post('/import/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    getBatches: async (): Promise<ImportBatch[]> => {
        const response = await api.get('/import/batches');
        return response.data.data;
    },

    getBatchSummary: async (batchId: number): Promise<BatchSummary> => {
        const response = await api.get(`/import/batches/${batchId}/summary`);
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
    },

    approveBatch: async (batchId: number) => {
        const response = await api.post(`/import/batches/${batchId}/approve`);
        return response.data;
    },

    createTasks: async (batchId: number) => {
        const response = await api.post(`/import/batches/${batchId}/create-tasks`);
        return response.data;
    }
};


