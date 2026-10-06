import { useLocation, useParams } from 'react-router-dom';
import { ASSET_ID_PATTERN, EXPORT_ID_PATTERN, PROJECT_ID_PATTERN, SESSION_ID_PATTERN } from '../utils/links';
import type { StepKey } from '../types';

export type DeepLinkKind = 'overview' | 'session' | 'asset' | 'exports' | 'exportDetail';

export interface DeepLinkTargetInput {
  kind: DeepLinkKind;
  projectId: string;
  sessionId?: string;
  assetId?: string;
  exportId?: string;
  step?: StepKey;
  invalid?: { title: string; detail: string };
}

const sessionSteps = new Set(['outline', 'script', 'review']);

export function useDeepLinkTarget(): DeepLinkTargetInput {
  const { projectId = '', sessionId, assetId, exportId } = useParams();
  const location = useLocation();

  if (!PROJECT_ID_PATTERN.test(projectId)) {
    return {
      kind: 'overview',
      projectId,
      invalid: { title: '非法项目深链接', detail: '项目 ID 必须匹配 prj-* 格式，当前值不会被发送到资源查询接口。' }
    };
  }

  if (sessionId !== undefined) {
    if (!SESSION_ID_PATTERN.test(sessionId)) {
      return { kind: 'session', projectId, sessionId, invalid: { title: '非法场次深链接', detail: '场次 ID 必须匹配 ses-* 格式；地址不会映射到任何编辑对象。' } };
    }
    const search = new URLSearchParams(location.search);
    const step = search.get('step') || 'script';
    if (!sessionSteps.has(step)) {
      return { kind: 'session', projectId, sessionId, invalid: { title: '非法步骤参数', detail: 'step 只能是 outline、script 或 review。' } };
    }
    return { kind: 'session', projectId, sessionId, step: step as StepKey };
  }

  if (assetId !== undefined) {
    if (!ASSET_ID_PATTERN.test(assetId)) {
      return { kind: 'asset', projectId, assetId, invalid: { title: '非法素材深链接', detail: '素材 ID 必须匹配 ast-* 格式。' } };
    }
    return { kind: 'asset', projectId, assetId, step: 'asset' };
  }

  if (exportId !== undefined) {
    if (!EXPORT_ID_PATTERN.test(exportId)) {
      return { kind: 'exportDetail', projectId, exportId, invalid: { title: '非法导出链接', detail: '导出 ID 必须匹配 exp-* 格式。' } };
    }
    return { kind: 'exportDetail', projectId, exportId };
  }

  return { kind: location.pathname.endsWith('/exports') ? 'exports' : 'overview', projectId, step: 'overview' };
}
