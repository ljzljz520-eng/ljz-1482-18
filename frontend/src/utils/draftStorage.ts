import type { LocalDraftRecord } from '../types';

const DRAFT_PREFIX = 'creative-workbench:drafts';
const REVOKED_PREFIX = 'creative-workbench:revoked';

function readMap<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as Record<string, T> : {};
  } catch {
    return {};
  }
}

function writeMap<T>(key: string, value: Record<string, T>) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function resourceKey(projectId: string, sessionId: string) {
  return `${projectId}/${sessionId}`;
}

export function getDraft(userId: string, key: string): LocalDraftRecord | null {
  return readMap<LocalDraftRecord>(`${DRAFT_PREFIX}:${userId}`)[key] ?? null;
}

export function saveDraft(userId: string, draft: Omit<LocalDraftRecord, 'savedAt' | 'sealed'> & { sealed?: boolean }) {
  const storageKey = `${DRAFT_PREFIX}:${userId}`;
  const map = readMap<LocalDraftRecord>(storageKey);
  const previous = map[draft.resourceKey];
  map[draft.resourceKey] = {
    ...draft,
    savedAt: Date.now(),
    sealed: draft.sealed ?? previous?.sealed ?? false
  };
  writeMap(storageKey, map);
}

export function markDraftSealed(userId: string, key: string) {
  const draft = getDraft(userId, key);
  if (!draft) return;
  saveDraft(userId, { ...draft, sealed: true });
}

export function removeDraft(userId: string, key: string) {
  const storageKey = `${DRAFT_PREFIX}:${userId}`;
  const map = readMap<LocalDraftRecord>(storageKey);
  delete map[key];
  writeMap(storageKey, map);
}

export interface RevokedDraft extends LocalDraftRecord {
  revokedAt: number;
  reason: string;
}

export function quarantineDraftForRevokedAccess(userId: string, key: string, reason = '项目访问权限已被收回') {
  const draft = getDraft(userId, key);
  if (!draft) return null;
  const draftStore = `${DRAFT_PREFIX}:${userId}`;
  const drafts = readMap<LocalDraftRecord>(draftStore);
  delete drafts[key];
  writeMap(draftStore, drafts);

  const revokedStore = `${REVOKED_PREFIX}:${userId}`;
  const revoked = readMap<RevokedDraft>(revokedStore);
  const record: RevokedDraft = { ...draft, sealed: true, revokedAt: Date.now(), reason };
  revoked[key] = record;
  writeMap(revokedStore, revoked);
  return record;
}

export function listRevokedDrafts(userId: string, projectId?: string): RevokedDraft[] {
  const values = Object.values(readMap<RevokedDraft>(`${REVOKED_PREFIX}:${userId}`));
  return values
    .filter((draft) => !projectId || draft.projectId === projectId)
    .sort((a, b) => b.revokedAt - a.revokedAt);
}

export function removeRevokedDraft(userId: string, key: string) {
  const store = `${REVOKED_PREFIX}:${userId}`;
  const map = readMap<RevokedDraft>(store);
  delete map[key];
  writeMap(store, map);
}

export function listDraftKeys(userId: string, projectId?: string): string[] {
  const values = Object.values(readMap<LocalDraftRecord>(`${DRAFT_PREFIX}:${userId}`));
  return values
    .filter((draft) => !projectId || draft.projectId === projectId)
    .map((draft) => draft.resourceKey);
}
