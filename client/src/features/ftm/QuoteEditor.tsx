import { useMemo, useState } from "react";
import {
  PlusCircle,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  CopyPlus,
  ClipboardList,
  Building2,
  User,
  Clock,
  Link as LinkIcon,
} from "lucide-react";
import type { Lot, Quote } from "../../types/models";
import { safeParseFloat, formatCurrency, formatDateFr } from "../../lib/parse";
import { Button, TextInput, Select } from "../../components/ui";

interface QuoteEditorProps {
  quotes: Quote[];
  lots: Lot[];
  onChange: (quotes: Quote[]) => void;
}

interface DraftQuote {
  id: string | null;
  quoteIndex: string;
  workPackageInput: string; // "number - name (company)"
  competesWithLot: string;
  amount: string;
  number: string;
  receiptDate: string;
  delayDays: string;
}

const emptyDraft = (): DraftQuote => ({
  id: null,
  quoteIndex: "A",
  workPackageInput: "",
  competesWithLot: "",
  amount: "",
  number: "",
  receiptDate: "",
  delayDays: "",
});

const lotOptionLabel = (l: Lot) => `${l.number} - ${l.name} (${l.company})`;

/**
 * Devis sub-editor for the FTM modal. Mirrors legacy handleAddOrUpdateQuote /
 * renderFormQuotes / handleNewIndex. Quotes are managed in the parent's state
 * and persisted with the FTM on save.
 */
export default function QuoteEditor({ quotes, lots, onChange }: QuoteEditorProps) {
  const [draft, setDraft] = useState<DraftQuote>(emptyDraft());
  const [formOpen, setFormOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const titulaireLots = useMemo(
    () => lots.filter((l) => !l.isExternal && !l.isArchived),
    [lots],
  );

  const selectedLot = useMemo(
    () => lots.find((l) => lotOptionLabel(l) === draft.workPackageInput.trim()),
    [lots, draft.workPackageInput],
  );

  const set = (patch: Partial<DraftQuote>) => setDraft((d) => ({ ...d, ...patch }));

  const resetForm = () => {
    setDraft(emptyDraft());
    setErr(null);
  };

  const handleAddOrUpdate = () => {
    setErr(null);
    const wp = draft.workPackageInput.trim();
    if (!wp) {
      setErr("Veuillez sélectionner une entreprise dans la liste.");
      return;
    }
    const lot = lots.find((l) => lotOptionLabel(l) === wp);
    if (!lot) {
      setErr("Entreprise non reconnue. Sélectionnez-en une dans la liste.");
      return;
    }
    let competesWithLotValue: string | null = null;
    if (lot.isExternal) {
      competesWithLotValue = draft.competesWithLot;
      if (!competesWithLotValue) {
        setErr(
          "Pour un prestataire externe, indiquez avec quel lot il est en concurrence.",
        );
        return;
      }
    }
    if (!draft.receiptDate) {
      setErr("Veuillez renseigner la date de réception.");
      return;
    }

    const quoteData: Quote = {
      id: draft.id || `q-${Date.now()}`,
      quoteIndex: draft.quoteIndex,
      workPackage: lot.number,
      externalCompany: null,
      competesWithLot: competesWithLotValue,
      number: draft.number,
      receiptDate: draft.receiptDate,
      amount: safeParseFloat(draft.amount),
      delayDays: parseInt(draft.delayDays, 10) || 0,
      fileUrlType: "onedrive",
      fileUrl: "",
      filePath: "",
      validatedAmount: null,
      validatedMoaAmount: null,
      validatedMoeDelay: null,
      validatedMoaDelay: null,
      isAccepted: false,
    };

    // Preserve existing validation fields when editing.
    if (draft.id) {
      const existing = quotes.find((q) => q.id === draft.id);
      if (existing) {
        quoteData.validatedAmount = existing.validatedAmount;
        quoteData.validatedMoaAmount = existing.validatedMoaAmount;
        quoteData.validatedMoeDelay = existing.validatedMoeDelay;
        quoteData.validatedMoaDelay = existing.validatedMoaDelay;
        quoteData.isAccepted = existing.isAccepted;
        quoteData.isRejected = existing.isRejected;
      }
      onChange(quotes.map((q) => (q.id === draft.id ? quoteData : q)));
    } else {
      onChange([...quotes, quoteData]);
    }
    resetForm();
  };

  const startEdit = (q: Quote) => {
    const lot = lots.find((l) => l.number === q.workPackage);
    setDraft({
      id: q.id,
      quoteIndex: q.quoteIndex,
      workPackageInput: lot ? lotOptionLabel(lot) : q.workPackage,
      competesWithLot: q.competesWithLot || "",
      amount: q.amount ? String(q.amount) : "",
      number: q.number,
      receiptDate: q.receiptDate || "",
      delayDays: q.delayDays ? String(q.delayDays) : "",
    });
    setFormOpen(true);
  };

  /** New index: clone latest into a fresh draft with incremented letter. */
  const startNewIndex = (q: Quote) => {
    const lot = lots.find((l) => l.number === q.workPackage);
    const nextIndex = String.fromCharCode(
      (q.quoteIndex.charCodeAt(0) || 64) + 1,
    );
    setDraft({
      id: null,
      quoteIndex: nextIndex,
      workPackageInput: lot ? lotOptionLabel(lot) : q.workPackage,
      competesWithLot: q.competesWithLot || "",
      amount: "",
      number: "",
      receiptDate: "",
      delayDays: "",
    });
    setFormOpen(true);
  };

  const removeQuote = (id: string) => {
    if (!window.confirm("Supprimer ce devis ?")) return;
    onChange(quotes.filter((q) => q.id !== id));
  };

  // Group by bidder for display.
  const grouped = useMemo(() => {
    const g: Record<string, Quote[]> = {};
    for (const q of quotes) {
      const key = q.workPackage || q.externalCompany || "Inconnu";
      (g[key] ||= []).push(q);
    }
    for (const k of Object.keys(g)) {
      g[k].sort((a, b) => b.quoteIndex.localeCompare(a.quoteIndex));
    }
    return g;
  }, [quotes]);

  return (
    <div className="flex h-full flex-col">
      {/* Add/Edit panel */}
      <div className="mb-6 flex-none rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setFormOpen((o) => !o)}
        >
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-800">
            <PlusCircle className="h-5 w-5" /> Ajouter / Modifier un devis
          </h3>
          <ChevronDown
            className={`h-5 w-5 text-indigo-500 transition-transform ${
              formOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {formOpen && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-indigo-200 pt-4 md:grid-cols-12">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-indigo-700">
                Indice
              </label>
              <TextInput
                value={draft.quoteIndex}
                onChange={(e) => set({ quoteIndex: e.target.value })}
                className="text-center font-bold"
              />
            </div>
            <div className="md:col-span-5">
              <label className="mb-1 block text-xs font-medium text-indigo-700">
                Entreprise / Lot
              </label>
              <input
                list="quote-wp-list"
                placeholder="Rechercher…"
                value={draft.workPackageInput}
                onChange={(e) => set({ workPackageInput: e.target.value })}
                className="block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <datalist id="quote-wp-list">
                {lots
                  .filter((l) => !l.isArchived)
                  .map((l) => (
                    <option key={l.id} value={lotOptionLabel(l)} />
                  ))}
              </datalist>
            </div>
            {selectedLot?.isExternal && (
              <div className="md:col-span-5">
                <label className="mb-1 block text-xs font-medium text-indigo-700">
                  Concurrence avec
                </label>
                <Select
                  value={draft.competesWithLot}
                  onChange={(e) => set({ competesWithLot: e.target.value })}
                >
                  <option value="">Sélectionner un lot…</option>
                  {titulaireLots.map((l) => (
                    <option key={l.id} value={l.number}>
                      {lotOptionLabel(l)}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-indigo-700">
                Montant HT
              </label>
              <TextInput
                inputMode="decimal"
                placeholder="0,00"
                value={draft.amount}
                onChange={(e) => set({ amount: e.target.value })}
                className="text-right font-bold"
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-indigo-700">
                N° Devis
              </label>
              <TextInput
                placeholder="REF-123"
                value={draft.number}
                onChange={(e) => set({ number: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-indigo-700">
                Date Récep.
              </label>
              <TextInput
                type="date"
                value={draft.receiptDate}
                onChange={(e) => set({ receiptDate: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-indigo-700">
                Délai (j)
              </label>
              <TextInput
                type="number"
                placeholder="0"
                value={draft.delayDays}
                onChange={(e) => set({ delayDays: e.target.value })}
              />
            </div>

            {err && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 md:col-span-12">
                {err}
              </div>
            )}

            <div className="mt-2 flex justify-end gap-3 md:col-span-12">
              {draft.id && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Annuler
                </Button>
              )}
              <Button type="button" onClick={handleAddOrUpdate}>
                <Plus className="h-4 w-4" />
                {draft.id ? "Mettre à jour" : "Ajouter le devis"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quotes list */}
      <div className="custom-scrollbar flex-grow space-y-6 overflow-y-auto pb-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-10 text-gray-400">
            <ClipboardList className="mb-2 h-12 w-12 opacity-50" />
            <p className="text-sm font-medium">Aucun devis pour le moment.</p>
            <p className="text-xs">Utilisez le formulaire ci-dessus.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupKey, qs]) => {
            const lot = lots.find((l) => l.number === groupKey);
            const groupTitle = lot
              ? `Lot ${lot.number} - ${lot.company} (${lot.name})`
              : qs[0].externalCompany
                ? `Prestataire : ${qs[0].externalCompany}`
                : groupKey;
            return (
              <div key={groupKey}>
                <div className="mb-3 flex items-center gap-2 px-1">
                  <div className="rounded bg-indigo-50 p-1.5 text-indigo-600">
                    {lot ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-gray-700">{groupTitle}</h4>
                </div>
                <div className="space-y-2">
                  {qs.map((q, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div
                        key={q.id}
                        className={`group flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-all hover:shadow-md ${
                          isLatest
                            ? "border-l-4 border-l-indigo-500 bg-white shadow-sm"
                            : "bg-gray-50 opacity-75"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-gray-100 text-sm font-bold text-gray-600">
                            {q.quoteIndex}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800">
                                {q.number || "Sans N°"}
                              </span>
                              <span className="text-xs text-gray-500">
                                • {formatDateFr(q.receiptDate)}
                              </span>
                              {q.delayDays ? (
                                <span className="flex items-center gap-1 rounded border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-xs text-orange-700">
                                  <Clock className="h-3 w-3" /> {q.delayDays}j
                                </span>
                              ) : null}
                            </div>
                            {q.fileUrl && (
                              <a
                                href={q.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600"
                              >
                                <LinkIcon className="h-3 w-3" /> Voir le fichier
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div
                              className={`font-bold ${
                                q.amount < 0 ? "text-red-600" : "text-gray-900"
                              }`}
                            >
                              {formatCurrency(q.amount)}
                            </div>
                            <div className="text-[10px] uppercase tracking-wide text-gray-400">
                              Montant HT
                            </div>
                          </div>
                          {isLatest && (
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                title="Nouvel Indice"
                                onClick={() => startNewIndex(q)}
                                className="rounded-full p-2 text-green-600 hover:bg-green-50"
                              >
                                <CopyPlus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Modifier"
                                onClick={() => startEdit(q)}
                                className="rounded-full p-2 text-blue-600 hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Supprimer"
                                onClick={() => removeQuote(q.id)}
                                className="rounded-full p-2 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
