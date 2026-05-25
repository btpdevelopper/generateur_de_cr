import { useMemo, useState } from "react";
import { Users, Edit, Archive, ArchiveRestore, Plus } from "lucide-react";
import type { Personnel } from "../../types/models";
import Modal from "../../components/Modal";
import { Button, TextInput, Field } from "../../components/ui";

interface PersonnelModalProps {
  open: boolean;
  personnel: Personnel[];
  onClose: () => void;
  onSave: (p: Personnel) => Promise<void> | void;
}

export default function PersonnelModal({
  open,
  personnel,
  onClose,
  onSave,
}: PersonnelModalProps) {
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () => [...personnel].sort((a, b) => a.name.localeCompare(b.name)),
    [personnel],
  );

  const reset = () => {
    setId(null);
    setName("");
    setRole("");
  };

  const persist = async (p: Personnel) => {
    setSaving(true);
    try {
      await onSave(p);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (id) {
      const existing = personnel.find((p) => p.id === id);
      await persist({
        ...(existing as Personnel),
        id,
        name,
        role,
      });
    } else {
      await persist({ id: `p-${Date.now()}`, name, role, isArchived: false });
    }
    reset();
  };

  const toggleArchive = async (p: Personnel) =>
    persist({ ...p, isArchived: !p.isArchived });

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="max-w-2xl"
      icon={<Users className="h-6 w-6 text-indigo-600" />}
      title="Gérer le Personnel"
    >
      <div className="space-y-6 p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom">
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom Prénom"
              />
            </Field>
            <Field label="Rôle / Fonction">
              <TextInput
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Conducteur de travaux"
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {id && (
              <Button variant="ghost" onClick={reset}>
                Annuler
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
              <Plus className="h-4 w-4" />
              {id ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {sorted.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Aucun membre du personnel.
            </p>
          ) : (
            sorted.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 ${
                  p.isArchived ? "opacity-60 grayscale" : ""
                }`}
              >
                <div>
                  <div className="font-semibold text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    {p.role || "Sans rôle"}
                  </div>
                </div>
                <div className="flex gap-1">
                  {p.isArchived ? (
                    <button
                      type="button"
                      title="Désarchiver"
                      onClick={() => toggleArchive(p)}
                      className="rounded-lg p-1.5 text-green-600 hover:bg-green-100"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        title="Modifier"
                        onClick={() => {
                          setId(p.id);
                          setName(p.name);
                          setRole(p.role);
                        }}
                        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-100"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Archiver"
                        onClick={() => toggleArchive(p)}
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-100"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
