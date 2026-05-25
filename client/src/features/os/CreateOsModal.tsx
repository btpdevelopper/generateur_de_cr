import { useMemo, useState } from "react";
import { FileSignature, Save } from "lucide-react";
import type { Ftm, Lot, OrdreService } from "../../types/models";
import { getLatestQuotes } from "../../lib/ftmHelpers";
import Modal from "../../components/Modal";
import { Button, TextInput, TextArea, Field } from "../../components/ui";

interface CreateOsModalProps {
  open: boolean;
  ftm: Ftm | null;
  lots: Lot[];
  onClose: () => void;
  onSave: (ftm: Ftm) => Promise<void> | void;
}

/**
 * Create an OS from a validated FTM (legacy openCreateOsModal /
 * handleCreateOsFormSubmit). Recipients are the accepted-quote bidders that
 * don't already have an OS. The new OS is pushed onto ftm.os and the FTM is
 * persisted.
 */
export default function CreateOsModal({
  open,
  ftm,
  lots,
  onClose,
  onSave,
}: CreateOsModalProps) {
  const [number, setNumber] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const getLot = (n: string) => lots.find((l) => l.number === n);

  // Available recipients = accepted latest quotes not already in an OS.
  const options = useMemo(() => {
    if (!ftm) return [] as { value: string; label: string }[];
    const latest = getLatestQuotes(ftm.quotes);
    const accepted = latest.filter((q) => q.isAccepted);
    const existing = (ftm.os || []).flatMap((os) => os.lots || []);
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (const q of accepted) {
      const value = q.workPackage || q.externalCompany || "";
      if (!value || existing.includes(value) || seen.has(value)) continue;
      seen.add(value);
      const label = q.workPackage
        ? (() => {
            const lot = getLot(q.workPackage);
            return lot
              ? `${lot.number} - ${lot.name} (${lot.company})`
              : `Lot ${q.workPackage}`;
          })()
        : `Intervenant : ${q.externalCompany}`;
      out.push({ value, label });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ftm, lots]);

  // Reset form when (re)opening for a new FTM.
  const editKey = ftm?.id ?? "none";
  const [lastKey, setLastKey] = useState(editKey);
  if (open && lastKey !== editKey) {
    setLastKey(editKey);
    const year = new Date().getFullYear();
    const suffix = Date.now().toString().slice(-4);
    setNumber(`OS-${year}-001-${suffix}`);
    setDescription("");
    setSelected([]);
    setError(null);
  }

  const toggle = (v: string) =>
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  const handleSave = async () => {
    if (!ftm) return;
    setError(null);
    if (selected.length === 0) {
      setError("Veuillez sélectionner au moins un destinataire.");
      return;
    }
    if (!number.trim()) {
      setError("Le numéro d'OS ne peut pas être vide.");
      return;
    }

    const latest = getLatestQuotes(ftm.quotes);
    const acceptedForOs = latest.filter(
      (q) =>
        q.isAccepted &&
        selected.includes((q.workPackage || q.externalCompany) as string),
    );

    const newOs: OrdreService = {
      id: `os-${Date.now()}`,
      number,
      description,
      osFileUrl: "",
      sentToMoexDate: null,
      remarks: "",
      signatureChain: [],
      lots: selected,
      linkedQuoteDetails: acceptedForOs.map((q) => ({
        quoteId: q.id,
        quoteNumber: q.number,
        amount: q.validatedMoaAmount,
        delay: q.validatedMoaDelay,
      })),
    };

    setSaving(true);
    try {
      await onSave({ ...ftm, os: [...(ftm.os || []), newOs] });
      onClose();
    } catch {
      setError("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="max-w-2xl"
      icon={<FileSignature className="h-6 w-6 text-blue-600" />}
      title="Créer un Ordre de Service"
      subtitle={ftm ? `Pour ${ftm.ftmNumber}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="blue" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> Créer l'OS
          </Button>
        </>
      }
    >
      <div className="space-y-5 p-6">
        {ftm && ftm.status !== "Devis validé MOA" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Cette FTM n'est pas au statut « Devis validé MOA ». La création d'OS
            est normalement réservée aux FTM validées MOA.
          </div>
        )}

        <Field label="Numéro d'OS">
          <TextInput value={number} onChange={(e) => setNumber(e.target.value)} />
        </Field>

        <Field label="Description / Objet">
          <TextArea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Objet de l'ordre de service…"
          />
        </Field>

        <Field label="Destinataires (devis acceptés)">
          {options.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-400">
              Aucun destinataire disponible. Les devis doivent être acceptés
              (accord paiement) et ne pas déjà figurer dans un OS.
            </p>
          ) : (
            <div className="space-y-1.5 rounded-lg border border-gray-200 bg-white p-3">
              {options.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(o.value)}
                    onChange={() => toggle(o.value)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>
          )}
        </Field>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
