import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, useBlocker } from "react-router-dom";
import toast from "react-hot-toast";
import { useWorkbenchStore } from "@/stores/workbenchStore";
import { useScriptEditor } from "./useScriptEditor";
import { Badge, Button, Card, Skeleton, Spinner } from "@/components/ui";
import { ConflictDialog } from "./ConflictDialog";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { SnapshotPanel } from "./SnapshotPanel";
import { relativeTime } from "@/lib/format";
import type { ScriptStep } from "@/api/types";
import { api } from "@/api";
import { getApiError } from "@/api/client";

const saveStatusUI: Record<string, { text: string; tone: "slate" | "blue" | "amber" | "green" | "rose" }> = {
  idle: { text: "无未保存修改", tone: "slate" },
  dirty: { text: "待同步 · 已暂存本机", tone: "amber" },
  saving: { text: "提交中…", tone: "blue" },
  saved: { text: "已提交到服务器", tone: "green" },
  conflict: { text: "冲突 · 服务器已有新稿", tone: "rose" },
  error: { text: "保存失败", tone: "rose" }
};

export function SessionView() {
  const { projectId = "", sessionId = "" } = useParams();
  const data = useWorkbenchStore((s) => s.data);
  const removeSession = useWorkbenchStore((s) => s.removeSession);

  const session = data?.sessions.find((s) => s.id === sessionId) ?? null;
  const canWrite = !!data && data.project.myRole !== "VIEWER" && data.project.status === "ACTIVE";

  // key 强制在场次切换时重建编辑器，杜绝跨场次状态残留
  return (
    <InnerSessionView
      key={`${projectId}:${sessionId}`}
      projectId={projectId}
      sessionId={sessionId}
      sessionTitle={session?.title ?? ""}
      canWrite={canWrite}
      onSessionDeleted={async () => {
        await api.deleteSession(projectId, sessionId).catch(() => undefined);
        removeSession(sessionId);
      }}
    />
  );
}

interface InnerProps {
  projectId: string;
  sessionId: string;
  sessionTitle: string;
  canWrite: boolean;
  onSessionDeleted: () => Promise<void>;
}

function InnerSessionView({ projectId, sessionId, sessionTitle, canWrite, onSessionDeleted }: InnerProps) {
  const editor = useScriptEditor(projectId, sessionId, canWrite);
  const { load, title, steps, status, conflict } = editor;
  const [searchParams, setSearchParams] = useSearchParams();

  // 地址栏 step 参数与当前编辑步骤保持一致
  const stepParam = searchParams.get("step");
  const activeStepIndex = useMemo(() => {
    const idx = Number(stepParam);
    if (Number.isInteger(idx) && idx >= 1 && idx <= steps.length) return idx - 1;
    return 0;
  }, [stepParam, steps.length]);

  useEffect(() => {
    if (load.loading || steps.length === 0) return;
    const want = Number(stepParam);
    // 非法/越界 step：不报错白屏，收敛到第一步并修正地址栏
    if (!Number.isInteger(want) || want < 1 || want > steps.length) {
      const next = new URLSearchParams(searchParams);
      next.set("step", "1");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.loading, steps.length]);

  // 导航守卫：仅在「待同步 / 冲突 / 提交中」拦截；这是体验层保护，真正权限以后端为准
  const shouldBlock = canWrite && (status === "dirty" || status === "conflict" || status === "saving");
  const blocker = useBlocker(shouldBlock ? true : false);

  // 关闭/刷新浏览器时提示（保存进行中尤其重要）
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (canWrite && (status === "dirty" || status === "conflict" || status === "saving")) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [canWrite, status]);

  const goStep = (n: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("step", String(n));
    setSearchParams(next, { replace: true });
  };

  const legacyId = (() => {
    const from = searchParams.get("from");
    return from?.startsWith("legacy:") ? from.slice("legacy:".length) : null;
  })();

  const activeStep = steps[activeStepIndex];

  if (load.loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="mt-4 h-10 w-full" />
        <Skeleton className="mt-3 h-40 w-full" />
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Spinner className="h-4 w-4 text-brand-500" /> 正在校验访问并拉取服务器脚本…
        </div>
      </Card>
    );
  }

  if (load.errorCode) {
    const map: Record<string, { icon: string; title: string }> = {
      FORBIDDEN: { icon: "🚫", title: "你没有该场次的访问权限" },
      NOT_FOUND: { icon: "🧭", title: "场次不存在或已被删除" },
      RETIRED: { icon: "📦", title: "项目已退役" },
      ERROR: { icon: "⚠️", title: "脚本加载失败" }
    };
    const info = map[load.errorCode] ?? map.ERROR;
    return (
      <Card className="p-10 text-center">
        <div className="mb-3 text-4xl">{info.icon}</div>
        <h2 className="text-lg font-semibold text-slate-800">{info.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{load.errorMessage}</p>
        {(load.errorCode === "FORBIDDEN" || load.errorCode === "NOT_FOUND") && (
          <p className="mx-auto mt-3 max-w-md rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
            你在该场次未提交的本地草稿已被移入左侧「隔离区」，不会显示在这个无权限页面上，也不会写回服务器。
          </p>
        )}
        <div className="mt-5">
          <Link to={`/projects/${projectId}`}>
            <Button variant="secondary">返回项目概览</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {blocker.state === "blocked" && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-fade-in-up rounded-2xl bg-white p-6 shadow-pop">
            <h3 className="text-base font-semibold text-slate-800">
              {status === "saving" ? "脚本正在提交中" : "有尚未同步的修改"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {status === "saving"
                ? "请等待服务器响应，避免离开导致无法确认提交结果。本地草稿已经保存，即使离开也不会丢失。"
                : status === "conflict"
                  ? "当前存在与服务器的版本冲突，尚未决定保留哪一版。直接离开会保留本地待同步稿，稍后可再处理。"
                  : "修改已暂存在本机（待同步），但还没有提交到服务器。直接离开不会丢失，稍后可从草稿恢复。"}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => blocker.reset?.()}>
                留在此页
              </Button>
              <Button
                variant="warning"
                onClick={() => {
                  blocker.proceed?.();
                }}
              >
                {status === "saving" ? "仍要离开" : "带草稿离开"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {legacyId && (
        <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-xs leading-5 text-brand-700">
          <span>🔀</span>
          <span>
            你通过旧节点链接 <code className="rounded bg-white/70 px-1.5 py-0.5">{legacyId}</code> 到达这里：
            该旧节点已迁移到当前场次，地址栏已更新为新链接，建议更新书签。
          </span>
        </div>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold text-slate-900">{sessionTitle || "未命名场次"}</h2>
              <Badge tone="slate">服务器 v{load.serverVersion}</Badge>
              {!canWrite && <Badge tone="amber">只读</Badge>}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              地址栏 /projects/{projectId.slice(0, 6)}…/sessions/{sessionId}?step={activeStepIndex + 1} 与当前步骤保持一致，可直接分享深链接
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canWrite && (
              <Button
                onClick={() => {
                  void editor.save("MERGE");
                }}
                disabled={status === "saving" || status === "conflict" || (!editor.isDirty && status !== "dirty")}
              >
                {status === "saving" && <Spinner className="h-4 w-4" />}
                保存到服务器
              </Button>
            )}
            <DeleteSessionButton
              canWrite={canWrite}
              onDelete={async () => {
                await onSessionDeleted();
                toast.success("场次已删除（删除状态已持久化）");
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
          <SaveStatusPill status={status} />
          {status === "saved" && editor.lastSavedAt && (
            <span className="text-xs text-slate-400">最近提交 {relativeTime(editor.lastSavedAt)}</span>
          )}
          {editor.errorMessage && <span className="text-xs text-rose-500">{editor.errorMessage}</span>}
          {load.restoredDraft && status === "dirty" && (
            <span className="text-xs text-brand-600">
              已从本机草稿恢复（基于 v{load.restoredDraft.baseVersion}，{relativeTime(load.restoredDraft.updatedAt)}）
              <button onClick={editor.discardRestored} className="ml-2 underline decoration-dotted">
                丢弃草稿，用服务器版本
              </button>
            </span>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">脚本标题</label>
        <input
          value={title}
          onChange={(e) => editor.editTitle(e.target.value)}
          readOnly={!canWrite}
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 read-only:bg-slate-50 read-only:text-slate-500"
        />

        <div className="mt-5 flex gap-5">
          <ol className="w-52 shrink-0 space-y-1.5">
            {steps.map((s, i) => (
              <li key={s.id}>
                <button
                  onClick={() => goStep(i + 1)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition ${
                    i === activeStepIndex
                      ? "bg-brand-50 font-medium text-brand-700 ring-1 ring-brand-100"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                      i === activeStepIndex ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{s.title || `步骤 ${i + 1}`}</span>
                </button>
              </li>
            ))}
            {canWrite && (
              <li>
                <button
                  onClick={() =>
                    editor.editSteps((prev) => [
                      ...prev,
                      { id: `step-${Date.now()}`, title: `步骤 ${prev.length + 1}`, content: "" } satisfies ScriptStep
                    ])
                  }
                  className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400 transition hover:border-brand-400 hover:text-brand-500"
                >
                  + 添加步骤
                </button>
              </li>
            )}
          </ol>

          <div className="min-w-0 flex-1">
            {activeStep && (
              <div key={activeStep.id} className="animate-fade-in-up">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    第 {activeStepIndex + 1} / {steps.length} 步
                  </span>
                  {canWrite && steps.length > 1 && (
                    <button
                      onClick={() => {
                        const remaining = steps.length - 1;
                        editor.editSteps((prev) => prev.filter((x) => x.id !== activeStep.id));
                        if (remaining > 0) {
                          // 删除当前步后，地址栏收敛到合法范围：最后一步被删则回退一步
                          goStep(Math.min(activeStepIndex + 1, remaining));
                        }
                      }}
                      className="text-xs text-rose-400 transition hover:text-rose-600"
                    >
                      删除此步
                    </button>
                  )}
                </div>
                <input
                  value={activeStep.title}
                  onChange={(e) =>
                    editor.editSteps((prev) =>
                      prev.map((x) => (x.id === activeStep.id ? { ...x, title: e.target.value } : x))
                    )
                  }
                  readOnly={!canWrite}
                  placeholder="步骤标题"
                  className="mb-2 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 read-only:bg-slate-50"
                />
                <textarea
                  value={activeStep.content}
                  onChange={(e) =>
                    editor.editSteps((prev) =>
                      prev.map((x) => (x.id === activeStep.id ? { ...x, content: e.target.value } : x))
                    )
                  }
                  readOnly={!canWrite}
                  rows={10}
                  placeholder="撰写这一步的镜头、台词或执行说明…"
                  className="w-full resize-y rounded-lg border border-slate-200 px-3.5 py-3 text-sm leading-7 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 read-only:bg-slate-50"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <VersionHistoryPanel projectId={projectId} sessionId={sessionId} currentVersion={load.serverVersion} />
        <SnapshotPanel projectId={projectId} sessionId={sessionId} canWrite={canWrite} />
      </div>

      {conflict && editor.conflictDialogOpen && (
        <ConflictDialog
          conflict={conflict}
          onUseServer={editor.resolveUseServer}
          onOverwrite={editor.resolveOverwrite}
          onKeepLocal={editor.dismissConflictDialog}
        />
      )}
      {conflict && !editor.conflictDialogOpen && status === "conflict" && (
        <div className="fixed bottom-5 right-5 z-[70] animate-fade-in-up rounded-xl border border-rose-200 bg-white px-4 py-3 shadow-pop">
          <p className="text-xs font-medium text-rose-600">存在未解决的保存冲突</p>
          <p className="mt-1 text-[11px] text-slate-400">你的本地稿与服务器版本不一致，系统不会自动覆盖任何一版。</p>
          <button onClick={editor.reopenConflict} className="mt-2 text-xs font-medium text-brand-600 hover:underline">
            重新查看冲突 →
          </button>
        </div>
      )}
    </div>
  );
}

function SaveStatusPill({ status }: { status: keyof typeof saveStatusUI }) {
  const ui = saveStatusUI[status] ?? saveStatusUI.idle;
  return (
    <span className="flex items-center gap-2 text-xs font-medium">
      {status === "saving" ? (
        <Spinner className="h-4 w-4 text-brand-500" />
      ) : (
        <span
          className={`h-2 w-2 rounded-full ${
            ui.tone === "green"
              ? "bg-emerald-500"
              : ui.tone === "amber"
                ? "bg-amber-500"
                : ui.tone === "rose"
                  ? "bg-rose-500"
                  : ui.tone === "blue"
                    ? "bg-brand-500 animate-pulse"
                    : "bg-slate-300"
          }`}
        />
      )}
      <span
        className={
          ui.tone === "green"
            ? "text-emerald-600"
            : ui.tone === "amber"
              ? "text-amber-600"
              : ui.tone === "rose"
                ? "text-rose-600"
                : "text-slate-500"
        }
      >
        {ui.text}
      </span>
    </span>
  );
}

function DeleteSessionButton({ canWrite, onDelete }: { canWrite: boolean; onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (!canWrite) return null;
  return (
    <Button
      variant="danger"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("确定删除该场次？删除状态会被持久化记录，左侧与深链接将无法再打开它。")) return;
        setBusy(true);
        try {
          await onDelete();
        } catch (err) {
          toast.error(getApiError(err).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Spinner className="h-4 w-4" /> : "删除场次"}
    </Button>
  );
}
