'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import {
  listCentrosCusto,
  createCentroCusto,
  updateCentroCusto,
  deleteCentroCusto,
} from '@/app/actions/financeiro';
import { z } from 'zod';
import {
  costCenterCreateSchema,
  type CostCenterCreateInput,
} from '../../domain/schemas';
import {
  DialogForm,
  FormInput,
  FormSelect,
  ConfirmDialog,
} from '../shared';

interface CostCentersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CostCenter {
  id: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
  [key: string]: unknown;
}

export const CostCentersModal: React.FC<CostCentersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const empresaId = useEmpresaId();
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [deletingCenter, setDeletingCenter] = useState<CostCenter | null>(null);

  const form = useForm<CostCenterCreateInput & { id?: string }>({
    resolver: zodResolver(costCenterCreateSchema.extend({ id: z.string().uuid().optional() })),
  });

  const loadCenters = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const data = await listCentrosCusto(empresaId);
      setCenters(data as CostCenter[]);
    } catch (error) {
      toast.error('Erro ao carregar centros de custo');
      console.error(error);
    }
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) {
      loadCenters();
    }
  }, [isOpen, loadCenters]);

  const handleCreate = async () => {
    if (!empresaId) return;
    const values = form.getValues();
    const result = await createCentroCusto(empresaId, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Centro de custo criado com sucesso');
      setShowCreate(false);
      form.reset();
      loadCenters();
    }
  };

  const handleUpdate = async () => {
    if (!editingCenter) return;
    const values = form.getValues();
    const result = await updateCentroCusto(editingCenter.id, values);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Centro de custo atualizado com sucesso');
      setEditingCenter(null);
      form.reset();
      loadCenters();
    }
  };

  const handleDelete = async () => {
    if (!deletingCenter) return;
    const result = await deleteCentroCusto(deletingCenter.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Centro de custo desativado com sucesso');
      setDeletingCenter(null);
      loadCenters();
    }
  };

  const handleEdit = (center: CostCenter) => {
    setEditingCenter(center);
    form.reset({
      codigo: center.codigo,
      descricao: center.descricao,
      centro_pai_id: (center as any).centro_pai_id || '',
      id: center.id,
    });
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full max-w-4xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">Centros de Custo</h2>
                <p className="text-xs text-slate-400">Gerencie os centros de custo da empresa</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowCreate(true);
                    form.reset();
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo Centro
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              ) : centers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>Nenhum centro de custo cadastrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {centers.map((center) => (
                    <motion.div
                      key={center.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#111827]/50 border border-white/10 rounded-xl p-4 hover:bg-[#252d3d] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-sm font-mono text-slate-400">{center.codigo}</span>
                          <span className="text-sm font-medium text-white truncate">{center.descricao}</span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded font-medium',
                              center.ativo
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-500/20 text-slate-400'
                            )}
                          >
                            {center.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(center)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-slate-400" />
                          </button>
                          <button
                            onClick={() => setDeletingCenter(center)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Create/Edit Dialog */}
      <DialogForm
        isOpen={showCreate || !!editingCenter}
        onClose={() => {
          setShowCreate(false);
          setEditingCenter(null);
          form.reset();
        }}
        title={editingCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
        onSubmit={editingCenter ? form.handleSubmit(handleUpdate) : form.handleSubmit(handleCreate)}
        loading={loading}
      >
        <FormInput form={form} name="codigo" label="Código" required />
        <FormInput form={form} name="descricao" label="Descrição" required />
        <FormSelect
          form={form}
          name="centro_pai_id"
          label="Centro Pai"
          options={[
            { value: '', label: 'Nenhum' },
            ...centers
              .filter((c) => c.id !== editingCenter?.id && c.ativo)
              .map((c) => ({
                value: c.id,
                label: `${c.codigo} - ${c.descricao}`,
              })),
          ]}
        />
      </DialogForm>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCenter}
        onClose={() => setDeletingCenter(null)}
        onConfirm={handleDelete}
        title="Desativar Centro de Custo"
        description={
          deletingCenter
            ? `Tem certeza que deseja desativar o centro de custo "${deletingCenter.codigo} - ${deletingCenter.descricao}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Desativar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={loading}
      />
    </Portal>
  );
};
