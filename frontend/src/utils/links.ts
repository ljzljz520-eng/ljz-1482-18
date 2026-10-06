export const PROJECT_ID_PATTERN = /^prj-[a-z0-9-]{4,40}$/;
export const SESSION_ID_PATTERN = /^ses-[a-z0-9-]{4,40}$/;
export const ASSET_ID_PATTERN = /^ast-[a-z0-9-]{4,40}$/;
export const EXPORT_ID_PATTERN = /^exp-[a-z0-9-]{4,40}$/;

export const projectPath = (projectId: string) => `/w/${projectId}`;
export const sessionPath = (projectId: string, sessionId: string, step?: 'outline' | 'script' | 'review') => `/w/${projectId}/sessions/${sessionId}${step ? `?step=${step}` : ''}`;
export const assetPath = (projectId: string, assetId: string) => `/w/${projectId}/assets/${assetId}`;
export const exportsPath = (projectId: string) => `/w/${projectId}/exports`;
export const exportSnapshotPath = (projectId: string, exportId: string) => `/w/${projectId}/exports/${exportId}`;
