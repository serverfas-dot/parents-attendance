import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
import SuperAdmin from '@/pages/admin/SuperAdmin';

type Route = 'public' | 'admin';

function getRouteFromHash(): { route: Route; page: AdminPage } {
  const hash = window.location.hash.replace('#', '');
  if (hash.startsWith('admin')) {
    const pagePart = hash.split('/')[1] as AdminPage | undefined;
    const validPages: AdminPage[] = ['overview', 'grades', 'students', 'attendance', 'form-control', 'reports', 'super-admin'];
    return { route: 'admin', page: pagePart && validPages.includes(pagePart) ? pagePart : 'overview' };
  }
  return { route: 'public', page: 'overview' };
}

function AppContent() {
  const { session, loading, signOut } = useAuth();
  const [routeState, setRouteState] = useState(getRouteFromHash());
  const [superAdmin, setSuperAdmin] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);

  useEffect(() => {
    const onHashChange = () => setRouteState(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!session) {
      setSuperAdmin(false);
      return;
    }
    setAccessLoading(true);
    supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setSuperAdmin(Boolean(data));
        setAccessLoading(false);
      });
  }, [session]);

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

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!superAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl bg-white border border-slate-100 shadow-xl p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Access restricted</h1>
          <p className="text-sm text-slate-500 mt-2">This account is not authorized for the admin dashboard.</p>
          <button onClick={() => signOut()} className="mt-6 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout current={routeState.page} onNavigate={navigate}>
      {routeState.page === 'overview' && <Overview />}
      {routeState.page === 'grades' && <GradesManager />}
      {routeState.page === 'students' && <StudentsManager />}
      {routeState.page === 'attendance' && <AttendanceManager />}
      {routeState.page === 'form-control' && <FormControl />}
      {routeState.page === 'reports' && <Reports />}
      {routeState.page === 'super-admin' && <SuperAdmin />}
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
