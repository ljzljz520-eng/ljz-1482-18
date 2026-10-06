import { api } from './client';
import type { AssetInfo, AssetType } from '../types';

export interface AssetPayload {
  name: string;
  type: AssetType;
  url: string;
  notes: string;
}

export const assetApi = {
  get: async (projectId: string, assetId: string, signal?: AbortSignal) => {
    const res = await api.get<{ asset: AssetInfo }>(`/projects/${projectId}/assets/${assetId}`, { signal });
    return res.data.asset;
  },
  update: async (projectId: string, assetId: string, payload: Partial<AssetPayload>) => {
    const res = await api.put<{ asset: AssetInfo }>(`/projects/${projectId}/assets/${assetId}`, payload);
    return res.data.asset;
  }
};
