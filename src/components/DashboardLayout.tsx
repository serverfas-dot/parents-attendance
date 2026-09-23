import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard, GraduationCap, Users, ClipboardList, Clock, FileText,
  LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export type AdminPage = 'overview' | 'grades' | 'students' | 'attendance' | 'form-control' | 'reports';

interface DashboardLayoutProps {
  current: AdminPage;
  onNavigate: (page: AdminPage) => void;
  children: ReactNode;
}

const navItems: { id: AdminPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'grades', label: 'Grades & Key Stages', icon: GraduationCap },
  { id: 'students', label: 'Students & Parents', icon: Users },
  { id: 'attendance', label: 'Attendance Records', icon: ClipboardList },
  { id: 'form-control', label: 'Form Control', icon: Clock },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export default function DashboardLayout({ current, onNavigate, children }: DashboardLayoutProps) {
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: AdminPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}png%20copy.png`} alt="" className="w-9 h-9 object-contain flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Parents Attendance</p>
            <p className="text-xs text-slate-400">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
        >
          <LogOut size={18} className="flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-800 hidden lg:block">
        {sidebar}
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-800">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <span className="text-sm font-semibold text-slate-800">Parents Attendance</span>
          <div className="w-10" />
        </header>

        <main className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
