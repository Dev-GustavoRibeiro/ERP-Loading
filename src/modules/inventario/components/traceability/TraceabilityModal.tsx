'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Barcode, Package, QrCode, Plus, Search, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import {
  DataTable,
  DataTableColumn,
  DialogForm,
  FormInput,
  FormSelect,
  FormTextarea,
  fmtDate,
} from '../shared';
import {
  listLots,
  createLot,
  listItems,
  listLocations,
} from '@/app/actions/inventario';
import { lotCreateSchema, type LotCreateInput } from '../../domain/schemas';

// =====================================================
// Types
// =====================================================

interface TraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LotRow = Record<string, unknown> & {
  item?: { name?: string; sku?: string };
};

type ItemRow = Record<string, unknown>;

type LocationRow = Record<string, unknown>;

type ResolvedEntity =
  | { type: 'item'; data: ItemRow }
  | { type: 'location'; data: LocationRow }
  | { type: 'lot'; data: LotRow }
  | null;

// =====================================================
// Component
// =====================================================

export const TraceabilityModal: React.FC<TraceabilityModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();
  const [activeTab, setActiveTab] = useState<'lots' | 'consulta' | 'itens'>('lots');
  const [lots, setLots] = useState<LotRow[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotsSearch, setLotsSearch] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [resolved, setResolved] = useState<ResolvedEntity>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [itemOptions, setItemOptions] = useState<{ value: string; label: string }[]>([]);

  const loadLots = async () => {
    if (!empresaId) return;
    setLotsLoading(true);
    const data = await listLots(empresaId);
    setLots((data as LotRow[]) || []);
    setLotsLoading(false);
  };

  const loadItems = async (pageSize = 500, search?: string) => {
    if (!empresaId) return;
    setItemsLoading(true);
    const res = await listItems(empresaId, { pageSize, search: search || undefined });
    setItems((res.data as ItemRow[]) || []);
    setItemsTotal(res.total || 0);
    setItemsLoading(false);
  };

  const loadLocations = async () => {
    if (!empresaId) return;
    setLocationsLoading(true);
    const data = await listLocations(empresaId);
    setLocations((data as LocationRow[]) || []);
    setLocationsLoading(false);
  };

  useEffect(() => {
    if (isOpen && empresaId) {
      if (activeTab === 'lots') loadLots();
      if (activeTab === 'consulta') {
        loadItems(500);
        loadLocations();
        loadLots();
      }
      if (activeTab === 'itens') loadItems(500);
    }
  }, [isOpen, empresaId, activeTab]);

  useEffect(() => {
    if (formOpen && empresaId) {
      listItems(empresaId, { pageSize: 500 }).then((r) =>
        setItemOptions(
          ((r.data as Record<string, unknown>[]) || []).map((x) => ({
            value: x.id as string,
            label: `${(x.sku as string) || ''} - ${(x.name as string) || ''}`.trim() || (x.name as string),
          }))
        )
      );
    }
  }, [formOpen, empresaId]);

  const form = useForm<LotCreateInput>({
    resolver: zodResolver(lotCreateSchema),
    defaultValues: {
      item_id: '',
      lot_number: '',
      serial_number: '',
      expiration_date: '',
      manufacture_date: '',
      supplier_lot: '',
      notes: '',
    },
  });

  const onSubmitCreate = async () => {
    const values = form.getValues();
    if (!empresaId) return;
    setSaving(true);
    const res = await createLot(empresaId, {
      ...values,
      expiration_date: values.expiration_date || undefined,
      manufacture_date: values.manufacture_date || undefined,
    });
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Lote criado' });
    setFormOpen(false);
    form.reset();
    loadLots();
  };

  const filteredLots = useMemo(() => {
    if (!lotsSearch.trim()) return lots;
    const q = lotsSearch.trim().toLowerCase();
    return lots.filter(
      (l) =>
        (l.lot_number as string)?.toLowerCase().includes(q) ||
        (l.serial_number as string)?.toLowerCase().includes(q) ||
        ((l.item as Record<string, unknown>)?.name as string)?.toLowerCase().includes(q) ||
        ((l.item as Record<string, unknown>)?.sku as string)?.toLowerCase().includes(q)
    );
  }, [lots, lotsSearch]);

  const handleBarcodeLookup = async () => {
    const code = barcodeInput.trim();
    if (!code || !empresaId) return;
    setLookupLoading(true);
    setResolved(null);
    try {
      const [itemsRes, locs, allLots] = await Promise.all([
        listItems(empresaId, { search: code, pageSize: 10 }),
        listLocations(empresaId),
        listLots(empresaId),
      ]);
      const itemMatches = (itemsRes.data as ItemRow[]) || [];
      const locMatches = (locs as LocationRow[]).filter(
        (loc) => (loc.barcode as string)?.toLowerCase() === code.toLowerCase()
      );
      const lotMatches = (allLots as LotRow[]).filter(
        (l) => (l.lot_number as string)?.toLowerCase() === code.toLowerCase()
      );
      if (itemMatches.length > 0 && (itemMatches[0].barcode as string)?.toLowerCase() === code.toLowerCase()) {
        setResolved({ type: 'item', data: itemMatches[0] });
      } else if (locMatches.length > 0) {
        setResolved({ type: 'location', data: locMatches[0] });
      } else if (lotMatches.length > 0) {
        setResolved({ type: 'lot', data: lotMatches[0] });
      } else if (itemMatches.length > 0) {
        setResolved({ type: 'item', data: itemMatches[0] });
      } else {
        setResolved(null);
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const traceableItems = useMemo(() => items.filter((i) => (i.tracking_type as string) !== 'none'), [items]);

  const lotsColumns: DataTableColumn<LotRow>[] = [
    { key: 'lot_number', label: 'Nº Lote' },
    { key: 'serial_number', label: 'Série', render: (r) => (r.serial_number as string) || '—' },
    {
      key: 'item',
      label: 'Item',
      render: (r) => {
        const item = r.item as Record<string, unknown> | undefined;
        return (
          <div>
            <p className="font-medium text-white">{item?.name || '—'}</p>
            <p className="text-xs text-slate-400">{item?.sku || ''}</p>
          </div>
        );
      },
    },
    {
      key: 'expiration_date',
      label: 'Validade',
      render: (r) => fmtDate((r.expiration_date as string) || ''),
    },
    {
      key: 'manufacture_date',
      label: 'Fabricação',
      render: (r) => fmtDate((r.manufacture_date as string) || ''),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (r) => (
        <StatusBadge status={r.is_active ? 'ativo' : 'inativo'} />
      ),
    },
  ];

  if (!isOpen) return null;

  const tabs = [
    { id: 'lots' as const, label: 'Lotes', icon: Package },
    { id: 'consulta' as const, label: 'Consulta Código', icon: Barcode },
    { id: 'itens' as const, label: 'Itens Rastreáveis', icon: QrCode },
  ];

  return (
    <>
      <Portal>
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                key="traceability-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
              />
              <motion.div
                key="traceability-modal"
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-4xl max-h-[90vh] p-4"
              >
                <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <Barcode className="w-6 h-6 text-purple-400" />
                      <div>
                        <h2 className="text-lg font-semibold text-white">Rastreabilidade</h2>
                        <p className="text-sm text-slate-400">Lotes, séries e códigos de barras</p>
                      </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex border-b border-white/10 px-6">
                    {tabs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                          activeTab === t.id
                            ? 'border-purple-500 text-purple-400'
                            : 'border-transparent text-slate-400 hover:text-slate-300'
                        )}
                      >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'lots' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Buscar lotes..."
                              value={lotsSearch}
                              onChange={(e) => setLotsSearch(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                            />
                          </div>
                          <button
                            onClick={() => setFormOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Novo Lote
                          </button>
                        </div>
                        <div className="bg-[#111827]/50 rounded-xl border border-white/5 overflow-hidden">
                          <DataTable
                            columns={lotsColumns}
                            data={filteredLots}
                            loading={lotsLoading}
                            emptyMessage="Nenhum lote encontrado"
                            getRowId={(r) => r.id as string}
                          />
                        </div>
                      </div>
                    )}

                    {activeTab === 'consulta' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Digite ou escaneie o código</label>
                          <div className="relative">
                            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                              type="text"
                              value={barcodeInput}
                              onChange={(e) => setBarcodeInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleBarcodeLookup()}
                              placeholder="Código de barras, lote..."
                              className="w-full pl-12 pr-4 py-4 bg-[#252d3d] border border-white/10 rounded-xl text-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                            />
                          </div>
                          <button
                            onClick={handleBarcodeLookup}
                            disabled={lookupLoading || !barcodeInput.trim()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                          >
                            {lookupLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Consultar
                          </button>
                        </div>

                        {resolved && (
                          <div className="bg-[#111827]/50 rounded-xl border border-white/5 p-4 space-y-2">
                            <p className="text-sm font-medium text-slate-300">
                              {resolved.type === 'item' && 'Item'}
                              {resolved.type === 'location' && 'Localização'}
                              {resolved.type === 'lot' && 'Lote'}
                            </p>
                            {resolved.type === 'item' && (
                              <div className="space-y-1 text-sm">
                                <p className="text-white font-medium">{resolved.data.name as string}</p>
                                <p className="text-slate-400">SKU: {resolved.data.sku as string}</p>
                                {resolved.data.barcode && <p className="text-slate-400">Código: {resolved.data.barcode as string}</p>}
                              </div>
                            )}
                            {resolved.type === 'location' && (
                              <div className="space-y-1 text-sm">
                                <p className="text-white font-medium">{resolved.data.name as string}</p>
                                <p className="text-slate-400">Código: {resolved.data.code as string}</p>
                              </div>
                            )}
                            {resolved.type === 'lot' && (
                              <div className="space-y-1 text-sm">
                                <p className="text-white font-medium">Lote: {resolved.data.lot_number as string}</p>
                                <p className="text-slate-400">
                                  Item: {((resolved.data.item as Record<string, unknown>)?.name as string) || '—'}
                                </p>
                                {(resolved.data.expiration_date as string) && (
                                  <p className="text-slate-400">Validade: {fmtDate(resolved.data.expiration_date as string)}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {!resolved && !lookupLoading && barcodeInput.trim() && (
                          <p className="text-sm text-slate-500">Nenhum resultado encontrado para o código informado.</p>
                        )}
                      </div>
                    )}

                    {activeTab === 'itens' && (
                      <div className="space-y-4">
                        <div className="bg-[#111827]/50 rounded-xl border border-white/5 overflow-hidden">
                          {itemsLoading ? (
                            <div className="flex justify-center py-12">
                              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                            </div>
                          ) : traceableItems.length === 0 ? (
                            <div className="py-12 text-center text-slate-500">Nenhum item rastreável</div>
                          ) : (
                            <div className="divide-y divide-white/5">
                              {traceableItems.map((item) => (
                                <div key={item.id as string} className="flex items-center justify-between px-4 py-3">
                                  <div>
                                    <p className="font-medium text-white">{item.name as string}</p>
                                    <p className="text-xs text-slate-400">{item.sku as string}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        'text-xs px-2 py-0.5 rounded font-medium',
                                        (item.tracking_type as string) === 'lot'
                                          ? 'bg-blue-500/20 text-blue-400'
                                          : 'bg-purple-500/20 text-purple-400'
                                      )}
                                    >
                                      {(item.tracking_type as string) === 'lot' ? 'Lote' : 'Série'}
                                    </span>
                                    {(item.has_expiration as boolean) && (
                                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-500/20 text-amber-400">
                                        Validade
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {toast && (
                    <div
                      className={cn(
                        'fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-[100]',
                        toast.error ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'
                      )}
                    >
                      {toast.msg}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>

      <DialogForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          form.reset();
        }}
        title="Novo Lote"
        subtitle="Cadastrar lote ou número de série"
        onSubmit={form.handleSubmit(onSubmitCreate)}
        loading={saving}
        submitLabel="Criar"
      >
        <FormSelect form={form} name="item_id" label="Item" options={itemOptions} required />
        <FormInput form={form} name="lot_number" label="Nº Lote" required />
        <FormInput form={form} name="serial_number" label="Nº Série (opcional)" />
        <FormInput form={form} name="expiration_date" label="Data Validade (YYYY-MM-DD)" type="date" />
        <FormInput form={form} name="manufacture_date" label="Data Fabricação (YYYY-MM-DD)" type="date" />
        <FormInput form={form} name="supplier_lot" label="Lote Fornecedor" />
        <FormTextarea form={form} name="notes" label="Observações" />
      </DialogForm>
    </>
  );
};
