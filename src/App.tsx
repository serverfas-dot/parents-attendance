import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import DashboardLayout, { type AdminPage } from '@/components/DashboardLayout';
import PublicForm from '@/pages/PublicForm';
import AdminLogin from '@/pages/AdminLogin';
import Overview from '@/pages/admin/Overview';
import GradesManager from '@/pages/admin/GradesManager';
import StudentsManager from '@/pages/admin/StudentsManager';
import AttendanceManager from '@/pages/admin/AttendanceManager';
import FormControl from '@/pages/admin/FormControl';
import Reports from '@/pages/admin/Reports';

type Route = 'public' | 'admin';

function getRouteFromHash(): { route: Route; page: AdminPage } {
  const hash = window.location.hash.replace('#', '');
  if (hash.startsWith('admin')) {
    const pagePart = hash.split('/')[1] as AdminPage | undefined;
    const validPages: AdminPage[] = ['overview', 'grades', 'students', 'attendance', 'form-control', 'reports'];
    return { route: 'admin', page: pagePart && validPages.includes(pagePart) ? pagePart : 'overview' };
  }
  return { route: 'public', page: 'overview' };
}

function AppContent() {
  const { session, loading } = useAuth();
  const [routeState, setRouteState] = useState(getRouteFromHash());

  useEffect(() => {
    const onHashChange = () => setRouteState(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (page: AdminPage) => {
    window.location.hash = `admin/${page}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Public form
  if (routeState.route === 'public') {
    return <PublicForm />;
  }

  // Admin — requires auth
  if (!session) {
    return <AdminLogin />;
  }

  return (
    <DashboardLayout current={routeState.page} onNavigate={navigate}>
      {routeState.page === 'overview' && <Overview />}
      {routeState.page === 'grades' && <GradesManager />}
      {routeState.page === 'students' && <StudentsManager />}
      {routeState.page === 'attendance' && <AttendanceManager />}
      {routeState.page === 'form-control' && <FormControl />}
      {routeState.page === 'reports' && <Reports />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
