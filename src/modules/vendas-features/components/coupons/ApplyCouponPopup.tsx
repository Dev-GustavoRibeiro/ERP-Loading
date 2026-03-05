'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, X, Loader2, Check, AlertCircle, Tag } from 'lucide-react';
import { validateCoupon } from '@/app/actions/vendas-features';
import { cn } from '@/shared/lib/utils';

interface ApplyCouponPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (couponId: string, code: string, discountAmount: number) => void;
  empresaId: string | null;
  cartTotal: number;
  customerId?: string | null;
}

export function ApplyCouponPopup({ isOpen, onClose, onApply, empresaId, cartTotal, customerId }: ApplyCouponPopupProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; reason?: string; coupon?: any; discountAmount?: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setResult(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleValidate = async () => {
    if (!code.trim() || !empresaId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await validateCoupon(empresaId, code.trim(), cartTotal, customerId);
      setResult(res);
    } catch {
      setResult({ valid: false, reason: 'Erro ao validar cupom' });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result?.valid && result.coupon && result.discountAmount) {
      onApply(result.coupon.id, result.coupon.code, result.discountAmount);
      onClose();
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="bg-[#151d2b] border border-white/10 rounded-2xl p-6 w-96 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-400" />
                <p className="text-white font-semibold">Aplicar Cupom</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setResult(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                  placeholder="Digite o código do cupom..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono uppercase tracking-wider focus:outline-none focus:border-amber-500/50 placeholder:text-slate-600 placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
                />
                <button
                  onClick={handleValidate}
                  disabled={loading || !code.trim()}
                  className="px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-xl text-white font-medium transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                </button>
              </div>

              {/* Result */}
              <AnimatePresence mode="wait">
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    {result.valid ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-medium text-sm">Cupom válido!</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-400">{result.coupon.description || result.coupon.code}</span>
                          <span className="text-lg font-bold text-emerald-400 font-mono">
                            -R$ {fmt(result.discountAmount || 0)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {result.coupon.discount_type === 'percentage'
                            ? `${result.coupon.discount_value}% de desconto`
                            : `R$ ${fmt(result.coupon.discount_value)} de desconto`
                          }
                          {result.coupon.min_cart_total > 0 && ` · Mín: R$ ${fmt(result.coupon.min_cart_total)}`}
                        </div>
                        <button
                          onClick={handleApply}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" /> Aplicar Desconto
                        </button>
                      </div>
                    ) : (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 font-medium text-sm">{result.reason}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cart total info */}
              <div className="text-xs text-slate-600 text-center">
                Total do carrinho: <span className="text-slate-400 font-mono">R$ {fmt(cartTotal)}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
