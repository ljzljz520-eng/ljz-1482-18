import { Link } from 'react-router-dom';
import { useWorkbench } from './workbenchContext';
import { assetPath, exportSnapshotPath, sessionPath } from '../utils/links';
import { listRevokedDrafts } from '../utils/draftStorage';
import { useAuthStore } from '../auth/authStore';

export default function ProjectOverview() {
  const { bootstrap } = useWorkbench();
  const user = useAuthStore((state) => state.user);
  const revoked = user ? listRevokedDrafts(user.id, bootstrap.project.id) : [];
  const editable = bootstrap.project.role !== 'VIEWER';

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">场次</h2>
            <span className="text-xs text-slate-400">仅显示未删除；删除状态持久在数据库</span>
          </div>
          <div className="mt-5 grid gap-3">
            {bootstrap.sessions.map((session) => (
              <Link key={session.id} to={sessionPath(bootstrap.project.id, session.id)} className="group rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-blue-700">{session.title}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{session.id}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{session.step}</span>
                    <p className="mt-1 text-slate-400">v{session.baseVersion}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{session.scriptText}</p>
              </Link>
            ))}
            {bootstrap.sessions.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">没有未删除场次。</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">素材</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {bootstrap.assets.map((asset) => (
              <Link key={asset.id} to={assetPath(bootstrap.project.id, asset.id)} className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/60">
                <p className="font-semibold text-slate-900">{asset.name}</p>
                <p className="mt-1 text-xs text-slate-400">{asset.type} · {asset.id}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">当前授权</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">成员权限</dt><dd className="font-semibold text-slate-900">{bootstrap.project.role}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">写入能力</dt><dd className="font-semibold">{editable ? '可编辑' : '只读'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">模块版本</dt><dd>{bootstrap.project.currentModule} / v{bootstrap.project.schemaVersion}</dd></div>
          </dl>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">最近导出</h2>
          <div className="mt-5 space-y-3">
            {(bootstrap.snapshots ?? []).slice(0, 3).map((snapshot) => (
              <Link key={snapshot.id} to={exportSnapshotPath(bootstrap.project.id, snapshot.id)} className="block rounded-2xl bg-slate-50 p-3 text-sm transition hover:bg-blue-50">
                <span className="font-semibold text-slate-800">{snapshot.label}</span>
                <span className="ml-2 text-xs text-slate-400">v{snapshot.scriptVersion}</span>
              </Link>
            ))}
            <Link to={`/w/${bootstrap.project.id}/exports`} className="text-sm font-medium text-blue-600 hover:text-blue-500">查看全部历史导出 →</Link>
          </div>
        </div>
        {revoked.length > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-bold text-amber-900">权限收回后隔离的本地内容</h2>
            <p className="mt-2 text-sm leading-6 text-amber-800">这些草稿不会自动装配到项目页面。重新获得权限前，只能由用户本人决定下载或删除浏览器中的隔离副本。</p>
            <div className="mt-3 space-y-2 text-xs text-amber-900">
              {revoked.map((item) => <div key={item.resourceKey} className="rounded-xl bg-white/70 p-2">{item.sessionId} · {item.title}</div>)}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
