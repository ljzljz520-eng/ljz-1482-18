import { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props { children: ReactNode }
interface State { hasError: boolean }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 保持错误边界与结构化日志的接入点，避免生产环境白屏。
    console.error('Workbench render error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl font-bold text-rose-600">!</div>
          <h1 className="mt-5 text-2xl font-bold text-slate-950">页面暂时无法渲染</h1>
          <p className="mt-3 leading-7 text-slate-500">可以返回项目列表重新进入；未提交的本地草稿仍保留在浏览器中。</p>
          <Link className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500" to="/">返回安全入口</Link>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
