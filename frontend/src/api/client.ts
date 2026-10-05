import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "cw.token";

export const http = axios.create({
  baseURL: "/api",
  timeout: 15000
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export function getApiError(err: unknown): ApiErrorShape {
  const ax = err as AxiosError<{ error: ApiErrorShape }>;
  if (ax.response?.data?.error) return ax.response.data.error;
  if (ax.code === "ECONNABORTED") return { code: "TIMEOUT", message: "请求超时，请检查网络" };
  return { code: "NETWORK", message: "网络异常，请稍后重试" };
}

export function isStatus(err: unknown, status: number): boolean {
  return (err as AxiosError)?.response?.status === status;
}

/** 会话过期事件：由拦截器广播，全局弹窗接管（不强制刷新页面）。 */
export const SESSION_EXPIRED_EVENT = "cw:session-expired";

let expiredNotified = false;
export function resetExpiredFlag() {
  expiredNotified = false;
}

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = error.config?.url ?? "";
      const isLoginCall = url.includes("/auth/login");
      if (!isLoginCall && !expiredNotified) {
        expiredNotified = true;
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(
          new CustomEvent(SESSION_EXPIRED_EVENT, {
            detail: { returnTo: `${window.location.pathname}${window.location.search}` }
          })
        );
      }
    }
    return Promise.reject(error);
  }
);
