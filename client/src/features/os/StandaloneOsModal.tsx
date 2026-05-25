import { useMemo, useState } from "react";
import { FileSignature, Save, Plus, Trash2 } from "lucide-react";
import type { Lot, OrdreService, Signer } from "../../types/models";
import { safeParseFloat } from "../../lib/parse";
import Modal from "../../components/Modal";
import { Button, TextInput, TextArea, Field } from "../../components/ui";

interface StandaloneOsModalProps {
  open: boolean;
  os: OrdreService | null;
  lots: Lot[];
  existingOs: OrdreService[];
  onClose: () => void;
  onSave: (os: OrdreService) => Promise<void> | void;
}

interface OsForm {
  id: string | null;
  number: string;
  label: string;
  description: string;
  amount: string;
  delayDays: string;
  sentToMoexDate: string;
  lots: string[];
  signatureChain: Signer[];
}

function buildInitial(os: OrdreService | null, existing: OrdreService[]): OsForm {
  if (os) {
    return {
      id: os.id,
      number: os.number,
      label: os.label || "",
      description: os.description || "",
      amount: os.amount != null ? String(os.amount) : "",
      delayDays: os.delayDays != null ? String(os.delayDays) : "",
      sentToMoexDate: os.sentToMoexDate || "",
      lots: os.lots || [],
      signatureChain: os.signatureChain || [],
    };
  }
  const year = new Date().getFullYear();
  const nums = existing
    .filter((o) => o.number?.startsWith(`OS-${year}`))
    .map((o) => parseInt(o.number.split("-")[2], 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  const suffix = Date.now().toString().slice(-4);
  return {
    id: null,
    number: `OS-${year}-${(max + 1).toString().padStart(3, "0")}-${suffix}`,
    label: "",
    description: "",
    amount: "",
    delayDays: "",
    sentToMoexDate: "",
    lots: [],
    signatureChain: [],
  };
}

export default function StandaloneOsModal({
  open,
  os,
  lots,
  existingOs,
  onClose,
  onSave,
}: StandaloneOsModalProps) {
  const [form, setForm] = useState<OsForm>(() => buildInitial(os, existingOs));
  const [saving, setSaving] = useState(false);

  const editKey = os?.id ?? "new";
  const [lastKey, setLastKey] = useState(editKey);
  if (open && lastKey !== editKey) {
    setLastKey(editKey);
    setForm(buildInitial(os, existingOs));
  }

  const set = <K extends keyof OsForm>(k: K, v: OsForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const activeLots = useMemo(() => lots.filter((l) => !l.isArchived), [lots]);

  const toggleLot = (n: string) =>
    setForm((f) => ({
      ...f,
      lots: f.lots.includes(n) ? f.lots.filter((x) => x !== n) : [...f.lots, n],
    }));

  const addSigner = () =>
    setForm((f) => ({
      ...f,
      signatureChain: [...f.signatureChain, { name: "", role: "", date: null }],
    }));

  const updateSigner = (idx: number, patch: Partial<Signer>) =>
    setForm((f) => ({
      ...f,
      signatureChain: f.signatureChain.map((s, i) =>
        i === idx ? { ...s, ...patch } : s,
      ),
    }));

  const removeSigner = (idx: number) =>
    setForm((f) => ({
      ...f,
      signatureChain: f.signatureChain.filter((_, i) => i !== idx),
    }));

  const handleSave = async () => {
    const final: OrdreService = {
      id: form.id || `os-standalone-${Date.now()}`,
      number: form.number,
      description: form.description,
      osFileUrl: os?.osFileUrl || "",
      sentToMoexDate: form.sentToMoexDate || null,
      remarks: os?.remarks || "",
      signatureChain: form.signatureChain,
      lots: form.lots,
      linkedQuoteDetails: os?.linkedQuoteDetails || [],
      label: form.label,
      amount: safeParseFloat(form.amount),
      delayDays: parseInt(form.delayDays, 10) || 0,
    };

    setSaving(true);
    try {
      await onSave(final);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="max-w-3xl"
      icon={<FileSignature className="h-6 w-6 text-blue-600" />}
      title={os ? "Modifier l'OS" : "Créer un OS indépendant"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="blue" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Numéro d'OS">
            <TextInput
              value={form.number}
              onChange={(e) => set("number", e.target.value)}
            />
          </Field>
          <Field label="Libellé">
            <TextInput
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Objet de l'OS"
            />
          </Field>
          <Field label="Montant (€ HT)">
            <TextInput
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0,00"
              className="text-right"
            />
          </Field>
          <Field label="Délai (jours)">
            <TextInput
              type="number"
              value={form.delayDays}
              onChange={(e) => set("delayDays", e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="Description">
          <TextArea
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <Field label="Date d'envoi MOEX">
          <TextInput
            type="date"
            value={form.sentToMoexDate}
            onChange={(e) => set("sentToMoexDate", e.target.value)}
          />
        </Field>

        <Field label="Destinataires (lots)">
          {activeLots.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun lot disponible.</p>
          ) : (
            <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
              {activeLots.map((l) => (
                <label
                  key={l.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={form.lots.includes(l.number)}
                    onChange={() => toggleLot(l.number)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">
                    {l.number} - {l.company}
                  </span>
                </label>
              ))}
            </div>
          )}
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Circuit de signature
            </label>
            <Button variant="secondary" onClick={addSigner} className="px-2 py-1">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </Button>
          </div>
          <div className="space-y-2">
            {form.signatureChain.length === 0 ? (
              <p className="text-xs text-gray-400">Aucun signataire.</p>
            ) : (
              form.signatureChain.map((s, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white p-2 sm:grid-cols-12"
                >
                  <TextInput
                    placeholder="Nom"
                    value={s.name || ""}
                    onChange={(e) => updateSigner(i, { name: e.target.value })}
                    className="sm:col-span-4"
                  />
                  <TextInput
                    placeholder="Rôle"
                    value={s.role || ""}
                    onChange={(e) => updateSigner(i, { role: e.target.value })}
                    className="sm:col-span-4"
                  />
                  <TextInput
                    type="date"
                    value={s.date || ""}
                    onChange={(e) =>
                      updateSigner(i, { date: e.target.value || null })
                    }
                    className="sm:col-span-3"
                  />
                  <button
                    type="button"
                    onClick={() => removeSigner(i)}
                    className="flex items-center justify-center rounded-lg p-1.5 text-red-600 hover:bg-red-50 sm:col-span-1"
                    title="Retirer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
