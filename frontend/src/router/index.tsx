import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import { WorkbenchLayout } from "@/workbench/WorkbenchLayout";
import { ProjectHome } from "@/workbench/ProjectHome";
import { SessionView } from "@/workbench/SessionView";
import { MaterialView } from "@/workbench/MaterialView";
import { SnapshotView } from "@/workbench/SnapshotView";
import { LegacyRedirect } from "@/workbench/LegacyRedirect";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Dashboard />
      </RequireAuth>
    )
  },
  {
    path: "/projects/:projectId",
    element: (
      <RequireAuth>
        <WorkbenchLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <ProjectHome /> },
      { path: "sessions/:sessionId", element: <SessionView /> },
      { path: "materials/:materialId", element: <MaterialView /> }
    ]
  },
  {
    // 旧节点深链接：由后端迁移记录决定重定向 / 删除 / 授权失效
    path: "/projects/:projectId/legacy/:legacyNodeId",
    element: (
      <RequireAuth>
        <LegacyRedirect />
      </RequireAuth>
    )
  },
  {
    // 历史导出快照（只读，永远停在绑定版本）
    path: "/projects/:projectId/snapshots/:snapshotId",
    element: (
      <RequireAuth>
        <SnapshotView />
      </RequireAuth>
    )
  },
  { path: "*", element: <NotFound /> }
]);

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-5xl">🧭</div>
      <h1 className="text-xl font-semibold text-slate-800">页面不存在</h1>
      <p className="max-w-sm text-sm leading-6 text-slate-500">
        请检查链接是否完整。深链接需要包含项目、场次/素材或快照标识。
      </p>
      <a
        href="/"
        className="mt-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
      >
        返回首页
      </a>
    </div>
  );
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export { Navigate };
