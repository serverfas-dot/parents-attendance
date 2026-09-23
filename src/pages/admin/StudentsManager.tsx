import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Users, User, ChevronRight, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Student, Parent, Grade } from '@/lib/types';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function StudentsManager() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);

  // Student modal
  const [studentModal, setStudentModal] = useState(false);
  const [studentMode, setStudentMode] = useState<'add' | 'edit'>('add');
  const [studentEditId, setStudentEditId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentGradeId, setStudentGradeId] = useState('');
  const [studentError, setStudentError] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  // Parent modal
  const [parentModal, setParentModal] = useState(false);
  const [parentStudentId, setParentStudentId] = useState('');
  const [parentEditId, setParentEditId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentType, setParentType] = useState<'mother' | 'father' | 'guardian'>('mother');
  const [parentError, setParentError] = useState('');
  const [savingParent, setSavingParent] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'student' | 'parent'>('student');
  const [deleteId, setDeleteId] = useState('');
  const [deleteName, setDeleteName] = useState('');

  const load = useCallback(async () => {
    const [grRes, stRes, paRes] = await Promise.all([
      supabase.from('grades').select('*, key_stages(*)').order('name'),
      supabase.from('students').select('*').order('name'),
      supabase.from('parents').select('*'),
    ]);
    setGrades(grRes.data || []);
    setStudents(stRes.data || []);
    setParents(paRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Student handlers
  const openAddStudent = (gradeId?: string) => {
    setStudentMode('add');
    setStudentEditId('');
    setStudentName('');
    setStudentGradeId(gradeId || grades[0]?.id || '');
    setStudentError('');
    setStudentModal(true);
  };

  const openEditStudent = (s: Student) => {
    setStudentMode('edit');
    setStudentEditId(s.id);
    setStudentName(s.name);
    setStudentGradeId(s.grade_id);
    setStudentError('');
    setStudentModal(true);
  };

  const handleSaveStudent = async () => {
    if (!studentName.trim()) { setStudentError('Student name is required.'); return; }
    if (!studentGradeId) { setStudentError('Please select a grade.'); return; }
    setSavingStudent(true);
    setStudentError('');

    if (studentMode === 'add') {
      const { error } = await supabase.from('students').insert({ name: studentName.trim(), grade_id: studentGradeId });
      if (error) { setStudentError(error.message); setSavingStudent(false); return; }
    } else {
      const { error } = await supabase.from('students').update({ name: studentName.trim(), grade_id: studentGradeId }).eq('id', studentEditId);
      if (error) { setStudentError(error.message); setSavingStudent(false); return; }
    }

    setSavingStudent(false);
    setStudentModal(false);
    load();
  };

  // Parent handlers
  const openAddParent = (studentId: string) => {
    setParentStudentId(studentId);
    setParentEditId('');
    setParentName('');
    setParentType('mother');
    setParentError('');
    setParentModal(true);
  };

  const openEditParent = (p: Parent) => {
    setParentStudentId(p.student_id);
    setParentEditId(p.id);
    setParentName(p.name);
    setParentType(p.type);
    setParentError('');
    setParentModal(true);
  };

  const handleSaveParent = async () => {
    if (!parentName.trim()) { setParentError('Parent name is required.'); return; }
    setSavingParent(true);
    setParentError('');

    if (!parentEditId) {
      const { error } = await supabase.from('parents').insert({
        student_id: parentStudentId, name: parentName.trim(), type: parentType,
      });
      if (error) { setParentError(error.message); setSavingParent(false); return; }
    } else {
      const { error } = await supabase.from('parents').update({
        name: parentName.trim(), type: parentType,
      }).eq('id', parentEditId);
      if (error) { setParentError(error.message); setSavingParent(false); return; }
    }

    setSavingParent(false);
    setParentModal(false);
    load();
  };

  // Delete handlers
  const openDeleteStudent = (s: Student) => {
    setDeleteType('student');
    setDeleteId(s.id);
    setDeleteName(s.name);
    setDeleteOpen(true);
  };

  const openDeleteParent = (p: Parent) => {
    setDeleteType('parent');
    setDeleteId(p.id);
    setDeleteName(p.name);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    const table = deleteType === 'student' ? 'students' : 'parents';
    await supabase.from(table).delete().eq('id', deleteId);
    setDeleteOpen(false);
    load();
  };

  const getStudentParents = (studentId: string) => parents.filter((p) => p.student_id === studentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students & Parents</h1>
          <p className="text-sm text-slate-500 mt-1">Manage students and their parents</p>
        </div>
        <button
          onClick={() => openAddStudent()}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Student
        </button>
      </div>

      {grades.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Users size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Please create grades first in the Grades section.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grades.map((g) => {
            const gradeStudents = students.filter((s) => s.grade_id === g.id);
            const isExpanded = expandedGrade === g.id;
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedGrade(isExpanded ? null : g.id)}
                  className="flex items-center justify-between w-full px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Users size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                      <p className="text-xs text-slate-400">
                        {gradeStudents.length} student{gradeStudents.length !== 1 ? 's' : ''}
                        {g.key_stages ? ` · ${g.key_stages.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-50">
                    {gradeStudents.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <p className="text-sm text-slate-400 mb-3">No students in this grade yet.</p>
                        <button
                          onClick={() => openAddStudent(g.id)}
                          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Plus size={16} /> Add Student
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {gradeStudents.map((s) => {
                          const sParents = getStudentParents(s.id);
                          const mother = sParents.find((p) => p.type === 'mother');
                          const father = sParents.find((p) => p.type === 'father');
                          const guardians = sParents.filter((p) => p.type === 'guardian');
                          return (
                            <div key={s.id} className="px-5 py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <User size={16} className="text-slate-400" />
                                  <span className="text-sm font-medium text-slate-800">{s.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openAddParent(s.id)}
                                    className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                                    title="Add parent"
                                  >
                                    <Plus size={15} />
                                  </button>
                                  <button
                                    onClick={() => openEditStudent(s)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    onClick={() => openDeleteStudent(s)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                              {/* Parents list */}
                              {(mother || father || guardians.length > 0) && (
                                <div className="ml-6 mt-2 space-y-1">
                                  {mother && (
                                    <ParentRow label="Mother" name={mother.name} onEdit={() => openEditParent(mother)} onDelete={() => openDeleteParent(mother)} />
                                  )}
                                  {father && (
                                    <ParentRow label="Father" name={father.name} onEdit={() => openEditParent(father)} onDelete={() => openDeleteParent(father)} />
                                  )}
                                  {guardians.map((gd) => (
                                    <ParentRow key={gd.id} label="Guardian" name={gd.name} onEdit={() => openEditParent(gd)} onDelete={() => openDeleteParent(gd)} />
                                  ))}
                                </div>
                              )}
                              {!mother && !father && guardians.length === 0 && (
                                <p className="ml-6 mt-2 text-xs text-slate-400 italic">No parents added yet.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Student Modal */}
      <Modal open={studentModal} title={studentMode === 'add' ? 'Add Student' : 'Edit Student'} onClose={() => setStudentModal(false)} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Student Name</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. John Smith"
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Grade</label>
            <select
              value={studentGradeId}
              onChange={(e) => setStudentGradeId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>{g.name}{g.key_stages ? ` — ${g.key_stages.name}` : ''}</option>
              ))}
            </select>
          </div>
          {studentError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{studentError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setStudentModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
            <button onClick={handleSaveStudent} disabled={savingStudent} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {savingStudent ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Parent Modal */}
      <Modal open={parentModal} title={parentEditId ? 'Edit Parent' : 'Add Parent'} onClose={() => setParentModal(false)} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Parent Name</label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="e.g. Sarah Johnson"
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
            <select
              value={parentType}
              onChange={(e) => setParentType(e.target.value as 'mother' | 'father' | 'guardian')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="guardian">Guardian</option>
            </select>
          </div>
          {parentError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{parentError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setParentModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
            <button onClick={handleSaveParent} disabled={savingParent} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {savingParent ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title={deleteType === 'student' ? 'Delete Student' : 'Delete Parent'}
        message={
          deleteType === 'student'
            ? `Are you sure you want to delete "${deleteName}"? This will also delete all parents and attendance records for this student.`
            : `Are you sure you want to delete "${deleteName}"?`
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function ParentRow({ label, name, onEdit, onDelete }: {
  label: string; name: string; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-block w-14 text-slate-400">{label}</span>
        <span className="text-slate-600">{name}</span>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
