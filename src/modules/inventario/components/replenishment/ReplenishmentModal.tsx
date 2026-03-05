'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Plus, RefreshCw, Check, XCircle, Loader2, Settings, Lightbulb } from 'lucide-react';
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
  ConfirmDialog,
  fmtQty,
} from '../shared';
import {
  listReorderRules,
  createReorderRule,
  updateReorderRule,
  deleteReorderRule,
  listReplenishmentSuggestions,
  generateReplenishmentSuggestions,
  approveReplenishment,
  rejectReplenishment,
  listItems,
  listWarehouses,
} from '@/app/actions/inventario';
import { reorderRuleSchema, type ReorderRuleInput } from '../../domain/schemas';

// =====================================================
// Types
// =====================================================

interface ReplenishmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RuleRow = Record<string, unknown>;
type SuggestionRow = Record<string, unknown>;

function ReplenishmentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-amber-500/20 text-amber-400', label: 'Pendente' },
    approved: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Aprovada' },
    rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rejeitada' },
    executed: { color: 'bg-blue-500/20 text-blue-400', label: 'Executada' },
  };
  const c = config[status] || { color: 'bg-slate-500/20 text-slate-400', label: status };
  return <span className={cn('text-xs px-2 py-0.5 rounded font-medium', c.color)}>{c.label}</span>;
}

export const ReplenishmentModal: React.FC<ReplenishmentModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();
  const [activeTab, setActiveTab] = useState<'rules' | 'suggestions'>('rules');
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const loadRules = async () => {
    if (!empresaId) return;
    setLoadingRules(true);
    const data = await listReorderRules(empresaId);
    setRules((data as RuleRow[]) || []);
    setLoadingRules(false);
  };

  const loadSuggestions = async () => {
    if (!empresaId) return;
    setLoadingSuggestions(true);
    const data = await listReplenishmentSuggestions(empresaId);
    setSuggestions((data as SuggestionRow[]) || []);
    setLoadingSuggestions(false);
  };

  useEffect(() => {
    if (isOpen && empresaId) {
      loadRules();
      loadSuggestions();
    }
  }, [isOpen, empresaId]);

  const form = useForm<ReorderRuleInput>({
    resolver: zodResolver(reorderRuleSchema),
    defaultValues: {
      item_id: '',
      warehouse_id: '',
      min_qty: 0,
      max_qty: 0,
      reorder_qty: 0,
      lead_time_days: 0,
    },
  });

  const onSubmitRule = async () => {
    const values = form.getValues();
    if (!empresaId) return;
    setSaving(true);
    const res = editingRuleId
      ? await updateReorderRule(editingRuleId, values)
      : await createReorderRule(empresaId, values);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Regra salva' });
    setFormOpen(false);
    setEditingRuleId(null);
    form.reset();
    loadRules();
  };

  const openEditRule = (row: RuleRow) => {
    form.reset({
      item_id: row.item_id as string,
      warehouse_id: row.warehouse_id as string,
      min_qty: Number(row.min_qty ?? 0),
      max_qty: Number(row.max_qty ?? 0),
      reorder_qty: Number(row.reorder_qty ?? 0),
      lead_time_days: Number(row.lead_time_days ?? 0),
    });
    setEditingRuleId(row.id as string);
    setFormOpen(true);
  };

  const handleDeleteRule = async () => {
    if (!deleteConfirmId) return;
    setSaving(true);
    const res = await deleteReorderRule(deleteConfirmId);
    setSaving(false);
    setDeleteConfirmId(null);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Regra excluída' });
    loadRules();
  };

  const handleGenerate = async () => {
    if (!empresaId) return;
    setGenerateLoading(true);
    const res = await generateReplenishmentSuggestions(empresaId);
    setGenerateLoading(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Sugestões geradas' });
    loadSuggestions();
  };

  const handleApprove = async (id: string) => {
    setSaving(true);
    const res = await approveReplenishment(id);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Aprovada' });
    loadSuggestions();
  };

  const handleReject = async (id: string) => {
    setSaving(true);
    const res = await rejectReplenishment(id);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Rejeitada' });
    loadSuggestions();
  };

  const [warehouses, setWarehouses] = useState<{ value: string; label: string }[]>([]);
  const [items, setItems] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    listWarehouses(empresaId).then((w) =>
      setWarehouses((w as Record<string, unknown>[]).map((x) => ({ value: x.id as string, label: (x.name as string) || '' })))
    );
    listItems(empresaId, { pageSize: 500 }).then((r) =>
      setItems(((r.data as Record<string, unknown>[]) || []).map((x) => ({ value: x.id as string, label: `${x.sku || ''} - ${x.name || ''}`.trim() || (x.name as string) })))
    );
  }, [empresaId]);

  const ruleColumns: DataTableColumn<RuleRow>[] = [
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
    { key: 'min_qty', label: 'Min', render: (r) => fmtQty(Number(r.min_qty ?? 0)) },
    { key: 'max_qty', label: 'Max', render: (r) => fmtQty(Number(r.max_qty ?? 0)) },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditRule(r); }}
            className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white"
            title="Editar"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(r.id as string); }}
            className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"
            title="Excluir"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const suggestionColumns: DataTableColumn<SuggestionRow>[] = [
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
    { key: 'current_qty', label: 'Atual', render: (r) => fmtQty(Number(r.current_qty ?? 0)) },
    { key: 'min_qty', label: 'Mín', render: (r) => fmtQty(Number(r.min_qty ?? 0)) },
    { key: 'suggested_qty', label: 'Sugerido', render: (r) => fmtQty(Number(r.suggested_qty ?? 0)) },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <ReplenishmentStatusBadge status={(r.status as string) || 'pending'} />,
    },
    {
      key: 'actions',
      label: '',
      render: (r) => {
        const status = r.status as string;
        if (status !== 'pending') return null;
        return (
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); handleApprove(r.id as string); }}
              disabled={saving}
              className="p-1.5 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 disabled:opacity-50"
              title="Aprovar"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleReject(r.id as string); }}
              disabled={saving}
              className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 disabled:opacity-50"
              title="Rejeitar"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  if (!isOpen) return null;

  return (
    <>
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="replenishment-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            <motion.div
              key="replenishment-modal"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-4xl max-h-[90vh] p-4"
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-purple-400" />
                    <div>
                      <h2 className="text-lg font-semibold text-white">Reposição</h2>
                      <p className="text-sm text-slate-400">Regras e sugestões de estoque</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 px-6">
                  <button
                    onClick={() => setActiveTab('rules')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                      activeTab === 'rules'
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    )}
                  >
                    <Settings className="w-4 h-4" />
                    Regras de Reposição
                  </button>
                  <button
                    onClick={() => setActiveTab('suggestions')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                      activeTab === 'suggestions'
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    )}
                  >
                    <Lightbulb className="w-4 h-4" />
                    Sugestões
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'rules' ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-400">Configure min/max e reorder por item e depósito</p>
                        <button
                          onClick={() => { setEditingRuleId(null); form.reset(); setFormOpen(true); }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl"
                        >
                          <Plus className="w-4 h-4" />
                          Nova Regra
                        </button>
                      </div>
                      <DataTable
                        columns={ruleColumns}
                        data={rules}
                        loading={loadingRules}
                        emptyMessage="Nenhuma regra cadastrada"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-400">Sugestões geradas com base nas regras e estoque atual</p>
                        <button
                          onClick={handleGenerate}
                          disabled={generateLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                        >
                          {generateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          Gerar Sugestões
                        </button>
                      </div>
                      <DataTable
                        columns={suggestionColumns}
                        data={suggestions}
                        loading={loadingSuggestions}
                        emptyMessage="Nenhuma sugestão. Clique em Gerar Sugestões."
                      />
                    </div>
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
      onClose={() => { setFormOpen(false); setEditingRuleId(null); form.reset(); }}
      title={editingRuleId ? 'Editar Regra' : 'Nova Regra de Reposição'}
      subtitle="Defina min, max e quantidade de reposição"
      onSubmit={form.handleSubmit(onSubmitRule)}
      loading={saving}
      submitLabel="Salvar"
    >
      <FormSelect form={form} name="item_id" label="Item" options={items} required />
      <FormSelect form={form} name="warehouse_id" label="Depósito" options={warehouses} required />
      <FormInput form={form} name="min_qty" label="Quantidade mínima" type="number" required />
      <FormInput form={form} name="max_qty" label="Quantidade máxima" type="number" required />
      <FormInput form={form} name="reorder_qty" label="Qtd reposição" type="number" />
      <FormInput form={form} name="lead_time_days" label="Lead time (dias)" type="number" />
    </DialogForm>

    <ConfirmDialog
      isOpen={!!deleteConfirmId}
      onClose={() => setDeleteConfirmId(null)}
      onConfirm={handleDeleteRule}
      title="Excluir regra"
      description="Tem certeza que deseja excluir esta regra de reposição?"
      confirmLabel="Excluir"
      cancelLabel="Cancelar"
      variant="danger"
      loading={saving}
    />
    </>
  );
};
