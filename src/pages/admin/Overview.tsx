import { useEffect, useState, useCallback } from 'react';
import {
  Users, CheckCircle2, XCircle, TrendingUp, GraduationCap, School,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Student, AttendanceWithDetails, Grade, KeyStage } from '@/lib/types';

interface Stats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
}

export default function Overview() {
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, presentToday: 0, absentToday: 0, attendanceRate: 0 });
  const [byKeyStage, setByKeyStage] = useState<{ name: string; total: number; present: number }[]>([]);
  const [byGrade, setByGrade] = useState<{ name: string; total: number; present: number }[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    const [stRes, attRes, grRes, ksRes] = await Promise.all([
      supabase.from('students').select('*, grades(*, key_stages(*))'),
      supabase.from('attendance_with_details').select('*').eq('attendance_date', today),
      supabase.from('grades').select('*, key_stages(*)').order('name'),
      supabase.from('key_stages').select('*').order('name'),
    ]);

    const students: Student[] = stRes.data || [];
    const attendance: AttendanceWithDetails[] = attRes.data || [];
    const grades: Grade[] = grRes.data || [];
    const keyStages: KeyStage[] = ksRes.data || [];

    const presentStudentIds = new Set(attendance.map((a) => a.student_id));
    const total = students.length;
    const present = presentStudentIds.size;
    const absent = total - present;

    setStats({
      totalStudents: total,
      presentToday: present,
      absentToday: absent,
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
    });

    // By Key Stage
    const ksStats = keyStages.map((ks) => {
      const ksStudentIds = students.filter((s) => s.grades?.key_stage_id === ks.id);
      const ksPresent = ksStudentIds.filter((s) => presentStudentIds.has(s.id)).length;
      return { name: ks.name, total: ksStudentIds.length, present: ksPresent };
    });
    setByKeyStage(ksStats);

    // By Grade
    const grStats = grades.map((g) => {
      const grStudentIds = students.filter((s) => s.grade_id === g.id);
      const grPresent = grStudentIds.filter((s) => presentStudentIds.has(s.id)).length;
      return { name: g.name, total: grStudentIds.length, present: grPresent };
    });
    setByGrade(grStats);

    // Recent records
    const { data: recent } = await supabase
      .from('attendance_with_details')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (recent) setRecentRecords(recent);

    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'blue' },
    { label: 'Present Today', value: stats.presentToday, icon: CheckCircle2, color: 'green' },
    { label: 'Absent Today', value: stats.absentToday, icon: XCircle, color: 'red' },
    { label: 'Attendance Rate', value: `${stats.attendanceRate}%`, icon: TrendingUp, color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${colorMap[card.color]} flex items-center justify-center mb-3`}>
                <Icon size={20} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Breakdowns */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* By Key Stage */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <School size={18} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">By Key Stage</h2>
          </div>
          <div className="space-y-3">
            {byKeyStage.length === 0 && <p className="text-sm text-slate-400">No key stages yet.</p>}
            {byKeyStage.map((ks) => (
              <div key={ks.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{ks.name}</span>
                  <span className="text-slate-400">{ks.present}/{ks.total} present</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${ks.total > 0 ? (ks.present / ks.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Grade */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap size={18} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">By Grade</h2>
          </div>
          <div className="space-y-3">
            {byGrade.length === 0 && <p className="text-sm text-slate-400">No grades yet.</p>}
            {byGrade.map((g) => (
              <div key={g.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{g.name}</span>
                  <span className="text-slate-400">{g.present}/{g.total} present</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${g.total > 0 ? (g.present / g.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Records */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Recent Attendance Submissions</h2>
        </div>
        <div className="overflow-x-auto">
          {recentRecords.length === 0 ? (
            <p className="text-sm text-slate-400 px-5 py-8 text-center">No attendance records yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Student</th>
                  <th className="text-left px-5 py-3 font-medium">Grade</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Attendee</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-slate-900 font-medium">{r.student_name}</td>
                    <td className="px-5 py-3 text-slate-600">{r.grade_name}</td>
                    <td className="px-5 py-3 text-slate-600 hidden sm:table-cell">{r.attendee_name || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(r.attendance_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                        <CheckCircle2 size={12} /> Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
