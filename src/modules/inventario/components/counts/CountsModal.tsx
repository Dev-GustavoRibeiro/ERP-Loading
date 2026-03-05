'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ClipboardList, Plus, ArrowLeft, Save, Check, Send, Loader2 } from 'lucide-react';
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
  countStatusLabel,
} from '../shared';
import {
  listCounts,
  createCount,
  getCount,
  updateCountLine,
  approveCount,
  postCount,
  submitCountForReview,
  listWarehouses,
  listLocations,
} from '@/app/actions/inventario';
import { countCreateSchema, type CountCreateInput } from '../../domain/schemas';

// =====================================================
// Types
// =====================================================

interface CountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CountRow = Record<string, unknown>;
type CountDetail = Record<string, unknown> & { lines?: CountLine[] };
type CountLine = Record<string, unknown> & { item?: Record<string, unknown> };

// =====================================================
// Count line status badge (inventory-specific)
// =====================================================
function CountLineStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-slate-500/20 text-slate-400',
    counted: 'bg-blue-500/20 text-blue-400',
    pending_review: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
    posted: 'bg-purple-500/20 text-purple-400',
  };
  const labels: Record<string, string> = {
    open: 'Aberto',
    counted: 'Contado',
    pending_review: 'Em Revisão',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    posted: 'Postado',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', colors[status] || 'bg-slate-500/20 text-slate-400')}>
      {labels[status] || status}
    </span>
  );
}

function CountStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-slate-500/20 text-slate-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    pending_review: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    posted: 'bg-purple-500/20 text-purple-400',
    canceled: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', colors[status] || 'bg-slate-500/20 text-slate-400')}>
      {countStatusLabel(status)}
    </span>
  );
}

// =====================================================
// Component
// =====================================================

export const CountsModal: React.FC<CountsModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<CountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lineEdits, setLineEdits] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const loadCounts = async () => {
    if (!empresaId) return;
    setLoading(true);
    const res = await listCounts(empresaId, { page, pageSize: 15 });
    setCounts((res.data as CountRow[]) || []);
    setTotal(res.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && empresaId) loadCounts();
  }, [isOpen, empresaId, page]);

  const form = useForm<CountCreateInput>({
    resolver: zodResolver(countCreateSchema),
    defaultValues: { warehouse_id: '', location_id: '', count_type: 'full', scheduled_date: '', notes: '' },
  });

  const onSubmitCreate = async () => {
    const values = form.getValues();
    if (!empresaId) return;
    setSaving(true);
    const res = await createCount(empresaId, values);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Contagem criada' });
    setFormOpen(false);
    form.reset();
    loadCounts();
  };

  const openDetail = async (row: CountRow) => {
    const id = row.id as string;
    setDetailLoading(true);
    const res = await getCount(id);
    setDetailLoading(false);
    if (res.error || !res.data) {
      setToast({ msg: res.error || 'Erro', error: true });
      return;
    }
    setDetail(res.data as CountDetail);
    setLineEdits({});
  };

  const closeDetail = () => setDetail(null);

  const handleSaveLines = async () => {
    if (!detail?.lines) return;
    setSaving(true);
    for (const line of detail.lines) {
      const lineId = line.id as string;
      const counted = lineEdits[lineId] ?? line.counted_qty;
      if (counted === undefined || counted === null) continue;
      const status = line.status as string;
      if (!['open', 'counted', 'in_progress'].includes(status)) continue;
      await updateCountLine(lineId, Number(counted), line.notes as string);
    }
    setSaving(false);
    setToast({ msg: 'Contagem salva' });
    openDetail({ id: detail.id } as CountRow);
  };

  const handleApprove = async () => {
    if (!detail?.id) return;
    setSaving(true);
    const res = await approveCount(detail.id as string);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Aprovado' });
    openDetail({ id: detail.id } as CountRow);
  };

  const handlePost = async () => {
    if (!detail?.id) return;
    setSaving(true);
    const res = await postCount(detail.id as string);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Postado' });
    openDetail({ id: detail.id } as CountRow);
  };

  const handleSubmitForReview = async () => {
    if (!detail?.id) return;
    setSaving(true);
    const res = await submitCountForReview(detail.id as string);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Enviado para revisão' });
    openDetail({ id: detail.id } as CountRow);
  };

  const [warehouses, setWarehouses] = useState<{ value: string; label: string }[]>([]);
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    listWarehouses(empresaId).then((w) =>
      setWarehouses((w as Record<string, unknown>[]).map((x) => ({ value: x.id as string, label: (x.name as string) || '' })))
    );
  }, [empresaId]);

  const whId = form.watch('warehouse_id');
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

  const columns: DataTableColumn<CountRow>[] = [
    { key: 'reference', label: 'Referência' },
    {
      key: 'warehouse',
      label: 'Depósito',
      render: (r) => (r.warehouse as Record<string, unknown>)?.name ?? '—',
    },
    {
      key: 'count_type',
      label: 'Tipo',
      render: (r) => ({ full: 'Completa', cycle: 'Ciclo', spot: 'Spot' }[(r.count_type as string) || 'full'] ?? r.count_type),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <CountStatusBadge status={(r.status as string) || 'open'} />,
    },
    {
      key: 'scheduled_date',
      label: 'Data',
      render: (r) => fmtDate((r.scheduled_date as string) || ''),
    },
    {
      key: 'created_at',
      label: 'Criado',
      render: (r) => fmtDate((r.created_at as string) || ''),
    },
  ];

  const cntStatus = detail?.status as string;
  const canEdit = ['open', 'in_progress'].includes(cntStatus);
  const canApprove = cntStatus === 'pending_review';
  const canPost = cntStatus === 'approved';

  if (!isOpen) return null;

  return (
    <>
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="counts-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            <motion.div
              key="counts-modal"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-4xl max-h-[90vh] p-4"
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {detail ? (
                      <button
                        onClick={closeDetail}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    ) : null}
                    <ClipboardList className="w-6 h-6 text-purple-400" />
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {detail ? `Contagem ${detail.reference || ''}` : 'Contagens Físicas'}
                      </h2>
                      <p className="text-sm text-slate-400">{detail ? 'Detalhes da contagem' : 'Lista de contagens'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!detail && (
                      <button
                        onClick={() => setFormOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Nova Contagem
                      </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Content */}
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
                          <DetailField label="Depósito" value={(detail.warehouse as Record<string, unknown>)?.name as string} />
                          <DetailField label="Status" value={<CountStatusBadge status={cntStatus} />} />
                          <DetailField label="Tipo" value={{ full: 'Completa', cycle: 'Ciclo', spot: 'Spot' }[(detail.count_type as string) || 'full']} />
                        </div>

                        <div className="bg-[#111827]/50 rounded-xl border border-white/5 p-4">
                          <h3 className="text-sm font-medium text-slate-300 mb-4">Linhas de contagem</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-white/10">
                                  <th className="px-3 py-2 text-left text-slate-400">Item</th>
                                  <th className="px-3 py-2 text-right text-slate-400">Esperado</th>
                                  <th className="px-3 py-2 text-right text-slate-400">Contado</th>
                                  <th className="px-3 py-2 text-right text-slate-400">Diferença</th>
                                  <th className="px-3 py-2 text-left text-slate-400">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(detail.lines || []).map((line: CountLine) => {
                                  const item = line.item as Record<string, unknown>;
                                  const exp = Number(line.expected_qty ?? 0);
                                  const countedVal = lineEdits[line.id as string] ?? line.counted_qty;
                                  const counted = countedVal != null ? Number(countedVal) : exp;
                                  const diff = counted - exp;
                                  const lineStatus = (line.status as string) || 'open';
                                  const editable = canEdit && ['open', 'counted'].includes(lineStatus);
                                  return (
                                    <tr key={line.id as string} className="border-b border-white/5">
                                      <td className="px-3 py-2 text-white">
                                        {item?.name || item?.sku || '—'} {(item?.sku && `(${item.sku})`) || ''}
                                      </td>
                                      <td className="px-3 py-2 text-right text-slate-300">{fmtQty(exp)}</td>
                                      <td className="px-3 py-2 text-right">
                                        {editable ? (
                                          <input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            value={lineEdits[line.id as string] ?? line.counted_qty ?? ''}
                                            onChange={(e) =>
                                              setLineEdits((prev) => ({
                                                ...prev,
                                                [line.id as string]: parseFloat(e.target.value) || 0,
                                              }))
                                            }
                                            className="w-20 px-2 py-1 bg-[#252d3d] border border-white/10 rounded text-white text-right"
                                          />
                                        ) : (
                                          <span className="text-slate-300">{fmtQty(counted)}</span>
                                        )}
                                      </td>
                                      <td className={cn('px-3 py-2 text-right font-medium', diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-400')}>
                                        {diff > 0 ? '+' : ''}{fmtQty(diff)}
                                      </td>
                                      <td className="px-3 py-2">
                                        <CountLineStatusBadge status={lineStatus} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {canEdit && (
                            <button
                              onClick={handleSaveLines}
                              disabled={saving}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Salvar Contagem
                            </button>
                          )}
                          {['open', 'in_progress'].includes(cntStatus) && (
                            <button
                              onClick={handleSubmitForReview}
                              disabled={saving}
                              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              Enviar para Revisão
                            </button>
                          )}
                          {canApprove && (
                            <button
                              onClick={handleApprove}
                              disabled={saving}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              Aprovar
                            </button>
                          )}
                          {canPost && (
                            <button
                              onClick={handlePost}
                              disabled={saving}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              Postar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <DataTable
                      columns={columns}
                      data={counts}
                      loading={loading}
                      total={total}
                      page={page}
                      pageSize={15}
                      onPageChange={setPage}
                      onRowClick={openDetail}
                      emptyMessage="Nenhuma contagem encontrada"
                    />
                  )}
                </div>

                {/* Toast */}
                {toast && (
                  <div
                    className={cn(
                      'fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-[100]',
                      toast.error ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'
                    )}
                  >
                    {toast.msg}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>

    {/* Dialog: Nova Contagem */}
    <DialogForm
      isOpen={formOpen}
      onClose={() => { setFormOpen(false); form.reset(); }}
      title="Nova Contagem"
      subtitle="Criar sessão de contagem física"
      onSubmit={form.handleSubmit(onSubmitCreate)}
      loading={saving}
      submitLabel="Criar"
    >
      <FormSelect form={form} name="warehouse_id" label="Depósito" options={warehouses} required />
      <FormSelect form={form} name="location_id" label="Localização" options={locations} />
      <FormSelect
        form={form}
        name="count_type"
        label="Tipo de contagem"
        options={[
          { value: 'full', label: 'Completa' },
          { value: 'cycle', label: 'Ciclo' },
          { value: 'spot', label: 'Spot' },
        ]}
      />
      <FormInput form={form} name="scheduled_date" label="Data agendada" type="date" />
      <FormTextarea form={form} name="notes" label="Observações" />
    </DialogForm>
    </>
  );
};
