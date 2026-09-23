import { useEffect, useState, useCallback } from 'react';
import {
  FileText, Printer, School, GraduationCap, CheckCircle2, XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Student, Grade, KeyStage, AttendanceWithDetails } from '@/lib/types';

type FilterType = 'all' | 'key-stage' | 'grade';

export default function Reports() {
  const [keyStages, setKeyStages] = useState<KeyStage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedKsId, setSelectedKsId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    const [ksRes, grRes, stRes] = await Promise.all([
      supabase.from('key_stages').select('*').order('name'),
      supabase.from('grades').select('*, key_stages(*)').order('name'),
      supabase.from('students').select('*, grades(*, key_stages(*))').order('name'),
    ]);
    setKeyStages(ksRes.data || []);
    setGrades(grRes.data || []);
    setStudents(stRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load attendance for the selected date
  useEffect(() => {
    if (reportDate) {
      supabase.from('attendance_with_details').select('*').eq('attendance_date', reportDate)
        .then(({ data }) => setAllAttendance(data || []));
    }
  }, [reportDate]);

  const presentStudentIds = new Set(allAttendance.map((a) => a.student_id));

  const getFilteredStudents = (): Student[] => {
    if (filterType === 'all') return students;
    if (filterType === 'key-stage' && selectedKsId) {
      return students.filter((s) => s.grades?.key_stage_id === selectedKsId);
    }
    if (filterType === 'grade' && selectedGradeId) {
      return students.filter((s) => s.grade_id === selectedGradeId);
    }
    return students;
  };

  const filteredStudents = getFilteredStudents();
  const presentCount = filteredStudents.filter((s) => presentStudentIds.has(s.id)).length;
  const absentCount = filteredStudents.length - presentCount;
  const attendanceRate = filteredStudents.length > 0
    ? Math.round((presentCount / filteredStudents.length) * 100)
    : 0;

  const getReportTitle = (): string => {
    if (filterType === 'key-stage' && selectedKsId) {
      const ks = keyStages.find((k) => k.id === selectedKsId);
      return ks ? ks.name : 'Key Stage Report';
    }
    if (filterType === 'grade' && selectedGradeId) {
      const g = grades.find((gr) => gr.id === selectedGradeId);
      return g ? g.name : 'Grade Report';
    }
    return 'All Students';
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Generate attendance reports by key stage or grade</p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-700 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <Printer size={18} /> Print / Save as PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm no-print">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Report Type</label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as FilterType);
                setSelectedKsId('');
                setSelectedGradeId('');
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="all">All Students</option>
              <option value="key-stage">By Key Stage</option>
              <option value="grade">By Grade</option>
            </select>
          </div>
          {filterType === 'key-stage' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Key Stage</label>
              <select
                value={selectedKsId}
                onChange={(e) => setSelectedKsId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">Select key stage</option>
                {keyStages.map((ks) => <option key={ks.id} value={ks.id}>{ks.name}</option>)}
              </select>
            </div>
          )}
          {filterType === 'grade' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Grade</label>
              <select
                value={selectedGradeId}
                onChange={(e) => setSelectedGradeId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">Select grade</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Report Content (printable) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Report Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-slate-400 no-print" />
            <h2 className="text-lg font-bold text-slate-900">Attendance Report</h2>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <span><strong className="text-slate-700">Group:</strong> {getReportTitle()}</span>
            <span><strong className="text-slate-700">Date:</strong> {new Date(reportDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b border-slate-100">
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-900">{filteredStudents.length}</p>
            <p className="text-xs text-slate-500 mt-1">Total Students</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{presentCount}</p>
            <p className="text-xs text-slate-500 mt-1">Present</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-500">{absentCount}</p>
            <p className="text-xs text-slate-500 mt-1">Absent</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">{attendanceRate}%</p>
            <p className="text-xs text-slate-500 mt-1">Attendance Rate</p>
          </div>
        </div>

        {/* Student List Table */}
        <div className="overflow-x-auto">
          {filteredStudents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <School size={32} className="text-slate-300 mx-auto mb-3 no-print" />
              <p className="text-sm text-slate-400">No students match this filter.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">#</th>
                  <th className="text-left px-6 py-3 font-medium">Student Name</th>
                  <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">Grade</th>
                  <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">Key Stage</th>
                  <th className="text-left px-6 py-3 font-medium hidden md:table-cell">Attendee</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.map((s, idx) => {
                  const isPresent = presentStudentIds.has(s.id);
                  const attRecord = allAttendance.find((a) => a.student_id === s.id);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-3 text-slate-900 font-medium">{s.name}</td>
                      <td className="px-6 py-3 text-slate-600 hidden sm:table-cell">{s.grades?.name || '—'}</td>
                      <td className="px-6 py-3 text-slate-600 hidden sm:table-cell">{s.grades?.key_stages?.name || '—'}</td>
                      <td className="px-6 py-3 text-slate-600 hidden md:table-cell">{attRecord?.attendee_name || '—'}</td>
                      <td className="px-6 py-3">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                            <CheckCircle2 size={12} /> Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-500">
                            <XCircle size={12} /> Absent
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
