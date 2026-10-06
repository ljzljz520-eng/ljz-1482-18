import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { exportApi, getApiErrorMessage } from '../api';
import type { ExportSnapshot } from '../types';
import StateView, { LoadingPanel } from '../components/StateView';
import { useWorkbench } from './workbenchContext';
import { EXPORT_ID_PATTERN, exportsPath, sessionPath } from '../utils/links';

export default function ExportSnapshotPage() {
  const { projectId = '', exportId = '' } = useParams();
  const { bootstrap } = useWorkbench();
  const fallback = bootstrap.snapshots?.find((item) => item.id === exportId) ?? null;
  const [snapshot, setSnapshot] = useState<ExportSnapshot | null>(fallback);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!EXPORT_ID_PATTERN.test(exportId)) {
      setError('非法导出链接：ID 必须匹配 exp-* 格式');
      return;
    }
    if (fallback) {
      setSnapshot(fallback);
      return;
    }
    const controller = new AbortController();
    let alive = true;
    exportApi.get(projectId, exportId, controller.signal)
      .then((data) => alive && setSnapshot(data))
      .catch((err) => alive && setError(getApiErrorMessage(err, '快照读取失败')));
    return () => { alive = false; controller.abort(); };
  }, [exportId, fallback, projectId]);

  if (!EXPORT_ID_PATTERN.test(exportId)) return <StateView tone="error" title="非法导出链接" description="地址栏中的导出 ID 格式错误。" />;
  if (error) return <StateView tone="error" title="无法访问导出快照" description={error} />;
  if (!snapshot) return <LoadingPanel title="正在读取冻结快照…" />;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 p-8 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Immutable snapshot</p>
        <h2 className="mt-3 text-3xl font-bold">{snapshot.label}</h2>
        <p className="mt-3 text-sm text-blue-100/80">导出时间：{new Date(snapshot.createdAt).toLocaleString()} · 冻结脚本 v{snapshot.scriptVersion} · 步骤 {snapshot.step}</p>
        <p className="mt-2 font-mono text-xs text-blue-100/60">{snapshot.id}</p>
      </div>
      <article className="mt-6 whitespace-pre-wrap rounded-3xl border border-slate-200 bg-slate-50 p-6 font-mono text-sm leading-8 text-slate-700">
        {snapshot.scriptText || '该快照没有脚本文本。'}
      </article>
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <Link className="rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-700" to={exportsPath(projectId)}>返回导出列表</Link>
        {snapshot.sessionId && (
          <Link className="rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-600 hover:bg-slate-50" to={sessionPath(projectId, snapshot.sessionId)}>
            查看当前场次草稿（非快照）
          </Link>
        )}
      </div>
    </section>
  );
}
