import { useEffect, useState, useCallback } from 'react';
import {
  Pencil, Trash2, Search, CheckCircle2, Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AttendanceWithDetails, Student, Grade, Parent } from '@/lib/types';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function AttendanceManager() {
  const [records, setRecords] = useState<AttendanceWithDetails[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceWithDetails | null>(null);
  const [editStudentId, setEditStudentId] = useState('');
  const [editGradeId, setEditGradeId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editMother, setEditMother] = useState(false);
  const [editFather, setEditFather] = useState(false);
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editGuardianAttended, setEditGuardianAttended] = useState(false);
  const [editAttendeeName, setEditAttendeeName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleteName, setDeleteName] = useState('');

  const load = useCallback(async () => {
    const [attRes, stRes, grRes, paRes] = await Promise.all([
      supabase.from('attendance_with_details').select('*').order('attendance_date', { ascending: false }).order('student_name', { ascending: true }),
      supabase.from('students').select('*').order('name'),
      supabase.from('grades').select('*').order('name'),
      supabase.from('parents').select('*'),
    ]);
    setRecords(attRes.data || []);
    setStudents(stRes.data || []);
    setGrades(grRes.data || []);
    setParents(paRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter((r) => {
    if (search && !r.student_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGrade && r.grade_id !== filterGrade) return false;
    if (filterDate && r.attendance_date !== filterDate) return false;
    return true;
  });

  const openEdit = (r: AttendanceWithDetails) => {
    setEditRecord(r);
    setEditStudentId(r.student_id);
    setEditGradeId(r.grade_id);
    setEditDate(r.attendance_date);
    setEditMother(r.mother_attended);
    setEditFather(r.father_attended);
    setEditGuardianName(r.guardian_name || '');
    setEditGuardianAttended(r.guardian_attended);
    setEditAttendeeName(r.attendee_name || '');
    setEditError('');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editRecord) return;
    setSavingEdit(true);
    setEditError('');

    // Build attendee name
    const sParents = parents.filter((p) => p.student_id === editStudentId);
    const mother = sParents.find((p) => p.type === 'mother');
    const father = sParents.find((p) => p.type === 'father');
    let attendeeName = '';
    if (editMother && mother) attendeeName += mother.name;
    if (editFather && father) attendeeName += (attendeeName ? ', ' : '') + (father?.name || '');
    if (editGuardianAttended && editGuardianName.trim()) {
      attendeeName += (attendeeName ? ', ' : '') + editGuardianName.trim();
    }

    const { error } = await supabase.from('attendance').update({
      student_id: editStudentId,
      grade_id: editGradeId,
      mother_attended: editMother,
      father_attended: editFather,
      guardian_name: editGuardianAttended ? editGuardianName.trim() : null,
      guardian_attended: editGuardianAttended,
      attendee_name: attendeeName,
      attendance_date: editDate,
    }).eq('id', editRecord.id);

    setSavingEdit(false);
    if (error) { setEditError(error.message); return; }
    setEditOpen(false);
    load();
  };

  const openDelete = (r: AttendanceWithDetails) => {
    setDeleteId(r.id);
    setDeleteName(r.student_name);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    await supabase.from('attendance').delete().eq('id', deleteId);
    setDeleteOpen(false);
    load();
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attendance Records</h1>
        <p className="text-sm text-slate-500 mt-1">View, edit, and delete all attendance submissions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name…"
              className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">All grades</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Calendar size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No attendance records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Student</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Grade</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Attendee</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-slate-900 font-medium">{r.student_name}</td>
                    <td className="px-5 py-3 text-slate-600 hidden sm:table-cell">{r.grade_name}</td>
                    <td className="px-5 py-3 text-slate-600 hidden md:table-cell">{r.attendee_name || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{new Date(r.attendance_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                        <CheckCircle2 size={12} /> Present
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(r)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => openDelete(r)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} title="Edit Attendance Record" onClose={() => setEditOpen(false)}>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Student</label>
              <select
                value={editStudentId}
                onChange={(e) => {
                  setEditStudentId(e.target.value);
                  const s = students.find((st) => st.id === e.target.value);
                  if (s) setEditGradeId(s.grade_id);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Grade</label>
              <select
                value={editGradeId}
                onChange={(e) => setEditGradeId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Attendance Date</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-3">Who Attended</p>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={editMother} onChange={(e) => setEditMother(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20" />
                <span className="text-sm text-slate-700">Mother attended</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={editFather} onChange={(e) => setEditFather(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20" />
                <span className="text-sm text-slate-700">Father attended</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={editGuardianAttended} onChange={(e) => setEditGuardianAttended(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20" />
                <span className="text-sm text-slate-700">Guardian attended</span>
              </label>
              {editGuardianAttended && (
                <input
                  type="text"
                  value={editGuardianName}
                  onChange={(e) => setEditGuardianName(e.target.value)}
                  placeholder="Guardian name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              )}
            </div>
          </div>

          {editError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{editError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
            <button onClick={handleSaveEdit} disabled={savingEdit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Attendance Record"
        message={`Are you sure you want to delete the attendance record for "${deleteName}"? This will mark them as absent.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
