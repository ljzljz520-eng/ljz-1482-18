import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportApi, getApiErrorMessage } from '../api';
import type { ExportSnapshot } from '../types';
import StateView, { LoadingPanel } from '../components/StateView';
import { useWorkbench } from './workbenchContext';
import { exportSnapshotPath } from '../utils/links';

export default function ExportList() {
  const { bootstrap } = useWorkbench();
  const [exports, setExports] = useState<ExportSnapshot[] | null>(bootstrap.snapshots ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    exportApi.list(bootstrap.project.id, controller.signal)
      .then((data) => alive && setExports(data))
      .catch((err) => alive && setError(getApiErrorMessage(err, '导出列表加载失败')));
    return () => { alive = false; controller.abort(); };
  }, [bootstrap.project.id]);

  if (error) return <StateView tone="error" title="无法读取导出列表" description={error} />;
  if (!exports) return <LoadingPanel title="正在读取历史导出快照…" />;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">历史导出</h2>
          <p className="mt-1 text-sm text-slate-500">每个链接读取冻结快照；即使场次脚本后来更新，也不会错误跳到最新草稿。</p>
        </div>
        {bootstrap.retired && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">退役项目只读</span>}
      </div>
      <div className="mt-5 grid gap-3">
        {exports.map((item) => (
          <Link key={item.id} to={exportSnapshotPath(bootstrap.project.id, item.id)} className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-900">{item.label}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">脚本 v{item.scriptVersion} · {new Date(item.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 font-mono text-xs text-slate-400">{item.id}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
