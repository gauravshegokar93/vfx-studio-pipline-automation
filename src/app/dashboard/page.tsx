
"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ProductionHeadDashboard from '@/app/dashboard/production-head-view';
import LeadDashboardPage from '@/app/lead-dashboard/page';
import DepartmentQueuePage from '@/app/department-queue/page';
import ArtistTasksPage from '@/app/tasks/page';
import ReviewPage from '@/app/review/page';
import ProjectManagementPage from '@/app/projects/page';

export default function UnifiedDashboard() {
  const { role } = useAuth();
  
  // Wait for role to be available
  if (!role) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Resolving workspace...</p>
        </div>
      </DashboardLayout>
    );
  }
  
  // Route users to their specific primary dashboard experience
  switch (role) {
    case 'Super Admin':
    case 'Production Head':
      return <ProductionHeadDashboard />;
    case 'Project Manager':
      return <ProjectManagementPage />;
    case 'Department Supervisor': // Keep for legacy compatibility if needed
      return <DepartmentQueuePage />;
    case 'Team Lead':
    case 'Lead': // Keep for legacy
      return <LeadDashboardPage />;
    case 'Artist':
      return <ArtistTasksPage />;
    case 'QC Artist':
      return <ReviewPage />;
    default:
      return (
        <DashboardLayout>
          <div className="flex h-full items-center justify-center flex-col gap-2">
            <p className="text-lg font-bold text-white">No Dashboard Configured</p>
            <p className="text-muted-foreground">Contact administrator to configure workspace for role: {role}</p>
          </div>
        </DashboardLayout>
      );
  }
}
