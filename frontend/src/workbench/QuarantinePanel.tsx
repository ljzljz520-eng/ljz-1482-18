import { useState } from "react";
import toast from "react-hot-toast";
import { quarantine } from "@/lib/draftStore";
import { relativeTime } from "@/lib/format";
import { Badge, Button } from "@/components/ui";

const reasonText: Record<string, string> = {
  FORBIDDEN: "权限被收回",
  NOT_FOUND: "场次已删除",
  RETIRED: "项目已退役",
  SESSION_GONE: "场次不存在",
  MIGRATED_AWAY: "节点已迁移"
};

/**
 * 权限收回 / 节点删除时本地草稿的归宿：
 * 进入隔离区，只保留在本机，用户可自行查看或删除，绝不注入无权限页面。
 */
export function QuarantinePanel({ projectId }: { projectId: string }) {
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const items = quarantine.list().filter((q) => q.projectId === projectId);
  void version;

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-medium text-amber-800">
          🔒 被隔离的本地草稿（{items.length}）
        </span>
        <span className="text-xs text-amber-600">{open ? "收起" : "展开"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {items.map((q) => (
            <div key={`${q.projectId}:${q.sessionId}`} className="rounded-lg bg-white/80 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-700">{q.title}</span>
                <Badge tone="amber">{reasonText[q.reason] ?? q.reason}</Badge>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                场次 {q.sessionId} · 基于 v{q.baseVersion} · 隔离于 {relativeTime(q.quarantinedAt)}
              </p>
              {q.detail && <p className="mt-1 text-[11px] text-slate-500">{q.detail}</p>}
              <div className="mt-2 flex gap-2">
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-[11px]"
                  onClick={() => {
                    navigator.clipboard?.writeText(JSON.stringify(q.steps, null, 2));
                    toast.success("草稿步骤 JSON 已复制，可自行留存");
                  }}
                >
                  复制内容
                </Button>
                <Button
                  variant="danger"
                  className="px-2 py-1 text-[11px]"
                  onClick={() => {
                    quarantine.remove(q.projectId, q.sessionId);
                    setVersion((v) => v + 1);
                    toast.success("已删除隔离草稿");
                  }}
                >
                  彻底删除
                </Button>
              </div>
            </div>
          ))}
          <p className="pt-1 text-[11px] leading-5 text-amber-700/80">
            这些内容因你不再具备该项目/场次的访问条件而被隔离。即使恢复成员身份，也需你手动决定如何处理，系统不会自动写回服务器。
          </p>
        </div>
      )}
    </div>
  );
}
