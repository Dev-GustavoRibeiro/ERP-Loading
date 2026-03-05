'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit, DollarSign, Undo2, Paperclip, History } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';

// =====================================================
// Types
// =====================================================

export interface DetailsDrawerAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
}

export interface DetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  status?: { label: string; color: string };
  actions?: DetailsDrawerAction[];
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

// =====================================================
// Component
// =====================================================

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  status,
  actions = [],
  children,
  width = 'lg',
}) => {
  const widthClass = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };
  const variantClasses: Record<string, string> = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-[#252d3d] hover:bg-[#2d3548] text-white border border-white/10',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[85]"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn('fixed right-0 top-0 h-full w-full z-[86] flex flex-col', widthClass[width])}
            >
              <div className="flex flex-col h-full bg-[#1a1f2e] border-l border-white/10 shadow-2xl">
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-base font-semibold text-white truncate">{title}</h2>
                        {status && (
                          <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-medium', status.color)}>
                            {status.label}
                          </span>
                        )}
                      </div>
                      {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors ml-3">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  {/* Action buttons */}
                  {actions.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {actions.map((action, i) => (
                        <button
                          key={i}
                          onClick={action.onClick}
                          disabled={action.disabled}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-40',
                            variantClasses[action.variant || 'secondary']
                          )}
                        >
                          <action.icon className="w-3.5 h-3.5" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-none">
                  {children}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

// =====================================================
// Detail Section & Field Helpers
// =====================================================

export const DetailSection: React.FC<{
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon: Icon, children, className }) => (
  <div className={cn('space-y-3', className)}>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
    </div>
    <div className="rounded-xl border border-white/[0.06] bg-[#111827]/50 p-4 space-y-3">
      {children}
    </div>
  </div>
);

export const DetailField: React.FC<{
  label: string;
  value: React.ReactNode;
  className?: string;
}> = ({ label, value, className }) => (
  <div className={cn('flex items-start justify-between', className)}>
    <span className="text-xs text-slate-500">{label}</span>
    <span className="text-sm text-white font-medium text-right">{value || '—'}</span>
  </div>
);

export const DetailFieldGrid: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div className="grid grid-cols-2 gap-3">
    {children}
  </div>
);

export const DetailMoney: React.FC<{
  label: string;
  value: number;
  color?: 'default' | 'positive' | 'negative';
}> = ({ label, value, color = 'default' }) => {
  const formatted = `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const colorClass = color === 'positive' ? 'text-emerald-400' : color === 'negative' ? 'text-red-400' : 'text-white';

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn('text-sm font-semibold', colorClass)}>{formatted}</span>
    </div>
  );
};
