import { api } from './client';
import type { SessionInfo, ScriptVersion } from '../types';

export interface SaveSessionPayload {
  title: string;
  step: SessionInfo['step'];
  scriptText: string;
  expectedVersion: number;
}

export const sessionApi = {
  get: async (projectId: string, sessionId: string, signal?: AbortSignal) => {
    const res = await api.get<{ session: SessionInfo }>(`/projects/${projectId}/sessions/${sessionId}`, { signal });
    return res.data.session;
  },
  versions: async (projectId: string, sessionId: string, signal?: AbortSignal) => {
    const res = await api.get<{ versions: ScriptVersion[] }>(`/projects/${projectId}/sessions/${sessionId}/versions`, { signal });
    return res.data.versions;
  },
  save: async (projectId: string, sessionId: string, payload: SaveSessionPayload) => {
    const res = await api.put<{ session: SessionInfo; committedVersion: number }>(
      `/projects/${projectId}/sessions/${sessionId}`,
      payload
    );
    return res.data;
  },
  remove: async (projectId: string, sessionId: string) => {
    const res = await api.delete<{ id: string; deleted: boolean }>(`/projects/${projectId}/sessions/${sessionId}`);
    return res.data;
  }
};
