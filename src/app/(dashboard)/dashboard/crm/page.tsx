'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Target,
  TrendingUp,
  Phone,
  Calendar,
  Settings2,
  UserPlus,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import { PageTemplate, type StatCardData, type ModuleCardData, type ActionButtonData } from '@/shared/components/templates';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { getLeadKPIs, getOpportunityKPIs, getActivityKPIs } from '@/app/actions/crm';

// Lazy-loaded modal components
import { LeadsModal } from '@/modules/crm/components/LeadsModal';
import { PipelineModal } from '@/modules/crm/components/PipelineModal';
import { ActivitiesModal } from '@/modules/crm/components/ActivitiesModal';
import SettingsModal from '@/modules/crm/components/SettingsModal';

// =====================================================
// Types
// =====================================================

type ModalType = 'leads' | 'pipeline' | 'activities' | 'settings' | null;

// =====================================================
// Page Component
// =====================================================

export default function CRMPage() {
  const empresaId = useEmpresaId();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [stats, setStats] = useState<StatCardData[]>([
    { title: 'Leads', value: '—', description: 'Total ativo', icon: Users, color: 'blue', trend: 0 },
    { title: 'Pipeline', value: '—', description: 'Valor no funil', icon: TrendingUp, color: 'purple', trend: 0 },
    { title: 'Forecast', value: '—', description: 'Previsão ponderada', icon: Target, color: 'emerald', trend: 0 },
    { title: 'Atividades', value: '—', description: 'Pendentes hoje', icon: Calendar, color: 'amber', trend: 0 },
  ]);

  const loadStats = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [leadKpis, oppKpis, actKpis] = await Promise.all([
        getLeadKPIs(empresaId),
        getOpportunityKPIs(empresaId),
        getActivityKPIs(empresaId),
      ]);

      setStats([
        {
          title: 'Leads',
          value: String(leadKpis.total),
          description: `${leadKpis.novosHoje} novos hoje · ${leadKpis.semOwner} sem responsável`,
          icon: Users,
          color: 'blue',
          trend: leadKpis.novosHoje > 0 ? 5 : 0,
        },
        {
          title: 'Pipeline',
          value: `R$ ${oppKpis.totalFunnel.toLocaleString('pt-BR')}`,
          description: `${oppKpis.openCount} oportunidades abertas`,
          icon: TrendingUp,
          color: 'purple',
          trend: oppKpis.wonThisMonth > 0 ? 12 : 0,
        },
        {
          title: 'Forecast',
          value: `R$ ${oppKpis.forecast.toLocaleString('pt-BR')}`,
          description: `${oppKpis.wonThisMonth} ganhas · ${oppKpis.lostThisMonth} perdidas no mês`,
          icon: Target,
          color: 'emerald',
          trend: oppKpis.wonThisMonth > oppKpis.lostThisMonth ? 8 : -3,
        },
        {
          title: 'Atividades',
          value: String(actKpis.today),
          description: `${actKpis.overdue} vencidas · ${actKpis.thisWeek} esta semana`,
          icon: Calendar,
          color: actKpis.overdue > 0 ? 'red' : 'amber',
          trend: actKpis.overdue > 0 ? -actKpis.overdue : 0,
        },
      ]);
    } catch (error) {
      console.warn('CRM stats error:', error);
    }
  }, [empresaId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Reload stats when modal closes
  const closeModal = () => {
    setActiveModal(null);
    loadStats();
  };

  const actionButtons: ActionButtonData[] = [
    { icon: UserPlus, label: 'Novo Lead', variant: 'primary', onClick: () => setActiveModal('leads') },
    { icon: Target, label: 'Pipeline', variant: 'secondary', onClick: () => setActiveModal('pipeline') },
  ];

  const modules: ModuleCardData[] = [
    {
      icon: Users,
      label: 'Leads',
      color: 'blue',
      description: 'Gerencie leads com KPIs, filtros avançados, qualificação e conversão em oportunidades.',
      onClick: () => setActiveModal('leads'),
    },
    {
      icon: TrendingUp,
      label: 'Pipeline',
      color: 'purple',
      description: 'Kanban visual do funil de vendas com drag-and-drop entre estágios e controle de ganho/perda.',
      onClick: () => setActiveModal('pipeline'),
    },
    {
      icon: ClipboardList,
      label: 'Atividades',
      color: 'amber',
      description: 'Tarefas, ligações, reuniões e notas vinculadas a leads e oportunidades. Agenda do CRM.',
      onClick: () => setActiveModal('activities'),
    },
    {
      icon: Settings2,
      label: 'Configurações',
      color: 'slate',
      description: 'Pipelines, estágios, motivos de perda e automações. Personalize o CRM para seu processo.',
      onClick: () => setActiveModal('settings'),
    },
  ];

  return (
    <>
      <PageTemplate
        title="CRM"
        subtitle="Gestão de relacionamento, leads e pipeline de vendas"
        icon={BarChart3}
        accentColor="blue"
        actionButtons={actionButtons}
        stats={stats}
        modules={{ title: 'Módulos do CRM', items: modules }}
      />

      {/* Leads Modal */}
      <LeadsModal
        isOpen={activeModal === 'leads'}
        onClose={closeModal}
        empresaId={empresaId}
      />

      {/* Pipeline / Kanban Modal */}
      <PipelineModal
        isOpen={activeModal === 'pipeline'}
        onClose={closeModal}
        empresaId={empresaId}
      />

      {/* Activities Modal */}
      <ActivitiesModal
        isOpen={activeModal === 'activities'}
        onClose={closeModal}
        empresaId={empresaId}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={activeModal === 'settings'}
        onClose={closeModal}
        empresaId={empresaId}
      />
    </>
  );
}
