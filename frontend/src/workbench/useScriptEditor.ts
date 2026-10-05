import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api";
import { getApiError } from "@/api/client";
import type { ConflictDetails, ScriptStep } from "@/api/types";
import { localDrafts, quarantine, type LocalDraft } from "@/lib/draftStore";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "conflict" | "error";

export interface ConflictState {
  serverVersion: number;
  serverTitle: string;
  serverSteps: ScriptStep[];
  serverUpdatedAt: string | null;
  /** 冲突时用户正在编辑、尚未提交成功的本地稿 */
  pending: { title: string; steps: ScriptStep[]; note?: string };
}

export interface LoadState {
  loading: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  serverVersion: number;
  serverTitle: string;
  serverSteps: ScriptStep[];
  /** 打开编辑器时从本地恢复的草稿（若有），用于顶部提示 */
  restoredDraft: LocalDraft | null;
  readOnly: boolean;
}

let seqCounter = 0;

function isAbortError(err: unknown): boolean {
  return (err as { code?: string })?.code === "ERR_CANCELED" || (err as { name?: string })?.name === "AbortError";
}

/**
 * 脚本编辑器控制器。
 * - 加载按「代次」隔离：项目/场次切换后，旧响应只能被丢弃，禁止把甲项目脚本渲染到乙页面。
 * - 保存按「序号」单飞：待同步时禁止再发；乱序响应只接受序号最大者。
 * - 冲突三态（已提交 / 待同步 / 冲突）显式区分，导航守卫不会自动 OVERWRITE 服务器新稿。
 */
export function useScriptEditor(projectId: string, sessionId: string, canWrite: boolean) {
  const [load, setLoad] = useState<LoadState>({
    loading: true,
    errorCode: null,
    errorMessage: null,
    serverVersion: 0,
    serverTitle: "",
    serverSteps: [],
    restoredDraft: null,
    readOnly: !canWrite
  });

  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadGen = useRef(0);
  const saveSeq = useRef(0);
  const savingInFlight = useRef(false);
  const mounted = useRef(true);
  const dirty = status === "dirty" || status === "conflict" || status === "error";

  // ---------- 加载：先验证访问，后恢复本地草稿 ----------
  const reload = useCallback(
    async (targetProject: string, targetSession: string) => {
      const gen = ++loadGen.current;
      setLoad((s) => ({ ...s, loading: true, errorCode: null, errorMessage: null }));
      setConflict(null);
      setStatus("idle");
      setErrorMessage(null);
      try {
        const detail = await api.getSession(targetProject, targetSession);
        if (gen !== loadGen.current) return; // 已切走：丢弃
        const serverVersion = detail.script?.currentVersion ?? 0;
        const serverTitle = detail.script?.latest?.title ?? `${detail.session.title}（新脚本）`;
        const serverSteps = detail.script?.latest?.steps ?? [
          { id: `step-${Date.now()}`, title: "第一步", content: "" }
        ];

        // 访问验证通过后，才考虑恢复本地草稿（ADR-01：先验证后恢复）
        const draft = localDrafts.load(targetProject, targetSession);
        let initialTitle = serverTitle;
        let initialSteps = serverSteps;
        let restored: LocalDraft | null = null;

        if (draft) {
          if (draft.baseVersion === serverVersion) {
            initialTitle = draft.title;
            initialSteps = draft.steps;
            restored = draft;
            setStatus("dirty");
          } else {
            // 本地草稿基于旧版本：不静默覆盖，也不静默丢弃，进入冲突
            restored = draft;
            setConflict({
              serverVersion,
              serverTitle,
              serverSteps,
              serverUpdatedAt: detail.script?.latest?.createdAt ?? null,
              pending: { title: draft.title, steps: draft.steps }
            });
            setStatus("conflict");
          }
        }

        setTitle(initialTitle);
        setSteps(initialSteps);
        setLoad({
          loading: false,
          errorCode: null,
          errorMessage: null,
          serverVersion,
          serverTitle,
          serverSteps,
          restoredDraft: restored,
          readOnly: !canWrite
        });
      } catch (err) {
        if (gen !== loadGen.current || isAbortError(err)) return;
        const apiErr = getApiError(err);
        const httpStatus = (err as { response?: { status?: number } })?.response?.status;
        // 403/404/410：把可能存在的本地草稿移入隔离区，绝不展示到无权限的页面上
        const existing = localDrafts.load(targetProject, targetSession);
        if (existing && httpStatus && [403, 404, 410].includes(httpStatus)) {
          quarantine.add(
            existing,
            httpStatus === 403 ? "FORBIDDEN" : httpStatus === 410 ? "RETIRED" : "NOT_FOUND",
            apiErr.message
          );
        }
        setLoad((s) => ({
          ...s,
          loading: false,
          errorCode: httpStatus === 403 ? "FORBIDDEN" : httpStatus === 404 ? "NOT_FOUND" : httpStatus === 410 ? "RETIRED" : "ERROR",
          errorMessage: apiErr.message
        }));
      }
    },
    [canWrite]
  );

  useEffect(() => {
    mounted.current = true;
    reload(projectId, sessionId);
    return () => {
      mounted.current = false;
      loadGen.current++; // 让离场后的迟到响应失效
    };
  }, [projectId, sessionId, reload]);

  // ---------- 编辑：即时落本地草稿（待同步） ----------
  const persistLocal = useCallback(
    (nextTitle: string, nextSteps: ScriptStep[], baseVersion: number) => {
      if (!canWrite) return;
      localDrafts.save({
        projectId,
        sessionId,
        title: nextTitle,
        steps: nextSteps,
        baseVersion,
        updatedAt: Date.now()
      });
    },
    [canWrite, projectId, sessionId]
  );

  const effectiveBase = conflict ? conflict.serverVersion : load.serverVersion;

  const editTitle = useCallback(
    (value: string) => {
      if (!canWrite) return;
      setTitle(value);
      persistLocal(value, steps, effectiveBase);
      setStatus((st) => (st === "idle" || st === "saved" ? "dirty" : st));
    },
    [canWrite, persistLocal, steps, effectiveBase]
  );

  const editSteps = useCallback(
    (updater: (prev: ScriptStep[]) => ScriptStep[]) => {
      if (!canWrite) return;
      const next = updater(steps);
      setSteps(next);
      persistLocal(title, next, effectiveBase);
      setStatus((st) => (st === "idle" || st === "saved" ? "dirty" : st));
    },
    [canWrite, persistLocal, steps, title, effectiveBase]
  );

  // ---------- 保存：乐观锁 + 单飞 + 序号防乱序 ----------
  const save = useCallback(
    async (
      mode: "MERGE" | "OVERWRITE" = "MERGE",
      note?: string,
      override?: { title: string; steps: ScriptStep[]; baseVersion: number }
    ) => {
      if (!canWrite || savingInFlight.current) return;
      const base = override?.baseVersion ?? (mode === "OVERWRITE" && conflict ? conflict.serverVersion : load.serverVersion);
      const submitTitle = override?.title ?? title;
      const submitSteps = override?.steps ?? steps;
      const payloadTitle = submitTitle.trim();
      if (!payloadTitle) {
        setErrorMessage("脚本标题不能为空");
        setStatus("error");
        return;
      }
      if (submitSteps.length === 0) {
        setErrorMessage("至少保留一个步骤");
        setStatus("error");
        return;
      }
      savingInFlight.current = true;
      const seq = ++saveSeq.current;
      setStatus("saving");
      setErrorMessage(null);
      try {
        const result = await api.saveScript(projectId, sessionId, {
          title: payloadTitle,
          steps: submitSteps,
          baseVersion: base,
          note,
          mode
        });
        if (!mounted.current) return;
        if (seq !== saveSeq.current) return; // 乱序/过期响应：丢弃
        setLoad((s) => ({ ...s, serverVersion: result.version }));
        setStatus("saved");
        setConflict(null);
        setConflictDialogOpen(false);
        setLastSavedAt(Date.now());
        localDrafts.clear(projectId, sessionId); // 已提交：本地待同步草稿清除
      } catch (err) {
        if (!mounted.current) return;
        if (seq !== saveSeq.current) return;
        const apiErr = getApiError(err);
        const httpStatus = (err as { response?: { status?: number } })?.response?.status;
        if (httpStatus === 409) {
          const details = (apiErr.details ?? {}) as ConflictDetails;
          setConflict({
            serverVersion: details.serverVersion,
            serverTitle: details.serverTitle ?? "",
            serverSteps: details.serverSteps ?? [],
            serverUpdatedAt: details.serverUpdatedAt,
            pending: { title: payloadTitle, steps: submitSteps, note }
          });
          setStatus("conflict");
          setConflictDialogOpen(true);
          setErrorMessage(apiErr.message);
          // 冲突内容继续保留在本地，等待用户决策
          persistLocal(payloadTitle, submitSteps, details.serverVersion);
        } else if (httpStatus === 410) {
          setStatus("error");
          setErrorMessage("项目已退役，脚本为只读，无法保存");
        } else if (httpStatus === 403) {
          setStatus("error");
          setErrorMessage("你没有编辑权限，无法保存");
        } else {
          setStatus("error");
          setErrorMessage(apiErr.message);
        }
      } finally {
        if (seq === saveSeq.current) savingInFlight.current = false;
      }
    },
    [canWrite, conflict, load.serverVersion, title, steps, projectId, sessionId, persistLocal]
  );

  // ---------- 冲突决策 ----------
  /** 放弃本地待同步稿，采用服务器版本。 */
  const resolveUseServer = useCallback(() => {
    if (!conflict) return;
    setTitle(conflict.serverTitle);
    setSteps(conflict.serverSteps);
    setLoad((s) => ({ ...s, serverVersion: conflict.serverVersion }));
    setConflict(null);
    setConflictDialogOpen(false);
    setStatus("idle");
    localDrafts.clear(projectId, sessionId);
  }, [conflict, projectId, sessionId]);

  /** 保留本地稿并显式以 OVERWRITE 提交（必须用户点按，守卫/自动流程不会走到这里）。 */
  const resolveOverwrite = useCallback(() => {
    if (!conflict) return;
    setTitle(conflict.pending.title);
    setSteps(conflict.pending.steps);
    setLoad((s) => ({ ...s, serverVersion: conflict.serverVersion }));
    setConflictDialogOpen(false);
    void save("OVERWRITE", "覆盖服务器新稿（用户显式确认）", {
      title: conflict.pending.title,
      steps: conflict.pending.steps,
      baseVersion: conflict.serverVersion
    });
  }, [conflict, save]);

  /** 保留本地稿但暂不提交，稍后再处理（本地继续持久化）。 */
  const reopenConflict = useCallback(() => {
    if (conflict) setConflictDialogOpen(true);
  }, [conflict]);

  const dismissConflictDialog = useCallback(() => {
    setConflictDialogOpen(false);
  }, []);

  const discardRestored = useCallback(() => {
    localDrafts.clear(projectId, sessionId);
    setTitle(load.serverTitle);
    setSteps(load.serverSteps);
    setLoad((s) => ({ ...s, restoredDraft: null }));
    setStatus("idle");
  }, [projectId, sessionId, load.serverTitle, load.serverSteps]);

  const isDirty = useMemo(() => dirty, [dirty]);

  return {
    load,
    title,
    steps,
    status,
    conflict,
    errorMessage,
    lastSavedAt,
    isDirty,
    editTitle,
    editSteps,
    save,
    reload: () => reload(projectId, sessionId),
    resolveUseServer,
    resolveOverwrite,
    reopenConflict,
    dismissConflictDialog,
    discardRestored,
    conflictDialogOpen
  };
}
