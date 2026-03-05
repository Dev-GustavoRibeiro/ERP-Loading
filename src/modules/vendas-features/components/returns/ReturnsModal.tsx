'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  RotateCcw,
  Plus,
  Search,
  Check,
  XCircle,
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
  Ban,
  ArrowLeft,
  ArrowRight,
  FileText,
  ShoppingCart,
} from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Portal } from '@/shared/components/atoms/Portal'
import { cn } from '@/shared/lib/utils'
import { formatCurrency } from '@/shared/lib/utils'
import { useEmpresaId } from '@/shared/hooks/useEmpresaId'
import {
  listReturns,
  createReturn,
  getReturnById,
  approveReturn,
  completeReturn,
  cancelReturn,
  searchPdvSale,
} from '@/app/actions/vendas-features'
import {
  returnCreateSchema,
  type ReturnCreateInput,
} from '@/modules/vendas-features/domain/schemas'

// =====================================================
// Types
// =====================================================

type ReturnStatus = 'pending' | 'approved' | 'completed' | 'cancelled'
type ReturnType = 'refund' | 'exchange' | 'store_credit'

interface ReturnRow {
  id: string
  sale_number?: string
  return_type: ReturnType
  status: ReturnStatus
  total_refund: number
  created_at: string
  customer_name?: string
}

interface SaleItem {
  id: string
  produto_id?: string
  descricao: string
  quantidade: number
  preco_unitario: number
  desconto?: number
}

interface PdvSale {
  id: string
  numero?: string
  data_venda: string
  total: number
  itens?: SaleItem[]
  cliente_nome?: string
}

const STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

const STATUS_BADGES: Record<ReturnStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const TYPE_LABELS: Record<ReturnType, string> = {
  refund: 'Estorno',
  exchange: 'Troca',
  store_credit: 'Crédito de Loja',
}

const TYPE_BADGES: Record<ReturnType, string> = {
  refund: 'bg-purple-500/20 text-purple-400',
  exchange: 'bg-blue-500/20 text-blue-400',
  store_credit: 'bg-emerald-500/20 text-emerald-400',
}

// =====================================================
// Component
// =====================================================

export function ReturnsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const empresaId = useEmpresaId()
  const [returns, setReturns] = useState<ReturnRow[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'details'>('list')
  const [selectedReturn, setSelectedReturn] = useState<ReturnRow | null>(null)
  const [returnDetails, setReturnDetails] = useState<any>(null)
  const [createStep, setCreateStep] = useState(1)
  const [saleSearch, setSaleSearch] = useState('')
  const [saleResults, setSaleResults] = useState<PdvSale[]>([])
  const [searchingSales, setSearchingSales] = useState(false)
  const [selectedSale, setSelectedSale] = useState<PdvSale | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'complete' | 'cancel'
    id: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReturnCreateInput>({
    resolver: zodResolver(returnCreateSchema),
    defaultValues: {
      sale_type: 'pdv',
      items: [],
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedItems = watch('items')
  const refundTotal = watchedItems?.reduce(
    (acc, item) => acc + (item.qty_returned || 0) * (item.unit_price || 0),
    0
  ) || 0

  // Load returns
  useEffect(() => {
    if (isOpen && empresaId && viewMode === 'list') {
      loadReturns()
    }
  }, [isOpen, empresaId, viewMode])

  const loadReturns = async () => {
    if (!empresaId) return
    setLoading(true)
    try {
      const result = await listReturns(empresaId)
      setReturns(result.data as ReturnRow[])
    } catch (error) {
      console.error('Error loading returns:', error)
    } finally {
      setLoading(false)
    }
  }

  // Search sales
  const handleSearchSales = async () => {
    if (!empresaId || !saleSearch.trim()) return
    setSearchingSales(true)
    try {
      const results = await searchPdvSale(empresaId, saleSearch.trim())
      setSaleResults(results as PdvSale[])
    } catch (error) {
      console.error('Error searching sales:', error)
      setSaleResults([])
    } finally {
      setSearchingSales(false)
    }
  }

  // Select sale and populate items
  const handleSelectSale = (sale: PdvSale) => {
    setSelectedSale(sale)
    reset({
      sale_id: sale.id,
      sale_type: 'pdv',
      sale_number: sale.numero,
      customer_name: sale.cliente_nome,
      items: [],
    })
    if (sale.itens && sale.itens.length > 0) {
      const items = sale.itens.map((item) => ({
        sale_item_id: item.id,
        produto_id: item.produto_id || '',
        descricao: item.descricao,
        qty_sold: item.quantidade,
        qty_returned: 0,
        unit_price: item.preco_unitario,
        restock_flag: false,
      }))
      items.forEach((item) => append(item))
    }
    setCreateStep(2)
  }

  // View return details
  const handleViewDetails = async (ret: ReturnRow) => {
    setSelectedReturn(ret)
    setLoading(true)
    try {
      const details = await getReturnById(ret.id)
      setReturnDetails(details)
      setViewMode('details')
    } catch (error) {
      console.error('Error loading return details:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create return
  const onSubmit = async (data: ReturnCreateInput) => {
    if (!empresaId || !selectedSale) return

    try {
      const result = await createReturn(empresaId, {
        ...data,
        customer_id: selectedSale.cliente_nome ? undefined : undefined,
      })

      if (result.success) {
        reset()
        setSelectedSale(null)
        setSaleSearch('')
        setSaleResults([])
        setCreateStep(1)
        setViewMode('list')
        await loadReturns()
      } else {
        alert(result.error || 'Erro ao criar devolução')
      }
    } catch (error) {
      console.error('Error creating return:', error)
      alert('Erro ao criar devolução')
    }
  }

  // Actions
  const handleApprove = async () => {
    if (!confirmAction) return
    try {
      const result = await approveReturn(confirmAction.id)
      if (result.success) {
        await loadReturns()
        setConfirmAction(null)
        if (viewMode === 'details') {
          handleViewDetails(selectedReturn!)
        }
      } else {
        alert(result.error || 'Erro ao aprovar devolução')
      }
    } catch (error) {
      console.error('Error approving return:', error)
      alert('Erro ao aprovar devolução')
    }
  }

  const handleComplete = async () => {
    if (!confirmAction) return
    try {
      const result = await completeReturn(confirmAction.id)
      if (result.success) {
        await loadReturns()
        setConfirmAction(null)
        if (viewMode === 'details') {
          handleViewDetails(selectedReturn!)
        }
      } else {
        alert(result.error || 'Erro ao concluir devolução')
      }
    } catch (error) {
      console.error('Error completing return:', error)
      alert('Erro ao concluir devolução')
    }
  }

  const handleCancel = async () => {
    if (!confirmAction) return
    try {
      const result = await cancelReturn(confirmAction.id)
      if (result.success) {
        await loadReturns()
        setConfirmAction(null)
        if (viewMode === 'details') {
          handleViewDetails(selectedReturn!)
        }
      } else {
        alert(result.error || 'Erro ao cancelar devolução')
      }
    } catch (error) {
      console.error('Error cancelling return:', error)
      alert('Erro ao cancelar devolução')
    }
  }

  // KPIs
  const kpis = {
    total: returns.length,
    pending: returns.filter((r) => r.status === 'pending').length,
    totalRefunded: returns
      .filter((r) => r.status === 'completed')
      .reduce((acc, r) => acc + (r.total_refund || 0), 0),
    storeCredits: returns.filter((r) => r.return_type === 'store_credit' && r.status === 'approved').length,
  }

  if (!isOpen) return null

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="returns-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            <motion.div
              key="returns-modal"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-6xl max-h-[90vh] p-4"
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <RotateCcw className="w-6 h-6 text-purple-400" />
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        Devoluções e Trocas
                      </h2>
                      <p className="text-sm text-slate-400">
                        Gerencie devoluções, trocas e créditos de loja
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {viewMode === 'list' && (
                    <>
                      {/* KPI Bar */}
                      <div className="px-6 py-4 border-b border-white/10 grid grid-cols-4 gap-4">
                        <div className="bg-[#252d3d]/50 rounded-lg p-3 border border-white/5">
                          <div className="text-xs text-slate-400 mb-1">Total de Devoluções</div>
                          <div className="text-xl font-semibold text-white">{kpis.total}</div>
                        </div>
                        <div className="bg-[#252d3d]/50 rounded-lg p-3 border border-white/5">
                          <div className="text-xs text-slate-400 mb-1">Pendentes</div>
                          <div className="text-xl font-semibold text-amber-400">{kpis.pending}</div>
                        </div>
                        <div className="bg-[#252d3d]/50 rounded-lg p-3 border border-white/5">
                          <div className="text-xs text-slate-400 mb-1">Total Estornado</div>
                          <div className="text-xl font-semibold text-emerald-400">
                            {formatCurrency(kpis.totalRefunded)}
                          </div>
                        </div>
                        <div className="bg-[#252d3d]/50 rounded-lg p-3 border border-white/5">
                          <div className="text-xs text-slate-400 mb-1">Créditos Ativos</div>
                          <div className="text-xl font-semibold text-blue-400">{kpis.storeCredits}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="px-6 py-3 border-b border-white/10 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar por número da venda ou cliente..."
                            className="bg-[#1a2235] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                          />
                        </div>
                        <button
                          onClick={() => {
                            reset()
                            setSelectedSale(null)
                            setSaleSearch('')
                            setSaleResults([])
                            setCreateStep(1)
                            setViewMode('create')
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Nova Devolução
                        </button>
                      </div>

                      {/* Table */}
                      <div className="flex-1 overflow-y-auto">
                        {loading ? (
                          <div className="flex justify-center items-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                          </div>
                        ) : returns.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <RotateCcw className="w-12 h-12 text-slate-600 mb-4" />
                            <p className="text-slate-400">Nenhuma devolução encontrada</p>
                          </div>
                        ) : (
                          <div className="px-6 py-4">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-white/10">
                                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">#</th>
                                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Venda</th>
                                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Tipo</th>
                                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Status</th>
                                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">Total</th>
                                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Data</th>
                                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {returns.map((ret, idx) => (
                                  <tr
                                    key={ret.id}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                  >
                                    <td className="py-3 px-4 text-sm text-slate-300">{idx + 1}</td>
                                    <td className="py-3 px-4 text-sm text-white font-medium">
                                      {ret.sale_number || '—'}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={cn(
                                          'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                                          TYPE_BADGES[ret.return_type]
                                        )}
                                      >
                                        {TYPE_LABELS[ret.return_type]}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={cn(
                                          'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                                          STATUS_BADGES[ret.status]
                                        )}
                                      >
                                        {STATUS_LABELS[ret.status]}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-white text-right">
                                      {formatCurrency(ret.total_refund || 0)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-400">
                                      {new Date(ret.created_at).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => handleViewDetails(ret)}
                                          className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                          title="Ver detalhes"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        {ret.status === 'pending' && (
                                          <>
                                            <button
                                              onClick={() =>
                                                setConfirmAction({ type: 'approve', id: ret.id })
                                              }
                                              className="p-1.5 hover:bg-blue-500/20 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                              title="Aprovar"
                                            >
                                              <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() =>
                                                setConfirmAction({ type: 'cancel', id: ret.id })
                                              }
                                              className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                              title="Cancelar"
                                            >
                                              <Ban className="w-4 h-4" />
                                            </button>
                                          </>
                                        )}
                                        {ret.status === 'approved' && (
                                          <button
                                            onClick={() =>
                                              setConfirmAction({ type: 'complete', id: ret.id })
                                            }
                                            className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                                            title="Concluir"
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {viewMode === 'create' && (
                    <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
                      <div className="px-6 py-4 space-y-6">
                        {/* Step 1: Search Sale */}
                        {createStep === 1 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <ArrowLeft
                                onClick={() => setViewMode('list')}
                                className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer"
                              />
                              <h3 className="text-lg font-semibold text-white">Buscar Venda Original</h3>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                  type="text"
                                  value={saleSearch}
                                  onChange={(e) => setSaleSearch(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      handleSearchSales()
                                    }
                                  }}
                                  placeholder="Digite o número da venda..."
                                  className="w-full bg-[#1a2235] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleSearchSales}
                                disabled={searchingSales || !saleSearch.trim()}
                                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                {searchingSales ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Buscar'
                                )}
                              </button>
                            </div>
                            {saleResults.length > 0 && (
                              <div className="space-y-2 mt-4">
                                {saleResults.map((sale) => (
                                  <div
                                    key={sale.id}
                                    onClick={() => handleSelectSale(sale)}
                                    className="bg-[#252d3d]/50 border border-white/10 rounded-lg p-4 cursor-pointer hover:border-purple-500/50 transition-colors"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <ShoppingCart className="w-4 h-4 text-purple-400" />
                                          <span className="font-medium text-white">
                                            Venda #{sale.numero || sale.id.slice(0, 8)}
                                          </span>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                          {new Date(sale.data_venda).toLocaleDateString('pt-BR')} •{' '}
                                          {formatCurrency(sale.total)} • {sale.itens?.length || 0} itens
                                        </p>
                                        {sale.cliente_nome && (
                                          <p className="text-xs text-slate-500 mt-1">
                                            Cliente: {sale.cliente_nome}
                                          </p>
                                        )}
                                      </div>
                                      <ArrowRight className="w-5 h-5 text-slate-400" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {saleSearch && saleResults.length === 0 && !searchingSales && (
                              <p className="text-sm text-slate-500 text-center py-4">
                                Nenhuma venda encontrada
                              </p>
                            )}
                          </div>
                        )}

                        {/* Step 2: Select Items */}
                        {createStep === 2 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <ArrowLeft
                                onClick={() => {
                                  setCreateStep(1)
                                  setSelectedSale(null)
                                  reset({ items: [] })
                                }}
                                className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer"
                              />
                              <h3 className="text-lg font-semibold text-white">Selecionar Itens</h3>
                            </div>
                            {selectedSale && (
                              <div className="bg-[#252d3d]/50 border border-white/10 rounded-lg p-4 mb-4">
                                <p className="text-sm text-slate-400 mb-1">Venda Selecionada</p>
                                <p className="text-white font-medium">
                                  #{selectedSale.numero || selectedSale.id.slice(0, 8)} •{' '}
                                  {formatCurrency(selectedSale.total)}
                                </p>
                              </div>
                            )}
                            {fields.length === 0 ? (
                              <p className="text-sm text-slate-500 text-center py-4">
                                Nenhum item disponível
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {fields.map((field, idx) => {
                                  const item = watchedItems?.[idx]
                                  const maxQty = item?.qty_sold || 0
                                  return (
                                    <div
                                      key={field.id}
                                      className="bg-[#252d3d]/50 border border-white/10 rounded-lg p-4"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <p className="text-white font-medium mb-1">
                                            {item?.descricao || 'Item'}
                                          </p>
                                          <p className="text-xs text-slate-400">
                                            Vendido: {maxQty} •{' '}
                                            {formatCurrency(item?.unit_price || 0)} cada
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div>
                                            <label className="text-xs text-slate-400 mb-1 block">
                                              Qtd. Devolvida
                                            </label>
                                            <input
                                              type="number"
                                              min={0}
                                              max={maxQty}
                                              {...register(`items.${idx}.qty_returned`, {
                                                valueAsNumber: true,
                                              })}
                                              className="w-20 bg-[#1a2235] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-400 mb-1 block">
                                              Subtotal
                                            </label>
                                            <p className="text-sm text-white font-medium">
                                              {formatCurrency(
                                                (item?.qty_returned || 0) * (item?.unit_price || 0)
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            {errors.items && (
                              <p className="text-sm text-red-400">{errors.items.message}</p>
                            )}
                            <div className="flex justify-between items-center pt-4 border-t border-white/10">
                              <p className="text-sm text-slate-400">Total a Estornar</p>
                              <p className="text-xl font-semibold text-emerald-400">
                                {formatCurrency(refundTotal)}
                              </p>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCreateStep(1)
                                  setSelectedSale(null)
                                  reset({ items: [] })
                                }}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                              >
                                Voltar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const hasItems = watchedItems?.some(
                                    (item) => (item.qty_returned || 0) > 0
                                  )
                                  if (!hasItems) {
                                    alert('Selecione pelo menos um item para devolver')
                                    return
                                  }
                                  setCreateStep(3)
                                }}
                                disabled={refundTotal === 0}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                Continuar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Step 3: Type and Reason */}
                        {createStep === 3 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <ArrowLeft
                                onClick={() => setCreateStep(2)}
                                className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer"
                              />
                              <h3 className="text-lg font-semibold text-white">Tipo e Motivo</h3>
                            </div>
                            <div className="bg-[#252d3d]/50 border border-white/10 rounded-lg p-4 mb-4">
                              <p className="text-sm text-slate-400 mb-1">Total a Estornar</p>
                              <p className="text-xl font-semibold text-emerald-400">
                                {formatCurrency(refundTotal)}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Tipo de Devolução *
                              </label>
                              <select
                                {...register('return_type')}
                                className="w-full bg-[#1a2235] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                              >
                                <option value="">Selecione...</option>
                                <option value="refund">Estorno</option>
                                <option value="exchange">Troca</option>
                                <option value="store_credit">Crédito de Loja</option>
                              </select>
                              {errors.return_type && (
                                <p className="text-sm text-red-400 mt-1">
                                  {errors.return_type.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Motivo *
                              </label>
                              <textarea
                                {...register('reason')}
                                rows={4}
                                placeholder="Descreva o motivo da devolução..."
                                className="w-full bg-[#1a2235] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all resize-none"
                              />
                              {errors.reason && (
                                <p className="text-sm text-red-400 mt-1">{errors.reason.message}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Observações (opcional)
                              </label>
                              <textarea
                                {...register('notes')}
                                rows={3}
                                placeholder="Observações adicionais..."
                                className="w-full bg-[#1a2235] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all resize-none"
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                              <button
                                type="button"
                                onClick={() => setCreateStep(2)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                              >
                                Voltar
                              </button>
                              <button
                                type="button"
                                onClick={() => setCreateStep(4)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                Revisar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Step 4: Review */}
                        {createStep === 4 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <ArrowLeft
                                onClick={() => setCreateStep(3)}
                                className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer"
                              />
                              <h3 className="text-lg font-semibold text-white">Revisar e Confirmar</h3>
                            </div>
                            <div className="bg-[#252d3d]/50 border border-white/10 rounded-lg p-4 space-y-3">
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Venda</p>
                                <p className="text-white font-medium">
                                  #{selectedSale?.numero || selectedSale?.id.slice(0, 8)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Tipo</p>
                                <p className="text-white">
                                  {TYPE_LABELS[watch('return_type') as ReturnType] || '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Itens</p>
                                <div className="space-y-1">
                                  {watchedItems
                                    ?.filter((item) => (item.qty_returned || 0) > 0)
                                    .map((item, idx) => (
                                      <p key={idx} className="text-sm text-white">
                                        {item.descricao} • Qtd: {item.qty_returned} •{' '}
                                        {formatCurrency((item.qty_returned || 0) * (item.unit_price || 0))}
                                      </p>
                                    ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Total</p>
                                <p className="text-xl font-semibold text-emerald-400">
                                  {formatCurrency(refundTotal)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Motivo</p>
                                <p className="text-sm text-white">{watch('reason') || '—'}</p>
                              </div>
                              {watch('notes') && (
                                <div>
                                  <p className="text-xs text-slate-400 mb-1">Observações</p>
                                  <p className="text-sm text-white">{watch('notes')}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                              <button
                                type="button"
                                onClick={() => setCreateStep(3)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                              >
                                Voltar
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Criando...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Confirmar Devolução
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </form>
                  )}

                  {viewMode === 'details' && returnDetails && (
                    <div className="flex-1 overflow-y-auto">
                      <div className="px-6 py-4 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <ArrowLeft
                            onClick={() => {
                              setViewMode('list')
                              setSelectedReturn(null)
                              setReturnDetails(null)
                            }}
                            className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer"
                          />
                          <h3 className="text-lg font-semibold text-white">Detalhes da Devolução</h3>
                        </div>
                        <div className="bg-[#252d3d]/50 border border-white/10 rounded-lg p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Número da Venda</p>
                              <p className="text-white font-medium">
                                {returnDetails.sale_number || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Tipo</p>
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                                  TYPE_BADGES[returnDetails.return_type]
                                )}
                              >
                                {TYPE_LABELS[returnDetails.return_type]}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Status</p>
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                                  STATUS_BADGES[returnDetails.status]
                                )}
                              >
                                {STATUS_LABELS[returnDetails.status]}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Total</p>
                              <p className="text-white font-medium">
                                {formatCurrency(returnDetails.total_refund || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Data de Criação</p>
                              <p className="text-white">
                                {new Date(returnDetails.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            {returnDetails.customer_name && (
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Cliente</p>
                                <p className="text-white">{returnDetails.customer_name}</p>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Motivo</p>
                            <p className="text-sm text-white">{returnDetails.reason || '—'}</p>
                          </div>
                          {returnDetails.notes && (
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Observações</p>
                              <p className="text-sm text-white">{returnDetails.notes}</p>
                            </div>
                          )}
                          {returnDetails.items && returnDetails.items.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-400 mb-2">Itens Devolvidos</p>
                              <div className="space-y-2">
                                {returnDetails.items.map((item: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="bg-[#111827]/50 border border-white/10 rounded-lg p-3"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <p className="text-sm text-white font-medium">
                                          {item.descricao || 'Item'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                          Vendido: {item.qty_sold} • Devolvido: {item.qty_returned}
                                        </p>
                                      </div>
                                      <p className="text-sm text-white font-medium">
                                        {formatCurrency(item.refund_amount || 0)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {selectedReturn && selectedReturn.status === 'pending' && (
                          <div className="flex gap-2 pt-4 border-t border-white/10">
                            <button
                              onClick={() =>
                                setConfirmAction({ type: 'approve', id: selectedReturn.id })
                              }
                              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Aprovar
                            </button>
                            <button
                              onClick={() =>
                                setConfirmAction({ type: 'cancel', id: selectedReturn.id })
                              }
                              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <Ban className="w-4 h-4" />
                              Cancelar
                            </button>
                          </div>
                        )}
                        {selectedReturn && selectedReturn.status === 'approved' && (
                          <div className="pt-4 border-t border-white/10">
                            <button
                              onClick={() =>
                                setConfirmAction({ type: 'complete', id: selectedReturn.id })
                              }
                              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Concluir Devolução
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm Dialog */}
      {confirmAction && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Confirmar Ação</h3>
              <p className="text-sm text-slate-400 mb-6">
                {confirmAction.type === 'approve' &&
                  'Tem certeza que deseja aprovar esta devolução? Um crédito de loja será criado se aplicável.'}
                {confirmAction.type === 'complete' &&
                  'Tem certeza que deseja concluir esta devolução? Esta ação não pode ser desfeita.'}
                {confirmAction.type === 'cancel' &&
                  'Tem certeza que deseja cancelar esta devolução? Esta ação não pode ser desfeita.'}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (confirmAction.type === 'approve') handleApprove()
                    else if (confirmAction.type === 'complete') handleComplete()
                    else if (confirmAction.type === 'cancel') handleCancel()
                  }}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    confirmAction.type === 'approve' && 'bg-blue-600 hover:bg-blue-700 text-white',
                    confirmAction.type === 'complete' && 'bg-emerald-600 hover:bg-emerald-700 text-white',
                    confirmAction.type === 'cancel' && 'bg-red-600 hover:bg-red-700 text-white'
                  )}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </Portal>
  )
}
