'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Filter, TrendingUp, Search, RefreshCw, Download, Upload,
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
  DetailsDrawer, DetailSection, DetailField, DetailMoney,
  DialogForm, FormInput, FormSelect, FormTextarea,
  ConfirmDialog, AttachmentPanel, AuditTimeline,
} from '../shared';

import { arCreateSchema, arReceiveSchema, type ARCreateInput, type ARReceiveInput } from '../../domain/schemas';
import {
  listContasReceber, createContaReceber, updateContaReceber, deleteContaReceber,
  receberConta, getContaReceber, listARReceipts, getResumoFinanceiro,
  listContasBancarias, listPlanoContas, listCentrosCusto,
  estornarRecebimento,
} from '@/app/actions/financeiro';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';

// =====================================================
// AR Modal — Contas a Receber
// =====================================================

interface ARModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SubView = 'list' | 'detail';

export const ARModal: React.FC<ARModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();

  // Data state
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState({ total: 0, recebido: 0, vencido: 0, saldo: 0 });
  const pageSize = 15;

  // Subview/dialogs state
  const [subView, setSubView] = useState<SubView>('list');
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);
  const [reverseReceiptId, setReverseReceiptId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, unknown>[]>([]);

  // Lookups
  const [bankAccounts, setBankAccounts] = useState<Record<string, unknown>[]>([]);
  const [chartAccounts, setChartAccounts] = useState<Record<string, unknown>[]>([]);
  const [costCenters, setCostCenters] = useState<Record<string, unknown>[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    search: '', status: '', data_vencimento_inicio: '', data_vencimento_fim: '',
    data_emissao_inicio: '', data_emissao_fim: '', plano_conta_id: '', centro_custo_id: '',
  });
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // ---- Load Data ----
  const loadData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const result = await listContasReceber(empresaId, {
        page, pageSize, search: filters.search || undefined, status: filters.status || undefined,
        data_vencimento_inicio: filters.data_vencimento_inicio || undefined,
        data_vencimento_fim: filters.data_vencimento_fim || undefined,
        data_emissao_inicio: filters.data_emissao_inicio || undefined,
        data_emissao_fim: filters.data_emissao_fim || undefined,
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
      setKpis({ total: res.total_receber, recebido: res.recebido, vencido: res.vencidos_receber, saldo: res.saldo_previsto });
    } catch { /* silently handle */ }
  }, [empresaId]);

  const loadLookups = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [banks, charts, costs] = await Promise.all([
        listContasBancarias(empresaId),
        listPlanoContas(empresaId),
        listCentrosCusto(empresaId),
      ]);
      setBankAccounts(banks);
      setChartAccounts(charts);
      setCostCenters(costs);
    } catch { /* silently handle */ }
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) { loadData(); loadKPIs(); loadLookups(); }
  }, [isOpen, loadData, loadKPIs, loadLookups]);

  // ---- Details ----
  const openDetails = async (item: Record<string, unknown>) => {
    const result = await getContaReceber(item.id as string);
    if (result.data) setSelectedItem(result.data as Record<string, unknown>);
    else setSelectedItem(item);
    const rcpts = await listARReceipts(item.id as string);
    setReceipts(rcpts);
    setSubView('detail');
  };

  // ---- Create ----
  const createForm = useForm<ARCreateInput>({
    resolver: zodResolver(arCreateSchema),
    defaultValues: {
      numero_documento: '', descricao: '', valor_original: 0,
      data_emissao: new Date().toISOString().split('T')[0], data_vencimento: '',
      parcela: 1, total_parcelas: 1, observacoes: '',
    },
  });

  const handleCreate = async () => {
    if (!empresaId) return;
    const valid = await createForm.trigger();
    if (!valid) return;
    const vals = createForm.getValues();
    const result = await createContaReceber(empresaId, vals);
    if (result.error) { toast.error(result.error); return; }
    toast.success(result.message || 'Criado com sucesso');
    setShowCreateDialog(false);
    createForm.reset();
    loadData();
    loadKPIs();
  };

  // ---- Edit ----
  const editForm = useForm<ARCreateInput>({
    resolver: zodResolver(arCreateSchema),
  });

  const openEdit = () => {
    if (!selectedItem) return;
    editForm.reset({
      numero_documento: selectedItem.numero_documento as string || '',
      descricao: selectedItem.descricao as string || '',
      valor_original: selectedItem.valor_original as number || 0,
      data_emissao: selectedItem.data_emissao as string || '',
      data_vencimento: selectedItem.data_vencimento as string || '',
      data_competencia: (selectedItem.data_competencia as string) || '',
      cliente_id: (selectedItem.cliente_id as string) || '',
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
    const result = await updateContaReceber(selectedItem.id as string, vals);
    if (result.error) { toast.error(result.error); return; }
    toast.success(result.message || 'Atualizado com sucesso');
    setShowEditDialog(false);
    loadData();
    loadKPIs();
    // Refresh details
    const fresh = await getContaReceber(selectedItem.id as string);
    if (fresh.data) setSelectedItem(fresh.data as Record<string, unknown>);
  };

  // ---- Receive ----
  const receiveForm = useForm<ARReceiveInput>({
    resolver: zodResolver(arReceiveSchema),
  });

  const openReceive = () => {
    if (!selectedItem) return;
    const remaining = (selectedItem.valor_original as number || 0) - (selectedItem.valor_recebido as number || 0);
    receiveForm.reset({
      conta_receber_id: selectedItem.id as string,
      conta_bancaria_id: '',
      data_recebimento: new Date().toISOString().split('T')[0],
      valor_recebido: remaining > 0 ? remaining : 0,
      valor_juros: 0, valor_multa: 0, valor_desconto: 0,
    });
    setShowReceiveDialog(true);
  };

  const handleReceive = async () => {
    if (!selectedItem) return;
    const valid = await receiveForm.trigger();
    if (!valid) return;
    const vals = receiveForm.getValues();
    const result = await receberConta(selectedItem.id as string, {
      data_recebimento: vals.data_recebimento,
      valor_recebido: vals.valor_recebido,
      conta_bancaria_id: vals.conta_bancaria_id,
      valor_juros: vals.valor_juros,
      valor_multa: vals.valor_multa,
      valor_desconto: vals.valor_desconto,
      observacoes: vals.observacoes,
    });
    if (result.error) { toast.error(result.error); return; }
    toast.success(result.message || 'Recebimento registrado');
    setShowReceiveDialog(false);
    loadData();
    loadKPIs();
    const fresh = await getContaReceber(selectedItem.id as string);
    if (fresh.data) setSelectedItem(fresh.data as Record<string, unknown>);
    const rcpts = await listARReceipts(selectedItem.id as string);
    setReceipts(rcpts);
  };

  // ---- Delete ----
  const handleDelete = async () => {
    if (!selectedItem) return;
    const result = await deleteContaReceber(selectedItem.id as string);
    if (result.error) { toast.error(result.error); return; }
    toast.success(result.message || 'Excluído com sucesso');
    setShowDeleteConfirm(false);
    setSubView('list');
    setSelectedItem(null);
    loadData();
    loadKPIs();
  };

  // ---- Reverse receipt ----
  const handleReverse = async () => {
    if (!reverseReceiptId) return;
    const result = await estornarRecebimento(reverseReceiptId, 'Estorno solicitado pelo usuário');
    if (result.error) { toast.error(result.error); return; }
    toast.success(result.message || 'Estorno realizado');
    setShowReverseConfirm(false);
    setReverseReceiptId(null);
    loadData();
    loadKPIs();
    if (selectedItem) {
      const fresh = await getContaReceber(selectedItem.id as string);
      if (fresh.data) setSelectedItem(fresh.data as Record<string, unknown>);
      const rcpts = await listARReceipts(selectedItem.id as string);
      setReceipts(rcpts);
    }
  };

  // ---- Table columns ----
  const columns: DataTableColumn<Record<string, unknown>>[] = [
    {
      key: 'descricao', label: 'Descrição', sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate max-w-[200px]">
            {(row.descricao as string) || (row.numero_documento as string)}
          </p>
          {row.numero_documento && (
            <p className="text-xs text-slate-500">Doc: {row.numero_documento as string}</p>
          )}
        </div>
      ),
    },
    {
      key: 'cliente', label: 'Cliente',
      render: (row) => {
        const c = row.cliente as { nome?: string } | null;
        return <span className="text-sm text-slate-300">{c?.nome || '—'}</span>;
      },
    },
    {
      key: 'data_vencimento', label: 'Vencimento', sortable: true, width: '110px',
      render: (row) => <span className="text-sm text-slate-300">{fmtDate(row.data_vencimento as string)}</span>,
    },
    {
      key: 'valor_original', label: 'Valor', sortable: true, align: 'right', width: '130px',
      render: (row) => <span className="text-sm font-semibold text-white">{fmtMoney(row.valor_original as number)}</span>,
    },
    {
      key: 'valor_recebido', label: 'Recebido', align: 'right', width: '130px',
      render: (row) => {
        const v = row.valor_recebido as number || 0;
        return v > 0 ? <span className="text-sm text-emerald-400">{fmtMoney(v)}</span> : <span className="text-sm text-slate-500">—</span>;
      },
    },
    {
      key: 'status', label: 'Status', width: '100px',
      render: (row) => (
        <StatusBadge
          status={row.status as string}
          overdue={isOverdue(row.data_vencimento as string, row.status as string)}
        />
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <Portal>
        <AnimatePresence>
          <motion.div key="ar-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" />
          <motion.div
            key="ar-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-6xl p-4"
          >
            <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Contas a Receber</h2>
                    <p className="text-xs text-slate-400">Gestão de receitas e recebimentos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {subView === 'detail' && (
                    <button onClick={() => { setSubView('list'); setSelectedItem(null); }} className="text-sm text-purple-400 hover:text-purple-300 mr-2">
                      ← Voltar
                    </button>
                  )}
                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                {subView === 'list' ? (
                  <>
                    {/* KPIs */}
                    <KPICards items={[
                      { label: 'Total a Receber', value: fmtMoney(kpis.total), color: 'emerald' },
                      { label: 'Recebido no Mês', value: fmtMoney(kpis.recebido), color: 'blue' },
                      { label: 'Vencido', value: fmtMoney(kpis.vencido), color: 'red' },
                      { label: 'Saldo Previsto', value: fmtMoney(kpis.saldo), color: 'purple' },
                    ]} />

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={filters.search}
                          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                          placeholder="Buscar por descrição..."
                          className="w-full pl-10 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                      <button
                        onClick={() => setShowFilterSheet(true)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl border transition-colors',
                          hasActiveFilters
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                            : 'bg-[#252d3d] border-white/10 text-slate-400 hover:text-white'
                        )}
                      >
                        <Filter className="w-4 h-4" />
                        Filtros
                        {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-purple-400" />}
                      </button>
                      <button onClick={() => { loadData(); loadKPIs(); }} className="p-2.5 bg-[#252d3d] border border-white/10 rounded-xl hover:bg-[#2d3548] transition-colors">
                        <RefreshCw className="w-4 h-4 text-slate-400" />
                      </button>
                      <button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors">
                        <Plus className="w-4 h-4" /> Nova Receita
                      </button>
                    </div>

                    {/* Table */}
                    <DataTable
                      columns={columns}
                      data={data}
                      loading={loading}
                      page={page}
                      pageSize={pageSize}
                      total={total}
                      onPageChange={setPage}
                      onRowClick={openDetails}
                      emptyMessage="Nenhuma conta a receber encontrada"
                      emptyIcon={TrendingUp}
                    />
                  </>
                ) : selectedItem ? (
                  /* Detail subview - rendered inline */
                  <ARDetailView
                    item={selectedItem}
                    receipts={receipts}
                    empresaId={empresaId || ''}
                    onEdit={openEdit}
                    onReceive={openReceive}
                    onDelete={() => setShowDeleteConfirm(true)}
                    onReverseReceipt={(id) => { setReverseReceiptId(id); setShowReverseConfirm(true); }}
                  />
                ) : null}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </Portal>

      {/* Filter Sheet */}
      <FilterSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        onApply={() => { setPage(1); loadData(); }}
        onReset={() => { setFilters({ search: '', status: '', data_vencimento_inicio: '', data_vencimento_fim: '', data_emissao_inicio: '', data_emissao_fim: '', plano_conta_id: '', centro_custo_id: '' }); setPage(1); }}
        hasActiveFilters={hasActiveFilters}
      >
        <FilterField label="Status">
          <FilterSelect value={filters.status} onChange={(v) => setFilters(f => ({ ...f, status: v }))} options={[
            { value: '', label: 'Todos' }, { value: 'aberta', label: 'Abertas' }, { value: 'parcial', label: 'Parciais' },
            { value: 'recebida', label: 'Recebidas' }, { value: 'vencida', label: 'Vencidas' }, { value: 'cancelada', label: 'Canceladas' },
          ]} />
        </FilterField>
        <FilterField label="Vencimento">
          <FilterDateRange startValue={filters.data_vencimento_inicio} endValue={filters.data_vencimento_fim} onStartChange={(v) => setFilters(f => ({ ...f, data_vencimento_inicio: v }))} onEndChange={(v) => setFilters(f => ({ ...f, data_vencimento_fim: v }))} />
        </FilterField>
        <FilterField label="Emissão">
          <FilterDateRange startValue={filters.data_emissao_inicio} endValue={filters.data_emissao_fim} onStartChange={(v) => setFilters(f => ({ ...f, data_emissao_inicio: v }))} onEndChange={(v) => setFilters(f => ({ ...f, data_emissao_fim: v }))} />
        </FilterField>
        <FilterField label="Plano de Conta">
          <FilterSelect value={filters.plano_conta_id} onChange={(v) => setFilters(f => ({ ...f, plano_conta_id: v }))} options={[{ value: '', label: 'Todos' }, ...chartAccounts.map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} />
        </FilterField>
        <FilterField label="Centro de Custo">
          <FilterSelect value={filters.centro_custo_id} onChange={(v) => setFilters(f => ({ ...f, centro_custo_id: v }))} options={[{ value: '', label: 'Todos' }, ...costCenters.map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} />
        </FilterField>
      </FilterSheet>

      {/* Create Dialog */}
      <DialogForm isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} title="Nova Conta a Receber" onSubmit={handleCreate} loading={createForm.formState.isSubmitting} submitLabel="Criar" variant="success">
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={createForm} name="numero_documento" label="Nº Documento" required placeholder="NF-001" />
          <FormInput form={createForm} name="valor_original" label="Valor" type="number" required placeholder="0.00" />
        </div>
        <FormInput form={createForm} name="descricao" label="Descrição" required placeholder="Descrição da receita" />
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={createForm} name="data_emissao" label="Data Emissão" type="date" required />
          <FormInput form={createForm} name="data_vencimento" label="Data Vencimento" type="date" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={createForm} name="data_competencia" label="Data Competência" type="date" />
          <div className="grid grid-cols-2 gap-2">
            <FormInput form={createForm} name="parcela" label="Parcela" type="number" />
            <FormInput form={createForm} name="total_parcelas" label="Total Parc." type="number" />
          </div>
        </div>
        <FormSelect form={createForm} name="plano_conta_id" label="Plano de Conta" options={[{ value: '', label: 'Selecione...' }, ...chartAccounts.filter(c => (c.tipo as string) === 'receita').map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} />
        <FormSelect form={createForm} name="centro_custo_id" label="Centro de Custo" options={[{ value: '', label: 'Selecione...' }, ...costCenters.map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} />
        <FormTextarea form={createForm} name="observacoes" label="Observações" placeholder="Observações adicionais..." />
      </DialogForm>

      {/* Edit Dialog */}
      <DialogForm isOpen={showEditDialog} onClose={() => setShowEditDialog(false)} title="Editar Conta a Receber" onSubmit={handleEdit} loading={editForm.formState.isSubmitting} submitLabel="Salvar Alterações">
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={editForm} name="numero_documento" label="Nº Documento" required />
          <FormInput form={editForm} name="valor_original" label="Valor" type="number" required />
        </div>
        <FormInput form={editForm} name="descricao" label="Descrição" required />
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={editForm} name="data_emissao" label="Data Emissão" type="date" required />
          <FormInput form={editForm} name="data_vencimento" label="Data Vencimento" type="date" required />
        </div>
        <FormSelect form={editForm} name="plano_conta_id" label="Plano de Conta" options={[{ value: '', label: 'Selecione...' }, ...chartAccounts.filter(c => (c.tipo as string) === 'receita').map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} />
        <FormSelect form={editForm} name="centro_custo_id" label="Centro de Custo" options={[{ value: '', label: 'Selecione...' }, ...costCenters.map(c => ({ value: c.id as string, label: `${c.codigo} - ${c.descricao}` }))]} />
        <FormTextarea form={editForm} name="observacoes" label="Observações" />
      </DialogForm>

      {/* Receive Dialog */}
      <DialogForm isOpen={showReceiveDialog} onClose={() => setShowReceiveDialog(false)} title="Registrar Recebimento" subtitle={selectedItem ? `${selectedItem.numero_documento} — ${selectedItem.descricao}` : ''} onSubmit={handleReceive} loading={receiveForm.formState.isSubmitting} submitLabel="Confirmar Recebimento" variant="success">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Valor original:</span>
            <span className="text-white font-semibold">{selectedItem ? fmtMoney(selectedItem.valor_original as number) : '—'}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-400">Já recebido:</span>
            <span className="text-emerald-400 font-semibold">{selectedItem ? fmtMoney(selectedItem.valor_recebido as number || 0) : '—'}</span>
          </div>
          <div className="flex justify-between text-sm mt-1 pt-1 border-t border-emerald-500/20">
            <span className="text-slate-400">Saldo restante:</span>
            <span className="text-white font-bold">{selectedItem ? fmtMoney((selectedItem.valor_original as number) - (selectedItem.valor_recebido as number || 0)) : '—'}</span>
          </div>
        </div>
        <FormSelect form={receiveForm} name="conta_bancaria_id" label="Conta Bancária" required options={[{ value: '', label: 'Selecione...' }, ...bankAccounts.map(b => ({ value: b.id as string, label: `${b.banco_nome} - Ag: ${b.agencia} C/C: ${b.conta}` }))]} />
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={receiveForm} name="data_recebimento" label="Data Recebimento" type="date" required />
          <FormInput form={receiveForm} name="valor_recebido" label="Valor Recebido" type="number" required />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormInput form={receiveForm} name="valor_juros" label="Juros" type="number" />
          <FormInput form={receiveForm} name="valor_multa" label="Multa" type="number" />
          <FormInput form={receiveForm} name="valor_desconto" label="Desconto" type="number" />
        </div>
        <FormTextarea form={receiveForm} name="observacoes" label="Observações" />
      </DialogForm>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Excluir Conta a Receber"
        description={`Tem certeza que deseja excluir "${selectedItem?.descricao || selectedItem?.numero_documento}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
      />

      {/* Reverse Receipt Confirm */}
      <ConfirmDialog
        isOpen={showReverseConfirm}
        onClose={() => { setShowReverseConfirm(false); setReverseReceiptId(null); }}
        onConfirm={handleReverse}
        title="Estornar Recebimento"
        description="O estorno irá reverter o valor recebido e ajustar o saldo da conta bancária. Deseja continuar?"
        confirmLabel="Estornar"
        variant="warning"
      />
    </>
  );
};

// =====================================================
// AR Detail View (inline within modal)
// =====================================================

const ARDetailView: React.FC<{
  item: Record<string, unknown>;
  receipts: Record<string, unknown>[];
  empresaId: string;
  onEdit: () => void;
  onReceive: () => void;
  onDelete: () => void;
  onReverseReceipt: (id: string) => void;
}> = ({ item, receipts, empresaId, onEdit, onReceive, onDelete, onReverseReceipt }) => {
  const [tab, setTab] = useState<'info' | 'receipts' | 'attachments' | 'audit'>('info');
  const status = item.status as string;
  const canEdit = status === 'aberta' || status === 'parcial';
  const canReceive = status === 'aberta' || status === 'parcial';
  const canDelete = status === 'aberta';

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {canEdit && (
          <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#252d3d] hover:bg-[#2d3548] text-white border border-white/10 rounded-lg transition-colors">
            <Edit className="w-3.5 h-3.5" /> Editar
          </button>
        )}
        {canReceive && (
          <button onClick={onReceive} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
            <DollarSign className="w-3.5 h-3.5" /> Registrar Recebimento
          </button>
        )}
        {canDelete && (
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" /> Excluir
          </button>
        )}
        <StatusBadge status={status} overdue={isOverdue(item.data_vencimento as string, status)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {[
          { key: 'info', label: 'Informações', icon: Eye },
          { key: 'receipts', label: `Baixas (${receipts.length})`, icon: DollarSign },
          { key: 'attachments', label: 'Anexos', icon: Paperclip },
          { key: 'audit', label: 'Histórico', icon: History },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors',
              tab === t.key
                ? 'border-purple-400 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            )}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/[0.06] bg-[#111827]/50 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Dados do Título</h4>
              <DetailField label="Nº Documento" value={item.numero_documento as string} />
              <DetailField label="Descrição" value={item.descricao as string} />
              <DetailField label="Cliente" value={(item.cliente as { nome?: string })?.nome} />
              <DetailField label="Parcela" value={`${item.parcela || 1}/${item.total_parcelas || 1}`} />
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#111827]/50 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Datas</h4>
              <DetailField label="Emissão" value={fmtDate(item.data_emissao as string)} />
              <DetailField label="Vencimento" value={fmtDate(item.data_vencimento as string)} />
              <DetailField label="Competência" value={fmtDate(item.data_competencia as string || '')} />
              <DetailField label="Recebimento" value={fmtDate(item.data_recebimento as string || '')} />
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#111827]/50 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase">Valores</h4>
            <DetailMoney label="Valor Original" value={item.valor_original as number || 0} />
            <DetailMoney label="Juros" value={item.valor_juros as number || 0} />
            <DetailMoney label="Multa" value={item.valor_multa as number || 0} />
            <DetailMoney label="Desconto" value={item.valor_desconto as number || 0} color="negative" />
            <div className="border-t border-white/[0.06] pt-2 mt-2">
              <DetailMoney label="Recebido" value={item.valor_recebido as number || 0} color="positive" />
              <DetailMoney label="Saldo Restante" value={(item.valor_original as number || 0) - (item.valor_recebido as number || 0)} />
            </div>
          </div>
          {item.observacoes && (
            <div className="rounded-xl border border-white/[0.06] bg-[#111827]/50 p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Observações</h4>
              <p className="text-sm text-slate-300">{item.observacoes as string}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'receipts' && (
        <div className="space-y-2">
          {receipts.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhuma baixa registrada</p>
            </div>
          ) : (
            receipts.map(r => (
              <div key={r.id as string} className={cn('p-3 rounded-xl border', r.estornado ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/[0.06] bg-[#111827]/50')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {fmtMoney(r.valor_recebido as number)}
                      {r.estornado && <span className="text-xs text-amber-400 ml-2">(Estornado)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{fmtDate(r.data_recebimento as string)}</p>
                  </div>
                  {!r.estornado && (
                    <button onClick={() => onReverseReceipt(r.id as string)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                      <Undo2 className="w-3 h-3" /> Estornar
                    </button>
                  )}
                </div>
                {(r.valor_juros as number > 0 || r.valor_multa as number > 0 || r.valor_desconto as number > 0) && (
                  <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                    {(r.valor_juros as number) > 0 && <span>Juros: {fmtMoney(r.valor_juros as number)}</span>}
                    {(r.valor_multa as number) > 0 && <span>Multa: {fmtMoney(r.valor_multa as number)}</span>}
                    {(r.valor_desconto as number) > 0 && <span>Desc: {fmtMoney(r.valor_desconto as number)}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'attachments' && (
        <AttachmentPanel empresaId={empresaId} entityType="contas_receber" entityId={item.id as string} />
      )}

      {tab === 'audit' && (
        <AuditTimeline entityType="contas_receber" entityId={item.id as string} />
      )}
    </div>
  );
};
