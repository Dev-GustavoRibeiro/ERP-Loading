'use client';

import React, { useState } from 'react';
import { Modal, Button, Tabs, Select, Badge } from '@/shared/components/ui';
import { ArrowUpRight, Plus, User, Users } from 'lucide-react';
import { useHrSuccession, SuccessionPlan } from '../hooks/useHrSuccession';
import { DialogForm } from '@/shared/components/organisms/DialogForm';
import { z } from 'zod';
import { useHrPeople } from '../hooks/useHrPeople';
import { Controller } from 'react-hook-form';

interface HrSuccessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HrSuccessionModal({ isOpen, onClose }: HrSuccessionModalProps) {
  const { plans, nineBoxData, loading, createPlan } = useHrSuccession();
  const { employees, roles } = useHrPeople();
  const [activeTab, setActiveTab] = useState<'plans' | '9box'>('plans');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Schema for New Succession Plan
  const schema = z.object({
    role_id: z.string().min(1, 'Cargo obrigatório'),
    incumbent_id: z.string().min(1, 'Ocupante atual obrigatório'),
    status: z.enum(['active', 'draft']),
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Sucessão e Talentos"
        size="full"
        footer={
          <div className="flex justify-between w-full">
            <div className="text-sm text-slate-400">
              {plans.length} planos de sucessão
            </div>
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        }
      >
        <div className="space-y-6 h-full flex flex-col">
          {/* Controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Tabs
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as any)}
                tabs={[
                  { id: 'plans', label: 'Planos de Sucessão' },
                  { id: '9box', label: 'Matriz 9-Box' },
                ]}
              />
            </div>
            {activeTab === 'plans' && (
              <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                <Plus size={16} className="mr-2" /> Novo Plano
              </Button>
            )}
          </div>

          {activeTab === 'plans' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto p-1">
              {plans.map(plan => (
                <SuccessionCard key={plan.id} plan={plan} />
              ))}
              {plans.length === 0 && !loading && (
                <div className="col-span-full text-center py-12 text-slate-500">
                  Nenhum plano de sucessão ativo.
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#1a2235] rounded-xl border border-white/5">
              <div className="text-center">
                <div className="grid grid-cols-3 gap-1 w-[400px] h-[400px]">
                  {/* Placeholder 9-Box Grid */}
                  {['Alto Potencial', 'Estrela em Ascensão', 'Top Talent', 'Especialista', 'Core Performer', 'High Performer', 'Under Performer', 'Dilemma', 'Effective'].map((label, i) => (
                    <div key={i} className="bg-white/5 flex items-center justify-center border border-white/5 relative group">
                      <span className="text-xs text-slate-500">{label}</span>
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-slate-400 text-sm">Matriz 9-Box (Performance x Potencial)</p>
                <p className="text-xs text-slate-600">Necessário realizar ciclos de calibração para popular.</p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {isFormOpen && (
        <DialogForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Novo Plano de Sucessão"
          schema={schema}
          defaultValues={{ status: 'active' }}
          onSubmit={async (data) => {
            await createPlan(data as any);
            setIsFormOpen(false);
          }}
        >
          {(form) => (
            <div className="space-y-4">
              <Controller
                control={form.control}
                name="role_id"
                render={({ field }) => (
                  <Select
                    label="Cargo Chave"
                    {...field}
                    options={[
                      { label: 'Selecione...', value: '' },
                      ...roles.map(r => ({ label: r.title, value: r.id }))
                    ]}
                    error={form.formState.errors.role_id?.message as string}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="incumbent_id"
                render={({ field }) => (
                  <Select
                    label="Ocupante Atual"
                    {...field}
                    options={[
                      { label: 'Selecione...', value: '' },
                      ...employees.map(e => ({ label: e.nome, value: e.id }))
                    ]}
                    error={form.formState.errors.incumbent_id?.message as string}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    label="Status"
                    {...field}
                    options={[
                      { label: 'Ativo', value: 'active' },
                      { label: 'Rascunho', value: 'draft' },
                    ]}
                    error={form.formState.errors.status?.message as string}
                  />
                )}
              />
            </div>
          )}
        </DialogForm>
      )}
    </>
  );
}

function SuccessionCard({ plan }: { plan: SuccessionPlan }) {
  return (
    <div className="bg-[#1a2235] border border-white/5 p-4 rounded-xl space-y-4 hover:border-white/10 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-medium">{plan.role?.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <User size={12} className="text-slate-500" />
            <span className="text-sm text-slate-400">Atual: {plan.incumbent?.nome}</span>
          </div>
        </div>
        <Badge variant={plan.status === 'active' ? 'success' : 'default'}>
          {plan.status.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Sucessores Identificados</p>
        {plan.candidates && plan.candidates.length > 0 ? (
          plan.candidates.map(c => (
            <div key={c.id} className="bg-white/5 p-2 rounded flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">
                  {c.employee?.nome?.charAt(0)}
                </div>
                <span className="text-sm text-slate-200">{c.employee?.nome}</span>
              </div>
              <Badge variant={
                c.readiness === 'ready_now' ? 'success' :
                  c.readiness === 'ready_1_year' ? 'info' : 'warning'
              }>
                {c.readiness.replace(/_/g, ' ')}
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-600 italic py-2 border border-dashed border-white/10 rounded text-center">
            Nenhum sucessor mapeado
          </div>
        )}
      </div>

      <Button variant="secondary" className="w-full text-xs">
        Gerenciar Sucessores
      </Button>
    </div>
  )
}
