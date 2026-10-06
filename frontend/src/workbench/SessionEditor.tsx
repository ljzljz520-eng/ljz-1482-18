import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiError, getApiErrorMessage, sessionApi } from '../api';
import type { ConflictPayload, SaveStatus, ScriptVersion, SessionInfo } from '../types';
import StateView, { LoadingPanel } from '../components/StateView';
import { useWorkbench } from './workbenchContext';
import { useAuthStore } from '../auth/authStore';
import { useSaveQueue } from '../store/saveQueue';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import {
  getDraft,
  markDraftSealed,
  quarantineDraftForRevokedAccess,
  removeDraft,
  resourceKey,
  saveDraft
} from '../utils/draftStorage';
import { projectPath, sessionPath } from '../utils/links';

const steps: Array<SessionInfo['step']> = ['outline', 'script', 'review'];

function statusText(status: SaveStatus | undefined) {
  switch (status) {
    case 'pending': return '待同步：保存请求已提交，等待服务器确认';
    case 'committed': return '已提交：服务器版本已更新';
    case 'conflict': return '冲突：服务器已有新稿，当前页面不会自动覆盖';
    case 'error': return '保存失败：本地内容已保留';
    default: return '未修改';
  }
}

export default function SessionEditor() {
  const { projectId = '', sessionId = '' } = useParams();
  const { bootstrap } = useWorkbench();
  const user = useAuthStore((state) => state.user);
  const [params, setParams] = useSearchParams();
  const urlStep = params.get('step');
  const activeStep: SessionInfo['step'] = urlStep === 'outline' || urlStep === 'review' ? urlStep : 'script';

  const fallback = bootstrap.sessions.find((item) => item.id === sessionId);
  const [session, setSession] = useState<SessionInfo | null>(fallback ?? null);
  const [loading, setLoading] = useState(!fallback);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [draftMode, setDraftMode] = useState<'none' | 'same' | 'diverged' | 'sealed'>('none');
  const [content, setContent] = useState(fallback?.scriptText ?? '');
  const [title, setTitle] = useState(fallback?.title ?? '');
  const [conflict, setConflict] = useState<ConflictPayload['conflict'] | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const saveTokenRef = useRef(0);
  const resource = resourceKey(projectId, sessionId);
  const saveToken = useSaveQueue((state) => state.saves);
  const beginSave = useSaveQueue((state) => state.beginSave);
  const resolveSave = useSaveQueue((state) => state.resolveSave);
  const clearToken = useSaveQueue((state) => state.clearToken);
  const latestQueueItem = Object.values(saveToken).filter((item) => item.resourceKey === resource).sort((a, b) => b.token - a.token)[0];
  const dirty = Boolean(session) && (content !== session!.scriptText || title !== session!.title);
  const readonly = bootstrap.project.role === 'VIEWER' || bootstrap.retired;

  const reconcileLocalDraft = useCallback((serverSession: SessionInfo) => {
    if (!user) return;
    const local = getDraft(user.id, resource);
    if (!local) {
      setDraftMode('none');
      setContent(serverSession.scriptText);
      setTitle(serverSession.title);
      return;
    }
    setTitle(local.title || serverSession.title);
    if (local.baseVersion === serverSession.baseVersion && local.content !== serverSession.scriptText) {
      setDraftMode(local.sealed ? 'sealed' : 'same');
      setContent(local.content);
    } else if (local.baseVersion < serverSession.baseVersion) {
      setDraftMode('diverged');
      setContent(local.content);
    } else {
      setDraftMode('none');
      removeDraft(user.id, resource);
      setContent(serverSession.scriptText);
    }
  }, [resource, user]);

  useEffect(() => {
    if (fallback) {
      setSession(fallback);
      reconcileLocalDraft(fallback);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    sessionApi.get(projectId, sessionId, controller.signal)
      .then((data) => {
        if (!alive) return;
        setSession(data);
        reconcileLocalDraft(data);
      })
      .catch((error) => {
        if (!alive || controller.signal.aborted) return;
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (user && (status === 403 || status === 404)) quarantineDraftForRevokedAccess(user.id, resource);
        setLoadError(getApiErrorMessage(error, '场次加载失败'));
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; controller.abort(); };
  }, [fallback, projectId, reconcileLocalDraft, sessionId]);

  useEffect(() => {
    if (!session || activeStep !== 'review') return;
    const controller = new AbortController();
    let alive = true;
    sessionApi.versions(projectId, sessionId, controller.signal)
      .then((data) => alive && setVersions(data))
      .catch((error) => alive && toast.error(getApiErrorMessage(error, '版本记录加载失败')));
    return () => { alive = false; controller.abort(); };
  }, [activeStep, projectId, session, sessionId]);

  useEffect(() => {
    if (!user || !session || !dirty || status === 'pending') return;
    saveDraft(user.id, {
      resourceKey: resource,
      projectId,
      sessionId,
      content,
      title,
      step: activeStep,
      baseVersion: session.baseVersion
    });
  }, [activeStep, content, dirty, projectId, resource, session, sessionId, status, title, user]);

  useEffect(() => {
    if (!user || !session || (!dirty && status !== 'pending')) return;
    return () => {
      if (status === 'pending') markDraftSealed(user.id, resource);
    };
  }, [dirty, resource, session, status, user]);

  useBeforeUnload(dirty || status === 'pending');

  const canEdit = session && !readonly && !bootstrap.requiresMigration;

  async function onSave(event?: FormEvent) {
    event?.preventDefault();
    if (!session || !canEdit || !user) return;
    const token = beginSave(resource, session.baseVersion, content);
    saveTokenRef.current = token;
    setStatus('pending');
    setConflict(null);
    try {
      const result = await sessionApi.save(projectId, sessionId, {
        title,
        step: activeStep,
        scriptText: content,
        expectedVersion: session.baseVersion
      });
      const latestToken = useSaveQueue.getState().latestFor(resource)?.token;
      resolveSave(token, 'committed');
      clearToken(token);
      if (latestToken !== token || resourceKey(projectId, sessionId) !== resource || saveTokenRef.current !== token) return;
      setSession(result.session);
      setStatus('committed');
      setContent(result.session.scriptText);
      setTitle(result.session.title);
      removeDraft(user.id, resource);
      setDraftMode('none');
      toast.success('稿件已提交为新版本');
    } catch (error) {
      const latestToken = useSaveQueue.getState().latestFor(resource)?.token;
      const payload = getApiError<ConflictPayload>(error);
      if (payload?.code === 'SCRIPT_VERSION_CONFLICT') {
        resolveSave(token, 'conflict', payload.conflict);
        if (latestToken !== token || resourceKey(projectId, sessionId) !== resource || saveTokenRef.current !== token) return;
        setConflict(payload.conflict);
        setStatus('conflict');
        saveDraft(user.id, { resourceKey: resource, projectId, sessionId, content, title, step: activeStep, baseVersion: session.baseVersion });
        toast.error('服务器有新稿，已进入冲突处理，不会自动覆盖');
      } else {
        resolveSave(token, 'error');
        if (latestToken !== token || resourceKey(projectId, sessionId) !== resource || saveTokenRef.current !== token) return;
        setStatus('error');
        toast.error(getApiErrorMessage(error, '保存失败，本地内容已保留'));
      }
    }
  }

  function useServerContent() {
    if (!conflict || !session) return;
    const nextSession = { ...session, baseVersion: conflict.serverVersion };
    setContent(conflict.serverContent);
    setSession(nextSession);
    setConflict(null);
    setStatus('idle');
    if (user) saveDraft(user.id, { resourceKey: resource, projectId, sessionId, content: conflict.serverContent, title, step: activeStep, baseVersion: conflict.serverVersion });
    toast('已载入服务器新稿，请确认后再保存');
  }

  function createMergedCopy() {
    if (!conflict || !session) return;
    const merged = `${content}\n\n===== 服务器 v${conflict.serverVersion} 新稿（${conflict.serverAuthor?.displayName ?? '其他成员'}）=====\n${conflict.serverContent}`;
    const nextSession = { ...session, baseVersion: conflict.serverVersion };
    setSession(nextSession);
    setContent(merged);
    setStatus('idle');
    if (user) saveDraft(user.id, { resourceKey: resource, projectId, sessionId, content: merged, title, step: activeStep, baseVersion: conflict.serverVersion });
    toast('已把服务器新稿附在本地内容之后；基准版本已更新，请人工合并后保存');
  }

  function discardDraft() {
    if (!user || !session) return;
    removeDraft(user.id, resource);
    setDraftMode('none');
    setContent(session.scriptText);
    setTitle(session.title);
  }

  const stepTabs = useMemo(() => steps, []);

  if (loading) return <LoadingPanel title="正在按目标代次加载场次…" />;
  if (loadError || !session) {
    return <StateView tone="error" title="场次深链接不可用" description={loadError || '后端未返回该场次；可能已删除或不属于当前项目。'} />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={onSave} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Session deep link</p>
            <h2 className="mt-1 font-mono text-xs text-slate-400">{sessionId}</h2>
          </div>
          <div className="flex rounded-2xl bg-slate-100 p-1">
            {stepTabs.map((step) => (
              <Link
                key={step}
                to={`${sessionPath(projectId, sessionId)}?step=${step}`}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${activeStep === step ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {step === 'outline' ? '大纲' : step === 'script' ? '脚本' : '审阅'}
              </Link>
            ))}
          </div>
        </div>

        {(draftMode !== 'none' || conflict) && (
          <div className={`mt-5 rounded-2xl border p-4 text-sm ${conflict ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            {conflict ? (
              <>
                <p className="font-bold">检测到服务器新稿 v{conflict.serverVersion}，本地基于 v{session.baseVersion}</p>
                <p className="mt-1">禁止为导航或重试自动覆盖。请人工选择载入服务器版本，或将服务器新稿附加到本地后合并。</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={useServerContent} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500">使用服务器新稿</button>
                  <button type="button" onClick={createMergedCopy} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">生成合并副本</button>
                </div>
              </>
            ) : (
              <>
                <p className="font-bold">{draftMode === 'diverged' ? '本地草稿基于旧版本' : draftMode === 'sealed' ? '发现离开时待同步草稿' : '发现本地未提交草稿'}</p>
                <p className="mt-1">{draftMode === 'diverged' ? '当前先展示本地内容，同时保留服务器版本；保存会按版本规则拦截冲突。' : '已先通过后端访问校验，再恢复本地内容。'}</p>
                <button type="button" onClick={discardDraft} className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold ring-1 ring-amber-200">丢弃本地草稿</button>
              </>
            )}
          </div>
        )}

        <label className="mt-6 block text-sm font-semibold text-slate-700">
          场次标题
          <input disabled={!canEdit} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50" />
        </label>
        <label className="mt-5 block text-sm font-semibold text-slate-700">
          脚本内容
          <textarea
            disabled={!canEdit}
            value={content}
            onChange={(event) => { setContent(event.target.value); setStatus('idle'); }}
            rows={18}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm leading-7 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium ${
              status === 'conflict' ? 'bg-rose-50 text-rose-700' : status === 'pending' ? 'bg-amber-50 text-amber-700' : status === 'committed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              <span className={`h-2 w-2 rounded-full ${status === 'pending' ? 'animate-pulse bg-amber-500' : status === 'conflict' ? 'bg-rose-500' : status === 'committed' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {statusText(status)}
            </span>
            <span className="ml-3 text-xs text-slate-400">本地基准 v{session.baseVersion} · 队列代次 {latestQueueItem?.token ?? '-'}</span>
          </div>
          {canEdit && (
            <button disabled={!dirty || status === 'pending'} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
              {status === 'pending' ? '等待服务器确认…' : '提交保存'}
            </button>
          )}
        </div>
      </form>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-950">后端版本记录</h3>
          <p className="mt-1 text-xs text-slate-400">保存成功后生成不可篡改的 ScriptVersion。</p>
          <div className="mt-4 space-y-3">
            {activeStep === 'review' ? versions.map((version) => (
              <details key={version.id} className="rounded-2xl bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">v{version.version} · {version.author?.displayName}</summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-500">{version.content}</p>
              </details>
            )) : <p className="text-sm text-slate-500">切到“审阅”步骤查看历史版本。</p>}
          </div>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-950">地址与对象一致性</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">当前地址栏 step={activeStep}，编辑器对象为 {session.title}。浏览器后退仅改变目标，重新验证后才加载内容。</p>
          <Link className="mt-4 inline-block text-sm font-medium text-blue-600" to={projectPath(projectId)}>返回项目概览</Link>
        </section>
      </aside>
    </div>
  );
}
