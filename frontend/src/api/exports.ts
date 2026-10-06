import { api } from './client';
import type { ExportSnapshot } from '../types';

export const exportApi = {
  list: async (projectId: string, signal?: AbortSignal) => {
    const res = await api.get<{ exports: ExportSnapshot[] }>(`/projects/${projectId}/exports`, { signal });
    return res.data.exports;
  },
  get: async (projectId: string, exportId: string, signal?: AbortSignal) => {
    const res = await api.get<{ export: ExportSnapshot }>(`/projects/${projectId}/exports/${exportId}`, { signal });
    return res.data.export;
  },
  create: async (projectId: string, payload: { label: string; sessionId?: string }) => {
    const res = await api.post<{ export: ExportSnapshot }>(`/projects/${projectId}/exports`, payload);
    return res.data.export;
  }
};
