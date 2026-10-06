import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';

export default function AppShell() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
