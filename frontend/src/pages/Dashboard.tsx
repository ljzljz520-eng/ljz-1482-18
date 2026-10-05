import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/api";
import { getApiError } from "@/api/client";
import type { ProjectSummary } from "@/api/types";
import { AppLayout } from "@/components/AppLayout";
import { Badge, Card, EmptyState, Skeleton, Spinner, roleLabel } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { quarantine } from "@/lib/draftStore";

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retiring, setRetiring] = useState<string | null>(null);
  const quarantined = useMemo(() => quarantine.list(), []);

  const load = async () => {
    try {
      setProjects(await api.listProjects());
      setError(null);
    } catch (err) {
      setError(getApiError(err).message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleRetire = async (p: ProjectSummary) => {
    setRetiring(p.id);
    try {
      if (p.status === "ACTIVE") {
        await api.retireProject(p.id);
        toast.success(`「${p.name}」已退役，项目变为只读`);
      } else {
        await api.reactivateProject(p.id);
        toast.success(`「${p.name}」已恢复`);
      }
      await load();
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setRetiring(null);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">我的项目</h1>
            <p className="mt-1 text-sm text-slate-500">只列出你拥有成员身份的项目；非成员通过链接访问会被后端拒绝。</p>
          </div>
          {quarantined.length > 0 && (
            <Badge tone="amber">有 {quarantined.length} 份因权限收回被隔离的本地草稿</Badge>
          )}
        </div>

        {error && (
          <Card className="mb-5 border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-600">
            加载失败：{error}
            <button onClick={() => void load()} className="ml-3 font-medium underline">重试</button>
          </Card>
        )}

        {!projects && !error && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-4/5" />
                <div className="mt-5 flex gap-2">
                  <Skeleton className="h-6 w-14 rounded-full" />
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {projects && projects.length === 0 && (
          <EmptyState title="还没有可访问的项目" hint="项目仅对成员可见。可换用 admin / editor 账号登录体验。" icon="📁" />
        )}

        {projects && projects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.id} className="group flex flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-pop">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/projects/${p.id}`} className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold text-slate-800 group-hover:text-brand-600">
                      {p.name}
                    </h2>
                  </Link>
                  {p.status === "RETIRED" ? <Badge tone="amber">已退役</Badge> : <Badge tone="green">进行中</Badge>}
                </div>
                <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-slate-500">{p.description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge tone="blue">{roleLabel(p.myRole)}</Badge>
                  <Badge>版本 v{p.version}</Badge>
                  <span className="ml-auto text-[11px] text-slate-400">{formatDateTime(p.updatedAt)}</span>
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                  <Link
                    to={`/projects/${p.id}`}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                  >
                    进入工作台
                  </Link>
                  {p.myRole === "OWNER" && (
                    <button
                      onClick={() => void toggleRetire(p)}
                      disabled={retiring === p.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-amber-300 hover:text-amber-600 disabled:opacity-50"
                    >
                      {retiring === p.id && <Spinner className="h-3.5 w-3.5" />}
                      {p.status === "ACTIVE" ? "演示退役" : "恢复项目"}
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
