'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn, formatCurrency } from '@/shared/lib/utils';
import {
  X, Plus, Loader2, DollarSign, TrendingUp, Trophy, XCircle,
  GripVertical, ChevronDown, Target, Calendar, User, Search,
  AlertTriangle, Phone, Mail,
} from 'lucide-react';
import {
  listOpportunities,
  getOpportunityKPIs,
  createOpportunity,
  moveOpportunityStage,
  winOpportunity,
  loseOpportunity,
  listPipelines,
  listLossReasons,
  listSellers,
  type OpportunityRecord,
} from '@/app/actions/crm';

// =====================================================
// Types
// =====================================================

interface PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string | null;
}

interface PipelineData {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  stages: StageData[];
}

interface StageData {
  id: string;
  name: string;
  sort_order: number;
  probability_default: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

interface KPIs {
  totalFunnel: number;
  forecast: number;
  wonThisMonth: number;
  wonValueThisMonth: number;
  lostThisMonth: number;
  openCount: number;
}

interface SellerData {
  id: string;
  nome: string;
}

interface LossReasonData {
  id: string;
  name: string;
}

interface CreateForm {
  title: string;
  pipeline_id: string;
  stage_id: string;
  value: string;
  probability: string;
  expected_close_date: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  origin: string;
  observacoes: string;
  owner_id: string;
}

const INITIAL_CREATE_FORM: CreateForm = {
  title: '',
  pipeline_id: '',
  stage_id: '',
  value: '',
  probability: '',
  expected_close_date: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  origin: '',
  observacoes: '',
  owner_id: '',
};

const ORIGIN_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'site', label: 'Site' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'rede_social', label: 'Rede Social' },
  { value: 'evento', label: 'Evento' },
  { value: 'parceiro', label: 'Parceiro' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'manual', label: 'Manual' },
];

const STAGE_COLORS: Record<string, string> = {
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#EAB308',
  red: '#EF4444',
  purple: '#A855F7',
  orange: '#F97316',
  pink: '#EC4899',
  cyan: '#06B6D4',
  indigo: '#6366F1',
  emerald: '#10B981',
  teal: '#14B8A6',
  lime: '#84CC16',
  amber: '#F59E0B',
  rose: '#F43F5E',
  gray: '#6B7280',
};

function getStageColor(color: string): string {
  if (color.startsWith('#')) return color;
  return STAGE_COLORS[color] || STAGE_COLORS.blue;
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const INPUT_CLS =
  'w-full bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 px-3 py-2 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-white/30';

const SELECT_CLS =
  'w-full bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 px-3 py-2 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none cursor-pointer';

const LABEL_CLS = 'block text-xs font-medium text-white/50 mb-1';

// =====================================================
// KPI Card
// =====================================================

function KpiCard({ icon: Icon, label, value, color }: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-[#111827]/60 rounded-lg border border-white/[0.06] px-4 py-3 min-w-[180px]">
      <div className={cn('p-2 rounded-lg', color)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-white/40 truncate">{label}</p>
        <p className="text-sm font-semibold text-white/90 truncate">{value}</p>
      </div>
    </div>
  );
}

// =====================================================
// Opportunity Card (Kanban)
// =====================================================

function OpportunityCard({
  opp,
  onDragStart,
  onClick,
  onWin,
  onLose,
  stageIsWon,
  stageIsLost,
}: {
  opp: OpportunityRecord;
  onDragStart: (e: React.DragEvent, opp: OpportunityRecord) => void;
  onClick: (opp: OpportunityRecord) => void;
  onWin: (opp: OpportunityRecord) => void;
  onLose: (opp: OpportunityRecord) => void;
  stageIsWon: boolean;
  stageIsLost: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, opp)}
      onClick={() => onClick(opp)}
      className={cn(
        'bg-[#1a2235] rounded-lg border border-white/[0.06] p-3 cursor-grab active:cursor-grabbing',
        'hover:border-white/15 transition-all group select-none',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-white/90 truncate flex-1">{opp.title}</h4>
        <GripVertical size={14} className="text-white/20 group-hover:text-white/40 flex-shrink-0 mt-0.5" />
      </div>

      {opp.value > 0 && (
        <p className="text-sm font-semibold text-emerald-400/90 mb-2">
          R$ {fmt(opp.value)}
        </p>
      )}

      <div className="flex flex-col gap-1 text-[11px] text-white/40">
        {opp.contact_name && (
          <div className="flex items-center gap-1.5 truncate">
            <User size={11} className="flex-shrink-0" />
            <span className="truncate">{opp.contact_name}</span>
          </div>
        )}
        {opp.probability > 0 && (
          <div className="flex items-center gap-1.5">
            <Target size={11} className="flex-shrink-0" />
            <span>{opp.probability}% probabilidade</span>
          </div>
        )}
        {opp.expected_close_date && (
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className="flex-shrink-0" />
            <span>{new Date(opp.expected_close_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
        )}
      </div>

      {/* Quick Win/Lose Buttons */}
      {opp.status === 'open' && !stageIsWon && !stageIsLost && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onWin(opp); }}
            className="flex items-center gap-1 text-[10px] font-medium text-emerald-400/70 hover:text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/10 transition-all"
          >
            <Trophy size={11} /> Ganhar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onLose(opp); }}
            className="flex items-center gap-1 text-[10px] font-medium text-red-400/70 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-all"
          >
            <XCircle size={11} /> Perder
          </button>
        </div>
      )}
    </motion.div>
  );
}

// =====================================================
// Kanban Column
// =====================================================

function KanbanColumn({
  stage,
  opportunities,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
  isDragOver,
  onCardClick,
  onWin,
  onLose,
}: {
  stage: StageData;
  opportunities: OpportunityRecord[];
  onDragStart: (e: React.DragEvent, opp: OpportunityRecord) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  isDragOver: boolean;
  onCardClick: (opp: OpportunityRecord) => void;
  onWin: (opp: OpportunityRecord) => void;
  onLose: (opp: OpportunityRecord) => void;
}) {
  const totalValue = opportunities.reduce((sum, o) => sum + (o.value || 0), 0);
  const color = getStageColor(stage.color);

  return (
    <div
      className={cn(
        'min-w-[280px] max-w-[320px] w-[300px] bg-[#111827]/60 rounded-xl border flex flex-col flex-shrink-0 transition-colors',
        isDragOver
          ? 'bg-blue-500/5 border-blue-500/20'
          : 'border-white/[0.06]',
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      {/* Column Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div
          className="w-1 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white/80 truncate">{stage.name}</h3>
            <span className="text-[11px] font-medium text-white/30 bg-white/5 rounded-full px-2 py-0.5">
              {opportunities.length}
            </span>
          </div>
          {totalValue > 0 && (
            <p className="text-[11px] text-white/30 mt-0.5">
              R$ {fmt(totalValue)}
            </p>
          )}
        </div>
        {stage.is_won && (
          <Trophy size={14} className="text-emerald-400/50 flex-shrink-0" />
        )}
        {stage.is_lost && (
          <XCircle size={14} className="text-red-400/50 flex-shrink-0" />
        )}
      </div>

      {/* Cards */}
      <div className="px-3 pb-3 flex-1 overflow-y-auto space-y-2 min-h-[60px] max-h-[calc(100vh-380px)]">
        <AnimatePresence mode="popLayout">
          {opportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              onDragStart={onDragStart}
              onClick={onCardClick}
              onWin={onWin}
              onLose={onLose}
              stageIsWon={stage.is_won}
              stageIsLost={stage.is_lost}
            />
          ))}
        </AnimatePresence>
        {opportunities.length === 0 && (
          <div className="flex items-center justify-center h-16 text-[11px] text-white/20">
            Sem oportunidades
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Create Opportunity Dialog
// =====================================================

function CreateOpportunityDialog({
  isOpen,
  onClose,
  onSubmit,
  pipelines,
  selectedPipelineId,
  sellers,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: CreateForm) => Promise<void>;
  pipelines: PipelineData[];
  selectedPipelineId: string;
  sellers: SellerData[];
  loading: boolean;
}) {
  const [form, setForm] = useState<CreateForm>({
    ...INITIAL_CREATE_FORM,
    pipeline_id: selectedPipelineId,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm({ ...INITIAL_CREATE_FORM, pipeline_id: selectedPipelineId });
      setError('');
    }
  }, [isOpen, selectedPipelineId]);

  const selectedPipeline = pipelines.find((p) => p.id === form.pipeline_id);
  const filteredStages = selectedPipeline?.stages?.filter((s) => !s.is_won && !s.is_lost) || [];

  const handleChange = (field: keyof CreateForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'pipeline_id') {
      setForm((prev) => ({ ...prev, [field]: value, stage_id: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Título é obrigatório'); return; }
    if (!form.pipeline_id) { setError('Pipeline é obrigatório'); return; }
    if (!form.stage_id) { setError('Estágio é obrigatório'); return; }
    setError('');
    await onSubmit(form);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[90]"
            onClick={onClose}
          />
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-[#1a1f2e] rounded-2xl border border-white/[0.08] shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <h2 className="text-base font-semibold text-white/90">Nova Oportunidade</h2>
                <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 overflow-y-auto max-h-[calc(85vh-130px)] space-y-4">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className={LABEL_CLS}>Título *</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="Nome da oportunidade"
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                  />
                </div>

                {/* Pipeline + Stage */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Pipeline *</label>
                    <select
                      className={SELECT_CLS}
                      value={form.pipeline_id}
                      onChange={(e) => handleChange('pipeline_id', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {pipelines.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Estágio *</label>
                    <select
                      className={SELECT_CLS}
                      value={form.stage_id}
                      onChange={(e) => handleChange('stage_id', e.target.value)}
                      disabled={!form.pipeline_id}
                    >
                      <option value="">Selecione...</option>
                      {filteredStages.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Value + Probability */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Valor (R$)</label>
                    <input
                      type="number"
                      className={INPUT_CLS}
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                      value={form.value}
                      onChange={(e) => handleChange('value', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Probabilidade (%)</label>
                    <input
                      type="number"
                      className={INPUT_CLS}
                      placeholder="0"
                      min="0"
                      max="100"
                      value={form.probability}
                      onChange={(e) => handleChange('probability', e.target.value)}
                    />
                  </div>
                </div>

                {/* Close date + Origin */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Previsão de Fechamento</label>
                    <input
                      type="date"
                      className={INPUT_CLS}
                      value={form.expected_close_date}
                      onChange={(e) => handleChange('expected_close_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Origem</label>
                    <select
                      className={SELECT_CLS}
                      value={form.origin}
                      onChange={(e) => handleChange('origin', e.target.value)}
                    >
                      {ORIGIN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contact */}
                <div className="pt-2 border-t border-white/[0.04]">
                  <p className="text-xs font-medium text-white/40 mb-3">Contato</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={LABEL_CLS}>Nome</label>
                      <input
                        type="text"
                        className={INPUT_CLS}
                        placeholder="Nome"
                        value={form.contact_name}
                        onChange={(e) => handleChange('contact_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>E-mail</label>
                      <input
                        type="email"
                        className={INPUT_CLS}
                        placeholder="email@..."
                        value={form.contact_email}
                        onChange={(e) => handleChange('contact_email', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Telefone</label>
                      <input
                        type="text"
                        className={INPUT_CLS}
                        placeholder="(00) 0000-0000"
                        value={form.contact_phone}
                        onChange={(e) => handleChange('contact_phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Owner */}
                <div>
                  <label className={LABEL_CLS}>Responsável</label>
                  <select
                    className={SELECT_CLS}
                    value={form.owner_id}
                    onChange={(e) => handleChange('owner_id', e.target.value)}
                  >
                    <option value="">Sem responsável</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className={LABEL_CLS}>Observações</label>
                  <textarea
                    className={cn(INPUT_CLS, 'resize-none h-20')}
                    placeholder="Anotações sobre esta oportunidade..."
                    value={form.observacoes}
                    onChange={(e) => handleChange('observacoes', e.target.value)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white/80 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={cn(
                    'px-5 py-2 text-sm font-medium rounded-lg transition-all',
                    'bg-blue-600 hover:bg-blue-500 text-white',
                    'disabled:opacity-50 disabled:pointer-events-none',
                  )}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Criar Oportunidade'}
                </button>
              </div>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}

// =====================================================
// Win Dialog
// =====================================================

function WinDialog({
  isOpen,
  onClose,
  onSubmit,
  loading,
  oppTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { won_notes: string; actual_close_date: string }) => Promise<void>;
  loading: boolean;
  oppTitle: string;
}) {
  const [notes, setNotes] = useState('');
  const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setCloseDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[95]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-0 z-[95] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-[#1a1f2e] rounded-2xl border border-white/[0.08] shadow-2xl w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Trophy size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-white/90">Marcar como Ganha</h3>
                  <p className="text-xs text-white/40 truncate">{oppTitle}</p>
                </div>
                <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className={LABEL_CLS}>Data de Fechamento</label>
                  <input
                    type="date"
                    className={INPUT_CLS}
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Notas de Vitória</label>
                  <textarea
                    className={cn(INPUT_CLS, 'resize-none h-24')}
                    placeholder="Detalhes sobre o fechamento..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white/80 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onSubmit({ won_notes: notes, actual_close_date: closeDate })}
                  disabled={loading}
                  className={cn(
                    'px-5 py-2 text-sm font-medium rounded-lg transition-all',
                    'bg-emerald-600 hover:bg-emerald-500 text-white',
                    'disabled:opacity-50 disabled:pointer-events-none',
                  )}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Vitória'}
                </button>
              </div>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}

// =====================================================
// Lose Dialog
// =====================================================

function LoseDialog({
  isOpen,
  onClose,
  onSubmit,
  loading,
  oppTitle,
  lossReasons,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { loss_reason_id: string; loss_notes: string }) => Promise<void>;
  loading: boolean;
  oppTitle: string;
  lossReasons: LossReasonData[];
}) {
  const [reasonId, setReasonId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReasonId('');
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!reasonId) { setError('Selecione um motivo de perda'); return; }
    setError('');
    onSubmit({ loss_reason_id: reasonId, loss_notes: notes });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[95]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-0 z-[95] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-[#1a1f2e] rounded-2xl border border-white/[0.08] shadow-2xl w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                  <XCircle size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-white/90">Marcar como Perdida</h3>
                  <p className="text-xs text-white/40 truncate">{oppTitle}</p>
                </div>
                <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}
                <div>
                  <label className={LABEL_CLS}>Motivo da Perda *</label>
                  <select
                    className={SELECT_CLS}
                    value={reasonId}
                    onChange={(e) => setReasonId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {lossReasons.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Notas sobre a Perda</label>
                  <textarea
                    className={cn(INPUT_CLS, 'resize-none h-24')}
                    placeholder="Detalhes sobre o motivo..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white/80 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={cn(
                    'px-5 py-2 text-sm font-medium rounded-lg transition-all',
                    'bg-red-600 hover:bg-red-500 text-white',
                    'disabled:opacity-50 disabled:pointer-events-none',
                  )}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Perda'}
                </button>
              </div>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}

// =====================================================
// Opportunity Detail Drawer
// =====================================================

function OpportunityDetailDrawer({
  opp,
  onClose,
  onWin,
  onLose,
}: {
  opp: OpportunityRecord | null;
  onClose: () => void;
  onWin: (opp: OpportunityRecord) => void;
  onLose: (opp: OpportunityRecord) => void;
}) {
  return (
    <AnimatePresence>
      {opp && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="absolute top-0 right-0 h-full w-[360px] bg-[#1a1f2e] border-l border-white/[0.08] z-[85] shadow-2xl overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#1a1f2e]">
            <h3 className="text-sm font-semibold text-white/90 truncate pr-2">Detalhes</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Title & Status */}
            <div>
              <h2 className="text-base font-semibold text-white/90 mb-1">{opp.title}</h2>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-[11px] font-medium px-2 py-0.5 rounded-full',
                  opp.status === 'won' && 'bg-emerald-500/15 text-emerald-400',
                  opp.status === 'lost' && 'bg-red-500/15 text-red-400',
                  opp.status === 'open' && 'bg-blue-500/15 text-blue-400',
                )}>
                  {opp.status === 'won' ? 'Ganha' : opp.status === 'lost' ? 'Perdida' : 'Aberta'}
                </span>
                {opp.stage?.name && (
                  <span className="text-[11px] text-white/30">{opp.stage.name}</span>
                )}
              </div>
            </div>

            {/* Value */}
            {opp.value > 0 && (
              <div className="bg-[#111827]/60 rounded-lg border border-white/[0.06] p-4">
                <p className="text-[11px] text-white/40 mb-1">Valor</p>
                <p className="text-xl font-bold text-emerald-400">R$ {fmt(opp.value)}</p>
                {opp.probability > 0 && (
                  <p className="text-xs text-white/40 mt-1">
                    Forecast: R$ {fmt(opp.value * opp.probability / 100)} ({opp.probability}%)
                  </p>
                )}
              </div>
            )}

            {/* Contact Info */}
            {(opp.contact_name || opp.contact_email || opp.contact_phone) && (
              <div>
                <p className="text-xs font-medium text-white/40 mb-2">Contato</p>
                <div className="space-y-2">
                  {opp.contact_name && (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <User size={13} className="text-white/30 flex-shrink-0" />
                      <span>{opp.contact_name}</span>
                    </div>
                  )}
                  {opp.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Mail size={13} className="text-white/30 flex-shrink-0" />
                      <span className="truncate">{opp.contact_email}</span>
                    </div>
                  )}
                  {opp.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Phone size={13} className="text-white/30 flex-shrink-0" />
                      <span>{opp.contact_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dates */}
            <div>
              <p className="text-xs font-medium text-white/40 mb-2">Datas</p>
              <div className="space-y-2 text-sm text-white/60">
                {opp.expected_close_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Previsão</span>
                    <span>{new Date(opp.expected_close_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {opp.actual_close_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Fechamento</span>
                    <span>{new Date(opp.actual_close_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-white/40">Criado em</span>
                  <span>{new Date(opp.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>

            {/* Origin */}
            {opp.origin && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Origem</span>
                <span className="text-white/60 capitalize">{opp.origin}</span>
              </div>
            )}

            {/* Notes */}
            {opp.observacoes && (
              <div>
                <p className="text-xs font-medium text-white/40 mb-2">Observações</p>
                <p className="text-sm text-white/60 bg-[#111827]/60 rounded-lg border border-white/[0.06] p-3 whitespace-pre-wrap">
                  {opp.observacoes}
                </p>
              </div>
            )}

            {/* Won/Lost notes */}
            {opp.won_notes && (
              <div>
                <p className="text-xs font-medium text-emerald-400/60 mb-2">Notas de Vitória</p>
                <p className="text-sm text-white/60 bg-emerald-500/5 rounded-lg border border-emerald-500/10 p-3 whitespace-pre-wrap">
                  {opp.won_notes}
                </p>
              </div>
            )}
            {opp.loss_notes && (
              <div>
                <p className="text-xs font-medium text-red-400/60 mb-2">Notas de Perda</p>
                <p className="text-sm text-white/60 bg-red-500/5 rounded-lg border border-red-500/10 p-3 whitespace-pre-wrap">
                  {opp.loss_notes}
                </p>
              </div>
            )}

            {/* Actions */}
            {opp.status === 'open' && (
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
                <button
                  onClick={() => onWin(opp)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                >
                  <Trophy size={14} /> Ganhar
                </button>
                <button
                  onClick={() => onLose(opp)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                >
                  <XCircle size={14} /> Perder
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =====================================================
// Main PipelineModal
// =====================================================

export function PipelineModal({ isOpen, onClose, empresaId }: PipelineModalProps) {
  // Data state
  const [pipelines, setPipelines] = useState<PipelineData[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [sellers, setSellers] = useState<SellerData[]>([]);
  const [lossReasonsList, setLossReasonsList] = useState<LossReasonData[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [winTarget, setWinTarget] = useState<OpportunityRecord | null>(null);
  const [loseTarget, setLoseTarget] = useState<OpportunityRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<OpportunityRecord | null>(null);

  // Drag state
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const draggedOppRef = useRef<OpportunityRecord | null>(null);

  // Scroll ref
  const boardRef = useRef<HTMLDivElement>(null);

  // =====================================================
  // Data Loading
  // =====================================================

  const loadPipelines = useCallback(async () => {
    if (!empresaId) return;
    const data = await listPipelines(empresaId);
    const typed = data as PipelineData[];
    setPipelines(typed);

    // Auto-select default pipeline or first one
    if (typed.length > 0 && !selectedPipelineId) {
      const defaultPipe = typed.find((p) => p.is_default) || typed[0];
      setSelectedPipelineId(defaultPipe.id);
    }
  }, [empresaId, selectedPipelineId]);

  const loadOpportunities = useCallback(async () => {
    if (!empresaId || !selectedPipelineId) return;
    const result = await listOpportunities(empresaId, {
      pipeline_id: selectedPipelineId,
      status: 'open',
      pageSize: 200,
      search: searchQuery || undefined,
    });
    setOpportunities(result.data);
  }, [empresaId, selectedPipelineId, searchQuery]);

  const loadKPIs = useCallback(async () => {
    if (!empresaId) return;
    const data = await getOpportunityKPIs(empresaId, selectedPipelineId || undefined);
    setKpis(data);
  }, [empresaId, selectedPipelineId]);

  const loadSellers = useCallback(async () => {
    if (!empresaId) return;
    const data = await listSellers(empresaId);
    setSellers(data as SellerData[]);
  }, [empresaId]);

  const loadLossReasons = useCallback(async () => {
    if (!empresaId) return;
    const data = await listLossReasons(empresaId);
    setLossReasonsList(data as LossReasonData[]);
  }, [empresaId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadPipelines(), loadSellers(), loadLossReasons()]);
    } finally {
      setLoading(false);
    }
  }, [loadPipelines, loadSellers, loadLossReasons]);

  const refreshBoard = useCallback(async () => {
    await Promise.all([loadOpportunities(), loadKPIs()]);
  }, [loadOpportunities, loadKPIs]);

  // Initial load
  useEffect(() => {
    if (isOpen && empresaId) {
      loadAll();
    }
  }, [isOpen, empresaId, loadAll]);

  // Reload board when pipeline or search changes
  useEffect(() => {
    if (isOpen && empresaId && selectedPipelineId) {
      refreshBoard();
    }
  }, [isOpen, empresaId, selectedPipelineId, refreshBoard]);

  // Debounced search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      // refreshBoard will be triggered by effect
    }, 300);
  }, []);

  // =====================================================
  // Actions
  // =====================================================

  const handleCreateOpportunity = useCallback(async (form: CreateForm) => {
    if (!empresaId) return;
    setActionLoading(true);
    try {
      const result = await createOpportunity(empresaId, {
        title: form.title,
        pipeline_id: form.pipeline_id,
        stage_id: form.stage_id,
        value: form.value ? parseFloat(form.value) : 0,
        probability: form.probability ? parseInt(form.probability) : 0,
        expected_close_date: form.expected_close_date || undefined,
        origin: form.origin || undefined,
        owner_id: form.owner_id || undefined,
        contact_name: form.contact_name || undefined,
        contact_email: form.contact_email || undefined,
        contact_phone: form.contact_phone || undefined,
        observacoes: form.observacoes || undefined,
      });
      if (result.success) {
        setShowCreateDialog(false);
        await refreshBoard();
      }
    } finally {
      setActionLoading(false);
    }
  }, [empresaId, refreshBoard]);

  const handleDragStart = useCallback((e: React.DragEvent, opp: OpportunityRecord) => {
    draggedOppRef.current = opp;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', opp.id);
    // Add drag styling via class
    const target = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => {
      target.style.opacity = '0.5';
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStageId(stageId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if actually leaving the column (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDragOverStageId(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);

    const opp = draggedOppRef.current;
    if (!opp || !empresaId) return;
    if (opp.stage_id === toStageId) return;

    draggedOppRef.current = null;

    // Optimistic update
    setOpportunities((prev) =>
      prev.map((o) => (o.id === opp.id ? { ...o, stage_id: toStageId } : o)),
    );

    try {
      const result = await moveOpportunityStage(empresaId, opp.id, opp.stage_id, toStageId);
      if (!result.success) {
        // Revert optimistic update
        setOpportunities((prev) =>
          prev.map((o) => (o.id === opp.id ? { ...o, stage_id: opp.stage_id } : o)),
        );
      } else {
        // Refresh to get updated data
        await refreshBoard();
      }
    } catch {
      // Revert on error
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opp.id ? { ...o, stage_id: opp.stage_id } : o)),
      );
    }
  }, [empresaId, refreshBoard]);

  const handleWin = useCallback(async (data: { won_notes: string; actual_close_date: string }) => {
    if (!winTarget) return;
    setActionLoading(true);
    try {
      const result = await winOpportunity(winTarget.id, data);
      if (result.success) {
        setWinTarget(null);
        setDetailTarget(null);
        await refreshBoard();
      }
    } finally {
      setActionLoading(false);
    }
  }, [winTarget, refreshBoard]);

  const handleLose = useCallback(async (data: { loss_reason_id: string; loss_notes: string }) => {
    if (!loseTarget) return;
    setActionLoading(true);
    try {
      const result = await loseOpportunity(loseTarget.id, data);
      if (result.success) {
        setLoseTarget(null);
        setDetailTarget(null);
        await refreshBoard();
      }
    } finally {
      setActionLoading(false);
    }
  }, [loseTarget, refreshBoard]);

  // =====================================================
  // Derived data
  // =====================================================

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages || [];

  const opportunitiesByStage = stages.reduce<Record<string, OpportunityRecord[]>>((acc, stage) => {
    acc[stage.id] = opportunities.filter((o) => o.stage_id === stage.id);
    return acc;
  }, {});

  // =====================================================
  // Render
  // =====================================================

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[80]"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="fixed inset-3 lg:inset-6 z-[80] flex flex-col bg-[#1a1f2e] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
            >
              {/* ===== Header ===== */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-4">
                  <h1 className="text-lg font-bold text-white/90">Pipeline</h1>

                  {/* Pipeline Selector */}
                  <div className="relative">
                    <select
                      className={cn(
                        SELECT_CLS,
                        'min-w-[200px] pr-8 text-sm font-medium',
                      )}
                      value={selectedPipelineId}
                      onChange={(e) => setSelectedPipelineId(e.target.value)}
                    >
                      {pipelines.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>

                  {/* Search */}
                  <div className="relative hidden md:block">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      className={cn(INPUT_CLS, 'pl-9 w-[220px]')}
                      placeholder="Buscar oportunidade..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                      'bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.98]',
                    )}
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Nova Oportunidade</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="text-white/40 hover:text-white/80 p-2 hover:bg-white/5 rounded-lg transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* ===== KPI Bar ===== */}
              {kpis && (
                <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.04] overflow-x-auto flex-shrink-0">
                  <KpiCard
                    icon={DollarSign}
                    label="Total no Funil"
                    value={formatCurrency(kpis.totalFunnel)}
                    color="bg-blue-500/10 text-blue-400"
                  />
                  <KpiCard
                    icon={TrendingUp}
                    label="Forecast"
                    value={formatCurrency(kpis.forecast)}
                    color="bg-purple-500/10 text-purple-400"
                  />
                  <KpiCard
                    icon={Trophy}
                    label="Ganhos no Mês"
                    value={`${kpis.wonThisMonth} (${formatCurrency(kpis.wonValueThisMonth)})`}
                    color="bg-emerald-500/10 text-emerald-400"
                  />
                  <KpiCard
                    icon={XCircle}
                    label="Perdidos no Mês"
                    value={String(kpis.lostThisMonth)}
                    color="bg-red-500/10 text-red-400"
                  />
                </div>
              )}

              {/* ===== Kanban Board ===== */}
              <div className="flex-1 overflow-hidden relative">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3 text-white/40">
                      <Loader2 size={28} className="animate-spin" />
                      <span className="text-sm">Carregando pipeline...</span>
                    </div>
                  </div>
                ) : stages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3 text-white/30">
                      <Target size={40} className="opacity-30" />
                      <p className="text-sm">Nenhum estágio configurado neste pipeline</p>
                      <p className="text-xs text-white/20">Configure os estágios nas configurações do CRM</p>
                    </div>
                  </div>
                ) : (
                  <div
                    ref={boardRef}
                    className="flex gap-4 p-6 h-full overflow-x-auto overflow-y-hidden"
                  >
                    {stages.map((stage) => (
                      <KanbanColumn
                        key={stage.id}
                        stage={stage}
                        opportunities={opportunitiesByStage[stage.id] || []}
                        onDragStart={handleDragStart}
                        onDragOver={(e) => handleDragOver(e, stage.id)}
                        onDrop={(e) => handleDrop(e, stage.id)}
                        onDragLeave={handleDragLeave}
                        isDragOver={dragOverStageId === stage.id}
                        onCardClick={(opp) => setDetailTarget(opp)}
                        onWin={(opp) => setWinTarget(opp)}
                        onLose={(opp) => setLoseTarget(opp)}
                      />
                    ))}
                  </div>
                )}

                {/* Detail Drawer */}
                <OpportunityDetailDrawer
                  opp={detailTarget}
                  onClose={() => setDetailTarget(null)}
                  onWin={(opp) => { setDetailTarget(null); setWinTarget(opp); }}
                  onLose={(opp) => { setDetailTarget(null); setLoseTarget(opp); }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Dialogs ===== */}
      <CreateOpportunityDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateOpportunity}
        pipelines={pipelines}
        selectedPipelineId={selectedPipelineId}
        sellers={sellers}
        loading={actionLoading}
      />

      <WinDialog
        isOpen={!!winTarget}
        onClose={() => setWinTarget(null)}
        onSubmit={handleWin}
        loading={actionLoading}
        oppTitle={winTarget?.title || ''}
      />

      <LoseDialog
        isOpen={!!loseTarget}
        onClose={() => setLoseTarget(null)}
        onSubmit={handleLose}
        loading={actionLoading}
        oppTitle={loseTarget?.title || ''}
        lossReasons={lossReasonsList}
      />
    </Portal>
  );
}

export default PipelineModal;
