import type { LucideIcon } from "lucide-react";
import {
  Users,
  UserCheck,
  UserCog,
  Clapperboard,
} from "lucide-react";

export interface WorkspaceNavigationItem {
  roleKey: string;
  title: string;
  route: string;
  dashboardTitle: string;
  icon: LucideIcon;
  isEnabled: boolean;
}

export const workspaceNavigation: WorkspaceNavigationItem[] = [
  {
    roleKey: "production_head",
    title: "Production Head",
    route: "/workspace/production-head",
    dashboardTitle: "Production Head Dashboard",
    icon: Users,
    isEnabled: true,
  },
  {
    roleKey: "department_supervisor",
    title: "Department Supervisor",
    route: "/workspace/department-supervisor",
    dashboardTitle: "Department Supervisor Dashboard",
    icon: UserCheck,
    isEnabled: true,
  },
  {
    roleKey: "lead",
    title: "Lead",
    route: "/workspace/lead",
    dashboardTitle: "Lead Dashboard",
    icon: UserCog,
    isEnabled: true,
  },
  {
    roleKey: "artist",
    title: "Artist",
    route: "/workspace/artist",
    dashboardTitle: "Artist Dashboard",
    icon: Clapperboard,
    isEnabled: true,
  },
];
