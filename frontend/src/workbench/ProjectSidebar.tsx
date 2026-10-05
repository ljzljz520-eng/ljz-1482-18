import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useWorkbenchStore } from "@/stores/workbenchStore";
import { api } from "@/api";
import { getApiError } from "@/api/client";
import { Badge, Button, KindTag } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { CreateSessionDialog, CreateMaterialDialog } from "./CreateDialogs";
import { QuarantinePanel } from "./QuarantinePanel";

const statusLabel: Record<string, { text: string; tone: "slate" | "blue" | "violet" }> = {
  DRAFT: { text: "草稿", tone: "slate" },
  ACTIVE: { text: "进行中", tone: "blue" },
  ARCHIVED: { text: "已归档", tone: "violet" }
};

export function ProjectSidebar() {
  const { projectId = "", sessionId, materialId } = useParams();
  const data = useWorkbenchStore((s) => s.data);
  const upsertSession = useWorkbenchStore((s) => s.upsertSession);
  const upsertMaterial = useWorkbenchStore((s) => s.upsertMaterial);
  const user = useAuthStore((s) => s.user);
  const [showSession, setShowSession] = useState(false);
  const [showMaterial, setShowMaterial] = useState(false);

  if (!data) return null;
  const canWrite = data.project.myRole !== "VIEWER" && data.project.status === "ACTIVE";
  const myMember = data.project.members.find((m) => m.user.id === user?.id);

  return (
    <aside className="space-y-4">
      <nav className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">场次（{data.sessions.length}）</h2>
          {canWrite && (
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setShowSession(true)}>
              + 新建
            </Button>
          )}
        </div>
        <ul className="max-h-72 overflow-y-auto p-2">
          {data.sessions.map((s) => {
            const active = s.id === sessionId;
            const meta = statusLabel[s.status] ?? statusLabel.DRAFT;
            return (
              <li key={s.id}>
                <Link
                  to={`/projects/${projectId}/sessions/${s.id}`}
                  className={`block rounded-lg px-3 py-2.5 transition ${
                    active ? "bg-brand-50 ring-1 ring-brand-100" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`min-w-0 flex-1 truncate text-[13px] font-medium ${active ? "text-brand-700" : "text-slate-700"}`}>
                      {s.title}
                    </span>
                    <Badge tone={meta.tone}>{meta.text}</Badge>
                  </div>
                  {s.summary && <p className="mt-0.5 truncate text-[11px] text-slate-400">{s.summary}</p>}
                </Link>
              </li>
            );
          })}
          {data.sessions.length === 0 && <li className="px-3 py-6 text-center text-xs text-slate-400">暂无场次</li>}
        </ul>
      </nav>

      <nav className="rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">素材（{data.materials.length}）</h2>
          {canWrite && (
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setShowMaterial(true)}>
              + 上传
            </Button>
          )}
        </div>
        <ul className="max-h-72 overflow-y-auto p-2">
          {data.materials.map((m) => {
            const active = m.id === materialId;
            return (
              <li key={m.id}>
                <Link
                  to={`/projects/${projectId}/materials/${m.id}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${
                    active ? "bg-brand-50 ring-1 ring-brand-100" : "hover:bg-slate-50"
                  }`}
                >
                  <KindTag kind={m.kind} />
                  <span className={`min-w-0 flex-1 truncate text-[12px] ${active ? "text-brand-700" : "text-slate-600"}`}>
                    {m.name}
                  </span>
                </Link>
              </li>
            );
          })}
          {data.materials.length === 0 && <li className="px-3 py-6 text-center text-xs text-slate-400">暂无素材</li>}
        </ul>
      </nav>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">项目成员与权限</h2>
        <ul className="space-y-1.5">
          {data.project.members.map((m) => (
            <li key={m.user.id} className="flex items-center gap-2 text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-500">
                {m.user.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-600">
                {m.user.name}
                {m.user.id === user?.id && <span className="text-slate-400">（我）</span>}
              </span>
              <Badge tone={m.role === "OWNER" ? "violet" : m.role === "EDITOR" ? "blue" : "slate"}>
                {m.role === "OWNER" ? "所有者" : m.role === "EDITOR" ? "可编辑" : "只读"}
              </Badge>
            </li>
          ))}
        </ul>
        {myMember && (
          <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-5 text-slate-500">
            你的所有读写请求都会由后端按此项目的成员角色再次校验；前端禁用按钮只是体验优化。
          </p>
        )}
      </div>

      <QuarantinePanel projectId={projectId} />

      {showSession && (
        <CreateSessionDialog
          onClose={() => setShowSession(false)}
          onCreated={async (title, summary) => {
            try {
              const { session } = await api.createSession(projectId, title, summary || undefined);
              upsertSession(session);
              setShowSession(false);
              toast.success("场次已创建");
            } catch (err) {
              toast.error(getApiError(err).message);
            }
          }}
        />
      )}
      {showMaterial && (
        <CreateMaterialDialog
          onClose={() => setShowMaterial(false)}
          onCreated={async (payload) => {
            try {
              const { material } = await api.createMaterial(projectId, payload);
              upsertMaterial(material);
              setShowMaterial(false);
              toast.success("素材已登记");
            } catch (err) {
              toast.error(getApiError(err).message);
            }
          }}
        />
      )}
    </aside>
  );
}
