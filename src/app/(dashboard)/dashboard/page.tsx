'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users, FileText,
  AlertTriangle, ArrowRight, Wrench, CheckCircle2, Calendar, BarChart3, Zap,
  Activity, CreditCard, Clock, ChevronRight, Receipt, Bell, RefreshCw,
  CircleDollarSign, Banknote, BadgeAlert, Target, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/molecules/Card'
import { ZedLogo } from '@/shared/components/atoms/ZedLogo'
import { useSupabaseAuth } from '@/shared/hooks/useSupabaseAuth'
import { useEmpresaId } from '@/shared/hooks/useEmpresaId'
import { createLegacyTenantClient } from '@/shared/lib/supabase/client'

// =====================================================
// Types
// =====================================================

interface DashboardStats {
  vendasHoje: number
  vendasMes: number
  vendasMesPassado: number
  ticketMedio: number
  qtdVendasMes: number
  clientesAtivos: number
  clientesNovos: number
  produtosEstoqueBaixo: number
  contasPagarHoje: number
  contasReceberHoje: number
  contasPagarAtrasadas: number
  contasReceberAtrasadas: number
  recebidoMes: number
  pagoMes: number
  osEmAberto: number
}

interface MonthlyData {
  mes: string
  receitas: number
  despesas: number
}

interface CashFlowDay {
  dia: string
  receber: number
  pagar: number
  saldo: number
}

interface UpcomingBill {
  id: string
  descricao: string
  valor: number
  data: string
  tipo: 'pagar' | 'receber'
  atrasado: boolean
}

interface RecentSale {
  id: string
  data: string
  numero: string
  valor: number
  status: string
}

// =====================================================
// Color Config
// =====================================================

const kpiColors = {
  emerald: {
    bg: 'from-emerald-500/15 to-emerald-900/5',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    glow: 'shadow-emerald-500/10',
    chart: '#10b981',
  },
  blue: {
    bg: 'from-blue-500/15 to-blue-900/5',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/15',
    glow: 'shadow-blue-500/10',
    chart: '#3b82f6',
  },
  purple: {
    bg: 'from-purple-500/15 to-purple-900/5',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    iconBg: 'bg-purple-500/15',
    glow: 'shadow-purple-500/10',
    chart: '#8b5cf6',
  },
  amber: {
    bg: 'from-amber-500/15 to-amber-900/5',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
    glow: 'shadow-amber-500/10',
    chart: '#f59e0b',
  },
  cyan: {
    bg: 'from-cyan-500/15 to-cyan-900/5',
    border: 'border-cyan-500/20',
    text: 'text-cyan-400',
    iconBg: 'bg-cyan-500/15',
    glow: 'shadow-cyan-500/10',
    chart: '#06b6d4',
  },
  pink: {
    bg: 'from-pink-500/15 to-pink-900/5',
    border: 'border-pink-500/20',
    text: 'text-pink-400',
    iconBg: 'bg-pink-500/15',
    glow: 'shadow-pink-500/10',
    chart: '#ec4899',
  },
  orange: {
    bg: 'from-orange-500/15 to-orange-900/5',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    iconBg: 'bg-orange-500/15',
    glow: 'shadow-orange-500/10',
    chart: '#f97316',
  },
  red: {
    bg: 'from-red-500/15 to-red-900/5',
    border: 'border-red-500/20',
    text: 'text-red-400',
    iconBg: 'bg-red-500/15',
    glow: 'shadow-red-500/10',
    chart: '#ef4444',
  },
} as const

type KPIColor = keyof typeof kpiColors

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}`
}

const formatDateFull = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// =====================================================
// Custom Chart Tooltip
// =====================================================

const DarkTooltip = ({ active, payload, label, currency = true }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1526]/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm text-xs">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="text-white font-semibold">
            {currency ? formatCurrency(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// =====================================================
// Dashboard Page
// =====================================================

export default function DashboardPage() {
  const { user } = useSupabaseAuth()
  const empresaId = useEmpresaId()

  const [stats, setStats] = useState<DashboardStats>({
    vendasHoje: 0, vendasMes: 0, vendasMesPassado: 0,
    ticketMedio: 0, qtdVendasMes: 0,
    clientesAtivos: 0, clientesNovos: 0,
    produtosEstoqueBaixo: 0,
    contasPagarHoje: 0, contasReceberHoje: 0,
    contasPagarAtrasadas: 0, contasReceberAtrasadas: 0,
    recebidoMes: 0, pagoMes: 0,
    osEmAberto: 0,
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [cashFlowData, setCashFlowData] = useState<CashFlowDay[]>([])
  const [upcomingBills, setUpcomingBills] = useState<UpcomingBill[]>([])
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const loadStats = useCallback(async () => {
    if (!empresaId) { setLoading(false); return }

    setLoading(true)
    const supabase = createLegacyTenantClient()
    const hoje = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0]

    const mesPassado = new Date()
    mesPassado.setMonth(mesPassado.getMonth() - 1)
    const inicioMesPassado = new Date(mesPassado.getFullYear(), mesPassado.getMonth(), 1)
      .toISOString().split('T')[0]
    const fimMesPassado = new Date(mesPassado.getFullYear(), mesPassado.getMonth() + 1, 0)
      .toISOString().split('T')[0]

    const proximaSemana = new Date()
    proximaSemana.setDate(proximaSemana.getDate() + 7)
    const fimSemana = proximaSemana.toISOString().split('T')[0]

    // Last 6 months for chart
    const inicioSemestre = new Date()
    inicioSemestre.setMonth(inicioSemestre.getMonth() - 5)
    inicioSemestre.setDate(1)
    const inicioSemestreStr = inicioSemestre.toISOString().split('T')[0]

    const safeData = async <T,>(
      fn: () => Promise<{ data: T | null; error: unknown }>
    ): Promise<T | null> => {
      try { const { data, error } = await fn(); return error ? null : data }
      catch { return null }
    }
    const safeCount = async (
      fn: () => Promise<{ count: number | null; error: unknown }>
    ): Promise<number> => {
      try { const { count, error } = await fn(); return error ? 0 : (count ?? 0) }
      catch { return 0 }
    }

    const isOverview = empresaId === 'general-overview'
    const q = (query: any) => isOverview ? query : query.eq('empresa_id', empresaId)

    try {
      const [
        vendasHoje, vendasMes, vendasMesPassado,
        clientesCount, clientesNovos,
        estoqueBaixo,
        cpHoje, crHoje,
        cpAtrasadas, crAtrasadas,
        recebidoMes, pagoMes,
        osCount,
        historicoReceber, historicoPagar,
        aReceberSemana, aPagarSemana,
        ultVendas,
      ] = await Promise.all([
        // Vendas hoje
        safeData<any[]>(() => q(supabase.from('pedidos').select('valor_total')
          .eq('status', 'faturado').gte('data_pedido', hoje))),
        // Vendas mês atual
        safeData<any[]>(() => q(supabase.from('pedidos').select('valor_total')
          .eq('status', 'faturado').gte('data_pedido', inicioMes))),
        // Vendas mês passado
        safeData<any[]>(() => q(supabase.from('pedidos').select('valor_total')
          .eq('status', 'faturado').gte('data_pedido', inicioMesPassado).lte('data_pedido', fimMesPassado))),
        // Clientes ativos
        safeCount(() => q(supabase.from('clientes').select('*', { count: 'exact', head: true })
          .eq('ativo', true))),
        // Clientes novos no mês
        safeCount(() => q(supabase.from('clientes').select('*', { count: 'exact', head: true })
          .gte('created_at', inicioMes))),
        // Estoque baixo
        safeCount(() => q(supabase.from('saldos_estoque').select('*', { count: 'exact', head: true })
          .lt('quantidade', 10))),
        // Contas a pagar hoje
        safeData<any[]>(() => q(supabase.from('contas_pagar').select('valor')
          .eq('data_vencimento', hoje).eq('status', 'aberto'))),
        // Contas a receber hoje
        safeData<any[]>(() => q(supabase.from('contas_receber').select('valor')
          .eq('data_vencimento', hoje).eq('status', 'aberto'))),
        // Contas a pagar atrasadas
        safeCount(() => q(supabase.from('contas_pagar').select('*', { count: 'exact', head: true })
          .lt('data_vencimento', hoje).eq('status', 'aberto'))),
        // Contas a receber atrasadas
        safeCount(() => q(supabase.from('contas_receber').select('*', { count: 'exact', head: true })
          .lt('data_vencimento', hoje).eq('status', 'aberto'))),
        // Recebido no mês (status pago)
        safeData<any[]>(() => q(supabase.from('contas_receber').select('valor')
          .eq('status', 'pago').gte('data_vencimento', inicioMes))),
        // Pago no mês
        safeData<any[]>(() => q(supabase.from('contas_pagar').select('valor')
          .eq('status', 'pago').gte('data_vencimento', inicioMes))),
        // OS em aberto
        safeCount(() => q(supabase.from('ordens_servico').select('*', { count: 'exact', head: true })
          .in('status', ['aberta', 'em_andamento']))),
        // Histórico recebimentos (semestre)
        safeData<any[]>(() => q(supabase.from('contas_receber').select('valor, data_vencimento')
          .gte('data_vencimento', inicioSemestreStr).lte('data_vencimento', hoje))),
        // Histórico pagamentos (semestre)
        safeData<any[]>(() => q(supabase.from('contas_pagar').select('valor, data_vencimento')
          .gte('data_vencimento', inicioSemestreStr).lte('data_vencimento', hoje))),
        // A receber próx. 7 dias
        safeData<any[]>(() => q(supabase.from('contas_receber')
          .select('id, descricao, valor, data_vencimento')
          .gte('data_vencimento', hoje).lte('data_vencimento', fimSemana)
          .eq('status', 'aberto').order('data_vencimento').limit(15))),
        // A pagar próx. 7 dias
        safeData<any[]>(() => q(supabase.from('contas_pagar')
          .select('id, descricao, valor, data_vencimento')
          .gte('data_vencimento', hoje).lte('data_vencimento', fimSemana)
          .eq('status', 'aberto').order('data_vencimento').limit(15))),
        // Últimas vendas
        safeData<any[]>(() => q(supabase.from('pedidos')
          .select('id, data_pedido, valor_total, status, numero')
          .order('data_pedido', { ascending: false }).limit(6))),
      ])

      // ---- Compute stats ----
      const totalHoje = vendasHoje?.reduce((a: number, v: any) => a + (v.valor_total || 0), 0) || 0
      const totalMes = vendasMes?.reduce((a: number, v: any) => a + (v.valor_total || 0), 0) || 0
      const totalMesPassado = vendasMesPassado?.reduce((a: number, v: any) => a + (v.valor_total || 0), 0) || 0
      const qtdVendasMes = vendasMes?.length || 0

      setStats({
        vendasHoje: totalHoje,
        vendasMes: totalMes,
        vendasMesPassado: totalMesPassado,
        ticketMedio: qtdVendasMes > 0 ? totalMes / qtdVendasMes : 0,
        qtdVendasMes,
        clientesAtivos: clientesCount,
        clientesNovos,
        produtosEstoqueBaixo: estoqueBaixo,
        contasPagarHoje: cpHoje?.reduce((a: number, c: any) => a + (c.valor || 0), 0) || 0,
        contasReceberHoje: crHoje?.reduce((a: number, c: any) => a + (c.valor || 0), 0) || 0,
        contasPagarAtrasadas: cpAtrasadas,
        contasReceberAtrasadas: crAtrasadas,
        recebidoMes: recebidoMes?.reduce((a: number, c: any) => a + (c.valor || 0), 0) || 0,
        pagoMes: pagoMes?.reduce((a: number, c: any) => a + (c.valor || 0), 0) || 0,
        osEmAberto: osCount,
      })

      // ---- Build monthly chart ----
      const monthMap = new Map<string, { receitas: number; despesas: number }>()
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('pt-BR', { month: 'short' })
          .replace('.', '').charAt(0).toUpperCase() + d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').slice(1)
        monthMap.set(key, { receitas: 0, despesas: 0 })
      }
      historicoReceber?.forEach((r: any) => {
        const key = r.data_vencimento?.slice(0, 7)
        if (key && monthMap.has(key)) {
          monthMap.get(key)!.receitas += r.valor || 0
        }
      })
      historicoPagar?.forEach((r: any) => {
        const key = r.data_vencimento?.slice(0, 7)
        if (key && monthMap.has(key)) {
          monthMap.get(key)!.despesas += r.valor || 0
        }
      })
      const monthly = Array.from(monthMap.entries()).map(([key, val]) => {
        const [y, m] = key.split('-')
        const d = new Date(Number(y), Number(m) - 1, 1)
        const mes = d.toLocaleDateString('pt-BR', { month: 'short' })
          .replace('.', '')
        return { mes: mes.charAt(0).toUpperCase() + mes.slice(1), ...val }
      })
      setMonthlyData(monthly)

      // ---- Build 7-day cash flow ----
      const dayMap = new Map<string, { receber: number; pagar: number }>()
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() + i)
        dayMap.set(d.toISOString().split('T')[0], { receber: 0, pagar: 0 })
      }
      aReceberSemana?.forEach((r: any) => {
        if (r.data_vencimento && dayMap.has(r.data_vencimento)) {
          dayMap.get(r.data_vencimento)!.receber += r.valor || 0
        }
      })
      aPagarSemana?.forEach((r: any) => {
        if (r.data_vencimento && dayMap.has(r.data_vencimento)) {
          dayMap.get(r.data_vencimento)!.pagar += r.valor || 0
        }
      })
      let saldoAcumulado = 0
      const cashFlow = Array.from(dayMap.entries()).map(([date, val]) => {
        saldoAcumulado += val.receber - val.pagar
        return { dia: formatDate(date), receber: val.receber, pagar: val.pagar, saldo: saldoAcumulado }
      })
      setCashFlowData(cashFlow)

      // ---- Build upcoming bills list ----
      const bills: UpcomingBill[] = [
        ...(aReceberSemana || []).map((r: any) => ({
          id: r.id,
          descricao: r.descricao || 'A Receber',
          valor: r.valor || 0,
          data: r.data_vencimento,
          tipo: 'receber' as const,
          atrasado: r.data_vencimento < hoje,
        })),
        ...(aPagarSemana || []).map((r: any) => ({
          id: r.id,
          descricao: r.descricao || 'A Pagar',
          valor: r.valor || 0,
          data: r.data_vencimento,
          tipo: 'pagar' as const,
          atrasado: r.data_vencimento < hoje,
        })),
      ]
      bills.sort((a, b) => a.data.localeCompare(b.data))
      setUpcomingBills(bills.slice(0, 8))

      // ---- Recent sales ----
      setRecentSales(
        (ultVendas || []).map((v: any) => ({
          id: v.id,
          data: v.data_pedido,
          numero: v.numero ? `#${v.numero}` : `#${String(v.id).slice(0, 6).toUpperCase()}`,
          valor: v.valor_total || 0,
          status: v.status || '',
        }))
      )

      setLastUpdated(new Date())
    } catch {
      // falha inesperada — mantém zeros
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  useEffect(() => { loadStats() }, [loadStats])

  // Trend calculation
  const salesTrend = useMemo(() => {
    if (!stats.vendasMesPassado) return null
    return Math.round(((stats.vendasMes - stats.vendasMesPassado) / stats.vendasMesPassado) * 100)
  }, [stats.vendasMes, stats.vendasMesPassado])

  const resultadoDia = stats.contasReceberHoje - stats.contasPagarHoje
  const totalAlertas = stats.contasPagarAtrasadas + stats.contasReceberAtrasadas + stats.produtosEstoqueBaixo + stats.osEmAberto

  // =====================================================
  // Status badge helper
  // =====================================================
  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; class: string }> = {
      faturado: { label: 'Faturado', class: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
      pendente: { label: 'Pendente', class: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
      cancelado: { label: 'Cancelado', class: 'bg-red-500/15 text-red-400 border border-red-500/20' },
      em_andamento: { label: 'Em andamento', class: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
      aberto: { label: 'Aberto', class: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' },
    }
    const s = map[status] ?? { label: status, class: 'bg-white/5 text-slate-400 border border-white/10' }
    return <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', s.class)}>{s.label}</span>
  }

  return (
    <div className="space-y-5">

      {/* ─── Welcome Header ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={cn(
          'relative overflow-hidden rounded-2xl p-6 md:p-7',
          'bg-gradient-to-br from-[#0A101F]/95 to-[#111827]/90',
          'border border-white/10 shadow-xl',
        )}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-500/6 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Left: greeting */}
          <div className="flex items-center gap-4">
            <ZedLogo size="xl" />
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">
                {saudacao}, <span className="text-gradient-zed">{userName}</span>!
              </h1>
              <p className="mt-1 text-slate-400 text-sm flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Right: quick summary */}
          <div className="flex items-center gap-5 flex-wrap">
            <div className="text-right">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Vendas hoje</p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">{formatCurrency(stats.vendasHoje)}</p>
            </div>
            <div className="w-px h-10 bg-white/10 hidden sm:block" />
            <div className="text-right">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Saldo do dia</p>
              <p className={cn('text-xl font-bold mt-0.5', resultadoDia >= 0 ? 'text-blue-400' : 'text-red-400')}>
                {formatCurrency(resultadoDia)}
              </p>
            </div>
            {totalAlertas > 0 && (
              <>
                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">{totalAlertas} alerta{totalAlertas > 1 ? 's' : ''}</span>
                </div>
              </>
            )}
            <button
              onClick={loadStats}
              disabled={loading}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={cn('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {lastUpdated && (
          <p className="relative z-10 mt-3 text-[10px] text-slate-600">
            Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-amber-500/40" />
      </motion.div>

      {/* ─── KPI Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Vendas do Mês"
          value={formatCurrency(stats.vendasMes)}
          subtitle={`${stats.qtdVendasMes} pedido${stats.qtdVendasMes !== 1 ? 's' : ''}`}
          icon={ShoppingCart}
          color="emerald"
          trend={salesTrend}
          loading={loading}
          delay={0}
        />
        <KPICard
          title="Ticket Médio"
          value={formatCurrency(stats.ticketMedio)}
          subtitle="Por venda faturada"
          icon={Activity}
          color="blue"
          loading={loading}
          delay={0.05}
        />
        <KPICard
          title="Clientes Ativos"
          value={stats.clientesAtivos.toLocaleString('pt-BR')}
          subtitle={stats.clientesNovos > 0 ? `+${stats.clientesNovos} novos este mês` : 'Cadastrados'}
          icon={Users}
          color="purple"
          loading={loading}
          delay={0.1}
        />
        <KPICard
          title="OS em Aberto"
          value={stats.osEmAberto.toLocaleString('pt-BR')}
          subtitle="Em andamento"
          icon={Wrench}
          color="amber"
          loading={loading}
          delay={0.15}
        />
      </div>

      {/* ─── Charts Row ───────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Monthly bar chart */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader icon={<BarChart3 className="w-5 h-5 text-blue-400" />}>
              <CardTitle>Receitas vs Despesas — Últimos 6 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 animate-pulse bg-white/5 rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                    <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {!loading && monthlyData.every(m => m.receitas === 0 && m.despesas === 0) && (
                <p className="text-center text-xs text-slate-600 mt-2">
                  Nenhum lançamento nos últimos 6 meses
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 7-day cash flow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
        >
          <Card className="h-full">
            <CardHeader icon={<Target className="w-5 h-5 text-cyan-400" />}>
              <CardTitle>Fluxo — Próx. 7 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 animate-pulse bg-white/5 rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="gradReceber" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPagar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip content={<DarkTooltip />} />
                    <Area type="monotone" dataKey="receber" name="A Receber" stroke="#10b981"
                      strokeWidth={2} fill="url(#gradReceber)" />
                    <Area type="monotone" dataKey="pagar" name="A Pagar" stroke="#ef4444"
                      strokeWidth={2} fill="url(#gradPagar)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {!loading && cashFlowData.every(d => d.receber === 0 && d.pagar === 0) && (
                <p className="text-center text-xs text-slate-600 mt-2">
                  Nenhum vencimento nos próx. 7 dias
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Info Cards Row ───────────────────────────────────── */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Financeiro Hoje */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader icon={<DollarSign className="w-5 h-5 text-emerald-400" />}>
              <CardTitle>Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {/* Hoje */}
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Hoje</p>
              <FinRow
                icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                label="A Receber"
                value={formatCurrency(stats.contasReceberHoje)}
                color="emerald"
              />
              <FinRow
                icon={<TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                label="A Pagar"
                value={formatCurrency(stats.contasPagarHoje)}
                color="red"
              />

              <div className="border-t border-white/5 pt-2.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Mês atual</p>
                <FinRow
                  icon={<CircleDollarSign className="w-3.5 h-3.5 text-blue-400" />}
                  label="Recebido"
                  value={formatCurrency(stats.recebidoMes)}
                  color="blue"
                />
                <div className="mt-2" />
                <FinRow
                  icon={<Banknote className="w-3.5 h-3.5 text-orange-400" />}
                  label="Pago"
                  value={formatCurrency(stats.pagoMes)}
                  color="orange"
                />
              </div>

              {(stats.contasPagarAtrasadas > 0 || stats.contasReceberAtrasadas > 0) && (
                <div className="flex gap-2 pt-1">
                  {stats.contasPagarAtrasadas > 0 && (
                    <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/8 border border-red-500/15 rounded-lg">
                      <BadgeAlert className="w-3 h-3 text-red-400 flex-shrink-0" />
                      <span className="text-[11px] text-red-400 font-semibold">{stats.contasPagarAtrasadas} atr.</span>
                    </div>
                  )}
                  {stats.contasReceberAtrasadas > 0 && (
                    <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/8 border border-amber-500/15 rounded-lg">
                      <BadgeAlert className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="text-[11px] text-amber-400 font-semibold">{stats.contasReceberAtrasadas} atr.</span>
                    </div>
                  )}
                </div>
              )}

              <Link href="/dashboard/financeiro"
                className="flex items-center justify-between p-3 bg-white/3 border border-white/8 rounded-xl hover:bg-white/5 transition-all group mt-1">
                <span className="text-xs text-white font-medium">Ver Financeiro</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Vencimentos da Semana */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader icon={<Clock className="w-5 h-5 text-amber-400" />}>
              <CardTitle>Vencimentos — 7 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-10 animate-pulse bg-white/5 rounded-lg" />
                  ))}
                </div>
              ) : upcomingBills.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
                  <p className="text-sm text-slate-500">Nenhum vencimento nos próximos 7 dias</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBills.map((bill) => (
                    <div
                      key={`${bill.tipo}-${bill.id}`}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs',
                        bill.tipo === 'receber'
                          ? 'bg-emerald-500/5 border-emerald-500/15'
                          : 'bg-red-500/5 border-red-500/15',
                        bill.atrasado && 'border-amber-500/20 bg-amber-500/5',
                      )}
                    >
                      <div className={cn(
                        'p-1.5 rounded-lg flex-shrink-0',
                        bill.tipo === 'receber' ? 'bg-emerald-500/15' : 'bg-red-500/15',
                        bill.atrasado && 'bg-amber-500/15',
                      )}>
                        {bill.tipo === 'receber'
                          ? <Receipt className={cn('w-3 h-3', bill.atrasado ? 'text-amber-400' : 'text-emerald-400')} />
                          : <CreditCard className={cn('w-3 h-3', bill.atrasado ? 'text-amber-400' : 'text-red-400')} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate text-[11px]">{bill.descricao}</p>
                        <p className="text-slate-500 text-[10px]">{formatDateFull(bill.data)}</p>
                      </div>
                      <span className={cn(
                        'font-bold text-[11px] flex-shrink-0',
                        bill.tipo === 'receber' ? 'text-emerald-400' : 'text-red-400',
                        bill.atrasado && 'text-amber-400',
                      )}>
                        {bill.tipo === 'receber' ? '+' : '-'}{formatCurrency(bill.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Alertas */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}>
              <CardTitle>Alertas do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {stats.contasPagarAtrasadas > 0 && (
                <AlertItem
                  href="/dashboard/financeiro"
                  icon={<CreditCard className="w-4 h-4 text-red-400" />}
                  label={`${stats.contasPagarAtrasadas} conta${stats.contasPagarAtrasadas > 1 ? 's' : ''} a pagar`}
                  sub="em atraso"
                  color="red"
                />
              )}
              {stats.contasReceberAtrasadas > 0 && (
                <AlertItem
                  href="/dashboard/financeiro"
                  icon={<Receipt className="w-4 h-4 text-amber-400" />}
                  label={`${stats.contasReceberAtrasadas} conta${stats.contasReceberAtrasadas > 1 ? 's' : ''} a receber`}
                  sub="em atraso"
                  color="amber"
                />
              )}
              {stats.produtosEstoqueBaixo > 0 && (
                <AlertItem
                  href="/dashboard/inventario"
                  icon={<Package className="w-4 h-4 text-orange-400" />}
                  label={`${stats.produtosEstoqueBaixo} produto${stats.produtosEstoqueBaixo > 1 ? 's' : ''}`}
                  sub="com estoque baixo"
                  color="orange"
                />
              )}
              {stats.osEmAberto > 0 && (
                <AlertItem
                  href="/dashboard/os"
                  icon={<Wrench className="w-4 h-4 text-cyan-400" />}
                  label={`${stats.osEmAberto} ordem${stats.osEmAberto > 1 ? 'ns' : ''} de serviço`}
                  sub="em andamento"
                  color="cyan"
                />
              )}
              {totalAlertas === 0 && (
                <div className="flex flex-col items-center justify-center py-5 gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
                  <p className="text-sm text-slate-400 font-medium">Tudo em ordem!</p>
                  <p className="text-xs text-slate-600">Nenhum alerta no momento</p>
                </div>
              )}
              {/* Indicadores rápidos */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <MiniStat label="Receita Mês" value={formatCurrency(stats.vendasMes)} color="emerald" />
                <MiniStat label="Estoque Baixo" value={String(stats.produtosEstoqueBaixo)} color="orange" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Bottom Row ───────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Últimas Vendas */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.45 }}
        >
          <Card className="h-full">
            <CardHeader icon={<ShoppingCart className="w-5 h-5 text-emerald-400" />}>
              <CardTitle>Últimas Vendas</CardTitle>
              <Link href="/dashboard/vendas"
                className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-10 animate-pulse bg-white/5 rounded-lg" />)}
                </div>
              ) : recentSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <ShoppingCart className="w-8 h-8 text-slate-600" />
                  <p className="text-sm text-slate-500">Nenhuma venda registrada</p>
                  <Link href="/dashboard/vendas"
                    className="text-xs text-blue-400 hover:underline">Registrar venda →</Link>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white">{sale.numero}</p>
                        <p className="text-[10px] text-slate-500">{sale.data ? formatDateFull(sale.data.split('T')[0]) : '-'}</p>
                      </div>
                      {statusBadge(sale.status)}
                      <span className="text-xs font-bold text-emerald-400 flex-shrink-0">{formatCurrency(sale.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Acesso Rápido */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader icon={<Zap className="w-5 h-5 text-purple-400" />}>
              <CardTitle>Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2.5">
              <QuickBtn href="/dashboard/vendas" icon={ShoppingCart} label="Vendas" color="emerald" />
              <QuickBtn href="/dashboard/clientes" icon={Users} label="Clientes" color="purple" />
              <QuickBtn href="/dashboard/financeiro" icon={DollarSign} label="Financeiro" color="blue" />
              <QuickBtn href="/dashboard/fiscal" icon={FileText} label="Fiscal" color="amber" />
              <QuickBtn href="/dashboard/inventario" icon={Package} label="Estoque" color="cyan" />
              <QuickBtn href="/dashboard/relatorios" icon={BarChart3} label="Relatórios" color="pink" />
              <QuickBtn href="/dashboard/os" icon={Wrench} label="Ordens S." color="orange" />
              <QuickBtn href="/dashboard/crm" icon={Target} label="CRM" color="red" />
              <QuickBtn href="/dashboard/settings" icon={Activity} label="Config." color="blue" />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

// =====================================================
// Sub-components
// =====================================================

interface KPICardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  color: KPIColor
  trend?: number | null
  loading?: boolean
  delay?: number
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon: Icon, color, trend, loading, delay = 0 }) => {
  const c = kpiColors[color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'relative overflow-hidden p-5 rounded-2xl border bg-gradient-to-br',
        'hover:shadow-lg transition-all duration-300',
        c.bg, c.border, c.glow,
      )}
    >
      <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full blur-2xl opacity-40"
        style={{ backgroundColor: `${c.chart}33` }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('p-2.5 rounded-xl', c.iconBg)}>
            <Icon className={cn('w-4.5 h-4.5', c.text)} />
          </div>
          {trend != null && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
              trend >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400',
            )}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend >= 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-7 w-28 bg-white/10 animate-pulse rounded-lg" />
            <div className="h-3 w-20 bg-white/5 animate-pulse rounded" />
          </div>
        ) : (
          <>
            <p className="text-2xl md:text-3xl font-black text-white tracking-tight">{value}</p>
            {subtitle && <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>}
          </>
        )}
        <p className="text-xs text-slate-400 mt-2 font-medium">{title}</p>
      </div>
    </motion.div>
  )
}

const FinRow = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: KPIColor }) => {
  const c = kpiColors[color]
  return (
    <div className={cn('flex items-center justify-between p-2.5 rounded-xl border', `bg-${color}-500/5`, `border-${color}-500/15`)}>
      <div className="flex items-center gap-2">
        <div className={cn('p-1 rounded-lg', c.iconBg)}>{icon}</div>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <span className={cn('text-xs font-bold', c.text)}>{value}</span>
    </div>
  )
}

const AlertItem = ({ href, icon, label, sub, color }: {
  href: string; icon: React.ReactNode; label: string; sub: string; color: KPIColor
}) => {
  const c = kpiColors[color]
  return (
    <Link href={href} className={cn(
      'flex items-center gap-2.5 p-2.5 rounded-xl border transition-all',
      `bg-${color}-500/5 border-${color}-500/15 hover:bg-${color}-500/10`,
    )}>
      <div className={cn('p-1.5 rounded-lg', c.iconBg)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{label}</p>
        <p className="text-[10px] text-slate-500">{sub}</p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
    </Link>
  )
}

const MiniStat = ({ label, value, color }: { label: string; value: string; color: KPIColor }) => {
  const c = kpiColors[color]
  return (
    <div className={cn('p-2.5 rounded-xl border', `bg-${color}-500/5 border-${color}-500/15`)}>
      <p className="text-[10px] text-slate-500 font-medium">{label}</p>
      <p className={cn('text-sm font-bold mt-0.5', c.text)}>{value}</p>
    </div>
  )
}

const QuickBtn = ({ href, icon: Icon, label, color }: {
  href: string; icon: React.ElementType; label: string; color: KPIColor
}) => {
  const c = kpiColors[color]
  return (
    <Link href={href} className={cn(
      'flex flex-col items-center gap-1.5 p-3 rounded-xl border',
      'transition-all duration-200 hover:scale-105 hover:shadow-md',
      c.bg, c.border,
    )}>
      <div className={cn('p-2 rounded-lg', c.iconBg)}>
        <Icon className={cn('w-4 h-4', c.text)} />
      </div>
      <span className="text-[10px] font-semibold text-white text-center leading-tight">{label}</span>
    </Link>
  )
}
