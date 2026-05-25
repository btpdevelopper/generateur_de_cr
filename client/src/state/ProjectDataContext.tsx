import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getProjectBootstrap,
  ftmsApi,
  lotsApi,
  personnelApi,
  standaloneOsApi,
} from "../api/client";
import {
  normalizeBootstrap,
  normalizeFtm,
  normalizeLot,
} from "../lib/normalize";
import type {
  Ftm,
  Lot,
  OrdreService,
  Personnel,
  Project,
} from "../types/models";

interface ProjectData {
  loading: boolean;
  error: string | null;
  project: Project | null;
  ftms: Ftm[];
  lots: Lot[];
  personnel: Personnel[];
  standaloneOs: OrdreService[];

  reload: () => Promise<void>;

  upsertFtm: (ftm: Ftm) => Promise<void>;
  deleteFtm: (id: string) => Promise<void>;
  upsertLot: (lot: Lot) => Promise<void>;
  deleteLot: (id: string) => Promise<void>;
  upsertPersonnel: (p: Personnel) => Promise<void>;
  deletePersonnel: (id: string) => Promise<void>;
  upsertStandaloneOs: (os: OrdreService) => Promise<void>;
  deleteStandaloneOs: (id: string) => Promise<void>;
}

const ProjectDataContext = createContext<ProjectData | undefined>(undefined);

/** Replace-or-append by id, keeping array order stable on update. */
function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...list, item];
  const next = list.slice();
  next[idx] = item;
  return next;
}

export function ProjectDataProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [ftms, setFtms] = useState<Ftm[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [standaloneOs, setStandaloneOs] = useState<OrdreService[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getProjectBootstrap(projectId);
      const data = normalizeBootstrap(raw);
      setProject(data.project);
      setFtms(data.ftms);
      setLots(data.lots);
      setPersonnel(data.personnel);
      setStandaloneOs(data.standaloneOs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // --- Mutators: update local state optimistically, then persist. On API
  // failure we reload to resync with the server. ---

  const upsertFtm = useCallback(
    async (ftm: Ftm) => {
      const normalized = normalizeFtm(ftm);
      setFtms((prev) => upsertById(prev, normalized));
      try {
        await ftmsApi.upsert(projectId, normalized);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
        await reload();
        throw e;
      }
    },
    [projectId, reload],
  );

  const deleteFtm = useCallback(
    async (id: string) => {
      const prev = ftms;
      setFtms((p) => p.filter((f) => f.id !== id));
      try {
        await ftmsApi.remove(projectId, id);
      } catch (e) {
        setFtms(prev);
        setError(e instanceof Error ? e.message : "Échec de la suppression");
        throw e;
      }
    },
    [projectId, ftms],
  );

  const upsertLot = useCallback(
    async (lot: Lot) => {
      const normalized = normalizeLot(lot);
      setLots((prev) => upsertById(prev, normalized));
      try {
        await lotsApi.upsert(projectId, normalized);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
        await reload();
        throw e;
      }
    },
    [projectId, reload],
  );

  const deleteLot = useCallback(
    async (id: string) => {
      const prev = lots;
      setLots((p) => p.filter((l) => l.id !== id));
      try {
        await lotsApi.remove(projectId, id);
      } catch (e) {
        setLots(prev);
        setError(e instanceof Error ? e.message : "Échec de la suppression");
        throw e;
      }
    },
    [projectId, lots],
  );

  const upsertPersonnel = useCallback(
    async (p: Personnel) => {
      setPersonnel((prev) => upsertById(prev, p));
      try {
        await personnelApi.upsert(projectId, p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
        await reload();
        throw e;
      }
    },
    [projectId, reload],
  );

  const deletePersonnel = useCallback(
    async (id: string) => {
      const prev = personnel;
      setPersonnel((p) => p.filter((x) => x.id !== id));
      try {
        await personnelApi.remove(projectId, id);
      } catch (e) {
        setPersonnel(prev);
        setError(e instanceof Error ? e.message : "Échec de la suppression");
        throw e;
      }
    },
    [projectId, personnel],
  );

  const upsertStandaloneOs = useCallback(
    async (os: OrdreService) => {
      setStandaloneOs((prev) => upsertById(prev, os));
      try {
        await standaloneOsApi.upsert(projectId, os);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
        await reload();
        throw e;
      }
    },
    [projectId, reload],
  );

  const deleteStandaloneOs = useCallback(
    async (id: string) => {
      const prev = standaloneOs;
      setStandaloneOs((p) => p.filter((o) => o.id !== id));
      try {
        await standaloneOsApi.remove(projectId, id);
      } catch (e) {
        setStandaloneOs(prev);
        setError(e instanceof Error ? e.message : "Échec de la suppression");
        throw e;
      }
    },
    [projectId, standaloneOs],
  );

  const value: ProjectData = {
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
    deleteLot,
    upsertPersonnel,
    deletePersonnel,
    upsertStandaloneOs,
    deleteStandaloneOs,
  };

  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
}

export function useProjectData(): ProjectData {
  const ctx = useContext(ProjectDataContext);
  if (!ctx)
    throw new Error("useProjectData must be used within a ProjectDataProvider");
  return ctx;
}
