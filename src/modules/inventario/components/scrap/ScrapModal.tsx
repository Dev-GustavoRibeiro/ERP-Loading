'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, ArrowLeft, Play, Loader2 } from 'lucide-react';
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
} from '../shared';
import {
  listScrapOrders,
  createScrapOrder,
  executeScrapOrder,
  listWarehouses,
  listLocations,
  listItems,
  listLots,
} from '@/app/actions/inventario';
import { scrapCreateSchema, type ScrapCreateInput } from '../../domain/schemas';

// =====================================================
// Types
// =====================================================

interface ScrapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ScrapRow = Record<string, unknown>;

function ScrapStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-slate-500/20 text-slate-400',
    done: 'bg-emerald-500/20 text-emerald-400',
    canceled: 'bg-red-500/20 text-red-400',
  };
  const labels: Record<string, string> = {
    draft: 'Rascunho',
    done: 'Executada',
    canceled: 'Cancelada',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', colors[status] || 'bg-slate-500/20 text-slate-400')}>
      {labels[status] || status}
    </span>
  );
}

export const ScrapModal: React.FC<ScrapModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();
  const [scraps, setScraps] = useState<ScrapRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ScrapRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const loadScraps = async () => {
    if (!empresaId) return;
    setLoading(true);
    const res = await listScrapOrders(empresaId, { page, pageSize: 15 });
    setScraps((res.data as ScrapRow[]) || []);
    setTotal(res.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && empresaId) loadScraps();
  }, [isOpen, empresaId, page]);

  const form = useForm<ScrapCreateInput>({
    resolver: zodResolver(scrapCreateSchema),
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
    const res = await createScrapOrder(empresaId, values);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Ordem de sucata criada' });
    setFormOpen(false);
    form.reset();
    loadScraps();
  };

  const openDetail = (row: ScrapRow) => setDetail(row);
  const closeDetail = () => setDetail(null);

  const handleExecute = async () => {
    if (!detail?.id) return;
    setSaving(true);
    const res = await executeScrapOrder(detail.id as string);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Sucata executada' });
    closeDetail();
    loadScraps();
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

  const columns: DataTableColumn<ScrapRow>[] = [
    {
      key: 'item',
      label: 'Item',
      render: (r) => (r.item as Record<string, unknown>)?.name ?? (r.item as Record<string, unknown>)?.sku ?? '—',
    },
    {
      key: 'warehouse',
      label: 'Depósito',
      render: (r) => (r.warehouse as Record<string, unknown>)?.name ?? '—',
    },
    { key: 'qty', label: 'Qtd', render: (r) => fmtQty(Number(r.qty || 0)) },
    { key: 'reason', label: 'Motivo' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <ScrapStatusBadge status={(r.status as string) || 'draft'} />,
    },
    { key: 'created_at', label: 'Data', render: (r) => fmtDate((r.created_at as string) || '') },
  ];

  const scrapStatus = detail?.status as string;
  const canExecute = scrapStatus === 'draft';

  if (!isOpen) return null;

  return (
    <>
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="scrap-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            <motion.div
              key="scrap-modal"
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
                    <Trash2 className="w-6 h-6 text-purple-400" />
                    <div>
                      <h2 className="text-lg font-semibold text-white">{detail ? `Sucata ${detail.reference || ''}` : 'Ordens de Sucata'}</h2>
                      <p className="text-sm text-slate-400">{detail ? 'Detalhes' : 'Lista de ordens'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!detail && (
                      <button onClick={() => setFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors">
                        <Plus className="w-4 h-4" />
                        Nova Sucata
                      </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {detail ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <DetailField label="Referência" value={detail.reference as string} />
                        <DetailField label="Item" value={(detail.item as Record<string, unknown>)?.name as string ?? (detail.item as Record<string, unknown>)?.sku as string} />
                        <DetailField label="Depósito" value={(detail.warehouse as Record<string, unknown>)?.name as string} />
                        <DetailField label="Status" value={<ScrapStatusBadge status={scrapStatus} />} />
                      </div>
                      <DetailField label="Quantidade" value={fmtQty(Number(detail.qty || 0))} />
                      <DetailField label="Motivo" value={detail.reason as string} />
                      {detail.notes && <DetailField label="Observações" value={detail.notes as string} />}

                      {canExecute && (
                        <button
                          onClick={handleExecute}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          Executar
                        </button>
                      )}
                    </div>
                  ) : (
                    <DataTable
                      columns={columns}
                      data={scraps}
                      loading={loading}
                      total={total}
                      page={page}
                      pageSize={15}
                      onPageChange={setPage}
                      onRowClick={openDetail}
                      emptyMessage="Nenhuma ordem de sucata"
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
      title="Nova Sucata"
      subtitle="Registrar baixa de estoque por sucata"
      onSubmit={form.handleSubmit(onSubmitCreate)}
      loading={saving}
      submitLabel="Criar"
    >
      <FormSelect form={form} name="item_id" label="Item" options={items} required />
      <FormSelect form={form} name="warehouse_id" label="Depósito" options={warehouses} required />
      <FormSelect form={form} name="location_id" label="Localização" options={locations} />
      <FormSelect form={form} name="lot_id" label="Lote" options={lots} />
      <FormInput form={form} name="qty" label="Quantidade" type="number" required />
      <FormInput form={form} name="reason" label="Motivo" required />
      <FormTextarea form={form} name="notes" label="Observações" />
    </DialogForm>
    </>
  );
};
