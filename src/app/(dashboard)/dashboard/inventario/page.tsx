'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  ArrowRightLeft,
  Truck,
  ClipboardCheck,
  Wrench,
  Trash2,
  RefreshCw,
  Warehouse,
  Route,
  ScanBarcode,
  DollarSign,
} from 'lucide-react';
import { PageTemplate, StatCardData, ModuleCardData, ActionButtonData } from '@/shared/components/templates';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { getStockSummary, listWarehouses } from '@/app/actions/inventario';

// Professional Inventory Modal Components
import { StockModal } from '@/modules/inventario/components/stock/StockModal';
import { MovementsModal } from '@/modules/inventario/components/movements/MovementsModal';
import { OperationsModal } from '@/modules/inventario/components/operations/OperationsModal';
import { CountsModal } from '@/modules/inventario/components/counts/CountsModal';
import { AdjustmentsModal } from '@/modules/inventario/components/adjustments/AdjustmentsModal';
import { ScrapModal } from '@/modules/inventario/components/scrap/ScrapModal';
import { ReplenishmentModal } from '@/modules/inventario/components/replenishment/ReplenishmentModal';
import { WarehousesModal } from '@/modules/inventario/components/warehouses/WarehousesModal';
import { RulesModal } from '@/modules/inventario/components/rules/RulesModal';
import { TraceabilityModal } from '@/modules/inventario/components/traceability/TraceabilityModal';
import { ValuationModal } from '@/modules/inventario/components/valuation/ValuationModal';

// =====================================================
// Page Component
// =====================================================

type ModalType =
  | 'stock' | 'movements' | 'operations' | 'counts'
  | 'adjustments' | 'scrap' | 'replenishment'
  | 'warehouses' | 'rules' | 'traceability' | 'valuation'
  | null;

export default function InventarioPage() {
  const empresaId = useEmpresaId();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [stats, setStats] = useState<StatCardData[]>([
    { title: 'Itens em Estoque', value: '-', description: 'Registros com saldo', icon: Package, color: 'violet', trend: 0 },
    { title: 'On-hand Total', value: '-', description: 'Quantidade total', icon: Package, color: 'blue', trend: 0 },
    { title: 'Reservado', value: '-', description: 'Comprometido', icon: ClipboardCheck, color: 'amber', trend: 0 },
    { title: 'Abaixo Mínimo', value: '-', description: 'Itens críticos', icon: RefreshCw, color: 'red', trend: 0 },
  ]);

  const loadStats = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [summary, warehouses] = await Promise.all([
        getStockSummary(empresaId),
        listWarehouses(empresaId),
      ]);
      const fmt = (v: number) => v.toLocaleString('pt-BR');
      setStats([
        { title: 'Itens em Estoque', value: fmt(summary.totalItems), description: 'Registros com saldo', icon: Package, color: 'violet', trend: summary.totalItems > 0 ? 5 : 0 },
        { title: 'On-hand Total', value: fmt(summary.totalOnHand), description: `${warehouses.length} depósito(s)`, icon: Package, color: 'blue', trend: summary.totalOnHand > 0 ? 3 : 0 },
        { title: 'Reservado', value: fmt(summary.totalReserved), description: 'Comprometido', icon: ClipboardCheck, color: 'amber', trend: 0 },
        { title: 'Abaixo Mínimo', value: fmt(summary.belowMin), description: 'Itens críticos', icon: RefreshCw, color: 'red', trend: summary.belowMin > 0 ? -10 : 0 },
      ]);
    } catch {
      // Keep defaults
    }
  }, [empresaId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const actionButtons: ActionButtonData[] = [
    { icon: Truck, label: 'Nova Operação', variant: 'primary', onClick: () => setActiveModal('operations') },
    { icon: Wrench, label: 'Ajuste Rápido', variant: 'secondary', onClick: () => setActiveModal('adjustments') },
  ];

  const modules: ModuleCardData[] = [
    { icon: Package, label: 'Estoque', description: 'Visão de saldos por produto, depósito e localização com filtros avançados.', color: 'violet', onClick: () => setActiveModal('stock') },
    { icon: ArrowRightLeft, label: 'Movimentações', description: 'Ledger completo de entradas, saídas, transferências e ajustes.', color: 'blue', onClick: () => setActiveModal('movements') },
    { icon: Truck, label: 'Operações', description: 'Recebimentos, expedições e transferências internas com fluxo multi-step.', color: 'emerald', onClick: () => setActiveModal('operations') },
    { icon: ClipboardCheck, label: 'Inventário Físico', description: 'Contagens cíclicas e completas com resolução de divergências.', color: 'amber', onClick: () => setActiveModal('counts') },
    { icon: Wrench, label: 'Ajustes', description: 'Ajustes manuais de estoque com rastreabilidade e estorno.', color: 'cyan', onClick: () => setActiveModal('adjustments') },
    { icon: Trash2, label: 'Sucata/Perdas', description: 'Ordens de sucata com rastreio de motivo e movimentação automática.', color: 'red', onClick: () => setActiveModal('scrap') },
    { icon: RefreshCw, label: 'Reposição', description: 'Regras min/max e sugestões automáticas de reposição de estoque.', color: 'orange', onClick: () => setActiveModal('replenishment') },
    { icon: Warehouse, label: 'Depósitos & Localizações', description: 'Gestão de armazéns, zonas, prateleiras e locais de armazenagem.', color: 'purple', onClick: () => setActiveModal('warehouses') },
    { icon: Route, label: 'Regras & Rotas', description: 'Putaway rules e rotas push/pull para automação de movimentações.', color: 'teal', onClick: () => setActiveModal('rules') },
    { icon: ScanBarcode, label: 'Rastreabilidade', description: 'Lotes, séries, validades e consulta por código de barras.', color: 'indigo', onClick: () => setActiveModal('traceability') },
    { icon: DollarSign, label: 'Valoração', description: 'Valor do estoque por depósito com métodos standard, AVCO e FIFO.', color: 'emerald', onClick: () => setActiveModal('valuation') },
  ];

  const closeModal = () => {
    setActiveModal(null);
    loadStats();
  };

  return (
    <>
      <PageTemplate
        title="Inventário"
        subtitle="Gestão completa de estoque e armazéns"
        icon={Package}
        accentColor="violet"
        actionButtons={actionButtons}
        stats={stats}
        modules={{ title: 'Módulos de Inventário', items: modules }}
      />

      {/* Professional Inventory Module Modals */}
      <StockModal isOpen={activeModal === 'stock'} onClose={closeModal} />
      <MovementsModal isOpen={activeModal === 'movements'} onClose={closeModal} />
      <OperationsModal isOpen={activeModal === 'operations'} onClose={closeModal} />
      <CountsModal isOpen={activeModal === 'counts'} onClose={closeModal} />
      <AdjustmentsModal isOpen={activeModal === 'adjustments'} onClose={closeModal} />
      <ScrapModal isOpen={activeModal === 'scrap'} onClose={closeModal} />
      <ReplenishmentModal isOpen={activeModal === 'replenishment'} onClose={closeModal} />
      <WarehousesModal isOpen={activeModal === 'warehouses'} onClose={closeModal} />
      <RulesModal isOpen={activeModal === 'rules'} onClose={closeModal} />
      <TraceabilityModal isOpen={activeModal === 'traceability'} onClose={closeModal} />
      <ValuationModal isOpen={activeModal === 'valuation'} onClose={closeModal} />
    </>
  );
}
