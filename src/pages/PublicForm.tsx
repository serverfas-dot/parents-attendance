import { useEffect, useState, useCallback } from 'react';
import {
  CalendarCheck, ChevronDown, Check, Clock, Lock, ShieldCheck, Users, XCircle, Settings,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Grade, Student, Parent, FormSettings } from '@/lib/types';

export default function PublicForm() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allParents, setAllParents] = useState<Parent[]>([]);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedMotherId, setSelectedMotherId] = useState('');
  const [selectedFatherId, setSelectedFatherId] = useState('');
  const [useGuardian, setUseGuardian] = useState(false);
  const [guardianName, setGuardianName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const loadData = useCallback(async () => {
    const [grRes, stRes, paRes, fsRes] = await Promise.all([
      supabase.from('grades').select('*, key_stages(*)').order('name'),
      supabase.from('students').select('*').order('name'),
      supabase.from('parents').select('*'),
      supabase.from('form_settings').select('*').maybeSingle(),
    ]);

    if (grRes.data) setGrades(grRes.data);
    if (stRes.data) setStudents(stRes.data);
    if (paRes.data) setAllParents(paRes.data);
    if (fsRes.data) setFormSettings(fsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isFormOpen = (): boolean => {
    if (!formSettings) return false;
    if (formSettings.manual_override) return formSettings.is_open;
    const now = new Date();
    if (formSettings.open_time && formSettings.close_time) {
      const open = new Date(formSettings.open_time);
      const close = new Date(formSettings.close_time);
      return now >= open && now <= close;
    }
    return formSettings.is_open;
  };

  const formOpen = isFormOpen();

  // Filter students by selected grade
  const gradeStudents = students.filter((s) => s.grade_id === selectedGradeId);

  // Get parents for the selected student
  const studentParents = allParents.filter((p) => p.student_id === selectedStudentId);
  const mothers = studentParents.filter((p) => p.type === 'mother');
  const fathers = studentParents.filter((p) => p.type === 'father');

  const handleGradeChange = (gradeId: string) => {
    setSelectedGradeId(gradeId);
    setSelectedStudentId('');
    setSelectedMotherId('');
    setSelectedFatherId('');
    setUseGuardian(false);
    setGuardianName('');
    setError('');
  };

  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedMotherId('');
    setSelectedFatherId('');
    setUseGuardian(false);
    setGuardianName('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedStudentId || !selectedGradeId) {
      setError('Please select a grade and student.');
      return;
    }

    if (!useGuardian && !selectedMotherId && !selectedFatherId) {
      setError('Please select at least one parent attending, or choose the guardian option.');
      return;
    }

    if (useGuardian && !guardianName.trim()) {
      setError('Please enter the guardian name.');
      return;
    }

    let attendeeName = '';
    const motherAttended = !useGuardian && !!selectedMotherId;
    const fatherAttended = !useGuardian && !!selectedFatherId;
    const guardianAttended = useGuardian;

    if (motherAttended) {
      const m = mothers.find((p) => p.id === selectedMotherId);
      if (m) attendeeName += m.name;
    }
    if (fatherAttended) {
      const f = fathers.find((p) => p.id === selectedFatherId);
      if (f) attendeeName += (attendeeName ? ', ' : '') + f.name;
    }
    if (guardianAttended) {
      attendeeName += (attendeeName ? ', ' : '') + guardianName.trim();
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from('attendance').insert({
      student_id: selectedStudentId,
      grade_id: selectedGradeId,
      mother_attended: motherAttended,
      father_attended: fatherAttended,
      guardian_name: guardianAttended ? guardianName.trim() : null,
      guardian_attended: guardianAttended,
      attendee_name: attendeeName,
      attendance_date: new Date().toISOString().split('T')[0],
    });

    setSubmitting(false);

    if (insertError) {
      if (insertError.code === '23505') {
        setError('Attendance has already been submitted for this student today.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    }

    setSuccess(true);
  };

  const resetForm = () => {
    setSelectedGradeId('');
    setSelectedStudentId('');
    setSelectedMotherId('');
    setSelectedFatherId('');
    setUseGuardian(false);
    setGuardianName('');
    setSuccess(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading attendance form…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col items-center px-3 py-6 sm:px-4 sm:py-12">
      {/* Header */}
      <div className="w-full max-w-2xl mb-6 sm:mb-8">
        <div className="flex flex-col items-center text-center">
          <img src={`${import.meta.env.BASE_URL}png%20copy.png`} alt="" className="w-20 h-20 sm:w-24 sm:h-24 object-contain mb-4" />
          <p className="text-sm text-slate-500 mt-1.5">{today}</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        {!formOpen ? (
          <div className="px-6 py-16 sm:px-10 sm:py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
              <Lock size={28} className="text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Form is Currently Closed</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              The attendance form is not open at this time. Please return during the scheduled hours.
              {formSettings?.open_time && formSettings?.close_time && (
                <span className="block mt-3 text-xs text-slate-400">
                  Opens: {new Date(formSettings.open_time).toLocaleString('en-GB')}<br />
                  Closes: {new Date(formSettings.close_time).toLocaleString('en-GB')}
                </span>
              )}
            </p>
          </div>
        ) : success ? (
          <div className="px-6 py-16 sm:px-10 sm:py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
              <Check size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Attendance Submitted</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
              Thank you! Your attendance has been recorded successfully.
            </p>
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Submit Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">
            {/* Date Display */}
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
              <CalendarCheck size={18} className="text-blue-600" />
              <span>{today}</span>
            </div>

            {/* Grade */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Grade</label>
              <div className="relative">
                <select
                  value={selectedGradeId}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">Select a grade</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}{g.key_stages ? ` — ${g.key_stages.name}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Student Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Student Name</label>
              <div className="relative">
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  disabled={!selectedGradeId}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Select a student</option>
                  {gradeStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {selectedGradeId && gradeStudents.length === 0 && (
                <p className="text-xs text-amber-500 mt-1.5">No students found for this grade.</p>
              )}
            </div>

            {/* Parent Selection — only show when student is selected */}
            {selectedStudentId && (
              <>
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={18} className="text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-700">Who is attending?</h3>
                  </div>

                  {/* Mother Dropdown */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Mother</label>
                    {mothers.length > 0 ? (
                      <div className="relative">
                        <select
                          value={selectedMotherId}
                          onChange={(e) => { setSelectedMotherId(e.target.value); setUseGuardian(false); }}
                          disabled={useGuardian}
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="">— Not attending —</option>
                          {mothers.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No mother registered for this student.</p>
                    )}
                  </div>

                  {/* Father Dropdown */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Father</label>
                    {fathers.length > 0 ? (
                      <div className="relative">
                        <select
                          value={selectedFatherId}
                          onChange={(e) => { setSelectedFatherId(e.target.value); setUseGuardian(false); }}
                          disabled={useGuardian}
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="">— Not attending —</option>
                          {fathers.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No father registered for this student.</p>
                    )}
                  </div>

                  {/* Guardian Option */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={useGuardian}
                        onChange={(e) => {
                          setUseGuardian(e.target.checked);
                          if (e.target.checked) {
                            setSelectedMotherId('');
                            setSelectedFatherId('');
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                      />
                      <span className="text-sm font-medium text-slate-600">
                        A guardian is attending instead
                      </span>
                    </label>
                    {useGuardian && (
                      <input
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="Enter guardian name"
                        className="w-full mt-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !selectedStudentId}
              className="w-full py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/15 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Submit Attendance
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Clock size={12} />
          Form status: {formOpen ? 'Open' : 'Closed'}
        </p>
        <a
          href="#admin"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Settings size={12} />
          Admin Login
        </a>
      </div>
    </div>
  );
}
