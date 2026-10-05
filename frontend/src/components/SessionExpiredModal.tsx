import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetExpiredFlag, SESSION_EXPIRED_EVENT } from "@/api/client";

/**
 * 登录会话过期：全局浮层接管。
 * 保存当前地址，重新登录后回到原深链接（仍会重新走后端鉴权，猜 ID 不能绕过）。
 */
export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ returnTo: string }>).detail;
      setReturnTo(detail?.returnTo ?? `${location.pathname}${location.search}`);
      setOpen(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [location.pathname, location.search]);

  if (!open) return null;

  const goLogin = () => {
    resetExpiredFlag();
    setOpen(false);
    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-fade-in-up rounded-2xl bg-white p-7 text-center shadow-pop">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl">
          🔐
        </div>
        <h2 className="text-lg font-semibold text-slate-800">登录状态已过期</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          为保证项目安全，需要重新验证身份。未同步的本地修改已保留在本机，重新登录后可继续处理。
        </p>
        <button
          onClick={goLogin}
          className="mt-6 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          重新登录
        </button>
      </div>
    </div>
  );
}
