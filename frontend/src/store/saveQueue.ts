import { create } from 'zustand';
import type { ConflictPayload, PendingSave, SaveStatus } from '../types';

interface SaveQueueState {
  saves: Record<number, PendingSave>;
  nextToken: number;
  beginSave: (resourceKey: string, expectedVersion: number, content: string) => number;
  resolveSave: (token: number, status: SaveStatus, conflict?: ConflictPayload['conflict']) => void;
  latestFor: (resourceKey: string) => PendingSave | undefined;
  clearToken: (token: number) => void;
}

export const useSaveQueue = create<SaveQueueState>((set, get) => ({
  saves: {},
  nextToken: 1,
  beginSave: (resourceKey, expectedVersion, content) => {
    const token = get().nextToken;
    set((state) => ({
      nextToken: token + 1,
      saves: {
        ...state.saves,
        [token]: { token, resourceKey, expectedVersion, content, status: 'pending', startedAt: Date.now() }
      }
    }));
    return token;
  },
  resolveSave: (token, status, conflict) => set((state) => {
    const current = state.saves[token];
    if (!current) return state;
    return { saves: { ...state.saves, [token]: { ...current, status, conflict } } };
  }),
  latestFor: (resourceKey) => Object.values(get().saves)
    .filter((item) => item.resourceKey === resourceKey)
    .sort((a, b) => b.token - a.token)[0],
  clearToken: (token) => set((state) => {
    const saves = { ...state.saves };
    delete saves[token];
    return { saves };
  })
}));
