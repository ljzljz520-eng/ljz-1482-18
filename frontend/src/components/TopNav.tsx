import { Link } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';

export default function TopNav() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" to="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200">云</span>
          <span>
            <span className="block text-sm font-bold leading-4 text-slate-950">云溪创作工作台</span>
            <span className="text-xs text-slate-500">导航 · 授权 · 版本恢复</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link className="hidden rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:block" to="/">项目</Link>
          {user && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{user.displayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          )}
          <button onClick={logout} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">退出</button>
        </nav>
      </div>
    </header>
  );
}
