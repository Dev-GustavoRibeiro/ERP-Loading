'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Portal } from '@/shared/components/atoms/Portal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Plus, Target, Award, Save, Trash2, Settings2,
  Zap, Star, Trophy, Flame, Medal, TrendingUp, ShieldCheck,
} from 'lucide-react';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { listMissions, createMission, updateMission, listBadges, createBadge } from '@/app/actions/vendas-features';
import { missionCreateSchema, badgeCreateSchema, type MissionCreateInput, type BadgeCreateInput } from '@/modules/vendas-features/domain/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/shared/lib/utils';

// =====================================================
// Types
// =====================================================
type Tab = 'missions' | 'badges';

interface GamificationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const missionTypeLabels: Record<string, string> = {
  sales_count: 'Qtd. de Vendas',
  sales_value: 'Valor de Vendas',
  avg_ticket: 'Ticket Médio',
  items_sold: 'Itens Vendidos',
  no_cancellations: 'Sem Cancelamentos',
  no_returns: 'Sem Devoluções',
  streak: 'Sequência',
};

const periodLabels: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

const badgeCriteriaLabels: Record<string, string> = {
  first_sale: 'Primeira Venda',
  streak_days: 'Sequência de Dias',
  top_weekly: 'Top Semanal',
  top_monthly: 'Top Mensal',
  no_returns: 'Sem Devoluções',
  sales_milestone: 'Marco de Vendas',
  xp_milestone: 'Marco de XP',
  custom: 'Personalizado',
};

// =====================================================
// Component
// =====================================================
export function GamificationConfigModal({ isOpen, onClose }: GamificationConfigModalProps) {
  const empresaId = useEmpresaId();
  const [tab, setTab] = useState<Tab>('missions');
  const [missions, setMissions] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Mission form
  const missionForm = useForm<MissionCreateInput>({
    resolver: zodResolver(missionCreateSchema),
    defaultValues: { name: '', description: '', mission_type: 'sales_count', period: 'daily', target_value: 10, xp_reward: 10, is_active: true },
  });

  // Badge form
  const badgeForm = useForm<BadgeCreateInput>({
    resolver: zodResolver(badgeCreateSchema),
    defaultValues: { name: '', description: '', criteria_type: 'first_sale', color: 'amber', is_active: true },
  });

  const load = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const [m, b] = await Promise.all([listMissions(empresaId), listBadges(empresaId)]);
      setMissions(m);
      setBadges(b);
    } catch { /* */ } finally { setLoading(false); }
  }, [empresaId]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  const handleCreateMission = async (data: MissionCreateInput) => {
    if (!empresaId) return;
    setSaving(true);
    setError('');
    try {
      const res = editingId
        ? await updateMission(editingId, data as unknown as Record<string, unknown>)
        : await createMission(empresaId, data as unknown as Record<string, unknown>);
      if (!res.success) { setError(res.error || 'Erro'); return; }
      setShowForm(false);
      setEditingId(null);
      missionForm.reset();
      load();
    } catch { setError('Erro ao salvar'); } finally { setSaving(false); }
  };

  const handleCreateBadge = async (data: BadgeCreateInput) => {
    if (!empresaId) return;
    setSaving(true);
    setError('');
    try {
      const res = await createBadge(empresaId, data as unknown as Record<string, unknown>);
      if (!res.success) { setError(res.error || 'Erro'); return; }
      setShowForm(false);
      badgeForm.reset();
      load();
    } catch { setError('Erro ao salvar'); } finally { setSaving(false); }
  };

  const handleEditMission = (m: any) => {
    setEditingId(m.id);
    missionForm.reset({
      name: m.name,
      description: m.description || '',
      mission_type: m.mission_type,
      period: m.period,
      target_value: m.target_value,
      xp_reward: m.xp_reward,
      is_active: m.is_active,
    });
    setShowForm(true);
  };

  const openNewForm = () => {
    setEditingId(null);
    if (tab === 'missions') missionForm.reset();
    else badgeForm.reset();
    setShowForm(true);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div key="gamconfig-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" />
            <motion.div key="gamconfig-modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-4 sm:inset-8 z-[80] bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Settings2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Configurar Gamificação</h2>
                    <p className="text-xs text-slate-500">Missões, badges e regras do sistema de pontos</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-4 shrink-0">
                <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
                  <button onClick={() => { setTab('missions'); setShowForm(false); }} className={cn('px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === 'missions' ? 'bg-amber-600/20 text-amber-400' : 'text-slate-400 hover:text-white')}>
                    <Target className="w-4 h-4 inline mr-1.5" />Missões ({missions.length})
                  </button>
                  <button onClick={() => { setTab('badges'); setShowForm(false); }} className={cn('px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === 'badges' ? 'bg-amber-600/20 text-amber-400' : 'text-slate-400 hover:text-white')}>
                    <Award className="w-4 h-4 inline mr-1.5" />Badges ({badges.length})
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                {loading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
                ) : showForm ? (
                  /* ── FORMS ── */
                  <div className="max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold">
                        {tab === 'missions' ? (editingId ? 'Editar Missão' : 'Nova Missão') : 'Novo Badge'}
                      </h3>
                      <button onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
                    </div>

                    {error && <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

                    {tab === 'missions' ? (
                      <form onSubmit={missionForm.handleSubmit(handleCreateMission)} className="space-y-3">
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">Nome *</label>
                          <input {...missionForm.register('name')} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" />
                          {missionForm.formState.errors.name && <p className="text-red-400 text-xs mt-1">{missionForm.formState.errors.name.message}</p>}
                        </div>
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">Descrição</label>
                          <textarea {...missionForm.register('description')} rows={2} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm text-slate-300 mb-1 block">Tipo *</label>
                            <select {...missionForm.register('mission_type')} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all">
                              {Object.entries(missionTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-sm text-slate-300 mb-1 block">Período *</label>
                            <select {...missionForm.register('period')} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all">
                              {Object.entries(periodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm text-slate-300 mb-1 block">Meta *</label>
                            <input type="number" step="any" {...missionForm.register('target_value')} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" />
                          </div>
                          <div>
                            <label className="text-sm text-slate-300 mb-1 block">XP *</label>
                            <input type="number" {...missionForm.register('xp_reward')} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" {...missionForm.register('is_active')} className="rounded bg-white/10 border-white/20" />
                          <span className="text-sm text-slate-300">Ativa</span>
                        </label>
                        <button type="submit" disabled={saving} className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {editingId ? 'Salvar Alterações' : 'Criar Missão'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={badgeForm.handleSubmit(handleCreateBadge)} className="space-y-3">
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">Nome *</label>
                          <input {...badgeForm.register('name')} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" />
                          {badgeForm.formState.errors.name && <p className="text-red-400 text-xs mt-1">{badgeForm.formState.errors.name.message}</p>}
                        </div>
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">Descrição</label>
                          <textarea {...badgeForm.register('description')} rows={2} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm text-slate-300 mb-1 block">Critério *</label>
                            <select {...badgeForm.register('criteria_type')} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all">
                              {Object.entries(badgeCriteriaLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-sm text-slate-300 mb-1 block">Cor</label>
                            <select {...badgeForm.register('color')} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all">
                              {['amber', 'emerald', 'blue', 'purple', 'red', 'orange', 'teal', 'pink'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-slate-300 mb-1 block">Valor do critério</label>
                          <input type="number" step="any" {...badgeForm.register('criteria_value')} className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" placeholder="Ex: 7 (dias de streak)" />
                        </div>
                        <button type="submit" disabled={saving} className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Criar Badge
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  /* ── LIST VIEW ── */
                  <>
                    <div className="flex justify-end">
                      <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> {tab === 'missions' ? 'Nova Missão' : 'Novo Badge'}
                      </button>
                    </div>

                    {tab === 'missions' ? (
                      missions.length === 0 ? (
                        <div className="text-center py-12">
                          <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400">Nenhuma missão criada</p>
                          <p className="text-sm text-slate-600 mt-1">Crie missões para engajar o time de vendas</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {missions.map(m => (
                            <div key={m.id} className="p-4 bg-[#252d3d]/50 rounded-lg border border-white/[0.04] flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', m.is_active ? 'bg-amber-500/20' : 'bg-white/5')}>
                                  <Target className={cn('w-5 h-5', m.is_active ? 'text-amber-400' : 'text-slate-600')} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-medium truncate">{m.name}</p>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500">{missionTypeLabels[m.mission_type] || m.mission_type}</span>
                                    <span className="text-slate-700">·</span>
                                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold',
                                      m.period === 'daily' ? 'bg-violet-500/20 text-violet-400' :
                                        m.period === 'weekly' ? 'bg-blue-500/20 text-blue-400' :
                                          'bg-amber-500/20 text-amber-400'
                                    )}>{periodLabels[m.period]}</span>
                                    <span className="text-slate-700">·</span>
                                    <span className="text-amber-400">Meta: {m.target_value}</span>
                                    <span className="text-slate-700">·</span>
                                    <span className="text-emerald-400">+{m.xp_reward} XP</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                {!m.is_active && <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">Inativa</span>}
                                <button onClick={() => handleEditMission(m)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">Editar</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      badges.length === 0 ? (
                        <div className="text-center py-12">
                          <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400">Nenhum badge criado</p>
                          <p className="text-sm text-slate-600 mt-1">Crie insígnias para premiar conquistas</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {badges.map(b => (
                            <div key={b.id} className="p-4 bg-[#252d3d]/50 rounded-lg border border-white/[0.04] text-center">
                              <div className={cn('w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center', `bg-${b.color || 'amber'}-500/20`)}>
                                <Award className={cn('w-6 h-6', `text-${b.color || 'amber'}-400`)} />
                              </div>
                              <p className="text-white font-medium text-sm truncate">{b.name}</p>
                              <p className="text-xs text-slate-500 mt-1">{badgeCriteriaLabels[b.criteria_type] || b.criteria_type}</p>
                              {b.criteria_value && <p className="text-xs text-amber-400 mt-0.5">Valor: {b.criteria_value}</p>}
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
