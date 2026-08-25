import ArtistTasksPage from "@/app/tasks/page";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function WorkspaceArtistPage() {
  return (
    <ProtectedRoute>
      <ArtistTasksPage />
    </ProtectedRoute>
  );
}
