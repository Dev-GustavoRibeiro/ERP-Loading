'use client';

import React from 'react';
import { DialogForm } from '@/shared/components/organisms/DialogForm';
import { Input, Select, Button } from '@/shared/components/ui';
import { HrEmployeeSchema, HrEmployeeFormData } from '../schemas';
import { Role, Team } from '../hooks/useHrPeople';
import { Controller } from 'react-hook-form';

interface HrEmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HrEmployeeFormData) => Promise<void>;
  defaultValues?: Partial<HrEmployeeFormData>;
  roles: Role[];
  teams: Team[];
  managers: { id: string, nome: string }[];
}

export function HrEmployeeForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  roles,
  teams,
  managers
}: HrEmployeeFormProps) {
  return (
    <DialogForm<HrEmployeeFormData>
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues?.nome ? 'Editar Colaborador' : 'Novo Colaborador'}
      schema={HrEmployeeSchema}
      defaultValues={defaultValues || { ativo: true }}
      onSubmit={onSubmit}
    >
      {(form) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome Completo"
            {...form.register('nome')}
            error={form.formState.errors.nome?.message}
            placeholder="Ex: João Silva"
          />

          <Input
            label="Email Corporativo"
            type="email"
            {...form.register('email')}
            error={form.formState.errors.email?.message}
            placeholder="joao@empresa.com"
          />

          <Controller
            control={form.control}
            name="cargo_id"
            render={({ field }) => (
              <Select
                label="Cargo / Nível"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: 'Selecione...', value: '' },
                  ...roles.map(r => ({ label: `${r.title} (${r.level})`, value: r.id }))
                ]}
                error={form.formState.errors.cargo_id?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="departamento_id"
            render={({ field }) => (
              <Select
                label="Departamento"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: 'Selecione...', value: '' },
                  ...teams.map(t => ({ label: t.name, value: t.id }))
                ]}
                error={form.formState.errors.departamento_id?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="manager_id"
            render={({ field }) => (
              <Select
                label="Gestor Direto"
                value={field.value || ''}
                onChange={field.onChange}
                options={[
                  { label: 'Nenhum / É Gestor', value: '' },
                  ...managers.map(m => ({ label: m.nome, value: m.id }))
                ]}
                error={form.formState.errors.manager_id?.message}
              />
            )}
          />

          <Input
            label="Data de Admissão"
            type="date"
            {...form.register('data_admissao')}
            error={form.formState.errors.data_admissao?.message}
          />
        </div>
      )}
    </DialogForm>
  );
}
