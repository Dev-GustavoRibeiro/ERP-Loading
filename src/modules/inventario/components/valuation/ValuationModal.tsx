'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Package, Loader2 } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import {
  KPICards,
  fmtMoney,
  fmtQty,
} from '../shared';
import {
  getInventoryValuation,
  listWarehouses,
} from '@/app/actions/inventario';

// =====================================================
// Types
// =====================================================

interface ValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ValuationItem = {
  on_hand: number;
  value: number;
  item?: {
    name?: string;
    sku?: string;
    standard_cost?: number;
    costing_method?: string;
    category?: string;
  };
  warehouse?: { name?: string };
};

type WarehouseOption = { id: string; name?: string; code?: string };

// =====================================================
// Component
// =====================================================

function CostingMethodBadge({ method }: { method?: string }) {
  const config: Record<string, string> = {
    standard: 'bg-blue-500/20 text-blue-400',
    avco: 'bg-purple-500/20 text-purple-400',
    fifo: 'bg-amber-500/20 text-amber-400',
  };
  const labels: Record<string, string> = {
    standard: 'Padrão',
    avco: 'Custo Médio',
    fifo: 'FIFO',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', config[method || ''] || 'bg-slate-500/20 text-slate-400')}>
      {labels[method || ''] || method || '—'}
    </span>
  );
}

export const ValuationModal: React.FC<ValuationModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();
  const [items, setItems] = useState<ValuationItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  const loadValuation = async () => {
    if (!empresaId) return;
    setLoading(true);
    const res = await getInventoryValuation(empresaId, warehouseId || undefined);
    setItems((res.items as ValuationItem[]) || []);
    setTotalValue(res.totalValue || 0);
    setLoading(false);
  };

  const loadWarehouses = async () => {
    if (!empresaId) return;
    const data = await listWarehouses(empresaId);
    setWarehouses((data as WarehouseOption[]) || []);
  };

  useEffect(() => {
    if (isOpen && empresaId) {
      loadWarehouses();
    }
  }, [isOpen, empresaId]);

  useEffect(() => {
    if (isOpen && empresaId) {
      loadValuation();
    }
  }, [isOpen, empresaId, warehouseId]);

  const valuedCount = items.length;
  const avgCost = valuedCount > 0 ? totalValue / items.reduce((s, i) => s + (i.on_hand || 0), 0) : 0;

  const kpiItems = [
    { label: 'Valor Total Estoque', value: fmtMoney(totalValue), color: 'emerald' as const },
    { label: 'Itens Valorizados', value: String(valuedCount), color: 'blue' as const },
    { label: 'Custo Médio', value: fmtMoney(avgCost), color: 'purple' as const },
  ];

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="valuation-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            <motion.div
              key="valuation-modal"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-4xl max-h-[90vh] p-4"
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h2 className="text-lg font-semibold text-white">Valoração de Estoque</h2>
                      <p className="text-sm text-slate-400">Valor total e custos por item</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-medium text-slate-300">Depósito</label>
                    <select
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] rounded-lg text-sm text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all min-w-[200px]"
                    >
                      <option value="">Todos</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name || w.code || w.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <KPICards items={kpiItems} />

                  <div className="bg-[#111827]/50 rounded-xl border border-white/5 overflow-hidden">
                    {loading ? (
                      <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                      </div>
                    ) : items.length === 0 ? (
                      <div className="py-16 text-center text-slate-500">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum item valorizado</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="px-4 py-3 text-left text-slate-400 font-medium">Item</th>
                              <th className="px-4 py-3 text-right text-slate-400 font-medium">On-hand</th>
                              <th className="px-4 py-3 text-right text-slate-400 font-medium">Custo Padrão</th>
                              <th className="px-4 py-3 text-right text-slate-400 font-medium">Valor Total</th>
                              <th className="px-4 py-3 text-center text-slate-400 font-medium">Custeio</th>
                              <th className="px-4 py-3 text-left text-slate-400 font-medium">Categoria</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((row, idx) => {
                              const item = row.item;
                              const cost = (item?.standard_cost as number) || 0;
                              const qty = row.on_hand || 0;
                              return (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                  <td className="px-4 py-3">
                                    <div>
                                      <p className="font-medium text-white">{item?.name || '—'}</p>
                                      <p className="text-xs text-slate-400">{item?.sku || ''}</p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-300">{fmtQty(qty)}</td>
                                  <td className="px-4 py-3 text-right text-slate-300">{fmtMoney(cost)}</td>
                                  <td className="px-4 py-3 text-right font-medium text-emerald-400">{fmtMoney(row.value || 0)}</td>
                                  <td className="px-4 py-3 text-center">
                                    <CostingMethodBadge method={item?.costing_method} />
                                  </td>
                                  <td className="px-4 py-3 text-slate-400">{item?.category || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {items.length > 0 && (
                    <div className="bg-[#111827]/50 rounded-xl border border-emerald-500/20 p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">Valor Total do Estoque</span>
                      <span className="text-xl font-bold text-emerald-400">{fmtMoney(totalValue)}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};
