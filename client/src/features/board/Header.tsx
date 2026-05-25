import { useEffect, useRef, useState } from "react";
import {
  FolderKanban,
  Bell,
  LayoutGrid,
  Plus,
  FileSignature,
  Users,
  Building2,
  LogOut,
  ChevronsLeftRight,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

interface HeaderProps {
  projectName: string;
  onNewFtm: () => void;
  onAddOs: () => void;
  onManagePersonnel: () => void;
  onManageLots: () => void;
  onChangeProject: () => void;
}

export default function Header({
  projectName,
  onNewFtm,
  onAddOs,
  onManagePersonnel,
  onManageLots,
  onChangeProject,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const menuItem =
    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50";

  return (
    <header className="sticky top-0 z-30 flex-shrink-0 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-lg">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <svg
            className="h-8 w-auto text-indigo-600"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12.0001 2.25C6.61934 2.25 2.25 6.61934 2.25 12.0001C2.25 17.3808 6.61934 21.7501 12.0001 21.7501C17.3808 21.7501 21.7501 17.3808 21.7501 12.0001C21.7501 6.61934 17.3808 2.25 12.0001 2.25ZM10.0626 17.3907L5.82262 13.1507L7.37512 11.5982L10.0626 14.2857L16.6251 7.7232L18.1776 9.2757L10.0626 17.3907Z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-800">Suivi Financier</h1>
          {projectName && (
            <div className="ml-4 flex items-center border-l border-gray-300 pl-4">
              <FolderKanban className="mr-2 h-5 w-5 text-gray-500" />
              <span className="rounded-md bg-gray-100 px-2 py-1 text-sm font-semibold text-gray-600">
                {projectName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell (stub) */}
          <button
            type="button"
            title="Centre d'alertes (à venir)"
            disabled
            className="relative rounded-full p-2 text-gray-400"
          >
            <Bell className="h-6 w-6" />
          </button>

          {/* Tools menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              title="Navigation & Outils"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition-all hover:bg-gray-200"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-gray-100 bg-white p-1 shadow-xl">
                <button type="button" disabled className={`${menuItem} opacity-50`}>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Suivi Financier (à venir)</span>
                </button>
                <button type="button" disabled className={`${menuItem} opacity-50`}>
                  <LayoutDashboard className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Récapitulatif (à venir)</span>
                </button>
                <div className="my-1 h-px bg-gray-100" />
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onManagePersonnel();
                  }}
                >
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>Gérer le Personnel</span>
                </button>
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onManageLots();
                  }}
                >
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span>Gérer les Lots</span>
                </button>
                <div className="my-1 h-px bg-gray-100" />
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onChangeProject();
                  }}
                >
                  <ChevronsLeftRight className="h-4 w-4 text-indigo-500" />
                  <span>Changer de projet</span>
                </button>
                <button
                  type="button"
                  className={menuItem}
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span>
                    Déconnexion
                    <span className="ml-1 text-xs text-gray-400">
                      ({user?.isAnonymous ? "invité" : user?.email})
                    </span>
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onAddOs}
            className="flex h-10 items-center gap-x-2 rounded-lg bg-blue-600 px-4 font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
          >
            <FileSignature className="h-4 w-4" />
            <span className="text-sm">Ajouter OS</span>
          </button>
          <button
            type="button"
            onClick={onNewFtm}
            className="flex h-10 items-center gap-x-2 rounded-lg bg-indigo-600 px-4 font-semibold text-white shadow-sm transition-all hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Nouvelle FTM</span>
          </button>
        </div>
      </div>
    </header>
  );
}
