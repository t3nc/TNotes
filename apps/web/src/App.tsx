import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { SetupPage } from './pages/SetupPage';
import { LoginPage } from './pages/LoginPage';
import { NotesPage } from './pages/NotesPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFound } from './pages/NotFound';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { Spinner } from './components/ui/spinner';
import { useVaultStore } from './store/vault';
import { applyTheme, useUiStore } from './store/ui';

function AppRoutes() {
  const status = useVaultStore((state) => state.status);
  const init = useVaultStore((state) => state.init);
  const navigate = useNavigate();

  useEffect(() => {
    init().catch((error: unknown) => {
      console.error('[tnotes] 初始化状态失败', error);
    });
  }, [init]);

  useEffect(() => {
    applyTheme(useUiStore.getState().theme);
  }, []);

  useEffect(() => {
    if (status === 'unlocked' && (window.location.pathname === '/login' || window.location.pathname === '/setup')) {
      navigate('/app', { replace: true });
    }
  }, [status, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (status === 'needs-setup') {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  if (status === 'locked') {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/app" element={<AppShell />}>
        <Route index element={<NotesPage />} />
        <Route path="n/:id" element={<NotesPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/login" element={<Navigate to="/app" replace />} />
      <Route path="/setup" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <InstallPrompt />
    </BrowserRouter>
  );
}
