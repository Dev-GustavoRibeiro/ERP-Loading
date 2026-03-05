'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { UseFormReturn, FieldValues, Path } from 'react-hook-form';

// =====================================================
// DialogForm — Modal exclusivo para criação/edição
// =====================================================

export interface DialogFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger';
}

export const DialogForm: React.FC<DialogFormProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  onSubmit,
  loading = false,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  size = 'lg',
  children,
  variant = 'primary',
}) => {
  const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  const buttonClasses: Record<string, string> = {
    primary: 'bg-purple-600 hover:bg-purple-700',
    success: 'bg-emerald-600 hover:bg-emerald-700',
    danger: 'bg-red-600 hover:bg-red-700',
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-full p-4',
                sizeClasses[size]
              )}
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
                  </div>
                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Form Content */}
                <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4 scrollbar-none">
                  {children}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    onClick={onSubmit}
                    disabled={loading}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50',
                      buttonClasses[variant]
                    )}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitLabel}
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
// Form Field Components (for use with React Hook Form)
// =====================================================

interface FormFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  className?: string;
}

const isDateOrMonthInput = (t?: string) => t === 'date' || t === 'month';

export function FormInput<T extends FieldValues>({
  form,
  name,
  label,
  type = 'text',
  placeholder,
  required,
  className,
}: FormFieldProps<T> & { type?: string; placeholder?: string }) {
  const error = form.formState.errors[name];
  const dateOrMonth = isDateOrMonthInput(type);

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        {...form.register(name)}
        className={cn(
          'w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-all placeholder-slate-500',
          dateOrMonth
            ? 'bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20'
            : 'bg-[#252d3d] border text-white',
          error ? 'border-red-500/50 focus:border-red-500/70' : dateOrMonth ? '' : 'border-white/10 focus:border-purple-500/50'
        )}
      />
      {error && <p className="text-xs text-red-400">{error.message as string}</p>}
    </div>
  );
}

export function FormSelect<T extends FieldValues>({
  form,
  name,
  label,
  options,
  required,
  className,
}: FormFieldProps<T> & { options: { value: string; label: string }[] }) {
  const error = form.formState.errors[name];

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select
        {...form.register(name)}
        className={cn(
          'w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all text-sm',
          error ? 'border-red-500/50 focus:border-red-500/70' : ''
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error.message as string}</p>}
    </div>
  );
}

export function FormTextarea<T extends FieldValues>({
  form,
  name,
  label,
  placeholder,
  rows = 3,
  required,
  className,
}: FormFieldProps<T> & { placeholder?: string; rows?: number }) {
  const error = form.formState.errors[name];

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <textarea
        rows={rows}
        placeholder={placeholder}
        {...form.register(name)}
        className={cn(
          'w-full px-4 py-2.5 bg-[#252d3d] border rounded-lg text-white placeholder-slate-500 focus:outline-none transition-colors text-sm resize-none',
          error ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10 focus:border-purple-500/50'
        )}
      />
      {error && <p className="text-xs text-red-400">{error.message as string}</p>}
    </div>
  );
}
