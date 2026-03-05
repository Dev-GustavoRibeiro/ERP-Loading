'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Plus, Edit, Trash2, DollarSign, FileText, Calendar, User, TrendingUp, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Portal } from '@/shared/components/atoms/Portal'
import { cn } from '@/shared/lib/utils'
import { formatCurrency } from '@/shared/lib/utils'
import { useEmpresaId } from '@/shared/hooks/useEmpresaId'
import {
  listCommissionRules,
  createCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  listCommissionStatements,
  generateCommissionStatement,
  payCommissionStatement,
  listSellers,
  listCommissionEntries,
} from '@/app/actions/vendas-features'
import { commissionRuleCreateSchema, type CommissionRuleCreateInput } from '@/modules/vendas-features/domain/schemas'

type CommissionRule = {
  id: string
  name: string
  description?: string | null
  seller_id?: string | null
  category_id?: string | null
  product_id?: string | null
  channel: 'all' | 'pdv' | 'pedido'
  commission_type: 'pct_subtotal' | 'pct_total' | 'fixed_per_item'
  commission_value: number
  priority: number
  valid_from?: string | null
  valid_until?: string | null
  is_active: boolean
}

type CommissionStatement = {
  id: string
  seller_id: string
  seller_name: string
  period_key: string
  total_sales: number
  total_forecast: number
  total_eligible: number
  total_paid: number
  total_reversed: number
  status: 'open' | 'closed' | 'paid'
  paid_at?: string | null
}

type Seller = {
  id: string
  nome: string
  comissao_percentual?: number | null
  ativo: boolean
}

const commissionTypeLabels: Record<string, string> = {
  pct_subtotal: '% sobre subtotal',
  pct_total: '% sobre total',
  fixed_per_item: 'Valor fixo por item',
}

export function CommissionsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const empresaId = useEmpresaId()
  const [activeTab, setActiveTab] = useState<'regras' | 'apuracao'>('regras')
  const [rules, setRules] = useState<CommissionRule[]>([])
  const [statements, setStatements] = useState<CommissionStatement[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(false)
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null)
  const [expandedStatement, setExpandedStatement] = useState<string | null>(null)
  const [periodFilter, setPeriodFilter] = useState<string>(new Date().toISOString().slice(0, 7))
  const [sellerFilter, setSellerFilter] = useState<string>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommissionRuleCreateInput>({
    resolver: zodResolver(commissionRuleCreateSchema),
    defaultValues: {
      name: '',
      description: '',
      seller_id: '',
      category_id: '',
      product_id: '',
      channel: 'all',
      commission_type: 'pct_subtotal',
      commission_value: 0,
      priority: 0,
      valid_from: '',
      valid_until: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (isOpen && empresaId) {
      loadData()
    }
  }, [isOpen, empresaId, activeTab, periodFilter, sellerFilter])

  const loadData = async () => {
    if (!empresaId) return
    setLoading(true)
    try {
      if (activeTab === 'regras') {
        const rulesData = await listCommissionRules(empresaId)
        setRules(rulesData)
        const sellersData = await listSellers(empresaId)
        setSellers(sellersData)
      } else {
        const filters: any = {}
        if (periodFilter) filters.period_key = periodFilter
        if (sellerFilter !== 'all') filters.seller_id = sellerFilter
        const statementsData = await listCommissionStatements(empresaId, filters)
        setStatements(statementsData.data || [])
        if (sellers.length === 0) {
          const sellersData = await listSellers(empresaId)
          setSellers(sellersData)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitRule = async (data: CommissionRuleCreateInput) => {
    if (!empresaId) return
    setLoading(true)
    try {
      const cleanData = {
        ...data,
        seller_id: data.seller_id === '' ? null : data.seller_id,
        category_id: data.category_id === '' ? null : data.category_id,
        product_id: data.product_id === '' ? null : data.product_id,
        valid_from: data.valid_from === '' ? null : data.valid_from,
        valid_until: data.valid_until === '' ? null : data.valid_until,
      }
      if (editingRule) {
        const result = await updateCommissionRule(editingRule.id, cleanData)
        if (result.success) {
          await loadData()
          setEditingRule(null)
          reset()
        } else {
          alert(result.error || 'Erro ao atualizar regra')
        }
      } else {
        const result = await createCommissionRule(empresaId, cleanData)
        if (result.success) {
          await loadData()
          reset()
        } else {
          alert(result.error || 'Erro ao criar regra')
        }
      }
    } catch (error) {
      console.error('Error saving rule:', error)
      alert('Erro ao salvar regra')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!empresaId) return
    setLoading(true)
    try {
      const result = await deleteCommissionRule(id)
      if (result.success) {
        await loadData()
        setShowDeleteConfirm(null)
      } else {
        alert(result.error || 'Erro ao excluir regra')
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('Erro ao excluir regra')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateStatement = async (sellerId: string, periodKey: string) => {
    if (!empresaId) return
    setLoading(true)
    try {
      const result = await generateCommissionStatement(empresaId, sellerId, periodKey)
      if (result.success) {
        await loadData()
      } else {
        alert(result.error || 'Erro ao gerar extrato')
      }
    } catch (error) {
      console.error('Error generating statement:', error)
      alert('Erro ao gerar extrato')
    } finally {
      setLoading(false)
    }
  }

  const handlePayStatement = async (id: string) => {
    if (!confirm('Confirmar pagamento deste extrato?')) return
    setLoading(true)
    try {
      const result = await payCommissionStatement(id)
      if (result.success) {
        await loadData()
      } else {
        alert(result.error || 'Erro ao pagar extrato')
      }
    } catch (error) {
      console.error('Error paying statement:', error)
      alert('Erro ao pagar extrato')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (rule: CommissionRule) => {
    setEditingRule(rule)
    reset({
      name: rule.name,
      description: rule.description || '',
      seller_id: rule.seller_id || '',
      category_id: rule.category_id || '',
      product_id: rule.product_id || '',
      channel: rule.channel,
      commission_type: rule.commission_type,
      commission_value: rule.commission_value,
      priority: rule.priority,
      valid_from: rule.valid_from || '',
      valid_until: rule.valid_until || '',
      is_active: rule.is_active,
    })
  }

  const cancelEdit = () => {
    setEditingRule(null)
    reset()
  }

  const getSellerName = (sellerId: string | null | undefined) => {
    if (!sellerId) return 'Todos'
    const seller = sellers.find(s => s.id === sellerId)
    return seller?.nome || 'Desconhecido'
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      closed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    }
    const labels = {
      open: 'Aberto',
      closed: 'Fechado',
      paid: 'Pago',
    }
    return (
      <span className={cn('px-2 py-1 rounded text-xs font-medium border', styles[status as keyof typeof styles] || styles.open)}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const activeRules = rules.filter(r => r.is_active).length
  const totalRules = rules.length

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="commissions-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              key="commissions-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-6xl max-h-[90vh] bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Comissões</h2>
                    <p className="text-sm text-white/60 mt-1">Gerencie regras e apurações de comissão</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-4 border-b border-white/10">
                  <button
                    onClick={() => setActiveTab('regras')}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeTab === 'regras'
                        ? 'bg-purple-600/20 text-purple-400'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                  >
                    Regras
                  </button>
                  <button
                    onClick={() => setActiveTab('apuracao')}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeTab === 'apuracao'
                        ? 'bg-purple-600/20 text-purple-400'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                  >
                    Apuração
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'regras' ? (
                    <div className="space-y-6">
                      {/* KPIs */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="text-sm text-white/60">Total de Regras</div>
                          <div className="text-2xl font-bold text-white mt-1">{totalRules}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="text-sm text-white/60">Regras Ativas</div>
                          <div className="text-2xl font-bold text-white mt-1">{activeRules}</div>
                        </div>
                      </div>

                      {/* Form */}
                      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">
                          {editingRule ? 'Editar Regra' : 'Nova Regra'}
                        </h3>
                        <form onSubmit={handleSubmit(onSubmitRule)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Nome *</label>
                              <input
                                {...register('name')}
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                                placeholder="Nome da regra"
                              />
                              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Descrição</label>
                              <input
                                {...register('description')}
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                                placeholder="Descrição opcional"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Vendedor</label>
                              <select
                                {...register('seller_id')}
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                              >
                                <option value="">Todos</option>
                                {sellers.map(seller => (
                                  <option key={seller.id} value={seller.id}>
                                    {seller.nome}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Categoria</label>
                              <input
                                {...register('category_id')}
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                                placeholder="Opcional"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Produto</label>
                              <input
                                {...register('product_id')}
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                                placeholder="Opcional"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Canal</label>
                              <select
                                {...register('channel')}
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                              >
                                <option value="all">Todos</option>
                                <option value="pdv">PDV</option>
                                <option value="pedido">Pedido</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Tipo de Comissão *</label>
                              <select
                                {...register('commission_type')}
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                              >
                                <option value="pct_subtotal">% sobre subtotal</option>
                                <option value="pct_total">% sobre total</option>
                                <option value="fixed_per_item">Valor fixo por item</option>
                              </select>
                              {errors.commission_type && (
                                <p className="text-red-400 text-xs mt-1">{errors.commission_type.message}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Valor *</label>
                              <input
                                {...register('commission_value', { valueAsNumber: true })}
                                type="number"
                                step="0.01"
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                                placeholder="0.00"
                              />
                              {errors.commission_value && (
                                <p className="text-red-400 text-xs mt-1">{errors.commission_value.message}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Prioridade</label>
                              <input
                                {...register('priority', { valueAsNumber: true })}
                                type="number"
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Válido de</label>
                              <input
                                {...register('valid_from')}
                                type="date"
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-white/80 mb-1">Válido até</label>
                              <input
                                {...register('valid_until')}
                                type="date"
                                className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                              />
                            </div>
                            <div className="flex items-center pt-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  {...register('is_active')}
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-white/20 bg-black/30 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-white/80">Ativo</span>
                              </label>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-4">
                            <button
                              type="submit"
                              disabled={loading}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                              {editingRule ? 'Atualizar' : 'Criar'}
                            </button>
                            {editingRule && (
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </form>
                      </div>

                      {/* Rules List */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-white">Regras Cadastradas</h3>
                        {rules.length === 0 ? (
                          <div className="text-center py-8 text-white/60">Nenhuma regra cadastrada</div>
                        ) : (
                          rules.map(rule => (
                            <div
                              key={rule.id}
                              className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-semibold text-white">{rule.name}</h4>
                                    {rule.is_active ? (
                                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                                        Ativo
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                                        Inativo
                                      </span>
                                    )}
                                  </div>
                                  {rule.description && (
                                    <p className="text-sm text-white/60 mb-2">{rule.description}</p>
                                  )}
                                  <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-white/60">Tipo: </span>
                                      <span className="text-white">{commissionTypeLabels[rule.commission_type]}</span>
                                    </div>
                                    <div>
                                      <span className="text-white/60">Valor: </span>
                                      <span className="text-white">
                                        {rule.commission_type === 'fixed_per_item'
                                          ? formatCurrency(rule.commission_value)
                                          : `${rule.commission_value}%`}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-white/60">Vendedor: </span>
                                      <span className="text-white">{getSellerName(rule.seller_id)}</span>
                                    </div>
                                    <div>
                                      <span className="text-white/60">Canal: </span>
                                      <span className="text-white">
                                        {rule.channel === 'all' ? 'Todos' : rule.channel === 'pdv' ? 'PDV' : 'Pedido'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-sm">
                                    <span className="text-white/60">Prioridade: </span>
                                    <span className="text-white">{rule.priority}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <button
                                    onClick={() => startEdit(rule)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  {showDeleteConfirm === rule.id ? (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleDeleteRule(rule.id)}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                                      >
                                        Confirmar
                                      </button>
                                      <button
                                        onClick={() => setShowDeleteConfirm(null)}
                                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-sm"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setShowDeleteConfirm(rule.id)}
                                      className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-red-400 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Filters */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-1">Período</label>
                          <input
                            type="month"
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value)}
                            className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-1">Vendedor</label>
                          <select
                            value={sellerFilter}
                            onChange={(e) => setSellerFilter(e.target.value)}
                            className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                          >
                            <option value="all">Todos</option>
                            {sellers.map(seller => (
                              <option key={seller.id} value={seller.id}>
                                {seller.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Statements Table */}
                      <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Vendedor</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Período</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-white/80">Vendas Totais</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-white/80">Previsão</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-white/80">Elegível</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-white/80">Pago</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-white/80">Estornado</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-white/80">Status</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-white/80">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {statements.length === 0 ? (
                                <tr>
                                  <td colSpan={9} className="px-4 py-8 text-center text-white/60">
                                    Nenhum extrato encontrado
                                  </td>
                                </tr>
                              ) : (
                                statements.map(statement => (
                                  <>
                                    <tr key={statement.id} className="hover:bg-white/5 transition-colors">
                                      <td className="px-4 py-3 text-sm text-white">{statement.seller_name}</td>
                                      <td className="px-4 py-3 text-sm text-white/80">
                                        {statement.period_key.replace('-', '/')}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-white text-right">
                                        {formatCurrency(statement.total_sales)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-white text-right">
                                        {formatCurrency(statement.total_forecast)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-white text-right">
                                        {formatCurrency(statement.total_eligible)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-white text-right">
                                        {formatCurrency(statement.total_paid)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-white text-right">
                                        {formatCurrency(statement.total_reversed)}
                                      </td>
                                      <td className="px-4 py-3 text-center">{getStatusBadge(statement.status)}</td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                          {statement.status === 'open' && (
                                            <button
                                              onClick={() =>
                                                handleGenerateStatement(statement.seller_id, statement.period_key)
                                              }
                                              className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                                              title="Gerar extrato"
                                            >
                                              <FileText className="w-4 h-4" />
                                            </button>
                                          )}
                                          {statement.status === 'open' && statement.total_eligible > 0 && (
                                            <button
                                              onClick={() => handlePayStatement(statement.id)}
                                              className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-emerald-400 transition-colors"
                                              title="Pagar"
                                            >
                                              <DollarSign className="w-4 h-4" />
                                            </button>
                                          )}
                                          <button
                                            onClick={() =>
                                              setExpandedStatement(expandedStatement === statement.id ? null : statement.id)
                                            }
                                            className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                                          >
                                            {expandedStatement === statement.id ? (
                                              <ChevronUp className="w-4 h-4" />
                                            ) : (
                                              <ChevronDown className="w-4 h-4" />
                                            )}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                    {expandedStatement === statement.id && (
                                      <tr>
                                        <td colSpan={9} className="px-4 py-4 bg-black/20">
                                          <StatementDetails
                                            empresaId={empresaId!}
                                            sellerId={statement.seller_id}
                                            periodKey={statement.period_key}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Generate Statement Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            if (sellerFilter === 'all') {
                              alert('Selecione um vendedor para gerar extrato')
                              return
                            }
                            handleGenerateStatement(sellerFilter, periodFilter)
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Gerar Extrato
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  )
}

function StatementDetails({
  empresaId,
  sellerId,
  periodKey,
}: {
  empresaId: string
  sellerId: string
  periodKey: string
}) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true)
      try {
        const result = await listCommissionEntries(empresaId, {
          seller_id: sellerId,
          period_key: periodKey,
        })
        setEntries(result.data || [])
      } catch (error) {
        console.error('Error loading entries:', error)
      } finally {
        setLoading(false)
      }
    }
    loadEntries()
  }, [empresaId, sellerId, periodKey])

  if (loading) {
    return <div className="text-white/60 text-sm">Carregando...</div>
  }

  if (entries.length === 0) {
    return <div className="text-white/60 text-sm">Nenhuma entrada encontrada</div>
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-white mb-3">Entradas de Comissão</h4>
      <div className="space-y-2">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="bg-white/5 rounded p-3 border border-white/10 text-sm"
          >
            <div className="grid grid-cols-4 gap-4">
              <div>
                <span className="text-white/60">Venda: </span>
                <span className="text-white">{entry.sale_number || entry.sale_id?.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-white/60">Valor: </span>
                <span className="text-white">{formatCurrency(entry.commission_amount)}</span>
              </div>
              <div>
                <span className="text-white/60">Status: </span>
                <span className="text-white">{entry.status}</span>
              </div>
              <div>
                <span className="text-white/60">Data: </span>
                <span className="text-white">
                  {entry.created_at ? new Date(entry.created_at).toLocaleDateString('pt-BR') : '-'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
