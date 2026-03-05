// Re-export shared UI components from financeiro module
// These are generic enough to be used across all ERP modules
export {
  DataTable,
  FilterSheet, FilterField, FilterInput, FilterSelect, FilterDateRange,
  DetailsDrawer, DetailSection, DetailField, DetailFieldGrid, DetailMoney,
  DialogForm, FormInput, FormSelect, FormTextarea,
  ConfirmDialog,
  AttachmentPanel,
  AuditTimeline,
  KPICards, StatusBadge, fmtMoney, fmtDate, isOverdue,
} from '@/modules/financeiro/components/shared';

export type {
  DataTableColumn, DataTableProps,
  FilterSheetProps,
  DetailsDrawerProps, DetailsDrawerAction,
  DialogFormProps,
  ConfirmDialogProps,
  AttachmentPanelProps,
  AuditTimelineProps,
  KPIData,
} from '@/modules/financeiro/components/shared';

// =====================================================
// Inventory-specific helpers
// =====================================================
export function fmtQty(value: number, uom = 'un'): string {
  if (!value && value !== 0) return '—';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${uom}`;
}

export function moveTypeLabel(type: string): string {
  const map: Record<string, string> = {
    inbound: 'Recebimento', outbound: 'Expedição', internal: 'Transferência',
    adjustment: 'Ajuste', scrap: 'Sucata', return_in: 'Devolução Entrada', return_out: 'Devolução Saída',
  };
  return map[type] || type;
}

export function moveStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Rascunho', ready: 'Confirmado', done: 'Executado', canceled: 'Cancelado',
  };
  return map[status] || status;
}

export function countStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: 'Aberta', in_progress: 'Em Progresso', pending_review: 'Aguardando Revisão',
    approved: 'Aprovada', posted: 'Postada', canceled: 'Cancelada',
  };
  return map[status] || status;
}
