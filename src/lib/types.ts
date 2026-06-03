
export type Role = 'Super Admin' | 'Producer' | 'Production Manager' | 'Department Supervisor' | 'Team Lead' | 'Artist';

export type PipelineStep = 'Ingest' | 'Prep' | 'Roto' | 'Paint' | 'Matchmove' | 'CG' | 'Comp' | 'QC' | 'Delivery';

export type TaskStatus = 'Not Started' | 'Assigned' | 'In Progress' | 'Pending Review' | 'Client Review' | 'Retake' | 'Approved' | 'Delivered';

export interface User {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string;
  leadId?: string;
  isActive: boolean;
  avatarUrl?: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  startDate: string;
  endDate: string;
  status: 'Pre-Production' | 'In-Production' | 'Post-Production' | 'Completed' | 'On-Hold';
  thumbnailUrl?: string;
}

export interface Shot {
  id: string;
  projectId: string;
  sequenceId: string;
  shotCode: string;
  status: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  description: string;
}

export interface Task {
  id: string;
  shotId: string;
  pipelineStep: PipelineStep;
  taskName: string;
  assignedArtistId: string;
  leadId: string;
  supervisorId: string;
  bidHours: number;
  spentHours: number;
  remainingHours: number;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  priority: string;
}

export interface Version {
  id: string;
  taskId: string;
  versionNumber: number;
  filePath: string;
  submittedBy: string;
  reviewStatus: string;
  reviewComment?: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalProjects: number;
  totalShots: number;
  activeTasks: number;
  overdueTasks: number;
  bidVsActual: { department: string; bid: number; actual: number }[];
  utilization: { department: string; percentage: number }[];
}
