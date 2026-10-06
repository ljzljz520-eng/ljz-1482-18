import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from './authStore';

const accounts = [
  { email: 'admin@example.com', label: '项目管理员 / 可迁移与删除' },
  { email: 'lin@example.com', label: '编剧 / 可编辑' },
  { email: 'wang@example.com', label: '审阅 / 只读' }
];

export default function LoginPage() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('123456');
  const { login, authenticating, sessionExpired } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo') || '/';

  useEffect(() => {
    if (sessionExpired) toast.error('登录会话已过期，请重新登录后恢复到原地址');
  }, [sessionExpired]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await login(email, password);
      navigate(returnTo, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录失败');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] overflow-hidden rounded-3xl bg-white shadow-card border border-slate-200/70">
        <div className="hidden lg:flex flex-col justify-between p-10 text-white bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs tracking-widest">CREATIVE WORKBENCH</span>
            <h1 className="mt-8 text-4xl font-bold leading-tight">安全授权后的<br />项目深链接工作台</h1>
            <p className="mt-5 text-blue-100/80 leading-7">先验证项目访问，再恢复本地草稿；导航守卫只负责体验，真正的资源归属校验在每个读写接口完成。</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-blue-100">验收要点</p>
            <ul className="mt-3 space-y-2 text-sm text-blue-50">
              <li>非法深链接与跨项目猜 ID 返回明确错误</li>
              <li>快速切换项目使用目标代次隔离</li>
              <li>保存冲突不会自动覆盖服务器新稿</li>
            </ul>
          </div>
        </div>
        <form onSubmit={onSubmit} className="p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-slate-950">登录</h2>
          <p className="mt-2 text-sm text-slate-500">演示密码均为 <code className="rounded bg-slate-100 px-1.5 py-0.5">123456</code></p>
          <label className="block mt-7 text-sm font-medium text-slate-700">
            邮箱
            <input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label className="block mt-4 text-sm font-medium text-slate-700">
            密码
            <input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          <button disabled={authenticating} className="mt-7 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 active:scale-[0.99] disabled:opacity-60">
            {authenticating ? '登录中…' : '登录并回到目标地址'}
          </button>
          <div className="mt-7 space-y-2">
            {accounts.map((account) => (
              <button type="button" key={account.email} onClick={() => setEmail(account.email)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm transition hover:border-blue-200 hover:bg-blue-50">
                <span className="font-medium text-slate-800">{account.email}</span>
                <span className="ml-2 text-slate-500">{account.label}</span>
              </button>
            ))}
          </div>
          <Link to="/" className="mt-6 inline-block text-sm text-blue-600 hover:text-blue-500">返回项目列表</Link>
        </form>
      </section>
    </main>
  );
}
