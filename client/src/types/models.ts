// =============================================================================
// Domain data model for "Suivi Financier" (FTM tracker).
// These shapes are ported verbatim from the original single-file app
// (see legacy/SUIVI_FTM_v30.24.html). The Node/Express API stores and returns
// objects with exactly these shapes (Firestore documents).
// =============================================================================

/** Status of an FTM in the Kanban workflow. */
export type FtmStatus =
  | "FPM reçue, FTM en cours d'édition"
  | "FTM transmise, en attente devis"
  | "En attente retour entreprise après analyse MOE"
  | "Devis en cours d'analyse MOE"
  | "Devis validé MOE"
  | "Devis validé entreprise après analyse MOE"
  | "Devis validé MOA"
  | "Annulé";

export type FtmOrigin =
  | "Demande MOA"
  | "Demande MOE"
  | "Demande Entreprise"
  | "Aléas exécution";

/** A quote (devis) attached to an FTM. */
export interface Quote {
  id: string; // `q-${timestamp}`
  quoteIndex: string;
  workPackage: string; // lot number this quote belongs to
  externalCompany: string | null;
  competesWithLot: string | null;
  number: string;
  receiptDate: string; // ISO date
  amount: number;
  delayDays: number;
  fileUrlType: "onedrive" | "local" | string;
  fileUrl: string;
  filePath: string;
  validatedAmount: number | null;
  validatedMoaAmount: number | null;
  validatedMoeDelay: number | null;
  validatedMoaDelay: number | null;
  isAccepted: boolean;
  isRejected?: boolean;
}

/** One signer in an OS signature chain. */
export interface Signer {
  name?: string;
  role?: string;
  date?: string | null;
  [key: string]: unknown;
}

/** Link from an OS to an accepted quote. */
export interface LinkedQuoteDetail {
  quoteId: string;
  quoteNumber: string;
  amount: number | null;
  delay: number | null;
}

/** An Ordre de Service. Lives either inside an FTM (ftm.os[]) or standalone. */
export interface OrdreService {
  id: string; // `os-${timestamp}`
  number: string;
  description: string;
  osFileUrl: string;
  sentToMoexDate: string | null;
  remarks: string;
  signatureChain: Signer[];
  lots: string[]; // recipient lot numbers / external company names
  linkedQuoteDetails: LinkedQuoteDetail[];
}

/** Per-lot impact text + expected return date on an FTM. */
export interface FtmImpact {
  text: string;
  expectedReturnDate: string | null;
}

export interface StatusHistoryEntry {
  status: string;
  date: string | null;
}

/** Fiche de Travaux Modificatifs (the central entity). */
export interface Ftm {
  id: string; // `ftm-${timestamp}`
  type: "FTM" | "TS";
  ftmNumber: string; // e.g. "FTM12"
  fpmNumber: string; // e.g. "FPM7"
  title?: string;
  origin?: FtmOrigin | string;
  status: FtmStatus | string;
  statusDate: string | null;
  statusHistory: StatusHistoryEntry[];
  lots: string[]; // lot numbers concerned
  impacts: Record<string, FtmImpact>; // keyed by lot number
  moeEstimate: number;
  moeValidationDate: string | null;
  moaValidationDate: string | null;
  quotes: Quote[];
  os: OrdreService[];
  exchanges: unknown[];
  // FPM file link fields and other free-form form fields may also be present.
  [key: string]: unknown;
}

/** A monthly financial situation line for a lot. */
export interface SuiviFinancierItem {
  situationNumero: string;
  situationDate: string | null;
  situationMontantHT: number;
  validationStatut: string; // 'Attente MOE' | 'Certificat Généré' | ...
  validationMontantHT: number;
  validationDate: string | null;
  factures?: Array<{ montantHT: number; dateFacture?: string | null; [k: string]: unknown }>;
  [key: string]: unknown;
}

export interface Penalty {
  [key: string]: unknown;
}

export interface Avance {
  [key: string]: unknown;
}

/** A lot = a contractor / work package (titulaire) or an external provider. */
export interface Lot {
  id: string; // `lot-${timestamp}`
  number: string;
  name: string;
  company: string;
  contactEmail: string;
  isExternal: boolean;
  montantMarche: number;
  /** Stored as a decimal fraction, e.g. 5% -> 0.05 */
  tauxRG: number;
  montantCaution: number;
  isArchived: boolean;
  suiviFinancier: SuiviFinancierItem[];
  avance: Avance | null;
  penalites: Penalty[];
  [key: string]: unknown;
}

export interface Personnel {
  id: string; // `p-${timestamp}`
  name: string;
  role: string;
  isArchived: boolean;
}

/** Global per-project financial configuration. */
export interface FinancialConfig {
  submissionStartDay: number;
  submissionEndType: "last" | "fixed";
  submissionEndDay: number;
  validationDeadline: number;
}

export const DEFAULT_FINANCIAL_CONFIG: FinancialConfig = {
  submissionStartDay: 20,
  submissionEndType: "last",
  submissionEndDay: 30,
  validationDeadline: 5,
};

/** Project metadata document. */
export interface Project {
  id: string;
  name: string;
  version: number; // 2
  financialConfig: FinancialConfig;
  createdAt?: string;
}

/** Everything needed to render the board, returned by the bootstrap endpoint. */
export interface ProjectBootstrap {
  project: Project;
  ftms: Ftm[];
  lots: Lot[];
  personnel: Personnel[];
  standaloneOs: OrdreService[];
}
