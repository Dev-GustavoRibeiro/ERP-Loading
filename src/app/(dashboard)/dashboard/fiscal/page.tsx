'use client';

import React, { useState } from 'react';
import { PageTemplate } from '@/shared/components/templates';
import type { StatCardData, ModuleCardData, ActionButtonData } from '@/shared/components/templates';
import {
  FileText, Truck, FileBarChart, FilePieChart, FileSpreadsheet,
  ShieldCheck, Download, Plus, Filter, Search, Ban, Settings
} from 'lucide-react';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { useNfeStats } from '@/features/nfe/hooks';
import { formatCurrency } from '@/shared/lib/utils';
import type { FilterNfeValues } from '@/features/nfe/schemas';

// Placeholder or Real Modals
// Note: We will implement the specific logic for each soon. Only import existing ones for now or defaults.
// For now, NfeModal will assume the role of "Consultar/Listar NF-e"
import {
  CreateNfeDialog,
  DetailsModal,
  FilterModal,
  InutilizacaoDialog,
  CartaCorrecaoDialog,
  NfeListModal
} from '@/features/nfe/components';
import { MdfeModal } from '@/features/mdfe/components';
import { SpedModal, EfdModal, SintegraModal } from '@/features/fiscal-reports/components';
import { CompraLegalModal, RecebimentoModal } from '@/features/fiscal-compliance/components';
type ActiveModal =
  | null
  | 'nfe_list'       // 1. NF-e
  | 'mdfe'           // 2. MDF-e
  | 'sped'           // 3. SPED Fiscal
  | 'efd'            // 4. EFD PIS/COFINS
  | 'sintegra'       // 5. Sintegra
  | 'compra_legal'   // 6. Compra Legal
  | 'recebimento'    // 7. Receb. NF-e
  | 'create_nfe'     // Sub-action
  | 'details_nfe'    // Sub-action
  | 'filter_nfe'     // Sub-action
  | 'inutilizar'     // Sub-action
  | 'carta_correcao'; // Sub-action

export default function FiscalPage() {
  const empresaId = useEmpresaId();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedNfeId, setSelectedNfeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterNfeValues>({});

  // KPIs (Still relevant for the top stats)
  const { stats, loading: statsLoading, refetch: refreshStats } = useNfeStats();

  const handleRefresh = () => {
    refreshStats();
  };

  const openDetails = (id: string) => {
    setSelectedNfeId(id);
    setActiveModal('details_nfe');
  };

  const openCartaCorrecao = (id: string) => {
    setSelectedNfeId(id);
    setActiveModal('carta_correcao');
  };

  // Top Stats (Keep for context)
  const statCards: StatCardData[] = [
    {
      title: 'Total NF-e',
      value: statsLoading ? '...' : stats.total.toString(),
      icon: FileText,
    },
    {
      title: 'Autorizadas',
      value: statsLoading ? '...' : stats.autorizadas.toString(),
      icon: FileText,
    },
    {
      title: 'Em Digitação',
      value: statsLoading ? '...' : stats.digitacao.toString(),
      icon: FileText,
      badge: '0 notas'
    },
    {
      title: 'Faturamento (mês)',
      value: statsLoading ? '...' : formatCurrency(stats.valorFaturado),
      icon: FileText,
    },
  ];

  // Specific 7 Modules
  const moduleCards: ModuleCardData[] = [
    {
      label: 'NF-e',
      description: 'Emissão e gestão de notas fiscais de saída',
      icon: FileText,
      onClick: () => setActiveModal('nfe_list'),
    },
    {
      label: 'MDF-e',
      description: 'Manifesto de Documentos Fiscais',
      icon: Truck,
      onClick: () => setActiveModal('mdfe'),
    },
    {
      label: 'SPED Fiscal',
      description: 'Escrituração Fiscal Digital ICMS/IPI',
      icon: FileBarChart,
      onClick: () => setActiveModal('sped'),
    },
    {
      label: 'EFD-PIS/Cofins',
      description: 'Escrituração de Contribuições',
      icon: FilePieChart,
      onClick: () => setActiveModal('efd'),
    },
    {
      label: 'Sintegra',
      description: 'Arquivo Sintegra (Sistema Integrado)',
      icon: FileSpreadsheet,
      onClick: () => setActiveModal('sintegra'),
    },
    {
      label: 'Compra Legal',
      description: 'Conformidade e validação de compras',
      icon: ShieldCheck,
      onClick: () => setActiveModal('compra_legal'),
    },
    {
      label: 'Receb. NF-e',
      description: 'Gestão de notas de entrada e XML',
      icon: Download,
      onClick: () => setActiveModal('recebimento'),
    },
  ];

  // Action Buttons (Shortcuts)
  const actionButtons: ActionButtonData[] = [
    {
      icon: Plus,
      label: 'Nova NF-e',
      variant: 'primary',
      onClick: () => setActiveModal('create_nfe'),
    },
    {
      icon: Settings,
      label: 'Configurações',
      variant: 'secondary',
      onClick: () => { }, // TODO: Settings Modal
    },
  ];

  return (
    <>
      <PageTemplate
        title="Fiscal"
        subtitle="Gestão fiscal completa e documentos eletrônicos"
        icon={FileText}
        accentColor="emerald"
        actionButtons={actionButtons}
        stats={statCards}
        modules={{
          title: 'Módulos Fiscais',
          items: moduleCards
        }}
      />

      {/* --- Existing NF-e Modals --- */}
      <CreateNfeDialog
        isOpen={activeModal === 'create_nfe'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => {
          setActiveModal(null);
          handleRefresh();
        }}
      />

      <DetailsModal
        isOpen={activeModal === 'details_nfe'}
        notaId={selectedNfeId || ''}
        onClose={() => {
          setActiveModal(null);
          setSelectedNfeId(null);
        }}
        onCartaCorrecao={() => selectedNfeId && openCartaCorrecao(selectedNfeId)}
        onRefresh={handleRefresh}
      />

      <FilterModal
        isOpen={activeModal === 'filter_nfe'}
        currentFilters={filters}
        onClose={() => setActiveModal(null)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setActiveModal('nfe_list'); // Return to list
        }}
      />

      <InutilizacaoDialog
        isOpen={activeModal === 'inutilizar'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => setActiveModal(null)}
      />

      <CartaCorrecaoDialog
        isOpen={activeModal === 'carta_correcao'}
        notaFiscalId={selectedNfeId || ''}
        onClose={() => setActiveModal(null)}
        onSuccess={() => {
          setActiveModal(null);
          handleRefresh();
        }}
      />

      {/* --- NEW MODULE MODALS --- */}
      <NfeListModal
        isOpen={activeModal === 'nfe_list'}
        onClose={() => setActiveModal(null)}
        onCreate={() => setActiveModal('create_nfe')}
        onDetails={openDetails}
        onFilter={() => setActiveModal('filter_nfe')}
        filters={filters}
      />

      <MdfeModal
        isOpen={activeModal === 'mdfe'}
        onClose={() => setActiveModal(null)}
      />

      <SpedModal
        isOpen={activeModal === 'sped'}
        onClose={() => setActiveModal(null)}
      />

      <EfdModal
        isOpen={activeModal === 'efd'}
        onClose={() => setActiveModal(null)}
      />

      <SintegraModal
        isOpen={activeModal === 'sintegra'}
        onClose={() => setActiveModal(null)}
      />

      <CompraLegalModal
        isOpen={activeModal === 'compra_legal'}
        onClose={() => setActiveModal(null)}
      />

      <RecebimentoModal
        isOpen={activeModal === 'recebimento'}
        onClose={() => setActiveModal(null)}
      />

    </>
  );
}
