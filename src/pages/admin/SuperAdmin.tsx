import { useEffect, useState } from 'react';
import {
  Archive, CheckCircle2, Download, KeyRound, LockKeyhole, RefreshCw, ShieldCheck,
  Upload, UserRound,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type BackupRows = Record<string, unknown>[];

type BackupPayload = {
  version: number;
  created_at: string;
  key_stages: BackupRows;
  grades: BackupRows;
  students: BackupRows;
  parents: BackupRows;
  sessions: BackupRows;
  attendance: BackupRows;
  form_settings: BackupRows;
};

type BackupFrequency = 'off' | 'daily' | 'monthly' | 'yearly';

type BackupRecord = {
  id: string;
  kind: 'manual' | 'daily' | 'monthly' | 'yearly';
  label: string;
  payload: BackupPayload;
  created_at: string;
};

const backupTables = ['key_stages', 'grades', 'students', 'parents', 'sessions', 'attendance', 'form_settings'] as const;

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return payload.version === 1 && backupTables.every((table) => Array.isArray(payload[table]));
}

export default function SuperAdmin() {
  const { session, signOut } = useAuth();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [frequency, setFrequency] = useState<BackupFrequency>('off');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [email, setEmail] = useState(session?.user.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const loadBackups = async () => {
      const [backupResult, scheduleResult] = await Promise.all([
        supabase.from('system_backups').select('id, kind, label, payload, created_at').order('created_at', { ascending: false }),
        supabase.from('backup_settings').select('frequency').eq('id', 1).maybeSingle(),
      ]);
      if (backupResult.error || scheduleResult.error) {
        setError('Unable to load protected backup settings.');
      } else {
        setBackups((backupResult.data as BackupRecord[]) || []);
        if (scheduleResult.data?.frequency) setFrequency(scheduleResult.data.frequency as BackupFrequency);
      }
      setLoading(false);
    };
    loadBackups();
  }, []);

  const buildPayload = async (): Promise<BackupPayload | null> => {
    const results = await Promise.all(
      backupTables.map((table) => supabase.from(table).select('*')),
    );
    if (results.some((result) => result.error)) return null;

    return {
      version: 1,
      created_at: new Date().toISOString(),
      key_stages: (results[0].data || []) as BackupRows,
      grades: (results[1].data || []) as BackupRows,
      students: (results[2].data || []) as BackupRows,
      parents: (results[3].data || []) as BackupRows,
      sessions: (results[4].data || []) as BackupRows,
      attendance: (results[5].data || []) as BackupRows,
      form_settings: (results[6].data || []) as BackupRows,
    };
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    setError('');
    setMessage('');
    const { error: scheduleError } = await supabase
      .from('backup_settings')
      .upsert({ id: 1, frequency });
    if (scheduleError) setError('Could not save the automatic backup setting.');
    else setMessage(`Automatic backups set to ${frequency === 'off' ? 'off' : frequency}.`);
    setSavingSchedule(false);
  };

  const refreshBackups = async () => {
    const { data } = await supabase
      .from('system_backups')
      .select('id, kind, label, payload, created_at')
      .order('created_at', { ascending: false });
    setBackups((data as BackupRecord[]) || []);
  };

  const createSnapshot = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const payload = await buildPayload();
    if (!payload) {
      setError('Could not create a backup snapshot.');
      setBusy(false);
      return;
    }

    const { error: saveError } = await supabase.from('system_backups').insert({
      kind: 'manual',
      label: `Manual snapshot — ${new Date().toLocaleString('en-GB')}`,
      payload,
      created_by: session?.user.id,
    });
    if (saveError) {
      setError('Could not save the backup snapshot.');
    } else {
      setMessage('Backup snapshot created successfully.');
      await refreshBackups();
    }
    setBusy(false);
  };

  const downloadBackup = (backup: BackupRecord) => {
    const file = new Blob([JSON.stringify(backup.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `parents-attendance-backup-${backup.created_at.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const restorePayload = async (payload: BackupPayload) => {
    const restoreOrder: (keyof BackupPayload)[] = [
      'key_stages', 'grades', 'students', 'parents', 'sessions', 'attendance', 'form_settings',
    ];
    for (const table of restoreOrder) {
      const { error: restoreError } = await supabase.from(table).upsert(payload[table]);
      if (restoreError) return false;
    }
    return true;
  };

  const restoreBackup = async (payload: BackupPayload) => {
    if (!window.confirm('Restore this backup? Existing matching records will be updated, and super-admin accounts will stay unchanged.')) return;
    setBusy(true);
    setError('');
    setMessage('');
    const restored = await restorePayload(payload);
    if (restored) setMessage('Backup restored successfully.');
    else setError('The backup could not be restored completely.');
    setBusy(false);
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const payload: unknown = JSON.parse(await file.text());
      if (!isBackupPayload(payload)) {
        setError('This is not a valid attendance backup file.');
        return;
      }
      await restoreBackup(payload);
    } catch {
      setError('This backup file could not be read.');
    }
  };

  const updateCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    if (password && password.length < 8) {
      setError('The new password must be at least 8 characters.');
      setBusy(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      setBusy(false);
      return;
    }

    let changed = false;
    if (email.trim() && email.trim() !== session?.user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
      if (emailError) {
        setError('The username could not be updated.');
        setBusy(false);
        return;
      }
      changed = true;
    }
    if (password) {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) {
        setError('The password could not be updated.');
        setBusy(false);
        return;
      }
      changed = true;
    }

    setPassword('');
    setConfirmPassword('');
    setMessage(changed ? 'Super-admin credentials updated.' : 'No credential changes were made.');
    setBusy(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw size={28} className="text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center"><ShieldCheck size={22} className="text-blue-600" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
            <p className="text-sm text-slate-500 mt-1">Protect the account and application data</p>
          </div>
        </div>
      </div>

      {message && <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 size={17} />{message}</div>}
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><UserRound size={18} className="text-slate-600" /></div>
            <div><h2 className="text-sm font-semibold text-slate-800">Super-admin credentials</h2><p className="text-xs text-slate-400">The username is your sign-in email</p></div>
          </div>
          <form onSubmit={updateCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username (email)</label>
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
              <div className="relative"><KeyRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank to keep current password" className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><LockKeyhole size={16} />Save credentials</button>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Archive size={18} className="text-amber-600" /></div>
            <div><h2 className="text-sm font-semibold text-slate-800">Application backups</h2><p className="text-xs text-slate-400">Snapshots keep attendance, students, parents, sessions, and settings</p></div>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 mb-4">Backups never include passwords or super-admin accounts. Restoring updates matching records and leaves super-admin access unchanged.</p>
          <div className="rounded-xl bg-slate-50 p-3 mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Automatic backup option</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={frequency} onChange={(event) => setFrequency(event.target.value as BackupFrequency)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="off">Off</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <button onClick={saveSchedule} disabled={savingSchedule} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{savingSchedule ? 'Saving…' : 'Save option'}</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={createSnapshot} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"><Archive size={16} />Create snapshot</button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Upload size={16} />Restore file<input type="file" accept="application/json" onChange={importBackup} className="hidden" /></label>
          </div>
          <div className="mt-5 space-y-2 max-h-64 overflow-y-auto">
            {backups.length === 0 ? <p className="text-sm text-slate-400">No saved snapshots yet.</p> : backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-700">{backup.label}</p><p className="text-xs text-slate-400">{new Date(backup.created_at).toLocaleString('en-GB')}</p></div>
                <div className="flex shrink-0 items-center gap-1"><button onClick={() => downloadBackup(backup)} title="Download backup" className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-blue-600"><Download size={16} /></button><button onClick={() => restoreBackup(backup.payload)} title="Restore backup" disabled={busy} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-amber-600 disabled:opacity-50"><RefreshCw size={16} /></button></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-800">
        Automatic daily, monthly, and yearly snapshots require a server scheduler. This project currently has no scheduler enabled, so use the protected snapshot and download controls until one is connected.
      </div>
      <button onClick={() => signOut()} className="text-sm font-medium text-slate-500 hover:text-slate-800">Sign out of super admin</button>
    </div>
  );
}
