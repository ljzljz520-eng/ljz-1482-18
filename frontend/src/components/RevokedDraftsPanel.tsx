import { useState } from 'react';
import { listRevokedDrafts, removeRevokedDraft, type RevokedDraft } from '../utils/draftStorage';
import { useAuthStore } from '../auth/authStore';

function downloadDraft(draft: RevokedDraft) {
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `revoked-draft-${draft.sessionId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function RevokedDraftsPanel() {
  const user = useAuthStore((state) => state.user);
  const [drafts, setDrafts] = useState<RevokedDraft[]>(() => user ? listRevokedDrafts(user.id) : []);

  if (!user || drafts.length === 0) return null;

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-bold text-amber-950">权限收回后隔离的本地草稿</h2>
      <p className="mt-2 text-sm leading-6 text-amber-800">这些内容不会被自动恢复或展示到项目页面。只有你在确认安全时，手动导出或删除浏览器副本。</p>
      <div className="mt-4 grid gap-3">
        {drafts.map((draft) => (
          <div key={draft.resourceKey} className="rounded-2xl bg-white/85 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{draft.title}</p>
                <p className="font-mono text-xs text-slate-400">{draft.projectId}/{draft.sessionId}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => downloadDraft(draft)} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500">导出 JSON</button>
                <button onClick={() => { removeRevokedDraft(user.id, draft.resourceKey); setDrafts(listRevokedDrafts(user.id)); }} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">删除本地副本</button>
              </div>
            </div>
            <p className="mt-2 text-xs text-amber-700">{draft.reason} · {new Date(draft.revokedAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
