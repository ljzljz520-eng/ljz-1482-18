export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type ProjectStatus = 'ACTIVE' | 'RETIRED';
export type AssetType = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'TEXT';
export type StepKey = 'overview' | 'outline' | 'script' | 'review' | 'asset' | 'exports';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

export interface ProjectInfo {
  id: string;
  cuid?: string;
  name: string;
  status: ProjectStatus;
  currentModule: string;
  requiredModule: string;
  schemaVersion: number;
  role: Role;
  updatedAt: string;
  latestVersion?: number;
  requiresMigration?: boolean;
}

export interface SessionInfo {
  id: string;
  projectId: string;
  title: string;
  step: 'outline' | 'script' | 'review';
  scriptText: string;
  baseVersion: number;
  deleted: boolean;
  updatedAt: string;
}

export interface AssetInfo {
  id: string;
  projectId: string;
  name: string;
  type: AssetType;
  url: string;
  notes: string;
  deleted: boolean;
  updatedAt: string;
}

export interface ScriptVersion {
  id: string;
  sessionId: string;
  version: number;
  content: string;
  author?: UserProfile;
  createdAt: string;
}

export interface ExportSnapshot {
  id: string;
  projectId: string;
  sessionId: string | null;
  label: string;
  scriptText: string;
  scriptVersion: number;
  step: string;
  createdAt: string;
  immutable: true;
}

export type DeepLinkTarget =
  | { kind: 'project'; step: 'overview' }
  | { kind: 'session'; step: StepKey; session: SessionInfo }
  | { kind: 'asset'; step: 'asset'; asset: AssetInfo };

export interface WorkbenchBootstrap {
  project: ProjectInfo;
  retired: boolean;
  requiresMigration: boolean;
  target: DeepLinkTarget;
  sessions: SessionInfo[];
  assets: AssetInfo[];
  snapshots?: ExportSnapshot[];
}

export interface ConflictPayload {
  code: 'SCRIPT_VERSION_CONFLICT';
  message: string;
  conflict: {
    currentVersion: number;
    serverVersion: number;
    serverContent: string;
    serverAuthor: UserProfile | null;
  };
}

export type SaveStatus = 'idle' | 'pending' | 'committed' | 'conflict' | 'error';

export interface PendingSave {
  token: number;
  resourceKey: string;
  expectedVersion: number;
  content: string;
  status: SaveStatus;
  startedAt: number;
  conflict?: ConflictPayload['conflict'];
}

export interface LocalDraftRecord {
  resourceKey: string;
  projectId: string;
  sessionId: string;
  content: string;
  title: string;
  step: string;
  baseVersion: number;
  savedAt: number;
  sealed: boolean;
}
