import { useEffect, useState, type FormEvent } from "react";
import {
  FolderKanban,
  Plus,
  Trash2,
  Loader2,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { listProjects, createProject, deleteProject } from "../../api/client";
import type { Project } from "../../types/models";
import { useAuth } from "../../auth/AuthContext";
import { Button, TextInput, Spinner } from "../../components/ui";
import { formatDateFr } from "../../lib/parse";

export default function ProjectSelectPage({
  onSelect,
}: {
  onSelect: (projectId: string) => void;
}) {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const project = await createProject(name);
      setNewName("");
      onSelect(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (
      !window.confirm(
        `Supprimer définitivement le projet « ${project.name} » et toutes ses données ?`,
      )
    )
      return;
    setDeletingId(project.id);
    try {
      await deleteProject(project.id);
      setProjects((p) => p.filter((x) => x.id !== project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <svg
              className="h-8 w-auto text-indigo-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.0001 2.25C6.61934 2.25 2.25 6.61934 2.25 12.0001C2.25 17.3808 6.61934 21.7501 12.0001 21.7501C17.3808 21.7501 21.7501 17.3808 21.7501 12.0001C21.7501 6.61934 17.3808 2.25 12.0001 2.25ZM10.0626 17.3907L5.82262 13.1507L7.37512 11.5982L10.0626 14.2857L16.6251 7.7232L18.1776 9.2757L10.0626 17.3907Z" />
            </svg>
            <h1 className="text-xl font-bold text-gray-800">Suivi Financier</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">
              {user?.isAnonymous ? "Invité" : user?.email}
            </span>
            <Button variant="secondary" onClick={() => logout()}>
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h2 className="mb-1 text-2xl font-bold text-gray-800">Vos projets</h2>
        <p className="mb-6 text-sm text-gray-500">
          Sélectionnez un projet existant ou créez-en un nouveau.
        </p>

        <form
          onSubmit={handleCreate}
          className="mb-8 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
        >
          <div className="flex-grow">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nouveau projet
            </label>
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du projet (ex: Résidence Les Tilleuls)"
            />
          </div>
          <Button type="submit" disabled={creating || !newName.trim()}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Créer
          </Button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16">
            <Spinner label="Chargement des projets…" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center text-gray-400">
            <FolderKanban className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="font-medium">Aucun projet pour le moment.</p>
            <p className="text-sm">Créez votre premier projet ci-dessus.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li
                key={project.id}
                className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => onSelect(project.id)}
                  className="flex flex-grow items-center gap-3 text-left"
                >
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {project.name}
                    </div>
                    {project.createdAt && (
                      <div className="text-xs text-gray-400">
                        Créé le {formatDateFr(project.createdAt)}
                      </div>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Supprimer le projet"
                    onClick={() => handleDelete(project)}
                    disabled={deletingId === project.id}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === project.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect(project.id)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-indigo-600"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
