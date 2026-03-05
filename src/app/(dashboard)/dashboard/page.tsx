'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  FileText,
  AlertTriangle,
  ArrowRight,
  Wrench,
  Clock,
  CheckCircle2,
  Calendar,
  BarChart3,
  Zap,
  Activity,
  CreditCard,
  PieChart,
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
  vendasHoje: number;
  vendasMes: number;
  ticketMedio: number;
  clientesAtivos: number;
  produtosEstoqueBaixo: number;
  contasPagarHoje: number;
  contasReceberHoje: number;
  osEmAberto: number;
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
  },
  blue: {
    bg: 'from-blue-500/15 to-blue-900/5',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/15',
    glow: 'shadow-blue-500/10',
  },
  purple: {
    bg: 'from-purple-500/15 to-purple-900/5',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    iconBg: 'bg-purple-500/15',
    glow: 'shadow-purple-500/10',
  },
  amber: {
    bg: 'from-amber-500/15 to-amber-900/5',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
    glow: 'shadow-amber-500/10',
  },
  cyan: {
    bg: 'from-cyan-500/15 to-cyan-900/5',
    border: 'border-cyan-500/20',
    text: 'text-cyan-400',
    iconBg: 'bg-cyan-500/15',
    glow: 'shadow-cyan-500/10',
  },
  pink: {
    bg: 'from-pink-500/15 to-pink-900/5',
    border: 'border-pink-500/20',
    text: 'text-pink-400',
    iconBg: 'bg-pink-500/15',
    glow: 'shadow-pink-500/10',
  },
  orange: {
    bg: 'from-orange-500/15 to-orange-900/5',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    iconBg: 'bg-orange-500/15',
    glow: 'shadow-orange-500/10',
  },
  red: {
    bg: 'from-red-500/15 to-red-900/5',
    border: 'border-red-500/20',
    text: 'text-red-400',
    iconBg: 'bg-red-500/15',
    glow: 'shadow-red-500/10',
  },
} as const;

type KPIColor = keyof typeof kpiColors;

// =====================================================
// Dashboard Page
// =====================================================

export default function DashboardPage() {
  const { user } = useSupabaseAuth()
  const empresaId = useEmpresaId()
  const [stats, setStats] = useState<DashboardStats>({
    vendasHoje: 0,
    vendasMes: 0,
    ticketMedio: 0,
    clientesAtivos: 0,
    produtosEstoqueBaixo: 0,
    contasPagarHoje: 0,
    contasReceberHoje: 0,
    osEmAberto: 0
  })
  const [loading, setLoading] = useState(true)

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const loadStats = useCallback(async () => {
    if (!empresaId) {
      setLoading(false)
      return
    }

    const supabase = createLegacyTenantClient()
    const hoje = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    // Helper: cada query é isolada — se a tabela não existe (404),
    // não tem permissão (401) ou tem erro de schema (400), retorna default.
    const safeData = async <T,>(queryFn: () => Promise<{ data: T | null; error: unknown }>): Promise<T | null> => {
      try { const { data, error } = await queryFn(); return error ? null : data; }
      catch { return null; }
    }
    const safeCount = async (queryFn: () => Promise<{ count: number | null; error: unknown }>): Promise<number> => {
      try { const { count, error } = await queryFn(); return error ? 0 : (count ?? 0); }
      catch { return 0; }
    }

    try {
      const isOverview = empresaId === 'general-overview'
      const withEmpresa = (query: any) => isOverview ? query : query.eq('empresa_id', empresaId)

      const [vendasHoje, vendasMes, clientesCount, estoqueBaixo, contasPagar, contasReceber, osCount] = await Promise.all([
        safeData<any[]>(() => withEmpresa(
          supabase.from('pedidos').select('valor_total').eq('status', 'faturado').gte('data_pedido', hoje)
        )),
        safeData<any[]>(() => withEmpresa(
          supabase.from('pedidos').select('valor_total').eq('status', 'faturado').gte('data_pedido', inicioMes)
        )),
        safeCount(() => withEmpresa(
          supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('ativo', true)
        )),
        safeCount(() => withEmpresa(
          supabase.from('saldos_estoque').select('*', { count: 'exact', head: true }).lt('quantidade', 10)
        )),
        safeData<any[]>(() => withEmpresa(
          supabase.from('contas_pagar').select('valor').eq('data_vencimento', hoje).eq('status', 'aberto')
        )),
        safeData<any[]>(() => withEmpresa(
          supabase.from('contas_receber').select('valor').eq('data_vencimento', hoje).eq('status', 'aberto')
        )),
        safeCount(() => withEmpresa(
          supabase.from('ordens_servico').select('*', { count: 'exact', head: true }).in('status', ['aberta', 'em_andamento'])
        )),
      ])

      const totalHoje = vendasHoje?.reduce((acc: number, v: any) => acc + (v.valor_total || 0), 0) || 0
      const totalMes = vendasMes?.reduce((acc: number, v: any) => acc + (v.valor_total || 0), 0) || 0
      const qtdVendasMes = vendasMes?.length || 1

      setStats({
        vendasHoje: totalHoje,
        vendasMes: totalMes,
        ticketMedio: totalMes / qtdVendasMes,
        clientesAtivos: clientesCount,
        produtosEstoqueBaixo: estoqueBaixo,
        contasPagarHoje: contasPagar?.reduce((acc: number, c: any) => acc + (c.valor || 0), 0) || 0,
        contasReceberHoje: contasReceber?.reduce((acc: number, c: any) => acc + (c.valor || 0), 0) || 0,
        osEmAberto: osCount
      })
    } catch {
      // Erro inesperado (rede caiu, etc.) — stats ficam no default (0)
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "relative overflow-hidden rounded-2xl p-6 md:p-8",
          "bg-gradient-to-br from-[#0A101F]/95 to-[#111827]/90",
          "border border-white/10 shadow-xl"
        )}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <ZedLogo size="xl" />
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">
                {saudacao}, <span className="text-gradient-zed">{userName}</span>!
              </h1>
              <p className="mt-1.5 text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Vendas hoje</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">{formatCurrency(stats.vendasHoje)}</p>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Saldo previsto</p>
              <p className={cn(
                "text-xl font-bold mt-1",
                stats.contasReceberHoje - stats.contasPagarHoje >= 0 ? "text-blue-400" : "text-red-400"
              )}>
                {formatCurrency(stats.contasReceberHoje - stats.contasPagarHoje)}
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-amber-500/40" />
      </motion.div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Vendas do Mês"
          value={formatCurrency(stats.vendasMes)}
          icon={ShoppingCart}
          color="emerald"
          trend={12}
          delay={0}
        />
        <KPICard
          title="Ticket Médio"
          value={formatCurrency(stats.ticketMedio)}
          icon={Activity}
          color="blue"
          trend={5}
          delay={0.05}
        />
        <KPICard
          title="Clientes Ativos"
          value={stats.clientesAtivos.toString()}
          icon={Users}
          color="purple"
          delay={0.1}
        />
        <KPICard
          title="OS em Aberto"
          value={stats.osEmAberto.toString()}
          icon={Wrench}
          color="amber"
          delay={0.15}
        />
      </div>

      {/* Info Cards Row */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Financeiro Hoje */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader icon={<DollarSign className="w-5 h-5 text-emerald-400" />}>
              <CardTitle>Financeiro Hoje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-500/15 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-400">A Receber</span>
                </div>
                <span className="font-bold text-emerald-400">{formatCurrency(stats.contasReceberHoje)}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-red-500/8 border border-red-500/15 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-red-500/15 rounded-lg">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-sm text-slate-400">A Pagar</span>
                </div>
                <span className="font-bold text-red-400">{formatCurrency(stats.contasPagarHoje)}</span>
              </div>
              <Link href="/dashboard/financeiro" className="flex items-center justify-between p-3.5 bg-white/3 border border-white/8 rounded-xl hover:bg-white/5 transition-all group">
                <span className="text-sm text-white font-medium">Ver Financeiro</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alertas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}>
              <CardTitle>Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.produtosEstoqueBaixo > 0 && (
                <Link href="/dashboard/inventario" className="flex items-center gap-3 p-3.5 bg-amber-500/8 border border-amber-500/15 rounded-xl hover:bg-amber-500/12 transition-all">
                  <div className="p-2 bg-amber-500/15 rounded-lg">
                    <Package className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{stats.produtosEstoqueBaixo} produtos</p>
                    <p className="text-xs text-slate-500">com estoque baixo</p>
                  </div>
                </Link>
              )}
              {stats.osEmAberto > 0 && (
                <Link href="/dashboard/os" className="flex items-center gap-3 p-3.5 bg-cyan-500/8 border border-cyan-500/15 rounded-xl hover:bg-cyan-500/12 transition-all">
                  <div className="p-2 bg-cyan-500/15 rounded-lg">
                    <Wrench className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{stats.osEmAberto} ordens de serviço</p>
                    <p className="text-xs text-slate-500">em andamento</p>
                  </div>
                </Link>
              )}
              {stats.contasPagarHoje > 0 && (
                <Link href="/dashboard/financeiro" className="flex items-center gap-3 p-3.5 bg-red-500/8 border border-red-500/15 rounded-xl hover:bg-red-500/12 transition-all">
                  <div className="p-2 bg-red-500/15 rounded-lg">
                    <CreditCard className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{formatCurrency(stats.contasPagarHoje)}</p>
                    <p className="text-xs text-slate-500">a pagar hoje</p>
                  </div>
                </Link>
              )}
              {stats.produtosEstoqueBaixo === 0 && stats.osEmAberto === 0 && stats.contasPagarHoje === 0 && (
                <div className="flex items-center gap-3 p-4 text-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-slate-400">Nenhum alerta no momento</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Acesso Rápido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader icon={<Zap className="w-5 h-5 text-purple-400" />}>
              <CardTitle>Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2.5">
              <QuickAccessButton href="/dashboard/vendas" icon={ShoppingCart} label="Vendas" color="emerald" />
              <QuickAccessButton href="/dashboard/clientes" icon={Users} label="Clientes" color="purple" />
              <QuickAccessButton href="/dashboard/financeiro" icon={DollarSign} label="Financeiro" color="blue" />
              <QuickAccessButton href="/dashboard/fiscal" icon={FileText} label="Fiscal" color="amber" />
              <QuickAccessButton href="/dashboard/inventario" icon={Package} label="Estoque" color="cyan" />
              <QuickAccessButton href="/dashboard/relatorios" icon={BarChart3} label="Relatórios" color="pink" />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

// =====================================================
// Components
// =====================================================

interface KPICardProps {
  title: string
  value: string
  icon: React.ElementType
  color: KPIColor
  trend?: number
  delay?: number
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, color, trend, delay = 0 }) => {
  const c = kpiColors[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative overflow-hidden p-5 rounded-2xl border bg-gradient-to-br",
        "hover:shadow-lg transition-all duration-300 group",
        c.bg, c.border, c.glow
      )}
    >
      {/* Subtle glow */}
      <div className={cn("absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-30", `bg-${color}-500/20`)} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("p-2.5 rounded-xl", c.iconBg)}>
            <Icon className={cn("w-5 h-5", c.text)} />
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
              trend >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            )}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend >= 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        <p className="text-2xl md:text-3xl font-black text-white tracking-tight">{value}</p>
        <p className="text-xs text-slate-400 mt-1.5 font-medium">{title}</p>
      </div>
    </motion.div>
  )
}

interface QuickAccessButtonProps {
  href: string
  icon: React.ElementType
  label: string
  color: KPIColor
}

const QuickAccessButton: React.FC<QuickAccessButtonProps> = ({ href, icon: Icon, label, color }) => {
  const c = kpiColors[color]

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-xl border",
        "transition-all duration-200 hover:scale-105 hover:shadow-md group",
        c.bg, c.border, c.glow
      )}
    >
      <div className={cn("p-2 rounded-lg", c.iconBg)}>
        <Icon className={cn("w-4 h-4", c.text)} />
      </div>
      <span className="text-xs font-semibold text-white">{label}</span>
    </Link>
  )
}
