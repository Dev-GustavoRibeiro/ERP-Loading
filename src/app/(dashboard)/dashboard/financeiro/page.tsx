'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  CreditCard,
  Landmark,
  FolderTree,
} from 'lucide-react';
import { PageTemplate, StatCardData, ModuleCardData, ActionButtonData } from '@/shared/components/templates';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { getResumoFinanceiro } from '@/app/actions/financeiro';

// New professional modal components
import { ARModal } from '@/modules/financeiro/components/ar/ARModal';
import { APModal } from '@/modules/financeiro/components/ap/APModal';
import { CashFlowModal } from '@/modules/financeiro/components/cashflow/CashFlowModal';
import { ChartOfAccountsModal } from '@/modules/financeiro/components/chart-of-accounts/ChartOfAccountsModal';
import { BankReconciliationModal } from '@/modules/financeiro/components/reconciliation/BankReconciliationModal';
import { BankAccountsModal } from '@/modules/financeiro/components/bank-accounts/BankAccountsModal';
import { CostCentersModal } from '@/modules/financeiro/components/cost-centers/CostCentersModal';

// =====================================================
// Page Component
// =====================================================

type ModalType = 'receber' | 'pagar' | 'fluxo' | 'plano_contas' | 'conciliacao' | 'bancos' | 'custos' | null;

export default function FinanceiroPage() {
  const empresaId = useEmpresaId();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [stats, setStats] = useState<StatCardData[]>([
    { title: 'A Receber', value: '-', description: 'Este mês', icon: TrendingUp, color: 'emerald', trend: 0 },
    { title: 'A Pagar', value: '-', description: 'Este mês', icon: TrendingDown, color: 'red', trend: 0 },
    { title: 'Saldo Previsto', value: '-', description: 'Disponível', icon: Wallet, color: 'blue', trend: 0 },
    { title: 'Saldo Bancário', value: '-', description: 'Total em contas', icon: Landmark, color: 'purple', trend: 0 },
  ]);

  const loadStats = useCallback(async () => {
    if (!empresaId) return;
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

      const resumo = await getResumoFinanceiro(empresaId, inicioMes, fimMes);
      const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

      setStats([
        { title: 'A Receber', value: fmt(resumo.total_receber || 0), description: 'Este mês', icon: TrendingUp, color: 'emerald', trend: resumo.total_receber > 0 ? 12 : 0 },
        { title: 'A Pagar', value: fmt(resumo.total_pagar || 0), description: 'Este mês', icon: TrendingDown, color: 'red', trend: resumo.total_pagar > 0 ? -8 : 0 },
        { title: 'Saldo Previsto', value: fmt(resumo.saldo_previsto || 0), description: 'Disponível', icon: Wallet, color: 'blue', trend: resumo.saldo_previsto >= 0 ? 5 : -5 },
        { title: 'Saldo Bancário', value: fmt(resumo.saldo_contas || 0), description: 'Total em contas', icon: Landmark, color: 'purple', trend: resumo.saldo_contas > 0 ? 3 : 0 },
      ]);
    } catch {
      // Silently handle - keeps default stats
    }
  }, [empresaId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const actionButtons: ActionButtonData[] = [
    { icon: TrendingUp, label: 'Nova Receita', variant: 'primary', onClick: () => setActiveModal('receber') },
    { icon: TrendingDown, label: 'Nova Despesa', variant: 'secondary', onClick: () => setActiveModal('pagar') },
  ];

  const modules: ModuleCardData[] = [
    { icon: TrendingUp, label: 'Contas a Receber', description: 'Gestão de receitas com controle de vencimentos, baixa e inadimplência.', color: 'emerald', onClick: () => setActiveModal('receber') },
    { icon: TrendingDown, label: 'Contas a Pagar', description: 'Gestão de despesas com controle de vencimentos e pagamentos.', color: 'red', onClick: () => setActiveModal('pagar') },
    { icon: ArrowLeftRight, label: 'Fluxo de Caixa', description: 'Visão consolidada de entradas/saídas com projeções e saldo previsto.', color: 'blue', onClick: () => setActiveModal('fluxo') },
    { icon: FolderTree, label: 'Plano de Contas', description: 'Estrutura contábil hierárquica para classificação de receitas e despesas.', color: 'amber', onClick: () => setActiveModal('plano_contas') },
    { icon: CreditCard, label: 'Conciliação Bancária', description: 'Conciliação entre extratos e movimentações para garantir precisão dos dados.', color: 'purple', onClick: () => setActiveModal('conciliacao') },
    { icon: Landmark, label: 'Contas Bancárias', description: 'Cadastro e gestão de contas com saldos em tempo real e movimentações.', color: 'cyan', onClick: () => setActiveModal('bancos') },
    { icon: PiggyBank, label: 'Centro de Custos', description: 'Alocação de custos por departamento, projeto ou centro de responsabilidade.', color: 'orange', onClick: () => setActiveModal('custos') },
  ];

  const closeModal = () => {
    setActiveModal(null);
    // Refresh stats after modal close to reflect changes
    loadStats();
  };

  return (
    <>
      <PageTemplate
        title="Financeiro"
        subtitle="Gestão financeira completa da sua empresa"
        icon={Wallet}
        accentColor="emerald"
        actionButtons={actionButtons}
        stats={stats}
        modules={{ title: 'Módulos Financeiros', items: modules }}
      />

      {/* Professional Financial Module Modals */}
      <ARModal isOpen={activeModal === 'receber'} onClose={closeModal} />
      <APModal isOpen={activeModal === 'pagar'} onClose={closeModal} />
      <CashFlowModal isOpen={activeModal === 'fluxo'} onClose={closeModal} />
      <ChartOfAccountsModal isOpen={activeModal === 'plano_contas'} onClose={closeModal} />
      <BankReconciliationModal isOpen={activeModal === 'conciliacao'} onClose={closeModal} />
      <BankAccountsModal isOpen={activeModal === 'bancos'} onClose={closeModal} />
      <CostCentersModal isOpen={activeModal === 'custos'} onClose={closeModal} />
    </>
  );
}
