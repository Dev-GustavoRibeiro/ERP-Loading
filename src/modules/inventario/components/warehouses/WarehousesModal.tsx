'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Warehouse,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  FolderTree,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import {
  DialogForm,
  FormInput,
  FormSelect,
  ConfirmDialog,
} from '../shared';
import {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '@/app/actions/inventario';
import {
  warehouseCreateSchema,
  type WarehouseCreateInput,
  locationCreateSchema,
  type LocationCreateInput,
} from '../../domain/schemas';

// =====================================================
// Types
// =====================================================

interface WarehousesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WarehouseRow = Record<string, unknown> & { location_count?: number };
type LocationRow = Record<string, unknown>;

const LOCATION_TYPE_LABELS: Record<string, string> = {
  storage: 'Armazenagem',
  receiving: 'Recebimento',
  shipping: 'Expedição',
  scrap: 'Sucata',
  virtual: 'Virtual',
  production: 'Produção',
  transit: 'Trânsito',
};

const LOCATION_TYPE_BADGES: Record<string, string> = {
  storage: 'bg-blue-500/20 text-blue-400',
  receiving: 'bg-emerald-500/20 text-emerald-400',
  shipping: 'bg-purple-500/20 text-purple-400',
  scrap: 'bg-red-500/20 text-red-400',
  virtual: 'bg-slate-500/20 text-slate-400',
  production: 'bg-amber-500/20 text-amber-400',
  transit: 'bg-cyan-500/20 text-cyan-400',
};

// =====================================================
// Component
// =====================================================

export const WarehousesModal: React.FC<WarehousesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const empresaId = useEmpresaId();
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [whFormOpen, setWhFormOpen] = useState(false);
  const [locFormOpen, setLocFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseRow | null>(
    null
  );
  const [editingLocation, setEditingLocation] = useState<LocationRow | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'warehouse' | 'location';
    id: string;
    name: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(
    null
  );

  const loadWarehouses = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const data = await listWarehouses(empresaId);
    const whList = (data || []) as WarehouseRow[];
    const withCounts = await Promise.all(
      whList.map(async (wh) => {
        const locs = await listLocations(empresaId, wh.id as string);
        return { ...wh, location_count: (locs || []).length };
      })
    );
    setWarehouses(withCounts);
    setLoading(false);
  }, [empresaId]);

  const loadLocations = useCallback(async () => {
    if (!empresaId || !selectedWarehouse) {
      setLocations([]);
      return;
    }
    setLocationsLoading(true);
    const data = await listLocations(
      empresaId,
      selectedWarehouse.id as string
    );
    setLocations((data || []) as LocationRow[]);
    setLocationsLoading(false);
  }, [empresaId, selectedWarehouse]);

  useEffect(() => {
    if (isOpen && empresaId) loadWarehouses();
  }, [isOpen, empresaId, loadWarehouses]);

  useEffect(() => {
    if (isOpen && selectedWarehouse) loadLocations();
    else setLocations([]);
  }, [isOpen, selectedWarehouse?.id, loadLocations]);

  // Warehouse form
  const whForm = useForm<WarehouseCreateInput>({
    resolver: zodResolver(warehouseCreateSchema),
    defaultValues: {
      code: '',
      name: '',
      address: '',
      is_default: false,
    },
  });

  // Location form (warehouse_id set from selected warehouse)
  const locForm = useForm<LocationCreateInput>({
    resolver: zodResolver(locationCreateSchema),
    defaultValues: {
      warehouse_id: '',
      parent_id: '',
      code: '',
      name: '',
      location_type: 'storage',
      barcode: '',
      capacity: 0,
    },
  });

  useEffect(() => {
    if (selectedWarehouse) {
      locForm.setValue('warehouse_id', selectedWarehouse.id as string);
    }
  }, [selectedWarehouse, locForm]);

  const onSubmitWarehouse = async () => {
    const values = whForm.getValues();
    if (!empresaId) return;
    setSaving(true);
    if (editingWarehouse) {
      const res = await updateWarehouse(editingWarehouse.id as string, values);
      setSaving(false);
      if (res.error) {
        setToast({ msg: res.error, error: true });
        return;
      }
      setToast({ msg: res.message || 'Depósito atualizado' });
    } else {
      const res = await createWarehouse(empresaId, values);
      setSaving(false);
      if (res.error) {
        setToast({ msg: res.error, error: true });
        return;
      }
      setToast({ msg: res.message || 'Depósito criado' });
    }
    setWhFormOpen(false);
    setEditingWarehouse(null);
    whForm.reset({ code: '', name: '', address: '', is_default: false });
    loadWarehouses();
  };

  const onSubmitLocation = async () => {
    const values = locForm.getValues();
    if (!empresaId || !selectedWarehouse) return;
    const dto = {
      ...values,
      warehouse_id: selectedWarehouse.id as string,
      parent_id: values.parent_id || undefined,
    };
    setSaving(true);
    if (editingLocation) {
      const res = await updateLocation(editingLocation.id as string, dto);
      setSaving(false);
      if (res.error) {
        setToast({ msg: res.error, error: true });
        return;
      }
      setToast({ msg: res.message || 'Localização atualizada' });
    } else {
      const res = await createLocation(empresaId, dto);
      setSaving(false);
      if (res.error) {
        setToast({ msg: res.error, error: true });
        return;
      }
      setToast({ msg: res.message || 'Localização criada' });
    }
    setLocFormOpen(false);
    setEditingLocation(null);
    locForm.reset({
      warehouse_id: selectedWarehouse?.id as string,
      parent_id: '',
      code: '',
      name: '',
      location_type: 'storage',
      barcode: '',
      capacity: 0,
    });
    loadLocations();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    if (deleteTarget.type === 'warehouse') {
      const res = await deleteWarehouse(deleteTarget.id);
      setSaving(false);
      if (res.error) {
        setToast({ msg: res.error, error: true });
        return;
      }
      setToast({ msg: res.message || 'Depósito excluído' });
      setSelectedWarehouse((prev) =>
        prev?.id === deleteTarget.id ? null : prev
      );
    } else {
      const res = await deleteLocation(deleteTarget.id);
      setSaving(false);
      if (res.error) {
        setToast({ msg: res.error, error: true });
        return;
      }
      setToast({ msg: res.message || 'Localização excluída' });
    }
    setDeleteTarget(null);
    loadWarehouses();
    loadLocations();
  };

  const openEditWarehouse = (wh: WarehouseRow) => {
    setEditingWarehouse(wh);
    whForm.reset({
      code: (wh.code as string) || '',
      name: (wh.name as string) || '',
      address: (wh.address as string) || '',
      is_default: (wh.is_default as boolean) || false,
    });
    setWhFormOpen(true);
  };

  const openEditLocation = (loc: LocationRow) => {
    setEditingLocation(loc);
    locForm.reset({
      warehouse_id: (loc.warehouse_id as string) || selectedWarehouse?.id,
      parent_id: (loc.parent_id as string) || '',
      code: (loc.code as string) || '',
      name: (loc.name as string) || '',
      location_type: (loc.location_type as string) || 'storage',
      barcode: (loc.barcode as string) || '',
      capacity: Number(loc.capacity) || 0,
    });
    setLocFormOpen(true);
  };

  const parentLocationOptions = locations
    .filter((l) => l.id !== editingLocation?.id)
    .map((l) => ({
      value: l.id as string,
      label: `${l.code || ''} - ${l.name || ''}`.trim(),
    }));

  if (!isOpen) return null;

  return (
    <>
      <Portal>
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                key="warehouses-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
              />
              <motion.div
                key="warehouses-modal"
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-5xl max-h-[90vh] p-4"
              >
                <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <Warehouse className="w-6 h-6 text-purple-400" />
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          Depósitos e Localizações
                        </h2>
                        <p className="text-sm text-slate-400">
                          Gerencie depósitos e suas localizações
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex-1 flex min-h-0">
                    {/* Left: Warehouses */}
                    <div className="w-80 border-r border-white/10 flex flex-col flex-shrink-0">
                      <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-300">
                          Depósitos
                        </span>
                        <button
                          onClick={() => {
                            setEditingWarehouse(null);
                            whForm.reset({
                              code: '',
                              name: '',
                              address: '',
                              is_default: false,
                            });
                            setWhFormOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Novo Depósito
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                          </div>
                        ) : (
                          warehouses.map((wh) => (
                            <div
                              key={wh.id as string}
                              onClick={() => setSelectedWarehouse(wh)}
                              className={cn(
                                'bg-[#111827]/50 rounded-xl border p-4 cursor-pointer transition-all hover:border-white/20',
                                selectedWarehouse?.id === wh.id
                                  ? 'border-purple-500/50 ring-1 ring-purple-500/30'
                                  : 'border-white/10'
                              )}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-white truncate">
                                      {wh.name as string}
                                    </span>
                                    {(wh.is_default as boolean) && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                        Padrão
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {(wh.code as string) || '—'}
                                  </p>
                                  {wh.address && (
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                      <MapPin className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">
                                        {wh.address as string}
                                      </span>
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-500 mt-1">
                                    {(wh.location_count ?? 0)} localizações
                                  </p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditWarehouse(wh);
                                    }}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({
                                        type: 'warehouse',
                                        id: wh.id as string,
                                        name: (wh.name as string) || '',
                                      });
                                    }}
                                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {!loading && warehouses.length === 0 && (
                          <p className="text-sm text-slate-500 text-center py-8">
                            Nenhum depósito cadastrado
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Locations */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <FolderTree className="w-4 h-4" />
                          {selectedWarehouse
                            ? `Localizações - ${selectedWarehouse.name}`
                            : 'Selecione um depósito'}
                        </span>
                        {selectedWarehouse && (
                          <button
                            onClick={() => {
                              setEditingLocation(null);
                              locForm.reset({
                                warehouse_id: selectedWarehouse.id as string,
                                parent_id: '',
                                code: '',
                                name: '',
                                location_type: 'storage',
                                barcode: '',
                                capacity: 0,
                              });
                              setLocFormOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Nova Localização
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        {!selectedWarehouse ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <Package className="w-12 h-12 mb-4 opacity-50" />
                            <p className="text-sm">
                              Selecione um depósito à esquerda para ver suas
                              localizações
                            </p>
                          </div>
                        ) : locationsLoading ? (
                          <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {locations.map((loc) => (
                              <div
                                key={loc.id as string}
                                className="bg-[#111827]/50 rounded-xl border border-white/10 p-4"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-white">
                                        {(loc.name as string) || '—'}
                                      </span>
                                      <span
                                        className={cn(
                                          'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                          LOCATION_TYPE_BADGES[
                                            loc.location_type as string
                                          ] || 'bg-slate-500/20 text-slate-400'
                                        )}
                                      >
                                        {LOCATION_TYPE_LABELS[
                                          loc.location_type as string
                                        ] || (loc.location_type as string)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Código: {(loc.code as string) || '—'}
                                      {loc.barcode && (
                                        <> • {loc.barcode as string}</>
                                      )}
                                    </p>
                                    {loc.capacity != null &&
                                      Number(loc.capacity) > 0 && (
                                        <p className="text-xs text-slate-500 mt-1">
                                          Capacidade: {Number(loc.capacity)}
                                          {loc.capacity_uom || 'un'}
                                        </p>
                                      )}
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => openEditLocation(loc)}
                                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setDeleteTarget({
                                          type: 'location',
                                          id: loc.id as string,
                                          name:
                                            `${loc.code} - ${loc.name}` || '',
                                        })
                                      }
                                      className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {locations.length === 0 && (
                              <p className="text-sm text-slate-500 text-center py-8">
                                Nenhuma localização neste depósito
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {toast && (
                    <div
                      className={cn(
                        'fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-[100]',
                        toast.error
                          ? 'bg-red-500/90 text-white'
                          : 'bg-emerald-500/90 text-white'
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
        isOpen={whFormOpen}
        onClose={() => {
          setWhFormOpen(false);
          setEditingWarehouse(null);
          whForm.reset();
        }}
        title={editingWarehouse ? 'Editar Depósito' : 'Novo Depósito'}
        subtitle="Cadastre ou edite um depósito"
        onSubmit={whForm.handleSubmit(onSubmitWarehouse)}
        loading={saving}
        submitLabel="Salvar"
      >
        <FormInput form={whForm} name="code" label="Código" required />
        <FormInput form={whForm} name="name" label="Nome" required />
        <FormInput form={whForm} name="address" label="Endereço" />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            {...whForm.register('is_default')}
            className="rounded bg-[#252d3d] border-white/10"
          />
          <label className="text-sm text-slate-300">
            Depósito padrão
          </label>
        </div>
      </DialogForm>

      <DialogForm
        isOpen={locFormOpen}
        onClose={() => {
          setLocFormOpen(false);
          setEditingLocation(null);
          locForm.reset();
        }}
        title={editingLocation ? 'Editar Localização' : 'Nova Localização'}
        subtitle="Cadastre ou edite uma localização"
        onSubmit={locForm.handleSubmit(onSubmitLocation)}
        loading={saving}
        submitLabel="Salvar"
      >
        <FormInput form={locForm} name="code" label="Código" required />
        <FormInput form={locForm} name="name" label="Nome" required />
        <FormSelect
          form={locForm}
          name="location_type"
          label="Tipo"
          options={[
            { value: 'storage', label: 'Armazenagem' },
            { value: 'receiving', label: 'Recebimento' },
            { value: 'shipping', label: 'Expedição' },
            { value: 'scrap', label: 'Sucata' },
            { value: 'virtual', label: 'Virtual' },
            { value: 'production', label: 'Produção' },
            { value: 'transit', label: 'Trânsito' },
          ]}
          required
        />
        <FormSelect
          form={locForm}
          name="parent_id"
          label="Localização pai"
          options={[
            { value: '', label: '— Nenhuma —' },
            ...parentLocationOptions,
          ]}
        />
        <FormInput form={locForm} name="barcode" label="Código de barras" />
        <FormInput
          form={locForm}
          name="capacity"
          label="Capacidade"
          type="number"
        />
      </DialogForm>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={
          deleteTarget?.type === 'warehouse'
            ? 'Excluir depósito'
            : 'Excluir localização'
        }
        description={
          deleteTarget ? (
            <>
              Tem certeza que deseja excluir{' '}
              <span className="font-semibold text-white">
                {deleteTarget.name}
              </span>
              ? Esta ação não pode ser desfeita.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Excluir"
        variant="danger"
        loading={saving}
      />
    </>
  );
};
