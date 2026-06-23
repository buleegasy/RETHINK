import { useState } from 'react';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';

export default function AdminApp() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  
  if (!token) {
    return (
      <AdminLogin
        onLogin={(t) => {
          localStorage.setItem('admin_token', t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <AdminDashboard
      token={token}
      onLogout={() => {
        localStorage.removeItem('admin_token');
        setToken(null);
      }}
    />
  );
}
