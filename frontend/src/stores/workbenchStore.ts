import { create } from "zustand";
import { api } from "@/api";
import type { Bootstrap, Material, ProjectDetail, SessionNode } from "@/api/types";

export type BootstrapState = "idle" | "loading" | "ready" | "error";

interface WorkbenchState {
  projectId: string | null;
  /** 目标代次：每次切换项目递增；过期代次的响应一律丢弃。 */
  generation: number;
  status: BootstrapState;
  errorCode: string | null;
  errorMessage: string | null;
  data: Bootstrap | null;
  abortController: AbortController | null;

  loadProject: (projectId: string) => Promise<Bootstrap | null>;
  reset: () => void;

  upsertSession: (s: SessionNode) => void;
  removeSession: (sessionId: string) => void;
  upsertMaterial: (m: Material) => void;
  removeMaterial: (materialId: string) => void;
  patchProject: (patch: Partial<ProjectDetail>) => void;
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  projectId: null,
  generation: 0,
  status: "idle",
  errorCode: null,
  errorMessage: null,
  data: null,
  abortController: null,

  loadProject: async (projectId) => {
    // 取消上一代仍在途中的请求，防止快速切换时甲项目数据落到乙页面
    const ac = new AbortController();
    get().abortController?.abort();
    const gen = get().generation + 1;
    set({
      projectId,
      generation: gen,
      status: "loading",
      errorCode: null,
      errorMessage: null,
      data: null,
      abortController: ac
    });

    try {
      const data = await api.bootstrap(projectId, ac.signal);
      if (gen !== get().generation) return null; // 过期代次：丢弃，绝不提交
      set({ status: "ready", data, abortController: null });
      return data;
    } catch (err) {
      if (gen !== get().generation) return null;
      const code =
        (err as { response?: { status?: number } })?.response?.status === 403
          ? "FORBIDDEN"
          : (err as { response?: { status?: number } })?.response?.status === 404
            ? "NOT_FOUND"
            : "LOAD_FAILED";
      const message =
        code === "FORBIDDEN"
          ? "你不是该项目成员，或权限已被收回"
          : code === "NOT_FOUND"
            ? "项目不存在或你无权访问"
            : "项目加载失败，请稍后重试";
      set({ status: "error", errorCode: code, errorMessage: message, abortController: null });
      return null;
    }
  },

  reset: () => {
    get().abortController?.abort();
    set({
      projectId: null,
      status: "idle",
      errorCode: null,
      errorMessage: null,
      data: null,
      abortController: null
    });
  },

  upsertSession: (s) => {
    const data = get().data;
    if (!data) return;
    const exists = data.sessions.some((x) => x.id === s.id);
    const sessions = exists ? data.sessions.map((x) => (x.id === s.id ? s : x)) : [...data.sessions, s];
    set({ data: { ...data, sessions } });
  },

  removeSession: (sessionId) => {
    const data = get().data;
    if (!data) return;
    set({ data: { ...data, sessions: data.sessions.filter((x) => x.id !== sessionId) } });
  },

  upsertMaterial: (m) => {
    const data = get().data;
    if (!data) return;
    const exists = data.materials.some((x) => x.id === m.id);
    const materials = exists ? data.materials.map((x) => (x.id === m.id ? m : x)) : [m, ...data.materials];
    set({ data: { ...data, materials } });
  },

  removeMaterial: (materialId) => {
    const data = get().data;
    if (!data) return;
    set({ data: { ...data, materials: data.materials.filter((x) => x.id !== materialId) } });
  },

  patchProject: (patch) => {
    const data = get().data;
    if (!data) return;
    set({ data: { ...data, project: { ...data.project, ...patch } } });
  }
}));
