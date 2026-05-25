// Data normalization ported from the legacy `runDataPatches` (HTML lines
// 2049-2107). Ensures loaded documents have a consistent shape regardless of
// how old they are, so the rest of the UI can assume required arrays/objects
// exist.
import type {
  Ftm,
  Lot,
  OrdreService,
  ProjectBootstrap,
  SuiviFinancierItem,
} from "../types/models";

function normalizeOs(os: OrdreService): OrdreService {
  return {
    ...os,
    signatureChain: os.signatureChain || [],
    lots: os.lots || [],
    linkedQuoteDetails: os.linkedQuoteDetails || [],
  };
}

export function normalizeFtm(ftm: Ftm): Ftm {
  const next: Ftm = { ...ftm };
  if (!next.type) next.type = "FTM";
  if (!next.os) next.os = [];
  if (!next.statusHistory) next.statusHistory = [];
  if (!next.quotes) next.quotes = [];
  if (!next.exchanges) next.exchanges = [];
  if (!next.lots) next.lots = [];
  next.os = next.os.map(normalizeOs);

  // Impacts: convert legacy string values into { text, expectedReturnDate }.
  if (next.impacts) {
    const fixed: Ftm["impacts"] = {};
    for (const lotNumber of Object.keys(next.impacts)) {
      const v = next.impacts[lotNumber] as unknown;
      if (typeof v === "string") {
        fixed[lotNumber] = { text: v, expectedReturnDate: null };
      } else {
        fixed[lotNumber] = next.impacts[lotNumber];
      }
    }
    next.impacts = fixed;
  } else {
    next.impacts = {};
  }
  return next;
}

export function normalizeLot(lot: Lot): Lot {
  const next: Lot = { ...lot };
  if (next.isArchived === undefined) next.isArchived = false;
  if (next.penalites === undefined) next.penalites = [];
  if (next.avance === undefined) next.avance = null;

  // Migrate old `penalties` -> `penalites`.
  const legacyPenalties = (next as Record<string, unknown>).penalties as
    | unknown[]
    | undefined;
  if (legacyPenalties && legacyPenalties.length > 0 && next.penalites.length === 0) {
    next.penalites = legacyPenalties as Lot["penalites"];
  }

  if (!next.suiviFinancier) next.suiviFinancier = [];
  next.suiviFinancier = next.suiviFinancier.map((item: SuiviFinancierItem) => {
    const hasFactures = !!(item.factures && item.factures.length > 0);
    const defaultMontantValide = hasFactures
      ? item.factures!.reduce((sum, f) => sum + (f.montantHT || 0), 0)
      : 0;
    const defaults: SuiviFinancierItem = {
      situationNumero: "",
      situationDate: null,
      situationMontantHT: hasFactures ? defaultMontantValide : 0,
      validationStatut: hasFactures ? "Certificat Généré" : "Attente MOE",
      validationMontantHT: defaultMontantValide,
      validationDate: hasFactures ? item.factures![0].dateFacture || null : null,
    };
    return { ...defaults, ...item };
  });
  return next;
}

/** Normalize a full bootstrap payload in one shot. */
export function normalizeBootstrap(b: ProjectBootstrap): ProjectBootstrap {
  return {
    project: b.project,
    ftms: (b.ftms || []).map(normalizeFtm),
    lots: (b.lots || []).map(normalizeLot),
    personnel: (b.personnel || []).map((p) => ({
      ...p,
      isArchived: p.isArchived ?? false,
    })),
    standaloneOs: (b.standaloneOs || []).map(normalizeOs),
  };
}
