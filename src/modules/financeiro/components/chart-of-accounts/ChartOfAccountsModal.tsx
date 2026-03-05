'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import {
  listPlanoContas,
  createPlanoConta,
  updatePlanoConta,
  deletePlanoConta,
} from '@/app/actions/financeiro';
import { z } from 'zod';
import {
  chartAccountCreateSchema,
  type ChartAccountCreateInput,
} from '../../domain/schemas';
import {
  DialogForm,
  FormInput,
  FormSelect,
  ConfirmDialog,
  fmtDate,
} from '../shared';

interface ChartOfAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChartAccount {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  sintetica: boolean;
  nivel: number;
  conta_pai_id?: string;
  [key: string]: unknown;
}

export const ChartOfAccountsModal: React.FC<ChartOfAccountsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const empresaId = useEmpresaId();
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<ChartAccount | null>(null);

  const form = useForm<ChartAccountCreateInput & { id?: string }>({
    resolver: zodResolver(chartAccountCreateSchema.extend({ id: z.string().uuid().optional() })),
    defaultValues: {
      sintetica: false,
    },
  });

  const loadAccounts = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const data = await listPlanoContas(empresaId);
      setAccounts(data as ChartAccount[]);
    } catch (error) {
      toast.error('Erro ao carregar plano de contas');
      console.error(error);
    }
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen, loadAccounts]);

  // Build hierarchical tree
  const treeAccounts = useMemo(() => {
    const accountMap = new Map<string, ChartAccount & { children: ChartAccount[] }>();
    const rootAccounts: (ChartAccount & { children: ChartAccount[] })[] = [];

    // Initialize all accounts with children array
    accounts.forEach((acc) => {
      accountMap.set(acc.id, { ...acc, children: [] });
    });

    // Build tree
    accounts.forEach((acc) => {
      const accountWithChildren = accountMap.get(acc.id)!;
      if (acc.conta_pai_id && accountMap.has(acc.conta_pai_id)) {
        accountMap.get(acc.conta_pai_id)!.children.push(accountWithChildren);
      } else {
        rootAccounts.push(accountWithChildren);
      }
    });

    // Sort by codigo
    const sortAccounts = (accs: typeof rootAccounts) => {
      accs.sort((a, b) => a.codigo.localeCompare(b.codigo));
      accs.forEach((acc) => {
        if (acc.children.length > 0) {
          sortAccounts(acc.children);
        }
      });
    };

    sortAccounts(rootAccounts);
    return rootAccounts;
  }, [accounts]);

  const handleCreate = async () => {
    if (!empresaId) return;
    const values = form.getValues();
    const result = await createPlanoConta(empresaId, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Conta criada com sucesso');
      setShowCreate(false);
      form.reset();
      loadAccounts();
    }
  };

  const handleUpdate = async () => {
    if (!editingAccount) return;
    const values = form.getValues();
    const result = await updatePlanoConta(editingAccount.id, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Conta atualizada com sucesso');
      setEditingAccount(null);
      form.reset();
      loadAccounts();
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    const result = await deletePlanoConta(deletingAccount.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Conta excluída com sucesso');
      setDeletingAccount(null);
      loadAccounts();
    }
  };

  const handleEdit = (account: ChartAccount) => {
    setEditingAccount(account);
    form.reset({
      codigo: account.codigo,
      descricao: account.descricao,
      tipo: account.tipo as any,
      natureza: (account as any).natureza || 'debito',
      sintetica: account.sintetica || false,
      conta_pai_id: account.conta_pai_id || '',
      id: account.id,
    });
  };

  const getTypeColor = (tipo: string) => {
    const colors: Record<string, string> = {
      receita: 'bg-emerald-500/20 text-emerald-400',
      despesa: 'bg-red-500/20 text-red-400',
      ativo: 'bg-blue-500/20 text-blue-400',
      passivo: 'bg-amber-500/20 text-amber-400',
      patrimonio: 'bg-purple-500/20 text-purple-400',
    };
    return colors[tipo] || 'bg-slate-500/20 text-slate-400';
  };

  const renderAccountRow = (account: ChartAccount & { children: ChartAccount[] }, level = 0) => {
    return (
      <React.Fragment key={account.id}>
        <div
          className={cn(
            'bg-[#111827]/50 border border-white/10 rounded-xl p-4 hover:bg-[#252d3d] transition-colors',
            level > 0 && 'ml-4'
          )}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-mono text-slate-400">{account.codigo}</span>
                <span className="text-sm font-medium text-white truncate">{account.descricao}</span>
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded font-medium', getTypeColor(account.tipo))}>
                {account.tipo}
              </span>
              {account.sintetica && (
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">
                  Sintética
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleEdit(account)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => setDeletingAccount(account)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        </div>
        {account.children.map((child) => renderAccountRow(child, level + 1))}
      </React.Fragment>
    );
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-5xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">Plano de Contas</h2>
                <p className="text-xs text-slate-400">Gerencie o plano de contas contábeis</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowCreate(true);
                    form.reset({ sintetica: false });
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nova Conta
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              ) : treeAccounts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>Nenhuma conta cadastrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {treeAccounts.map((account) => renderAccountRow(account))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Create/Edit Dialog */}
      <DialogForm
        isOpen={showCreate || !!editingAccount}
        onClose={() => {
          setShowCreate(false);
          setEditingAccount(null);
          form.reset();
        }}
        title={editingAccount ? 'Editar Conta' : 'Nova Conta'}
        onSubmit={editingAccount ? form.handleSubmit(handleUpdate) : form.handleSubmit(handleCreate)}
        loading={loading}
      >
        <FormInput form={form} name="codigo" label="Código" required />
        <FormInput form={form} name="descricao" label="Descrição" required />
        <FormSelect
          form={form}
          name="tipo"
          label="Tipo"
          required
          options={[
            { value: 'receita', label: 'Receita' },
            { value: 'despesa', label: 'Despesa' },
            { value: 'ativo', label: 'Ativo' },
            { value: 'passivo', label: 'Passivo' },
            { value: 'patrimonio', label: 'Patrimônio' },
          ]}
        />
        <FormSelect
          form={form}
          name="natureza"
          label="Natureza"
          required
          options={[
            { value: 'debito', label: 'Débito' },
            { value: 'credito', label: 'Crédito' },
          ]}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.watch('sintetica') || false}
            {...form.register('sintetica')}
            className="w-4 h-4 rounded border-white/10 bg-[#252d3d] text-purple-600 focus:ring-purple-500"
          />
          <label className="text-sm font-medium text-slate-300">Conta Sintética</label>
        </div>
        <FormSelect
          form={form}
          name="conta_pai_id"
          label="Conta Pai"
          options={[
            { value: '', label: 'Nenhuma' },
            ...accounts
              .filter((a) => a.id !== editingAccount?.id)
              .map((a) => ({
                value: a.id,
                label: `${a.codigo} - ${a.descricao}`,
              })),
          ]}
        />
      </DialogForm>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleDelete}
        title="Excluir Conta"
        description={
          deletingAccount
            ? `Tem certeza que deseja excluir a conta "${deletingAccount.codigo} - ${deletingAccount.descricao}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={loading}
      />
    </Portal>
  );
};
