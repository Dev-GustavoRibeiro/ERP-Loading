'use client';

import React, { useState } from 'react';
import { Modal, Button, Badge, Select, Input } from '@/shared/components/ui';
import { TrendingUp, Plus, User, Target, Calendar } from 'lucide-react';
import { useHrDevelopment, DevelopmentPlan, DevelopmentGoal } from '../hooks/useHrDevelopment';
import { format } from 'date-fns';
import { DialogForm } from '@/shared/components/organisms/DialogForm';
import { z } from 'zod';
import { useHrPeople } from '../hooks/useHrPeople';
import { Controller } from 'react-hook-form';

interface HrDevelopmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HrDevelopmentModal({ isOpen, onClose }: HrDevelopmentModalProps) {
  const { plans, loading, createPlan, createGoal } = useHrDevelopment();
  const { employees } = useHrPeople();
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Schema for New PDI
  const planSchema = z.object({
    employee_id: z.string().min(1, 'Funcionário obrigatório'),
    title: z.string().min(3, 'Título obrigatório'),
    status: z.enum(['active', 'completed', 'archived']),
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Plano de Desenvolvimento Individual (PDI)"
        size="full"
        footer={
          <div className="flex justify-between w-full">
            <div className="text-sm text-slate-400">
              {plans.length} planos encontrados
            </div>
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        }
      >
        <div className="space-y-6 h-full flex flex-col">
          {/* Controls */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-white">Planos de Desenvolvimento</h2>
              <p className="text-sm text-slate-400">Acompanhe o crescimento dos colaboradores.</p>
            </div>
            <Button variant="primary" onClick={() => setIsPlanFormOpen(true)}>
              <Plus size={16} className="mr-2" /> Novo PDI
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto p-1">
            {plans.map(plan => (
              <PdiCard
                key={plan.id}
                plan={plan}
                isExpanded={expandedPlanId === plan.id}
                onToggle={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                onAddGoal={(goal) => createGoal({ ...goal, plan_id: plan.id })}
              />
            ))}
            {plans.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-slate-500">
                Nenhum PDI encontrado.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {isPlanFormOpen && (
        <DialogForm
          isOpen={isPlanFormOpen}
          onClose={() => setIsPlanFormOpen(false)}
          title="Novo PDI"
          schema={planSchema}
          defaultValues={{ status: 'active' }}
          onSubmit={async (data) => {
            await createPlan(data as any);
            setIsPlanFormOpen(false);
          }}
        >
          {(form) => (
            <div className="space-y-4">
              <Select
                label="Funcionário"
                {...form.register('employee_id')}
                options={employees.map(e => ({ label: e.nome, value: e.id }))}
                error={form.formState.errors.employee_id?.message as string}
              />
              <Input
                label="Título do Plano"
                {...form.register('title')}
                placeholder="Ex: Plano de Liderança 2024"
                error={form.formState.errors.title?.message as string}
              />
              <Select
                label="Status"
                {...form.register('status')}
                options={[
                  { label: 'Ativo', value: 'active' },
                  { label: 'Concluído', value: 'completed' },
                  { label: 'Arquivado', value: 'archived' },
                ]}
                error={form.formState.errors.status?.message as string}
              />
            </div>
          )}
        </DialogForm>
      )}
    </>
  );
}

function PdiCard({ plan, isExpanded, onToggle, onAddGoal }: { plan: DevelopmentPlan, isExpanded: boolean, onToggle: () => void, onAddGoal: (data: any) => Promise<void> }) {
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);

  const goalSchema = z.object({
    title: z.string().min(3, 'Título obrigatório'),
    deadline: z.string().min(1, 'Prazo obrigatório'),
    status: z.enum(['not_started', 'in_progress', 'completed']),
    description: z.string().optional(),
  });

  return (
    <div className="bg-[#1a2235] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors flex flex-col">
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              {plan.employee?.avatar_url ? (
                <img src={plan.employee.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={14} className="text-slate-400" />
              )}
            </div>
            <div>
              <p className="font-medium text-white text-sm">{plan.employee?.nome}</p>
              <p className="text-xs text-slate-500">{plan.title}</p>
            </div>
          </div>
          <Badge variant={plan.status === 'active' ? 'success' : 'default'}>
            {plan.status.toUpperCase()}
          </Badge>
        </div>

        {/* Progress Bar (Mock) */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
          <div className="w-1/3 h-full bg-blue-500 rounded-full" />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{plan.goals?.length || 0} Metas</span>
          <span>33%</span>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-black/20 p-4 border-t border-white/5 flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Metas de Desenvolvimento</h4>
            <Button variant="ghost" size="sm" onClick={() => setIsGoalFormOpen(true)}>
              <Plus size={12} className="mr-1" /> Add
            </Button>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-60">
            {plan.goals?.map(goal => (
              <div key={goal.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${goal.status === 'completed' ? 'bg-emerald-500' :
                      goal.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-500'
                    }`} />
                  <div>
                    <p className="text-sm text-slate-200">{goal.title}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar size={10} />
                      {format(new Date(goal.deadline), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {(!plan.goals || plan.goals.length === 0) && (
              <p className="text-xs text-slate-600 text-center py-2">Nenhuma meta ainda.</p>
            )}
          </div>
        </div>
      )}

      {isGoalFormOpen && (
        <DialogForm
          isOpen={isGoalFormOpen}
          onClose={() => setIsGoalFormOpen(false)}
          title="Nova Meta"
          schema={goalSchema}
          defaultValues={{ status: 'not_started' }}
          onSubmit={async (data) => {
            await onAddGoal(data);
            setIsGoalFormOpen(false);
          }}
        >
          {(form) => (
            <div className="space-y-4">
              <Input
                label="Título da Meta"
                {...form.register('title')}
                placeholder="Ex: Ler livro X"
                error={form.formState.errors.title?.message as string}
              />
              <Input
                label="Prazo"
                type="date"
                {...form.register('deadline')}
                error={form.formState.errors.deadline?.message as string}
              />
              <Select
                label="Status"
                {...form.register('status')}
                options={[
                  { label: 'Não Iniciado', value: 'not_started' },
                  { label: 'Em Progresso', value: 'in_progress' },
                  { label: 'Concluído', value: 'completed' },
                ]}
                error={form.formState.errors.status?.message as string}
              />
            </div>
          )}
        </DialogForm>
      )}
    </div>
  );
}
