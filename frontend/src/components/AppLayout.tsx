import { type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function AppLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white">
              云
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-slate-800">云溪创作工作台</span>
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-medium text-slate-700">{user.name}</p>
                  <p className="text-[11px] text-slate-400">{user.email}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-medium text-brand-600">
                  {user.name.slice(0, 1)}
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  退出
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200/70 bg-white/60 py-4 text-center text-xs text-slate-400">
        云溪创作工作台 · 导航守卫仅负责体验，所有资源读写均以后端项目级鉴权为准
      </footer>
    </div>
  );
}
