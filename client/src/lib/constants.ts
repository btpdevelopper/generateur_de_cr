// Kanban columns and badge styling ported from the original single-file app.
import type { FtmOrigin } from "../types/models";

export interface KanbanColumnDef {
  title: string;
  status?: string;
  statuses?: string[];
  color: string;
  headerColor: string;
  textColor: string;
}

export const kanbanColumns: KanbanColumnDef[] = [
  {
    title: "À Éditer",
    status: "FPM reçue, FTM en cours d'édition",
    color: "bg-gray-500",
    headerColor: "bg-gray-100",
    textColor: "text-gray-500",
  },
  {
    title: "Attente Devis",
    statuses: [
      "FTM transmise, en attente devis",
      "En attente retour entreprise après analyse MOE",
    ],
    color: "bg-yellow-500",
    headerColor: "bg-yellow-50",
    textColor: "text-yellow-600",
  },
  {
    title: "En Analyse",
    statuses: ["Devis en cours d'analyse MOE"],
    color: "bg-blue-500",
    headerColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    title: "Validé MOE/ESE",
    statuses: ["Devis validé MOE", "Devis validé entreprise après analyse MOE"],
    color: "bg-green-500",
    headerColor: "bg-green-50",
    textColor: "text-green-600",
  },
  {
    title: "Validé MOA",
    status: "Devis validé MOA",
    color: "bg-purple-500",
    headerColor: "bg-purple-50",
    textColor: "text-purple-600",
  },
  {
    title: "Annulé",
    status: "Annulé",
    color: "bg-red-500",
    headerColor: "bg-red-50",
    textColor: "text-red-600",
  },
];

/** All known statuses, in workflow order. */
export const allStatuses: string[] = [
  "FPM reçue, FTM en cours d'édition",
  "FTM transmise, en attente devis",
  "En attente retour entreprise après analyse MOE",
  "Devis en cours d'analyse MOE",
  "Devis validé MOE",
  "Devis validé entreprise après analyse MOE",
  "Devis validé MOA",
  "Annulé",
];

export interface OriginStyle {
  class: string;
  icon: string;
  label: string;
}

export const originStyles: Record<FtmOrigin, OriginStyle> = {
  "Demande MOA": {
    class: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "user",
    label: "MOA",
  },
  "Demande MOE": {
    class: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: "hard-hat",
    label: "MOE",
  },
  "Demande Entreprise": {
    class: "bg-amber-100 text-amber-800 border-amber-200",
    icon: "briefcase",
    label: "ENT",
  },
  "Aléas exécution": {
    class: "bg-red-100 text-red-800 border-red-200",
    icon: "alert-triangle",
    label: "ALÉAS",
  },
};

/** Returns the kanban column index for a given FTM status. */
export const columnIndexForStatus = (status: string): number => {
  for (let i = 0; i < kanbanColumns.length; i++) {
    const col = kanbanColumns[i];
    if (col.status === status) return i;
    if (col.statuses && col.statuses.includes(status)) return i;
  }
  return 0;
};
