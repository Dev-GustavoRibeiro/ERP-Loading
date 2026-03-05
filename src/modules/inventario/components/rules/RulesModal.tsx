'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  GitBranch,
  Route,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
  Zap,
  LayoutList,
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
  listPutawayRules,
  createPutawayRule,
  deletePutawayRule,
  listRoutes,
  createRoute,
  deleteRoute,
  listRouteRules,
  createRouteRule,
  deleteRouteRule,
  listWarehouses,
  listLocations,
  listItems,
} from '@/app/actions/inventario';
import {
  putawayRuleSchema,
  type PutawayRuleInput,
  routeCreateSchema,
  type RouteCreateInput,
  routeRuleSchema,
  type RouteRuleInput,
} from '../../domain/schemas';

// =====================================================
// Types
// =====================================================

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PutawayRuleRow = Record<string, unknown>;
type RouteRow = Record<string, unknown>;
type RouteRuleRow = Record<string, unknown>;

const ROUTE_TYPE_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
};

const ROUTE_TYPE_BADGES: Record<string, string> = {
  push: 'bg-blue-500/20 text-blue-400',
  pull: 'bg-purple-500/20 text-purple-400',
};

const ACTION_LABELS: Record<string, string> = {
  move: 'Mover',
  buy: 'Comprar',
  manufacture: 'Produzir',
};

const ACTION_BADGES: Record<string, string> = {
  move: 'bg-slate-500/20 text-slate-400',
  buy: 'bg-emerald-500/20 text-emerald-400',
  manufacture: 'bg-amber-500/20 text-amber-400',
};

// =====================================================
// Component
// =====================================================

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const empresaId = useEmpresaId();
  const [activeTab, setActiveTab] = useState<'putaway' | 'routes'>('putaway');

  // Putaway
  const [putawayRules, setPutawayRules] = useState<PutawayRuleRow[]>([]);
  const [putawayLoading, setPutawayLoading] = useState(false);
  const [putawayFormOpen, setPutawayFormOpen] = useState(false);

  // Routes
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteRow | null>(null);
  const [routeRules, setRouteRules] = useState<RouteRuleRow[]>([]);
  const [routeRulesLoading, setRouteRulesLoading] = useState(false);
  const [routeFormOpen, setRouteFormOpen] = useState(false);
  const [routeRuleFormOpen, setRouteRuleFormOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'putaway' | 'route' | 'routeRule';
    id: string;
    name: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(
    null
  );

  // Options
  const [warehouses, setWarehouses] = useState<
    { value: string; label: string }[]
  >([]);
  const [locations, setLocations] = useState<
    { value: string; label: string }[]
  >([]);
  const [items, setItems] = useState<{ value: string; label: string }[]>([]);

  const loadPutawayRules = useCallback(async () => {
    if (!empresaId) return;
    setPutawayLoading(true);
    const data = await listPutawayRules(empresaId);
    setPutawayRules((data || []) as PutawayRuleRow[]);
    setPutawayLoading(false);
  }, [empresaId]);

  const loadRoutes = useCallback(async () => {
    if (!empresaId) return;
    const data = await listRoutes(empresaId);
    setRoutes((data || []) as RouteRow[]);
  }, [empresaId]);

  const loadRouteRules = useCallback(async () => {
    if (!selectedRoute) {
      setRouteRules([]);
      return;
    }
    setRouteRulesLoading(true);
    const data = await listRouteRules(selectedRoute.id as string);
    setRouteRules((data || []) as RouteRuleRow[]);
    setRouteRulesLoading(false);
  }, [selectedRoute]);

  useEffect(() => {
    if (isOpen && empresaId) {
      loadPutawayRules();
      loadRoutes();
      listWarehouses(empresaId).then((w) =>
        setWarehouses(
          (w as Record<string, unknown>[]).map((x) => ({
            value: x.id as string,
            label: (x.name as string) || '',
          }))
        )
      );
      listLocations(empresaId).then((l) =>
        setLocations(
          (l as Record<string, unknown>[]).map((x) => ({
            value: x.id as string,
            label: `${x.code || ''} - ${x.name || ''}`.trim(),
          }))
        )
      );
      listItems(empresaId, { pageSize: 500 }).then((r) =>
        setItems(
          ((r.data as Record<string, unknown>[]) || []).map((x) => ({
            value: x.id as string,
            label:
              `${x.sku || ''} - ${x.name || ''}`.trim() || (x.name as string),
          }))
        )
      );
    }
  }, [isOpen, empresaId, loadPutawayRules, loadRoutes]);

  useEffect(() => {
    if (isOpen && selectedRoute) loadRouteRules();
    else setRouteRules([]);
  }, [isOpen, selectedRoute?.id, loadRouteRules]);

  const putawayForm = useForm<PutawayRuleInput>({
    resolver: zodResolver(putawayRuleSchema),
    defaultValues: {
      warehouse_id: '',
      item_id: '',
      category: '',
      dest_location_id: '',
      priority: 10,
    },
  });

  const routeForm = useForm<RouteCreateInput>({
    resolver: zodResolver(routeCreateSchema),
    defaultValues: {
      name: '',
      route_type: 'push',
    },
  });

  const routeRuleForm = useForm<RouteRuleInput>({
    resolver: zodResolver(routeRuleSchema),
    defaultValues: {
      route_id: '',
      source_location_id: '',
      dest_location_id: '',
      action: 'move',
      auto: false,
      priority: 10,
    },
  });

  useEffect(() => {
    if (selectedRoute) {
      routeRuleForm.setValue('route_id', selectedRoute.id as string);
    }
  }, [selectedRoute, routeRuleForm]);

  const onSubmitPutaway = async () => {
    const values = putawayForm.getValues();
    if (!empresaId) return;
    const dto = {
      ...values,
      item_id: values.item_id || undefined,
      category: values.category?.trim() || undefined,
    };
    setSaving(true);
    const res = await createPutawayRule(empresaId, dto);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Regra criada' });
    setPutawayFormOpen(false);
    putawayForm.reset({
      warehouse_id: '',
      item_id: '',
      category: '',
      dest_location_id: '',
      priority: 10,
    });
    loadPutawayRules();
  };

  const onSubmitRoute = async () => {
    const values = routeForm.getValues();
    if (!empresaId) return;
    setSaving(true);
    const res = await createRoute(empresaId, values);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Rota criada' });
    setRouteFormOpen(false);
    routeForm.reset({ name: '', route_type: 'push' });
    loadRoutes();
  };

  const onSubmitRouteRule = async () => {
    const values = routeRuleForm.getValues();
    if (!empresaId || !selectedRoute) return;
    const dto = {
      route_id: selectedRoute.id,
      source_location_id: values.source_location_id || undefined,
      dest_location_id: values.dest_location_id || undefined,
      action: values.action,
      auto: values.auto,
      priority: values.priority,
    };
    setSaving(true);
    const res = await createRouteRule(empresaId, dto);
    setSaving(false);
    if (res.error) {
      setToast({ msg: res.error, error: true });
      return;
    }
    setToast({ msg: res.message || 'Regra de rota criada' });
    setRouteRuleFormOpen(false);
    routeRuleForm.reset({
      route_id: selectedRoute.id as string,
      source_location_id: '',
      dest_location_id: '',
      action: 'move',
      auto: false,
      priority: 10,
    });
    loadRouteRules();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    if (deleteTarget.type === 'putaway') {
      const res = await deletePutawayRule(deleteTarget.id);
      setSaving(false);
      if (res.error) {
        setToast({ msg: res.error, error: true });
        return;
      }
      setToast({ msg: res.message || 'Regra excluída' });
      loadPutawayRules();
    } else if (deleteTarget.type === 'route') {
      const res = await deleteRoute(deleteTarget.id);
      setSaving(false);
      if (res.error) {
        setToast({ msg: res.error, error: true });
        return;
      }
      setToast({ msg: res.message || 'Rota excluída' });
      if (selectedRoute?.id === deleteTarget.id) setSelectedRoute(null);
      loadRoutes();
      loadRouteRules();
    } else {
      const res = await deleteRouteRule(deleteTarget.id);
      setSaving(false);
      if (res.error) {
        setToast({ msg: res.error, error: true });
        return;
      }
      setToast({ msg: res.message || 'Regra excluída' });
      loadRouteRules();
    }
    setDeleteTarget(null);
  };

  const putawayWhId = putawayForm.watch('warehouse_id');
  const [putawayLocations, setPutawayLocations] = useState<
    { value: string; label: string }[]
  >([]);
  useEffect(() => {
    if (!empresaId || !putawayWhId) {
      setPutawayLocations([]);
      return;
    }
    listLocations(empresaId, putawayWhId).then((l) =>
      setPutawayLocations(
        (l as Record<string, unknown>[]).map((x) => ({
          value: x.id as string,
          label: `${x.code || ''} - ${x.name || ''}`.trim(),
        }))
      )
    );
  }, [empresaId, putawayWhId]);

  if (!isOpen) return null;

  return (
    <>
      <Portal>
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                key="rules-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
              />
              <motion.div
                key="rules-modal"
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-5xl max-h-[90vh] p-4"
              >
                <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-6 h-6 text-purple-400" />
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          Regras e Rotas
                        </h2>
                        <p className="text-sm text-slate-400">
                          Regras de armazenagem e rotas de movimentação
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

                  {/* Tabs */}
                  <div className="flex border-b border-white/10 px-6">
                    <button
                      onClick={() => setActiveTab('putaway')}
                      className={cn(
                        'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === 'putaway'
                          ? 'border-purple-500 text-purple-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      )}
                    >
                      <LayoutList className="w-4 h-4 inline-block mr-2" />
                      Regras de Armazenagem
                    </button>
                    <button
                      onClick={() => setActiveTab('routes')}
                      className={cn(
                        'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === 'routes'
                          ? 'border-purple-500 text-purple-400'
                          : 'border-transparent text-slate-400 hover:text-white'
                      )}
                    >
                      <Route className="w-4 h-4 inline-block mr-2" />
                      Rotas
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'putaway' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-medium text-slate-300">
                            Regras de putaway (armazenagem)
                          </h3>
                          <button
                            onClick={() => {
                              putawayForm.reset({
                                warehouse_id: '',
                                item_id: '',
                                category: '',
                                dest_location_id: '',
                                priority: 10,
                              });
                              setPutawayFormOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Nova Regra
                          </button>
                        </div>

                        {putawayLoading ? (
                          <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {putawayRules.map((rule) => {
                              const wh =
                                rule.warehouse as Record<string, unknown>;
                              const item =
                                rule.item as Record<string, unknown>;
                              const dest =
                                rule.dest_location as Record<string, unknown>;
                              const itemOrCat =
                                item?.name ||
                                item?.sku ||
                                rule.category ||
                                '—';
                              return (
                                <div
                                  key={rule.id as string}
                                  className="bg-[#111827]/50 rounded-xl border border-white/10 p-4 flex justify-between items-center"
                                >
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <span className="text-slate-400 text-sm">
                                      {wh?.name || '—'}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-slate-500" />
                                    <span className="text-white font-medium">
                                      {itemOrCat}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-slate-500" />
                                    <span className="text-slate-300 text-sm">
                                      {dest?.code || dest?.name || '—'}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      prioridade{' '}
                                      {(rule.priority as number) ?? 10}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setDeleteTarget({
                                        type: 'putaway',
                                        id: rule.id as string,
                                        name: `${wh?.name} → ${itemOrCat} → ${dest?.code || dest?.name}`,
                                      })
                                    }
                                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                            {putawayRules.length === 0 && (
                              <p className="text-sm text-slate-500 text-center py-8">
                                Nenhuma regra de armazenagem
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'routes' && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-slate-300">
                              Rotas
                            </h3>
                            <button
                              onClick={() => {
                                routeForm.reset({
                                  name: '',
                                  route_type: 'push',
                                });
                                setRouteFormOpen(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Nova Rota
                            </button>
                          </div>
                          <div className="space-y-2">
                            {routes.map((r) => (
                              <div
                                key={r.id as string}
                                onClick={() => setSelectedRoute(r)}
                                className={cn(
                                  'bg-[#111827]/50 rounded-xl border p-4 cursor-pointer transition-all',
                                  selectedRoute?.id === r.id
                                    ? 'border-purple-500/50 ring-1 ring-purple-500/30'
                                    : 'border-white/10 hover:border-white/20'
                                )}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-white">
                                    {r.name as string}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-[10px] px-1.5 py-0.5 rounded',
                                      ROUTE_TYPE_BADGES[r.route_type as string] ||
                                        'bg-slate-500/20'
                                    )}
                                  >
                                    {ROUTE_TYPE_LABELS[r.route_type as string] ||
                                      r.route_type}
                                  </span>
                                </div>
                                <div className="flex gap-1 mt-2 justify-end">
                                  <span
                                    className={cn(
                                      'text-[10px] px-1.5 py-0.5 rounded',
                                      (r.is_active as boolean)
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-slate-500/20 text-slate-400'
                                    )}
                                  >
                                    {(r.is_active as boolean)
                                      ? 'Ativa'
                                      : 'Inativa'}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({
                                        type: 'route',
                                        id: r.id as string,
                                        name: r.name as string,
                                      });
                                    }}
                                    className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {routes.length === 0 && (
                              <p className="text-sm text-slate-500 text-center py-8">
                                Nenhuma rota cadastrada
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="lg:col-span-2">
                          {selectedRoute ? (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h3 className="text-sm font-medium text-slate-300">
                                  Regras da rota: {selectedRoute.name}
                                </h3>
                                <button
                                  onClick={() => {
                                    routeRuleForm.reset({
                                      route_id: selectedRoute.id as string,
                                      source_location_id: '',
                                      dest_location_id: '',
                                      action: 'move',
                                      auto: false,
                                      priority: 10,
                                    });
                                    setRouteRuleFormOpen(true);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Nova Regra de Rota
                                </button>
                              </div>
                              {routeRulesLoading ? (
                                <div className="flex justify-center py-12">
                                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {routeRules.map((rr) => {
                                    const src =
                                      rr.source_location as Record<string, unknown>;
                                    const dst =
                                      rr.dest_location as Record<string, unknown>;
                                    return (
                                      <div
                                        key={rr.id as string}
                                        className="bg-[#111827]/50 rounded-xl border border-white/10 p-4 flex justify-between items-center"
                                      >
                                        <div className="flex flex-wrap gap-2 items-center">
                                          <span className="text-slate-300">
                                            {src?.code || src?.name || 'Qualquer'}
                                          </span>
                                          <ArrowRight className="w-4 h-4 text-slate-500" />
                                          <span className="text-white font-medium">
                                            {dst?.code || dst?.name || '—'}
                                          </span>
                                          <span
                                            className={cn(
                                              'text-[10px] px-1.5 py-0.5 rounded',
                                              ACTION_BADGES[rr.action as string] ||
                                                'bg-slate-500/20'
                                            )}
                                          >
                                            {ACTION_LABELS[rr.action as string] ||
                                              rr.action}
                                          </span>
                                          {(rr.auto as boolean) && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-0.5">
                                              <Zap className="w-3 h-3" />
                                              Auto
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() =>
                                            setDeleteTarget({
                                              type: 'routeRule',
                                              id: rr.id as string,
                                              name: `${src?.code || '?'} → ${dst?.code || '?'}`,
                                            })
                                          }
                                          className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {routeRules.length === 0 && (
                                    <p className="text-sm text-slate-500 text-center py-8">
                                      Nenhuma regra nesta rota
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                              <Route className="w-12 h-12 mb-4 opacity-50" />
                              <p className="text-sm">
                                Selecione uma rota para ver suas regras
                              </p>
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
        isOpen={putawayFormOpen}
        onClose={() => setPutawayFormOpen(false)}
        title="Nova Regra de Armazenagem"
        subtitle="Define onde um item ou categoria deve ser armazenado"
        onSubmit={putawayForm.handleSubmit(onSubmitPutaway)}
        loading={saving}
        submitLabel="Criar"
      >
        <FormSelect
          form={putawayForm}
          name="warehouse_id"
          label="Depósito"
          options={warehouses}
          required
        />
        <FormSelect
          form={putawayForm}
          name="item_id"
          label="Item (opcional)"
          options={[{ value: '', label: '— Qualquer item —' }, ...items]}
        />
        <FormInput
          form={putawayForm}
          name="category"
          label="Categoria (opcional)"
        />
        <FormSelect
          form={putawayForm}
          name="dest_location_id"
          label="Localização destino"
          options={putawayLocations}
          required
        />
        <FormInput
          form={putawayForm}
          name="priority"
          label="Prioridade"
          type="number"
        />
      </DialogForm>

      <DialogForm
        isOpen={routeFormOpen}
        onClose={() => setRouteFormOpen(false)}
        title="Nova Rota"
        subtitle="Define uma rota de movimentação (push ou pull)"
        onSubmit={routeForm.handleSubmit(onSubmitRoute)}
        loading={saving}
        submitLabel="Criar"
      >
        <FormInput form={routeForm} name="name" label="Nome" required />
        <FormSelect
          form={routeForm}
          name="route_type"
          label="Tipo"
          options={[
            { value: 'push', label: 'Push' },
            { value: 'pull', label: 'Pull' },
          ]}
          required
        />
      </DialogForm>

      <DialogForm
        isOpen={routeRuleFormOpen}
        onClose={() => setRouteRuleFormOpen(false)}
        title="Nova Regra de Rota"
        subtitle="Define origem, destino e ação"
        onSubmit={routeRuleForm.handleSubmit(onSubmitRouteRule)}
        loading={saving}
        submitLabel="Criar"
      >
        <FormSelect
          form={routeRuleForm}
          name="source_location_id"
          label="Origem (opcional)"
          options={[
            { value: '', label: '— Qualquer —' },
            ...locations.map((l) => ({ value: l.value, label: l.label })),
          ]}
        />
        <FormSelect
          form={routeRuleForm}
          name="dest_location_id"
          label="Destino (opcional)"
          options={[
            { value: '', label: '— Qualquer —' },
            ...locations.map((l) => ({ value: l.value, label: l.label })),
          ]}
        />
        <FormSelect
          form={routeRuleForm}
          name="action"
          label="Ação"
          options={[
            { value: 'move', label: 'Mover' },
            { value: 'buy', label: 'Comprar' },
            { value: 'manufacture', label: 'Produzir' },
          ]}
          required
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            {...routeRuleForm.register('auto')}
            className="rounded bg-[#252d3d] border-white/10"
          />
          <label className="text-sm text-slate-300">Automático</label>
        </div>
        <FormInput
          form={routeRuleForm}
          name="priority"
          label="Prioridade"
          type="number"
        />
      </DialogForm>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={
          deleteTarget?.type === 'putaway'
            ? 'Excluir regra'
            : deleteTarget?.type === 'route'
              ? 'Excluir rota'
              : 'Excluir regra de rota'
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
