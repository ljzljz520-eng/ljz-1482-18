import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import { getApiError } from "@/api/client";
import type { SnapshotDetail } from "@/api/types";
import { AppLayout } from "@/components/AppLayout";
import { Badge, Button, Card, Skeleton, Spinner } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

/**
 * 历史导出快照页（只读）。
 * 关键不变量：该页面永远渲染快照绑定的历史版本内容；
 * 不请求最新脚本，因此绝不会错误导向最新草稿。
 */
export function SnapshotView() {
  const { projectId = "", snapshotId = "" } = useParams();
  const [snapshot, setSnapshot] = useState<SnapshotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getSnapshot(projectId, snapshotId)
      .then((s) => {
        if (!cancelled) setSnapshot(s);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        setError({
          code: status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "ERROR",
          message: getApiError(err).message
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, snapshotId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-3xl px-5 py-16">
          <Card className="p-8">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="mt-4 h-32 w-full" />
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <Spinner className="h-4 w-4 text-brand-500" /> 正在读取导出时刻的快照…
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (error || !snapshot) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg px-5 py-20">
          <Card className="p-9 text-center">
            <div className="mb-3 text-4xl">🔎</div>
            <h1 className="text-lg font-semibold text-slate-800">
              {error?.code === "FORBIDDEN" ? "无权访问该快照" : "快照不存在"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{error?.message}</p>
            <div className="mt-6">
              <Link to="/">
                <Button variant="secondary">返回首页</Button>
              </Link>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Link to="/" className="hover:text-brand-600">项目</Link>
          <span>/</span>
          <Link to={`/projects/${projectId}`} className="hover:text-brand-600">工作台</Link>
          <span>/</span>
          <span>导出快照</span>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📌</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-violet-900">{snapshot.label}</h1>
                <Badge tone="violet">锁定 v{snapshot.version}</Badge>
                {snapshot.projectStatus === "RETIRED" && <Badge tone="amber">项目已退役</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-violet-700/80">
                导出于 {formatDateTime(snapshot.createdAt)} · 作者 {snapshot.authorName} · 场次「{snapshot.sessionTitle}」
              </p>
            </div>
          </div>
          <Link
            to={`/projects/${projectId}/sessions/${snapshot.sessionId}`}
            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:border-violet-400"
          >
            前往当前编辑稿
          </Link>
        </div>

        <Card className="p-7">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">以下为导出时的不可变内容</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{snapshot.title}</h2>
          {snapshot.note && <p className="mt-1 text-xs text-slate-400">备注：{snapshot.note}</p>}
          <ol className="mt-6 space-y-4">
            {snapshot.steps.map((step, i) => (
              <li key={step.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-700">{step.title}</h3>
                </div>
                <p className="mt-2 whitespace-pre-wrap pl-8 text-sm leading-7 text-slate-600">{step.content}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-700">
            此链接是历史导出：即使脚本之后又保存了新版本，本页也始终显示 v{snapshot.version}
            ，不会自动跳转到最新草稿。需要查看最新内容请点击上方「前往当前编辑稿」（仍需项目成员权限）。
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
