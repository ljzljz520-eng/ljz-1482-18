import type { ScriptStep } from "@/api/types";

/**
 * 本地草稿（IndexedDB/localStorage 持久化）。
 * 草稿键严格包含 projectId 与 sessionId，跨项目天然隔离。
 */
export interface LocalDraft {
  projectId: string;
  sessionId: string;
  title: string;
  steps: ScriptStep[];
  baseVersion: number;
  savedAt: number;
  updatedAt: number;
}

/**
 * 权限被收回 / 节点被删除时，本地草稿进入隔离区而不是直接丢弃或错误注入别的项目。
 */
export interface QuarantinedDraft extends LocalDraft {
  reason: "FORBIDDEN" | "NOT_FOUND" | "RETIRED" | "SESSION_GONE" | "MIGRATED_AWAY";
  detail?: string;
  quarantinedAt: number;
}

const DRAFT_PREFIX = "cw:draft:";
const QUARANTINE_KEY = "cw:quarantine";

function draftKey(projectId: string, sessionId: string) {
  return `${DRAFT_PREFIX}${projectId}:${sessionId}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const localDrafts = {
  save(draft: Omit<LocalDraft, "savedAt"> & { savedAt?: number }) {
    const full: LocalDraft = { ...draft, savedAt: draft.savedAt ?? Date.now() } as LocalDraft;
    localStorage.setItem(draftKey(draft.projectId, draft.sessionId), JSON.stringify(full));
  },

  load(projectId: string, sessionId: string): LocalDraft | null {
    return safeParse<LocalDraft>(localStorage.getItem(draftKey(projectId, sessionId)));
  },

  clear(projectId: string, sessionId: string) {
    localStorage.removeItem(draftKey(projectId, sessionId));
  },

  listAll(): LocalDraft[] {
    const out: LocalDraft[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        const d = safeParse<LocalDraft>(localStorage.getItem(key));
        if (d) out.push(d);
      }
    }
    return out;
  }
};

export const quarantine = {
  list(): QuarantinedDraft[] {
    return safeParse<QuarantinedDraft[]>(localStorage.getItem(QUARANTINE_KEY)) ?? [];
  },

  add(draft: LocalDraft, reason: QuarantinedDraft["reason"], detail?: string) {
    const items = quarantine.list().filter(
      (q) => !(q.projectId === draft.projectId && q.sessionId === draft.sessionId)
    );
    items.unshift({ ...draft, reason, detail, quarantinedAt: Date.now() });
    localStorage.setItem(QUARANTINE_KEY, JSON.stringify(items.slice(0, 50)));
    localDrafts.clear(draft.projectId, draft.sessionId);
  },

  remove(projectId: string, sessionId: string) {
    const items = quarantine.list().filter(
      (q) => !(q.projectId === projectId && q.sessionId === sessionId)
    );
    localStorage.setItem(QUARANTINE_KEY, JSON.stringify(items));
  },

  clear() {
    localStorage.removeItem(QUARANTINE_KEY);
  }
};
