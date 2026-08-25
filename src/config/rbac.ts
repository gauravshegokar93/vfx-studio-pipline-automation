export const roles = [
  "production_head",
  "department_supervisor",
  "lead",
  "artist",
] as const;

export const permissions = [
  "workspace.view",
  "admin.view",
  "dashboard.production",
  "dashboard.department",
  "dashboard.lead",
  "dashboard.artist",
  "sidebar.production",
  "sidebar.department",
  "sidebar.lead",
  "sidebar.artist",
  "sidebar.tasks",
  "sidebar.reviews",
  "sidebar.standup",
  "sidebar.capacity",
  "sidebar.staff",
  "sidebar.analytics",
] as const;

export type Role = (typeof roles)[number];
export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<Role, Permission[]> = {
  production_head: [
    "workspace.view",
    "admin.view",
    "dashboard.production",
    "sidebar.production",
    "sidebar.tasks",
    "sidebar.reviews",
    "sidebar.standup",
    "sidebar.capacity",
    "sidebar.staff",
    "sidebar.analytics",
  ],
  department_supervisor: [
    "workspace.view",
    "dashboard.department",
    "sidebar.department",
    "sidebar.reviews",
    "sidebar.staff",
    "sidebar.analytics",
  ],
  lead: [
    "workspace.view",
    "dashboard.lead",
    "sidebar.lead",
    "sidebar.tasks",
    "sidebar.reviews",
    "sidebar.capacity",
    "sidebar.staff",
    "sidebar.analytics",
  ],
  artist: [
    "workspace.view",
    "dashboard.artist",
    "sidebar.artist",
    "sidebar.tasks",
    "sidebar.reviews",
    "sidebar.standup",
  ],
};
