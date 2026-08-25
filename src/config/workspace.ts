import type { LucideIcon } from "lucide-react";
import { Users, UserCheck, UserCog, Clapperboard } from "lucide-react";

export interface WorkspaceRole {
  roleKey: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  sortOrder: number;
  isEnabled: boolean;
}

export const workspaceRoles: WorkspaceRole[] = [
  {
    roleKey: "production_head",
    title: "Production Head",
    description: "Manage the complete production pipeline.",
    icon: Users,
    color: "#E6192E",
    sortOrder: 1,
    isEnabled: true,
  },
  {
    roleKey: "department_supervisor",
    title: "Department Supervisor",
    description: "Manage department workflow and teams.",
    icon: UserCheck,
    color: "#8B5CF6",
    sortOrder: 2,
    isEnabled: true,
  },
  {
    roleKey: "lead",
    title: "Lead",
    description: "Manage assigned team and tasks.",
    icon: UserCog,
    color: "#3B82F6",
    sortOrder: 3,
    isEnabled: true,
  },
  {
    roleKey: "artist",
    title: "Artist",
    description: "Work on assigned production tasks.",
    icon: Clapperboard,
    color: "#10B981",
    sortOrder: 4,
    isEnabled: true,
  },
];
