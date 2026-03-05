'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowLeftRight, ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, Loader2
} from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  getCashFlowProjection,
  getResumoFinanceiro,
  listContasBancarias
} from '@/app/actions/financeiro';
import { KPICards, fmtMoney, fmtDate } from '../shared';

// =====================================================
// Cash Flow Modal — Fluxo de Caixa
// =====================================================

interface CashFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CashFlowData {
  data: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface CashFlowProjection {
  previsto: CashFlowData[];
  realizado: CashFlowData[];
}

interface CashFlowEntry {
  data: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao?: string;
}

export const CashFlowModal: React.FC<CashFlowModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();

  // Date range state (default: current month)
  const [dateRange, setDateRange] = useState(() => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0],
    };
  });

  // Data state
  const [projection, setProjection] = useState<CashFlowProjection>({
    previsto: [],
    realizado: [],
  });
  const [resumo, setResumo] = useState({
    saldo_bancario: 0,
    entradas_previstas: 0,
    saidas_previstas: 0,
    saldo_previsto: 0,
  });
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      // Load projection
      const proj = await getCashFlowProjection(empresaId, dateRange.inicio, dateRange.fim);
      setProjection(proj);

      // Load resumo
      const res = await getResumoFinanceiro(empresaId, dateRange.inicio, dateRange.fim);
      
      // Get bank accounts balance
      const banks = await listContasBancarias(empresaId);
      const saldoBancario = banks.reduce((sum, b) => sum + ((b.saldo_atual as number) || 0), 0);

      // Calculate previsto totals
      const entradasPrevistas = proj.previsto.reduce((sum, p) => sum + p.entradas, 0);
      const saidasPrevistas = proj.previsto.reduce((sum, p) => sum + p.saidas, 0);
      const saldoPrevisto = saldoBancario + entradasPrevistas - saidasPrevistas;

      setResumo({
        saldo_bancario: saldoBancario,
        entradas_previstas: entradasPrevistas,
        saidas_previstas: saidasPrevistas,
        saldo_previsto: saldoPrevisto,
      });

      // Build entries list from realizado
      const entryList: CashFlowEntry[] = [];
      proj.realizado.forEach(r => {
        if (r.entradas > 0) {
          entryList.push({
            data: r.data,
            tipo: 'entrada',
            valor: r.entradas,
          });
        }
        if (r.saidas > 0) {
          entryList.push({
            data: r.data,
            tipo: 'saida',
            valor: r.saidas,
          });
        }
      });
      // Sort by date descending
      entryList.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setEntries(entryList);
    } catch (error) {
      console.error('Error loading cash flow:', error);
    }
    setLoading(false);
  }, [empresaId, dateRange]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Prepare chart data (merge previsto and realizado by date)
  const chartData = React.useMemo(() => {
    const dataMap = new Map<string, {
      data: string;
      entradas_realizado: number;
      saidas_realizado: number;
      saldo_previsto: number;
    }>();

    // Add realizado data
    projection.realizado.forEach(r => {
      dataMap.set(r.data, {
        data: r.data,
        entradas_realizado: r.entradas,
        saidas_realizado: r.saidas,
        saldo_previsto: 0,
      });
    });

    // Add previsto saldo
    projection.previsto.forEach(p => {
      const existing = dataMap.get(p.data);
      if (existing) {
        existing.saldo_previsto = p.saldo;
      } else {
        dataMap.set(p.data, {
          data: p.data,
          entradas_realizado: 0,
          saidas_realizado: 0,
          saldo_previsto: p.saldo,
        });
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.data).getTime() - new Date(b.data).getTime()
    );
  }, [projection]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="bg-[#1a1f2e] border border-white/10 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-slate-400 mb-2">{payload[0]?.payload?.data ? fmtDate(payload[0].payload.data) : ''}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {fmtMoney(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-6xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Fluxo de Caixa</h2>
                  <p className="text-xs text-slate-400">Análise de entradas, saídas e saldo previsto</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
              {/* KPI Cards */}
              <KPICards items={[
                {
                  label: 'Saldo Bancário',
                  value: fmtMoney(resumo.saldo_bancario),
                  color: 'blue',
                },
                {
                  label: 'Entradas Previstas',
                  value: fmtMoney(resumo.entradas_previstas),
                  color: 'emerald',
                },
                {
                  label: 'Saídas Previstas',
                  value: fmtMoney(resumo.saidas_previstas),
                  color: 'red',
                },
                {
                  label: 'Saldo Previsto',
                  value: fmtMoney(resumo.saldo_previsto),
                  color: resumo.saldo_previsto >= 0 ? 'emerald' : 'red',
                },
              ]} />

              {/* Date Range Selector */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>Período:</span>
                </div>
                <input
                  type="date"
                  value={dateRange.inicio}
                  onChange={(e) => setDateRange(r => ({ ...r, inicio: e.target.value }))}
                  className="px-3 py-2 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
                <span className="text-sm text-slate-500">até</span>
                <input
                  type="date"
                  value={dateRange.fim}
                  onChange={(e) => setDateRange(r => ({ ...r, fim: e.target.value }))}
                  className="px-3 py-2 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </div>

              {/* Chart */}
              <div className="bg-[#252d3d] border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-4">Realizado vs Previsto</h3>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-slate-500">
                    <p>Nenhum dado disponível para o período selecionado</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="data"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickFormatter={(value) => fmtDate(value)}
                        stroke="#4b5563"
                      />
                      <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        stroke="#4b5563"
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ color: '#e5e7eb', fontSize: '12px' }}
                        iconType="line"
                      />
                      <Area
                        type="monotone"
                        dataKey="entradas_realizado"
                        name="Entradas (Realizado)"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorEntradas)"
                      />
                      <Area
                        type="monotone"
                        dataKey="saidas_realizado"
                        name="Saídas (Realizado)"
                        stroke="#ef4444"
                        fillOpacity={1}
                        fill="url(#colorSaidas)"
                      />
                      <Area
                        type="monotone"
                        dataKey="saldo_previsto"
                        name="Saldo Previsto"
                        stroke="#3b82f6"
                        strokeDasharray="5 5"
                        fill="none"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Entries List */}
              <div className="bg-[#252d3d] border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-4">Movimentações</h3>
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>Nenhuma movimentação encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-none">
                    {entries.map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-[#1a1f2e] border border-white/10 rounded-lg hover:bg-[#252d3d] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {entry.tipo === 'entrada' ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">
                              {entry.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                            </p>
                            <p className="text-xs text-slate-500">{fmtDate(entry.data)}</p>
                          </div>
                        </div>
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            entry.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {entry.tipo === 'entrada' ? '+' : '-'} {fmtMoney(entry.valor)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
};
