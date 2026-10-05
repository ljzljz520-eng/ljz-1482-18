export type Role = "OWNER" | "EDITOR" | "VIEWER";
export type ProjectStatus = "ACTIVE" | "RETIRED";
export type SessionStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type MaterialKind = "VIDEO" | "AUDIO" | "IMAGE" | "DOCUMENT";
export type NodeKind = "SESSION" | "MATERIAL";
export type MigrationStatus = "RESOLVED" | "DELETED" | "REVOKED";

export interface UserInfo {
  id: string;
  email: string;
  name: string;
}

export interface MemberInfo {
  role: Role;
  user: { id: string; name: string; email: string };
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  version: number;
  updatedAt: string;
  myRole: Role;
}

export interface ProjectDetail extends ProjectSummary {
  members: MemberInfo[];
}

export interface SessionNode {
  id: string;
  projectId: string;
  title: string;
  summary: string | null;
  status: SessionStatus;
  orderIndex: number;
}

export interface Material {
  id: string;
  projectId: string;
  name: string;
  kind: MaterialKind;
  url: string;
  deleteState: "ACTIVE" | "DELETED";
  createdAt: string;
}

export interface ScriptStep {
  id: string;
  title: string;
  content: string;
}

export interface ScriptLatest {
  version: number;
  title: string;
  steps: ScriptStep[];
  authorId: string;
  note: string | null;
  createdAt: string;
}

export interface SessionDetail {
  session: SessionNode;
  script: {
    id: string;
    currentVersion: number;
    updatedAt: string;
    latest: ScriptLatest | null;
  } | null;
}

export interface Bootstrap {
  project: ProjectDetail;
  sessions: SessionNode[];
  materials: Material[];
}

export interface SaveScriptPayload {
  title: string;
  steps: ScriptStep[];
  baseVersion: number;
  note?: string;
  mode?: "MERGE" | "OVERWRITE";
}

export interface SaveScriptResult {
  saved: boolean;
  version: number;
  title: string;
  steps: ScriptStep[];
  note: string | null;
  authorId: string;
  updatedAt: string;
}

export interface ConflictDetails {
  serverVersion: number;
  serverTitle: string | null;
  serverSteps: ScriptStep[] | null;
  serverUpdatedAt: string | null;
}

export interface LegacyResolution {
  resolved: boolean;
  status: MigrationStatus;
  legacyNodeId: string;
  nodeKind: NodeKind;
  newNodeId?: string;
  note?: string | null;
}

export interface ScriptVersionMeta {
  id: string;
  version: number;
  title: string;
  note: string | null;
  createdAt: string;
  authorId: string;
  author: { name: string };
}

export interface SnapshotMeta {
  id: string;
  label: string;
  createdAt: string;
  version: { version: number; title: string };
}

export interface SnapshotDetail {
  id: string;
  label: string;
  createdAt: string;
  sessionId: string;
  sessionTitle: string;
  version: number;
  title: string;
  steps: ScriptStep[];
  note: string | null;
  authorName: string;
  projectStatus: ProjectStatus;
}
