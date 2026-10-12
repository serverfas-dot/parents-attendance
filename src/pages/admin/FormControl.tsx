import { useEffect, useState, useCallback } from 'react';
import {
  Clock, Calendar, ToggleLeft, ToggleRight, Save, AlertCircle, Plus, Pencil, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { FormSettings, Session } from '@/lib/types';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function FormControl() {
  const [settings, setSettings] = useState<FormSettings | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [addingSession, setAddingSession] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState('');
  const [editingSessionName, setEditingSessionName] = useState('');
  const [savingSession, setSavingSession] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState('');
  const [deleteSessionName, setDeleteSessionName] = useState('');
  const [deleteSessionOpen, setDeleteSessionOpen] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  // Form state
  const [useSchedule, setUseSchedule] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');

  const load = useCallback(async () => {
    try {
      const [settingsRes, sessionsRes] = await Promise.all([
      supabase.from('form_settings').select('*').maybeSingle(),
      supabase.from('sessions').select('*').order('created_at', { ascending: false }),
    ]);
    const data = settingsRes.data;
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (data) {
      setSettings(data);
      setSelectedSessionId(data.session_id);
      setManualOpen(data.is_open);
      setUseSchedule(!data.manual_override && data.open_time !== null);
      if (data.open_time) {
        setOpenTime(toLocalInput(data.open_time));
      }
      if (data.close_time) {
        setCloseTime(toLocalInput(data.close_time));
      }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sessionName.trim();
    if (!name) return;

    setAddingSession(true);
    setSessionError('');
    const { data, error } = await supabase.from('sessions').insert({ name }).select().maybeSingle();
    setAddingSession(false);

    if (error || !data) {
      setSessionError('Unable to add this session. Please try again.');
      return;
    }

    setSessionName('');
    setSelectedSessionId(data.id);
    await load();
  };

  const startEditSession = (session: Session) => {
    setEditingSessionId(session.id);
    setEditingSessionName(session.name);
    setSessionError('');
  };

  const cancelEditSession = () => {
    setEditingSessionId('');
    setEditingSessionName('');
  };

  const handleEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = editingSessionName.trim();
    if (!editingSessionId || !name) return;

    setSavingSession(true);
    setSessionError('');
    const { error } = await supabase.from('sessions').update({ name }).eq('id', editingSessionId);
    setSavingSession(false);
    if (error) {
      setSessionError('Unable to update this session. Please try again.');
      return;
    }
    cancelEditSession();
    await load();
  };

  const openDeleteSession = (session: Session) => {
    setDeleteSessionId(session.id);
    setDeleteSessionName(session.name);
    setDeleteSessionOpen(true);
    setSessionError('');
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;
    if (sessions.length <= 1) {
      setSessionError('Keep at least one attendance session.');
      setDeleteSessionOpen(false);
      return;
    }

    const { count: attendanceCount, error: countError } = await supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', deleteSessionId);
    if (countError || (attendanceCount || 0) > 0) {
      setSessionError('This session has attendance records and must be kept for history.');
      setDeleteSessionOpen(false);
      return;
    }

    const replacement = sessions.find((session) => session.id !== deleteSessionId);
    if (selectedSessionId === deleteSessionId && replacement && settings) {
      const { error: settingsError } = await supabase
        .from('form_settings')
        .update({ session_id: replacement.id })
        .eq('id', settings.id);
      if (settingsError) {
        setSessionError('The default session could not be changed.');
        setDeleteSessionOpen(false);
        return;
      }
      setSelectedSessionId(replacement.id);
    }

    const { error } = await supabase.from('sessions').delete().eq('id', deleteSessionId);
    setDeleteSessionOpen(false);
    if (error) {
      setSessionError('This session could not be deleted.');
      return;
    }
    setDeleteSessionId('');
    setDeleteSessionName('');
    await load();
  };

  const toLocalInput = (iso: string): string => {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const isCurrentlyOpen = (): boolean => {
    if (!settings) return false;
    if (settings.manual_override) return settings.is_open;
    const now = new Date();
    if (settings.open_time && settings.close_time) {
      return now >= new Date(settings.open_time) && now <= new Date(settings.close_time);
    }
    return settings.is_open;
  };

  const handleSave = async () => {
    setSaving(true);

    const updates = {
      is_open: useSchedule ? false : manualOpen,
      manual_override: !useSchedule,
      open_time: useSchedule && openTime ? new Date(openTime).toISOString() : null,
      close_time: useSchedule && closeTime ? new Date(closeTime).toISOString() : null,
      session_id: selectedSessionId,
    };

    if (settings) {
      await supabase.from('form_settings').update(updates).eq('id', settings.id);
    } else {
      await supabase.from('form_settings').insert(updates);
    }

    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
    load();
  };

  const toggleManual = async () => {
    if (!settings) return;
    const newVal = !manualOpen;
    setManualOpen(newVal);
    await supabase.from('form_settings').update({
      is_open: newVal,
      manual_override: true,
    }).eq('id', settings.id);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const currentlyOpen = isCurrentlyOpen();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Form Control</h1>
        <p className="text-sm text-slate-500 mt-1">Control when the public attendance form is open</p>
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Calendar size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Attendance Sessions</h2>
            <p className="text-xs text-slate-400">Add sessions that parents can select on the public form</p>
          </div>
        </div>

        <form onSubmit={handleAddSession} className="flex flex-col sm:flex-row gap-2">
          <input
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="For example: Term 1 2026"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button
            type="submit"
            disabled={addingSession || !sessionName.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            {addingSession ? 'Adding…' : 'Add Session'}
          </button>
        </form>
        {sessionError && <p className="text-sm text-red-600 mt-2">{sessionError}</p>}

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-slate-500">Manage sessions</p>
          {sessions.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-400">No attendance sessions yet.</p>
          ) : sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
              {editingSessionId === session.id ? (
                <form onSubmit={handleEditSession} className="flex flex-1 items-center gap-2">
                  <input
                    autoFocus
                    value={editingSessionName}
                    onChange={(e) => setEditingSessionName(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button type="submit" disabled={savingSession || !editingSessionName.trim()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">{savingSession ? 'Saving…' : 'Save'}</button>
                  <button type="button" onClick={cancelEditSession} className="rounded-lg px-2 py-2 text-xs font-medium text-slate-500 hover:bg-white">Cancel</button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{session.name}</span>
                  {selectedSessionId === session.id && <span className="text-xs text-blue-600">Default</span>}
                  <button type="button" onClick={() => startEditSession(session)} title="Edit session" className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-blue-600"><Pencil size={15} /></button>
                  <button type="button" onClick={() => openDeleteSession(session)} title="Delete session" className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-500"><Trash2 size={15} /></button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Default session for the form</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            disabled={sessions.length === 0}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Select a session</option>
            {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
          </select>
        </div>
      </div>

      <ConfirmDialog
        open={deleteSessionOpen}
        title="Delete Attendance Session"
        message={`Are you sure you want to delete "${deleteSessionName}"? Sessions still used by attendance records cannot be removed.`}
        onConfirm={handleDeleteSession}
        onCancel={() => setDeleteSessionOpen(false)}
        confirmLabel="Delete session"
      />

      {/* Current Status */}
      <div className={`rounded-2xl border p-5 ${currentlyOpen ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentlyOpen ? 'bg-green-100' : 'bg-slate-200'}`}>
            {currentlyOpen
              ? <ToggleRight size={26} className="text-green-600" />
              : <ToggleLeft size={26} className="text-slate-400" />}
          </div>
          <div>
            <p className={`text-lg font-semibold ${currentlyOpen ? 'text-green-700' : 'text-slate-600'}`}>
              Form is {currentlyOpen ? 'Open' : 'Closed'}
            </p>
            <p className="text-xs text-slate-400">
              {settings?.manual_override
                ? 'Controlled manually by admin'
                : settings?.open_time && settings?.close_time
                  ? `Scheduled: ${new Date(settings.open_time).toLocaleString('en-GB')} — ${new Date(settings.close_time).toLocaleString('en-GB')}`
                  : 'No schedule set'}
            </p>
          </div>
        </div>
      </div>

      {/* Manual Toggle */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Manual Override</h2>
              <p className="text-xs text-slate-400">Open or close the form immediately</p>
            </div>
          </div>
          <button
            onClick={toggleManual}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              manualOpen ? 'bg-green-500' : 'bg-slate-300'
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              manualOpen ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          When manual override is active, the form {manualOpen ? 'is open regardless of schedule' : 'is closed regardless of schedule'}.
        </p>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Calendar size={18} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Scheduled Open/Close</h2>
            <p className="text-xs text-slate-400">Set a time window when the form is automatically open</p>
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={useSchedule}
            onChange={(e) => setUseSchedule(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
          />
          <span className="text-sm font-medium text-slate-700">Use scheduled open/close times</span>
        </label>

        {useSchedule && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Open Time</label>
              <input
                type="datetime-local"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Close Time</label>
              <input
                type="datetime-local"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        )}

        {useSchedule && (!openTime || !closeTime) && (
          <div className="flex items-center gap-2 mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            <AlertCircle size={14} />
            Both open and close times are required for scheduling.
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {savedMsg && (
          <span className="ml-3 text-sm text-green-600">Settings saved successfully!</span>
        )}
      </div>
    </div>
  );
}
