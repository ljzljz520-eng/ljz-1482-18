import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectApi } from '../api';
import type { ProjectInfo } from '../types';
import { LoadingPanel } from '../components/StateView';
import { assetPath, exportSnapshotPath, projectPath, sessionPath } from '../utils/links';
import RevokedDraftsPanel from '../components/RevokedDraftsPanel';

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    projectApi.list().then((data) => alive && setProjects(data)).catch((err) => alive && setError(err.message));
    return () => { alive = false; };
  }, []);

  if (error) return <div className="rounded-3xl border border-rose-200 bg-white p-8 text-rose-600">{error}</div>;
  if (!projects) return <LoadingPanel title="正在加载你有权访问的项目…" />;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Projects</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">选择创作项目</h1>
          <p className="mt-2 text-slate-500">所有深链接都会在后端重新校验项目成员、资源归属与项目状态。</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">当前可见 {projects.length} 个项目</div>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} to={projectPath(project.id)} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950 group-hover:text-blue-600">{project.name}</h2>
                <p className="mt-1 font-mono text-xs text-slate-400">{project.id}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${project.status === 'RETIRED' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                {project.status === 'RETIRED' ? '已退役' : '活跃'}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">角色：{project.role}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">模块：{project.currentModule}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Schema v{project.schemaVersion}</span>
            </div>
          </Link>
        ))}
      </section>

      <RevokedDraftsPanel />

      <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6">
        <h2 className="font-bold text-slate-900">验收深链接</h2>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Link className="rounded-xl bg-slate-50 p-3 text-blue-600 hover:bg-blue-50" to={sessionPath('prj-lantern-festival', 'ses-opening-river')}>定位场次：河岸开场</Link>
          <Link className="rounded-xl bg-slate-50 p-3 text-blue-600 hover:bg-blue-50" to={assetPath('prj-lantern-festival', 'ast-river-keyvisual')}>定位素材：河岸主视觉</Link>
          <Link className="rounded-xl bg-slate-50 p-3 text-blue-600 hover:bg-blue-50" to={projectPath('prj-legacy-node')}>旧节点：等待迁移</Link>
          <Link className="rounded-xl bg-slate-50 p-3 text-blue-600 hover:bg-blue-50" to={exportSnapshotPath('prj-lantern-festival', 'exp-lantern-v2-review')}>历史导出：V2 快照</Link>
          <Link className="rounded-xl bg-rose-50 p-3 text-rose-600 hover:bg-rose-100" to="/w/prj-not-exists/sessions/ses-opening-river">非法 / 猜 ID 深链接</Link>
          <Link className="rounded-xl bg-slate-100 p-3 text-slate-600 hover:bg-slate-200" to={projectPath('prj-retired-archive')}>项目退役状态</Link>
        </div>
      </section>
    </div>
  );
}
