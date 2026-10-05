import { useEffect, useRef } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { useWorkbenchStore } from "@/stores/workbenchStore";
import { AppLayout } from "@/components/AppLayout";
import { Badge, Button, Spinner } from "@/components/ui";
import { roleLabel } from "@/components/ui";
import { ProjectSidebar } from "./ProjectSidebar";
import { ProjectHeaderMeta } from "./ProjectHeaderMeta";

/**
 * 项目工作台外壳。
 * 引导数据由 workbenchStore 以「目标代次」加载；
 * 快速在两个项目间切换时，上一代请求被 abort 且响应被代次校验丢弃，
 * 因此甲项目的场次/脚本绝不会出现在乙项目页面。
 */
export function WorkbenchLayout() {
  const { projectId = "" } = useParams();
  const status = useWorkbenchStore((s) => s.status);
  const data = useWorkbenchStore((s) => s.data);
  const storeProjectId = useWorkbenchStore((s) => s.projectId);
  const errorCode = useWorkbenchStore((s) => s.errorCode);
  const errorMessage = useWorkbenchStore((s) => s.errorMessage);
  const loadProject = useWorkbenchStore((s) => s.loadProject);
  const reset = useWorkbenchStore((s) => s.reset);
  const requestedRef = useRef<string | null>(null);

  useEffect(() => {
    if (requestedRef.current !== projectId || storeProjectId !== projectId) {
      requestedRef.current = projectId;
      void loadProject(projectId);
    }
    return () => {
      // 离开项目工作台（去首页/别的项目）时复位，避免旧项目骨架闪现
    };
  }, [projectId, loadProject, storeProjectId]);

  useEffect(() => () => reset(), [reset]);

  const loading = status === "loading" || storeProjectId !== projectId;

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-7xl flex-col items-center px-5 py-24">
          <Spinner className="h-7 w-7 text-brand-500" />
          <p className="mt-4 text-sm text-slate-500">正在验证项目访问权限并加载工作台…</p>
          <p className="mt-1 text-xs text-slate-400">先完成访问校验，再恢复你在该项目的本地草稿</p>
        </div>
      </AppLayout>
    );
  }

  if (status === "error" || !data) {
    const denied = errorCode === "FORBIDDEN" || errorCode === "NOT_FOUND";
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-3xl">
            {denied ? "🚫" : "⚠️"}
          </div>
          <h1 className="text-xl font-semibold text-slate-800">
            {denied ? "无法访问该项目" : "工作台加载失败"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{errorMessage}</p>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-400">
            路由守卫只负责体验；即使猜到项目 ID，后端对每个接口都校验项目成员身份，非成员一律拒绝。
            {denied && "你此前在该项目的未同步本地草稿已被隔离保存，不会泄露到当前页面。"}
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/">
              <Button variant="secondary">返回项目列表</Button>
            </Link>
            <Button onClick={() => void loadProject(projectId)}>重新加载</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { project } = data;
  const retired = project.status === "RETIRED";

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-slate-400 transition hover:text-brand-600">
              项目
            </Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{project.name}</h1>
            {retired ? <Badge tone="amber">已退役 · 只读</Badge> : <Badge tone="green">进行中</Badge>}
            <Badge tone="blue">{roleLabel(project.myRole)}</Badge>
          </div>
          <ProjectHeaderMeta />
        </div>

        {retired && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>📦</span>
            <span>
              该项目已退役，场次、素材与脚本均为只读。历史导出链接仍可访问其对应快照，但不会展示最新草稿。
            </span>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <ProjectSidebar />
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
