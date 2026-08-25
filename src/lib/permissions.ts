import { rolePermissions, Role, Permission } from '@/config/rbac';

const roleDisplayToKey: Record<string, Role> = {
  "Production Head": "production_head",
  "Department Supervisor": "department_supervisor",
  "Lead": "lead",
  "Artist": "artist",
};

export function getRoleKey(role: string): Role | undefined {
  return roleDisplayToKey[role];
}

export function getPermissions(role: string): Permission[] {
  const roleKey = getRoleKey(role);
  if (!roleKey) return [];
  return rolePermissions[roleKey];
}

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = getPermissions(role);
  return permissions.includes(permission);
}
