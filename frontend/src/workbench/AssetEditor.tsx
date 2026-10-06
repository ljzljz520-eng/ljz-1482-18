import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { assetApi, getApiErrorMessage } from '../api';
import type { AssetInfo, AssetType } from '../types';
import StateView, { LoadingPanel } from '../components/StateView';
import { useWorkbench } from './workbenchContext';

const types: AssetType[] = ['IMAGE', 'AUDIO', 'VIDEO', 'TEXT'];

export default function AssetEditor() {
  const { projectId = '', assetId = '' } = useParams();
  const { bootstrap } = useWorkbench();
  const fallback = bootstrap.assets.find((item) => item.id === assetId);
  const [asset, setAsset] = useState<AssetInfo | null>(fallback ?? null);
  const [name, setName] = useState(fallback?.name ?? '');
  const [url, setUrl] = useState(fallback?.url ?? '');
  const [notes, setNotes] = useState(fallback?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readonly = bootstrap.project.role === 'VIEWER' || bootstrap.retired || bootstrap.requiresMigration;

  useEffect(() => {
    if (fallback) {
      setAsset(fallback);
      setName(fallback.name);
      setUrl(fallback.url);
      setNotes(fallback.notes);
      return;
    }
    const controller = new AbortController();
    let alive = true;
    assetApi.get(projectId, assetId, controller.signal)
      .then((data) => {
        if (!alive) return;
        setAsset(data); setName(data.name); setUrl(data.url); setNotes(data.notes);
      })
      .catch((err) => alive && setError(getApiErrorMessage(err, '素材加载失败')));
    return () => { alive = false; controller.abort(); };
  }, [assetId, fallback, projectId]);

  async function save() {
    if (!asset) return;
    setSaving(true);
    try {
      const updated = await assetApi.update(projectId, assetId, { name, url, notes });
      setAsset(updated);
      toast.success('素材信息已提交');
    } catch (err) {
      toast.error(getApiErrorMessage(err, '素材保存失败'));
    } finally {
      setSaving(false);
    }
  }

  if (!asset && !error) return <LoadingPanel title="正在定位素材…" />;
  if (error || !asset) return <StateView tone="error" title="素材深链接不可用" description={error || '素材可能已删除或不属于该项目。'} />;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="min-h-[280px] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-8">
          <p className="text-sm uppercase tracking-widest text-blue-200">{asset.type}</p>
          <h2 className="mt-3 text-3xl font-bold text-white">{asset.name}</h2>
          <p className="mt-4 break-all font-mono text-xs text-blue-100/70">{asset.url}</p>
        </div>
        <div className="p-6">
          <p className="text-sm leading-7 text-slate-600">{asset.notes || '暂无素材说明。'}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">素材属性</h3>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">后端校验资源所属项目</span>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-700">
          类型
          <select disabled value={asset.type} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 disabled:bg-slate-50">
            {types.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          名称
          <input disabled={readonly} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 disabled:bg-slate-50" />
        </label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          URL
          <input disabled={readonly} value={url} onChange={(event) => setUrl(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs disabled:bg-slate-50" />
        </label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          备注
          <textarea disabled={readonly} value={notes} onChange={(event) => setNotes(event.target.value)} rows={6} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 disabled:bg-slate-50" />
        </label>
        {!readonly && (
          <button onClick={save} disabled={saving} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            {saving ? '提交中…' : '保存素材'}
          </button>
        )}
        {readonly && <p className="mt-5 rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">当前角色、退役状态或模块迁移状态不允许写入。</p>}
      </section>
    </div>
  );
}
