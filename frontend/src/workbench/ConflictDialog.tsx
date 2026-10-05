import { useState } from "react";
import type { ConflictState } from "./useScriptEditor";
import { Badge, Button } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

/**
 * 保存冲突对话框。
 * 三态决策显式呈现：
 *  - 已提交：服务器版本（只读展示）
 *  - 待同步：用户本地未提交稿
 *  - 冲突：两者基于不同版本
 * 任何导航/自动流程都不会触发「覆盖服务器新稿」，覆盖只能由用户在此显式点按。
 */
export function ConflictDialog({
  conflict,
  onUseServer,
  onOverwrite,
  onKeepLocal
}: {
  conflict: ConflictState;
  onUseServer: () => void;
  onOverwrite: () => void;
  onKeepLocal: () => void;
}) {
  const [tab, setTab] = useState<"server" | "local">("server");
  const shown = tab === "server" ? { title: conflict.serverTitle, steps: conflict.serverSteps } : conflict.pending;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-2xl animate-fade-in-up flex-col overflow-hidden rounded-2xl bg-white shadow-pop">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <h3 className="text-base font-semibold text-slate-800">保存冲突：服务器上已有更新的稿件</h3>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            你的本地稿基于较早版本，另一位协作者已经提交了
            <Badge tone="blue" className="mx-1">v{conflict.serverVersion}</Badge>
            {conflict.serverUpdatedAt && `（${formatDateTime(conflict.serverUpdatedAt)}）`}
            。系统不会替你覆盖任何一版，请选择处理方式。
          </p>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-4 pt-3">
          <TabButton active={tab === "server"} onClick={() => setTab("server")}>
            服务器新稿（已提交 v{conflict.serverVersion}）
          </TabButton>
          <TabButton active={tab === "local"} onClick={() => setTab("local")}>
            我的本地稿（待同步）
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="mb-2 text-sm font-medium text-slate-700">{shown.title || "（无标题）"}</p>
          <ol className="space-y-2">
            {shown.steps.map((step, i) => (
              <li key={step.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                <p className="text-xs font-semibold text-slate-600">
                  {i + 1}. {step.title}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">{step.content}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <p className="text-[11px] leading-4 text-slate-400">
            「覆盖」会以你的本地稿生成新版本，服务器当前内容仍保留在版本历史中可回溯。
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onKeepLocal}>
              暂不处理，保留本地
            </Button>
            <Button variant="secondary" onClick={onUseServer}>
              采用服务器版
            </Button>
            <Button variant="warning" onClick={onOverwrite}>
              用我的本地稿覆盖
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-t-lg px-3.5 py-2 text-xs font-medium transition ${
        active ? "bg-white text-brand-600 shadow-[0_-1px_0_#e2e8f0_inset]" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
