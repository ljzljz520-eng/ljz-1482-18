import { api } from './client';
import type { ProjectInfo, WorkbenchBootstrap } from '../types';

export const projectApi = {
  list: async () => {
    const res = await api.get<{ projects: ProjectInfo[] }>('/projects');
    return res.data.projects;
  },
  access: async (projectId: string) => {
    const res = await api.get<{ access: ProjectInfo }>(`/projects/${projectId}/access`);
    return res.data.access;
  },
  workbench: async (projectId: string, params: { session?: string; asset?: string }, signal?: AbortSignal) => {
    const res = await api.get<WorkbenchBootstrap>(`/projects/${projectId}/workbench`, { params, signal });
    return res.data;
  },
  migrate: async (projectId: string) => {
    const res = await api.post<{ project: ProjectInfo }>(`/projects/${projectId}/migrate`, { confirm: true });
    return res.data.project;
  }
};
