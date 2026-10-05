import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 结构化错误日志（生产可接监控）
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
            <div className="mb-3 text-4xl">🛟</div>
            <h1 className="text-lg font-semibold text-slate-800">页面遇到了一点问题</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              错误已被捕获，你的本地草稿仍然安全。可以尝试刷新页面，或返回工作台首页。
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                刷新页面
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-600"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
