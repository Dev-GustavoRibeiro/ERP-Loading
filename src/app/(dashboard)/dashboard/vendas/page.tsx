'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  FileText,
  X,
  Loader2,
  AlertCircle,
  Monitor,
  Search,
  Trophy,
  Ticket,
  RotateCcw,
  Percent,
  Settings2,
  Filter,
  Eye,
  Calendar,
  User,
  Hash,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Check,
  XCircle,
  ArrowRight,
  Send,
  Clock,
  Ban,
} from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { PageTemplate, StatCardData, ModuleCardData, ActionButtonData } from '@/shared/components/templates';
import { cn } from '@/shared/lib/utils';
import { vendasService } from '@/modules/vendas/services/vendasService';
import type { PedidoVenda } from '@/modules/vendas/domain';
import { PDVModal } from '@/modules/vendas/components/PDVModal';
import {
  listAllSales, getPdvSaleDetail, getPedidoDetail,
  listOrcamentos, getOrcamentoDetail, updateOrcamentoStatus, convertOrcamentoToPedido,
} from '@/app/actions/vendas-features';
import type { SaleRecord, OrcamentoRecord } from '@/app/actions/vendas-features';

// New Sales Feature Modals
import { CouponsModal } from '@/modules/vendas-features/components/coupons/CouponsModal';
import { ReturnsModal } from '@/modules/vendas-features/components/returns/ReturnsModal';
import { CommissionsModal } from '@/modules/vendas-features/components/commissions/CommissionsModal';
import { GamificationModal } from '@/modules/vendas-features/components/gamification/GamificationModal';
import { GamificationConfigModal } from '@/modules/vendas-features/components/gamification/GamificationConfigModal';

// =====================================================
// Hooks & Utils
// =====================================================

import { useEmpresaId } from '@/shared/hooks/useEmpresaId';

// =====================================================
// Reusable Modal Component
// =====================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div key="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" />
            <motion.div key="modal-content" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full p-4", sizeClasses[size])}>
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6 max-h-[75vh] overflow-y-auto scrollbar-none">{children}</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

// =====================================================
// Shared UI Components
// =====================================================

const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
    <p className="text-slate-400">{message}</p>
  </div>
);

const PlaceholderContent: React.FC<{ feature: string }> = ({ feature }) => (
  <EmptyState message={`Funcionalidade "${feature}" será conectada ao banco de dados em breve.`} />
);

// =====================================================
// Status helpers
// =====================================================

const statusConfig: Record<string, { label: string; color: string }> = {
  finalizada: { label: 'Finalizada', color: 'bg-emerald-500/15 text-emerald-400' },
  aberta: { label: 'Aberta', color: 'bg-blue-500/15 text-blue-400' },
  aberto: { label: 'Aberto', color: 'bg-blue-500/15 text-blue-400' },
  cancelada: { label: 'Cancelada', color: 'bg-red-500/15 text-red-400' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400' },
  pendente: { label: 'Pendente', color: 'bg-amber-500/15 text-amber-400' },
  aprovado: { label: 'Aprovado', color: 'bg-emerald-500/15 text-emerald-400' },
  reprovado: { label: 'Reprovado', color: 'bg-red-500/15 text-red-400' },
  convertido: { label: 'Convertido', color: 'bg-purple-500/15 text-purple-400' },
  enviado: { label: 'Enviado', color: 'bg-cyan-500/15 text-cyan-400' },
  expirado: { label: 'Expirado', color: 'bg-slate-500/15 text-slate-400' },
  separacao: { label: 'Separação', color: 'bg-purple-500/15 text-purple-400' },
  faturado: { label: 'Faturado', color: 'bg-emerald-500/15 text-emerald-400' },
  entregue: { label: 'Entregue', color: 'bg-teal-500/15 text-teal-400' },
};

const getStatusBadge = (status: string) => {
  const cfg = statusConfig[status] || { label: status, color: 'bg-slate-500/15 text-slate-400' };
  return <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', cfg.color)}>{cfg.label}</span>;
};

const tipoLabels: Record<string, { label: string; color: string; bg: string }> = {
  pdv: { label: 'PDV', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  pedido: { label: 'Pedido', color: 'text-blue-400', bg: 'bg-blue-500/15' },
};

// =====================================================
// Consultar Vendas - Full Featured Modal Content
// =====================================================

interface ConsultaVendasContentProps {
  empresaId: string | null;
}

const ConsultaVendasContent: React.FC<ConsultaVendasContentProps> = ({ empresaId }) => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'pdv' | 'pedido'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPdv, setTotalPdv] = useState(0);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState<'data' | 'total' | 'numero'>('data');
  const [sortAsc, setSortAsc] = useState(false);

  // Detail view
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detailData, setDetailData] = useState<any>(null);
  const [detailType, setDetailType] = useState<'pdv' | 'pedido' | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch sales
  useEffect(() => {
    const load = async () => {
      if (!empresaId) { setLoading(false); return; }
      setLoading(true);
      try {
        const result = await listAllSales(empresaId, {
          search: searchDebounced || undefined,
          tipo: tipoFilter,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
          pageSize,
        });
        setSales(result.data);
        setTotal(result.total);
        setTotalPdv(result.totalPdv);
        setTotalPedidos(result.totalPedidos);
      } catch (err) {
        console.error('Erro ao carregar vendas:', err);
        setSales([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [empresaId, searchDebounced, tipoFilter, statusFilter, dateFrom, dateTo, page, pageSize]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [searchDebounced, tipoFilter, statusFilter, dateFrom, dateTo]);

  // Sort client side
  const sortedSales = [...sales].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'data') cmp = new Date(a.data).getTime() - new Date(b.data).getTime();
    else if (sortField === 'total') cmp = a.total - b.total;
    else if (sortField === 'numero') cmp = a.numero.localeCompare(b.numero);
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const openDetail = async (sale: SaleRecord) => {
    setDetailLoading(true);
    setDetailType(sale.tipo);
    try {
      const data = sale.tipo === 'pdv' ? await getPdvSaleDetail(sale.id) : await getPedidoDetail(sale.id);
      setDetailData(data);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setDetailData(null); setDetailType(null); };

  const totalPages = Math.ceil(total / pageSize);

  if (!empresaId) return <EmptyState message="Selecione uma empresa" />;

  // ── Detail View ──
  if (detailType && (detailLoading || detailData)) {
    return (
      <div className="space-y-4">
        <button onClick={closeDetail} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" /> Voltar para lista
        </button>

        {detailLoading ? <LoadingState /> : !detailData ? <EmptyState message="Venda não encontrada" /> : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', tipoLabels[detailType].bg, tipoLabels[detailType].color)}>
                    {tipoLabels[detailType].label}
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    {detailType === 'pdv' ? `Venda PDV #${detailData.numero}` : `Pedido #${detailData.numero}`}
                  </h3>
                  {getStatusBadge(detailData.status)}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(detailType === 'pdv' ? detailData.data_venda : detailData.data_pedido).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  R$ {(detailData.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {detailData.desconto > 0 && (
                  <p className="text-xs text-red-400">Desc: R$ {detailData.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {detailType === 'pdv' && detailData.cliente_nome && (
                <div className="p-3 bg-[#252d3d]/60 rounded-lg">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-medium text-white mt-0.5">{detailData.cliente_nome}</p>
                  {detailData.cliente_cpf && <p className="text-xs text-slate-400">{detailData.cliente_cpf}</p>}
                </div>
              )}
              {detailType === 'pedido' && detailData.cliente && (
                <div className="p-3 bg-[#252d3d]/60 rounded-lg">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-medium text-white mt-0.5">{detailData.cliente.nome}</p>
                  {detailData.cliente.cpf_cnpj && <p className="text-xs text-slate-400">{detailData.cliente.cpf_cnpj}</p>}
                </div>
              )}
              {(detailData.vendedor?.nome) && (
                <div className="p-3 bg-[#252d3d]/60 rounded-lg">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">Vendedor</p>
                  <p className="text-sm font-medium text-white mt-0.5">{detailData.vendedor.nome}</p>
                </div>
              )}
              <div className="p-3 bg-[#252d3d]/60 rounded-lg">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">Subtotal</p>
                <p className="text-sm font-medium text-white mt-0.5">R$ {(detailData.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-3 bg-[#252d3d]/60 rounded-lg">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">Itens</p>
                <p className="text-sm font-medium text-white mt-0.5">{detailData.itens?.length || 0} produto(s)</p>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Itens da Venda</h4>
              <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0f1724]/60">
                      <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Produto</th>
                      <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Qtd</th>
                      <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Preço Unit.</th>
                      <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(detailData.itens || []).map((item: any, i: number) => {
                      const isCancelled = item.cancelado;
                      return (
                        <tr key={item.id || i} className={cn("hover:bg-white/[0.02]", isCancelled && "opacity-40 line-through")}>
                          <td className="py-2.5 px-3 text-white">{item.descricao || item.produto?.descricao || '-'}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">{item.quantidade}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">R$ {(item.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-white">R$ {(item.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments (PDV only) */}
            {detailType === 'pdv' && detailData.pagamentos && detailData.pagamentos.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-white mb-2">Pagamentos</h4>
                <div className="space-y-1.5">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {detailData.pagamentos.map((pag: any, i: number) => (
                    <div key={pag.id || i} className="flex items-center justify-between p-2.5 bg-[#252d3d]/50 rounded-lg">
                      <span className="text-sm text-slate-300 capitalize">{pag.tipo}{pag.bandeira ? ` (${pag.bandeira})` : ''}</span>
                      <span className="text-sm font-medium text-white">R$ {(pag.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Obs */}
            {(detailData.observacoes || detailData.observacao) && (
              <div className="p-3 bg-[#252d3d]/40 rounded-lg">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-slate-300">{detailData.observacoes || detailData.observacao}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-4">
      {/* Summary Counters */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-[#252d3d]/50 text-center">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Total</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-center">
          <p className="text-2xl font-bold text-emerald-400">{totalPdv}</p>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">PDV</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/15 text-center">
          <p className="text-2xl font-bold text-blue-400">{totalPedidos}</p>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Pedidos</p>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por número, cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn("flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border", showFilters ? "bg-purple-600/20 border-purple-500/40 text-purple-400" : "bg-[#252d3d] border-white/10 text-slate-300 hover:bg-[#2d3548]")}
        >
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#0f1724]/60 rounded-xl border border-white/[0.06]">
              {/* Type Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Tipo</label>
                <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value as 'all' | 'pdv' | 'pedido')} className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all">
                  <option value="all">Todos</option>
                  <option value="pdv">PDV</option>
                  <option value="pedido">Pedidos</option>
                </select>
              </div>
              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all">
                  <option value="all">Todos</option>
                  <option value="finalizada">Finalizada</option>
                  <option value="aberta">Aberta</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="faturado">Faturado</option>
                  <option value="entregue">Entregue</option>
                </select>
              </div>
              {/* Date From */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">De</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" />
              </div>
              {/* Date To */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Até</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Table */}
      {loading ? <LoadingState /> : sortedSales.length === 0 ? (
        <EmptyState message="Nenhuma venda encontrada" />
      ) : (
        <>
          <div className="border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0f1724]/60">
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Tipo</th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold cursor-pointer select-none" onClick={() => toggleSort('numero')}>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Nº {sortField === 'numero' && <ArrowUpDown className="w-3 h-3 text-purple-400" />}
                    </span>
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold cursor-pointer select-none" onClick={() => toggleSort('data')}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Data {sortField === 'data' && <ArrowUpDown className="w-3 h-3 text-purple-400" />}
                    </span>
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold hidden md:table-cell">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> Cliente</span>
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold hidden lg:table-cell">Status</th>
                  <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold cursor-pointer select-none" onClick={() => toggleSort('total')}>
                    <span className="flex items-center justify-end gap-1">
                      Total {sortField === 'total' && <ArrowUpDown className="w-3 h-3 text-purple-400" />}
                    </span>
                  </th>
                  <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sortedSales.map((sale) => {
                  const tipo = tipoLabels[sale.tipo];
                  return (
                    <tr key={`${sale.tipo}-${sale.id}`} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3">
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', tipo.bg, tipo.color)}>{tipo.label}</span>
                      </td>
                      <td className="py-2.5 px-3 text-white font-medium">#{sale.numero}</td>
                      <td className="py-2.5 px-3 text-slate-300">{new Date(sale.data).toLocaleDateString('pt-BR')}</td>
                      <td className="py-2.5 px-3 text-slate-300 hidden md:table-cell truncate max-w-[160px]">{sale.cliente_nome || <span className="text-slate-600">—</span>}</td>
                      <td className="py-2.5 px-3 hidden lg:table-cell">{getStatusBadge(sale.status)}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-white">
                        R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button onClick={() => openDetail(sale)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Ver detalhes">
                          <Eye className="w-4 h-4 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">Página {page} de {totalPages} • {total} resultado(s)</p>
              <div className="flex items-center gap-1.5">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)} className={cn("w-8 h-8 rounded-lg text-sm font-medium transition-colors", p === page ? "bg-purple-600 text-white" : "text-slate-400 hover:bg-white/10")}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// =====================================================
// Orçamentos - Full Featured Modal Content
// =====================================================

interface OrcamentosContentProps { empresaId: string | null; }

const OrcamentosContent: React.FC<OrcamentosContentProps> = ({ empresaId }) => {
  const [orcamentos, setOrcamentos] = useState<OrcamentoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(15);

  // Detail & actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch
  const loadData = useCallback(async () => {
    if (!empresaId) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await listOrcamentos(empresaId, {
        search: searchDebounced || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        pageSize,
      });
      setOrcamentos(result.data);
      setTotal(result.total);
    } catch {
      setOrcamentos([]);
      setTotal(0);
    } finally { setLoading(false); }
  }, [empresaId, searchDebounced, statusFilter, dateFrom, dateTo, page, pageSize]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setPage(1); }, [searchDebounced, statusFilter, dateFrom, dateTo]);

  const openDetail = async (orc: OrcamentoRecord) => {
    setDetailLoading(true);
    try {
      const data = await getOrcamentoDetail(orc.id);
      setDetailData(data);
    } catch { setDetailData(null); }
    finally { setDetailLoading(false); }
  };

  const closeDetail = () => setDetailData(null);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionLoading(newStatus);
    const res = await updateOrcamentoStatus(id, newStatus);
    setActionLoading(null);
    if (res.success) {
      setDetailData(null);
      loadData();
    }
  };

  const handleConvert = async (id: string) => {
    if (!empresaId) return;
    setActionLoading('converter');
    const res = await convertOrcamentoToPedido(id, empresaId);
    setActionLoading(null);
    if (res.success) {
      setDetailData(null);
      loadData();
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (!empresaId) return <EmptyState message="Selecione uma empresa" />;

  // Count by status for summary
  const statusCounts: Record<string, number> = {};
  orcamentos.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  // ── Detail View ──
  if (detailLoading || detailData) {
    return (
      <div className="space-y-4">
        <button onClick={closeDetail} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" /> Voltar para lista
        </button>

        {detailLoading ? <LoadingState /> : !detailData ? <EmptyState message="Orçamento não encontrado" /> : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-white">Orçamento #{detailData.numero}</h3>
                  {getStatusBadge(detailData.status)}
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <p className="text-sm text-slate-500">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    {new Date(detailData.data_orcamento).toLocaleDateString('pt-BR')}
                  </p>
                  {detailData.data_validade && (
                    <p className="text-sm text-slate-500">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      Válido até {new Date(detailData.data_validade).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">R$ {(detailData.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                {(detailData.desconto > 0) && (
                  <p className="text-xs text-red-400">Desc: R$ {(detailData.desconto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {detailData.cliente && (
                <div className="p-3 bg-[#252d3d]/60 rounded-lg">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-medium text-white mt-0.5">{detailData.cliente.nome}</p>
                  {detailData.cliente.cpf_cnpj && <p className="text-xs text-slate-400">{detailData.cliente.cpf_cnpj}</p>}
                </div>
              )}
              {detailData.vendedor && (
                <div className="p-3 bg-[#252d3d]/60 rounded-lg">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">Vendedor</p>
                  <p className="text-sm font-medium text-white mt-0.5">{detailData.vendedor.nome}</p>
                </div>
              )}
              <div className="p-3 bg-[#252d3d]/60 rounded-lg">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">Subtotal</p>
                <p className="text-sm font-medium text-white mt-0.5">R$ {(detailData.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              {(detailData.frete > 0) && (
                <div className="p-3 bg-[#252d3d]/60 rounded-lg">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">Frete</p>
                  <p className="text-sm font-medium text-white mt-0.5">R$ {(detailData.frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>

            {/* Items Table */}
            {detailData.itens && detailData.itens.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-white mb-2">Itens ({detailData.itens.length})</h4>
                <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#0f1724]/60">
                        <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Produto</th>
                        <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Qtd</th>
                        <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Preço Unit.</th>
                        <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Desc%</th>
                        <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {detailData.itens.map((item: any, i: number) => (
                        <tr key={item.id || i} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3">
                            <p className="text-white">{item.descricao}</p>
                            {item.produto?.codigo && <p className="text-[11px] text-slate-500">Cód: {item.produto.codigo}</p>}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">{item.quantidade}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">R$ {(item.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">{item.desconto_percentual > 0 ? `${item.desconto_percentual}%` : '—'}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-white">R$ {(item.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Observações */}
            {detailData.observacoes && (
              <div className="p-3 bg-[#252d3d]/40 rounded-lg">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-slate-300">{detailData.observacoes}</p>
              </div>
            )}
            {detailData.observacoes_internas && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                <p className="text-[11px] text-amber-400 uppercase tracking-wider mb-1">Observações Internas</p>
                <p className="text-sm text-slate-300">{detailData.observacoes_internas}</p>
              </div>
            )}

            {/* Actions */}
            {!['convertido', 'cancelado'].includes(detailData.status) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                {detailData.status === 'aberto' && (
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleStatusChange(detailData.id, 'enviado')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/20 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'enviado' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Marcar como Enviado
                  </button>
                )}
                {['aberto', 'enviado'].includes(detailData.status) && (
                  <>
                    <button
                      disabled={actionLoading !== null}
                      onClick={() => handleStatusChange(detailData.id, 'aprovado')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      {actionLoading === 'aprovado' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Aprovar
                    </button>
                    <button
                      disabled={actionLoading !== null}
                      onClick={() => handleStatusChange(detailData.id, 'reprovado')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 transition-all disabled:opacity-50"
                    >
                      {actionLoading === 'reprovado' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Reprovar
                    </button>
                  </>
                )}
                {['aberto', 'enviado', 'aprovado'].includes(detailData.status) && (
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleConvert(detailData.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/20 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'converter' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Converter em Pedido
                  </button>
                )}
                <button
                  disabled={actionLoading !== null}
                  onClick={() => handleStatusChange(detailData.id, 'cancelado')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-slate-600/20 text-slate-400 hover:bg-slate-600/30 border border-slate-500/20 transition-all disabled:opacity-50 ml-auto"
                >
                  {actionLoading === 'cancelado' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-4">
      {/* Search + Filter Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn("flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border", showFilters ? "bg-purple-600/20 border-purple-500/40 text-purple-400" : "bg-[#252d3d] border-white/10 text-slate-300 hover:bg-[#2d3548]")}
        >
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-[#0f1724]/60 rounded-xl border border-white/[0.06]">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all">
                  <option value="all">Todos</option>
                  <option value="aberto">Aberto</option>
                  <option value="enviado">Enviado</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="reprovado">Reprovado</option>
                  <option value="convertido">Convertido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">De</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Até</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Total info */}
      <p className="text-sm text-slate-400">{total} orçamento(s) encontrado(s)</p>

      {/* Table */}
      {loading ? <LoadingState /> : orcamentos.length === 0 ? (
        <EmptyState message="Nenhum orçamento encontrado" />
      ) : (
        <>
          <div className="border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0f1724]/60">
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Nº</span>
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Data</span>
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold hidden md:table-cell">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> Cliente</span>
                  </th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold hidden lg:table-cell">Vendedor</th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Status</th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold hidden lg:table-cell">Validade</th>
                  <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total</th>
                  <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {orcamentos.map((orc) => {
                  const isExpired = orc.data_validade && new Date(orc.data_validade) < new Date() && !['convertido', 'cancelado', 'reprovado'].includes(orc.status);
                  return (
                    <tr key={orc.id} className={cn("hover:bg-white/[0.02] transition-colors", isExpired && "opacity-60")}>
                      <td className="py-2.5 px-3 text-white font-medium">#{orc.numero}</td>
                      <td className="py-2.5 px-3 text-slate-300">{new Date(orc.data_orcamento).toLocaleDateString('pt-BR')}</td>
                      <td className="py-2.5 px-3 text-slate-300 hidden md:table-cell truncate max-w-[160px]">
                        {orc.cliente?.nome || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 hidden lg:table-cell truncate max-w-[120px]">
                        {orc.vendedor?.nome || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {isExpired ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400">Expirado</span>
                        ) : getStatusBadge(orc.status)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 hidden lg:table-cell">
                        {orc.data_validade ? (
                          <span className={cn(isExpired && "text-red-400")}>
                            {new Date(orc.data_validade).toLocaleDateString('pt-BR')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-white">
                        R$ {(orc.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button onClick={() => openDetail(orc)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Ver detalhes">
                          <Eye className="w-4 h-4 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">Página {page} de {totalPages} • {total} resultado(s)</p>
              <div className="flex items-center gap-1.5">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)} className={cn("w-8 h-8 rounded-lg text-sm font-medium transition-colors", p === page ? "bg-purple-600 text-white" : "text-slate-400 hover:bg-white/10")}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// =====================================================
// Resumo Vendas Content (Metas)
// =====================================================

interface ResumoVendasContentProps {
  empresaId: string | null;
}

const ResumoVendasContent: React.FC<ResumoVendasContentProps> = ({ empresaId }) => {
  const [resumo, setResumo] = useState<{ totalVendas: number; valorTotal: number; ticketMedio: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!empresaId) { setLoading(false); return; }
      try {
        const result = await vendasService.listPedidos(empresaId, { pageSize: 1000 });
        const total = result.data.reduce((acc: number, v: PedidoVenda) => acc + (v.total || 0), 0);
        setResumo({
          totalVendas: result.total,
          valorTotal: total,
          ticketMedio: result.total > 0 ? total / result.total : 0,
        });
      } catch (error) {
        console.error('Erro ao carregar resumo:', error);
        setResumo({ totalVendas: 0, valorTotal: 0, ticketMedio: 0 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [empresaId]);

  if (!empresaId) return <EmptyState message="Selecione uma empresa" />;
  if (loading) return <LoadingState />;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 bg-[#252d3d]/50 rounded-lg text-center">
        <p className="text-sm text-slate-400">Total de Vendas</p>
        <p className="text-2xl font-bold text-white">{resumo?.totalVendas || 0}</p>
      </div>
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
        <p className="text-sm text-slate-400">Valor Total</p>
        <p className="text-2xl font-bold text-emerald-400">R$ {(resumo?.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
        <p className="text-sm text-slate-400">Ticket Médio</p>
        <p className="text-2xl font-bold text-blue-400">R$ {(resumo?.ticketMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
    </div>
  );
};

// =====================================================
// Page Component
// =====================================================

type ModalType = 'vendas' | 'orcamentos' | 'pedidos' | 'pagamentos' | 'entrega' | 'metas'
  | 'coupons' | 'returns' | 'commissions' | 'gamification' | 'gamification_config' | null;

export default function VendasPage() {
  const empresaId = useEmpresaId();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [pdvOpen, setPdvOpen] = useState(false);
  const [stats, setStats] = useState<StatCardData[]>([
    { title: 'Vendas do Dia', value: '-', trend: 0 },
    { title: 'Meta do Mês', value: '-', trend: 0 },
    { title: 'Ticket Médio', value: '-', trend: 0 },
    { title: 'Orçamentos Pendentes', value: '-', trend: 0 },
  ]);

  const loadStats = useCallback(async () => {
    if (!empresaId) return;
    try {
      const result = await vendasService.listPedidos(empresaId, { pageSize: 1000 });
      const total = result.data.reduce((acc: number, v: PedidoVenda) => acc + (v.total || 0), 0);

      const hoje = new Date().toDateString();
      const vendasHoje = result.data.filter((v: PedidoVenda) => new Date(v.data_pedido).toDateString() === hoje);

      const ticketMedio = result.total > 0 ? total / result.total : 0;
      const totalHoje = vendasHoje.reduce((acc: number, v: PedidoVenda) => acc + (v.total || 0), 0);

      setStats([
        { title: 'Vendas do Dia', value: `R$ ${totalHoje.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, trend: 22 },
        { title: 'Meta do Mês', value: `${Math.min(Math.round((total / Math.max(total * 1.3, 1)) * 100), 100)}%`, trend: 9 },
        { title: 'Ticket Médio', value: `R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, trend: 18 },
        { title: 'Orçamentos Pendentes', value: String(Math.max(result.total - vendasHoje.length, 0)), trend: -12 },
      ]);
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    }
  }, [empresaId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const actionButtons: ActionButtonData[] = [
    { icon: Monitor, label: 'Abrir PDV', variant: 'primary', onClick: () => setPdvOpen(true) },
    { icon: ShoppingCart, label: 'Consultar', variant: 'secondary', onClick: () => setActiveModal('vendas') },
  ];

  const modules: ModuleCardData[] = [
    {
      icon: Monitor,
      label: 'PDV (Ponto de Venda)',
      description: 'Sistema completo de vendas com leitura de código de barras, múltiplas formas de pagamento e emissão de NFCe',
      color: 'emerald',
      onClick: () => setPdvOpen(true),
    },
    {
      icon: FileText,
      label: 'Orçamentos',
      description: 'Criação, gestão e acompanhamento de orçamentos com aprovação automática e conversão em vendas',
      color: 'blue',
      onClick: () => setActiveModal('orcamentos'),
    },
    {
      icon: Search,
      label: 'Consultar Vendas',
      description: 'Histórico completo de vendas PDV e pedidos com filtros avançados, detalhes e paginação',
      color: 'purple',
      onClick: () => setActiveModal('vendas'),
    },
    {
      icon: Ticket,
      label: 'Cupons de Desconto',
      description: 'Criação e gestão de cupons com regras de uso, validade e limites. Descontos somente via cupom.',
      color: 'amber',
      onClick: () => setActiveModal('coupons'),
    },
    {
      icon: RotateCcw,
      label: 'Devoluções & Trocas',
      description: 'Estornos, trocas e créditos de loja com rastreamento completo e integração com estoque.',
      color: 'red',
      onClick: () => setActiveModal('returns'),
    },
    {
      icon: Percent,
      label: 'Comissões',
      description: 'Regras de comissão por vendedor, apuração por período, integração com devoluções.',
      color: 'teal',
      onClick: () => setActiveModal('commissions'),
    },
    {
      icon: Trophy,
      label: 'Gamificação',
      description: 'Missões, badges, XP e ranking do time de vendas. Veja o progresso e conquistas.',
      color: 'orange',
      onClick: () => setActiveModal('gamification'),
    },
    {
      icon: Settings2,
      label: 'Config. Gamificação',
      description: 'Configure missões, badges e regras do sistema de pontos e recompensas.',
      color: 'slate',
      onClick: () => setActiveModal('gamification_config'),
    },
  ];

  const closeModal = () => setActiveModal(null);

  return (
    <>
      <PageTemplate
        title="Vendas"
        subtitle="PDV, orçamentos e gestão completa de vendas"
        icon={ShoppingCart}
        accentColor="orange"
        actionButtons={actionButtons}
        stats={stats}
        modules={{ title: 'Módulos Principais', items: modules }}
      />

      {/* PDV Fullscreen Modal */}
      <PDVModal isOpen={pdvOpen} onClose={() => setPdvOpen(false)} empresaId={empresaId} />

      {/* Consultar Vendas - Full Featured */}
      <Modal isOpen={activeModal === 'vendas'} onClose={closeModal} title="Consultar Vendas" size="full">
        <ConsultaVendasContent empresaId={empresaId} />
      </Modal>

      {/* Regular Modals */}
      <Modal isOpen={activeModal === 'orcamentos'} onClose={closeModal} title="Orçamentos" size="full">
        <OrcamentosContent empresaId={empresaId} />
      </Modal>
      <Modal isOpen={activeModal === 'pedidos'} onClose={closeModal} title="Pedidos" size="lg"><PlaceholderContent feature="Pedidos" /></Modal>
      <Modal isOpen={activeModal === 'pagamentos'} onClose={closeModal} title="Pagamentos" size="lg"><PlaceholderContent feature="Pagamentos" /></Modal>
      <Modal isOpen={activeModal === 'entrega'} onClose={closeModal} title="Entregas" size="lg"><PlaceholderContent feature="Entregas" /></Modal>
      <Modal isOpen={activeModal === 'metas'} onClose={closeModal} title="Metas de Vendas" size="lg"><ResumoVendasContent empresaId={empresaId} /></Modal>

      {/* New Sales Feature Modals */}
      <CouponsModal isOpen={activeModal === 'coupons'} onClose={closeModal} />
      <ReturnsModal isOpen={activeModal === 'returns'} onClose={closeModal} />
      <CommissionsModal isOpen={activeModal === 'commissions'} onClose={closeModal} />
      <GamificationModal isOpen={activeModal === 'gamification'} onClose={closeModal} />
      <GamificationConfigModal isOpen={activeModal === 'gamification_config'} onClose={closeModal} />
    </>
  );
}
