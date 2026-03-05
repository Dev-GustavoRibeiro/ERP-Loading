'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Search, Filter, RefreshCw, ArrowLeftRight, Wrench, Eye, ArrowLeft } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import toast from 'react-hot-toast';
import {
  DataTable,
  DataTableColumn,
  KPICards,
  FilterSheet,
  FilterField,
  FilterSelect,
  DetailField,
} from '../shared';
import { fmtQty } from '../shared';
import { listBalances, getStockSummary, listWarehouses, listLocations } from '@/app/actions/inventario';

// =====================================================
// Types
// =====================================================

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BalanceRow {
  id: string;
  item_id: string;
  warehouse_id: string;
  location_id: string;
  lot_id?: string;
  on_hand: number;
  reserved: number;
  item?: {
    name?: string;
    sku?: string;
    category?: string;
    uom?: string;
    min_qty?: number;
    tracking_type?: string;
  };
  warehouse?: { name?: string; code?: string };
  location?: { name?: string; code?: string };
  lot?: { lot_number?: string; expiration_date?: string };
}

interface StockSummary {
  totalItems: number;
  totalOnHand: number;
  totalReserved: number;
  belowMin: number;
}

interface WarehouseOption {
  id: string;
  name?: string;
  code?: string;
}

interface LocationOption {
  id: string;
  name?: string;
  code?: string;
  warehouse_id?: string;
}

// =====================================================
// Component
// =====================================================

export const StockModal: React.FC<StockModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();
  const [summary, setSummary] = useState<StockSummary>({
    totalItems: 0,
    totalOnHand: 0,
    totalReserved: 0,
    belowMin: 0,
  });
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BalanceRow | null>(null);

  // Filters
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTrackingType, setFilterTrackingType] = useState('');
  const [filterBelowMin, setFilterBelowMin] = useState('');

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const hasActiveFilters =
    !!filterWarehouse ||
    !!filterLocation ||
    !!filterCategory ||
    !!filterTrackingType ||
    !!filterBelowMin;

  const hasClientFilters =
    !!filterCategory || !!filterTrackingType || !!filterBelowMin || !!search.trim();

  const loadSummary = useCallback(async () => {
    if (!empresaId) return;
    try {
      const data = await getStockSummary(empresaId);
      setSummary(data as StockSummary);
    } catch (error) {
      toast.error('Erro ao carregar resumo');
      console.error(error);
    }
  }, [empresaId]);

  const loadBalances = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const hasClientFilters =
        !!filterCategory || !!filterTrackingType || !!filterBelowMin || !!search.trim();
      const effectivePageSize = hasClientFilters ? 500 : pageSize;
      const effectivePage = hasClientFilters ? 1 : page;
      const params: Record<string, unknown> = {
        page: effectivePage,
        pageSize: effectivePageSize,
        warehouse_id: filterWarehouse || undefined,
        location_id: filterLocation || undefined,
      };
      const result = await listBalances(empresaId, params);
      let data = (result.data || []) as BalanceRow[];

      // Client-side filters (backend may not support these)
      if (filterCategory) {
        data = data.filter(
          (r) =>
            r.item?.category &&
            String(r.item.category).toLowerCase().includes(filterCategory.toLowerCase())
        );
      }
      if (filterTrackingType) {
        data = data.filter((r) => r.item?.tracking_type === filterTrackingType);
      }
      if (filterBelowMin === 'yes') {
        data = data.filter(
          (r) => r.item?.min_qty != null && (r.on_hand || 0) < r.item.min_qty
        );
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        data = data.filter(
          (r) =>
            (r.item?.name?.toLowerCase().includes(q) ?? false) ||
            (r.item?.sku?.toLowerCase().includes(q) ?? false)
        );
      }

      setBalances(data);
      // When client-side filters are active, total = filtered count (no server pagination)
      setTotal(hasClientFilters ? data.length : result.total);
    } catch (error) {
      toast.error('Erro ao carregar saldos');
      console.error(error);
      setBalances([]);
      setTotal(0);
    }
    setLoading(false);
  }, [empresaId, page, pageSize, filterWarehouse, filterLocation, filterCategory, filterTrackingType, filterBelowMin, search, hasClientFilters]);

  const loadWarehouses = useCallback(async () => {
    if (!empresaId) return;
    try {
      const data = await listWarehouses(empresaId);
      setWarehouses((data || []) as WarehouseOption[]);
    } catch {
      setWarehouses([]);
    }
  }, [empresaId]);

  const loadLocations = useCallback(async () => {
    if (!empresaId) return;
    try {
      const data = await listLocations(empresaId, filterWarehouse || undefined);
      setLocations((data || []) as LocationOption[]);
    } catch {
      setLocations([]);
    }
  }, [empresaId, filterWarehouse]);

  useEffect(() => {
    if (isOpen && empresaId) {
      loadSummary();
      loadWarehouses();
    }
  }, [isOpen, empresaId, loadSummary, loadWarehouses]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    if (isOpen && empresaId) {
      loadBalances();
    }
  }, [isOpen, empresaId, loadBalances]);

  const handleRefresh = () => {
    loadSummary();
    loadBalances();
    toast.success('Dados atualizados');
  };

  const handleApplyFilters = () => {
    setPage(1);
    loadBalances();
  };

  const handleResetFilters = () => {
    setFilterWarehouse('');
    setFilterLocation('');
    setFilterCategory('');
    setFilterTrackingType('');
    setFilterBelowMin('');
    setPage(1);
  };

  const handleAjustarEstoque = () => {
    toast('Ajustar Estoque — em breve', { icon: '🔧' });
  };

  const handleTransferir = () => {
    toast('Transferir — em breve', { icon: '📦' });
  };

  const handleBackFromDetail = () => {
    setSelectedRow(null);
  };

  if (!isOpen) return null;

  const columns: DataTableColumn<BalanceRow>[] = [
    {
      key: 'item',
      label: 'Item',
      render: (row) => (
        <div>
          <p className="font-medium text-white">{row.item?.name || '—'}</p>
          <p className="text-xs text-slate-400">{row.item?.sku || ''}</p>
        </div>
      ),
    },
    {
      key: 'warehouse',
      label: 'Depósito',
      render: (row) => (
        <span className="text-sm text-slate-300">{row.warehouse?.name || '—'}</span>
      ),
    },
    {
      key: 'location',
      label: 'Localização',
      render: (row) => (
        <span className="text-sm text-slate-300">
          {row.location?.name || row.location?.code || '—'}
        </span>
      ),
    },
    {
      key: 'on_hand',
      label: 'On-hand',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-white">
          {fmtQty(row.on_hand || 0, row.item?.uom || 'un')}
        </span>
      ),
    },
    {
      key: 'reserved',
      label: 'Reservado',
      align: 'right',
      render: (row) => {
        const val = row.reserved || 0;
        return (
          <span className={cn('text-sm', val > 0 ? 'text-amber-400' : 'text-slate-500')}>
            {fmtQty(val, row.item?.uom || 'un')}
          </span>
        );
      },
    },
    {
      key: 'available',
      label: 'Disponível',
      align: 'right',
      render: (row) => {
        const available = (row.on_hand || 0) - (row.reserved || 0);
        return (
          <span
            className={cn(
              'text-sm font-medium',
              available > 0 ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {fmtQty(available, row.item?.uom || 'un')}
          </span>
        );
      },
    },
    {
      key: 'lot',
      label: 'Lote',
      render: (row) => {
        if (!row.lot?.lot_number) return <span className="text-slate-500">—</span>;
        const exp = row.lot.expiration_date;
        return (
          <div className="text-xs">
            <p className="text-slate-300">{row.lot.lot_number}</p>
            {exp && (
              <p className="text-slate-500">
                Val: {new Date(exp + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        );
      },
    },
  ];

  const kpiItems = [
    { label: 'Total Itens', value: String(summary.totalItems), color: 'slate' as const },
    {
      label: 'Total On-hand',
      value: summary.totalOnHand.toLocaleString('pt-BR', { maximumFractionDigits: 2 }),
      color: 'blue' as const,
    },
    {
      label: 'Reservado',
      value: summary.totalReserved.toLocaleString('pt-BR', { maximumFractionDigits: 2 }),
      color: 'amber' as const,
    },
    {
      label: 'Abaixo Mínimo',
      value: String(summary.belowMin),
      color: summary.belowMin > 0 ? ('red' as const) : ('emerald' as const),
    },
  ];

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          key="stock-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
        />
        <motion.div
          key="stock-modal"
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
                {selectedRow ? (
                  <button
                    onClick={handleBackFromDetail}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                  </button>
                ) : null}
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Package className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedRow ? 'Detalhe do Saldo' : 'Estoque On-hand'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedRow
                      ? `${selectedRow.item?.name || ''} — ${selectedRow.warehouse?.name || ''}`
                      : 'Saldos por item, depósito e localização'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
              {selectedRow ? (
                /* Detail subview */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-[#111827]/50 border border-white/10 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-slate-300">Item</h3>
                      <DetailField label="Nome" value={selectedRow.item?.name} />
                      <DetailField label="SKU" value={selectedRow.item?.sku} />
                      <DetailField label="Categoria" value={selectedRow.item?.category} />
                      <DetailField label="UOM" value={selectedRow.item?.uom || 'un'} />
                    </div>
                    <div className="bg-[#111827]/50 border border-white/10 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-slate-300">Localização</h3>
                      <DetailField label="Depósito" value={selectedRow.warehouse?.name} />
                      <DetailField
                        label="Local"
                        value={
                          selectedRow.location?.name
                            ? `${selectedRow.location.name} (${selectedRow.location.code || ''})`
                            : selectedRow.location?.code
                        }
                      />
                      {selectedRow.lot?.lot_number && (
                        <DetailField label="Lote" value={selectedRow.lot.lot_number} />
                      )}
                    </div>
                    <div className="bg-[#111827]/50 border border-white/10 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-slate-300">Quantidades</h3>
                      <DetailField
                        label="On-hand"
                        value={fmtQty(selectedRow.on_hand || 0, selectedRow.item?.uom || 'un')}
                      />
                      <DetailField
                        label="Reservado"
                        value={fmtQty(selectedRow.reserved || 0, selectedRow.item?.uom || 'un')}
                      />
                      <DetailField
                        label="Disponível"
                        value={fmtQty(
                          (selectedRow.on_hand || 0) - (selectedRow.reserved || 0),
                          selectedRow.item?.uom || 'un'
                        )}
                      />
                    </div>
                  </div>

                  {/* Action buttons bar */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAjustarEstoque}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors"
                    >
                      <Wrench className="w-4 h-4" />
                      Ajustar Estoque
                    </button>
                    <button
                      onClick={handleTransferir}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      Transferir
                    </button>
                  </div>

                  {/* Histórico placeholder */}
                  <div className="bg-[#111827]/50 border border-white/10 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Histórico</h3>
                    <p className="text-sm text-slate-500">Histórico de movimentações em breve.</p>
                  </div>
                </div>
              ) : (
                /* List view */
                <div className="space-y-4">
                  {/* KPI cards */}
                  <KPICards items={kpiItems} />

                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Buscar por item ou SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                        className="w-full pl-9 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <button
                      onClick={() => setFilterOpen(true)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors',
                        hasActiveFilters
                          ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                          : 'bg-[#252d3d] border border-white/10 text-slate-300 hover:bg-[#2d3548]'
                      )}
                    >
                      <Filter className="w-4 h-4" />
                      Filtros
                      {hasActiveFilters && (
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      )}
                    </button>
                    <button
                      onClick={handleRefresh}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#252d3d] border border-white/10 text-slate-300 hover:bg-[#2d3548] rounded-xl transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                      Atualizar
                    </button>
                  </div>

                  {/* DataTable */}
                  <DataTable<BalanceRow>
                    columns={columns}
                    data={
                      hasClientFilters
                        ? balances.slice((page - 1) * pageSize, page * pageSize)
                        : balances
                    }
                    loading={loading}
                    emptyMessage="Nenhum saldo encontrado"
                    page={page}
                    pageSize={pageSize}
                    total={hasClientFilters ? balances.length : total}
                    onPageChange={setPage}
                    onRowClick={(row) => setSelectedRow(row)}
                    getRowId={(row) => row.id}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* FilterSheet */}
      <FilterSheet
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        title="Filtros de Estoque"
        hasActiveFilters={hasActiveFilters}
      >
        <FilterField label="Depósito">
          <FilterSelect
            value={filterWarehouse}
            onChange={setFilterWarehouse}
            options={[
              { value: '', label: 'Todos' },
              ...warehouses.map((w) => ({
                value: w.id,
                label: w.name || w.code || w.id,
              })),
            ]}
          />
        </FilterField>
        <FilterField label="Localização">
          <FilterSelect
            value={filterLocation}
            onChange={setFilterLocation}
            options={[
              { value: '', label: 'Todas' },
              ...locations.map((l) => ({
                value: l.id,
                label: `${l.name || l.code || l.id}`,
              })),
            ]}
          />
        </FilterField>
        <FilterField label="Categoria">
          <input
            type="text"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            placeholder="Ex: eletrônicos"
            className="w-full px-3.5 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </FilterField>
        <FilterField label="Tipo de rastreio">
          <FilterSelect
            value={filterTrackingType}
            onChange={setFilterTrackingType}
            options={[
              { value: '', label: 'Todos' },
              { value: 'none', label: 'Nenhum' },
              { value: 'lot', label: 'Lote' },
              { value: 'serial', label: 'Série' },
            ]}
          />
        </FilterField>
        <FilterField label="Abaixo do mínimo">
          <FilterSelect
            value={filterBelowMin}
            onChange={setFilterBelowMin}
            options={[
              { value: '', label: 'Todos' },
              { value: 'yes', label: 'Sim' },
              { value: 'no', label: 'Não' },
            ]}
          />
        </FilterField>
      </FilterSheet>
    </Portal>
  );
};
