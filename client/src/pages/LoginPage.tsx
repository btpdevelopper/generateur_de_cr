import { useState, type FormEvent } from "react";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button, Field, TextInput } from "../components/ui";

/** Map Firebase auth error codes to friendly French messages. */
function friendlyAuthError(e: unknown): string {
  const code =
    e && typeof e === "object" && "code" in e
      ? String((e as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "Adresse e-mail invalide.";
    case "auth/missing-password":
      return "Veuillez saisir un mot de passe.";
    case "auth/weak-password":
      return "Le mot de passe doit contenir au moins 6 caractères.";
    case "auth/email-already-in-use":
      return "Cette adresse e-mail est déjà utilisée.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Identifiants incorrects. Vérifiez votre e-mail et mot de passe.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessayez plus tard.";
    case "auth/network-request-failed":
      return "Problème de connexion réseau.";
    default:
      return "Une erreur est survenue. Veuillez réessayer.";
  }
}

export default function LoginPage() {
  const { signInEmail, signUpEmail, signInGuest } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") await signInEmail(email, password);
      else await signUpEmail(email, password);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInGuest();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <svg
            className="h-10 w-auto text-indigo-600"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12.0001 2.25C6.61934 2.25 2.25 6.61934 2.25 12.0001C2.25 17.3808 6.61934 21.7501 12.0001 21.7501C17.3808 21.7501 21.7501 17.3808 21.7501 12.0001C21.7501 6.61934 17.3808 2.25 12.0001 2.25ZM10.0626 17.3907L5.82262 13.1507L7.37512 11.5982L10.0626 14.2857L16.6251 7.7232L18.1776 9.2757L10.0626 17.3907Z" />
          </svg>
          <h1 className="mt-3 text-2xl font-bold text-gray-800">
            Suivi Financier
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "signin"
              ? "Connectez-vous à votre espace"
              : "Créez votre compte"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Adresse e-mail">
            <TextInput
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
            />
          </Field>
          <Field label="Mot de passe">
            <TextInput
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "signin" ? (
              <LogIn className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {mode === "signin" ? "Se connecter" : "Créer le compte"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          {mode === "signin" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                className="font-semibold text-indigo-600 hover:text-indigo-800"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
              >
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà inscrit ?{" "}
              <button
                type="button"
                className="font-semibold text-indigo-600 hover:text-indigo-800"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
              >
                Se connecter
              </button>
            </>
          )}
        </div>

        <div className="my-6 flex items-center gap-3 text-xs uppercase text-gray-400">
          <div className="h-px flex-grow bg-gray-200" />
          ou
          <div className="h-px flex-grow bg-gray-200" />
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          className="w-full"
          onClick={handleGuest}
        >
          Continuer en tant qu'invité
        </Button>
      </div>
    </div>
  );
}
