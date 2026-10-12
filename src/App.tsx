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
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    const onHashChange = () => setRouteState(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!session || routeState.route !== 'admin') {
      setSuperAdmin(false);
      setAccessLoading(false);
      setAccessError('');
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      if (!active) return;
      setAccessLoading(false);
      setAccessError('The admin service is taking too long to respond. Check the deployed database connection and try again.');
    }, 8000);

    setAccessLoading(true);
    setAccessError('');
    supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(
        ({ data, error }) => {
          if (!active) return;
          window.clearTimeout(timeout);
          setSuperAdmin(Boolean(data));
          setAccessError(error ? 'The admin service could not be reached. Sign out and try again.' : '');
          setAccessLoading(false);
        },
        () => {
          if (!active) return;
          window.clearTimeout(timeout);
          setSuperAdmin(false);
          setAccessError('The admin service could not be reached. Sign out and try again.');
          setAccessLoading(false);
        },
      );

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [session, routeState.route]);

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
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 mt-4">Checking admin access…</p>
        </div>
      </div>
    );
  }

  if (accessError || !superAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl bg-white border border-slate-100 shadow-xl p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Admin access unavailable</h1>
          <p className="text-sm text-slate-500 mt-2">{accessError || 'This account is not authorized for the admin dashboard.'}</p>
          <div className="flex justify-center gap-3 mt-6">
            <button onClick={() => signOut()} className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900">Sign out</button>
            <a href={import.meta.env.BASE_URL} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Public form</a>
          </div>
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
