import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type StateViewProps = {
  tone?: 'error' | 'warning' | 'info' | 'locked';
  title: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
};

const toneClass = {
  error: 'bg-rose-50 text-rose-600 border-rose-100',
  warning: 'bg-amber-50 text-amber-600 border-amber-100',
  info: 'bg-blue-50 text-blue-600 border-blue-100',
  locked: 'bg-slate-100 text-slate-600 border-slate-200'
};

export default function StateView({ tone = 'info', title, description, children, action }: StateViewProps) {
  return (
    <section className={`rounded-3xl border p-8 sm:p-10 ${toneClass[tone]} bg-white`}>
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-lg font-bold ${toneClass[tone]}`}>!</div>
      <h2 className="mt-5 text-2xl font-bold text-slate-950">{title}</h2>
      {description && <p className="mt-3 max-w-2xl leading-7 text-slate-600">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
      {action ?? <Link className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700" to="/">返回项目列表</Link>}
    </section>
  );
}

export function LoadingPanel({ title = '正在验证项目访问并加载工作台…' }: { title?: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">权限未确认前不会展示本地草稿或服务器脚本。</p>
        </div>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    </section>
  );
}
