
"use client";

import React, { useMemo } from 'react';
import { useLuminaStore } from '@/lib/store';
import ProductionHeadDashboard from '@/app/dashboard/production-head-view';
import LeadDashboardPage from '@/app/lead-dashboard/page';
import DepartmentQueuePage from '@/app/department-queue/page';
import ArtistTasksPage from '@/app/tasks/page';

export default function UnifiedDashboard() {
  const { currentRole } = useLuminaStore();
  
  // Route users to their specific primary dashboard experience
  switch (currentRole) {
    case 'Production Head':
      return <ProductionHeadDashboard />;
    case 'Department Supervisor':
      return <DepartmentQueuePage />;
    case 'Lead':
      return <LeadDashboardPage />;
    case 'Artist':
      return <ArtistTasksPage />;
    default:
      return <ArtistTasksPage />;
  }
}
