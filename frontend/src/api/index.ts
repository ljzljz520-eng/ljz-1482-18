import { http } from "./client";
import type {
  Bootstrap,
  LegacyResolution,
  Material,
  ProjectDetail,
  ProjectSummary,
  SaveScriptPayload,
  SaveScriptResult,
  ScriptStep,
  ScriptVersionMeta,
  SessionDetail,
  SnapshotDetail,
  SnapshotMeta,
  UserInfo
} from "./types";

export const api = {
  login: (email: string, password: string) =>
    http.post<{ token: string; user: UserInfo }>("/auth/login", { email, password }).then((r) => r.data),
  me: () => http.get<{ user: UserInfo }>("/auth/me").then((r) => r.data.user),

  listProjects: () => http.get<{ projects: ProjectSummary[] }>("/projects").then((r) => r.data.projects),
  getProject: (projectId: string) =>
    http.get<{ project: ProjectDetail }>(`/projects/${projectId}`).then((r) => r.data.project),
  bootstrap: (projectId: string, signal?: AbortSignal) =>
    http.get<Bootstrap>(`/projects/${projectId}/bootstrap`, { signal }).then((r) => r.data),
  retireProject: (projectId: string) =>
    http
      .post<{ project: { id: string; status: "RETIRED"; version: number } }>(`/projects/${projectId}/retire`)
      .then((r) => r.data),
  reactivateProject: (projectId: string) =>
    http.post(`/projects/${projectId}/reactivate`).then((r) => r.data),

  resolveLegacy: (projectId: string, legacyNodeId: string, signal?: AbortSignal) =>
    http
      .get<LegacyResolution>(`/projects/${projectId}/resolve/${encodeURIComponent(legacyNodeId)}`, { signal })
      .then((r) => r.data),

  getSession: (projectId: string, sessionId: string, signal?: AbortSignal) =>
    http
      .get<SessionDetail>(`/projects/${projectId}/sessions/${sessionId}`, { signal })
      .then((r) => r.data),
  createSession: (projectId: string, title: string, summary?: string) =>
    http.post(`/projects/${projectId}/sessions`, { title, summary }).then((r) => r.data),
  deleteSession: (projectId: string, sessionId: string) =>
    http.delete(`/projects/${projectId}/sessions/${sessionId}`),
  migrateLegacy: (projectId: string, legacyNodeId: string, newSessionId: string, note?: string) =>
    http
      .post(`/projects/${projectId}/migrate`, { legacyNodeId, newSessionId, note })
      .then((r) => r.data),

  listMaterials: (projectId: string) =>
    http.get<{ materials: Material[] }>(`/projects/${projectId}/materials`).then((r) => r.data.materials),
  createMaterial: (projectId: string, payload: { name: string; kind: Material["kind"]; url: string }) =>
    http.post(`/projects/${projectId}/materials`, payload).then((r) => r.data),
  getMaterial: (projectId: string, materialId: string) =>
    http.get<{ material: Material }>(`/projects/${projectId}/materials/${materialId}`).then((r) => r.data.material),
  deleteMaterial: (projectId: string, materialId: string) =>
    http.delete(`/projects/${projectId}/materials/${materialId}`),

  saveScript: (projectId: string, sessionId: string, payload: SaveScriptPayload) =>
    http
      .put<SaveScriptResult>(`/projects/${projectId}/sessions/${sessionId}/script`, payload)
      .then((r) => r.data),
  listVersions: (projectId: string, sessionId: string) =>
    http
      .get<{ currentVersion: number; versions: ScriptVersionMeta[] }>(
        `/projects/${projectId}/sessions/${sessionId}/script/versions`
      )
      .then((r) => r.data),
  getVersion: (projectId: string, sessionId: string, version: number) =>
    http
      .get<{
        version: number;
        title: string;
        steps: ScriptStep[];
        note: string | null;
        createdAt: string;
        authorName: string;
      }>(`/projects/${projectId}/sessions/${sessionId}/script/versions/${version}`)
      .then((r) => r.data),

  listSnapshots: (projectId: string, sessionId: string) =>
    http
      .get<{ snapshots: SnapshotMeta[] }>(`/projects/${projectId}/sessions/${sessionId}/snapshots`)
      .then((r) => r.data.snapshots),
  createSnapshot: (projectId: string, sessionId: string, label: string) =>
    http.post(`/projects/${projectId}/sessions/${sessionId}/snapshots`, { label }).then((r) => r.data),
  getSnapshot: (projectId: string, snapshotId: string) =>
    http
      .get<{ snapshot: SnapshotDetail }>(`/projects/${projectId}/snapshots/${snapshotId}`)
      .then((r) => r.data.snapshot)
};
