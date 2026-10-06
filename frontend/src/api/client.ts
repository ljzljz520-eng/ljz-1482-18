import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../auth/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 12000
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; code?: string }>) => {
    const status = error.response?.status;
    if (status === 401) {
      const auth = useAuthStore.getState();
      auth.markSessionExpired();
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback = '网络请求失败，请稍后重试') {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export function getApiError<T = unknown>(error: unknown): T | undefined {
  if (axios.isAxiosError(error)) return error.response?.data as T | undefined;
  return undefined;
}
