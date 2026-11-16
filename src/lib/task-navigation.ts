const departmentStages = new Set(['all', '1', '2', '3', '4']);

export function getDepartmentStage(stage: string | null): string {
  return stage && departmentStages.has(stage) ? stage : 'all';
}

export function departmentTaskHref(taskId: number | string, stage: string): string {
  const query = new URLSearchParams({ source: 'department-queue', stage: getDepartmentStage(stage) });
  return `/tasks/${encodeURIComponent(String(taskId))}?${query}`;
}

// Navigation context only: it never changes authentication or task permissions.
export function taskNavigationContext(query: { get(name: string): string | null }) {
  const isDepartmentQueue = query.get('source') === 'department-queue';
  return {
    isDepartmentQueue,
    workbenchHref: isDepartmentQueue
      ? `/department-queue?stage=${getDepartmentStage(query.get('stage'))}`
      : '/tasks',
    activePath: isDepartmentQueue ? '/department-queue' : undefined,
  };
}
