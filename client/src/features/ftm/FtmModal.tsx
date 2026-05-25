import { useMemo, useState } from "react";
import {
  Info,
  Layers,
  Coins,
  CalendarCheck,
  Save,
  Trash2,
  FileSignature,
} from "lucide-react";
import type { Ftm, FtmImpact, Lot, Quote } from "../../types/models";
import { allStatuses, kanbanColumns } from "../../lib/constants";
import { safeParseFloat } from "../../lib/parse";
import { ftmLabel } from "../../lib/ftmHelpers";
import Modal from "../../components/Modal";
import { Button, TextInput, TextArea, Select, Field } from "../../components/ui";
import QuoteEditor from "./QuoteEditor";

type TabKey = "general" | "impacts" | "quotes" | "tracking";

interface FtmModalProps {
  open: boolean;
  /** The FTM being edited, or null for create mode. */
  ftm: Ftm | null;
  lots: Lot[];
  existingFtms: Ftm[];
  onClose: () => void;
  onSave: (ftm: Ftm) => Promise<void> | void;
  onDelete?: (id: string) => void;
  /** Open the "create OS" flow for this FTM (validated-MOA only). */
  onCreateOs?: (ftm: Ftm) => void;
}

interface FormState {
  docType: "FTM" | "TS";
  ftmNumberInput: string;
  fpmNumberInput: string;
  origin: string;
  label: string;
  justification: string;
  status: string;
  statusDate: string;
  diffusionDate: string;
  moeEstimate: string;
  moeValidationDate: string;
  moaValidationDate: string;
  lots: string[];
  impacts: Record<string, FtmImpact>;
  quotes: Quote[];
}

const isMoeStatus = (s: string) =>
  ["Devis validé MOE", "Devis validé entreprise après analyse MOE"].includes(s);
const isMoaStatus = (s: string) => s === "Devis validé MOA";

function nextFtmNumber(existing: Ftm[], type: string): number {
  const nums = existing
    .filter((f) => f.type === type)
    .map((f) => parseInt((f.ftmNumber || "").replace(type, ""), 10))
    .filter((n) => !isNaN(n));
  return (nums.length > 0 ? Math.max(...nums) : 0) + 1;
}

function buildInitialState(ftm: Ftm | null, existing: Ftm[]): FormState {
  if (ftm) {
    const docType = (ftm.type as "FTM" | "TS") || "FTM";
    return {
      docType,
      ftmNumberInput: (ftm.ftmNumber || "").replace(docType, ""),
      fpmNumberInput: (ftm.fpmNumber || "").replace("FPM", ""),
      origin: (ftm.origin as string) || "",
      label: ftmLabel(ftm) === "Sans libellé" ? "" : ftmLabel(ftm),
      justification: (ftm.justification as string) || "",
      status: ftm.status,
      statusDate: ftm.statusDate || "",
      diffusionDate: (ftm.diffusionDate as string) || "",
      moeEstimate: ftm.moeEstimate ? String(ftm.moeEstimate) : "",
      moeValidationDate: ftm.moeValidationDate || "",
      moaValidationDate: ftm.moaValidationDate || "",
      lots: ftm.lots || [],
      impacts: ftm.impacts || {},
      quotes: JSON.parse(JSON.stringify(ftm.quotes || [])),
    };
  }
  const type = "FTM";
  return {
    docType: type,
    ftmNumberInput: String(nextFtmNumber(existing, type)),
    fpmNumberInput: "",
    origin: "",
    label: "",
    justification: "",
    status: kanbanColumns[0].status || allStatuses[0],
    statusDate: new Date().toISOString().split("T")[0],
    diffusionDate: "",
    moeEstimate: "",
    moeValidationDate: "",
    moaValidationDate: "",
    lots: [],
    impacts: {},
    quotes: [],
  };
}

export default function FtmModal({
  open,
  ftm,
  lots,
  existingFtms,
  onClose,
  onSave,
  onDelete,
  onCreateOs,
}: FtmModalProps) {
  const [tab, setTab] = useState<TabKey>("general");
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(ftm, existingFtms),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state whenever the modal is (re)opened for a different FTM.
  const editKey = ftm?.id ?? "new";
  const [lastKey, setLastKey] = useState(editKey);
  if (open && lastKey !== editKey) {
    setLastKey(editKey);
    setForm(buildInitialState(ftm, existingFtms));
    setTab("general");
    setError(null);
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const activeLots = useMemo(
    () => lots.filter((l) => !l.isArchived),
    [lots],
  );

  const toggleLot = (lotNumber: string) => {
    setForm((f) => {
      const has = f.lots.includes(lotNumber);
      const nextLots = has
        ? f.lots.filter((n) => n !== lotNumber)
        : [...f.lots, lotNumber];
      return { ...f, lots: nextLots };
    });
  };

  const setImpact = (lotNumber: string, patch: Partial<FtmImpact>) => {
    setForm((f) => ({
      ...f,
      impacts: {
        ...f.impacts,
        [lotNumber]: {
          text: f.impacts[lotNumber]?.text || "",
          expectedReturnDate: f.impacts[lotNumber]?.expectedReturnDate || null,
          ...patch,
        },
      },
    }));
  };

  const handleSave = async () => {
    setError(null);
    if (!form.ftmNumberInput.trim()) {
      setError("Le numéro est obligatoire.");
      setTab("general");
      return;
    }
    if (!form.label.trim()) {
      setError("Le libellé de la modification est obligatoire.");
      setTab("general");
      return;
    }

    // Status auto-date logic (legacy handleFtmFormSubmit).
    let statusDate: string | null = form.statusDate || null;
    if (isMoaStatus(form.status)) statusDate = form.moaValidationDate || null;
    else if (isMoeStatus(form.status))
      statusDate = form.moeValidationDate || null;

    // Only keep impacts that have content.
    const impacts: Record<string, FtmImpact> = {};
    for (const lotNumber of form.lots) {
      const imp = form.impacts[lotNumber];
      if (imp && (imp.text || imp.expectedReturnDate)) {
        impacts[lotNumber] = {
          text: imp.text || "",
          expectedReturnDate: imp.expectedReturnDate || null,
        };
      }
    }

    const base = {
      type: form.docType,
      ftmNumber: form.docType + form.ftmNumberInput,
      fpmNumber: "FPM" + form.fpmNumberInput,
      title: form.label,
      label: form.label,
      justification: form.justification,
      origin: form.origin,
      diffusionDate: form.diffusionDate || null,
      moeEstimate: safeParseFloat(form.moeEstimate),
      moeValidationDate: form.moeValidationDate || null,
      moaValidationDate: form.moaValidationDate || null,
      lots: form.lots,
      impacts,
      quotes: form.quotes,
      status: form.status,
      statusDate,
    };

    let finalObject: Ftm;
    if (ftm) {
      // Edit: merge over existing, keep os/exchanges/history.
      const history = ftm.statusHistory ? [...ftm.statusHistory] : [];
      if (ftm.status !== form.status) {
        history.push({ status: form.status, date: statusDate });
      }
      finalObject = {
        ...ftm,
        ...base,
        os: ftm.os || [],
        statusHistory: history,
      } as Ftm;
    } else {
      finalObject = {
        ...base,
        id: `ftm-${Date.now()}`,
        exchanges: [],
        os: [],
        statusHistory: [{ status: form.status, date: statusDate }],
      } as Ftm;
    }

    setSaving(true);
    try {
      await onSave(finalObject);
      onClose();
    } catch {
      setError("Échec de l'enregistrement. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof Info }[] = [
    { key: "general", label: "Général", icon: Info },
    { key: "impacts", label: "Lots & Impacts", icon: Layers },
    { key: "quotes", label: "Devis & Chiffrage", icon: Coins },
    { key: "tracking", label: "Suivi & Validation", icon: CalendarCheck },
  ];

  const headerTitle = ftm
    ? ftm.ftmNumber
    : `${form.docType}-${form.ftmNumberInput || "?"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="max-w-6xl"
      tall
      title={<span className="font-mono">{headerTitle}</span>}
      subtitle={ftm ? ftmLabel(ftm) : "Nouvelle Fiche de Travaux"}
      footer={
        <>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            {ftm && ftm.status === "Devis validé MOA" && onCreateOs && (
              <Button
                variant="blue"
                onClick={() => {
                  onCreateOs(ftm);
                  onClose();
                }}
              >
                <FileSignature className="h-4 w-4" /> Créer un OS
              </Button>
            )}
            {ftm && onDelete && (
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm("Supprimer définitivement cette FTM ?")) {
                    onDelete(ftm.id);
                    onClose();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      {/* Tabs */}
      <div className="sticky top-0 z-10 flex-none border-b border-gray-200 bg-gray-50/80 px-6 backdrop-blur">
        <nav className="flex space-x-8">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-indigo-500"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* GENERAL */}
      {tab === "general" && (
        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 border-b pb-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              Identification
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Field label="Type de Document">
                  <div className="flex gap-4">
                    {(["FTM", "TS"] as const).map((t) => (
                      <label
                        key={t}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 hover:border-indigo-300"
                      >
                        <input
                          type="radio"
                          name="docType"
                          checked={form.docType === t}
                          onChange={() => {
                            // Recompute auto number when switching type (create only).
                            if (!ftm) {
                              set("ftmNumberInput", String(
                                nextFtmNumber(existingFtms, t),
                              ));
                            }
                            set("docType", t);
                          }}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium">{t}</span>
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Numéro">
                  <div className="flex rounded-md shadow-sm">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-100 px-3 text-sm font-bold text-gray-500">
                      {form.docType}
                    </span>
                    <input
                      type="text"
                      required
                      value={form.ftmNumberInput}
                      onChange={(e) => set("ftmNumberInput", e.target.value)}
                      className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </Field>
                <Field label="Origine de la demande">
                  <Select
                    value={form.origin}
                    onChange={(e) => set("origin", e.target.value)}
                  >
                    <option value="">Sélectionner l'origine…</option>
                    <option value="Demande MOA">
                      Demande MOA (Maître d'Ouvrage)
                    </option>
                    <option value="Demande MOE">
                      Demande MOE (Architecte/BET)
                    </option>
                    <option value="Demande Entreprise">
                      Demande Entreprise
                    </option>
                    <option value="Aléas exécution">
                      Aléas / Imprévu chantier
                    </option>
                  </Select>
                </Field>
              </div>
              <div className="space-y-4">
                <Field label="Origine (N° FPM)">
                  <div className="flex rounded-md shadow-sm">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-100 px-3 text-sm text-gray-500">
                      FPM
                    </span>
                    <input
                      type="text"
                      value={form.fpmNumberInput}
                      onChange={(e) => set("fpmNumberInput", e.target.value)}
                      className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </Field>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 border-b pb-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              Contenu
            </h3>
            <div className="space-y-4">
              <Field label="Libellé de la modification">
                <TextInput
                  required
                  value={form.label}
                  onChange={(e) => set("label", e.target.value)}
                  placeholder="Ex: Ajout de prises électriques R+1"
                  className="font-semibold"
                />
              </Field>
              <Field label="Justification / Contexte">
                <TextArea
                  rows={4}
                  value={form.justification}
                  onChange={(e) => set("justification", e.target.value)}
                  placeholder="Expliquez pourquoi cette modification est nécessaire…"
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* IMPACTS */}
      {tab === "impacts" && (
        <div className="grid h-full grid-cols-1 gap-6 p-6 lg:grid-cols-3">
          <div className="flex flex-col lg:col-span-1">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              1. Sélectionner les lots
            </h3>
            <div className="custom-scrollbar flex-grow overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              {activeLots.length === 0 ? (
                <p className="p-2 text-sm text-gray-400">
                  Aucun lot. Créez-en via « Gérer les Lots ».
                </p>
              ) : (
                activeLots.map((lot) => (
                  <label
                    key={lot.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.lots.includes(lot.number)}
                      onChange={() => toggleLot(lot.number)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">
                      <span className="font-semibold">{lot.number}</span> -{" "}
                      {lot.company}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-col lg:col-span-2">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              2. Saisir les impacts & Délais
            </h3>
            <div className="custom-scrollbar h-full space-y-4 overflow-y-auto pr-2">
              {form.lots.length === 0 ? (
                <p className="mt-10 text-center text-gray-500">
                  Sélectionnez des lots à gauche pour définir les impacts.
                </p>
              ) : (
                form.lots.map((lotNumber) => {
                  const lot = lots.find((l) => l.number === lotNumber);
                  const imp = form.impacts[lotNumber];
                  return (
                    <div
                      key={lotNumber}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-2 font-semibold text-gray-700">
                        {lotNumber}
                        {lot ? ` - ${lot.company}` : ""}
                      </div>
                      <Field label="Impact / Description des travaux">
                        <TextArea
                          rows={2}
                          value={imp?.text || ""}
                          onChange={(e) =>
                            setImpact(lotNumber, { text: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Date de retour attendue" className="mt-3">
                        <TextInput
                          type="date"
                          value={imp?.expectedReturnDate || ""}
                          onChange={(e) =>
                            setImpact(lotNumber, {
                              expectedReturnDate: e.target.value || null,
                            })
                          }
                        />
                      </Field>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUOTES */}
      {tab === "quotes" && (
        <div className="flex h-full flex-col p-6">
          <QuoteEditor
            quotes={form.quotes}
            lots={lots}
            onChange={(q) => set("quotes", q)}
          />
        </div>
      )}

      {/* TRACKING */}
      {tab === "tracking" && (
        <div className="space-y-8 p-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 border-b pb-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              Workflow de Validation
            </h3>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <Field label="Statut Actuel">
                <Select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="font-semibold"
                >
                  {allStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date du statut">
                <TextInput
                  type="date"
                  value={form.statusDate}
                  onChange={(e) => set("statusDate", e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900">
              Dates Clés
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Diffusion FTM">
                <TextInput
                  type="date"
                  value={form.diffusionDate}
                  onChange={(e) => set("diffusionDate", e.target.value)}
                />
              </Field>
              {(isMoeStatus(form.status) || isMoaStatus(form.status)) && (
                <Field label={<span className="text-green-600">Validation MOE</span>}>
                  <TextInput
                    type="date"
                    value={form.moeValidationDate}
                    onChange={(e) => set("moeValidationDate", e.target.value)}
                  />
                </Field>
              )}
              {isMoaStatus(form.status) && (
                <Field
                  label={<span className="text-purple-600">Validation MOA</span>}
                >
                  <TextInput
                    type="date"
                    value={form.moaValidationDate}
                    onChange={(e) => set("moaValidationDate", e.target.value)}
                  />
                </Field>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-amber-900">
              Estimation Initiale
            </h3>
            <Field label={<span className="text-amber-800">Estimation MOE (€ HT)</span>}>
              <TextInput
                inputMode="decimal"
                value={form.moeEstimate}
                onChange={(e) => set("moeEstimate", e.target.value)}
                placeholder="0,00"
                className="text-right font-mono font-bold text-amber-700"
              />
            </Field>
            <p className="mt-2 text-xs text-amber-600">
              Valeur de référence pour le prévisionnel si aucun devis n'est
              encore validé.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
