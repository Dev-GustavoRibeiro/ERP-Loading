'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Search, BarChart3, TrendingUp,
  UserCheck, Building2,
} from 'lucide-react';
import { PageTemplate, StatCardData, ModuleCardData, ActionButtonData } from '@/shared/components/templates';
import { clienteService } from '@/modules/cadastros/services/clienteService';
import type { Cliente } from '@/modules/cadastros/domain';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';

// Module Components
import { ModalCliente, Toast, isTableNotFoundError } from './_components/shared';
import { FormCliente } from './_components/FormCliente';
import { BuscaClientes } from './_components/BuscaClientes';
import { DetalhesCliente } from './_components/DetalhesCliente';
import { SegmentacaoClientes } from './_components/SegmentacaoClientes';

// =====================================================
// Types
// =====================================================

type ModalType = 'busca' | 'novo' | 'detalhes' | 'segmentacao' | null;

// =====================================================
// Page Component
// =====================================================

export default function ClientesPage() {
  const empresaId = useEmpresaId();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null);
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'info'; message: string }>({
    show: false, type: 'info', message: '',
  });

  // ── Stats ──
  const [stats, setStats] = useState<StatCardData[]>([
    { title: 'Total de Clientes', value: '—', description: 'Cadastrados', icon: Users, color: 'purple' },
    { title: 'Clientes Ativos', value: '—', description: 'Com status ativo', icon: UserCheck, color: 'emerald' },
    { title: 'Novos no Mês', value: '—', description: 'Últimos 30 dias', icon: TrendingUp, color: 'blue' },
    { title: 'Pessoa Jurídica', value: '—', description: 'Empresas cadastradas', icon: Building2, color: 'amber' },
  ]);

  const loadStats = useCallback(async () => {
    if (!empresaId) return;

    try {
      const total = await clienteService.list(empresaId, { pageSize: 1 });
      const ativos = await clienteService.list(empresaId, { pageSize: 1, filters: { ativo: true } });
      const pj = await clienteService.list(empresaId, { pageSize: 1, filters: { tipo_pessoa: 'J' } });

      const recent = await clienteService.list(empresaId, {
        pageSize: 100, orderBy: 'created_at', order: 'desc',
      });
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const novosNoMes = recent.data.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;
      const taxaAtivos = total.total > 0 ? Math.round((ativos.total / total.total) * 100) : 0;

      setStats([
        { title: 'Total de Clientes', value: String(total.total), description: 'Cadastrados no sistema', icon: Users, color: 'purple' },
        { title: 'Clientes Ativos', value: String(ativos.total), description: `${taxaAtivos}% do total`, icon: UserCheck, color: 'emerald', badge: `${taxaAtivos}%` },
        { title: 'Novos no Mês', value: String(novosNoMes), description: 'Últimos 30 dias', icon: TrendingUp, color: 'blue', trend: novosNoMes > 0 ? novosNoMes : 0 },
        { title: 'Pessoa Jurídica', value: String(pj.total), description: 'Empresas cadastradas', icon: Building2, color: 'amber' },
      ]);
    } catch (error) {
      if (isTableNotFoundError(error)) {
        // Table not configured - leave default stats
        return;
      }
      console.error('Erro ao carregar estatísticas:', error);
    }
  }, [empresaId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Action Buttons (only "Novo Cliente" in header) ──
  const actionButtons: ActionButtonData[] = [
    {
      icon: UserPlus,
      label: 'Novo Cliente',
      variant: 'primary',
      onClick: () => {
        setEditingCliente(null);
        setActiveModal('novo');
      },
    },
  ];

  // ── Module Cards (simplified, non-repetitive) ──
  const modules: ModuleCardData[] = [
    {
      icon: UserPlus,
      label: 'Novo Cliente',
      color: 'emerald',
      description: 'Cadastro passo a passo com validação de CPF/CNPJ, busca automática de CEP e revisão antes de salvar.',
      onClick: () => {
        setEditingCliente(null);
        setActiveModal('novo');
      },
    },
    {
      icon: Search,
      label: 'Busca de Clientes',
      color: 'purple',
      description: 'Consulte, filtre e gerencie clientes com busca avançada, exportação CSV e ações em lote.',
      onClick: () => setActiveModal('busca'),
    },
    {
      icon: BarChart3,
      label: 'Segmentação e Análise',
      color: 'blue',
      description: 'Análise completa: segmentos inteligentes, qualidade de dados, distribuição geográfica e tendências.',
      onClick: () => setActiveModal('segmentacao'),
    },
  ];

  // ── Modal Handlers ──
  const closeModal = () => {
    setActiveModal(null);
    setEditingCliente(null);
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setActiveModal('novo');
  };

  const handleView = (cliente: Cliente) => {
    setViewingCliente(cliente);
    setActiveModal('detalhes');
  };

  const handleSuccess = (message: string) => {
    loadStats();
    showToast('success', message);
  };

  const handleToggleStatus = async () => {
    if (!viewingCliente) return;
    try {
      await clienteService.toggleAtivo(viewingCliente.id, !viewingCliente.ativo);
      const updated = await clienteService.getById(viewingCliente.id);
      if (updated) setViewingCliente(updated);
      loadStats();
      showToast('success', viewingCliente.ativo ? 'Cliente desativado' : 'Cliente ativado');
    } catch {
      showToast('error', 'Erro ao alterar status');
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ show: true, type, message });
  };

  // ── Modal Config ──
  const modalConfig: Record<NonNullable<ModalType>, { title: string; size: 'sm' | 'md' | 'lg' | 'xl' | '2xl' }> = {
    busca: { title: 'Busca de Clientes', size: '2xl' },
    novo: { title: editingCliente ? `Editar: ${editingCliente.nome}` : 'Novo Cliente', size: 'xl' },
    detalhes: { title: `Perfil — ${viewingCliente?.nome || ''}`, size: 'xl' },
    segmentacao: { title: 'Segmentação e Análise', size: '2xl' },
  };

  return (
    <>
      <PageTemplate
        title="Gestão de Clientes"
        subtitle="Cadastre, consulte e gerencie seus clientes com ferramentas avançadas de CRM"
        accentColor="purple"
        actionButtons={actionButtons}
        stats={stats}
        modules={{
          title: 'Módulos de Clientes',
          items: modules,
        }}
      />

      {/* ── Modals ── */}
      {activeModal && (
        <ModalCliente
          isOpen={!!activeModal}
          onClose={closeModal}
          title={modalConfig[activeModal].title}
          size={modalConfig[activeModal].size}
        >
          {activeModal === 'busca' && (
            <BuscaClientes
              empresaId={empresaId}
              onEdit={handleEdit}
              onView={handleView}
              onRefresh={loadStats}
            />
          )}

          {activeModal === 'novo' && (
            <FormCliente
              empresaId={empresaId}
              editingCliente={editingCliente}
              onClose={closeModal}
              onSuccess={handleSuccess}
            />
          )}

          {activeModal === 'detalhes' && viewingCliente && (
            <DetalhesCliente
              cliente={viewingCliente}
              onEdit={() => {
                setEditingCliente(viewingCliente);
                setActiveModal('novo');
              }}
              onToggleStatus={handleToggleStatus}
              onClose={closeModal}
            />
          )}

          {activeModal === 'segmentacao' && (
            <SegmentacaoClientes empresaId={empresaId} />
          )}
        </ModalCliente>
      )}

      {/* ── Toast ── */}
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </>
  );
}
