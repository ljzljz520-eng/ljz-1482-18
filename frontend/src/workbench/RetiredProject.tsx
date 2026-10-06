import { Link } from 'react-router-dom';
import type { ExportSnapshot, ProjectInfo } from '../types';
import StateView from '../components/StateView';
import { exportSnapshotPath } from '../utils/links';

export default function RetiredProject({ project, snapshots = [] }: { project: ProjectInfo; snapshots?: ExportSnapshot[] }) {
  return (
    <StateView tone="locked" title="项目已退役" description="退役项目拒绝普通写入与导航自动保存；成员仍可通过历史导出链接访问对应快照，而不会被导向最新草稿。">
      <div className="grid gap-3">
        {snapshots.map((snapshot) => (
          <Link key={snapshot.id} to={exportSnapshotPath(project.id, snapshot.id)} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">{snapshot.label}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">冻结 v{snapshot.scriptVersion}</span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-400">{snapshot.id}</p>
          </Link>
        ))}
        {snapshots.length === 0 && <p className="text-sm text-slate-500">暂无历史导出。</p>}
      </div>
    </StateView>
  );
}
