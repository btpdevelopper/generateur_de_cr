import { useMemo, useState } from "react";
import {
  Building2,
  Briefcase,
  Edit,
  Archive,
  ArchiveRestore,
  Mail,
  Plus,
} from "lucide-react";
import type { Lot } from "../../types/models";
import { safeParseFloat, formatCurrency } from "../../lib/parse";
import Modal from "../../components/Modal";
import { Button, TextInput, Field } from "../../components/ui";

interface LotsModalProps {
  open: boolean;
  lots: Lot[];
  onClose: () => void;
  onSave: (lot: Lot) => Promise<void> | void;
}

interface LotForm {
  id: string | null;
  type: "titulaire" | "externe";
  number: string;
  name: string;
  company: string;
  contactEmail: string;
  montantMarche: string;
  tauxRG: string; // displayed as percent (e.g. "5")
  montantCaution: string;
}

const emptyForm = (): LotForm => ({
  id: null,
  type: "titulaire",
  number: "",
  name: "",
  company: "",
  contactEmail: "",
  montantMarche: "",
  tauxRG: "",
  montantCaution: "",
});

export default function LotsModal({
  open,
  lots,
  onClose,
  onSave,
}: LotsModalProps) {
  const [form, setForm] = useState<LotForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof LotForm>(k: K, v: LotForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const sorted = useMemo(
    () =>
      [...lots].sort((a, b) => {
        if (a.isExternal === b.isExternal) return a.number.localeCompare(b.number);
        return a.isExternal ? 1 : -1;
      }),
    [lots],
  );

  const isExternal = form.type === "externe";

  const startEdit = (lot: Lot) => {
    setForm({
      id: lot.id,
      type: lot.isExternal ? "externe" : "titulaire",
      number: lot.number,
      name: lot.name,
      company: lot.company,
      contactEmail: lot.contactEmail || "",
      montantMarche: lot.montantMarche ? String(lot.montantMarche) : "",
      tauxRG: lot.tauxRG ? String((lot.tauxRG || 0) * 100) : "",
      montantCaution: lot.montantCaution ? String(lot.montantCaution) : "",
    });
  };

  const persist = async (lot: Lot) => {
    setSaving(true);
    try {
      await onSave(lot);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const ext = isExternal;
    let number = form.number;
    // Auto-number externals (legacy EXT-NN).
    if (ext && (!form.id || number === "(Généré auto)" || !number)) {
      const count = lots.filter((l) => l.isExternal).length;
      number = `EXT-${(count + 1).toString().padStart(2, "0")}`;
    }
    const montantMarche = ext ? 0 : safeParseFloat(form.montantMarche);
    const tauxRGpct = ext ? 0 : safeParseFloat(form.tauxRG);
    const montantCaution = ext ? 0 : safeParseFloat(form.montantCaution);

    const formData = {
      number,
      name: form.name,
      company: form.company,
      contactEmail: form.contactEmail,
      isExternal: ext,
      montantMarche,
      tauxRG: isNaN(tauxRGpct) ? 0 : tauxRGpct / 100,
      montantCaution,
    };

    let finalLot: Lot;
    if (form.id) {
      const existing = lots.find((l) => l.id === form.id);
      finalLot = { ...(existing as Lot), ...formData } as Lot;
    } else {
      finalLot = {
        id: `lot-${Date.now()}`,
        isArchived: false,
        suiviFinancier: [],
        avance: null,
        penalites: [],
        ...formData,
      } as Lot;
    }
    await persist(finalLot);
    setForm(emptyForm());
  };

  const toggleArchive = async (lot: Lot) => {
    await persist({ ...lot, isArchived: !lot.isArchived });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="max-w-4xl"
      icon={<Building2 className="h-6 w-6 text-indigo-600" />}
      title="Gérer les Lots & Prestataires"
    >
      <div className="space-y-6 p-6">
        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900">
            {form.id ? "Modifier" : "Ajouter"} un lot
          </h3>

          <Field label="Type" className="mb-4">
            <div className="flex gap-4">
              {(
                [
                  ["titulaire", "Titulaire (marché)"],
                  ["externe", "Prestataire externe"],
                ] as const
              ).map(([val, lbl]) => (
                <label
                  key={val}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 hover:border-indigo-300"
                >
                  <input
                    type="radio"
                    name="lot-type"
                    checked={form.type === val}
                    onChange={() => set("type", val)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium">{lbl}</span>
                </label>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {!isExternal && (
              <Field label="Numéro de lot">
                <TextInput
                  value={form.number}
                  onChange={(e) => set("number", e.target.value)}
                  placeholder="Ex: 01.1"
                />
              </Field>
            )}
            <Field label="Entreprise">
              <TextInput
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Nom de l'entreprise"
              />
            </Field>
            <Field label="Désignation / Corps d'état">
              <TextInput
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex: Électricité"
              />
            </Field>
            <Field label="E-mail de contact">
              <TextInput
                type="text"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                placeholder="contact@entreprise.fr ; autre@…"
              />
            </Field>

            {!isExternal && (
              <>
                <Field label="Montant Marché (€ HT)">
                  <TextInput
                    inputMode="decimal"
                    value={form.montantMarche}
                    onChange={(e) => set("montantMarche", e.target.value)}
                    placeholder="0,00"
                    className="text-right"
                  />
                </Field>
                <Field label="Taux RG (%)">
                  <TextInput
                    inputMode="decimal"
                    value={form.tauxRG}
                    onChange={(e) => set("tauxRG", e.target.value)}
                    placeholder="5"
                    className="text-right"
                  />
                </Field>
                <Field label="Montant Caution (€)">
                  <TextInput
                    inputMode="decimal"
                    value={form.montantCaution}
                    onChange={(e) => set("montantCaution", e.target.value)}
                    placeholder="0,00"
                    className="text-right"
                  />
                </Field>
              </>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            {form.id && (
              <Button variant="ghost" onClick={() => setForm(emptyForm())}>
                Annuler la modification
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={saving || (!form.company && !form.name)}
            >
              <Plus className="h-4 w-4" />
              {form.id ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {sorted.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Aucun lot pour le moment.
            </p>
          ) : (
            sorted.map((lot) => {
              const isExt = lot.isExternal;
              return (
                <div
                  key={lot.id}
                  className={`grid grid-cols-1 items-center gap-4 rounded-lg border p-3 md:grid-cols-6 ${
                    isExt
                      ? "border-amber-200 bg-amber-50"
                      : "border-indigo-100 bg-white"
                  } ${lot.isArchived ? "opacity-60 grayscale" : ""}`}
                >
                  <div className="flex items-center gap-2 md:col-span-1">
                    <div className="rounded-full border border-gray-100 bg-white p-2 shadow-sm">
                      {isExt ? (
                        <Briefcase className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Building2 className="h-4 w-4 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">
                        {lot.number}
                      </div>
                      <div
                        className={`text-[10px] font-semibold uppercase ${
                          isExt ? "text-amber-600" : "text-indigo-600"
                        }`}
                      >
                        {isExt ? "Prestataire" : "Titulaire"}
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="font-semibold text-gray-700">
                      {lot.company}
                    </div>
                    <div className="text-xs text-gray-500">{lot.name}</div>
                  </div>
                  <div className="truncate text-xs text-gray-500 md:col-span-1">
                    {lot.contactEmail ? (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lot.contactEmail}
                      </span>
                    ) : (
                      "Pas d'email"
                    )}
                  </div>
                  <div className="text-right text-sm font-medium text-gray-600 md:col-span-1">
                    {isExt ? (
                      <span className="text-xs italic text-gray-400">
                        Hors Marché
                      </span>
                    ) : (
                      formatCurrency(lot.montantMarche || 0)
                    )}
                  </div>
                  <div className="flex justify-end gap-1 md:col-span-1">
                    {lot.isArchived ? (
                      <button
                        type="button"
                        title="Désarchiver"
                        onClick={() => toggleArchive(lot)}
                        className="rounded-lg p-1.5 text-green-600 hover:bg-green-100"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          title="Modifier"
                          onClick={() => startEdit(lot)}
                          className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-100"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Archiver"
                          onClick={() => toggleArchive(lot)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-100"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
