import { useState, type FormEvent } from "react";
import { z } from "zod";
import type { MaterialKind } from "@/api/types";
import { Button } from "@/components/ui";

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md animate-fade-in-up rounded-2xl bg-white p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-slate-800">{title}</h3>
        {children}
      </div>
    </div>
  );
}

const titleSchema = z.string().min(1, "请填写标题").max(120);

export function CreateSessionDialog({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (title: string, summary: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const check = titleSchema.safeParse(title);
    if (!check.success) {
      setErr(check.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onCreated(title.trim(), summary.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="新建场次" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="场次标题，例如：开幕大秀 · 第二幕"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="一句话描述（可选）"
          className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
        {err && <p className="text-xs text-rose-500">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "创建中…" : "创建"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const materialSchema = z.object({
  name: z.string().min(1, "请填写素材名称").max(120),
  url: z.string().url("请输入合法的素材 URL")
});

const KINDS: { value: MaterialKind; label: string }[] = [
  { value: "VIDEO", label: "视频" },
  { value: "AUDIO", label: "音频" },
  { value: "IMAGE", label: "图片" },
  { value: "DOCUMENT", label: "文档" }
];

export function CreateMaterialDialog({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (payload: { name: string; kind: MaterialKind; url: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<MaterialKind>("VIDEO");
  const [url, setUrl] = useState("https://example.com/assets/");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const check = materialSchema.safeParse({ name, url });
    if (!check.success) {
      setErr(check.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onCreated({ name: name.trim(), kind, url: url.trim() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="登记素材" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="素材名称，例如：灯光秀终版.mp4"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
        <div className="flex gap-2">
          {KINDS.map((k) => (
            <button
              type="button"
              key={k.value}
              onClick={() => setKind(k.value)}
              className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                kind === k.value
                  ? "border-brand-500 bg-brand-50 text-brand-600"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
        {err && <p className="text-xs text-rose-500">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "提交中…" : "登记"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
