'use client';

import React, { Fragment, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Portal } from '@/shared/components/atoms/Portal';

// =====================================================
// Modal Component - Reutilizável para todas as páginas
// =====================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

export function Modal({ isOpen, onClose, title, size = 'md', children, footer }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Fecha com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <Fragment>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />
            {/* Modal */}
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'fixed left-1/2 top-1/2 z-[80] -translate-x-1/2 -translate-y-1/2',
                'w-full',
                sizeClasses[size],
                'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
                'border border-white/10 rounded-2xl shadow-2xl',
                'flex flex-col max-h-[90vh]'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-none">
                {children}
              </div>
              {/* Footer */}
              {footer && (
                <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </Fragment>
        )}
      </AnimatePresence>
    </Portal>
  );
}

// =====================================================
// Button Component
// =====================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const buttonVariants = {
  primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25',
  secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25',
  warning: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25',
  info: 'bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25',
  ghost: 'hover:bg-white/10 text-slate-300 hover:text-white',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Carregando...
        </span>
      ) : children}
    </button>
  );
}

// =====================================================
// Input Component
// =====================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-300">{label}</label>
      )}
      <input
        className={cn(
          'w-full px-4 py-2.5 rounded-lg',
          'bg-[#1a2235] border border-white/[0.08]',
          'text-white/90 placeholder:text-slate-500',
          'hover:border-white/20',
          'focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500/40',
          'transition-all duration-200',
          error && 'border-red-500/50 focus:ring-red-500/20',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {helperText && !error && <p className="text-sm text-slate-500">{helperText}</p>}
    </div>
  );
}

// =====================================================
// Select Component
// =====================================================

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-300">{label}</label>
      )}
      <select
        className={cn(
          'w-full px-4 py-2.5 rounded-lg select-zed',
          'bg-[#1a2235] border border-white/[0.08]',
          'text-white/90',
          'hover:border-white/20',
          'focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500/40',
          'transition-all duration-200',
          error && 'border-red-500/50 focus:ring-red-500/20',
          className
        )}
        {...props}
      >
        {(options || []).map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

// =====================================================
// Card Component
// =====================================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className, onClick, hover = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-gradient-to-br from-white/5 to-white/[0.02]',
        'border border-white/10 rounded-xl',
        'backdrop-blur-sm',
        hover && 'cursor-pointer hover:border-white/20 hover:shadow-lg hover:shadow-white/5 transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}

// =====================================================
// Tabs Component
// =====================================================

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
      {(tabs || []).map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
            activeTab === tab.id
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs',
              activeTab === tab.id ? 'bg-blue-500/30 text-blue-300' : 'bg-white/10 text-slate-400'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// =====================================================
// Badge Component
// =====================================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

const badgeVariants = {
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  default: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      badgeVariants[variant]
    )}>
      {children}
    </span>
  );
}

// =====================================================
// DataTable Component
// =====================================================

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado'
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const safeData = data || [];
  const safeColumns = columns || [];

  if (safeData.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {safeColumns.map(col => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left text-sm font-medium text-slate-400"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeData.map(item => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'border-b border-white/5',
                onRowClick && 'cursor-pointer hover:bg-white/5 transition-colors'
              )}
            >
              {safeColumns.map(col => (
                <td key={String(col.key)} className="px-4 py-3 text-sm text-slate-300">
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key as string] ?? '')
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================
// SearchInput Component
// =====================================================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...' }: SearchInputProps) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-4 py-2.5 rounded-lg',
          'bg-white/5 border border-white/10',
          'text-white placeholder:text-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
          'transition-all duration-200'
        )}
      />
    </div>
  );
}

// =====================================================
// StatCard Component
// =====================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple';
}

const statColorClasses = {
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
  emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
  amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20',
  red: 'from-red-500/20 to-red-600/10 border-red-500/20',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/20',
};

export function StatCard({ title, value, icon, trend, color = 'blue' }: StatCardProps) {
  return (
    <div className={cn(
      'p-5 rounded-xl border',
      'bg-gradient-to-br',
      statColorClasses[color]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {trend && (
            <p className={cn(
              'text-sm mt-1',
              trend.isPositive ? 'text-emerald-400' : 'text-red-400'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-white/10">
          {icon}
        </div>
      </div>
    </div>
  );
}
