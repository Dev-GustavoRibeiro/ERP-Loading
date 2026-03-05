'use client';

import React, { useState, useEffect } from 'react';
import { History, Plus, Edit, Trash2, DollarSign, Undo2, Link2, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { listAuditLogs } from '@/app/actions/financeiro';

// =====================================================
// AuditTimeline — Timeline de auditoria
// =====================================================

export interface AuditTimelineProps {
  entityType: string;
  entityId: string;
}

const actionIcons: Record<string, React.ElementType> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  pay: DollarSign,
  receive: DollarSign,
  reverse: Undo2,
  reconcile: Link2,
  import: Plus,
};

const actionLabels: Record<string, string> = {
  create: 'Criado',
  update: 'Editado',
  delete: 'Excluído',
  pay: 'Pagamento',
  receive: 'Recebimento',
  reverse: 'Estorno',
  reconcile: 'Conciliação',
  import: 'Importação',
};

const actionColors: Record<string, string> = {
  create: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  update: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  delete: 'bg-red-500/15 text-red-400 border-red-500/30',
  pay: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  receive: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  reverse: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  reconcile: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  import: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ entityType, entityId }) => {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await listAuditLogs(entityType, entityId);
        if (!cancelled) setLogs(data);
      } catch {
        // silently handle
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <History className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-sm text-slate-500">Nenhum registro de auditoria</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {logs.map((log, i) => {
        const action = log.action as string;
        const Icon = actionIcons[action] || History;
        const label = actionLabels[action] || action;
        const colorClass = actionColors[action] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
        const changes = log.changes as { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
        const metadata = log.metadata as Record<string, unknown> | null;

        return (
          <div key={log.id as string} className="flex gap-3 relative">
            {/* Connector line */}
            {i < logs.length - 1 && (
              <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-white/[0.06]" />
            )}

            {/* Icon */}
            <div className={cn('w-[30px] h-[30px] rounded-lg border flex items-center justify-center flex-shrink-0 relative z-10', colorClass)}>
              <Icon className="w-3.5 h-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-4 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-white">{label}</span>
                <span className="text-xs text-slate-500">{formatDateTime(log.created_at as string)}</span>
              </div>

              {log.user_name && (
                <p className="text-xs text-slate-500 mt-0.5">por {log.user_name as string}</p>
              )}

              {/* Show key changes */}
              {changes && action === 'update' && changes.before && changes.after && (
                <div className="mt-2 space-y-1">
                  {Object.keys(changes.after).map((key) => {
                    const bef = changes.before?.[key];
                    const aft = changes.after?.[key];
                    if (JSON.stringify(bef) === JSON.stringify(aft)) return null;
                    if (['updated_at', 'created_at'].includes(key)) return null;
                    return (
                      <div key={key} className="text-xs text-slate-400">
                        <span className="text-slate-500">{key}:</span>{' '}
                        <span className="text-red-400/70 line-through">{String(bef ?? '—')}</span>{' '}
                        → <span className="text-emerald-400">{String(aft ?? '—')}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Show metadata */}
              {metadata && (action === 'pay' || action === 'receive') && metadata.valor_pago && (
                <p className="text-xs text-slate-400 mt-1">
                  Valor: R$ {(metadata.valor_pago as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
              {metadata && (action === 'pay' || action === 'receive') && metadata.valor_recebido && (
                <p className="text-xs text-slate-400 mt-1">
                  Valor: R$ {(metadata.valor_recebido as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
              {metadata && action === 'reverse' && metadata.motivo && (
                <p className="text-xs text-amber-400 mt-1">Motivo: {metadata.motivo as string}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
