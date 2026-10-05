import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/api";
import { getApiError } from "@/api/client";
import type { SnapshotMeta } from "@/api/types";
import { Badge, Button, Card, Skeleton } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export function SnapshotPanel({
  projectId,
  sessionId,
  canWrite
}: {
  projectId: string;
  sessionId: string;
  canWrite: boolean;
}) {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[] | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setSnapshots(await api.listSnapshots(projectId, sessionId));
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  useEffect(() => {
    void load();
  }, [projectId, sessionId]);

  const create = async () => {
    if (!label.trim()) {
      toast.error("请填写快照标签，例如：送审版");
      return;
    }
    setBusy(true);
    try {
      await api.createSnapshot(projectId, sessionId, label.trim());
      setLabel("");
      toast.success("已按当前版本生成不可变导出快照");
      await load();
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">导出快照</h3>
        <Badge tone="violet">链接永不漂移到最新稿</Badge>
      </div>
      <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500">
        快照绑定某一个不可变脚本版本。即使之后脚本继续修改，历史导出链接打开的仍然是导出那一刻的内容。
      </p>

      {canWrite && (
        <div className="mb-3 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="快照标签，如：客户送审版"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
          <Button onClick={() => void create()} disabled={busy} className="px-3 py-2 text-xs">
            {busy ? "生成中…" : "生成快照"}
          </Button>
        </div>
      )}

      {!snapshots ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : snapshots.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">还没有导出过快照。</p>
      ) : (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {snapshots.map((snap) => (
            <li key={snap.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-medium text-slate-700">{snap.label}</span>
                  <Badge>锁定 v{snap.version.version}</Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(snap.createdAt)}</p>
              </div>
              <Link
                to={`/projects/${projectId}/snapshots/${snap.id}`}
                className="shrink-0 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600 transition hover:bg-violet-100"
              >
                打开快照
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
