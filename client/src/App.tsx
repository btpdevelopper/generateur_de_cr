import { useEffect, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { Spinner } from "./components/ui";
import LoginPage from "./pages/LoginPage";
import ProjectSelectPage from "./features/projects/ProjectSelectPage";
import { ProjectDataProvider } from "./state/ProjectDataContext";
import ProjectArea from "./features/board/ProjectArea";

const LAST_PROJECT_KEY = "sf:lastProjectId";

export default function App() {
  const { user, loading } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(() =>
    localStorage.getItem(LAST_PROJECT_KEY),
  );

  // Persist the selected project so it auto-loads on return.
  useEffect(() => {
    if (projectId) localStorage.setItem(LAST_PROJECT_KEY, projectId);
  }, [projectId]);

  // Clear the in-memory selection when the user signs out so the next user
  // doesn't inherit it (the localStorage value is keyed by nothing, so we also
  // re-read it on a fresh login below).
  useEffect(() => {
    if (!user) setProjectId(null);
  }, [user]);

  // When a user logs in, restore their last project id (if any).
  useEffect(() => {
    if (user && !projectId) {
      const stored = localStorage.getItem(LAST_PROJECT_KEY);
      if (stored) setProjectId(stored);
    }
    // Only react to user changes; projectId is intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="Chargement…" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (!projectId) {
    return <ProjectSelectPage onSelect={(id) => setProjectId(id)} />;
  }

  return (
    <ProjectDataProvider key={projectId} projectId={projectId}>
      <ProjectArea onChangeProject={() => setProjectId(null)} />
    </ProjectDataProvider>
  );
}
