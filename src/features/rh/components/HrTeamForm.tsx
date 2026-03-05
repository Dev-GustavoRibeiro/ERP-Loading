'use client';

import React from 'react';
import { DialogForm } from '@/shared/components/organisms/DialogForm';
import { Input } from '@/shared/components/ui';
import { HrTeamSchema, HrTeamFormData } from '../schemas';

interface HrTeamFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HrTeamFormData) => Promise<void>;
  defaultValues?: Partial<HrTeamFormData>;
}

export function HrTeamForm({ isOpen, onClose, onSubmit, defaultValues }: HrTeamFormProps) {
  return (
    <DialogForm<HrTeamFormData>
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues?.name ? 'Editar Departamento' : 'Novo Departamento'}
      schema={HrTeamSchema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
    >
      {(form) => (
        <div className="space-y-4">
          <Input
            label="Nome do Departamento"
            {...form.register('name')}
            error={form.formState.errors.name?.message}
            placeholder="Ex: Engenharia"
          />
          <Input
            label="Descrição (Opcional)"
            {...form.register('description')}
            error={form.formState.errors.description?.message}
          />
          {/* Manager ID can be added later as relation */}
        </div>
      )}
    </DialogForm>
  );
}
