import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { getApiErrorMessage, projectApi } from '../api';
import StateView, { LoadingPanel } from '../components/StateView';
import { useAuthStore } from '../auth/authStore';
import type { WorkbenchBootstrap } from '../types';
import { PROJECT_ID_PATTERN, projectPath, SESSION_ID_PATTERN } from '../utils/links';
import { listDraftKeys, quarantineDraftForRevokedAccess } from '../utils/draftStorage';
import MigrationRequired from './MigrationRequired';
import RetiredProject from './RetiredProject';
import { WorkbenchContext } from './workbenchContext';
import StepNav from '../components/StepNav';

export default function WorkbenchGate() {
  const { projectId = '' } = useParams();
  const location = useLocation();
  const generationRef = useRef(0);
  const [bootstrap, setBootstrap] = useState<WorkbenchBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const user = useAuthStore((state) => state.user);

  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++generationRef.current;
    if (!PROJECT_ID_PATTERN.test(projectId)) {
      setLoading(false);
      setBootstrap(null);
      setError({ message: '非法项目深链接' });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await projectApi.workbench(projectId, {}, signal);
      if (generationRef.current !== current) return;
      setBootstrap(data);
    } catch (err: unknown) {
      if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) return;
      const status = typeof err === 'object' && err !== null && 'response' in err
        ? ((err as { response?: { status?: number } }).response?.status)
        : undefined;
      if (user && (status === 403 || status === 404)) {
        listDraftKeys(user.id, projectId).forEach((key) => quarantineDraftForRevokedAccess(user.id, key));
      }
      if (generationRef.current === current) {
        setError({ status, message: getApiErrorMessage(err, '项目访问校验失败') });
        setBootstrap(null);
      }
    } finally {
      if (generationRef.current === current) setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const reload = useCallback(async () => {
    const controller = new AbortController();
    await load(controller.signal);
  }, [load]);

  if (!PROJECT_ID_PATTERN.test(projectId)) {
    return (
      <StateView tone="error" title="非法项目深链接" description="地址栏中的项目标识格式错误。为避免把错误参数拼进资源查询，前端已阻止请求。">
        <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-rose-100">{projectId || '(empty)'}</pre>
      </StateView>
    );
  }

  if (loading) return <LoadingPanel />;
  if (error || !bootstrap) {
    const revoked = error?.status === 403 || error?.status === 404;
    return (
      <StateView
        tone={revoked ? 'locked' : 'error'}
        title={revoked ? '没有该项目的访问权限' : '工作台加载失败'}
        description={revoked ? '后端按登录用户和项目成员关系重新校验失败。猜到资源 ID 也不会返回脚本、素材或成员权限信息；本地草稿已被隔离，不会在项目页面渲染。' : error?.message}
      />
    );
  }

  const pathSession = location.pathname.match(/\/sessions\/([^/]+)$/)?.[1];
  const currentStep = location.pathname.includes('/exports')
    ? 'exports' as const
    : SESSION_ID_PATTERN.test(pathSession ?? '')
      ? ((new URLSearchParams(location.search).get('step') || 'script') as 'outline' | 'script' | 'review')
      : 'overview' as const;
  const isExports = currentStep === 'exports';
  const blockedByRetired = bootstrap.retired && !isExports;
  const blockedByMigration = bootstrap.requiresMigration && !isExports;

  return (
    <WorkbenchContext.Provider value={{ bootstrap, reload, generation: generationRef.current }}>
      <div className="space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link to={projectPath(bootstrap.project.id)} className="text-xl font-bold text-slate-950 hover:text-blue-600">{bootstrap.project.name}</Link>
              <p className="mt-1 text-xs text-slate-500">
                {bootstrap.project.id} · 成员角色 {bootstrap.project.role} · 后端最新脚本版本 v{bootstrap.project.latestVersion ?? 1}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full px-3 py-1 font-semibold ${bootstrap.retired ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{bootstrap.retired ? 'RETIRED' : 'ACTIVE'}</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">{bootstrap.project.currentModule}</span>
            </div>
          </div>
          <div className="mt-5">
            <StepNav projectId={projectId} currentStep={currentStep} sessionId={SESSION_ID_PATTERN.test(pathSession ?? '') ? pathSession : undefined} disabled={blockedByRetired || blockedByMigration} />
          </div>
        </header>
        {blockedByRetired ? <RetiredProject project={bootstrap.project} snapshots={bootstrap.snapshots} /> : null}
        {blockedByMigration ? <MigrationRequired project={bootstrap.project} onMigrated={reload} /> : null}
        {!blockedByRetired && !blockedByMigration ? <Outlet /> : null}
        <p className="text-center text-xs text-slate-400">
          导航守卫仅优化等待体验；每个读/写接口均以服务端项目成员关系和资源所属项目为准。
        </p>
      </div>
    </WorkbenchContext.Provider>
  );
}
