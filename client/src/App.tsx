import { useAuth } from "./auth/AuthContext";

// NOTE: This is the scaffold shell. The frontend agent replaces this with
// the login screen + project selection + Kanban board and feature routes.
export default function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Chargement…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-700">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold">Suivi Financier</h1>
          <p className="mt-2 text-sm text-gray-500">
            Écran de connexion à implémenter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-white/90 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800">Suivi Financier</h1>
        <button
          onClick={() => logout()}
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
        >
          Déconnexion
        </button>
      </header>
      <main className="flex-grow p-6 text-gray-600">
        Connecté en tant que {user.isAnonymous ? "invité" : user.email}. Tableau
        Kanban à implémenter.
      </main>
    </div>
  );
}
