'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import {
  X, Plus, Search, Loader2, CheckCircle2, Edit, XCircle,
  Phone, Calendar, FileText, CheckSquare, Clock, AlertTriangle, Filter,
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/modules/financeiro/components/shared/DataTable';
import {
  listActivities,
  getActivityKPIs,
  createActivity,
  updateActivity,
  completeActivity,
  cancelActivity,
  listSellers,
  type ActivityRecord,
} from '@/app/actions/crm';

// =====================================================
// Types & Constants
// =====================================================

interface ActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string | null;
}

type QuickFilter = 'all' | 'today' | 'overdue' | 'week' | 'completed';
type TypeFilter = 'all' | 'task' | 'call' | 'meeting' | 'note';

interface ActivityFormData {
  type: string;
  title: string;
  description: string;
  due_at: string;
  priority: string;
  owner_id: string;
  lead_id: string;
  opportunity_id: string;
}

interface KPIs {
  today: number;
  overdue: number;
  thisWeek: number;
  completed: number;
}

interface SellerOption {
  id: string;
  nome: string;
}

const EMPTY_FORM: ActivityFormData = {
  type: 'task',
  title: '',
  description: '',
  due_at: '',
  priority: 'normal',
  owner_id: '',
  lead_id: '',
  opportunity_id: '',
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  task:    { label: 'Tarefa',  icon: CheckSquare, color: 'text-blue-400',   bgColor: 'bg-blue-500/10' },
  call:    { label: 'Ligacao', icon: Phone,       color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  meeting: { label: 'Reuniao', icon: Calendar,    color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  note:    { label: 'Nota',    icon: FileText,    color: 'text-amber-400',  bgColor: 'bg-amber-500/10' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  low:    { label: 'Baixa',   color: 'text-slate-400',  bgColor: 'bg-slate-500/10' },
  normal: { label: 'Normal',  color: 'text-blue-400',   bgColor: 'bg-blue-500/10' },
  high:   { label: 'Alta',    color: 'text-amber-400',  bgColor: 'bg-amber-500/10' },
  urgent: { label: 'Urgente', color: 'text-red-400',    bgColor: 'bg-red-500/10' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending:   { label: 'Pendente',   color: 'text-amber-400',   bgColor: 'bg-amber-500/10' },
  completed: { label: 'Concluida',  color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  cancelled: { label: 'Cancelada',  color: 'text-slate-400',   bgColor: 'bg-slate-500/10' },
};

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all',       label: 'Todos' },
  { key: 'today',     label: 'Hoje' },
  { key: 'overdue',   label: 'Vencidas' },
  { key: 'week',      label: 'Esta Semana' },
  { key: 'completed', label: 'Concluidas' },
];

const TYPE_FILTERS: { key: TypeFilter; label: string; icon: React.ElementType }[] = [
  { key: 'all',     label: 'Todos',   icon: Filter },
  { key: 'task',    label: 'Tarefa',  icon: CheckSquare },
  { key: 'call',    label: 'Ligacao', icon: Phone },
  { key: 'meeting', label: 'Reuniao', icon: Calendar },
  { key: 'note',    label: 'Nota',    icon: FileText },
];

const INPUT_CLASS = 'w-full px-3 py-2 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 placeholder:text-white/30 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all';
const SELECT_CLASS = 'w-full px-3 py-2 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none cursor-pointer';

// =====================================================
// Helpers
// =====================================================

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr.startsWith(today);
}

function isOverdue(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr.split('T')[0] < today;
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

function toLocalDatetimeValue(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// =====================================================
// KPI Card Component
// =====================================================

function KPICard({ label, value, icon: Icon, color, loading }: {
  label: string; value: number; icon: React.ElementType; color: string; loading: boolean;
}) {
  return (
    <div className="flex-1 min-w-[140px] bg-[#1a2235] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-white/50 font-medium">{label}</p>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white/30 mt-1" />
        ) : (
          <p className="text-xl font-bold text-white/90">{value}</p>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Create Activity Dialog
// =====================================================

function CreateActivityDialog({ isOpen, onClose, empresaId, sellers, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  sellers: SellerOption[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<ActivityFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_FORM });
      setError('');
    }
  }, [isOpen]);

  const handleChange = (field: keyof ActivityFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Titulo e obrigatorio.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await createActivity(empresaId, {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        due_at: form.due_at || undefined,
        priority: form.priority,
        owner_id: form.owner_id || undefined,
        lead_id: form.lead_id.trim() || undefined,
        opportunity_id: form.opportunity_id.trim() || undefined,
      });
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Erro ao criar atividade.');
      }
    } catch {
      setError('Erro inesperado ao criar atividade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-[#1a1f2e] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <h3 className="text-base font-semibold text-white/90">Nova Atividade</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Type & Priority row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Tipo</label>
                    <select
                      value={form.type}
                      onChange={(e) => handleChange('type', e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="task">Tarefa</option>
                      <option value="call">Ligacao</option>
                      <option value="meeting">Reuniao</option>
                      <option value="note">Nota</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Prioridade</label>
                    <select
                      value={form.priority}
                      onChange={(e) => handleChange('priority', e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="low">Baixa</option>
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Titulo *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Ex: Ligar para cliente sobre proposta"
                    className={INPUT_CLASS}
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Descricao</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Detalhes adicionais..."
                    rows={3}
                    className={cn(INPUT_CLASS, 'resize-none')}
                  />
                </div>

                {/* Due date & Owner row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Data/Hora Limite</label>
                    <input
                      type="datetime-local"
                      value={form.due_at}
                      onChange={(e) => handleChange('due_at', e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Responsavel</label>
                    <select
                      value={form.owner_id}
                      onChange={(e) => handleChange('owner_id', e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="">Sem responsavel</option>
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Associations */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <p className="text-xs font-medium text-white/40 mb-3">Associacao (opcional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Lead ID</label>
                      <input
                        type="text"
                        value={form.lead_id}
                        onChange={(e) => handleChange('lead_id', e.target.value)}
                        placeholder="UUID do lead"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Oportunidade ID</label>
                      <input
                        type="text"
                        value={form.opportunity_id}
                        onChange={(e) => handleChange('opportunity_id', e.target.value)}
                        placeholder="UUID da oportunidade"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                  >
                    <p className="text-xs text-red-400">{error}</p>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Criar Atividade
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}

// =====================================================
// Edit Activity Dialog
// =====================================================

function EditActivityDialog({ isOpen, onClose, empresaId, activity, sellers, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  activity: ActivityRecord | null;
  sellers: SellerOption[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<ActivityFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && activity) {
      setForm({
        type: activity.type || 'task',
        title: activity.title || '',
        description: activity.description || '',
        due_at: toLocalDatetimeValue(activity.due_at),
        priority: activity.priority || 'normal',
        owner_id: activity.owner_id || '',
        lead_id: activity.lead_id || '',
        opportunity_id: activity.opportunity_id || '',
      });
      setError('');
    }
  }, [isOpen, activity]);

  const handleChange = (field: keyof ActivityFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity) return;
    if (!form.title.trim()) {
      setError('Titulo e obrigatorio.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await updateActivity(activity.id, {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_at: form.due_at || null,
        priority: form.priority,
        owner_id: form.owner_id || null,
        lead_id: form.lead_id.trim() || null,
        opportunity_id: form.opportunity_id.trim() || null,
      });
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Erro ao atualizar atividade.');
      }
    } catch {
      setError('Erro inesperado ao atualizar atividade.');
    } finally {
      setSaving(false);
    }
  };

  const statusCfg = activity ? STATUS_CONFIG[activity.status] || STATUS_CONFIG.pending : STATUS_CONFIG.pending;

  return (
    <AnimatePresence>
      {isOpen && activity && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-[#1a1f2e] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-white/90">Editar Atividade</h3>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusCfg.bgColor, statusCfg.color)}>
                    {statusCfg.label}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Type & Priority row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Tipo</label>
                    <select
                      value={form.type}
                      onChange={(e) => handleChange('type', e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="task">Tarefa</option>
                      <option value="call">Ligacao</option>
                      <option value="meeting">Reuniao</option>
                      <option value="note">Nota</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Prioridade</label>
                    <select
                      value={form.priority}
                      onChange={(e) => handleChange('priority', e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="low">Baixa</option>
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Titulo *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Titulo da atividade"
                    className={INPUT_CLASS}
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Descricao</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Detalhes adicionais..."
                    rows={3}
                    className={cn(INPUT_CLASS, 'resize-none')}
                  />
                </div>

                {/* Due date & Owner row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Data/Hora Limite</label>
                    <input
                      type="datetime-local"
                      value={form.due_at}
                      onChange={(e) => handleChange('due_at', e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Responsavel</label>
                    <select
                      value={form.owner_id}
                      onChange={(e) => handleChange('owner_id', e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="">Sem responsavel</option>
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Associations */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <p className="text-xs font-medium text-white/40 mb-3">Associacao (opcional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Lead ID</label>
                      <input
                        type="text"
                        value={form.lead_id}
                        onChange={(e) => handleChange('lead_id', e.target.value)}
                        placeholder="UUID do lead"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Oportunidade ID</label>
                      <input
                        type="text"
                        value={form.opportunity_id}
                        onChange={(e) => handleChange('opportunity_id', e.target.value)}
                        placeholder="UUID da oportunidade"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                  >
                    <p className="text-xs text-red-400">{error}</p>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Salvar Alteracoes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}

// =====================================================
// Main Modal
// =====================================================

export const ActivitiesModal: React.FC<ActivitiesModalProps> = ({ isOpen, onClose, empresaId }) => {
  // Data state
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<KPIs>({ today: 0, overdue: 0, thisWeek: 0, completed: 0 });
  const [kpisLoading, setKpisLoading] = useState(false);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Filters
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityRecord | null>(null);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // ---- Debounced search ----
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // ---- Build filter params ----
  const buildFilters = useCallback(() => {
    const filters: Record<string, string | number | undefined> = {
      page,
      pageSize,
      search: debouncedSearch || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
    };

    switch (quickFilter) {
      case 'today':
        filters.due_filter = 'today';
        break;
      case 'overdue':
        filters.due_filter = 'overdue';
        break;
      case 'week':
        filters.due_filter = 'week';
        break;
      case 'completed':
        filters.status = 'completed';
        break;
      default:
        break;
    }

    return filters;
  }, [page, pageSize, debouncedSearch, typeFilter, quickFilter]);

  // ---- Load activities ----
  const loadActivities = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const filters = buildFilters();
      const result = await listActivities(empresaId, filters as Parameters<typeof listActivities>[1]);
      setActivities(result.data);
      setTotal(result.total);
    } catch {
      console.warn('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [empresaId, buildFilters]);

  // ---- Load KPIs ----
  const loadKPIs = useCallback(async () => {
    if (!empresaId) return;
    setKpisLoading(true);
    try {
      const result = await getActivityKPIs(empresaId);
      setKpis(result);
    } catch {
      console.warn('Failed to load activity KPIs');
    } finally {
      setKpisLoading(false);
    }
  }, [empresaId]);

  // ---- Load sellers ----
  const loadSellers = useCallback(async () => {
    if (!empresaId) return;
    try {
      const result = await listSellers(empresaId);
      setSellers(result as SellerOption[]);
    } catch {
      console.warn('Failed to load sellers');
    }
  }, [empresaId]);

  // ---- Initial load ----
  useEffect(() => {
    if (isOpen && empresaId) {
      loadActivities();
      loadKPIs();
      loadSellers();
    }
  }, [isOpen, empresaId, loadActivities, loadKPIs, loadSellers]);

  // ---- Reload on filter changes ----
  useEffect(() => {
    if (isOpen && empresaId) {
      loadActivities();
    }
  }, [isOpen, empresaId, quickFilter, typeFilter, debouncedSearch, page, loadActivities]);

  // ---- Reset state on close ----
  useEffect(() => {
    if (!isOpen) {
      setActivities([]);
      setPage(1);
      setQuickFilter('all');
      setTypeFilter('all');
      setSearchQuery('');
      setDebouncedSearch('');
    }
  }, [isOpen]);

  // ---- Handlers ----
  const handleRefresh = useCallback(() => {
    loadActivities();
    loadKPIs();
  }, [loadActivities, loadKPIs]);

  const handleQuickFilterChange = (filter: QuickFilter) => {
    setQuickFilter(filter);
    setPage(1);
  };

  const handleTypeFilterChange = (filter: TypeFilter) => {
    setTypeFilter(filter);
    setPage(1);
  };

  const handleComplete = async (activity: ActivityRecord) => {
    if (!empresaId) return;
    setActionLoadingId(activity.id);
    try {
      const result = await completeActivity(activity.id, empresaId);
      if (result.success) {
        handleRefresh();
      }
    } catch {
      console.warn('Failed to complete activity');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (activity: ActivityRecord) => {
    setActionLoadingId(activity.id);
    try {
      const result = await cancelActivity(activity.id);
      if (result.success) {
        handleRefresh();
      }
    } catch {
      console.warn('Failed to cancel activity');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEdit = (activity: ActivityRecord) => {
    setEditingActivity(activity);
    setShowEditDialog(true);
  };

  const handleDialogSuccess = () => {
    handleRefresh();
  };

  // ---- Table columns ----
  const columns: DataTableColumn<ActivityRecord>[] = [
    {
      key: 'type',
      label: 'Tipo',
      width: '100px',
      render: (row) => {
        const cfg = TYPE_CONFIG[row.type] || TYPE_CONFIG.task;
        const Icon = cfg.icon;
        return (
          <div className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', cfg.bgColor)}>
              <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
            </div>
            <span className="text-xs text-white/70 font-medium">{cfg.label}</span>
          </div>
        );
      },
    },
    {
      key: 'title',
      label: 'Titulo',
      render: (row) => (
        <div className="min-w-[150px]">
          <p className={cn(
            'text-sm font-medium truncate max-w-[280px]',
            row.status === 'completed' ? 'text-white/40 line-through' : 'text-white/90'
          )}>
            {row.title}
          </p>
          {row.description && (
            <p className="text-xs text-white/40 truncate max-w-[280px] mt-0.5">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'entity',
      label: 'Associado a',
      width: '160px',
      render: (row) => {
        const leadName = row.lead?.nome;
        const oppTitle = row.opportunity?.title;
        if (!leadName && !oppTitle) return <span className="text-xs text-white/30">-</span>;
        return (
          <div className="text-xs">
            {leadName && (
              <span className="text-blue-400/80">Lead: {leadName}</span>
            )}
            {oppTitle && (
              <span className="text-purple-400/80">{leadName ? ' | ' : ''}Opp: {oppTitle}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'due_at',
      label: 'Vencimento',
      width: '150px',
      sortable: true,
      render: (row) => {
        if (!row.due_at) return <span className="text-xs text-white/30">Sem data</span>;
        const overdue = row.status === 'pending' && isOverdue(row.due_at);
        const today = row.status === 'pending' && isToday(row.due_at);
        return (
          <div className="flex items-center gap-1.5">
            {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
            {today && !overdue && <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
            <span className={cn(
              'text-xs font-medium',
              overdue ? 'text-red-400' : today ? 'text-amber-400' : 'text-white/60'
            )}>
              {formatDueDate(row.due_at)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'priority',
      label: 'Prioridade',
      width: '100px',
      align: 'center',
      render: (row) => {
        const cfg = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.normal;
        return (
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', cfg.bgColor, cfg.color)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      align: 'center',
      render: (row) => {
        const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending;
        return (
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', cfg.bgColor, cfg.color)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Acoes',
      width: '120px',
      align: 'center',
      render: (row) => {
        const isActionLoading = actionLoadingId === row.id;
        const isPending = row.status === 'pending';

        if (isActionLoading) {
          return <Loader2 className="w-4 h-4 animate-spin text-white/30 mx-auto" />;
        }

        return (
          <div className="flex items-center justify-center gap-1">
            {isPending && (
              <button
                onClick={(e) => { e.stopPropagation(); handleComplete(row); }}
                title="Concluir"
                className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
              title="Editar"
              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-white/40 hover:text-blue-400 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            {isPending && (
              <button
                onClick={(e) => { e.stopPropagation(); handleCancel(row); }}
                title="Cancelar"
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // ---- Render ----
  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-6xl max-h-[90vh] bg-[#1a1f2e] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white/90">Atividades</h2>
                    <p className="text-xs text-white/40">Gerencie tarefas, ligacoes, reunioes e notas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Atividade
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5 text-white/50" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* KPI Cards */}
                <div className="flex gap-3 flex-wrap">
                  <KPICard
                    label="Hoje"
                    value={kpis.today}
                    icon={Clock}
                    color="bg-amber-500/10 text-amber-400"
                    loading={kpisLoading}
                  />
                  <KPICard
                    label="Vencidas"
                    value={kpis.overdue}
                    icon={AlertTriangle}
                    color="bg-red-500/10 text-red-400"
                    loading={kpisLoading}
                  />
                  <KPICard
                    label="Prox. 7 dias"
                    value={kpis.thisWeek}
                    icon={Calendar}
                    color="bg-blue-500/10 text-blue-400"
                    loading={kpisLoading}
                  />
                  <KPICard
                    label="Concluidas"
                    value={kpis.completed}
                    icon={CheckCircle2}
                    color="bg-emerald-500/10 text-emerald-400"
                    loading={kpisLoading}
                  />
                </div>

                {/* Quick filter tabs */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1">
                    {QUICK_FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => handleQuickFilterChange(f.key)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                          quickFilter === f.key
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Type filter pills */}
                  <div className="flex items-center gap-1.5">
                    {TYPE_FILTERS.map((f) => {
                      const Icon = f.icon;
                      return (
                        <button
                          key={f.key}
                          onClick={() => handleTypeFilterChange(f.key)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                            typeFilter === f.key
                              ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                              : 'border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/[0.12]'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar atividades por titulo..."
                    className={cn(INPUT_CLASS, 'pl-10')}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-white/40" />
                    </button>
                  )}
                </div>

                {/* Data Table */}
                <DataTable<ActivityRecord>
                  columns={columns}
                  data={activities}
                  loading={loading}
                  emptyMessage="Nenhuma atividade encontrada"
                  emptyIcon={CheckSquare}
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  getRowId={(row) => row.id}
                />
              </div>
            </motion.div>

            {/* Create Dialog */}
            {empresaId && (
              <CreateActivityDialog
                isOpen={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                empresaId={empresaId}
                sellers={sellers}
                onSuccess={handleDialogSuccess}
              />
            )}

            {/* Edit Dialog */}
            {empresaId && (
              <EditActivityDialog
                isOpen={showEditDialog}
                onClose={() => { setShowEditDialog(false); setEditingActivity(null); }}
                empresaId={empresaId}
                activity={editingActivity}
                sellers={sellers}
                onSuccess={handleDialogSuccess}
              />
            )}
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
};

export default ActivitiesModal;
