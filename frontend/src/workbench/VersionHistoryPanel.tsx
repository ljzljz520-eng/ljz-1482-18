import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/api";
import { getApiError } from "@/api/client";
import type { ScriptVersionMeta } from "@/api/types";
import { Badge, Button, Card, Skeleton, Spinner } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export function VersionHistoryPanel({
  projectId,
  sessionId,
  currentVersion
}: {
  projectId: string;
  sessionId: string;
  currentVersion: number;
}) {
  const [versions, setVersions] = useState<ScriptVersionMeta[] | null>(null);
  const [preview, setPreview] = useState<{ v: number; title: string; steps: { title: string; content: string }[] } | null>(null);
  const [loadingVersion, setLoadingVersion] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await api.listVersions(projectId, sessionId);
      setVersions(data.versions);
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  useEffect(() => {
    void load();
  }, [projectId, sessionId, currentVersion]);

  const openVersion = async (v: number) => {
    setLoadingVersion(v);
    try {
      const detail = await api.getVersion(projectId, sessionId, v);
      setPreview({ v: detail.version, title: detail.title, steps: detail.steps });
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoadingVersion(null);
    }
  };

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">版本历史</h3>
        <Badge>当前 v{currentVersion}</Badge>
      </div>
      {!versions ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : versions.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">还没有已提交的版本，第一次保存后会生成 v1。</p>
      ) : (
        <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {versions.map((ver) => (
            <li key={ver.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">v{ver.version}</span>
                  {ver.version === currentVersion && <Badge tone="green">最新</Badge>}
                  <span className="truncate text-xs text-slate-500">{ver.title}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {ver.author.name} · {formatDateTime(ver.createdAt)}
                  {ver.note ? ` · ${ver.note}` : ""}
                </p>
              </div>
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => void openVersion(ver.version)}>
                {loadingVersion === ver.version ? <Spinner className="h-3.5 w-3.5" /> : "查看"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">
                历史版本 v{preview.v}
                {preview.v !== currentVersion && <Badge tone="amber" className="ml-2">非最新，仅供回溯</Badge>}
              </h3>
              <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-sm font-medium text-slate-700">{preview.title}</p>
            <ol className="mt-3 space-y-2">
              {preview.steps.map((st, i) => (
                <li key={i} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-600">{i + 1}. {st.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">{st.content}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-[11px] leading-5 text-brand-700">
              历史版本是不可变记录。需要固定分享某次导出时，请使用「导出快照」，其链接永远停在该版本：
            </p>
            <div className="mt-3 text-right">
              <Link
                to={`/projects/${projectId}/sessions/${sessionId}?step=1`}
                className="text-xs text-slate-400 hover:text-brand-600"
              >
                返回当前编辑稿 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
