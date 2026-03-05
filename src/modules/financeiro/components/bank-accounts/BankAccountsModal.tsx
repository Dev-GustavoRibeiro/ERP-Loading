'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Building2, Upload, ArrowLeft, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import {
  listContasBancarias,
  createContaBancaria,
  updateContaBancaria,
  listMovimentacoesBancarias,
  createMovimentacaoBancaria,
} from '@/app/actions/financeiro';
import {
  bankAccountCreateSchema,
  manualMovementSchema,
  type BankAccountCreateInput,
  type ManualMovementInput,
} from '../../domain/schemas';
import {
  DialogForm,
  FormInput,
  FormSelect,
  FormTextarea,
  ConfirmDialog,
  fmtMoney,
  fmtDate,
} from '../shared';

interface BankAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BankAccount {
  id: string;
  banco_nome: string;
  agencia: string;
  conta: string;
  tipo: string;
  saldo_atual: number;
  [key: string]: unknown;
}

interface BankMovement {
  id: string;
  tipo: string;
  data_movimentacao: string;
  valor: number;
  descricao: string;
  saldo_anterior: number;
  saldo_posterior: number;
  [key: string]: unknown;
}

export const BankAccountsModal: React.FC<BankAccountsModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showCreateMovement, setShowCreateMovement] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);

  const accountForm = useForm<BankAccountCreateInput>({
    resolver: zodResolver(bankAccountCreateSchema),
    defaultValues: {
      tipo: 'corrente',
      saldo_inicial: 0,
    },
  });

  const movementForm = useForm<ManualMovementInput>({
    resolver: zodResolver(manualMovementSchema),
    defaultValues: {
      tipo: 'credito',
    },
  });

  const loadAccounts = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const data = await listContasBancarias(empresaId);
      setAccounts(data as BankAccount[]);
    } catch (error) {
      toast.error('Erro ao carregar contas bancárias');
      console.error(error);
    }
    setLoading(false);
  }, [empresaId]);

  const loadMovements = useCallback(async (accountId: string) => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const result = await listMovimentacoesBancarias(empresaId, accountId);
      setMovements(result.data as BankMovement[]);
    } catch (error) {
      toast.error('Erro ao carregar movimentações');
      console.error(error);
    }
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      setSelectedAccount(null);
      setMovements([]);
    }
  }, [isOpen, loadAccounts]);

  const handleCreateAccount = async () => {
    if (!empresaId) return;
    const values = accountForm.getValues();
    const result = await createContaBancaria(empresaId, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Conta criada com sucesso');
      setShowCreateAccount(false);
      accountForm.reset();
      loadAccounts();
    }
  };

  const handleCreateMovement = async () => {
    if (!empresaId || !selectedAccount) return;
    const values = movementForm.getValues();
    const result = await createMovimentacaoBancaria(empresaId, {
      ...values,
      conta_bancaria_id: selectedAccount.id,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Movimentação criada com sucesso');
      setShowCreateMovement(false);
      movementForm.reset();
      loadAccounts();
      loadMovements(selectedAccount.id);
    }
  };

  const handleAccountClick = (account: BankAccount) => {
    setSelectedAccount(account);
    loadMovements(account.id);
  };

  const handleBack = () => {
    setSelectedAccount(null);
    setMovements([]);
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
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-6xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                {selectedAccount && (
                  <button
                    onClick={handleBack}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                  </button>
                )}
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedAccount ? 'Movimentações da Conta' : 'Contas Bancárias'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedAccount
                      ? `${selectedAccount.banco_nome} - ${selectedAccount.agencia}/${selectedAccount.conta}`
                      : 'Gerencie suas contas bancárias'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!selectedAccount && (
                  <>
                    <button
                      onClick={() => setShowCSVImport(true)}
                      className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Importar CSV
                    </button>
                    <button
                      onClick={() => setShowCreateAccount(true)}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Nova Conta
                    </button>
                  </>
                )}
                {selectedAccount && (
                  <button
                    onClick={() => setShowCreateMovement(true)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Movimentação
                  </button>
                )}
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
              {selectedAccount ? (
                // Movements View
                <div className="space-y-4">
                  <div className="bg-[#111827]/50 border border-white/10 rounded-xl p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Saldo Atual</p>
                        <p className="text-xl font-bold text-white">{fmtMoney(selectedAccount.saldo_atual)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Tipo</p>
                        <p className="text-sm text-white capitalize">{selectedAccount.tipo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Banco</p>
                        <p className="text-sm text-white">{selectedAccount.banco_nome}</p>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    </div>
                  ) : movements.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <p>Nenhuma movimentação encontrada</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {movements.map((mov) => (
                        <div
                          key={mov.id}
                          className="bg-[#111827]/50 border border-white/10 rounded-xl p-4 hover:bg-[#252d3d] transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {mov.tipo === 'credito' ? (
                                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <ArrowDownRight className="w-5 h-5 text-red-400" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-white">{mov.descricao}</p>
                                <p className="text-xs text-slate-500">{fmtDate(mov.data_movimentacao)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={cn(
                                  'text-sm font-semibold',
                                  mov.tipo === 'credito' ? 'text-emerald-400' : 'text-red-400'
                                )}
                              >
                                {mov.tipo === 'credito' ? '+' : '-'} {fmtMoney(mov.valor)}
                              </p>
                              <p className="text-xs text-slate-500">Saldo: {fmtMoney(mov.saldo_posterior)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Accounts Grid
                <div>
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <p>Nenhuma conta bancária cadastrada</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {accounts.map((account) => (
                        <motion.div
                          key={account.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => handleAccountClick(account)}
                          className="bg-[#111827]/50 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-[#252d3d] transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                              <Building2 className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 capitalize">
                              {account.tipo}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-white mb-1">{account.banco_nome}</h3>
                          <p className="text-xs text-slate-400 mb-2">
                            Ag: {account.agencia} | Conta: {account.conta}
                          </p>
                          <p className="text-lg font-bold text-emerald-400">{fmtMoney(account.saldo_atual)}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Create Account Dialog */}
      <DialogForm
        isOpen={showCreateAccount}
        onClose={() => {
          setShowCreateAccount(false);
          accountForm.reset();
        }}
        title="Nova Conta Bancária"
        onSubmit={accountForm.handleSubmit(handleCreateAccount)}
        loading={loading}
      >
        <FormInput form={accountForm} name="banco_codigo" label="Código do Banco" required />
        <FormInput form={accountForm} name="banco_nome" label="Nome do Banco" required />
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={accountForm} name="agencia" label="Agência" required />
          <FormInput form={accountForm} name="agencia_digito" label="Dígito Agência" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormInput form={accountForm} name="conta" label="Conta" required />
          <FormInput form={accountForm} name="conta_digito" label="Dígito Conta" />
        </div>
        <FormSelect
          form={accountForm}
          name="tipo"
          label="Tipo"
          required
          options={[
            { value: 'corrente', label: 'Corrente' },
            { value: 'poupanca', label: 'Poupança' },
            { value: 'investimento', label: 'Investimento' },
            { value: 'caixa', label: 'Caixa' },
          ]}
        />
        <FormInput form={accountForm} name="saldo_inicial" label="Saldo Inicial" type="number" />
        <FormTextarea form={accountForm} name="descricao" label="Descrição" />
      </DialogForm>

      {/* Create Movement Dialog */}
      <DialogForm
        isOpen={showCreateMovement}
        onClose={() => {
          setShowCreateMovement(false);
          movementForm.reset();
        }}
        title="Nova Movimentação Manual"
        subtitle="Tarifas, ajustes e outras movimentações"
        onSubmit={movementForm.handleSubmit(handleCreateMovement)}
        loading={loading}
      >
        <FormSelect
          form={movementForm}
          name="tipo"
          label="Tipo"
          required
          options={[
            { value: 'credito', label: 'Crédito' },
            { value: 'debito', label: 'Débito' },
          ]}
        />
        <FormInput form={movementForm} name="data_movimento" label="Data" type="date" required />
        <FormInput form={movementForm} name="valor" label="Valor" type="number" step="0.01" required />
        <FormInput form={movementForm} name="descricao" label="Descrição" required />
        <FormInput form={movementForm} name="numero_documento" label="Nº Documento" />
        <FormTextarea form={movementForm} name="observacoes" label="Observações" />
      </DialogForm>

      {/* CSV Import Placeholder */}
      {showCSVImport && (
        <ConfirmDialog
          isOpen={showCSVImport}
          onClose={() => setShowCSVImport(false)}
          onConfirm={() => {
            toast.info('Funcionalidade de importação CSV em desenvolvimento');
            setShowCSVImport(false);
          }}
          title="Importar CSV"
          description="A funcionalidade de importação CSV será implementada em breve."
          confirmLabel="OK"
          variant="info"
        />
      )}
    </Portal>
  );
};
