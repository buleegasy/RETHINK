import { useState, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminLogin } from './components/admin/AdminLogin';

const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

const safeGetAdminToken = (): string | null => {
  try {
    return localStorage.getItem('admin_token');
  } catch {
    return null;
  }
};

const safeSetAdminToken = (t: string): void => {
  try {
    localStorage.setItem('admin_token', t);
  } catch (e) {
    console.warn('[AdminApp] localStorage setItem error:', e);
  }
};

const safeRemoveAdminToken = (): void => {
  try {
    localStorage.removeItem('admin_token');
  } catch (e) {
    console.warn('[AdminApp] localStorage removeItem error:', e);
  }
};

export default function AdminApp() {
  const [token, setToken] = useState<string | null>(safeGetAdminToken);
  
  if (!token) {
    return (
      <AdminLogin
        onLogin={(t) => {
          safeSetAdminToken(t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <Suspense fallback={
      <div role="status" aria-label="加载管理面板中..." className="flex flex-col items-center justify-center min-h-[300px] text-on-surface-variant gap-3 p-8">
        <Loader2 className="w-8 h-8 animate-spin text-gemini-blue" />
        <span className="text-sm font-medium">加载管理控制台...</span>
      </div>
    }>
      <AdminDashboard
        token={token}
        onLogout={() => {
          safeRemoveAdminToken();
          setToken(null);
        }}
      />
    </Suspense>
  );
}
