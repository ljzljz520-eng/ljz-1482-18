import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/api";
import { getApiError, resetExpiredFlag } from "@/api/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui";

const DEMO = [
  { email: "admin@yunxi.test", name: "负责人 · 全权限", role: "OWNER" },
  { email: "editor@yunxi.test", name: "编导 · 可编辑", role: "EDITOR" },
  { email: "viewer@yunxi.test", name: "审阅 · 只读", role: "VIEWER" },
  { email: "outsider@yunxi.test", name: "外部成员 · 看不到云溪项目", role: "—" }
];

export default function Login() {
  const [email, setEmail] = useState("admin@yunxi.test");
  const [password, setPassword] = useState("123456");
  const [submitting, setSubmitting] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo");

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !password) {
      toast.error("请输入邮箱和密码");
      return;
    }
    setSubmitting(true);
    try {
      const { token, user } = await api.login(email.trim(), password);
      resetExpiredFlag();
      setSession(token, user);
      toast.success(`欢迎回来，${user.name}`);
      // 仅接受站内相对路径，防止 returnTo 被构造成外链
      const safe = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
      navigate(safe, { replace: true });
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-pop backdrop-blur md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-500 via-indigo-500 to-violet-600 p-9 text-white md:flex">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-base font-bold">云</span>
              <span className="text-lg font-semibold">云溪创作工作台</span>
            </div>
            <h1 className="mt-12 text-3xl font-bold leading-snug">
              深链接直达场次与素材
              <br />
              权限收回也能安全恢复
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/80">
              路由守卫只负责等待与提示；每一个读写接口都在后端校验「资源是否属于你有权访问的项目」。
              猜到 ID，也拿不到内容。
            </p>
          </div>
          <ul className="space-y-2 text-sm text-white/85">
            <li>· 本地草稿先验证访问、后恢复</li>
            <li>· 异步导航按目标代次隔离</li>
            <li>· 保存竞争区分已提交 / 待同步 / 冲突</li>
            <li>· 历史导出链接永远停在它的快照</li>
          </ul>
        </div>

        <form onSubmit={submit} className="flex flex-col justify-center gap-4 p-9">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">登录工作台</h2>
            <p className="mt-1 text-sm text-slate-500">演示账号密码均为 123456</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">邮箱</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
              placeholder="name@yunxi.test"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">密码</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
              placeholder="••••••"
            />
          </label>
          {returnTo && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs leading-5 text-brand-700">
              登录后将回到你刚才访问的地址：<span className="break-all font-medium">{returnTo}</span>
            </p>
          )}
          <Button type="submit" disabled={submitting} className="mt-1 w-full py-2.5">
            {submitting ? "登录中…" : "登 录"}
          </Button>

          <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">一键填充演示账号</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO.map((d) => (
                <button
                  type="button"
                  key={d.email}
                  onClick={() => setEmail(d.email)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-[11px] leading-4 text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
                >
                  <span className="block font-medium">{d.name}</span>
                  <span className="text-slate-400">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
