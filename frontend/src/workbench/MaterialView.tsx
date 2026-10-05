import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/api";
import { getApiError } from "@/api/client";
import type { Material } from "@/api/types";
import { useWorkbenchStore } from "@/stores/workbenchStore";
import { Badge, Button, Card, KindTag, Skeleton, Spinner } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

const kindIcon: Record<string, string> = {
  VIDEO: "🎬",
  AUDIO: "🎧",
  IMAGE: "🖼️",
  DOCUMENT: "📄"
};

/**
 * 素材深链接视图：/projects/:projectId/materials/:materialId
 * 后端按 (projectId, materialId, 未删除) 校验；
 * 跨项目猜 ID、已软删除素材一律 404。
 */
export function MaterialView() {
  const { projectId = "", materialId = "" } = useParams();
  const removeMaterial = useWorkbenchStore((s) => s.removeMaterial);
  const project = useWorkbenchStore((s) => s.data?.project);
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getMaterial(projectId, materialId)
      .then((m) => {
        if (!cancelled) setMaterial(m);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        setError({
          code: status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "ERROR",
          message: getApiError(err).message
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, materialId]);

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="mt-4 h-48 w-full" />
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Spinner className="h-4 w-4 text-brand-500" /> 正在校验素材归属项目…
        </div>
      </Card>
    );
  }

  if (error || !material) {
    const denied = error?.code === "FORBIDDEN" || error?.code === "NOT_FOUND";
    return (
      <Card className="p-10 text-center">
        <div className="mb-3 text-4xl">{denied ? "🔗" : "⚠️"}</div>
        <h2 className="text-lg font-semibold text-slate-800">
          {error?.code === "FORBIDDEN" ? "无权访问该素材" : "素材不存在或已删除"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{error?.message}</p>
        <p className="mx-auto mt-3 max-w-md rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-400">
          素材必须属于当前项目、且未被删除才能打开。即使猜到其他项目的素材 ID，后端同样返回不存在。
        </p>
        <div className="mt-5">
          <Link to={`/projects/${projectId}`}>
            <Button variant="secondary">返回项目概览</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const canWrite = !!project && project.myRole !== "VIEWER" && project.status === "ACTIVE";

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-3xl">
              {kindIcon[material.kind]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{material.name}</h2>
                <KindTag kind={material.kind} />
              </div>
              <p className="mt-1 break-all text-xs text-slate-400">{material.url}</p>
              <p className="mt-1 text-xs text-slate-400">登记于 {formatDateTime(material.createdAt)}</p>
            </div>
          </div>
          {canWrite && (
            <Button
              variant="danger"
              disabled={deleting}
              onClick={async () => {
                if (!window.confirm("删除后该素材深链接将失效，删除状态会持久保存。确定？")) return;
                setDeleting(true);
                try {
                  await api.deleteMaterial(projectId, material.id);
                  removeMaterial(material.id);
                  toast.success("素材已删除（软删除，状态已持久化）");
                } catch (err) {
                  toast.error(getApiError(err).message);
                  setDeleting(false);
                }
              }}
            >
              {deleting ? <Spinner className="h-4 w-4" /> : "删除素材"}
            </Button>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/60 p-5">
          {material.kind === "IMAGE" ? (
            <img
              src={material.url}
              alt={material.name}
              className="mx-auto max-h-72 rounded-lg bg-white object-contain"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="text-5xl">{kindIcon[material.kind]}</div>
              <p className="text-xs text-slate-400">演示素材地址为占位 URL，真实环境此处为播放器 / 预览器</p>
              <a
                href={material.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-brand-400 hover:text-brand-600"
              >
                在新窗口打开
              </a>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Badge tone="slate">深链接定位</Badge>
          <span className="break-all">
            /projects/{projectId}/materials/{material.id}
          </span>
        </div>
      </Card>
    </div>
  );
}
