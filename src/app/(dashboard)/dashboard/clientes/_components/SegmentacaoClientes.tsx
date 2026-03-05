'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PieChart, BarChart3, TrendingUp, TrendingDown, Users, UserCheck,
  UserX, Building2, User, MapPin, Mail, Phone, AlertCircle,
  CheckCircle2, Activity, Target, Zap, Globe, Database,
  Star, ArrowUpRight, ArrowDownRight, Minus, RefreshCcw,
  Shield, Percent, Calendar, CreditCard, Hash,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { clienteService } from '@/modules/cadastros/services/clienteService';
import type { Cliente } from '@/modules/cadastros/domain';
import {
  LoadingState, EmptyState, SectionTitle,
  formatCurrency, formatDate, isTableNotFoundError, TableNotConfigured,
  calculateHealthScore,
} from './shared';

// =====================================================
// Types
// =====================================================

interface SegmentacaoClientesProps {
  empresaId: string | null;
}

// =====================================================
// Helper: compute analytics
// =====================================================

function computeAnalytics(clientes: Cliente[]) {
  const total = clientes.length;
  if (total === 0) return null;

  const ativos = clientes.filter(c => c.ativo);
  const inativos = clientes.filter(c => !c.ativo);
  const pf = clientes.filter(c => c.tipo_pessoa === 'F');
  const pj = clientes.filter(c => c.tipo_pessoa === 'J');

  // Date analysis
  const now = new Date();
  const thisMonth = clientes.filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonth = clientes.filter(c => {
    const d = new Date(c.created_at);
    const lm = new Date(now); lm.setMonth(lm.getMonth() - 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  });
  const last90d = clientes.filter(c => {
    const d = new Date(c.created_at);
    return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 90;
  });

  // Data quality
  const comEmail = clientes.filter(c => c.email);
  const comTelefone = clientes.filter(c => c.telefone || c.celular);
  const comEndereco = clientes.filter(c => c.logradouro && c.cidade && c.uf);
  const comCpfCnpj = clientes.filter(c => c.cpf_cnpj);
  const comLimite = clientes.filter(c => c.limite_credito && c.limite_credito > 0);

  const qualityScore = Math.round(
    ((comEmail.length + comTelefone.length + comEndereco.length + comCpfCnpj.length) /
    (total * 4)) * 100
  );

  // Geographic distribution
  const byUF = new Map<string, number>();
  const byCity = new Map<string, number>();
  clientes.forEach(c => {
    if (c.uf) byUF.set(c.uf, (byUF.get(c.uf) || 0) + 1);
    if (c.cidade) byCity.set(c.cidade, (byCity.get(c.cidade) || 0) + 1);
  });
  const topUFs = [...byUF.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topCities = [...byCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Credit analysis
  const totalCredito = clientes.reduce((sum, c) => sum + (c.limite_credito || 0), 0);
  const avgCredito = comLimite.length > 0 ? totalCredito / comLimite.length : 0;
  const maxCredito = Math.max(...clientes.map(c => c.limite_credito || 0));

  // Health scores distribution
  const healthScores = clientes.map(c => calculateHealthScore(c).score);
  const healthBuckets = { excellent: 0, good: 0, regular: 0, poor: 0, critical: 0 };
  healthScores.forEach(s => {
    if (s >= 80) healthBuckets.excellent++;
    else if (s >= 60) healthBuckets.good++;
    else if (s >= 40) healthBuckets.regular++;
    else if (s >= 20) healthBuckets.poor++;
    else healthBuckets.critical++;
  });
  const avgHealth = Math.round(healthScores.reduce((a, b) => a + b, 0) / total);

  // Growth trend (last 6 months)
  const monthlyGrowth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i);
    const m = d.getMonth(); const y = d.getFullYear();
    const count = clientes.filter(c => {
      const cd = new Date(c.created_at);
      return cd.getMonth() === m && cd.getFullYear() === y;
    }).length;
    monthlyGrowth.push({
      month: d.toLocaleDateString('pt-BR', { month: 'short' }),
      count,
    });
  }
  const growthRate = lastMonth.length > 0
    ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100)
    : thisMonth.length > 0 ? 100 : 0;

  // RFM-like simplified segmentation
  const segments = {
    champions: clientes.filter(c => c.ativo && c.email && c.celular && c.cpf_cnpj && c.limite_credito && c.limite_credito > avgCredito),
    loyal: clientes.filter(c => c.ativo && calculateHealthScore(c).score >= 60),
    promising: last90d.filter(c => c.ativo),
    needsAttention: ativos.filter(c => calculateHealthScore(c).score < 40),
    atRisk: inativos.filter(c => c.email || c.celular),
    lost: inativos.filter(c => !c.email && !c.celular),
  };

  // Actionable insights
  const insights: { type: 'warning' | 'info' | 'success'; text: string; count: number }[] = [];
  const noEmail = clientes.filter(c => c.ativo && !c.email);
  if (noEmail.length > 0) insights.push({ type: 'warning', text: 'Clientes ativos sem email cadastrado', count: noEmail.length });
  const noPhone = clientes.filter(c => c.ativo && !c.telefone && !c.celular);
  if (noPhone.length > 0) insights.push({ type: 'warning', text: 'Clientes ativos sem telefone', count: noPhone.length });
  const noAddr = clientes.filter(c => c.ativo && (!c.logradouro || !c.cidade));
  if (noAddr.length > 0) insights.push({ type: 'info', text: 'Clientes ativos sem endereço completo', count: noAddr.length });
  const noCpf = clientes.filter(c => c.ativo && !c.cpf_cnpj);
  if (noCpf.length > 0) insights.push({ type: 'warning', text: 'Clientes ativos sem CPF/CNPJ', count: noCpf.length });
  if (growthRate > 10) insights.push({ type: 'success', text: 'Crescimento acima de 10% este mês', count: thisMonth.length });
  if (inativos.length > ativos.length) insights.push({ type: 'warning', text: 'Mais clientes inativos do que ativos', count: inativos.length });

  return {
    total, ativos, inativos, pf, pj,
    thisMonth, lastMonth, last90d,
    comEmail, comTelefone, comEndereco, comCpfCnpj, comLimite,
    qualityScore,
    topUFs, topCities,
    totalCredito, avgCredito, maxCredito,
    healthBuckets, avgHealth,
    monthlyGrowth, growthRate,
    segments, insights,
  };
}

// =====================================================
// Sub-Components
// =====================================================

const MetricCard: React.FC<{
  icon: React.ReactNode; label: string; value: string | number;
  subtitle?: string; color?: string; trend?: number;
}> = ({ icon, label, value, subtitle, color = 'text-white', trend }) => (
  <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
    <div className="flex items-start justify-between mb-2">
      <span className="text-slate-600">{icon}</span>
      {trend !== undefined && (
        <span className={cn('flex items-center gap-0.5 text-[10px] font-bold',
          trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-slate-500'
        )}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className={cn('text-2xl font-black', color)}>{value}</p>
    <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    {subtitle && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}
  </div>
);

const ProgressBar: React.FC<{ value: number; max: number; label: string; color?: string }> = ({
  value, max, label, color = 'from-purple-500 to-blue-500',
}) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 min-w-[80px] truncate">{label}</span>
      <div className="flex-1 bg-white/5 rounded-full h-2">
        <div className={`h-2 rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-white min-w-[40px] text-right">{value}</span>
      <span className="text-[10px] text-slate-600 min-w-[30px] text-right">{pct}%</span>
    </div>
  );
};

const SegmentCard: React.FC<{
  name: string; description: string; count: number; total: number;
  color: string; icon: React.ReactNode;
}> = ({ name, description, count, total, color, icon }) => (
  <div className={cn('p-4 rounded-xl border transition-all', color)}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-bold text-white">{name}</h4>
      </div>
      <span className="text-2xl font-black text-white">{count}</span>
    </div>
    <p className="text-[10px] text-slate-400 mb-2">{description}</p>
    <div className="w-full bg-white/10 rounded-full h-1">
      <div className="h-1 rounded-full bg-white/40 transition-all duration-500"
        style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
    </div>
    <p className="text-[10px] text-slate-500 mt-1">{total > 0 ? Math.round((count / total) * 100) : 0}% da base</p>
  </div>
);

// =====================================================
// Main Component
// =====================================================

export const SegmentacaoClientes: React.FC<SegmentacaoClientesProps> = ({ empresaId }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'segments' | 'quality' | 'geo'>('overview');

  const loadAll = useCallback(async () => {
    if (!empresaId) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await clienteService.list(empresaId, { page: 1, pageSize: 9999 });
      setClientes(result.data);
    } catch (error) {
      if (isTableNotFoundError(error)) { setTableError(true); return; }
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const analytics = useMemo(() => computeAnalytics(clientes), [clientes]);

  if (!empresaId) return <EmptyState message="Selecione uma empresa" />;
  if (tableError) return <TableNotConfigured entity="clientes" />;
  if (loading) return <LoadingState />;
  if (!analytics) return <EmptyState message="Nenhum dado para análise" description="Cadastre clientes para ver a segmentação." />;

  const a = analytics;

  const views = [
    { id: 'overview', label: 'Visão Geral', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'segments', label: 'Segmentos', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'quality', label: 'Qualidade', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'geo', label: 'Geográfico', icon: <Globe className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Navigation */}
      <div className="flex gap-1 p-1 bg-[#0d1117]/40 rounded-xl border border-white/5">
        {views.map(v => (
          <button key={v.id} onClick={() => setActiveView(v.id as typeof activeView)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center',
              activeView === v.id
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
            )}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {/* ════════════════ OVERVIEW ════════════════ */}
      {activeView === 'overview' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={<Users className="w-5 h-5" />} label="Total de Clientes" value={a.total} />
            <MetricCard icon={<UserCheck className="w-5 h-5" />} label="Ativos" value={a.ativos.length}
              subtitle={`${Math.round((a.ativos.length / a.total) * 100)}% da base`} color="text-emerald-400" />
            <MetricCard icon={<Calendar className="w-5 h-5" />} label="Novos este mês" value={a.thisMonth.length}
              trend={a.growthRate} color="text-purple-400" />
            <MetricCard icon={<Activity className="w-5 h-5" />} label="Score Médio" value={`${a.avgHealth}%`}
              subtitle="Saúde do cadastro" color="text-blue-400" />
          </div>

          {/* Growth Chart (text-based) */}
          <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Crescimento (6 meses)
              </h4>
              <span className={cn('text-xs font-bold', a.growthRate > 0 ? 'text-emerald-400' : a.growthRate < 0 ? 'text-red-400' : 'text-slate-500')}>
                {a.growthRate > 0 ? '+' : ''}{a.growthRate}% MoM
              </span>
            </div>
            <div className="flex items-end gap-2 h-28">
              {a.monthlyGrowth.map((m, i) => {
                const max = Math.max(...a.monthlyGrowth.map(mg => mg.count), 1);
                const h = (m.count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-white">{m.count}</span>
                    <div className="w-full bg-white/5 rounded-t-sm relative" style={{ height: '80px' }}>
                      <div
                        className={cn('absolute bottom-0 w-full rounded-t-sm transition-all',
                          i === a.monthlyGrowth.length - 1
                            ? 'bg-gradient-to-t from-purple-600 to-purple-400'
                            : 'bg-gradient-to-t from-purple-600/40 to-purple-400/30'
                        )}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-600 uppercase">{m.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Health Distribution */}
          <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-blue-400" /> Distribuição por Score de Saúde
            </h4>
            <div className="space-y-2.5">
              <ProgressBar label="Excelente (80+)" value={a.healthBuckets.excellent} max={a.total} color="from-emerald-500 to-emerald-400" />
              <ProgressBar label="Bom (60-79)" value={a.healthBuckets.good} max={a.total} color="from-blue-500 to-blue-400" />
              <ProgressBar label="Regular (40-59)" value={a.healthBuckets.regular} max={a.total} color="from-amber-500 to-amber-400" />
              <ProgressBar label="Baixo (20-39)" value={a.healthBuckets.poor} max={a.total} color="from-orange-500 to-orange-400" />
              <ProgressBar label="Crítico (<20)" value={a.healthBuckets.critical} max={a.total} color="from-red-500 to-red-400" />
            </div>
          </div>

          {/* Insights */}
          {a.insights.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Insights e Alertas
              </h4>
              {a.insights.map((insight, i) => (
                <div key={i} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  insight.type === 'warning' && 'bg-amber-500/5 border-amber-500/15',
                  insight.type === 'info' && 'bg-blue-500/5 border-blue-500/15',
                  insight.type === 'success' && 'bg-emerald-500/5 border-emerald-500/15',
                )}>
                  {insight.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                  {insight.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                  {insight.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  <span className="text-xs text-slate-300 flex-1">{insight.text}</span>
                  <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">{insight.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Type & Status Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Por Tipo</h4>
              <ProgressBar label="Pessoa Física" value={a.pf.length} max={a.total} color="from-blue-500 to-cyan-400" />
              <div className="mt-2">
                <ProgressBar label="Pessoa Jurídica" value={a.pj.length} max={a.total} color="from-purple-500 to-pink-400" />
              </div>
            </div>
            <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Crédito</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Total alocado</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(a.totalCredito)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Média</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(a.avgCredito)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Maior limite</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(a.maxCredito)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ SEGMENTS ════════════════ */}
      {activeView === 'segments' && (
        <div className="space-y-4">
          <SectionTitle title="Segmentação Inteligente" description="Baseada em comportamento, dados e valor do cliente" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SegmentCard name="Campeões" description="Ativos, dados completos e limite acima da média"
              count={a.segments.champions.length} total={a.total}
              color="bg-emerald-500/5 border-emerald-500/20" icon={<Star className="w-4 h-4 text-emerald-400" />} />
            <SegmentCard name="Leais" description="Ativos com score de saúde >= 60"
              count={a.segments.loyal.length} total={a.total}
              color="bg-blue-500/5 border-blue-500/20" icon={<UserCheck className="w-4 h-4 text-blue-400" />} />
            <SegmentCard name="Promissores" description="Novos (últimos 90 dias) e ativos"
              count={a.segments.promising.length} total={a.total}
              color="bg-purple-500/5 border-purple-500/20" icon={<TrendingUp className="w-4 h-4 text-purple-400" />} />
            <SegmentCard name="Precisam Atenção" description="Ativos com score de saúde < 40"
              count={a.segments.needsAttention.length} total={a.total}
              color="bg-amber-500/5 border-amber-500/20" icon={<AlertCircle className="w-4 h-4 text-amber-400" />} />
            <SegmentCard name="Em Risco" description="Inativos mas com contato cadastrado"
              count={a.segments.atRisk.length} total={a.total}
              color="bg-orange-500/5 border-orange-500/20" icon={<TrendingDown className="w-4 h-4 text-orange-400" />} />
            <SegmentCard name="Perdidos" description="Inativos e sem meios de contato"
              count={a.segments.lost.length} total={a.total}
              color="bg-red-500/5 border-red-500/20" icon={<UserX className="w-4 h-4 text-red-400" />} />
          </div>
        </div>
      )}

      {/* ════════════════ QUALITY ════════════════ */}
      {activeView === 'quality' && (
        <div className="space-y-5">
          <SectionTitle title="Qualidade dos Dados" description="Completude e consistência do cadastro" />

          {/* Overall Score */}
          <div className="p-5 bg-[#0d1117]/60 rounded-xl border border-white/5 text-center">
            <div className="relative inline-flex items-center justify-center w-28 h-28 mb-3">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none"
                  stroke={a.qualityScore >= 80 ? '#10b981' : a.qualityScore >= 60 ? '#3b82f6' : a.qualityScore >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(a.qualityScore / 100) * 327} 327`}
                />
              </svg>
              <span className="absolute text-2xl font-black text-white">{a.qualityScore}%</span>
            </div>
            <p className="text-sm font-semibold text-white">Score Geral de Qualidade</p>
            <p className="text-[10px] text-slate-500 mt-1">
              {a.qualityScore >= 80 ? 'Excelente - Dados bem preenchidos' :
               a.qualityScore >= 60 ? 'Bom - Alguns campos podem ser melhorados' :
               a.qualityScore >= 40 ? 'Regular - Muitos cadastros incompletos' :
               'Baixo - Ação necessária para melhorar os dados'}
            </p>
          </div>

          {/* Individual Metrics */}
          <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2">
              <Database className="w-3.5 h-3.5" /> Completude por Campo
            </h4>
            <ProgressBar label="CPF/CNPJ" value={a.comCpfCnpj.length} max={a.total} color="from-purple-500 to-purple-400" />
            <ProgressBar label="Email" value={a.comEmail.length} max={a.total} color="from-blue-500 to-blue-400" />
            <ProgressBar label="Telefone" value={a.comTelefone.length} max={a.total} color="from-emerald-500 to-emerald-400" />
            <ProgressBar label="Endereço" value={a.comEndereco.length} max={a.total} color="from-amber-500 to-amber-400" />
            <ProgressBar label="Limite Crédito" value={a.comLimite.length} max={a.total} color="from-pink-500 to-pink-400" />
          </div>

          {/* Recommendations */}
          <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Recomendações
            </h4>
            <div className="space-y-2">
              {a.comCpfCnpj.length < a.total && (
                <p className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  Complete o CPF/CNPJ de {a.total - a.comCpfCnpj.length} cliente(s) para validação fiscal.
                </p>
              )}
              {a.comEmail.length < a.total && (
                <p className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  Solicite email de {a.total - a.comEmail.length} cliente(s) para comunicação digital.
                </p>
              )}
              {a.comEndereco.length < a.total && (
                <p className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  Atualize endereço de {a.total - a.comEndereco.length} cliente(s) para entregas e cobranças.
                </p>
              )}
              {a.qualityScore >= 80 && (
                <p className="text-xs text-emerald-400 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Parabéns! A qualidade dos dados está excelente.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ GEOGRAPHIC ════════════════ */}
      {activeView === 'geo' && (
        <div className="space-y-5">
          <SectionTitle title="Distribuição Geográfica" description="Onde estão seus clientes" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top UFs */}
            <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Top Estados
              </h4>
              {a.topUFs.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">Nenhum estado cadastrado</p>
              ) : (
                <div className="space-y-2">
                  {a.topUFs.map(([uf, count], i) => (
                    <ProgressBar key={uf} label={uf} value={count} max={a.total}
                      color={i === 0 ? 'from-purple-500 to-blue-400' : i < 3 ? 'from-blue-500 to-cyan-400' : 'from-slate-500 to-slate-400'} />
                  ))}
                </div>
              )}
            </div>

            {/* Top Cities */}
            <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Top Cidades
              </h4>
              {a.topCities.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">Nenhuma cidade cadastrada</p>
              ) : (
                <div className="space-y-2">
                  {a.topCities.map(([city, count], i) => (
                    <ProgressBar key={city} label={city} value={count} max={a.total}
                      color={i === 0 ? 'from-emerald-500 to-teal-400' : i < 3 ? 'from-teal-500 to-cyan-400' : 'from-slate-500 to-slate-400'} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard icon={<Globe className="w-5 h-5" />} label="Estados diferentes"
              value={a.topUFs.length} color="text-blue-400" />
            <MetricCard icon={<MapPin className="w-5 h-5" />} label="Cidades diferentes"
              value={a.topCities.length} color="text-emerald-400" />
            <MetricCard icon={<Hash className="w-5 h-5" />} label="Sem localização"
              value={a.total - a.comEndereco.length} color="text-amber-400" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentacaoClientes;
