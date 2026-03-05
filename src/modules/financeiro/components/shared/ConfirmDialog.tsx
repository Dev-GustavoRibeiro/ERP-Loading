'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';

// =====================================================
// ConfirmDialog — Para ações críticas (delete/estorno/etc)
// =====================================================

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  /** Optional: require typing a confirmation string */
  confirmationText?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  confirmationText,
}) => {
  const [typed, setTyped] = React.useState('');
  const needsTyping = !!confirmationText;
  const canConfirm = !needsTyping || typed === confirmationText;

  React.useEffect(() => {
    if (!isOpen) setTyped('');
  }, [isOpen]);

  const variantStyles = {
    danger: {
      icon: 'bg-red-500/15 text-red-400',
      button: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: 'bg-amber-500/15 text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
    info: {
      icon: 'bg-blue-500/15 text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const styles = variantStyles[variant];

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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[95] w-full max-w-md p-4"
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {/* Header with icon */}
                <div className="p-6 pb-4">
                  <div className="flex items-start gap-4">
                    <div className={cn('p-2.5 rounded-xl flex-shrink-0', styles.icon)}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white">{title}</h3>
                      <div className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                        {description}
                      </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>

                  {/* Confirmation text input */}
                  {needsTyping && (
                    <div className="mt-4 space-y-1.5">
                      <p className="text-xs text-slate-500">
                        Digite <span className="font-bold text-slate-300">{confirmationText}</span> para confirmar:
                      </p>
                      <input
                        type="text"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#252d3d] border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                        placeholder={confirmationText}
                      />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={loading || !canConfirm}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40',
                      styles.button
                    )}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {confirmLabel}
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
