
export type Role = 'Production Head' | 'Department Supervisor' | 'Lead' | 'Artist';

export type PipelineStep = 'Ingest' | 'Prep' | 'Roto' | 'Paint' | 'Matchmove' | 'CG' | 'Comp' | 'QC' | 'Delivery';

export type TaskStatus = 'Not Started' | 'Assigned' | 'In Progress' | 'Pending Review' | 'Client Review' | 'Retake' | 'Approved' | 'Delivered';

export type ReviewStatus = 'Pending' | 'In Review' | 'Changes Requested' | 'Approved';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

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

export interface Sequence {
  id: string;
  projectId: string;
  sequenceCode: string;
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
  progress: number; // 0-100
  internalEta: string;
  reviewerId?: string;
  reviewStatus: ReviewStatus;
  latestArtistComment?: string;
  latestLeadComment?: string;
  latestSupComment?: string;
  startDate: string;
  dueDate: string;
  priority: string;
  isTimerRunning?: boolean;
  lastTimerStart?: number;
}

export interface TimeLog {
  id: string;
  taskId: string;
  artistId: string;
  startTime: string;
  endTime?: string;
  totalMinutes: number;
}

export interface Version {
  id: string;
  taskId: string;
  artistId: string;
  versionNumber: number;
  filePath: string;
  reviewStatus: TaskStatus;
  reviewComment?: string;
  createdAt: string;
}

export interface Leave {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: 'Vacation' | 'Sick' | 'Holiday';
  status: LeaveStatus;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'TaskAssignment' | 'ReviewRetake' | 'DeadlineWarning';
  isRead: boolean;
  createdAt: string;
}

export interface ShotStatusHistory {
  id: string;
  shotId: string;
  statusFrom: string;
  statusTo: string;
  changedById: string;
  changedAt: string;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  artistId: string;
  assignedById: string;
  assignedAt: string;
  isCurrent: boolean;
}
