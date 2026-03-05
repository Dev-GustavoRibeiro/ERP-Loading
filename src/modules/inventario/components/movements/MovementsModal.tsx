'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRightLeft,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import {
  DataTable,
  DataTableColumn,
  KPICards,
  FilterSheet,
  FilterField,
  FilterSelect,
  FilterDateRange,
  DetailField,
  DetailSection,
  fmtDate,
} from '../shared';
import { fmtQty, moveTypeLabel, moveStatusLabel } from '../shared';
import {
  listStockMoves,
  getStockMove,
  listWarehouses,
} from '@/app/actions/inventario';

// =====================================================
// Types
// =====================================================

interface MovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StockMove {
  id: string;
  reference?: string;
  move_type: string;
  status: string;
  created_at: string;
  source_warehouse?: { name?: string } | null;
  dest_warehouse?: { name?: string } | null;
  source_location?: { name?: string; code?: string } | null;
  dest_location?: { name?: string; code?: string } | null;
  [key: string]: unknown;
}

interface StockMoveLine {
  id: string;
  qty: number;
  qty_done?: number;
  item?: { name?: string; sku?: string; uom?: string } | null;
  lot?: { lot_number?: string; serial_number?: string } | null;
  source_location?: { name?: string; code?: string } | null;
  dest_location?: { name?: string; code?: string } | null;
  [key: string]: unknown;
}

// =====================================================
// Badge Helpers
// =====================================================

const MOVE_TYPE_COLORS: Record<string, string> = {
  inbound: 'bg-emerald-500/20 text-emerald-400',
  outbound: 'bg-red-500/20 text-red-400',
  internal: 'bg-blue-500/20 text-blue-400',
  adjustment: 'bg-amber-500/20 text-amber-400',
  scrap: 'bg-slate-500/20 text-slate-400',
  return_in: 'bg-emerald-500/20 text-emerald-400',
  return_out: 'bg-red-500/20 text-red-400',
};

const MOVE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-400',
  ready: 'bg-blue-500/20 text-blue-400',
  done: 'bg-emerald-500/20 text-emerald-400',
  canceled: 'bg-red-500/20 text-red-400',
};

function MoveTypeBadge({ type }: { type: string }) {
  const color = MOVE_TYPE_COLORS[type] || 'bg-slate-500/20 text-slate-400';
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap', color)}>
      {moveTypeLabel(type)}
    </span>
  );
}

function MoveStatusBadge({ status }: { status: string }) {
  const color = MOVE_STATUS_COLORS[status] || 'bg-slate-500/20 text-slate-400';
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap', color)}>
      {moveStatusLabel(status)}
    </span>
  );
}

// =====================================================
// Component
// =====================================================

export const MovementsModal: React.FC<MovementsModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();

  // List state
  const [moves, setMoves] = useState<StockMove[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter state
  const [moveType, setMoveType] = useState('');
  const [status, setStatus] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // KPI counts
  const [kpiTotal, setKpiTotal] = useState(0);
  const [kpiInbound, setKpiInbound] = useState(0);
  const [kpiOutbound, setKpiOutbound] = useState(0);
  const [kpiInternal, setKpiInternal] = useState(0);

  // Warehouses for filter
  const [warehouses, setWarehouses] = useState<Record<string, unknown>[]>([]);

  // Detail subview
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null);
  const [detailMove, setDetailMove] = useState<(StockMove & { lines?: StockMoveLine[] }) | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const pageSize = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadMoves = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
        sortBy: 'created_at',
        sortOrder: 'desc',
      };
      if (searchDebounced) params.search = searchDebounced;
      if (moveType) params.move_type = moveType;
      if (status) params.status = status;
      if (warehouseId) params.warehouse_id = warehouseId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const result = await listStockMoves(empresaId, params);
      setMoves((result.data || []) as StockMove[]);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Erro ao carregar movimentações', error);
    }
    setLoading(false);
  }, [empresaId, page, pageSize, searchDebounced, moveType, status, warehouseId, dateFrom, dateTo]);

  const loadKpis = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [allRes, inRes, outRes, intRes] = await Promise.all([
        listStockMoves(empresaId, { pageSize: 1 }),
        listStockMoves(empresaId, { move_type: 'inbound', pageSize: 1 }),
        listStockMoves(empresaId, { move_type: 'outbound', pageSize: 1 }),
        listStockMoves(empresaId, { move_type: 'internal', pageSize: 1 }),
      ]);
      setKpiTotal(allRes.total || 0);
      setKpiInbound(inRes.total || 0);
      setKpiOutbound(outRes.total || 0);
      setKpiInternal(intRes.total || 0);
    } catch (error) {
      console.error('Erro ao carregar KPIs', error);
    }
  }, [empresaId]);

  const loadWarehouses = useCallback(async () => {
    if (!empresaId) return;
    try {
      const data = await listWarehouses(empresaId);
      setWarehouses(data || []);
    } catch (error) {
      console.error('Erro ao carregar depósitos', error);
    }
  }, [empresaId]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const result = await getStockMove(id);
      if (result.data) setDetailMove(result.data as StockMove & { lines?: StockMoveLine[] });
    } catch (error) {
      console.error('Erro ao carregar detalhe', error);
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && empresaId) {
      loadMoves();
      loadKpis();
      loadWarehouses();
    }
  }, [isOpen, empresaId, loadMoves, loadKpis, loadWarehouses]);

  useEffect(() => {
    if (isOpen) loadMoves();
  }, [isOpen, loadMoves]);

  useEffect(() => {
    if (selectedMoveId) loadDetail(selectedMoveId);
  }, [selectedMoveId, loadDetail]);

  const handleRefresh = () => {
    loadMoves();
    loadKpis();
  };

  const handleFilterApply = () => {
    setPage(1);
    loadMoves();
  };

  const handleFilterReset = () => {
    setMoveType('');
    setStatus('');
    setWarehouseId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters =
    !!moveType || !!status || !!warehouseId || !!dateFrom || !!dateTo;

  const handleRowClick = (row: StockMove) => {
    setSelectedMoveId(row.id);
  };

  const handleBackFromDetail = () => {
    setSelectedMoveId(null);
    setDetailMove(null);
  };

  const columns: DataTableColumn<StockMove>[] = [
    {
      key: 'reference',
      label: 'Referência',
      render: (row) => (
        <span className="font-medium text-white">{row.reference || row.id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'move_type',
      label: 'Tipo',
      render: (row) => <MoveTypeBadge type={row.move_type} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <MoveStatusBadge status={row.status} />,
    },
    {
      key: 'warehouses',
      label: 'Depósito',
      render: (row) => {
        const src = row.source_warehouse?.name || '—';
        const dest = row.dest_warehouse?.name || '—';
        return (
          <span className="text-slate-400 text-sm flex items-center gap-1">
            {src}
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            {dest}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Data',
      render: (row) => <span className="text-slate-400">{fmtDate(row.created_at)}</span>,
    },
    {
      key: 'qty_summary',
      label: 'Qtd',
      render: () => (
        <span className="text-slate-500 text-xs">Ver detalhe</span>
      ),
    },
  ];

  const kpiItems = [
    { label: 'Total Movimentos', value: String(kpiTotal), color: 'purple' as const },
    { label: 'Recebimentos', value: String(kpiInbound), color: 'emerald' as const },
    { label: 'Expedições', value: String(kpiOutbound), color: 'red' as const },
    { label: 'Transferências', value: String(kpiInternal), color: 'blue' as const },
  ];

  const moveTypeOptions = [
    { value: '', label: 'Todos' },
    { value: 'inbound', label: 'Recebimento' },
    { value: 'outbound', label: 'Expedição' },
    { value: 'internal', label: 'Transferência' },
    { value: 'adjustment', label: 'Ajuste' },
    { value: 'scrap', label: 'Sucata' },
  ];

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'draft', label: 'Rascunho' },
    { value: 'ready', label: 'Confirmado' },
    { value: 'done', label: 'Executado' },
    { value: 'canceled', label: 'Cancelado' },
  ];

  const warehouseOptions = [
    { value: '', label: 'Todos' },
    ...warehouses.map((w) => ({
      value: (w.id as string) || '',
      label: (w.name as string) || String(w.id),
    })),
  ];

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <>
          <motion.div
            key="movements-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
          />
          <motion.div
            key="movements-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-5xl max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {selectedMoveId ? (
                    <button
                      onClick={handleBackFromDetail}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                  ) : null}
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                      Movimentações de Estoque
                    </h2>
                    <p className="text-xs text-slate-400">
                      {selectedMoveId
                        ? 'Detalhe do movimento'
                        : 'Visualize e filtre movimentações'}
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
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                {selectedMoveId ? (
                  /* Detail subview */
                  <>
                    {detailLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                      </div>
                    ) : detailMove ? (
                      <div className="space-y-5">
                        {/* Move header */}
                        <DetailSection title="Cabeçalho do Movimento">
                          <div className="grid grid-cols-2 gap-3">
                            <DetailField
                              label="Referência"
                              value={detailMove.reference || detailMove.id?.slice(0, 8)}
                            />
                            <DetailField
                              label="Tipo"
                              value={
                                <MoveTypeBadge type={detailMove.move_type} />
                              }
                            />
                            <DetailField
                              label="Status"
                              value={
                                <MoveStatusBadge status={detailMove.status} />
                              }
                            />
                            <DetailField
                              label="Data"
                              value={fmtDate(detailMove.created_at)}
                            />
                            <DetailField
                              label="Depósito Origem"
                              value={
                                (detailMove.source_warehouse as { name?: string })?.name || '—'
                              }
                            />
                            <DetailField
                              label="Depósito Destino"
                              value={
                                (detailMove.dest_warehouse as { name?: string })?.name || '—'
                              }
                            />
                            {detailMove.notes && (
                              <div className="col-span-2">
                                <DetailField label="Observações" value={detailMove.notes as string} />
                              </div>
                            )}
                          </div>
                        </DetailSection>

                        {/* Lines table */}
                        <DetailSection title="Linhas do Movimento">
                          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-white/[0.06]">
                                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">
                                    Item
                                  </th>
                                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                                    Qtd
                                  </th>
                                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">
                                    Lote
                                  </th>
                                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">
                                    Origem → Destino
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(detailMove.lines || []).map((line: StockMoveLine) => {
                                  const item = line.item;
                                  const itemName = item?.name || item?.sku || '—';
                                  const uom = item?.uom || 'un';
                                  const lotNum =
                                    line.lot?.lot_number || line.lot?.serial_number || '—';
                                  const srcLoc =
                                    line.source_location?.code ||
                                    line.source_location?.name ||
                                    '—';
                                  const destLoc =
                                    line.dest_location?.code ||
                                    line.dest_location?.name ||
                                    '—';
                                  return (
                                    <tr
                                      key={line.id}
                                      className="border-b border-white/[0.03] last:border-0"
                                    >
                                      <td className="px-4 py-3 text-sm text-white font-medium">
                                        {itemName}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-slate-300 text-right">
                                        {fmtQty(line.qty || 0, uom)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-slate-400">
                                        {lotNum}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-slate-400">
                                        <span className="flex items-center gap-1">
                                          {srcLoc}
                                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                                          {destLoc}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </DetailSection>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-500">
                        Movimento não encontrado
                      </div>
                    )}
                  </>
                ) : (
                  /* List view */
                  <>
                    {/* KPIs */}
                    <KPICards items={kpiItems} />

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Buscar por referência..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFilterOpen(true)}
                          className={cn(
                            'flex items-center gap-2 px-4 py-2.5 bg-[#252d3d] border rounded-xl text-sm font-medium transition-colors',
                            hasActiveFilters
                              ? 'border-purple-500/50 text-purple-400'
                              : 'border-white/10 text-slate-400 hover:text-white'
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
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                          <RefreshCw
                            className={cn('w-4 h-4', loading && 'animate-spin')}
                          />
                          Atualizar
                        </button>
                      </div>
                    </div>

                    {/* DataTable */}
                    <div className="bg-[#111827]/50 border border-white/10 rounded-xl p-4">
                      <DataTable<StockMove>
                        columns={columns}
                        data={moves}
                        loading={loading}
                        emptyMessage="Nenhuma movimentação encontrada"
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={setPage}
                        onRowClick={handleRowClick}
                        getRowId={(row) => row.id}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* FilterSheet */}
          <FilterSheet
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            title="Filtros de Movimentações"
            hasActiveFilters={hasActiveFilters}
          >
            <FilterField label="Tipo de Movimento">
              <FilterSelect value={moveType} onChange={setMoveType} options={moveTypeOptions} />
            </FilterField>
            <FilterField label="Status">
              <FilterSelect value={status} onChange={setStatus} options={statusOptions} />
            </FilterField>
            <FilterField label="Depósito">
              <FilterSelect
                value={warehouseId}
                onChange={setWarehouseId}
                options={warehouseOptions}
              />
            </FilterField>
            <FilterField label="Período">
              <FilterDateRange
                startValue={dateFrom}
                endValue={dateTo}
                onStartChange={setDateFrom}
                onEndChange={setDateTo}
              />
            </FilterField>
          </FilterSheet>
        </>
      </AnimatePresence>
    </Portal>
  );
};
