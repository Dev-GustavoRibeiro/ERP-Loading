'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, CheckSquare, Square } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import toast from 'react-hot-toast';
import {
  listContasBancarias,
  listMovimentacoesNaoConciliadas,
  conciliarEmLote,
} from '@/app/actions/financeiro';
import { fmtMoney, fmtDate, StatusBadge } from '../shared';

interface BankReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BankAccount {
  id: string;
  banco_nome: string;
  agencia: string;
  conta: string;
  [key: string]: unknown;
}

interface UnreconciledMovement {
  id: string;
  tipo: string;
  data_movimentacao: string;
  valor: number;
  descricao: string;
  conciliado: boolean;
  [key: string]: unknown;
}

export const BankReconciliationModal: React.FC<BankReconciliationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const empresaId = useEmpresaId();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [movements, setMovements] = useState<UnreconciledMovement[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [allReconciled, setAllReconciled] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!empresaId) return;
    try {
      const data = await listContasBancarias(empresaId);
      setAccounts(data as BankAccount[]);
      if (data.length > 0 && !selectedAccountId) {
        setSelectedAccountId((data[0] as BankAccount).id);
      }
    } catch (error) {
      toast.error('Erro ao carregar contas bancárias');
      console.error(error);
    }
  }, [empresaId, selectedAccountId]);

  const loadMovements = useCallback(async () => {
    if (!empresaId || !selectedAccountId) return;
    setLoading(true);
    try {
      const data = await listMovimentacoesNaoConciliadas(empresaId, selectedAccountId);
      setMovements(data as UnreconciledMovement[]);
      setSelectedIds(new Set());
      setAllReconciled(data.length === 0);
    } catch (error) {
      toast.error('Erro ao carregar movimentações');
      console.error(error);
    }
    setLoading(false);
  }, [empresaId, selectedAccountId]);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen, loadAccounts]);

  useEffect(() => {
    if (selectedAccountId) {
      loadMovements();
    }
  }, [selectedAccountId, loadMovements]);

  const handleSelectAll = () => {
    if (selectedIds.size === movements.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(movements.map((m) => m.id)));
    }
  };

  const handleToggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleReconcile = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos uma movimentação');
      return;
    }
    setReconciling(true);
    try {
      const result = await conciliarEmLote(Array.from(selectedIds));
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || 'Movimentações conciliadas com sucesso');
        setSelectedIds(new Set());
        loadMovements();
      }
    } catch (error) {
      toast.error('Erro ao conciliar movimentações');
      console.error(error);
    }
    setReconciling(false);
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

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
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-4xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">Conciliação Bancária</h2>
                <p className="text-xs text-slate-400">Selecione e concilie movimentações pendentes</p>
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
              {/* Account Selector */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Conta Bancária
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50 text-sm"
                >
                  <option value="">Selecione uma conta</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.banco_nome} - {acc.agencia}/{acc.conta}
                    </option>
                  ))}
                </select>
              </div>

              {/* Success State */}
              {allReconciled && selectedAccountId && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-white mb-1">
                    Todas as movimentações foram conciliadas!
                  </p>
                  <p className="text-xs text-slate-400">
                    Não há pendências para a conta {selectedAccount?.banco_nome}
                  </p>
                </div>
              )}

              {/* Movements List */}
              {selectedAccountId && !allReconciled && (
                <>
                  {/* Actions Bar */}
                  <div className="flex items-center justify-between bg-[#111827]/50 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {selectedIds.size === movements.length ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        {selectedIds.size === movements.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                      </button>
                      <span className="text-sm text-slate-400">
                        {selectedIds.size} de {movements.length} selecionadas
                      </span>
                    </div>
                    <button
                      onClick={handleReconcile}
                      disabled={selectedIds.size === 0 || reconciling}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50',
                        'bg-emerald-600 hover:bg-emerald-700'
                      )}
                    >
                      {reconciling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Conciliar Selecionadas
                    </button>
                  </div>

                  {/* Pending Count */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-sm text-amber-400">
                      <span className="font-semibold">{movements.length}</span> movimentações pendentes de
                      conciliação
                    </p>
                  </div>

                  {/* Movements */}
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    </div>
                  ) : movements.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <p>Nenhuma movimentação pendente</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {movements.map((mov) => (
                        <div
                          key={mov.id}
                          className={cn(
                            'bg-[#111827]/50 border rounded-xl p-4 transition-colors cursor-pointer',
                            selectedIds.has(mov.id)
                              ? 'border-purple-500/50 bg-purple-500/10'
                              : 'border-white/10 hover:bg-[#252d3d]'
                          )}
                          onClick={() => handleToggleSelection(mov.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5">
                              {selectedIds.has(mov.id) ? (
                                <CheckSquare className="w-5 h-5 text-purple-400" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-white">{mov.descricao}</p>
                                <p
                                  className={cn(
                                    'text-sm font-semibold',
                                    mov.tipo === 'credito' ? 'text-emerald-400' : 'text-red-400'
                                  )}
                                >
                                  {mov.tipo === 'credito' ? '+' : '-'} {fmtMoney(mov.valor)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>{fmtDate(mov.data_movimentacao)}</span>
                                <StatusBadge status={mov.conciliado ? 'paga' : 'aberta'} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!selectedAccountId && (
                <div className="text-center py-12 text-slate-500">
                  <p>Selecione uma conta bancária para ver as movimentações pendentes</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
};
