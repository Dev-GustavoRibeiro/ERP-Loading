'use client';

import React from 'react';
import { DialogForm } from '@/shared/components/organisms/DialogForm';
import { Input, Select, Button } from '@/shared/components/ui';
import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { useHrPeople } from '../hooks/useHrPeople';

const schema = z.object({
  title: z.string().min(3, 'Título obrigatório'),
  type: z.enum(['company', 'team', 'individual']),
  owner_id: z.string().uuid('Dono obrigatório'),
  team_id: z.string().uuid().optional().nullable(),
  cycle_id: z.string().uuid(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface HrObjectiveFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  cycleId: string;
  defaultValues?: Partial<FormData>;
}

export function HrObjectiveForm({ isOpen, onClose, onSubmit, cycleId, defaultValues }: HrObjectiveFormProps) {
  const { employees, teams } = useHrPeople();

  return (
    <DialogForm<FormData>
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Objetivo"
      schema={schema}
      defaultValues={{ ...defaultValues, cycle_id: cycleId, type: 'individual' }}
      onSubmit={onSubmit}
    >
      {(form) => (
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Título do Objetivo"
            {...form.register('title')}
            error={form.formState.errors.title?.message}
            placeholder="Ex: Aumentar faturamento em 20%"
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  label="Nível"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { label: 'Individual', value: 'individual' },
                    { label: 'Time / Área', value: 'team' },
                    { label: 'Empresa', value: 'company' },
                  ]}
                  error={form.formState.errors.type?.message}
                />
              )}
            />

            <Controller
              control={form.control}
              name="owner_id"
              render={({ field }) => (
                <Select
                  label="Responsável"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { label: 'Selecione...', value: '' },
                    ...employees.map(e => ({ label: e.nome, value: e.id }))
                  ]}
                  error={form.formState.errors.owner_id?.message}
                />
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="team_id"
            render={({ field }) => (
              <Select
                label="Time (Opcional)"
                value={field.value || ''}
                onChange={field.onChange}
                options={[
                  { label: 'Nenhum', value: '' },
                  ...teams.map(t => ({ label: t.name, value: t.id }))
                ]}
                error={form.formState.errors.team_id?.message}
              />
            )}
          />

          <Input
            label="Descrição (Opcional)"
            {...form.register('description')}
            error={form.formState.errors.description?.message}
          />
        </div>
      )}
    </DialogForm>
  );
}
