import DepartmentQueuePage from "@/app/department-queue/page";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function WorkspaceDepartmentSupervisorPage() {
  return (
    <ProtectedRoute>
      <DepartmentQueuePage />
    </ProtectedRoute>
  );
}
