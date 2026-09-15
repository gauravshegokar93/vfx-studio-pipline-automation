import { apiClient as api } from './apiClient';

export interface DBProject {
  id: string | number;
  projectCode: string;
  projectName: string;
  clientName?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  reelCount: number;
  shotCount: number;
  progress: number;
}

export interface DBReel {
  reelId: string | number;
  reelName: string;
  sequenceCount: number;
  shotCount: number;
}

export interface DBSequence {
  sequenceId: string | number;
  reelId: string | number;
  sequenceCode: string;
  sequenceName: string;
  shotCount: number;
}

export interface DBShot {
  shotId: string | number;
  sequenceId: string | number;
  reelId: string | number;
  shotCode: string;
  frameStart?: number | null;
  frameEnd?: number | null;
  duration?: number | null;
  thumbnailPath?: string | null;
  status: string;
}

export interface ProjectHierarchyResponse {
  success: boolean;
  project: DBProject;
  reels: DBReel[];
  sequences: DBSequence[];
  shots: DBShot[];
}

export const projectService = {
  getProjects: async (params?: { q?: string; status?: string }): Promise<DBProject[]> => {
    const res = await api.get('/projects', { params });
    return res.data.items || [];
  },

  getProjectHierarchy: async (projectId: string | number): Promise<ProjectHierarchyResponse> => {
    const res = await api.get(`/projects/${projectId}/hierarchy`);
    return res.data;
  },

  createProject: async (data: {
    projectCode: string;
    projectName: string;
    clientName?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DBProject> => {
    const res = await api.post('/projects', data);
    return res.data.project;
  },

  deleteProject: async (projectId: string | number): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/projects/${projectId}`);
    return res.data;
  }
};


