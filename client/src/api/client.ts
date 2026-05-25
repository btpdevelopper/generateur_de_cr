import { auth } from "../firebase";
import type {
  Ftm,
  Lot,
  Personnel,
  OrdreService,
  Project,
  ProjectBootstrap,
  FinancialConfig,
} from "../types/models";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = auth.currentUser
    ? await auth.currentUser.getIdToken()
    : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error || body.message || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Projects ---
export const listProjects = () => apiFetch<Project[]>("/projects");
export const createProject = (name: string) =>
  apiFetch<Project>("/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const getProjectBootstrap = (projectId: string) =>
  apiFetch<ProjectBootstrap>(`/projects/${projectId}/bootstrap`);
export const updateProjectConfig = (
  projectId: string,
  financialConfig: FinancialConfig,
) =>
  apiFetch<Project>(`/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify({ financialConfig }),
  });
export const deleteProject = (projectId: string) =>
  apiFetch<void>(`/projects/${projectId}`, { method: "DELETE" });

// --- Generic collection helpers (ftms | lots | personnel | standaloneOs) ---
function collection<T extends { id: string }>(
  name: "ftms" | "lots" | "personnel" | "standaloneOs",
) {
  return {
    list: (projectId: string) =>
      apiFetch<T[]>(`/projects/${projectId}/${name}`),
    upsert: (projectId: string, item: T) =>
      apiFetch<T>(`/projects/${projectId}/${name}/${item.id}`, {
        method: "PUT",
        body: JSON.stringify(item),
      }),
    remove: (projectId: string, id: string) =>
      apiFetch<void>(`/projects/${projectId}/${name}/${id}`, {
        method: "DELETE",
      }),
  };
}

export const ftmsApi = collection<Ftm>("ftms");
export const lotsApi = collection<Lot>("lots");
export const personnelApi = collection<Personnel>("personnel");
export const standaloneOsApi = collection<OrdreService>("standaloneOs");
