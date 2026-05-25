import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useProjectData } from "../../state/ProjectDataContext";
import type { Ftm } from "../../types/models";
import { Spinner, Button } from "../../components/ui";
import Header from "./Header";
import KanbanBoard from "./KanbanBoard";
import FtmModal from "../ftm/FtmModal";
import LotsModal from "../lots/LotsModal";
import PersonnelModal from "../personnel/PersonnelModal";
import CreateOsModal from "../os/CreateOsModal";
import StandaloneOsModal from "../os/StandaloneOsModal";

export default function ProjectArea({
  onChangeProject,
}: {
  onChangeProject: () => void;
}) {
  const {
    loading,
    error,
    project,
    ftms,
    lots,
    personnel,
    standaloneOs,
    reload,
    upsertFtm,
    deleteFtm,
    upsertLot,
    upsertPersonnel,
    upsertStandaloneOs,
  } = useProjectData();

  const [ftmModal, setFtmModal] = useState<{ open: boolean; ftm: Ftm | null }>({
    open: false,
    ftm: null,
  });
  const [lotsOpen, setLotsOpen] = useState(false);
  const [personnelOpen, setPersonnelOpen] = useState(false);
  const [createOs, setCreateOs] = useState<{ open: boolean; ftm: Ftm | null }>({
    open: false,
    ftm: null,
  });
  const [standaloneOsOpen, setStandaloneOsOpen] = useState(false);

  /** Drag-and-drop status change: also updates statusDate + statusHistory. */
  const handleMoveFtm = (ftm: Ftm, newStatus: string) => {
    const date = new Date().toISOString().split("T")[0];
    const history = ftm.statusHistory ? [...ftm.statusHistory] : [];
    history.push({ status: newStatus, date });
    void upsertFtm({
      ...ftm,
      status: newStatus,
      statusDate: date,
      statusHistory: history,
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="Chargement du projet…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <div>
          <p className="font-semibold text-gray-800">
            Impossible de charger le projet
          </p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onChangeProject}>
            Retour aux projets
          </Button>
          <Button onClick={() => reload()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header
        projectName={project?.name || ""}
        onNewFtm={() => setFtmModal({ open: true, ftm: null })}
        onAddOs={() => setStandaloneOsOpen(true)}
        onManagePersonnel={() => setPersonnelOpen(true)}
        onManageLots={() => setLotsOpen(true)}
        onChangeProject={onChangeProject}
      />

      <main className="flex flex-grow flex-col overflow-hidden">
        <KanbanBoard
          ftms={ftms}
          lots={lots}
          onOpenFtm={(ftm) => setFtmModal({ open: true, ftm })}
          onMoveFtm={handleMoveFtm}
        />
      </main>

      <FtmModal
        open={ftmModal.open}
        ftm={ftmModal.ftm}
        lots={lots}
        existingFtms={ftms}
        onClose={() => setFtmModal({ open: false, ftm: null })}
        onSave={upsertFtm}
        onDelete={deleteFtm}
        onCreateOs={(ftm) => setCreateOs({ open: true, ftm })}
      />

      <LotsModal
        open={lotsOpen}
        lots={lots}
        onClose={() => setLotsOpen(false)}
        onSave={upsertLot}
      />

      <PersonnelModal
        open={personnelOpen}
        personnel={personnel}
        onClose={() => setPersonnelOpen(false)}
        onSave={upsertPersonnel}
      />

      <CreateOsModal
        open={createOs.open}
        ftm={createOs.ftm}
        lots={lots}
        onClose={() => setCreateOs({ open: false, ftm: null })}
        onSave={upsertFtm}
      />

      <StandaloneOsModal
        open={standaloneOsOpen}
        os={null}
        lots={lots}
        existingOs={standaloneOs}
        onClose={() => setStandaloneOsOpen(false)}
        onSave={upsertStandaloneOs}
      />
    </div>
  );
}
