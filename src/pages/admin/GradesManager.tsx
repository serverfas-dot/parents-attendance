import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, GraduationCap, School, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { KeyStage, Grade } from '@/lib/types';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function GradesManager() {
  const [keyStages, setKeyStages] = useState<KeyStage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKs, setExpandedKs] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add-ks' | 'edit-ks' | 'add-grade' | 'edit-grade'>('add-ks');
  const [editId, setEditId] = useState('');
  const [name, setName] = useState('');
  const [selectedKsId, setSelectedKsId] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'ks' | 'grade'>('ks');
  const [deleteId, setDeleteId] = useState('');
  const [deleteName, setDeleteName] = useState('');

  const load = useCallback(async () => {
    const [ksRes, grRes] = await Promise.all([
      supabase.from('key_stages').select('*').order('name'),
      supabase.from('grades').select('*, key_stages(*)').order('name'),
    ]);
    setKeyStages(ksRes.data || []);
    setGrades(grRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAddKs = () => {
    setModalMode('add-ks');
    setEditId('');
    setName('');
    setModalError('');
    setModalOpen(true);
  };

  const openEditKs = (ks: KeyStage) => {
    setModalMode('edit-ks');
    setEditId(ks.id);
    setName(ks.name);
    setModalError('');
    setModalOpen(true);
  };

  const openAddGrade = (ksId: string) => {
    setModalMode('add-grade');
    setEditId('');
    setName('');
    setSelectedKsId(ksId);
    setModalError('');
    setModalOpen(true);
  };

  const openEditGrade = (g: Grade) => {
    setModalMode('edit-grade');
    setEditId(g.id);
    setName(g.name);
    setSelectedKsId(g.key_stage_id);
    setModalError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { setModalError('Name is required.'); return; }
    setSaving(true);
    setModalError('');

    if (modalMode === 'add-ks') {
      const { error } = await supabase.from('key_stages').insert({ name: name.trim() });
      if (error) { setModalError(error.message); setSaving(false); return; }
    } else if (modalMode === 'edit-ks') {
      const { error } = await supabase.from('key_stages').update({ name: name.trim() }).eq('id', editId);
      if (error) { setModalError(error.message); setSaving(false); return; }
    } else if (modalMode === 'add-grade') {
      const { error } = await supabase.from('grades').insert({ name: name.trim(), key_stage_id: selectedKsId });
      if (error) { setModalError(error.message); setSaving(false); return; }
    } else if (modalMode === 'edit-grade') {
      const { error } = await supabase.from('grades').update({ name: name.trim(), key_stage_id: selectedKsId }).eq('id', editId);
      if (error) { setModalError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    setModalOpen(false);
    load();
  };

  const openDeleteKs = (ks: KeyStage) => {
    setDeleteType('ks');
    setDeleteId(ks.id);
    setDeleteName(ks.name);
    setDeleteOpen(true);
  };

  const openDeleteGrade = (g: Grade) => {
    setDeleteType('grade');
    setDeleteId(g.id);
    setDeleteName(g.name);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    const table = deleteType === 'ks' ? 'key_stages' : 'grades';
    await supabase.from(table).delete().eq('id', deleteId);
    setDeleteOpen(false);
    load();
  };

  const getModalTitle = () => {
    switch (modalMode) {
      case 'add-ks': return 'Add Key Stage';
      case 'edit-ks': return 'Edit Key Stage';
      case 'add-grade': return 'Add Grade';
      case 'edit-grade': return 'Edit Grade';
    }
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Grades & Key Stages</h1>
          <p className="text-sm text-slate-500 mt-1">Manage key stages and their grades</p>
        </div>
        <button
          onClick={openAddKs}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Key Stage
        </button>
      </div>

      {/* Key Stages List */}
      {keyStages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <School size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No key stages yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keyStages.map((ks) => {
            const ksGrades = grades.filter((g) => g.key_stage_id === ks.id);
            const isExpanded = expandedKs === ks.id;
            return (
              <div key={ks.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Key Stage Header */}
                <div className="flex items-center justify-between px-5 py-4">
                  <button
                    onClick={() => setExpandedKs(isExpanded ? null : ks.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <School size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{ks.name}</p>
                      <p className="text-xs text-slate-400">{ksGrades.length} grade{ksGrades.length !== 1 ? 's' : ''}</p>
                    </div>
                    <ChevronRight
                      size={18}
                      className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => openEditKs(ks)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => openDeleteKs(ks)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Grades under this Key Stage */}
                {isExpanded && (
                  <div className="border-t border-slate-50">
                    {ksGrades.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <p className="text-sm text-slate-400 mb-3">No grades in this key stage yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {ksGrades.map((g) => (
                          <div key={g.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <GraduationCap size={18} className="text-slate-400" />
                              <span className="text-sm text-slate-700 font-medium">{g.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditGrade(g)}
                                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => openDeleteGrade(g)}
                                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="px-5 py-3 border-t border-slate-50">
                      <button
                        onClick={() => openAddGrade(ks.id)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Plus size={16} /> Add Grade to {ks.name}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} title={getModalTitle()} onClose={() => setModalOpen(false)} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {modalMode === 'add-ks' || modalMode === 'edit-ks' ? 'Key Stage Name' : 'Grade Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={modalMode.includes('ks') ? 'e.g. Key Stage 1' : 'e.g. Grade 5'}
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {(modalMode === 'add-grade' || modalMode === 'edit-grade') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Key Stage</label>
              <select
                value={selectedKsId}
                onChange={(e) => setSelectedKsId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {keyStages.map((ks) => (
                  <option key={ks.id} value={ks.id}>{ks.name}</option>
                ))}
              </select>
            </div>
          )}

          {modalError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{modalError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        title={deleteType === 'ks' ? 'Delete Key Stage' : 'Delete Grade'}
        message={
          deleteType === 'ks'
            ? `Are you sure you want to delete "${deleteName}"? This will also delete all grades, students, parents, and attendance records under it.`
            : `Are you sure you want to delete "${deleteName}"? This will also delete all students, parents, and attendance records under it.`
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
