import ProductionHeadDashboard from "@/app/dashboard/production-head-view";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function WorkspaceProductionHeadPage() {
  return (
    <ProtectedRoute>
      <ProductionHeadDashboard />
    </ProtectedRoute>
  );
}
