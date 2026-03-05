'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import {
  X,
  Plus,
  Save,
  Trash2,
  Loader2,
  Settings2,
  Layers,
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import {
  listPipelines,
  createPipeline,
  updatePipeline,
  createStage,
  updateStage,
  deleteStage,
  listLossReasons,
  createLossReason,
  listStageAutomations,
  createStageAutomation,
  deleteStageAutomation,
} from '@/app/actions/crm';

// ─── Types ───────────────────────────────────────────────

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string | null;
}

interface StageRecord {
  id: string;
  name: string;
  sort_order: number;
  probability_default: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

interface PipelineRecord {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  stages: StageRecord[];
}

interface LossReasonRecord {
  id: string;
  name: string;
  sort_order: number;
}

interface AutomationRecord {
  id: string;
  stage_id: string;
  action_type: string;
  task_title: string | null;
  task_description: string | null;
  task_due_days: number | null;
  is_active: boolean;
  created_at: string;
}

type TabId = 'pipelines' | 'loss_reasons' | 'automations';

// ─── Constants ───────────────────────────────────────────

const STAGE_COLORS = [
  { value: 'blue', label: 'Azul', tw: 'bg-blue-500' },
  { value: 'green', label: 'Verde', tw: 'bg-green-500' },
  { value: 'amber', label: 'Amarelo', tw: 'bg-amber-500' },
  { value: 'red', label: 'Vermelho', tw: 'bg-red-500' },
  { value: 'purple', label: 'Roxo', tw: 'bg-purple-500' },
  { value: 'cyan', label: 'Ciano', tw: 'bg-cyan-500' },
  { value: 'emerald', label: 'Esmeralda', tw: 'bg-emerald-500' },
  { value: 'orange', label: 'Laranja', tw: 'bg-orange-500' },
  { value: 'pink', label: 'Rosa', tw: 'bg-pink-500' },
  { value: 'slate', label: 'Cinza', tw: 'bg-slate-500' },
] as const;

const COLOR_DOT_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  slate: 'bg-slate-500',
};

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'pipelines', label: 'Pipelines & Estágios', icon: <Layers className="h-4 w-4" /> },
  { id: 'loss_reasons', label: 'Motivos de Perda', icon: <AlertCircle className="h-4 w-4" /> },
  { id: 'automations', label: 'Automações', icon: <Zap className="h-4 w-4" /> },
];

const INPUT_CLASS =
  'w-full bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 px-3 py-2 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-slate-500';

const SELECT_CLASS =
  'w-full bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 px-3 py-2 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none cursor-pointer';

// ─── Main Component ──────────────────────────────────────

export default function SettingsModal({ isOpen, onClose, empresaId }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('pipelines');

  // Pipeline state
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null);
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineDesc, setNewPipelineDesc] = useState('');
  const [newPipelineDefault, setNewPipelineDefault] = useState(false);
  const [savingPipeline, setSavingPipeline] = useState(false);

  // Stage state
  const [showNewStage, setShowNewStage] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState({
    name: '',
    sort_order: 0,
    probability_default: 0,
    color: 'blue',
    is_won: false,
    is_lost: false,
  });
  const [savingStage, setSavingStage] = useState(false);
  const [deletingStage, setDeletingStage] = useState<string | null>(null);
  const [confirmDeleteStage, setConfirmDeleteStage] = useState<string | null>(null);

  // Loss reasons state
  const [lossReasons, setLossReasons] = useState<LossReasonRecord[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [showNewReason, setShowNewReason] = useState(false);
  const [newReasonName, setNewReasonName] = useState('');
  const [savingReason, setSavingReason] = useState(false);

  // Automations state
  const [automations, setAutomations] = useState<AutomationRecord[]>([]);
  const [loadingAutomations, setLoadingAutomations] = useState(false);
  const [autoSelectedPipeline, setAutoSelectedPipeline] = useState('');
  const [autoSelectedStage, setAutoSelectedStage] = useState('');
  const [showNewAutomation, setShowNewAutomation] = useState(false);
  const [autoForm, setAutoForm] = useState({
    action_type: 'create_task',
    task_title: '',
    task_description: '',
    task_due_days: 1,
    is_active: true,
  });
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [deletingAutomation, setDeletingAutomation] = useState<string | null>(null);

  // Error/success feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─── Data loading ────────────────────────────────────

  const fetchPipelines = useCallback(async () => {
    if (!empresaId) return;
    setLoadingPipelines(true);
    try {
      const data = await listPipelines(empresaId);
      setPipelines(data as PipelineRecord[]);
    } catch {
      showFeedback('error', 'Erro ao carregar pipelines');
    } finally {
      setLoadingPipelines(false);
    }
  }, [empresaId]);

  const fetchLossReasons = useCallback(async () => {
    if (!empresaId) return;
    setLoadingReasons(true);
    try {
      const data = await listLossReasons(empresaId);
      setLossReasons(data as LossReasonRecord[]);
    } catch {
      showFeedback('error', 'Erro ao carregar motivos de perda');
    } finally {
      setLoadingReasons(false);
    }
  }, [empresaId]);

  const fetchAutomations = useCallback(async () => {
    if (!empresaId || !autoSelectedStage) {
      setAutomations([]);
      return;
    }
    setLoadingAutomations(true);
    try {
      const data = await listStageAutomations(empresaId, autoSelectedStage);
      setAutomations(data as AutomationRecord[]);
    } catch {
      showFeedback('error', 'Erro ao carregar automações');
    } finally {
      setLoadingAutomations(false);
    }
  }, [empresaId, autoSelectedStage]);

  useEffect(() => {
    if (isOpen && empresaId) {
      fetchPipelines();
    }
  }, [isOpen, empresaId, fetchPipelines]);

  useEffect(() => {
    if (isOpen && empresaId && activeTab === 'loss_reasons') {
      fetchLossReasons();
    }
  }, [isOpen, empresaId, activeTab, fetchLossReasons]);

  useEffect(() => {
    if (isOpen && empresaId && activeTab === 'automations') {
      if (pipelines.length === 0) fetchPipelines();
    }
  }, [isOpen, empresaId, activeTab, pipelines.length, fetchPipelines]);

  useEffect(() => {
    if (activeTab === 'automations' && autoSelectedStage) {
      fetchAutomations();
    }
  }, [activeTab, autoSelectedStage, fetchAutomations]);

  // Auto-select first pipeline for automations tab
  useEffect(() => {
    if (activeTab === 'automations' && pipelines.length > 0 && !autoSelectedPipeline) {
      setAutoSelectedPipeline(pipelines[0].id);
    }
  }, [activeTab, pipelines, autoSelectedPipeline]);

  // Reset stage when pipeline changes
  useEffect(() => {
    setAutoSelectedStage('');
    setAutomations([]);
  }, [autoSelectedPipeline]);

  // ─── Feedback helper ─────────────────────────────────

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  }

  // ─── Escape key ──────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ─── Pipeline handlers ───────────────────────────────

  async function handleCreatePipeline() {
    if (!empresaId || !newPipelineName.trim()) return;
    setSavingPipeline(true);
    try {
      const res = await createPipeline(empresaId, {
        name: newPipelineName.trim(),
        description: newPipelineDesc.trim() || undefined,
        is_default: newPipelineDefault,
      });
      if (res.success) {
        showFeedback('success', 'Pipeline criado com sucesso');
        setShowNewPipeline(false);
        setNewPipelineName('');
        setNewPipelineDesc('');
        setNewPipelineDefault(false);
        await fetchPipelines();
      } else {
        showFeedback('error', res.error || 'Erro ao criar pipeline');
      }
    } catch {
      showFeedback('error', 'Erro ao criar pipeline');
    } finally {
      setSavingPipeline(false);
    }
  }

  // ─── Stage handlers ──────────────────────────────────

  function resetStageForm() {
    setStageForm({
      name: '',
      sort_order: 0,
      probability_default: 0,
      color: 'blue',
      is_won: false,
      is_lost: false,
    });
  }

  function startAddStage(pipelineId: string, currentStages: StageRecord[]) {
    setShowNewStage(pipelineId);
    setEditingStage(null);
    const maxOrder = currentStages.reduce((max, s) => Math.max(max, s.sort_order), 0);
    setStageForm({
      name: '',
      sort_order: maxOrder + 1,
      probability_default: 0,
      color: 'blue',
      is_won: false,
      is_lost: false,
    });
  }

  function startEditStage(stage: StageRecord) {
    setEditingStage(stage.id);
    setShowNewStage(null);
    setStageForm({
      name: stage.name,
      sort_order: stage.sort_order,
      probability_default: stage.probability_default ?? 0,
      color: stage.color || 'blue',
      is_won: stage.is_won || false,
      is_lost: stage.is_lost || false,
    });
  }

  function cancelStageForm() {
    setShowNewStage(null);
    setEditingStage(null);
    resetStageForm();
  }

  async function handleSaveNewStage(pipelineId: string) {
    if (!empresaId || !stageForm.name.trim()) return;
    setSavingStage(true);
    try {
      const res = await createStage(empresaId, {
        pipeline_id: pipelineId,
        name: stageForm.name.trim(),
        sort_order: stageForm.sort_order,
        probability_default: stageForm.probability_default,
        color: stageForm.color,
        is_won: stageForm.is_won,
        is_lost: stageForm.is_lost,
      });
      if (res.success) {
        showFeedback('success', 'Estágio criado');
        cancelStageForm();
        await fetchPipelines();
      } else {
        showFeedback('error', res.error || 'Erro ao criar estágio');
      }
    } catch {
      showFeedback('error', 'Erro ao criar estágio');
    } finally {
      setSavingStage(false);
    }
  }

  async function handleUpdateStage(stageId: string) {
    if (!stageForm.name.trim()) return;
    setSavingStage(true);
    try {
      const res = await updateStage(stageId, {
        name: stageForm.name.trim(),
        sort_order: stageForm.sort_order,
        probability_default: stageForm.probability_default,
        color: stageForm.color,
        is_won: stageForm.is_won,
        is_lost: stageForm.is_lost,
      });
      if (res.success) {
        showFeedback('success', 'Estágio atualizado');
        cancelStageForm();
        await fetchPipelines();
      } else {
        showFeedback('error', res.error || 'Erro ao atualizar estágio');
      }
    } catch {
      showFeedback('error', 'Erro ao atualizar estágio');
    } finally {
      setSavingStage(false);
    }
  }

  async function handleDeleteStage(stageId: string) {
    setDeletingStage(stageId);
    try {
      const res = await deleteStage(stageId);
      if (res.success) {
        showFeedback('success', 'Estágio removido');
        setConfirmDeleteStage(null);
        await fetchPipelines();
      } else {
        showFeedback('error', res.error || 'Erro ao remover estágio');
      }
    } catch {
      showFeedback('error', 'Erro ao remover estágio');
    } finally {
      setDeletingStage(null);
    }
  }

  // ─── Loss reason handlers ────────────────────────────

  async function handleCreateReason() {
    if (!empresaId || !newReasonName.trim()) return;
    setSavingReason(true);
    try {
      const res = await createLossReason(empresaId, {
        name: newReasonName.trim(),
        sort_order: lossReasons.length + 1,
      });
      if (res.success) {
        showFeedback('success', 'Motivo de perda criado');
        setShowNewReason(false);
        setNewReasonName('');
        await fetchLossReasons();
      } else {
        showFeedback('error', res.error || 'Erro ao criar motivo');
      }
    } catch {
      showFeedback('error', 'Erro ao criar motivo');
    } finally {
      setSavingReason(false);
    }
  }

  // ─── Automation handlers ─────────────────────────────

  function resetAutoForm() {
    setAutoForm({
      action_type: 'create_task',
      task_title: '',
      task_description: '',
      task_due_days: 1,
      is_active: true,
    });
  }

  async function handleCreateAutomation() {
    if (!empresaId || !autoSelectedStage) return;
    if (autoForm.action_type === 'create_task' && !autoForm.task_title.trim()) return;
    setSavingAutomation(true);
    try {
      const res = await createStageAutomation(empresaId, {
        stage_id: autoSelectedStage,
        action_type: autoForm.action_type,
        task_title: autoForm.task_title.trim() || undefined,
        task_description: autoForm.task_description.trim() || undefined,
        task_due_days: autoForm.task_due_days,
        is_active: autoForm.is_active,
      });
      if (res.success) {
        showFeedback('success', 'Automação criada');
        setShowNewAutomation(false);
        resetAutoForm();
        await fetchAutomations();
      } else {
        showFeedback('error', res.error || 'Erro ao criar automação');
      }
    } catch {
      showFeedback('error', 'Erro ao criar automação');
    } finally {
      setSavingAutomation(false);
    }
  }

  async function handleDeleteAutomation(id: string) {
    setDeletingAutomation(id);
    try {
      const res = await deleteStageAutomation(id);
      if (res.success) {
        showFeedback('success', 'Automação removida');
        await fetchAutomations();
      } else {
        showFeedback('error', res.error || 'Erro ao remover automação');
      }
    } catch {
      showFeedback('error', 'Erro ao remover automação');
    } finally {
      setDeletingAutomation(null);
    }
  }

  // ─── Derived data for automations tab ────────────────

  const selectedPipelineStages = pipelines.find((p) => p.id === autoSelectedPipeline)?.stages ?? [];

  // ─── Render ──────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative flex flex-col bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden w-[calc(100%-2rem)] h-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] sm:h-[calc(100%-4rem)] max-w-5xl max-h-[900px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Settings2 className="h-4.5 w-4.5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Configurações do CRM</h2>
                    <p className="text-xs text-slate-400">Pipelines, estágios, motivos e automações</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-4 shrink-0">
                <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center',
                        activeTab === tab.id
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback toast */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'mx-6 mt-3 px-4 py-2.5 rounded-lg text-sm font-medium border shrink-0',
                      feedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    )}
                  >
                    {feedback.message}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-none">
                {activeTab === 'pipelines' && (
                  <PipelinesTab
                    pipelines={pipelines}
                    loading={loadingPipelines}
                    expandedPipeline={expandedPipeline}
                    setExpandedPipeline={setExpandedPipeline}
                    showNewPipeline={showNewPipeline}
                    setShowNewPipeline={setShowNewPipeline}
                    newPipelineName={newPipelineName}
                    setNewPipelineName={setNewPipelineName}
                    newPipelineDesc={newPipelineDesc}
                    setNewPipelineDesc={setNewPipelineDesc}
                    newPipelineDefault={newPipelineDefault}
                    setNewPipelineDefault={setNewPipelineDefault}
                    savingPipeline={savingPipeline}
                    onCreatePipeline={handleCreatePipeline}
                    showNewStage={showNewStage}
                    editingStage={editingStage}
                    stageForm={stageForm}
                    setStageForm={setStageForm}
                    savingStage={savingStage}
                    confirmDeleteStage={confirmDeleteStage}
                    setConfirmDeleteStage={setConfirmDeleteStage}
                    deletingStage={deletingStage}
                    onStartAddStage={startAddStage}
                    onStartEditStage={startEditStage}
                    onCancelStageForm={cancelStageForm}
                    onSaveNewStage={handleSaveNewStage}
                    onUpdateStage={handleUpdateStage}
                    onDeleteStage={handleDeleteStage}
                  />
                )}

                {activeTab === 'loss_reasons' && (
                  <LossReasonsTab
                    lossReasons={lossReasons}
                    loading={loadingReasons}
                    showNewReason={showNewReason}
                    setShowNewReason={setShowNewReason}
                    newReasonName={newReasonName}
                    setNewReasonName={setNewReasonName}
                    savingReason={savingReason}
                    onCreateReason={handleCreateReason}
                  />
                )}

                {activeTab === 'automations' && (
                  <AutomationsTab
                    pipelines={pipelines}
                    automations={automations}
                    loading={loadingAutomations}
                    selectedPipeline={autoSelectedPipeline}
                    setSelectedPipeline={setAutoSelectedPipeline}
                    selectedStage={autoSelectedStage}
                    setSelectedStage={setAutoSelectedStage}
                    stages={selectedPipelineStages}
                    showNewAutomation={showNewAutomation}
                    setShowNewAutomation={setShowNewAutomation}
                    autoForm={autoForm}
                    setAutoForm={setAutoForm}
                    savingAutomation={savingAutomation}
                    deletingAutomation={deletingAutomation}
                    onCreateAutomation={handleCreateAutomation}
                    onDeleteAutomation={handleDeleteAutomation}
                    onResetAutoForm={resetAutoForm}
                  />
                )}
              </div>

              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-cyan-500/30" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 1: Pipelines & Estágios
// ═══════════════════════════════════════════════════════════

interface PipelinesTabProps {
  pipelines: PipelineRecord[];
  loading: boolean;
  expandedPipeline: string | null;
  setExpandedPipeline: (id: string | null) => void;
  showNewPipeline: boolean;
  setShowNewPipeline: (v: boolean) => void;
  newPipelineName: string;
  setNewPipelineName: (v: string) => void;
  newPipelineDesc: string;
  setNewPipelineDesc: (v: string) => void;
  newPipelineDefault: boolean;
  setNewPipelineDefault: (v: boolean) => void;
  savingPipeline: boolean;
  onCreatePipeline: () => void;
  showNewStage: string | null;
  editingStage: string | null;
  stageForm: typeof INITIAL_STAGE_FORM;
  setStageForm: React.Dispatch<React.SetStateAction<typeof INITIAL_STAGE_FORM>>;
  savingStage: boolean;
  confirmDeleteStage: string | null;
  setConfirmDeleteStage: (id: string | null) => void;
  deletingStage: string | null;
  onStartAddStage: (pipelineId: string, stages: StageRecord[]) => void;
  onStartEditStage: (stage: StageRecord) => void;
  onCancelStageForm: () => void;
  onSaveNewStage: (pipelineId: string) => void;
  onUpdateStage: (stageId: string) => void;
  onDeleteStage: (stageId: string) => void;
}

const INITIAL_STAGE_FORM = {
  name: '',
  sort_order: 0,
  probability_default: 0,
  color: 'blue',
  is_won: false,
  is_lost: false,
};

function PipelinesTab({
  pipelines,
  loading,
  expandedPipeline,
  setExpandedPipeline,
  showNewPipeline,
  setShowNewPipeline,
  newPipelineName,
  setNewPipelineName,
  newPipelineDesc,
  setNewPipelineDesc,
  newPipelineDefault,
  setNewPipelineDefault,
  savingPipeline,
  onCreatePipeline,
  showNewStage,
  editingStage,
  stageForm,
  setStageForm,
  savingStage,
  confirmDeleteStage,
  setConfirmDeleteStage,
  deletingStage,
  onStartAddStage,
  onStartEditStage,
  onCancelStageForm,
  onSaveNewStage,
  onUpdateStage,
  onDeleteStage,
}: PipelinesTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        <span className="ml-2 text-sm text-slate-400">Carregando pipelines...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Pipeline button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Gerencie seus pipelines e estágios de vendas.</p>
        <button
          onClick={() => setShowNewPipeline(!showNewPipeline)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Pipeline
        </button>
      </div>

      {/* New Pipeline form */}
      <AnimatePresence>
        {showNewPipeline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-[#111827]/50 rounded-lg border border-white/[0.06] space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome do Pipeline *</label>
                <input
                  type="text"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="Ex: Pipeline Principal"
                  className={INPUT_CLASS}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={newPipelineDesc}
                  onChange={(e) => setNewPipelineDesc(e.target.value)}
                  placeholder="Descrição opcional"
                  className={INPUT_CLASS}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPipelineDefault}
                  onChange={(e) => setNewPipelineDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#1a2235] text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0"
                />
                <span className="text-sm text-white/80">Pipeline padrão</span>
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onCreatePipeline}
                  disabled={savingPipeline || !newPipelineName.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingPipeline ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setShowNewPipeline(false);
                    setNewPipelineName('');
                    setNewPipelineDesc('');
                    setNewPipelineDefault(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pipelines list */}
      {pipelines.length === 0 && !showNewPipeline ? (
        <div className="text-center py-12 text-sm text-slate-500">
          Nenhum pipeline encontrado. Crie o primeiro!
        </div>
      ) : (
        <div className="space-y-2">
          {pipelines.map((pipeline) => {
            const isExpanded = expandedPipeline === pipeline.id;
            return (
              <div key={pipeline.id} className="rounded-lg border border-white/[0.06] overflow-hidden">
                {/* Pipeline header */}
                <button
                  onClick={() => setExpandedPipeline(isExpanded ? null : pipeline.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#111827]/50 hover:bg-[#111827]/80 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{pipeline.name}</span>
                      {pipeline.is_default && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          PADRÃO
                        </span>
                      )}
                    </div>
                    {pipeline.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{pipeline.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {pipeline.stages.length} estágio{pipeline.stages.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {/* Stages */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 space-y-2 border-t border-white/[0.04]">
                        {pipeline.stages.map((stage) => (
                          <React.Fragment key={stage.id}>
                            {editingStage === stage.id ? (
                              <StageForm
                                stageForm={stageForm}
                                setStageForm={setStageForm}
                                saving={savingStage}
                                onSave={() => onUpdateStage(stage.id)}
                                onCancel={onCancelStageForm}
                                isEdit
                              />
                            ) : (
                              <div className="p-3 bg-[#111827]/50 rounded-lg border border-white/[0.06] flex items-center gap-3 group">
                                <GripVertical className="h-4 w-4 text-slate-600 shrink-0" />
                                <div
                                  className={cn('w-2.5 h-2.5 rounded-full shrink-0', COLOR_DOT_MAP[stage.color] || 'bg-slate-500')}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-white/90">{stage.name}</span>
                                    <span className="text-xs text-slate-500">{stage.probability_default ?? 0}%</span>
                                    {stage.is_won && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        WON
                                      </span>
                                    )}
                                    {stage.is_lost && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                        LOST
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => onStartEditStage(stage)}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Editar"
                                  >
                                    <Settings2 className="h-3.5 w-3.5" />
                                  </button>
                                  {confirmDeleteStage === stage.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => onDeleteStage(stage.id)}
                                        disabled={deletingStage === stage.id}
                                        className="px-2 py-1 rounded text-[10px] font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                                      >
                                        {deletingStage === stage.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          'Confirmar'
                                        )}
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteStage(null)}
                                        className="px-2 py-1 rounded text-[10px] font-medium text-slate-400 hover:text-white transition-colors"
                                      >
                                        Não
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDeleteStage(stage.id)}
                                      className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                      title="Remover"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        ))}

                        {/* New stage form */}
                        {showNewStage === pipeline.id ? (
                          <StageForm
                            stageForm={stageForm}
                            setStageForm={setStageForm}
                            saving={savingStage}
                            onSave={() => onSaveNewStage(pipeline.id)}
                            onCancel={onCancelStageForm}
                          />
                        ) : (
                          <button
                            onClick={() => onStartAddStage(pipeline.id, pipeline.stages)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-blue-400 border border-dashed border-white/[0.06] hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar Estágio
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Stage form (used for both add & edit) ─────────────

interface StageFormProps {
  stageForm: typeof INITIAL_STAGE_FORM;
  setStageForm: React.Dispatch<React.SetStateAction<typeof INITIAL_STAGE_FORM>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}

function StageForm({ stageForm, setStageForm, saving, onSave, onCancel, isEdit }: StageFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nome *</label>
            <input
              type="text"
              value={stageForm.name}
              onChange={(e) => setStageForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Qualificação"
              className={INPUT_CLASS}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Ordem</label>
            <input
              type="number"
              value={stageForm.sort_order}
              onChange={(e) => setStageForm((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              className={INPUT_CLASS}
              min={0}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Probabilidade (%)</label>
            <input
              type="number"
              value={stageForm.probability_default}
              onChange={(e) =>
                setStageForm((prev) => ({
                  ...prev,
                  probability_default: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                }))
              }
              className={INPUT_CLASS}
              min={0}
              max={100}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Cor</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {STAGE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setStageForm((prev) => ({ ...prev, color: c.value }))}
                  className={cn(
                    'w-6 h-6 rounded-full transition-all border-2',
                    c.tw,
                    stageForm.color === c.value
                      ? 'border-white scale-110 ring-2 ring-white/20'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={stageForm.is_won}
              onChange={(e) =>
                setStageForm((prev) => ({
                  ...prev,
                  is_won: e.target.checked,
                  is_lost: e.target.checked ? false : prev.is_lost,
                }))
              }
              className="w-4 h-4 rounded border-white/20 bg-[#1a2235] text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0"
            />
            <span className="text-xs text-white/80">Estágio de Ganho (Won)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={stageForm.is_lost}
              onChange={(e) =>
                setStageForm((prev) => ({
                  ...prev,
                  is_lost: e.target.checked,
                  is_won: e.target.checked ? false : prev.is_won,
                }))
              }
              className="w-4 h-4 rounded border-white/20 bg-[#1a2235] text-red-500 focus:ring-red-500/20 focus:ring-offset-0"
            />
            <span className="text-xs text-white/80">Estágio de Perda (Lost)</span>
          </label>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onSave}
            disabled={saving || !stageForm.name.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isEdit ? 'Atualizar' : 'Salvar'}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 2: Motivos de Perda
// ═══════════════════════════════════════════════════════════

interface LossReasonsTabProps {
  lossReasons: LossReasonRecord[];
  loading: boolean;
  showNewReason: boolean;
  setShowNewReason: (v: boolean) => void;
  newReasonName: string;
  setNewReasonName: (v: string) => void;
  savingReason: boolean;
  onCreateReason: () => void;
}

function LossReasonsTab({
  lossReasons,
  loading,
  showNewReason,
  setShowNewReason,
  newReasonName,
  setNewReasonName,
  savingReason,
  onCreateReason,
}: LossReasonsTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        <span className="ml-2 text-sm text-slate-400">Carregando motivos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Motivos de perda disponíveis para oportunidades.</p>
        <button
          onClick={() => setShowNewReason(!showNewReason)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Motivo
        </button>
      </div>

      {/* New reason form */}
      <AnimatePresence>
        {showNewReason && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-[#111827]/50 rounded-lg border border-white/[0.06] space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome do Motivo *</label>
                <input
                  type="text"
                  value={newReasonName}
                  onChange={(e) => setNewReasonName(e.target.value)}
                  placeholder="Ex: Preço alto"
                  className={INPUT_CLASS}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newReasonName.trim()) onCreateReason();
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCreateReason}
                  disabled={savingReason || !newReasonName.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingReason ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setShowNewReason(false);
                    setNewReasonName('');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reasons list */}
      {lossReasons.length === 0 && !showNewReason ? (
        <div className="text-center py-12 text-sm text-slate-500">
          Nenhum motivo de perda cadastrado.
        </div>
      ) : (
        <div className="space-y-1.5">
          {lossReasons.map((reason, idx) => (
            <div
              key={reason.id}
              className="p-3 bg-[#111827]/50 rounded-lg border border-white/[0.06] flex items-center gap-3"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-red-500/10 text-red-400 text-xs font-bold shrink-0">
                {idx + 1}
              </div>
              <span className="text-sm text-white/90 flex-1">{reason.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 3: Automações de Estágio
// ═══════════════════════════════════════════════════════════

interface AutomationsTabProps {
  pipelines: PipelineRecord[];
  automations: AutomationRecord[];
  loading: boolean;
  selectedPipeline: string;
  setSelectedPipeline: (v: string) => void;
  selectedStage: string;
  setSelectedStage: (v: string) => void;
  stages: StageRecord[];
  showNewAutomation: boolean;
  setShowNewAutomation: (v: boolean) => void;
  autoForm: {
    action_type: string;
    task_title: string;
    task_description: string;
    task_due_days: number;
    is_active: boolean;
  };
  setAutoForm: React.Dispatch<
    React.SetStateAction<{
      action_type: string;
      task_title: string;
      task_description: string;
      task_due_days: number;
      is_active: boolean;
    }>
  >;
  savingAutomation: boolean;
  deletingAutomation: string | null;
  onCreateAutomation: () => void;
  onDeleteAutomation: (id: string) => void;
  onResetAutoForm: () => void;
}

function AutomationsTab({
  pipelines,
  automations,
  loading,
  selectedPipeline,
  setSelectedPipeline,
  selectedStage,
  setSelectedStage,
  stages,
  showNewAutomation,
  setShowNewAutomation,
  autoForm,
  setAutoForm,
  savingAutomation,
  deletingAutomation,
  onCreateAutomation,
  onDeleteAutomation,
  onResetAutoForm,
}: AutomationsTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Automações executadas quando uma oportunidade entra em um estágio.
      </p>

      {/* Pipeline & Stage selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Pipeline</label>
          <select
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Selecione um pipeline</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Estágio</label>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className={SELECT_CLASS}
            disabled={!selectedPipeline}
          >
            <option value="">Selecione um estágio</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Automations list */}
      {selectedStage && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {loading ? 'Carregando...' : `${automations.length} automação(ões)`}
            </span>
            <button
              onClick={() => {
                onResetAutoForm();
                setShowNewAutomation(!showNewAutomation);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Automação
            </button>
          </div>

          {/* New automation form */}
          <AnimatePresence>
            {showNewAutomation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-[#111827]/50 rounded-lg border border-white/[0.06] space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tipo de Ação *</label>
                    <select
                      value={autoForm.action_type}
                      onChange={(e) => setAutoForm((prev) => ({ ...prev, action_type: e.target.value }))}
                      className={SELECT_CLASS}
                    >
                      <option value="create_task">Criar Tarefa</option>
                      <option value="notify_owner">Notificar Responsável</option>
                    </select>
                  </div>

                  {autoForm.action_type === 'create_task' && (
                    <>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Título da Tarefa *</label>
                        <input
                          type="text"
                          value={autoForm.task_title}
                          onChange={(e) => setAutoForm((prev) => ({ ...prev, task_title: e.target.value }))}
                          placeholder="Ex: Enviar proposta"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Descrição da Tarefa</label>
                        <textarea
                          value={autoForm.task_description}
                          onChange={(e) => setAutoForm((prev) => ({ ...prev, task_description: e.target.value }))}
                          placeholder="Descrição opcional..."
                          className={cn(INPUT_CLASS, 'resize-none h-20')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Prazo (dias)</label>
                        <input
                          type="number"
                          value={autoForm.task_due_days}
                          onChange={(e) =>
                            setAutoForm((prev) => ({ ...prev, task_due_days: Math.max(1, parseInt(e.target.value) || 1) }))
                          }
                          className={cn(INPUT_CLASS, 'w-24')}
                          min={1}
                        />
                      </div>
                    </>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoForm.is_active}
                      onChange={(e) => setAutoForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/20 bg-[#1a2235] text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0"
                    />
                    <span className="text-sm text-white/80">Ativa</span>
                  </label>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={onCreateAutomation}
                      disabled={
                        savingAutomation ||
                        (autoForm.action_type === 'create_task' && !autoForm.task_title.trim())
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingAutomation ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setShowNewAutomation(false);
                        onResetAutoForm();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Automations list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            </div>
          ) : automations.length === 0 && !showNewAutomation ? (
            <div className="text-center py-8 text-sm text-slate-500">
              Nenhuma automação para este estágio.
            </div>
          ) : (
            <div className="space-y-1.5">
              {automations.map((auto) => (
                <div
                  key={auto.id}
                  className="p-3 bg-[#111827]/50 rounded-lg border border-white/[0.06] flex items-center gap-3 group"
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                      auto.action_type === 'create_task'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-amber-500/10 text-amber-400'
                    )}
                  >
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/90">
                        {auto.action_type === 'create_task' ? 'Criar Tarefa' : 'Notificar Responsável'}
                      </span>
                      {!auto.is_active && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          INATIVA
                        </span>
                      )}
                    </div>
                    {auto.task_title && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{auto.task_title}</p>
                    )}
                    {auto.task_due_days && auto.action_type === 'create_task' && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Prazo: {auto.task_due_days} dia{auto.task_due_days > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteAutomation(auto.id)}
                    disabled={deletingAutomation === auto.id}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remover automação"
                  >
                    {deletingAutomation === auto.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedStage && selectedPipeline && (
        <div className="text-center py-8 text-sm text-slate-500">
          Selecione um estágio para gerenciar automações.
        </div>
      )}

      {!selectedPipeline && (
        <div className="text-center py-8 text-sm text-slate-500">
          Selecione um pipeline para começar.
        </div>
      )}
    </div>
  );
}
