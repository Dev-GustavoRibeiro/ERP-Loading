'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn, formatCurrency, formatDate } from '@/shared/lib/utils';
import {
  X, Plus, Search, Filter, Loader2, Eye, Edit, ArrowRight, Trash2,
  Users, UserPlus, AlertCircle, Phone, Mail, Building2, Tag,
  TrendingUp, Clock, CheckCircle2, Calendar, DollarSign, Briefcase,
  ChevronDown, BarChart3,
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/modules/financeiro/components/shared/DataTable';
import {
  DetailsDrawer, DetailSection, DetailField, DetailFieldGrid,
} from '@/modules/financeiro/components/shared/DetailsDrawer';
import {
  listLeads, getLeadKPIs, createLead, updateLead, deleteLead, convertLead,
  listPipelines, listSellers, type LeadRecord,
} from '@/app/actions/crm';
import toast from 'react-hot-toast';

// =====================================================
// Constants
// =====================================================

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'contatado', label: 'Contatado' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'desqualificado', label: 'Desqualificado' },
  { value: 'convertido', label: 'Convertido' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  contatado: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  qualificado: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  desqualificado: 'bg-red-500/15 text-red-400 border border-red-500/20',
  convertido: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
};

const ORIGEM_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'site', label: 'Site' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'redes_sociais', label: 'Redes Sociais' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'email_marketing', label: 'Email Marketing' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'evento', label: 'Evento' },
  { value: 'parceiro', label: 'Parceiro' },
  { value: 'outro', label: 'Outro' },
] as const;

const PAGE_SIZE = 15;

const INPUT_CLASS =
  'w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 placeholder:text-white/30 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all';

const SELECT_CLASS =
  'w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none';

// =====================================================
// Types
// =====================================================

interface LeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string | null;
}

interface LeadFormData {
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  cargo: string;
  origem: string;
  valor_estimado: number;
  owner_id: string;
  observacoes: string;
  status?: string;
}

interface ConvertFormData {
  pipeline_id: string;
  stage_id: string;
  opportunity_title: string;
  opportunity_value: number;
  opportunity_probability: number;
  expected_close_date: string;
}

interface FormErrors {
  [key: string]: string;
}

interface KPIs {
  total: number;
  novosHoje: number;
  semOwner: number;
  convertidos: number;
}

type Seller = { id: string; nome: string };
type Pipeline = {
  id: string; name: string;
  stages: { id: string; name: string; sort_order: number; probability_default: number; color: string; is_won: boolean; is_lost: boolean }[];
};

// =====================================================
// Helpers
// =====================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function validateLeadForm(data: LeadFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.nome.trim()) errors.nome = 'Nome é obrigatório';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Email inválido';
  if (data.valor_estimado < 0) errors.valor_estimado = 'Valor não pode ser negativo';
  return errors;
}

function validateConvertForm(data: ConvertFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.pipeline_id) errors.pipeline_id = 'Selecione um pipeline';
  if (!data.stage_id) errors.stage_id = 'Selecione um estágio';
  if (!data.opportunity_title.trim()) errors.opportunity_title = 'Título é obrigatório';
  return errors;
}

const emptyLeadForm = (): LeadFormData => ({
  nome: '', email: '', telefone: '', empresa: '', cargo: '',
  origem: 'manual', valor_estimado: 0, owner_id: '', observacoes: '',
});

const emptyConvertForm = (): ConvertFormData => ({
  pipeline_id: '', stage_id: '', opportunity_title: '',
  opportunity_value: 0, opportunity_probability: 0, expected_close_date: '',
});

// =====================================================
// Sub-components
// =====================================================

/* ---------- KPI Card ---------- */
const KPICard: React.FC<{
  label: string; value: number; icon: React.ElementType;
  color: string; loading: boolean;
}> = ({ label, value, icon: Icon, color, loading }) => (
  <div className="flex-1 min-w-[140px] bg-[#111827]/60 border border-white/[0.06] rounded-xl p-4 flex items-center gap-3">
    <div className={cn('p-2.5 rounded-lg', color)}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      {loading ? (
        <div className="h-5 w-10 bg-white/5 rounded animate-pulse" />
      ) : (
        <p className="text-lg font-bold text-white">{value.toLocaleString('pt-BR')}</p>
      )}
    </div>
  </div>
);

/* ---------- Status Badge ---------- */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={cn(
    'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full capitalize',
    STATUS_COLORS[status] || 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
  )}>
    {status}
  </span>
);

/* ---------- Form Field ---------- */
const FormField: React.FC<{
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}> = ({ label, error, required, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1.5">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

/* ---------- Confirm Dialog ---------- */
const ConfirmDialog: React.FC<{
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; loading?: boolean; variant?: 'danger' | 'primary';
}> = ({ isOpen, onClose, onConfirm, title, message, loading, variant = 'danger' }) => (
  <Portal>
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[95]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[95] w-full max-w-sm"
          >
            <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-6 shadow-2xl">
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 mb-6">{message}</p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={onClose} disabled={loading}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-[#252d3d] hover:bg-[#2d3548] text-white border border-white/10 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm} disabled={loading}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50',
                    variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  </Portal>
);

// =====================================================
// CreateLeadDialog
// =====================================================

const CreateLeadDialog: React.FC<{
  isOpen: boolean; onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void>;
  sellers: Seller[]; loading: boolean;
}> = ({ isOpen, onClose, onSubmit, sellers, loading }) => {
  const [form, setForm] = useState<LeadFormData>(emptyLeadForm());
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isOpen) { setForm(emptyLeadForm()); setErrors({}); }
  }, [isOpen]);

  const update = (key: keyof LeadFormData, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const errs = validateLeadForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    await onSubmit(form);
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-full max-w-lg max-h-[85vh] overflow-hidden"
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-400" />
                    <h3 className="text-base font-semibold text-white">Novo Lead</h3>
                  </div>
                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4 scrollbar-none">
                  <FormField label="Nome" required error={errors.nome}>
                    <input
                      value={form.nome} onChange={e => update('nome', e.target.value)}
                      placeholder="Nome do lead" className={INPUT_CLASS}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Email" error={errors.email}>
                      <input
                        type="email" value={form.email} onChange={e => update('email', e.target.value)}
                        placeholder="email@exemplo.com" className={INPUT_CLASS}
                      />
                    </FormField>
                    <FormField label="Telefone">
                      <input
                        value={form.telefone} onChange={e => update('telefone', e.target.value)}
                        placeholder="(00) 00000-0000" className={INPUT_CLASS}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Empresa">
                      <input
                        value={form.empresa} onChange={e => update('empresa', e.target.value)}
                        placeholder="Nome da empresa" className={INPUT_CLASS}
                      />
                    </FormField>
                    <FormField label="Cargo">
                      <input
                        value={form.cargo} onChange={e => update('cargo', e.target.value)}
                        placeholder="Cargo / Função" className={INPUT_CLASS}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Origem">
                      <div className="relative">
                        <select
                          value={form.origem} onChange={e => update('origem', e.target.value)}
                          className={SELECT_CLASS}
                        >
                          {ORIGEM_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </FormField>
                    <FormField label="Valor Estimado" error={errors.valor_estimado}>
                      <input
                        type="number" min={0} step={0.01}
                        value={form.valor_estimado} onChange={e => update('valor_estimado', parseFloat(e.target.value) || 0)}
                        placeholder="0,00" className={INPUT_CLASS}
                      />
                    </FormField>
                  </div>

                  <FormField label="Responsável">
                    <div className="relative">
                      <select
                        value={form.owner_id} onChange={e => update('owner_id', e.target.value)}
                        className={SELECT_CLASS}
                      >
                        <option value="">Sem responsável</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Observações">
                    <textarea
                      value={form.observacoes} onChange={e => update('observacoes', e.target.value)}
                      rows={3} placeholder="Notas sobre o lead..."
                      className={cn(INPUT_CLASS, 'resize-none')}
                    />
                  </FormField>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 shrink-0">
                  <button
                    onClick={onClose} disabled={loading}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[#252d3d] hover:bg-[#2d3548] text-white border border-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Criar Lead
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

// =====================================================
// EditLeadDialog
// =====================================================

const EditLeadDialog: React.FC<{
  isOpen: boolean; onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void>;
  lead: LeadRecord | null; sellers: Seller[]; loading: boolean;
}> = ({ isOpen, onClose, onSubmit, lead, sellers, loading }) => {
  const [form, setForm] = useState<LeadFormData>(emptyLeadForm());
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isOpen && lead) {
      setForm({
        nome: lead.nome || '',
        email: lead.email || '',
        telefone: lead.telefone || '',
        empresa: lead.empresa || '',
        cargo: lead.cargo || '',
        origem: lead.origem || 'manual',
        valor_estimado: lead.valor_estimado || 0,
        owner_id: lead.owner_id || '',
        observacoes: lead.observacoes || '',
        status: lead.status || 'novo',
      });
      setErrors({});
    }
  }, [isOpen, lead]);

  const update = (key: keyof LeadFormData, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const errs = validateLeadForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    await onSubmit(form);
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-full max-w-lg max-h-[85vh] overflow-hidden"
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <Edit className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-semibold text-white">Editar Lead</h3>
                  </div>
                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4 scrollbar-none">
                  <FormField label="Status">
                    <div className="relative">
                      <select
                        value={form.status || 'novo'} onChange={e => update('status', e.target.value)}
                        className={SELECT_CLASS}
                        disabled={lead?.status === 'convertido'}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Nome" required error={errors.nome}>
                    <input
                      value={form.nome} onChange={e => update('nome', e.target.value)}
                      placeholder="Nome do lead" className={INPUT_CLASS}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Email" error={errors.email}>
                      <input
                        type="email" value={form.email} onChange={e => update('email', e.target.value)}
                        placeholder="email@exemplo.com" className={INPUT_CLASS}
                      />
                    </FormField>
                    <FormField label="Telefone">
                      <input
                        value={form.telefone} onChange={e => update('telefone', e.target.value)}
                        placeholder="(00) 00000-0000" className={INPUT_CLASS}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Empresa">
                      <input
                        value={form.empresa} onChange={e => update('empresa', e.target.value)}
                        placeholder="Nome da empresa" className={INPUT_CLASS}
                      />
                    </FormField>
                    <FormField label="Cargo">
                      <input
                        value={form.cargo} onChange={e => update('cargo', e.target.value)}
                        placeholder="Cargo / Função" className={INPUT_CLASS}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Origem">
                      <div className="relative">
                        <select
                          value={form.origem} onChange={e => update('origem', e.target.value)}
                          className={SELECT_CLASS}
                        >
                          {ORIGEM_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </FormField>
                    <FormField label="Valor Estimado" error={errors.valor_estimado}>
                      <input
                        type="number" min={0} step={0.01}
                        value={form.valor_estimado} onChange={e => update('valor_estimado', parseFloat(e.target.value) || 0)}
                        placeholder="0,00" className={INPUT_CLASS}
                      />
                    </FormField>
                  </div>

                  <FormField label="Responsável">
                    <div className="relative">
                      <select
                        value={form.owner_id} onChange={e => update('owner_id', e.target.value)}
                        className={SELECT_CLASS}
                      >
                        <option value="">Sem responsável</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Observações">
                    <textarea
                      value={form.observacoes} onChange={e => update('observacoes', e.target.value)}
                      rows={3} placeholder="Notas sobre o lead..."
                      className={cn(INPUT_CLASS, 'resize-none')}
                    />
                  </FormField>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 shrink-0">
                  <button
                    onClick={onClose} disabled={loading}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[#252d3d] hover:bg-[#2d3548] text-white border border-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

// =====================================================
// ConvertLeadDialog
// =====================================================

const ConvertLeadDialog: React.FC<{
  isOpen: boolean; onClose: () => void;
  onSubmit: (data: ConvertFormData) => Promise<void>;
  lead: LeadRecord | null; pipelines: Pipeline[]; loading: boolean;
}> = ({ isOpen, onClose, onSubmit, lead, pipelines, loading }) => {
  const [form, setForm] = useState<ConvertFormData>(emptyConvertForm());
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isOpen && lead) {
      setForm({
        ...emptyConvertForm(),
        opportunity_title: lead.nome ? `Oportunidade - ${lead.nome}` : '',
        opportunity_value: lead.valor_estimado || 0,
      });
      setErrors({});
    }
  }, [isOpen, lead]);

  const selectedPipeline = useMemo(
    () => pipelines.find(p => p.id === form.pipeline_id),
    [pipelines, form.pipeline_id]
  );

  const stages = selectedPipeline?.stages || [];

  const update = (key: keyof ConvertFormData, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handlePipelineChange = (pipelineId: string) => {
    update('pipeline_id', pipelineId);
    const pipeline = pipelines.find(p => p.id === pipelineId);
    const firstStage = pipeline?.stages?.[0];
    if (firstStage) {
      setForm(prev => ({
        ...prev,
        pipeline_id: pipelineId,
        stage_id: firstStage.id,
        opportunity_probability: firstStage.probability_default || 0,
      }));
    } else {
      setForm(prev => ({ ...prev, pipeline_id: pipelineId, stage_id: '' }));
    }
  };

  const handleStageChange = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    setForm(prev => ({
      ...prev,
      stage_id: stageId,
      opportunity_probability: stage?.probability_default || prev.opportunity_probability,
    }));
  };

  const handleSubmit = async () => {
    const errs = validateConvertForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    await onSubmit(form);
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-full max-w-lg max-h-[85vh] overflow-hidden"
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-semibold text-white">Converter Lead em Oportunidade</h3>
                  </div>
                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Lead info */}
                {lead && (
                  <div className="px-5 py-3 bg-emerald-500/5 border-b border-white/[0.06]">
                    <p className="text-xs text-emerald-400 font-medium mb-1">Lead selecionado</p>
                    <p className="text-sm text-white font-medium">{lead.nome}</p>
                    {(lead.email || lead.empresa) && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[lead.email, lead.empresa].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4 scrollbar-none">
                  <FormField label="Pipeline" required error={errors.pipeline_id}>
                    <div className="relative">
                      <select
                        value={form.pipeline_id} onChange={e => handlePipelineChange(e.target.value)}
                        className={SELECT_CLASS}
                      >
                        <option value="">Selecione um pipeline...</option>
                        {pipelines.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Estágio" required error={errors.stage_id}>
                    <div className="relative">
                      <select
                        value={form.stage_id} onChange={e => handleStageChange(e.target.value)}
                        className={SELECT_CLASS}
                        disabled={stages.length === 0}
                      >
                        <option value="">Selecione o estágio...</option>
                        {stages.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Título da Oportunidade" required error={errors.opportunity_title}>
                    <input
                      value={form.opportunity_title} onChange={e => update('opportunity_title', e.target.value)}
                      placeholder="Título da oportunidade" className={INPUT_CLASS}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Valor">
                      <input
                        type="number" min={0} step={0.01}
                        value={form.opportunity_value}
                        onChange={e => update('opportunity_value', parseFloat(e.target.value) || 0)}
                        placeholder="0,00" className={INPUT_CLASS}
                      />
                    </FormField>
                    <FormField label="Probabilidade (%)">
                      <input
                        type="number" min={0} max={100}
                        value={form.opportunity_probability}
                        onChange={e => update('opportunity_probability', parseInt(e.target.value) || 0)}
                        placeholder="0" className={INPUT_CLASS}
                      />
                    </FormField>
                  </div>

                  <FormField label="Previsão de Fechamento">
                    <input
                      type="date" value={form.expected_close_date}
                      onChange={e => update('expected_close_date', e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 shrink-0">
                  <button
                    onClick={onClose} disabled={loading}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[#252d3d] hover:bg-[#2d3548] text-white border border-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <ArrowRight className="w-3.5 h-3.5" />
                    Converter
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

// =====================================================
// LeadDetailsDrawer
// =====================================================

const LeadDetailsDrawer: React.FC<{
  isOpen: boolean; onClose: () => void;
  lead: LeadRecord | null; sellers: Seller[];
  onEdit: () => void; onConvert: () => void; onDelete: () => void;
}> = ({ isOpen, onClose, lead, sellers, onEdit, onConvert, onDelete }) => {
  if (!lead) return null;

  const ownerName = sellers.find(s => s.id === lead.owner_id)?.nome || '—';
  const isConverted = lead.status === 'convertido';

  const statusColorMap: Record<string, string> = {
    novo: 'bg-blue-500/15 text-blue-400',
    contatado: 'bg-amber-500/15 text-amber-400',
    qualificado: 'bg-cyan-500/15 text-cyan-400',
    desqualificado: 'bg-red-500/15 text-red-400',
    convertido: 'bg-emerald-500/15 text-emerald-400',
  };

  return (
    <DetailsDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={lead.nome}
      subtitle={[lead.empresa, lead.cargo].filter(Boolean).join(' • ') || undefined}
      status={{
        label: lead.status,
        color: statusColorMap[lead.status] || 'bg-slate-500/15 text-slate-400',
      }}
      actions={[
        { label: 'Editar', icon: Edit, onClick: onEdit, variant: 'secondary' },
        ...(!isConverted ? [{ label: 'Converter', icon: ArrowRight, onClick: onConvert, variant: 'success' as const }] : []),
        { label: 'Excluir', icon: Trash2, onClick: onDelete, variant: 'danger' },
      ]}
      width="lg"
    >
      {/* Contact Info */}
      <DetailSection title="Informações de Contato" icon={Users}>
        <DetailField label="Email" value={
          lead.email ? (
            <a href={`mailto:${lead.email}`} className="text-blue-400 hover:underline flex items-center gap-1">
              <Mail className="w-3 h-3" />{lead.email}
            </a>
          ) : '—'
        } />
        <DetailField label="Telefone" value={
          lead.telefone ? (
            <a href={`tel:${lead.telefone}`} className="text-blue-400 hover:underline flex items-center gap-1">
              <Phone className="w-3 h-3" />{lead.telefone}
            </a>
          ) : '—'
        } />
        <DetailField label="Empresa" value={
          lead.empresa ? (
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400" />{lead.empresa}</span>
          ) : '—'
        } />
        <DetailField label="Cargo" value={lead.cargo || '—'} />
      </DetailSection>

      {/* Lead Details */}
      <DetailSection title="Detalhes do Lead" icon={Tag}>
        <DetailFieldGrid>
          <div>
            <DetailField label="Origem" value={
              <span className="capitalize">{lead.origem}</span>
            } />
          </div>
          <div>
            <DetailField label="Valor Estimado" value={
              <span className="text-emerald-400 font-semibold">{formatCurrency(lead.valor_estimado)}</span>
            } />
          </div>
        </DetailFieldGrid>
        <DetailField label="Responsável" value={ownerName} />
        <DetailField label="Status" value={<StatusBadge status={lead.status} />} />
      </DetailSection>

      {/* Dates */}
      <DetailSection title="Datas" icon={Calendar}>
        <DetailField label="Criado em" value={formatDate(lead.created_at)} />
        <DetailField label="Atualizado em" value={formatDate(lead.updated_at)} />
        {lead.next_activity_at && (
          <DetailField label="Próxima Atividade" value={formatDate(lead.next_activity_at)} />
        )}
        {lead.converted_at && (
          <DetailField label="Convertido em" value={formatDate(lead.converted_at)} />
        )}
      </DetailSection>

      {/* Notes */}
      {lead.observacoes && (
        <DetailSection title="Observações" icon={AlertCircle}>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{lead.observacoes}</p>
        </DetailSection>
      )}

      {/* Activity Timeline Placeholder */}
      <DetailSection title="Atividades" icon={Clock}>
        <div className="flex flex-col items-center py-6 text-center">
          <BarChart3 className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs text-slate-500">Timeline de atividades será exibida aqui.</p>
          <p className="text-xs text-slate-600 mt-1">Registre atividades no módulo de Atividades do CRM.</p>
        </div>
      </DetailSection>
    </DetailsDrawer>
  );
};

// =====================================================
// FilterPanel
// =====================================================

const FilterPanel: React.FC<{
  isOpen: boolean; onClose: () => void;
  filters: { status: string; origem: string; has_owner: string };
  onChange: (filters: { status: string; origem: string; has_owner: string }) => void;
  sellers: Seller[];
}> = ({ isOpen, onClose, filters, onChange, sellers }) => {
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    if (isOpen) setLocal(filters);
  }, [isOpen, filters]);

  const apply = () => { onChange(local); onClose(); };
  const clear = () => { onChange({ status: '', origem: '', has_owner: '' }); onClose(); };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
            />
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="fixed right-0 top-0 h-full w-full max-w-xs z-[90]"
            >
              <div className="h-full bg-[#1a1f2e] border-l border-white/10 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-white">Filtros</h3>
                  </div>
                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-none">
                  <FormField label="Status">
                    <div className="relative">
                      <select value={local.status} onChange={e => setLocal(p => ({ ...p, status: e.target.value }))} className={SELECT_CLASS}>
                        <option value="">Todos</option>
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Origem">
                    <div className="relative">
                      <select value={local.origem} onChange={e => setLocal(p => ({ ...p, origem: e.target.value }))} className={SELECT_CLASS}>
                        <option value="">Todas</option>
                        {ORIGEM_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Responsável">
                    <div className="relative">
                      <select value={local.has_owner} onChange={e => setLocal(p => ({ ...p, has_owner: e.target.value }))} className={SELECT_CLASS}>
                        <option value="">Todos</option>
                        <option value="with">Com responsável</option>
                        <option value="without">Sem responsável</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>
                </div>

                <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
                  <button
                    onClick={clear}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-[#252d3d] hover:bg-[#2d3548] text-white border border-white/10 transition-colors"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={apply}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

// =====================================================
// Main Component — LeadsModal
// =====================================================

export const LeadsModal: React.FC<LeadsModalProps> = ({ isOpen, onClose, empresaId }) => {
  // ---- Data State ----
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<KPIs>({ total: 0, novosHoje: 0, semOwner: 0, convertidos: 0 });
  const [kpisLoading, setKpisLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ---- Search & Filters ----
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [filters, setFilters] = useState({ status: '', origem: '', has_owner: '' });
  const hasActiveFilters = filters.status !== '' || filters.origem !== '' || filters.has_owner !== '';

  // ---- Dialog State ----
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---- Lookups ----
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  // ---- Load Leads ----
  const loadLeads = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const result = await listLeads(empresaId, {
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        origem: filters.origem || undefined,
        has_owner: filters.has_owner || undefined,
        page,
        pageSize: PAGE_SIZE,
        sortBy,
        sortOrder,
      });
      setLeads(result.data);
      setTotal(result.total);
    } catch {
      toast.error('Erro ao carregar leads');
    }
    setLoading(false);
  }, [empresaId, debouncedSearch, filters, page, sortBy, sortOrder]);

  // ---- Load KPIs ----
  const loadKPIs = useCallback(async () => {
    if (!empresaId) return;
    setKpisLoading(true);
    try {
      const data = await getLeadKPIs(empresaId);
      setKpis(data);
    } catch { /* silently handle */ }
    setKpisLoading(false);
  }, [empresaId]);

  // ---- Load Lookups ----
  const loadLookups = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [sellersData, pipelinesData] = await Promise.all([
        listSellers(empresaId),
        listPipelines(empresaId),
      ]);
      setSellers(sellersData as Seller[]);
      setPipelines(pipelinesData as Pipeline[]);
    } catch { /* silently handle */ }
  }, [empresaId]);

  // ---- Effects ----
  useEffect(() => {
    if (isOpen) {
      loadLeads();
      loadKPIs();
      loadLookups();
    }
  }, [isOpen, loadLeads, loadKPIs, loadLookups]);

  // Reset page on filter/search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  // ---- Handlers ----
  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
    setPage(1);
  }, []);

  const openDetails = (lead: LeadRecord) => {
    setSelectedLead(lead);
    setShowDetailsDrawer(true);
  };

  const openEdit = (lead?: LeadRecord) => {
    if (lead) setSelectedLead(lead);
    setShowDetailsDrawer(false);
    setShowEditDialog(true);
  };

  const openConvert = (lead?: LeadRecord) => {
    if (lead) setSelectedLead(lead);
    setShowDetailsDrawer(false);
    setShowConvertDialog(true);
  };

  const openDeleteConfirm = () => {
    setShowDetailsDrawer(false);
    setShowDeleteConfirm(true);
  };

  const handleCreate = async (data: LeadFormData) => {
    if (!empresaId) return;
    setSubmitting(true);
    try {
      const result = await createLead(empresaId, {
        nome: data.nome,
        email: data.email || undefined,
        telefone: data.telefone || undefined,
        empresa: data.empresa || undefined,
        cargo: data.cargo || undefined,
        origem: data.origem || undefined,
        valor_estimado: data.valor_estimado || undefined,
        owner_id: data.owner_id || undefined,
        observacoes: data.observacoes || undefined,
      });
      if (!result.success) {
        toast.error(result.error || 'Erro ao criar lead');
        setSubmitting(false);
        return;
      }
      toast.success('Lead criado com sucesso');
      setShowCreateDialog(false);
      loadLeads();
      loadKPIs();
    } catch {
      toast.error('Erro ao criar lead');
    }
    setSubmitting(false);
  };

  const handleEdit = async (data: LeadFormData) => {
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      const result = await updateLead(selectedLead.id, {
        nome: data.nome,
        email: data.email || null,
        telefone: data.telefone || null,
        empresa: data.empresa || null,
        cargo: data.cargo || null,
        origem: data.origem,
        valor_estimado: data.valor_estimado,
        owner_id: data.owner_id || null,
        observacoes: data.observacoes || null,
        status: data.status,
      });
      if (!result.success) {
        toast.error(result.error || 'Erro ao atualizar lead');
        setSubmitting(false);
        return;
      }
      toast.success('Lead atualizado com sucesso');
      setShowEditDialog(false);
      setSelectedLead(result.data as LeadRecord);
      loadLeads();
      loadKPIs();
    } catch {
      toast.error('Erro ao atualizar lead');
    }
    setSubmitting(false);
  };

  const handleConvert = async (data: ConvertFormData) => {
    if (!empresaId || !selectedLead) return;
    setSubmitting(true);
    try {
      const result = await convertLead(empresaId, {
        lead_id: selectedLead.id,
        pipeline_id: data.pipeline_id,
        stage_id: data.stage_id,
        opportunity_title: data.opportunity_title,
        opportunity_value: data.opportunity_value || undefined,
        opportunity_probability: data.opportunity_probability || undefined,
        expected_close_date: data.expected_close_date || undefined,
      });
      if (!result.success) {
        toast.error(result.error || 'Erro ao converter lead');
        setSubmitting(false);
        return;
      }
      toast.success('Lead convertido em oportunidade!');
      setShowConvertDialog(false);
      setSelectedLead(null);
      loadLeads();
      loadKPIs();
    } catch {
      toast.error('Erro ao converter lead');
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      const result = await deleteLead(selectedLead.id);
      if (!result.success) {
        toast.error(result.error || 'Erro ao excluir lead');
        setSubmitting(false);
        return;
      }
      toast.success('Lead excluído com sucesso');
      setShowDeleteConfirm(false);
      setSelectedLead(null);
      loadLeads();
      loadKPIs();
    } catch {
      toast.error('Erro ao excluir lead');
    }
    setSubmitting(false);
  };

  // ---- Table Columns ----
  const columns: DataTableColumn<LeadRecord>[] = useMemo(() => [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (row) => (
        <div className="min-w-[120px]">
          <p className="text-sm font-medium text-white truncate">{row.nome}</p>
          {row.cargo && <p className="text-xs text-slate-500 truncate">{row.cargo}</p>}
        </div>
      ),
    },
    {
      key: 'contato',
      label: 'Email / Telefone',
      render: (row) => (
        <div className="min-w-[140px]">
          {row.email && (
            <p className="text-xs text-slate-300 flex items-center gap-1 truncate">
              <Mail className="w-3 h-3 text-slate-500 shrink-0" />{row.email}
            </p>
          )}
          {row.telefone && (
            <p className="text-xs text-slate-400 flex items-center gap-1 truncate mt-0.5">
              <Phone className="w-3 h-3 text-slate-500 shrink-0" />{row.telefone}
            </p>
          )}
          {!row.email && !row.telefone && <span className="text-xs text-slate-600">—</span>}
        </div>
      ),
    },
    {
      key: 'empresa',
      label: 'Empresa',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-slate-300">{row.empresa || '—'}</span>
      ),
    },
    {
      key: 'origem',
      label: 'Origem',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-400 capitalize bg-white/5 px-2 py-0.5 rounded">
          {row.origem}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'valor_estimado',
      label: 'Valor Est.',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="text-sm font-medium text-emerald-400">
          {row.valor_estimado > 0 ? formatCurrency(row.valor_estimado) : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-400">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      width: '120px',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openDetails(row); }}
            title="Ver detalhes"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedLead(row); openEdit(row); }}
            title="Editar"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          {row.status !== 'convertido' && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedLead(row); openConvert(row); }}
              title="Converter"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ], [sellers]);

  // ---- Render ----
  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-4 sm:inset-8 z-[80] bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* ===== Header ===== */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Leads</h2>
                    <p className="text-xs text-slate-400">Gerencie seus leads e converta em oportunidades</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* ===== Body ===== */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-none">
                {/* KPI Bar */}
                <div className="flex flex-wrap gap-3">
                  <KPICard label="Total de Leads" value={kpis.total} icon={Users} color="bg-blue-500/10 text-blue-400" loading={kpisLoading} />
                  <KPICard label="Novos Hoje" value={kpis.novosHoje} icon={UserPlus} color="bg-emerald-500/10 text-emerald-400" loading={kpisLoading} />
                  <KPICard label="Sem Responsável" value={kpis.semOwner} icon={AlertCircle} color="bg-amber-500/10 text-amber-400" loading={kpisLoading} />
                  <KPICard label="Convertidos" value={kpis.convertidos} icon={CheckCircle2} color="bg-cyan-500/10 text-cyan-400" loading={kpisLoading} />
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="Buscar por nome, email, telefone, empresa..."
                      className={cn(INPUT_CLASS, 'pl-9')}
                    />
                  </div>

                  {/* Filter button */}
                  <button
                    onClick={() => setShowFilterPanel(true)}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg border transition-colors',
                      hasActiveFilters
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                        : 'bg-[#252d3d] hover:bg-[#2d3548] border-white/10 text-white'
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {hasActiveFilters && (
                      <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {[filters.status, filters.origem, filters.has_owner].filter(Boolean).length}
                      </span>
                    )}
                  </button>

                  {/* New Lead button */}
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors ml-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Lead
                  </button>
                </div>

                {/* DataTable */}
                <DataTable<LeadRecord>
                  columns={columns}
                  data={leads}
                  loading={loading}
                  emptyMessage="Nenhum lead encontrado"
                  emptyIcon={Users}
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={setPage}
                  onSort={handleSort}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onRowClick={openDetails}
                  getRowId={(row) => row.id}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Dialogs & Drawers ===== */}

      <LeadDetailsDrawer
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        lead={selectedLead}
        sellers={sellers}
        onEdit={() => openEdit()}
        onConvert={() => openConvert()}
        onDelete={openDeleteConfirm}
      />

      <CreateLeadDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreate}
        sellers={sellers}
        loading={submitting}
      />

      <EditLeadDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSubmit={handleEdit}
        lead={selectedLead}
        sellers={sellers}
        loading={submitting}
      />

      <ConvertLeadDialog
        isOpen={showConvertDialog}
        onClose={() => setShowConvertDialog(false)}
        onSubmit={handleConvert}
        lead={selectedLead}
        pipelines={pipelines}
        loading={submitting}
      />

      <FilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filters={filters}
        onChange={setFilters}
        sellers={sellers}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Excluir Lead"
        message={`Tem certeza que deseja excluir o lead "${selectedLead?.nome}"? Esta ação não pode ser desfeita.`}
        loading={submitting}
        variant="danger"
      />
    </Portal>
  );
};

export default LeadsModal;
