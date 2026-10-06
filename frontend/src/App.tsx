import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import AppShell from './components/AppShell';
import LoginPage from './auth/LoginPage';
import RequireAuth from './auth/RequireAuth';
import DashboardPage from './pages/DashboardPage';
import WorkbenchGate from './workbench/WorkbenchGate';
import ProjectOverview from './workbench/ProjectOverview';
import SessionEditor from './workbench/SessionEditor';
import AssetEditor from './workbench/AssetEditor';
import ExportList from './workbench/ExportList';
import ExportSnapshotPage from './workbench/ExportSnapshotPage';
import DeepLinkGuard from './workbench/DeepLinkGuard';

const App = () => (
  <BrowserRouter>
    <ErrorBoundary>
      <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/w/:projectId" element={<WorkbenchGate />}>
              <Route index element={<ProjectOverview />} />
              <Route path="sessions/:sessionId" element={<DeepLinkGuard expected="session"><SessionEditor /></DeepLinkGuard>} />
              <Route path="assets/:assetId" element={<DeepLinkGuard expected="asset"><AssetEditor /></DeepLinkGuard>} />
              <Route path="exports" element={<ExportList />} />
              <Route path="exports/:exportId" element={<DeepLinkGuard expected="exportDetail"><ExportSnapshotPage /></DeepLinkGuard>} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  </BrowserRouter>
);

export default App;
