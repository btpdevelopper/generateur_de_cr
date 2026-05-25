// Pure helpers ported from the legacy single-file app: status chips, origin
// badges, OS status and quote selection. UI-agnostic (return class strings /
// plain data) so they can be reused by cards, modals and lists.
import type { Ftm, Quote } from "../types/models";
import { kanbanColumns, originStyles, type OriginStyle } from "./constants";
import type { FtmOrigin } from "../types/models";

/** Tailwind classes for a status chip (legacy getStatusChip). */
export const getStatusChip = (status: string): string => {
  const column = kanbanColumns.find(
    (c) => c.status === status || (c.statuses && c.statuses.includes(status)),
  );
  if (!column) return "bg-gray-100 text-gray-800";
  const styles: Record<string, string> = {
    "bg-gray-500": "bg-gray-100 text-gray-600",
    "bg-yellow-500": "bg-yellow-100 text-yellow-700",
    "bg-blue-500": "bg-blue-100 text-blue-700",
    "bg-green-500": "bg-green-100 text-green-700",
    "bg-purple-500": "bg-purple-100 text-purple-700",
    "bg-red-500": "bg-red-100 text-red-700",
  };
  return styles[column.color] || "bg-gray-100 text-gray-800";
};

export const getOriginStyle = (
  origin: string | undefined,
): OriginStyle | null => {
  if (!origin) return null;
  return originStyles[origin as FtmOrigin] || null;
};

/**
 * Keep only the latest quote (by quoteIndex) per bidder
 * (lot number OR external company). Legacy getLatestQuotes.
 */
export const getLatestQuotes = (quotes: Quote[] = []): Quote[] => {
  if (!quotes || quotes.length === 0) return [];
  const byPackage: Record<string, Quote[]> = {};
  for (const q of quotes) {
    const key = q.workPackage || q.externalCompany || "unknown";
    (byPackage[key] ||= []).push(q);
  }
  return Object.values(byPackage).map((pkg) =>
    pkg.reduce((latest, current) =>
      current.quoteIndex > latest.quoteIndex ? current : latest,
    ),
  );
};

export interface OsStatusBadge {
  text: string;
  style: string;
}

/**
 * Simplified OS status for the card badge (legacy getFtmOsStatus, minus the
 * signature-chain "Notifié/En signature" detail which depends on
 * getOsStatusDetails — out of scope for this pass).
 */
export const getFtmOsStatus = (ftm: Ftm): OsStatusBadge => {
  if (ftm.status !== "Devis validé MOA") {
    return { text: "N/A", style: "bg-gray-100 text-gray-500" };
  }
  const acceptedQuoteLots = new Set(
    (ftm.quotes || []).filter((q) => q.isAccepted).map((q) => q.workPackage),
  );
  if (acceptedQuoteLots.size === 0) {
    return { text: "Attente Accord Devis", style: "bg-orange-100 text-orange-700" };
  }
  if (!ftm.os || ftm.os.length === 0) {
    return { text: "OS à créer", style: "bg-amber-100 text-amber-700" };
  }
  const osLots = new Set((ftm.os || []).flatMap((os) => os.lots || []));
  const hasAllOs = [...acceptedQuoteLots].every((lot) => osLots.has(lot as string));
  return hasAllOs
    ? { text: "OS Tous Créés", style: "bg-gray-200 text-gray-700" }
    : { text: "OS Partiels", style: "bg-gray-200 text-gray-700" };
};

/** Display label for an FTM (legacy uses ftm.label; model uses title). */
export const ftmLabel = (ftm: Ftm): string =>
  (ftm.label as string) || ftm.title || "Sans libellé";
