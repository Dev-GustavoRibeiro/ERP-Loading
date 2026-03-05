'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Plus, ArrowLeft, RotateCcw, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import {
  DataTable,
  DataTableColumn,
  DialogForm,
  FormInput,
  FormSelect,
  FormTextarea,
  DetailField,
  fmtDate,
  fmtQty,
  moveStatusLabel,
} from '../shared';
import {
  listAdjustmentMoves,
  getStockMove,
  createAdjustment,
  reverseAdjustment,
  listWarehouses,
  listLocations,
  listItems,
  listLots,
} from '@/app/actions/inventario';
import { adjustmentCreateSchema, type AdjustmentCreateInput } from '../../domain/schemas';

// =====================================================
// Types
// =====================================================

interface AdjustmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MoveRow = Record<string, unknown>;
type MoveDetail = Record<string, unknown> & { lines?: Record<string, unknown>[] };

function MoveStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-slate-500/20 text-slate-400',
    ready: 'bg-blue-500/20 text-blue-400',
    done: 'bg-emerald-500/20 text-emerald-400',
    canceled: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', colors[status] || 'bg-slate-500/20 text-slate-400')}>
      {moveStatusLabel(status)}
    </span>
  );
}

export const AdjustmentsModal: React.FC<AdjustmentsModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<MoveDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reverseMoveId, setReverseMoveId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const loadMoves = async () => {
    if (!empresaId) return;
    setLoading(true);
    const res = await listAdjustmentMoves(empresaId, { page, pageSize: 15 });
    setMoves((res.data as MoveRow[]) || []);
    setTotal(res.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && empresaId) loadMoves();
  }, [isOpen, empresaId, page]);

  const form = useForm<AdjustmentCreateInput>({
    resolver: zodResolver(adjustmentCreateSchema),
    defaultValues: {
      item_id: '',
      warehouse_id: '',
      location_id: '',
      lot_id: '',
      qty: 0,
      reason: '',
      notes: '',
    },
  });

  const onSubmitCreate = async () => {
    const values = form.getValues();
    if (!empresaId) return;
    setSaving(true);
    const res = await createAdjustment(empresaId, values);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Ajuste aplicado' });
    setFormOpen(false);
    form.reset({ item_id: '', warehouse_id: '', location_id: '', lot_id: '', qty: 0, reason: '', notes: '' });
    loadMoves();
  };

  const openDetail = async (row: MoveRow) => {
    const id = row.id as string;
    setDetailLoading(true);
    const res = await getStockMove(id);
    setDetailLoading(false);
    if (res.error || !res.data) {
      setToast({ msg: res.error || 'Erro', error: true });
      return;
    }
    setDetail(res.data as MoveDetail);
  };

  const closeDetail = () => setDetail(null);

  const handleReverse = async () => {
    if (!reverseMoveId || !reverseReason.trim()) return;
    setSaving(true);
    const res = await reverseAdjustment(reverseMoveId, reverseReason.trim());
    setSaving(false);
    setReverseMoveId(null);
    setReverseReason('');
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Estorno realizado' });
    if (detail?.id === reverseMoveId) closeDetail();
    loadMoves();
  };

  const [warehouses, setWarehouses] = useState<{ value: string; label: string }[]>([]);
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([]);
  const [items, setItems] = useState<{ value: string; label: string }[]>([]);
  const [lots, setLots] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    listWarehouses(empresaId).then((w) =>
      setWarehouses((w as Record<string, unknown>[]).map((x) => ({ value: x.id as string, label: (x.name as string) || '' })))
    );
    listItems(empresaId, { pageSize: 500 }).then((r) =>
      setItems(((r.data as Record<string, unknown>[]) || []).map((x) => ({ value: x.id as string, label: `${x.sku || ''} - ${x.name || ''}`.trim() || (x.name as string) })))
    );
  }, [empresaId]);

  const whId = form.watch('warehouse_id');
  const itemId = form.watch('item_id');
  useEffect(() => {
    if (!empresaId || !whId) {
      setLocations([]);
      return;
    }
    listLocations(empresaId, whId).then((l) =>
      setLocations([
        { value: '', label: '— Qualquer —' },
        ...(l as Record<string, unknown>[]).map((x) => ({ value: x.id as string, label: `${x.code || ''} - ${x.name || ''}` })),
      ])
    );
  }, [empresaId, whId]);

  useEffect(() => {
    if (!empresaId || !itemId) {
      setLots([]);
      return;
    }
    listLots(empresaId, itemId).then((l) =>
      setLots([
        { value: '', label: '— Nenhum —' },
        ...(l as Record<string, unknown>[]).map((x) => ({ value: x.id as string, label: (x.lot_number as string) || '' })),
      ])
    );
  }, [empresaId, itemId]);

  const columns: DataTableColumn<MoveRow>[] = [
    { key: 'reference', label: 'Referência' },
    { key: 'item_name', label: 'Item' },
    {
      key: 'dest_warehouse',
      label: 'Depósito',
      render: (r) => (r.dest_warehouse as Record<string, unknown>)?.name ?? (r.source_warehouse as Record<string, unknown>)?.name ?? '—',
    },
    {
      key: 'qty',
      label: 'Qtd',
      render: (r) => {
        const q = r.qty as number;
        const sign = (r as Record<string, unknown>).qty >= 0 ? '+' : '-';
        return <span className={q >= 0 ? 'text-emerald-400' : 'text-red-400'}>{sign}{fmtQty(Math.abs(q))}</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <MoveStatusBadge status={(r.status as string) || 'draft'} />,
    },
    {
      key: 'created_at',
      label: 'Data',
      render: (r) => fmtDate((r.created_at as string) || ''),
    },
  ];

  const moveStatus = detail?.status as string;
  const canReverse = moveStatus === 'done';

  if (!isOpen) return null;

  return (
    <>
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="adjustments-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            <motion.div
              key="adjustments-modal"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-4xl max-h-[90vh] p-4"
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {detail ? (
                      <button onClick={closeDetail} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    ) : null}
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                    <div>
                      <h2 className="text-lg font-semibold text-white">{detail ? `Ajuste ${detail.reference || ''}` : 'Ajustes de Estoque'}</h2>
                      <p className="text-sm text-slate-400">{detail ? 'Detalhes do movimento' : 'Lista de ajustes'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!detail && (
                      <button onClick={() => setFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors">
                        <Plus className="w-4 h-4" />
                        Novo Ajuste
                      </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {detail ? (
                    detailLoading ? (
                      <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <DetailField label="Referência" value={detail.reference as string} />
                          <DetailField label="Status" value={<MoveStatusBadge status={moveStatus} />} />
                          <DetailField label="Data" value={fmtDate((detail.created_at as string) || '')} />
                          <DetailField label="Depósito" value={(detail.dest_warehouse as Record<string, unknown>)?.name as string ?? (detail.source_warehouse as Record<string, unknown>)?.name as string} />
                        </div>

                        <div className="bg-[#111827]/50 rounded-xl border border-white/5 p-4">
                          <h3 className="text-sm font-medium text-slate-300 mb-4">Linhas</h3>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="px-3 py-2 text-left text-slate-400">Item</th>
                                <th className="px-3 py-2 text-right text-slate-400">Quantidade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(detail.lines || []).map((line: Record<string, unknown>) => {
                                const item = line.item as Record<string, unknown>;
                                return (
                                  <tr key={line.id as string} className="border-b border-white/5">
                                    <td className="px-3 py-2 text-white">{item?.name || item?.sku || '—'}</td>
                                    <td className="px-3 py-2 text-right text-slate-300">{fmtQty(Number(line.qty || 0))}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {detail.notes && <DetailField label="Observações" value={detail.notes as string} />}

                        {canReverse && (
                          <button onClick={() => setReverseMoveId(detail.id as string)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl">
                            <RotateCcw className="w-4 h-4" />
                            Estornar
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <DataTable
                      columns={columns}
                      data={moves}
                      loading={loading}
                      total={total}
                      page={page}
                      pageSize={15}
                      onPageChange={setPage}
                      onRowClick={openDetail}
                      emptyMessage="Nenhum ajuste encontrado"
                    />
                  )}
                </div>

                {toast && (
                  <div className={cn('fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-[100]', toast.error ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white')}>
                    {toast.msg}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>

    <DialogForm
      isOpen={formOpen}
      onClose={() => { setFormOpen(false); form.reset(); }}
      title="Novo Ajuste"
      subtitle="Ajuste de estoque (qtd positiva = aumento, negativa = redução)"
      onSubmit={form.handleSubmit(onSubmitCreate)}
      loading={saving}
      submitLabel="Aplicar"
    >
      <FormSelect form={form} name="item_id" label="Item" options={items} required />
      <FormSelect form={form} name="warehouse_id" label="Depósito" options={warehouses} required />
      <FormSelect form={form} name="location_id" label="Localização" options={locations} />
      <FormSelect form={form} name="lot_id" label="Lote" options={lots} />
      <FormInput form={form} name="qty" label="Quantidade (+ aumento / - redução)" type="number" required />
      <FormInput form={form} name="reason" label="Motivo" required />
      <FormTextarea form={form} name="notes" label="Observações" />
    </DialogForm>

    <DialogForm
      isOpen={!!reverseMoveId}
      onClose={() => { setReverseMoveId(null); setReverseReason(''); }}
      title="Estornar ajuste"
      subtitle="O estorno criará um movimento reverso"
      onSubmit={handleReverse}
      loading={saving}
      submitLabel="Estornar"
      variant="danger"
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">Motivo do estorno *</label>
        <textarea
          value={reverseReason}
          onChange={(e) => setReverseReason(e.target.value)}
          placeholder="Informe o motivo"
          rows={3}
          className="w-full px-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 resize-none"
        />
      </div>
    </DialogForm>
    </>
  );
};
