import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './authStore';

export default function RequireAuth() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  if (!token) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  return <Outlet />;
}
