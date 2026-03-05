'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, RotateCcw } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';

// =====================================================
// Types
// =====================================================

export interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  title?: string;
  children: React.ReactNode;
  hasActiveFilters?: boolean;
}

// =====================================================
// Component
// =====================================================

export const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  onClose,
  onApply,
  onReset,
  title = 'Filtros Avançados',
  children,
  hasActiveFilters = false,
}) => {
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[85]"
            />

            {/* Sheet (right side drawer) */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md z-[86] flex flex-col"
            >
              <div className="flex flex-col h-full bg-[#1a1f2e] border-l border-white/10 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <Filter className="w-4.5 h-4.5 text-purple-400" />
                    <h2 className="text-base font-semibold text-white">{title}</h2>
                    {hasActiveFilters && (
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-none">
                  {children}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
                  <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Limpar
                  </button>
                  <button
                    onClick={() => { onApply(); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
                  >
                    <Filter className="w-4 h-4" />
                    Aplicar Filtros
                  </button>
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
// Filter Field Components
// =====================================================

export const FilterField: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className }) => (
  <div className={cn('space-y-1.5', className)}>
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const isDateOrMonthInput = (t?: string) => t === 'date' || t === 'month';

export const FilterInput: React.FC<{
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ type = 'text', value, onChange, placeholder }) => {
  const dateOrMonth = isDateOrMonthInput(type);
  const inputClasses = dateOrMonth
    ? 'w-full px-3.5 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-xl text-sm text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all'
    : 'w-full px-3.5 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors';
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClasses}
    />
  );
};

export const FilterSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-3.5 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-xl text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

export const FilterDateRange: React.FC<{
  startValue: string;
  endValue: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}> = ({ startValue, endValue, onStartChange, onEndChange }) => (
  <div className="grid grid-cols-2 gap-2">
    <FilterInput type="date" value={startValue} onChange={onStartChange} placeholder="Início" />
    <FilterInput type="date" value={endValue} onChange={onEndChange} placeholder="Fim" />
  </div>
);
