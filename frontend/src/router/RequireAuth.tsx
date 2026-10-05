import { type ReactNode, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Spinner } from "@/components/ui";

/**
 * 路由守卫 —— 只负责「体验」：
 * 未登录时重定向到 /login 并记住目标地址；已登录则放行。
 * 它不做任何项目/资源授权判断（真正的授权在后端每个接口里）。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);
  const location = useLocation();

  const returnTo = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search]
  );

  if (initializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-500">
        <Spinner className="h-7 w-7 text-brand-500" />
        <p className="text-sm">正在恢复登录会话…</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
