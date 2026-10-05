import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import { getApiError } from "@/api/client";
import { AppLayout } from "@/components/AppLayout";
import { Button, Card, Spinner } from "@/components/ui";
import type { LegacyResolution } from "@/api/types";

/**
 * 旧节点深链接入口：/projects/:projectId/legacy/:legacyNodeId
 * 由后端查持久库的模块迁移记录决定走向：
 *  - RESOLVED  : 302 式前端替换到新场次/素材（地址栏更新为新链接）
 *  - DELETED   : 展示「内容已删除」非法深链接页
 *  - REVOKED   : 展示「授权到期 / 已下架」
 *  - 无记录/无权限: 由后端 404 收敛为非法深链接页
 */
export function LegacyRedirect() {
  const { projectId = "", legacyNodeId = "" } = useParams();
  const [state, setState] = useState<"loading" | "gone" | "forbidden" | "invalid" | "redirecting">("loading");
  const [resolution, setResolution] = useState<LegacyResolution | null>(null);
  const [message, setMessage] = useState<string>("");
  const gen = useRef(0);

  useEffect(() => {
    const myGen = ++gen.current;
    const controller = new AbortController();
    setState("loading");
    api
      .resolveLegacy(projectId, decodeURIComponent(legacyNodeId), controller.signal)
      .then((r) => {
        if (myGen !== gen.current) return;
        setResolution(r);
        if (r.resolved && r.newNodeId) {
          setState("redirecting");
          const target =
            r.nodeKind === "SESSION"
              ? `/projects/${projectId}/sessions/${r.newNodeId}?step=1&from=legacy:${encodeURIComponent(legacyNodeId)}`
              : `/projects/${projectId}/materials/${r.newNodeId}`;
          // 给用户一个可感知的迁移提示，再替换地址栏（非闪屏式静默跳转）
          window.setTimeout(() => {
            if (myGen === gen.current) window.location.replace(target);
          }, 900);
        } else if (r.status === "REVOKED") {
          setState("forbidden");
        } else {
          setState("gone");
        }
      })
      .catch((err) => {
        if (myGen !== gen.current) return;
        if ((err as { name?: string })?.name === "CanceledError") return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        setMessage(getApiError(err).message);
        setState(status === 403 ? "forbidden" : "invalid");
      });
    return () => {
      gen.current++;
      controller.abort();
    };
  }, [projectId, legacyNodeId]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-5 py-20">
        <Card className="p-9 text-center">
          {state === "loading" && (
            <>
              <Spinner className="mx-auto h-7 w-7 text-brand-500" />
              <h1 className="mt-4 text-lg font-semibold text-slate-800">正在解析旧链接…</h1>
              <p className="mt-2 text-sm text-slate-500">查询该项目的节点迁移记录，请稍候。</p>
              <p className="mt-1 break-all text-xs text-slate-400">legacyNodeId: {legacyNodeId}</p>
            </>
          )}

          {state === "redirecting" && resolution && (
            <>
              <div className="mb-3 text-4xl">🔀</div>
              <h1 className="text-lg font-semibold text-slate-800">内容已迁移</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {resolution.note ? `${resolution.note}。` : "该节点在改版后被合并到新的位置。"}
                正在带你前往新地址，浏览器地址栏将更新为新链接。
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs text-brand-700">
                <Spinner className="h-3.5 w-3.5" /> 跳转中…
              </div>
            </>
          )}

          {state === "gone" && (
            <>
              <div className="mb-3 text-4xl">🗑️</div>
              <h1 className="text-lg font-semibold text-slate-800">该内容已被删除</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                迁移记录显示旧节点「{legacyNodeId}」在改版中被整体删除。
                {resolution?.note ? `原因：${resolution.note}` : ""}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link to={`/projects/${projectId}`}>
                  <Button variant="secondary">回到项目工作台</Button>
                </Link>
              </div>
            </>
          )}

          {state === "forbidden" && (
            <>
              <div className="mb-3 text-4xl">⛔</div>
              <h1 className="text-lg font-semibold text-slate-800">
                {resolution?.status === "REVOKED" ? "该素材授权已到期" : "你无权访问该项目"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {message || resolution?.note || "旧节点对应的素材授权被收回，或你不是该项目成员。"}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link to={projectId ? `/projects/${projectId}` : "/"}>
                  <Button variant="secondary">回到项目工作台</Button>
                </Link>
                <Link to="/">
                  <Button>返回首页</Button>
                </Link>
              </div>
            </>
          )}

          {state === "invalid" && (
            <>
              <div className="mb-3 text-4xl">🧭</div>
              <h1 className="text-lg font-semibold text-slate-800">无效的深链接</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {message || "在该项目下找不到这条旧链接的迁移记录，链接可能拼写错误或已失效。"}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link to={`/projects/${projectId}`}>
                  <Button variant="secondary">回到项目工作台</Button>
                </Link>
                <Link to="/">
                  <Button>返回首页</Button>
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
