import LeadDashboardPage from "@/app/lead-dashboard/page";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function WorkspaceLeadPage() {
  return (
    <ProtectedRoute>
      <LeadDashboardPage />
    </ProtectedRoute>
  );
}
