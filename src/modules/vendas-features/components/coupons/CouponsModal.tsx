'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Power, PowerOff, Loader2, Tag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  toggleCoupon,
} from '@/app/actions/vendas-features';
import {
  couponCreateSchema,
  type CouponCreateInput,
} from '@/modules/vendas-features/domain/schemas';

interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount?: number | null;
  min_cart_total: number;
  max_uses_total?: number | null;
  max_uses_per_customer?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active: boolean;
  current_uses: number;
  created_at: string;
}

interface CouponsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CouponsModal({ isOpen, onClose }: CouponsModalProps) {
  const empresaId = useEmpresaId();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const form = useForm<CouponCreateInput>({
    resolver: zodResolver(couponCreateSchema),
    defaultValues: {
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      max_discount: null,
      min_cart_total: 0,
      max_uses_total: null,
      max_uses_per_customer: null,
      valid_from: '',
      valid_until: null,
      is_active: true,
    },
  });

  const loadCoupons = async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listCoupons(empresaId);
      setCoupons(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && empresaId) {
      loadCoupons();
    }
  }, [isOpen, empresaId]);

  const handleCreate = () => {
    setEditingCoupon(null);
    form.reset({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      max_discount: null,
      min_cart_total: 0,
      max_uses_total: null,
      max_uses_per_customer: null,
      valid_from: '',
      valid_until: null,
      is_active: true,
    });
    setFormOpen(true);
    setError(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    form.reset({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_discount: coupon.max_discount ?? null,
      min_cart_total: coupon.min_cart_total,
      max_uses_total: coupon.max_uses_total ?? null,
      max_uses_per_customer: coupon.max_uses_per_customer ?? null,
      valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : '',
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : null,
      is_active: coupon.is_active,
    });
    setFormOpen(true);
    setError(null);
  };

  const handleSubmit = async (data: CouponCreateInput) => {
    if (!empresaId) return;
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        ...data,
        valid_from: data.valid_from || null,
        valid_until: data.valid_until || null,
      };

      let result;
      if (editingCoupon) {
        result = await updateCoupon(editingCoupon.id, payload);
      } else {
        result = await createCoupon(empresaId, payload);
      }

      if (!result.success) {
        setError(result.error || 'Erro ao salvar cupom');
        return;
      }

      setFormOpen(false);
      setEditingCoupon(null);
      await loadCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cupom');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    if (!coupon.id) return;
    setTogglingId(coupon.id);
    setError(null);

    try {
      const result = await toggleCoupon(coupon.id, !coupon.is_active);
      if (!result.success) {
        setError(result.error || 'Erro ao alterar status');
        return;
      }
      await loadCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingCoupon(null);
    setError(null);
    form.reset();
    onClose();
  };

  // Calculate KPIs
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.is_active).length;
  const totalUses = coupons.reduce((sum, c) => sum + (c.current_uses || 0), 0);
  const totalDiscount = coupons.reduce((sum, c) => {
    if (c.discount_type === 'fixed') {
      return sum + c.discount_value * (c.current_uses || 0);
    }
    return sum;
  }, 0);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return formatCurrency(coupon.discount_value);
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="coupons-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
              onClick={handleClose}
            />

            {/* Modal */}
            <motion.div
              key="coupons-modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-4 sm:inset-8 z-[80] bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/10 flex-shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">
                    {formOpen ? (editingCoupon ? 'Editar Cupom' : 'Novo Cupom') : 'Cupons de Desconto'}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {formOpen ? (
                  /* Form View */
                  <div className="flex-1 overflow-y-auto scrollbar-none p-6">
                    {error && (
                      <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                      </div>
                    )}

                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Código *
                          </label>
                          <input
                            {...form.register('code')}
                            className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="Ex: DESCONTO10"
                          />
                          {form.formState.errors.code && (
                            <p className="mt-1 text-xs text-red-400">
                              {form.formState.errors.code.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Tipo de Desconto *
                          </label>
                          <select
                            {...form.register('discount_type')}
                            className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                          >
                            <option value="percentage">Percentual (%)</option>
                            <option value="fixed">Valor Fixo (R$)</option>
                          </select>
                          {form.formState.errors.discount_type && (
                            <p className="mt-1 text-xs text-red-400">
                              {form.formState.errors.discount_type.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Descrição
                        </label>
                        <textarea
                          {...form.register('description')}
                          rows={2}
                          className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all resize-none"
                          placeholder="Descrição opcional do cupom"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Valor do Desconto *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            {...form.register('discount_value', { valueAsNumber: true })}
                            className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder={form.watch('discount_type') === 'percentage' ? 'Ex: 10' : 'Ex: 50.00'}
                          />
                          {form.formState.errors.discount_value && (
                            <p className="mt-1 text-xs text-red-400">
                              {form.formState.errors.discount_value.message}
                            </p>
                          )}
                        </div>

                        {form.watch('discount_type') === 'percentage' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Desconto Máximo (R$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              {...form.register('max_discount', { valueAsNumber: true })}
                              className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                              placeholder="Ex: 100.00"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Valor Mínimo do Carrinho (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            {...form.register('min_cart_total', { valueAsNumber: true })}
                            className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="Ex: 100.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Máximo de Usos Total
                          </label>
                          <input
                            type="number"
                            {...form.register('max_uses_total', { valueAsNumber: true })}
                            className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="Ex: 100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Máximo de Usos por Cliente
                          </label>
                          <input
                            type="number"
                            {...form.register('max_uses_per_customer', { valueAsNumber: true })}
                            className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 placeholder-slate-500 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="Ex: 1"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Status
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              {...form.register('is_active')}
                              className="w-4 h-4 rounded bg-[#252d3d] border-white/10 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-slate-300">Ativo</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Válido a partir de
                          </label>
                          <input
                            type="date"
                            {...form.register('valid_from')}
                            className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Válido até
                          </label>
                          <input
                            type="date"
                            {...form.register('valid_until')}
                            className="w-full px-4 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormOpen(false);
                            setEditingCoupon(null);
                            setError(null);
                            form.reset();
                          }}
                          className="px-4 py-2 bg-[#252d3d] hover:bg-[#2d3647] text-slate-300 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  /* List View */
                  <>
                    {/* KPI Bar */}
                    <div className="px-6 py-4 border-b border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-[#252d3d]/50 rounded-lg border border-white/[0.04] p-4">
                        <div className="text-sm text-slate-400 mb-1">Total de Cupons</div>
                        <div className="text-2xl font-bold text-white">{totalCoupons}</div>
                      </div>
                      <div className="bg-[#252d3d]/50 rounded-lg border border-white/[0.04] p-4">
                        <div className="text-sm text-slate-400 mb-1">Ativos</div>
                        <div className="text-2xl font-bold text-emerald-400">{activeCoupons}</div>
                      </div>
                      <div className="bg-[#252d3d]/50 rounded-lg border border-white/[0.04] p-4">
                        <div className="text-sm text-slate-400 mb-1">Total de Usos</div>
                        <div className="text-2xl font-bold text-white">{totalUses}</div>
                      </div>
                      <div className="bg-[#252d3d]/50 rounded-lg border border-white/[0.04] p-4">
                        <div className="text-sm text-slate-400 mb-1">Desconto Total</div>
                        <div className="text-2xl font-bold text-purple-400">
                          {formatCurrency(totalDiscount)}
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                      <div className="text-sm text-slate-400">
                        {coupons.length} cupon{coupons.length !== 1 ? 's' : ''} encontrado
                        {coupons.length !== 1 ? 's' : ''}
                      </div>
                      <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Novo Cupom
                      </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="mx-6 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                      </div>
                    )}

                    {/* List */}
                    <div className="flex-1 overflow-y-auto scrollbar-none p-6">
                      {loading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                        </div>
                      ) : coupons.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Tag className="w-12 h-12 text-slate-600 mb-4" />
                          <p className="text-slate-400 text-lg font-medium mb-2">
                            Nenhum cupom encontrado
                          </p>
                          <p className="text-slate-500 text-sm mb-4">
                            Crie seu primeiro cupom de desconto para começar
                          </p>
                          <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Criar Cupom
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {coupons.map((coupon, index) => (
                            <div
                              key={coupon.id}
                              className={cn(
                                'bg-[#252d3d]/50 rounded-lg border border-white/[0.04] p-4',
                                index % 2 === 0 && 'bg-[#252d3d]/30'
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-bold text-white text-lg">{coupon.code}</span>
                                    <span
                                      className={cn(
                                        'text-xs px-2 py-0.5 rounded font-medium',
                                        coupon.is_active
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : 'bg-slate-500/20 text-slate-400'
                                      )}
                                    >
                                      {coupon.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-purple-500/20 text-purple-400">
                                      {coupon.discount_type === 'percentage' ? 'Percentual' : 'Fixo'}
                                    </span>
                                  </div>
                                  {coupon.description && (
                                    <p className="text-sm text-slate-400 mb-2">{coupon.description}</p>
                                  )}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-slate-500">Desconto:</span>{' '}
                                      <span className="text-white font-medium">
                                        {formatDiscount(coupon)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Usos:</span>{' '}
                                      <span className="text-white font-medium">
                                        {coupon.current_uses || 0}
                                        {coupon.max_uses_total
                                          ? ` / ${coupon.max_uses_total}`
                                          : ''}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Mín. Carrinho:</span>{' '}
                                      <span className="text-white font-medium">
                                        {formatCurrency(coupon.min_cart_total)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Válido até:</span>{' '}
                                      <span className="text-white font-medium">
                                        {formatDate(coupon.valid_until)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <button
                                    onClick={() => handleEdit(coupon)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleToggle(coupon)}
                                    disabled={togglingId === coupon.id}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white disabled:opacity-50"
                                    title={coupon.is_active ? 'Desativar' : 'Ativar'}
                                  >
                                    {togglingId === coupon.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : coupon.is_active ? (
                                      <PowerOff className="w-4 h-4" />
                                    ) : (
                                      <Power className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
