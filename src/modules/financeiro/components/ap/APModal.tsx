'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Filter, TrendingDown, Search, RefreshCw,
  Eye, Edit, DollarSign, Undo2, Paperclip, History, Loader2
} from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import {
  DataTable, DataTableColumn, KPICards, StatusBadge, fmtMoney, fmtDate, isOverdue,
  FilterSheet, FilterField, FilterInput, FilterSelect, FilterDateRange,
  DetailField, DetailMoney,
  DialogForm, FormInput, FormSelect, FormTextarea,
  ConfirmDialog, AttachmentPanel, AuditTimeline,
} from '../shared';

import { apCreateSchema, apPaySchema, type APCreateInput, type APPayInput } from '../../domain/schemas';
import {
  listContasPagar, createContaPagar, updateContaPagar, deleteContaPagar,
  pagarConta, getContaPagar, listAPPayments, getResumoFinanceiro,
  listContasBancarias, listPlanoContas, listCentrosCusto,
  estornarPagamento,
} from '@/app/actions/financeiro';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';

// =====================================================
// AP Modal — Contas a Pagar
// =====================================================

interface APModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SubView = 'list' | 'detail';

export const APModal: React.FC<APModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();

  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState({ total: 0, pago: 0, vencido: 0, saldo: 0 });
  const pageSize = 15;

  const [subView, setSubView] = useState<SubView>('list');
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);
  const [reversePaymentId, setReversePaymentId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);

  const [bankAccounts, setBankAccounts] = useState<Record<string, unknown>[]>([]);
  const [chartAccounts, setChartAccounts] = useState<Record<string, unknown>[]>([]);
  const [costCenters, setCostCenters] = useState<Record<string, unknown>[]>([]);

  const [filters, setFilters] = useState({
    search: '', status: '', data_vencimento_inicio: '', data_vencimento_fim: '',
    data_emissao_inicio: '', data_emissao_fim: '', plano_conta_id: '', centro_custo_id: '',
  });
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const loadData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const result = await listContasPagar(empresaId, {
        page, pageSize, search: filters.search || undefined, status: filters.status || undefined,
        data_vencimento_inicio: filters.data_vencimento_inicio || undefined,
        data_vencimento_fim: filters.data_vencimento_fim || undefined,
        plano_conta_id: filters.plano_conta_id || undefined,
        centro_custo_id: filters.centro_custo_id || undefined,
      });
      setData(result.data);
      setTotal(result.total);
    } catch { /* silently handle */ }
    setLoading(false);
  }, [empresaId, page, filters]);

  const loadKPIs = useCallback(async () => {
    if (!empresaId) return;
    try {
      const hoje = new Date();
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
      const res = await getResumoFinanceiro(empresaId, ini, fim);
      setKpis({ total: res.total_pagar, pago: res.pago, vencido: res.vencidos_pagar, saldo: res.saldo_previsto });
    } catch { /* silently handle */ }
  }, [empresaId]);

  const loadLookups = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [banks, charts, costs] = await Promise.all([
        listContasBancarias(empresaId), listPlanoContas(empresaId), listCentrosCusto(empresaId),
      ]);
      setBankAccounts(banks); setChartAccounts(charts); setCostCenters(costs);
    } catch { /* silently handle */ }
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) { loadData(); loadKPIs(); loadLookups(); }
  }, [isOpen, loadData, loadKPIs, loadLookups]);

  const openDetails = async (item: Record<string, unknown>) => {
    const result = await getContaPagar(item.id as string);
    if (result.data) setSelectedItem(result.data as Record<string, unknown>);
    else setSelectedItem(item);
    const pmts = await listAPPayments(item.id as string);
    setPayments(pmts);
    setSubView('detail');
  };

  // ---- Create ----
  const createForm = useForm<APCreateInput>({
    resolver: zodResolver(apCreateSchema),
    defaultValues: {
      numero_documento: '', descricao: '', valor_original: 0,
      data_emissao: new Date().toISOString().split('T')[0], data_vencimento: '',
      parcela: 1, total_parcelas: 1,
    },
  });

  const handleCreate = async () => {
    if (!empresaId) return;
    const valid = await createForm.trigger();
    if (!valid) return;
    const vals = createForm.getValues();
    const result = await createContaPagar(empresaId, vals);
    if (result.error) { toast.error(result.error); return; }
    toast.success(result.message || 'Criado com sucesso');
    setShowCreateDialog(false); createForm.reset(); loadData(); loadKPIs();
  };

  // ---- Edit ----
  const editForm = useForm<APCreateInput>({ resolver: zodResolver(apCreateSchema) });

  const openEdit = () => {
    if (!selectedItem) return;
    editForm.reset({
      numero_documento: selectedItem.numero_documento as string || '',
      descricao: selectedItem.descricao as string || '',
      valor_original: selectedItem.valor_original as number || 0,
      data_emissao: selectedItem.data_emissao as string || '',
      data_vencimento: selectedItem.data_vencimento as string || '',
      data_competencia: (selectedItem.data_competencia as string) || '',
      fornecedor_id: (selectedItem.fornecedor_id as string) || '',
      plano_conta_id: (selectedItem.plano_conta_id as string) || '',
      centro_custo_id: (selectedItem.centro_custo_id as string) || '',
      parcela: selectedItem.parcela as number || 1,
      total_parcelas: selectedItem.total_parcelas as number || 1,
      observacoes: (selectedItem.observacoes as string) || '',
    });
    setShowEditDialog(true);
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    const valid = await editForm.trigger();
    if (!valid) return;
    const vals = editForm.getValues();
    const result = await updateContaPagar(selectedItem.id as string, vals);
    if (result.error) { toast.error(result.error); return; }
    toast.success(result.message || 'Atualizado');
    setShowEditDialog(false); loadData(); loadKPIs();
    const fresh = await getContaPagar(selectedItem.id as string);
    if (fresh.data) setSelectedItem(fresh.data as Record<string, unknown>);
  };

  // ---- Pay ----
  const payForm = useForm<APPayInput>({ resolver: zodResolver(apPaySchema) });

  const openPay = () => {
    if (!selectedItem) return;
    const remaining = (selectedItem.valor_original as number || 0) - (selectedItem.valor_pago as number || 0);
    payForm.reset({
      conta_pagar_id: selectedItem.id as string,
      conta_bancaria_id: '',
      data_pagamento: new Date().toISOString().split('T')[0],
      valor_pago: remaining > 0 ? remaining : 0,
      valor_juros: 0, valor_multa: 0, valor_desconto: 0,
    });
    setShowPayDialog(true);
  };

  const handlePay = async () => {
    if (!selectedItem) return;
    const valid = await payForm.trigger();
    if (!valid) return;
    const vals = payForm.getValues();
    const result = await pagarConta(selectedItem.id as string, {
      data_pagamento: vals.data_pagamento,
      valor_pago: vals.valor_pago,
      conta_bancaria_id: vals.conta_bancaria_id,
      valor_juros: vals.valor_juros,
      valor_multa: vals.valor_multa,
      valor_desconto: vals.valor_desconto,
      observacoes: vals.observacoes,
    });
    if (result.error) { toast.error(result.error); return; }
    toast.success(result.message || 'Pagamento registrado');
    setShowPayDialog(false); loadData(); loadKPIs();
    const fresh = await getContaPagar(selectedItem.id as string);
    if (fresh.data) setSelectedItem(fresh.data as Record<string, unknown>);
    const pmts = await listAPPayments(selectedItem.id as string);
    setPayments(pmts);
  };

  // ---- Delete ----
  const handleDelete = async () => {
    if (!selectedItem) return;
    const result = await deleteContaPagar(selectedItem.id as string);
    if (result.error) { toast.error(result.error); return; }
    toast.success(result.message || 'Excluído');
    setShowDeleteConfirm(false); setSubView('list'); setSelectedItem(null); loadData(); loadKPIs();
  };

  // ---- Reverse ----
  const handleReverse = async () => {
    if (!reversePaymentId) return;
    const result = await estornarPagamento(reversePaymentId, 'Estorno solicitado pelo usuário');
    if (result.error) { toast.error(result.error); return; }
    toast.success(result.message || 'Estorno realizado');
    setShowReverseConfirm(false); setReversePaymentId(null); loadData(); loadKPIs();
    if (selectedItem) {
      const fresh = await getContaPagar(selectedItem.id as string);
      if (fresh.data) setSelectedItem(fresh.data as Record<string, unknown>);
      const pmts = await listAPPayments(selectedItem.id as string);
      setPayments(pmts);
    }
  };

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    {
      key: 'descricao', label: 'Descrição', sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate max-w-[200px]">{(row.descricao as string) || (row.numero_documento as string)}</p>
          {row.numero_documento && <p className="text-xs text-slate-500">Doc: {row.numero_documento as string}</p>}
        </div>
      ),
    },
    {
      key: 'fornecedor', label: 'Fornecedor',
      render: (row) => {
        const f = row.fornecedor as { razao_social?: string } | null;
        return <span className="text-sm text-slate-300">{f?.razao_social || '—'}</span>;
      },
    },
    { key: 'data_vencimento', label: 'Vencimento', sortable: true, width: '110px', render: (row) => <span className="text-sm text-slate-300">{fmtDate(row.data_vencimento as string)}</span> },
    { key: 'valor_original', label: 'Valor', sortable: true, align: 'right', width: '130px', render: (row) => <span className="text-sm font-semibold text-white">{fmtMoney(row.valor_original as number)}</span> },
    {
      key: 'valor_pago', label: 'Pago', align: 'right', width: '130px',
      render: (row) => {
        const v = row.valor_pago as number || 0;
        return v > 0 ? <span className="text-sm text-emerald-400">{fmtMoney(v)}</span> : <span className="text-sm text-slate-500">—</span>;
      },
    },
    { key: 'status', label: 'Status', width: '100px', render: (row) => <StatusBadge status={row.status as string} overdue={isOverdue(row.data_vencimento as string, row.status as string)} /> },
  ];

  if (!isOpen) return null;

  return (
    <>
      <Portal>
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-6xl p-4">
            <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10"><TrendingDown className="w-5 h-5 text-red-400" /></div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Contas a Pagar</h2>
                    <p className="text-xs text-slate-400">Gestão de despesas e pagamentos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {subView === 'detail' && (
                    <button onClick={() => { setSubView('list'); setSelectedItem(null); }} className="text-sm text-purple-400 hover:text-purple-300 mr-2">← Voltar</button>
                  )}
                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                {subView === 'list' ? (
                  <>
                    <KPICards items={[
                      { label: 'Total a Pagar', value: fmtMoney(kpis.total), color: 'red' },
                      { label: 'Pago no Mês', value: fmtMoney(kpis.pago), color: 'blue' },
                      { label: 'Vencido', value: fmtMoney(kpis.vencido), color: 'amber' },
                      { label: 'Saldo Previsto', value: fmtMoney(kpis.saldo), color: 'purple' },
                    ]} />

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input type="text" value={filters.search} onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Buscar por descrição..." className="w-full pl-10 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50" />
                      </div>
                      <button onClick={() => setShowFilterSheet(true)} className={cn('flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl border transition-colors', hasActiveFilters ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-[#252d3d] border-white/10 text-slate-400 hover:text-white')}>
                        <Filter className="w-4 h-4" /> Filtros {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-purple-400" />}
                      </button>
                      <button onClick={() => { loadData(); loadKPIs(); }} className="p-2.5 bg-[#252d3d] border border-white/10 rounded-xl hover:bg-[#2d3548] transition-colors"><RefreshCw className="w-4 h-4 text-slate-400" /></button>
                      <button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors">
                        <Plus className="w-4 h-4" /> Nova Despesa
                      </button>
                    </div>

                    <DataTable columns={columns} data={data} loading={loading} page={page} pageSize={pageSize} total={total} onPageChange={setPage} onRowClick={openDetails} emptyMessage="Nenhuma conta a pagar encontrada" emptyIcon={TrendingDown} />
                  </>
                ) : selectedItem ? (
                  <APDetailView
                    item={selectedItem}
                    payments={payments}
                    empresaId={empresaId || ''}
                    onEdit={openEdit}
                    onPay={openPay}
                    onDelete={() => setShowDeleteConfirm(true)}
                    onReversePayment={(id) => { setReversePaymentId(id); setShowReverseConfirm(true); }}
                  />
                ) : null}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </Portal>

      {/* Filter Sheet */}
      <FilterSheet isOpen={showFilterSheet} onClose={() => setShowFilterSheet(false)} onApply={() => { setPage(1); loadData(); }} onReset={() => { setFilters({ search: '', status: '', data_vencimento_inicio: '', data_vencimento_fim: '', data_emissao_inicio: '', data_emissao_fim: '', plano_conta_id: '', centro_custo_id: '' }); setPage(1); }} hasActiveFilters={hasActiveFilters}>
        <FilterField label="Status"><FilterSelect value={filters.status} onChange={(v) => setFilters(f => ({ ...f, status: v }))} options={[{ value: '', label: 'Todos' }, { value: 'aberta', label: 'Abertas' }, { value: 'parcial', label: 'Parciais' }, { value: 'paga', label: 'Pagas' }, { value: 'vencida', label: 'Vencidas' }, { value: 'cancelada', label: 'Canceladas' }]} /></FilterField>
        <FilterField label="Vencimento"><FilterDateRange startValue={filters.data_vencimento_inicio} endValue={filters.data_vencimento_fim} onStartChange={(v) => setFilters(f => ({ ...f, data_vencimento_inicio: v }))} onEndChange={(v) => setFilters(f => ({ ...f, data_vencimento_fim: v }))} /></FilterField>
        <FilterField label="Plano de Conta"><FilterSelect value={filters.plano_conta_id} onChange={(v) => setFilters(f => ({ ...f, plano_conta_id: v }))} options={[{ value: '', label: 'Todos' }, ...chartAccounts.filter(c => (c.tipo as string) === 'despesa').map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} /></FilterField>
        <FilterField label="Centro de Custo"><FilterSelect value={filters.centro_custo_id} onChange={(v) => setFilters(f => ({ ...f, centro_custo_id: v }))} options={[{ value: '', label: 'Todos' }, ...costCenters.map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} /></FilterField>
      </FilterSheet>

      {/* Create Dialog */}
      <DialogForm isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} title="Nova Conta a Pagar" onSubmit={handleCreate} loading={createForm.formState.isSubmitting} submitLabel="Criar" variant="danger">
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={createForm} name="numero_documento" label="Nº Documento" required placeholder="NF-001" />
          <FormInput form={createForm} name="valor_original" label="Valor" type="number" required placeholder="0.00" />
        </div>
        <FormInput form={createForm} name="descricao" label="Descrição" required placeholder="Descrição da despesa" />
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={createForm} name="data_emissao" label="Data Emissão" type="date" required />
          <FormInput form={createForm} name="data_vencimento" label="Data Vencimento" type="date" required />
        </div>
        <FormSelect form={createForm} name="plano_conta_id" label="Plano de Conta" options={[{ value: '', label: 'Selecione...' }, ...chartAccounts.filter(c => (c.tipo as string) === 'despesa').map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} />
        <FormSelect form={createForm} name="centro_custo_id" label="Centro de Custo" options={[{ value: '', label: 'Selecione...' }, ...costCenters.map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} />
        <FormTextarea form={createForm} name="observacoes" label="Observações" />
      </DialogForm>

      {/* Edit Dialog */}
      <DialogForm isOpen={showEditDialog} onClose={() => setShowEditDialog(false)} title="Editar Conta a Pagar" onSubmit={handleEdit} loading={editForm.formState.isSubmitting} submitLabel="Salvar">
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={editForm} name="numero_documento" label="Nº Documento" required />
          <FormInput form={editForm} name="valor_original" label="Valor" type="number" required />
        </div>
        <FormInput form={editForm} name="descricao" label="Descrição" required />
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={editForm} name="data_emissao" label="Data Emissão" type="date" required />
          <FormInput form={editForm} name="data_vencimento" label="Data Vencimento" type="date" required />
        </div>
        <FormSelect form={editForm} name="plano_conta_id" label="Plano de Conta" options={[{ value: '', label: 'Selecione...' }, ...chartAccounts.filter(c => (c.tipo as string) === 'despesa').map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} />
        <FormTextarea form={editForm} name="observacoes" label="Observações" />
      </DialogForm>

      {/* Pay Dialog */}
      <DialogForm isOpen={showPayDialog} onClose={() => setShowPayDialog(false)} title="Registrar Pagamento" subtitle={selectedItem ? `${selectedItem.numero_documento} — ${selectedItem.descricao}` : ''} onSubmit={handlePay} loading={payForm.formState.isSubmitting} submitLabel="Confirmar Pagamento" variant="danger">
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Valor original:</span>
            <span className="text-white font-semibold">{selectedItem ? fmtMoney(selectedItem.valor_original as number) : '—'}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-400">Já pago:</span>
            <span className="text-emerald-400 font-semibold">{selectedItem ? fmtMoney(selectedItem.valor_pago as number || 0) : '—'}</span>
          </div>
          <div className="flex justify-between text-sm mt-1 pt-1 border-t border-red-500/20">
            <span className="text-slate-400">Saldo restante:</span>
            <span className="text-white font-bold">{selectedItem ? fmtMoney((selectedItem.valor_original as number) - (selectedItem.valor_pago as number || 0)) : '—'}</span>
          </div>
        </div>
        <FormSelect form={payForm} name="conta_bancaria_id" label="Conta Bancária" required options={[{ value: '', label: 'Selecione...' }, ...bankAccounts.map(b => ({ value: b.id as string, label: `${b.banco_nome} - Ag: ${b.agencia} C/C: ${b.conta}` }))]} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={payForm} name="data_pagamento" label="Data Pagamento" type="date" required />
          <FormInput form={payForm} name="valor_pago" label="Valor Pago" type="number" required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormInput form={payForm} name="valor_juros" label="Juros" type="number" />
          <FormInput form={payForm} name="valor_multa" label="Multa" type="number" />
          <FormInput form={payForm} name="valor_desconto" label="Desconto" type="number" />
        </div>
        <FormTextarea form={payForm} name="observacoes" label="Observações" />
      </DialogForm>

      <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete} title="Excluir Conta a Pagar" description={`Tem certeza que deseja excluir "${selectedItem?.descricao || selectedItem?.numero_documento}"?`} confirmLabel="Excluir" variant="danger" />
      <ConfirmDialog isOpen={showReverseConfirm} onClose={() => { setShowReverseConfirm(false); setReversePaymentId(null); }} onConfirm={handleReverse} title="Estornar Pagamento" description="O estorno irá reverter o valor pago e ajustar o saldo da conta bancária." confirmLabel="Estornar" variant="warning" />
    </>
  );
};

// =====================================================
// AP Detail View
// =====================================================

const APDetailView: React.FC<{
  item: Record<string, unknown>;
  payments: Record<string, unknown>[];
  empresaId: string;
  onEdit: () => void;
  onPay: () => void;
  onDelete: () => void;
  onReversePayment: (id: string) => void;
}> = ({ item, payments, empresaId, onEdit, onPay, onDelete, onReversePayment }) => {
  const [tab, setTab] = useState<'info' | 'payments' | 'attachments' | 'audit'>('info');
  const status = item.status as string;
  const canEdit = status === 'aberta' || status === 'parcial';
  const canPay = status === 'aberta' || status === 'parcial';
  const canDelete = status === 'aberta';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {canEdit && <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#252d3d] hover:bg-[#2d3548] text-white border border-white/10 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /> Editar</button>}
        {canPay && <button onClick={onPay} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"><DollarSign className="w-3.5 h-3.5" /> Registrar Pagamento</button>}
        {canDelete && <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"><X className="w-3.5 h-3.5" /> Excluir</button>}
        <StatusBadge status={status} overdue={isOverdue(item.data_vencimento as string, status)} />
      </div>

      <div className="flex gap-1 border-b border-white/[0.06]">
        {[
          { key: 'info', label: 'Informações', icon: Eye },
          { key: 'payments', label: `Pagamentos (${payments.length})`, icon: DollarSign },
          { key: 'attachments', label: 'Anexos', icon: Paperclip },
          { key: 'audit', label: 'Histórico', icon: History },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)} className={cn('flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors', tab === t.key ? 'border-purple-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300')}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/[0.06] bg-[#111827]/50 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Dados do Título</h4>
              <DetailField label="Nº Documento" value={item.numero_documento as string} />
              <DetailField label="Descrição" value={item.descricao as string} />
              <DetailField label="Fornecedor" value={(item.fornecedor as { razao_social?: string })?.razao_social} />
              <DetailField label="Parcela" value={`${item.parcela || 1}/${item.total_parcelas || 1}`} />
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#111827]/50 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Datas</h4>
              <DetailField label="Emissão" value={fmtDate(item.data_emissao as string)} />
              <DetailField label="Vencimento" value={fmtDate(item.data_vencimento as string)} />
              <DetailField label="Pagamento" value={fmtDate(item.data_pagamento as string || '')} />
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#111827]/50 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase">Valores</h4>
            <DetailMoney label="Valor Original" value={item.valor_original as number || 0} />
            <DetailMoney label="Juros" value={item.valor_juros as number || 0} />
            <DetailMoney label="Multa" value={item.valor_multa as number || 0} />
            <DetailMoney label="Desconto" value={item.valor_desconto as number || 0} color="negative" />
            <div className="border-t border-white/[0.06] pt-2 mt-2">
              <DetailMoney label="Pago" value={item.valor_pago as number || 0} color="positive" />
              <DetailMoney label="Saldo Restante" value={(item.valor_original as number || 0) - (item.valor_pago as number || 0)} />
            </div>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-2">
          {payments.length === 0 ? (
            <div className="text-center py-8"><DollarSign className="w-8 h-8 text-slate-600 mx-auto mb-2" /><p className="text-sm text-slate-500">Nenhum pagamento registrado</p></div>
          ) : payments.map(p => (
            <div key={p.id as string} className={cn('p-3 rounded-xl border', p.estornado ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/[0.06] bg-[#111827]/50')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{fmtMoney(p.valor_pago as number)} {p.estornado && <span className="text-xs text-amber-400 ml-2">(Estornado)</span>}</p>
                  <p className="text-xs text-slate-500">{fmtDate(p.data_pagamento as string)}</p>
                </div>
                {!p.estornado && <button onClick={() => onReversePayment(p.id as string)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"><Undo2 className="w-3 h-3" /> Estornar</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'attachments' && <AttachmentPanel empresaId={empresaId} entityType="contas_pagar" entityId={item.id as string} />}
      {tab === 'audit' && <AuditTimeline entityType="contas_pagar" entityId={item.id as string} />}
    </div>
  );
};
