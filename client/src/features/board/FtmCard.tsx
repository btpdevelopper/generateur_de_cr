import { useMemo } from "react";
import {
  GripVertical,
  Building2,
  ArrowRight,
  Award,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Ban,
  Briefcase,
  FileSignature,
} from "lucide-react";
import type { Ftm, Lot, Quote } from "../../types/models";
import { formatCurrency } from "../../lib/parse";
import {
  getStatusChip,
  getOriginStyle,
  getFtmOsStatus,
  ftmLabel,
} from "../../lib/ftmHelpers";
import { OriginIcon } from "./icons";

interface FtmCardProps {
  ftm: Ftm;
  lots: Lot[];
  onOpen: (ftm: Ftm) => void;
  /** Drag handle props from dnd-kit (listeners + attributes), if draggable. */
  dragHandleProps?: Record<string, unknown>;
}

interface AmountInfo {
  amount: number;
  title: string;
  colorClass: string;
  icon: typeof Award;
  custom?: "competition" | null;
}

/** Latest quote per bidder, keyed by company name (legacy quotesByBidders). */
function latestQuotesByBidder(ftm: Ftm, lots: Lot[]): Quote[] {
  const byBidder: Record<string, Quote[]> = {};
  for (const q of ftm.quotes || []) {
    const bidderKey =
      (q.workPackage
        ? lots.find((l) => l.number === q.workPackage)?.company || q.workPackage
        : q.externalCompany) || "unknown";
    (byBidder[bidderKey] ||= []).push(q);
  }
  return Object.values(byBidder).map((qs) =>
    qs.reduce((latest, cur) => (cur.quoteIndex > latest.quoteIndex ? cur : latest)),
  );
}

/** Compute the primary amount displayed on the card (legacy createFtmCard). */
function computeAmount(ftm: Ftm, latest: Quote[]): AmountInfo {
  const moaAccepted = latest.filter((q) => q.isAccepted === true);
  const moeSelected = latest.filter((q) => q.isRejected !== true);
  const all = latest;

  const potentialBidders = new Set<string>(ftm.lots || []);
  (ftm.quotes || []).forEach((q) => {
    if (q.externalCompany) potentialBidders.add(q.externalCompany);
  });
  const responding = new Set<string>();
  latest.forEach((q) => {
    if (q.workPackage) responding.add(q.workPackage);
    else if (q.externalCompany) responding.add(q.externalCompany);
  });
  const hasWinner = latest.some((q) => q.isRejected === false);
  const isCompetition = potentialBidders.size > 1;
  const allResponded = potentialBidders.size === responding.size;
  const unresolvedCompetition =
    isCompetition && (!allResponded || (allResponded && !hasWinner));

  if (ftm.status === "Annulé") {
    const totalMoa = moaAccepted.reduce((s, q) => s + (q.validatedMoaAmount || 0), 0);
    const totalMoe = moeSelected.reduce((s, q) => s + (q.validatedAmount || 0), 0);
    const totalProposed = all.reduce((s, q) => s + q.amount, 0);
    return {
      amount: totalMoa || totalMoe || totalProposed || ftm.moeEstimate,
      title: "Montant lors de l'annulation",
      colorClass: "text-gray-400 line-through",
      icon: Ban,
    };
  }
  if (moaAccepted.length > 0) {
    const amount = moaAccepted.reduce((s, q) => s + (q.validatedMoaAmount || 0), 0);
    return {
      amount,
      title: "Montant final (accord paiement)",
      colorClass: amount >= 0 ? "text-purple-600" : "text-red-600",
      icon: Award,
    };
  }
  if (unresolvedCompetition) {
    return {
      amount: 0,
      title: "Choix devis à faire",
      colorClass: "text-blue-600",
      icon: Briefcase,
      custom: "competition",
    };
  }
  if (
    moeSelected.length > 0 &&
    moeSelected.some((q) => q.validatedAmount != null && q.validatedAmount !== 0)
  ) {
    const amount = moeSelected.reduce((s, q) => s + (q.validatedAmount || 0), 0);
    return {
      amount,
      title: "Montant validé MOE",
      colorClass: amount >= 0 ? "text-green-600" : "text-red-600",
      icon: CheckCircle2,
    };
  }
  if (moeSelected.length > 0) {
    const amount = moeSelected.reduce((s, q) => s + (q.amount || 0), 0);
    return {
      amount,
      title: "Montant proposé (en analyse MOE)",
      colorClass: amount >= 0 ? "text-blue-600" : "text-red-600",
      icon: CircleDollarSign,
    };
  }
  if (all.length > 0) {
    const amount = all.reduce((s, q) => s + (q.amount || 0), 0);
    return {
      amount,
      title: "Montant proposé ESE",
      colorClass: amount >= 0 ? "text-blue-600" : "text-red-600",
      icon: CircleDollarSign,
    };
  }
  if (ftm.moeEstimate > 0) {
    return {
      amount: ftm.moeEstimate,
      title: "Estimation initiale MOE",
      colorClass: "text-gray-500",
      icon: ClipboardList,
    };
  }
  return { amount: 0, title: "N/A", colorClass: "text-gray-500", icon: CircleDollarSign };
}

export default function FtmCard({
  ftm,
  lots,
  onOpen,
  dragHandleProps,
}: FtmCardProps) {
  const latest = useMemo(() => latestQuotesByBidder(ftm, lots), [ftm, lots]);
  const amountInfo = useMemo(() => computeAmount(ftm, latest), [ftm, latest]);
  const osStatus = getFtmOsStatus(ftm);
  const originStyle = getOriginStyle(ftm.origin);

  const companies = (ftm.lots || []).map((lotNumber) => {
    const lot = lots.find((l) => l.number === lotNumber);
    return lot ? lot.company : `Lot ${lotNumber}`;
  });

  const AmountIcon = amountInfo.icon;

  return (
    <div className="flex flex-col rounded-xl border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="flex-grow p-4">
        <div className="flex items-start justify-between">
          <h3 className="flex-grow pr-2 font-bold leading-tight text-gray-800">
            {ftm.ftmNumber} - {ftmLabel(ftm)}
          </h3>
          <button
            type="button"
            className="flex-shrink-0 cursor-grab touch-none text-gray-400 hover:text-gray-600"
            title="Déplacer"
            {...(dragHandleProps || {})}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex items-start gap-2 text-sm">
          <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {companies.length > 0 ? (
              companies.map((c, i) => (
                <span key={i} className="inline-block text-gray-500">
                  {c}
                  {i < companies.length - 1 && (
                    <span className="mx-1 text-gray-400">|</span>
                  )}
                </span>
              ))
            ) : (
              <span className="text-gray-500">Aucune entreprise</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-100 px-4 pb-3 pt-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusChip(
              ftm.status,
            )}`}
          >
            {ftm.status}
          </span>
          {originStyle && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${originStyle.class}`}
            >
              <OriginIcon icon={originStyle.icon} className="h-3 w-3" />
              {ftm.origin}
            </span>
          )}
          {osStatus.text !== "N/A" && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${osStatus.style}`}
            >
              <FileSignature className="h-3 w-3" />
              {osStatus.text}
            </span>
          )}
        </div>

        <div>
          {amountInfo.title === "N/A" ? (
            <span className="font-semibold text-gray-500">Aucun chiffrage</span>
          ) : amountInfo.custom === "competition" ? (
            <div
              className="flex items-center gap-x-2 font-semibold text-blue-600"
              title="Plusieurs entreprises en concurrence"
            >
              <Briefcase className="h-4 w-4" />
              <span>Choix devis à faire</span>
            </div>
          ) : (
            <div
              className="flex flex-wrap items-center gap-x-2"
              title={amountInfo.title}
            >
              <div
                className={`flex items-center font-semibold ${amountInfo.colorClass}`}
              >
                <AmountIcon className="mr-2 h-4 w-4" />
                <span>{formatCurrency(amountInfo.amount)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-1 flex items-center justify-end border-t border-dashed border-gray-100 pt-1">
          <button
            type="button"
            onClick={() => onOpen(ftm)}
            className="group flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Voir détails
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
