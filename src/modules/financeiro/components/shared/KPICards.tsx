'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/utils';

// =====================================================
// KPI Card — Reusable financial KPI display
// =====================================================

export interface KPIData {
  label: string;
  value: string;
  subValue?: string;
  color?: 'emerald' | 'red' | 'blue' | 'amber' | 'purple' | 'cyan' | 'slate';
}

export interface KPICardsProps {
  items: KPIData[];
}

const colorStyles: Record<string, { bg: string; border: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400' },
};

export const KPICards: React.FC<KPICardsProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item, i) => {
        const c = colorStyles[item.color || 'blue'];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className={cn('p-3.5 rounded-xl border text-center', c.bg, c.border)}
          >
            <p className="text-xs text-slate-400 mb-1">{item.label}</p>
            <p className={cn('text-lg font-bold', c.text)}>{item.value}</p>
            {item.subValue && (
              <p className="text-xs text-slate-500 mt-0.5">{item.subValue}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

// =====================================================
// StatusBadge — Reusable status badge
// =====================================================

const statusConfig: Record<string, { label: string; color: string }> = {
  aberta: { label: 'Aberta', color: 'bg-amber-500/20 text-amber-400' },
  parcial: { label: 'Parcial', color: 'bg-blue-500/20 text-blue-400' },
  paga: { label: 'Pago', color: 'bg-emerald-500/20 text-emerald-400' },
  recebida: { label: 'Recebido', color: 'bg-emerald-500/20 text-emerald-400' },
  cancelada: { label: 'Cancelada', color: 'bg-slate-500/20 text-slate-400' },
  vencida: { label: 'Vencido', color: 'bg-red-500/20 text-red-400' },
  draft: { label: 'Rascunho', color: 'bg-slate-500/20 text-slate-400' },
  reversed: { label: 'Estornado', color: 'bg-amber-500/20 text-amber-400' },
};

export const StatusBadge: React.FC<{ status: string; overdue?: boolean }> = ({ status, overdue }) => {
  const effectiveStatus = overdue && !['paga', 'recebida', 'cancelada'].includes(status) ? 'vencida' : status;
  const config = statusConfig[effectiveStatus] || { label: status, color: 'bg-slate-500/20 text-slate-400' };

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap', config.color)}>
      {config.label}
    </span>
  );
};

// =====================================================
// Money Formatter
// =====================================================

export function fmtMoney(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function fmtDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function isOverdue(dueDate: string, status: string): boolean {
  return !['paga', 'recebida', 'cancelada'].includes(status) && new Date(dueDate) < new Date();
}
