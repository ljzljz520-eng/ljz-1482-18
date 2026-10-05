import { Link, useParams } from "react-router-dom";
import { useWorkbenchStore } from "@/stores/workbenchStore";
import { Card, EmptyState, KindTag } from "@/components/ui";
import { QuarantinePanel } from "./QuarantinePanel";

export function ProjectHome() {
  const { projectId = "" } = useParams();
  const data = useWorkbenchStore((s) => s.data);
  if (!data) return null;

  const activeSession = data.sessions.find((s) => s.status === "ACTIVE");

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-500/10 via-indigo-500/10 to-violet-500/10 px-6 py-8">
          <h2 className="text-xl font-bold text-slate-800">欢迎进入「{data.project.name}」</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{data.project.description}</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {activeSession ? (
              <Link
                to={`/projects/${projectId}/sessions/${activeSession.id}?step=1`}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
              >
                继续编辑：{activeSession.title}
              </Link>
            ) : data.sessions[0] ? (
              <Link
                to={`/projects/${projectId}/sessions/${data.sessions[0].id}`}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                打开场次：{data.sessions[0].title}
              </Link>
            ) : null}
            {data.materials[0] && (
              <Link
                to={`/projects/${projectId}/materials/${data.materials[0].id}`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
              >
                查看最新素材
              </Link>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">场次速览</h3>
          {data.sessions.length === 0 ? (
            <EmptyState title="暂无场次" />
          ) : (
            <ul className="space-y-1.5">
              {data.sessions.slice(0, 4).map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/projects/${projectId}/sessions/${s.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-slate-50"
                  >
                    <span className="truncate text-[13px] text-slate-700">{s.title}</span>
                    <span className="text-[11px] text-slate-400">{s.status === "ACTIVE" ? "进行中" : s.status === "DRAFT" ? "草稿" : "已归档"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">素材速览</h3>
          {data.materials.length === 0 ? (
            <EmptyState title="暂无素材" />
          ) : (
            <ul className="space-y-1.5">
              {data.materials.slice(0, 4).map((m) => (
                <li key={m.id}>
                  <Link
                    to={`/projects/${projectId}/materials/${m.id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-50"
                  >
                    <KindTag kind={m.kind} />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-slate-600">{m.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <QuarantinePanel projectId={projectId} />
    </div>
  );
}
