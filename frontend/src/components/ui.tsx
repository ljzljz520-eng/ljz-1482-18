import { type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "warning";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-slate-300 shadow-sm shadow-brand-500/20",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:border-brand-500 hover:text-brand-600 active:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
  danger: "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:bg-rose-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
};

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
        variants[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "slate",
  className
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "amber" | "rose" | "blue" | "violet";
  className?: string;
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    rose: "bg-rose-50 text-rose-700 border border-rose-200",
    blue: "bg-brand-50 text-brand-600 border border-brand-100",
    violet: "bg-violet-50 text-violet-700 border border-violet-200"
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-2xl border border-slate-200/80 bg-white shadow-card", className)}>
      {children}
    </section>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx("animate-spin", className)} width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-lg", className)} />;
}

const kindStyles: Record<string, string> = {
  VIDEO: "bg-rose-50 text-rose-600",
  AUDIO: "bg-violet-50 text-violet-600",
  IMAGE: "bg-sky-50 text-sky-600",
  DOCUMENT: "bg-amber-50 text-amber-600"
};
const kindLabel: Record<string, string> = { VIDEO: "视频", AUDIO: "音频", IMAGE: "图片", DOCUMENT: "文档" };

export function KindTag({ kind }: { kind: string }) {
  return (
    <span className={clsx("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", kindStyles[kind] ?? kindStyles.DOCUMENT)}>
      {kindLabel[kind] ?? kind}
    </span>
  );
}

export function roleLabel(role: string): string {
  return role === "OWNER" ? "所有者" : role === "EDITOR" ? "可编辑" : "只读";
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <div className="text-3xl text-slate-300">{icon ?? "🗂️"}</div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-5 text-slate-400">{hint}</p>}
    </div>
  );
}
