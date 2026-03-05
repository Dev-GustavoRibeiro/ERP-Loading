'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Plus, RefreshCw, Check, CheckCheck, Ban, Loader2, Minus, ArrowRight } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import {
  DataTable, DataTableColumn, fmtDate,
  DialogForm, FormInput, FormSelect, FormTextarea,
  ConfirmDialog, DetailField, DetailsDrawer, DetailSection,
} from '../shared';
import { fmtQty, moveTypeLabel, moveStatusLabel } from '../shared';
import { operationCreateSchema, type OperationCreateInput } from '../../domain/schemas';
import {
  listStockMoves, getStockMove, createOperation, confirmStockMove, postStockMove,
  cancelStockMove, listWarehouses, listItems, listLots,
} from '@/app/actions/inventario';

// =====================================================
// Types
// =====================================================

type MoveTypeTab = 'inbound' | 'outbound' | 'internal';

interface OperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StockMoveRow {
  id: string;
  move_type: string;
  status: string;
  reference?: string;
  scheduled_date?: string;
  created_at: string;
  source_warehouse?: { name?: string };
  dest_warehouse?: { name?: string };
  [key: string]: unknown;
}

const TAB_CONFIG: { key: MoveTypeTab; label: string; move_type: string }[] = [
  { key: 'inbound', label: 'Recebimentos', move_type: 'inbound' },
  { key: 'outbound', label: 'Expedições', move_type: 'outbound' },
  { key: 'internal', label: 'Transferências', move_type: 'internal' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-amber-500/15 text-amber-400',
  ready: 'bg-blue-500/15 text-blue-400',
  done: 'bg-emerald-500/15 text-emerald-400',
  canceled: 'bg-red-500/15 text-red-400',
};

// =====================================================
// Component
// =====================================================

export const OperationsModal: React.FC<OperationsModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();
  const [activeTab, setActiveTab] = useState<MoveTypeTab>('inbound');
  const [data, setData] = useState<StockMoveRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const moveType = TAB_CONFIG.find((t) => t.key === activeTab)?.move_type ?? 'inbound';

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const res = await listStockMoves(empresaId, {
        move_type: moveType,
        page,
        pageSize: 20,
      });
      setData((res as { data?: StockMoveRow[] }).data ?? []);
      setTotal((res as { total?: number }).total ?? 0);
    } catch (e) {
      toast.error('Erro ao carregar operações');
    } finally {
      setLoading(false);
    }
  }, [empresaId, moveType, page]);

  useEffect(() => {
    if (isOpen && empresaId) fetchData();
  }, [isOpen, empresaId, fetchData]);

  const fetchDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        const res = await getStockMove(id);
        if (res.data) setDetail(res.data as Record<string, unknown>);
        else toast.error((res as { error?: string }).error ?? 'Erro');
      } catch (e) {
        toast.error('Erro ao carregar detalhe');
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  const handleRowClick = (row: StockMoveRow) => {
    setSelectedId(row.id);
    fetchDetail(row.id);
  };

  const handleCloseDetail = () => {
    setSelectedId(null);
    setDetail(null);
    fetchData();
  };

  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await confirmStockMove(id);
      if ((res as { error?: string }).error) toast.error((res as { error: string }).error);
      else {
        toast.success('Movimento confirmado');
        fetchDetail(id);
        fetchData();
      }
    } catch (e) {
      toast.error('Erro ao confirmar');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePost = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await postStockMove(id);
      if ((res as { error?: string }).error) toast.error((res as { error: string }).error);
      else {
        toast.success('Movimento executado');
        fetchDetail(id);
        fetchData();
      }
    } catch (e) {
      toast.error('Erro ao executar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelClick = (id: string) => setConfirmCancelId(id);

  const handleCancelConfirm = async () => {
    if (!confirmCancelId) return;
    setCancelLoading(true);
    try {
      const res = await cancelStockMove(confirmCancelId, 'Cancelado pelo usuário');
      if ((res as { error?: string }).error) toast.error((res as { error: string }).error);
      else {
        toast.success('Movimento cancelado');
        setConfirmCancelId(null);
        handleCloseDetail();
        fetchData();
      }
    } catch (e) {
      toast.error('Erro ao cancelar');
    } finally {
      setCancelLoading(false);
    }
  };

  const columns: DataTableColumn<StockMoveRow>[] = [
    { key: 'reference', label: 'Referência', render: (r) => r.reference || (r.id as string).slice(0, 8) },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className={cn('text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap', STATUS_COLORS[r.status] ?? 'bg-slate-500/15 text-slate-400')}>
          {moveStatusLabel(r.status)}
        </span>
      ),
    },
    {
      key: 'warehouses',
      label: 'Depósitos',
      render: (r) => (
        <span className="flex items-center gap-1 text-slate-300">
          {(r.source_warehouse as { name?: string })?.name ?? '—'}
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          {(r.dest_warehouse as { name?: string })?.name ?? '—'}
        </span>
      ),
    },
    { key: 'scheduled_date', label: 'Data Prev.', render: (r) => fmtDate(r.scheduled_date as string) || '—' },
    { key: 'created_at', label: 'Criado', render: (r) => fmtDate(r.created_at as string) },
  ];

  const status = detail?.status as string | undefined;
  const detailActions = [];
  if (status === 'draft') {
    detailActions.push({
      label: 'Confirmar',
      icon: Check,
      onClick: () => handleConfirm(detail?.id as string),
      variant: 'success' as const,
      disabled: actionLoading === detail?.id,
    });
  }
  if (status === 'ready') {
    detailActions.push({
      label: 'Executar',
      icon: CheckCheck,
      onClick: () => handlePost(detail?.id as string),
      variant: 'success' as const,
      disabled: actionLoading === detail?.id,
    });
  }
  if (status === 'draft' || status === 'ready') {
    detailActions.push({
      label: 'Cancelar',
      icon: Ban,
      onClick: () => handleCancelClick(detail?.id as string),
      variant: 'danger' as const,
    });
  }

  const statusColor =
    status === 'done'
      ? 'bg-emerald-500/15 text-emerald-400'
      : status === 'canceled'
        ? 'bg-red-500/15 text-red-400'
        : STATUS_COLORS[status ?? ''] ?? 'bg-slate-500/15 text-slate-400';

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="operations-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            <motion.div
              key="operations-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-6xl p-4"
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#252d3d]">
                      <Truck className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Operações</h2>
                      <p className="text-xs text-slate-500">Recebimentos, expedições e transferências</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchData}
                      disabled={loading}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={cn('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
                    </button>
                    <button
                      onClick={() => setShowForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nova Operação
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 px-6">
                  {TAB_CONFIG.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveTab(tab.key);
                        setPage(1);
                      }}
                      className={cn(
                        'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === tab.key
                          ? 'border-purple-500 text-purple-400'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-6 min-h-0">
                  <DataTable<StockMoveRow>
                    columns={columns}
                    data={data}
                    loading={loading}
                    page={page}
                    pageSize={20}
                    total={total}
                    onPageChange={setPage}
                    onRowClick={handleRowClick}
                    getRowId={(r) => r.id}
                    emptyMessage="Nenhuma operação encontrada"
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Form */}
      <CreateFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        moveType={moveType}
        empresaId={empresaId ?? ''}
        onSuccess={() => {
          setShowForm(false);
          fetchData();
        }}
      />

      {/* Detail Drawer */}
      <DetailsDrawer
        isOpen={!!selectedId}
        onClose={handleCloseDetail}
        title={(detail?.reference as string) || (selectedId ?? '').slice(0, 8)}
        subtitle={detail ? moveTypeLabel(detail.move_type as string) : ''}
        status={
          detail?.status
            ? {
                label: moveStatusLabel(detail.status as string),
                color: statusColor,
              }
            : undefined
        }
        actions={detailActions}
        width="xl"
      >
        {detailLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <DetailSection title="Informações">
              <div className="space-y-2">
                <DetailField label="Referência" value={detail.reference as string} />
                <DetailField label="Data prevista" value={fmtDate(detail.scheduled_date as string)} />
                <DetailField label="Criado em" value={fmtDate(detail.created_at as string)} />
                {(detail.notes as string) && (
                  <DetailField label="Observações" value={detail.notes as string} />
                )}
              </div>
            </DetailSection>
            <DetailSection title="Depósitos">
              <div className="space-y-2">
                <DetailField
                  label="Origem"
                  value={(detail.source_warehouse as { name?: string })?.name ?? '—'}
                />
                <DetailField
                  label="Destino"
                  value={(detail.dest_warehouse as { name?: string })?.name ?? '—'}
                />
              </div>
            </DetailSection>
            <DetailSection title="Itens">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="py-2 pr-4 text-slate-500">Item</th>
                      <th className="py-2 pr-4 text-slate-500">Lote</th>
                      <th className="py-2 pr-4 text-slate-500 text-right">Qtd</th>
                      <th className="py-2 text-slate-500">UOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((detail.lines as Record<string, unknown>[]) ?? []).map((line: Record<string, unknown>) => (
                      <tr key={line.id as string} className="border-b border-white/5">
                        <td className="py-2 pr-4 text-white">
                          {(line.item as { name?: string; sku?: string })?.name ??
                            (line.item as { sku?: string })?.sku ??
                            '—'}
                        </td>
                        <td className="py-2 pr-4 text-slate-400">
                          {(line.lot as { lot_number?: string })?.lot_number ?? '—'}
                        </td>
                        <td className="py-2 pr-4 text-right text-white">
                          {fmtQty((line.qty as number) ?? 0, (line.item as { uom?: string })?.uom ?? 'un')}
                        </td>
                        <td className="py-2 text-slate-400">{(line.item as { uom?: string })?.uom ?? 'un'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DetailSection>
          </div>
        ) : null}
      </DetailsDrawer>

      {/* Cancel Confirm */}
      <ConfirmDialog
        isOpen={!!confirmCancelId}
        onClose={() => setConfirmCancelId(null)}
        onConfirm={handleCancelConfirm}
        title="Cancelar operação"
        description="Tem certeza que deseja cancelar esta operação? Esta ação não pode ser desfeita."
        confirmLabel="Cancelar operação"
        variant="danger"
        loading={cancelLoading}
      />
    </Portal>
  );
};

// =====================================================
// Create Form Modal
// =====================================================

interface CreateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  moveType: string;
  empresaId: string;
  onSuccess: () => void;
}

const CreateFormModal: React.FC<CreateFormModalProps> = ({
  isOpen,
  onClose,
  moveType,
  empresaId,
  onSuccess,
}) => {
  const [warehouses, setWarehouses] = useState<{ value: string; label: string }[]>([]);
  const [items, setItems] = useState<{ value: string; label: string }[]>([]);

  const form = useForm<OperationCreateInput>({
    resolver: zodResolver(operationCreateSchema),
    defaultValues: {
      move_type: moveType as 'inbound' | 'outbound' | 'internal',
      source_warehouse_id: '',
      dest_warehouse_id: '',
      source_location_id: '',
      dest_location_id: '',
      scheduled_date: new Date().toISOString().slice(0, 10),
      reference: '',
      notes: '',
      lines: [{ item_id: '', qty: 1, lot_id: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    form.setValue('move_type', moveType as 'inbound' | 'outbound' | 'internal');
  }, [moveType, form]);

  useEffect(() => {
    if (!isOpen || !empresaId) return;
    (async () => {
      const [whRes, itemsRes] = await Promise.all([
        listWarehouses(empresaId),
        listItems(empresaId, { pageSize: 200 }),
      ]);
      const wh = (whRes as Record<string, unknown>[]).map((w) => ({
        value: (w.id as string) ?? '',
        label: `${(w.code as string) ?? ''} - ${(w.name as string) ?? ''}`,
      }));
      const it = ((itemsRes as { data?: Record<string, unknown>[] }).data ?? []).map((i) => ({
        value: (i.id as string) ?? '',
        label: `${(i.sku as string) ?? ''} - ${(i.name as string) ?? ''}`,
      }));
      setWarehouses(wh);
      setItems(it);
    })();
  }, [isOpen, empresaId]);

  const warehouseOptions = [
    { value: '', label: '— Selecionar —' },
    ...warehouses,
  ];

  const itemOptions = [
    { value: '', label: '— Selecionar —' },
    ...items,
  ];

  const handleSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const values = form.getValues();
    const moveDto = {
      move_type: values.move_type,
      source_warehouse_id: values.source_warehouse_id || undefined,
      dest_warehouse_id: values.dest_warehouse_id || undefined,
      source_location_id: values.source_location_id || undefined,
      dest_location_id: values.dest_location_id || undefined,
      scheduled_date: values.scheduled_date || undefined,
      reference: values.reference || undefined,
      notes: values.notes || undefined,
    };
    const lines = values.lines.map((l) => ({
      item_id: l.item_id,
      qty: l.qty,
      lot_id: l.lot_id || undefined,
    }));

    setSubmitting(true);
    try {
      const result = await createOperation(empresaId, { ...moveDto, lines });
      if ((result as { error?: string }).error) {
        toast.error((result as { error: string }).error);
      } else {
        toast.success('Operação criada');
        form.reset();
        onSuccess();
      }
    } catch (e) {
      toast.error('Erro ao criar operação');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogForm
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Operação"
      subtitle={moveTypeLabel(moveType)}
      onSubmit={handleSubmit}
      loading={submitting}
      submitLabel="Criar"
      size="xl"
      variant="primary"
    >
      <input type="hidden" {...form.register('move_type')} />

      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          form={form}
          name="source_warehouse_id"
          label="Depósito origem"
          options={warehouseOptions}
          required={moveType === 'outbound' || moveType === 'internal'}
        />
        <FormSelect
          form={form}
          name="dest_warehouse_id"
          label="Depósito destino"
          options={warehouseOptions}
          required={moveType === 'inbound' || moveType === 'internal'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormInput form={form} name="scheduled_date" label="Data prevista" type="date" />
        <FormInput form={form} name="reference" label="Referência" placeholder="Ex: NF-001" />
      </div>

      <FormTextarea form={form} name="notes" label="Observações" placeholder="Observações..." />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Itens</span>
          <button
            type="button"
            onClick={() => append({ item_id: '', qty: 1, lot_id: '' })}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Item
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-[#111827]/50 p-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-[#252d3d]/50 border border-white/5"
            >
              <div className="flex-1 grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <FormSelect
                    form={form}
                    name={`lines.${index}.item_id`}
                    label="Item"
                    options={itemOptions}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <FormInput
                    form={form}
                    name={`lines.${index}.qty`}
                    label="Qtd"
                    type="number"
                    required
                  />
                </div>
                <div className="col-span-4">
                  <LotSelectForLine form={form} index={index} empresaId={empresaId} />
                </div>
                <div className="col-span-1 flex items-end pb-6">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {form.formState.errors.lines && (
          <p className="text-xs text-red-400">
            {(form.formState.errors.lines as { message?: string }).message}
          </p>
        )}
      </div>
    </DialogForm>
  );
};

// =====================================================
// Lot Select (fetches lots when item selected)
// =====================================================

function LotSelectForLine({
  form,
  index,
  empresaId,
}: {
  form: ReturnType<typeof useForm<OperationCreateInput>>;
  index: number;
  empresaId: string;
}) {
  const itemId = form.watch(`lines.${index}.item_id`);
  const [lots, setLots] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!itemId || !empresaId) {
      setLots([]);
      form.setValue(`lines.${index}.lot_id`, '');
      return;
    }
    (async () => {
      const res = await listLots(empresaId, itemId);
      const opts = (res as Record<string, unknown>[]).map((l) => ({
        value: (l.id as string) ?? '',
        label: String((l.lot_number as string) ?? (l.serial_number as string) ?? l.id ?? ''),
      }));
      setLots(opts);
      form.setValue(`lines.${index}.lot_id`, '');
    })();
  }, [itemId, empresaId, index, form]);

  const options = [{ value: '', label: '— Opcional —' }, ...lots];

  return (
    <FormSelect
      form={form}
      name={`lines.${index}.lot_id`}
      label="Lote"
      options={options}
    />
  );
}
