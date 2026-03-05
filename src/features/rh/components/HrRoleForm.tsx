'use client';

import React from 'react';
import { DialogForm } from '@/shared/components/organisms/DialogForm';
import { Input, Select } from '@/shared/components/ui';
import { HrRoleSchema, HrRoleFormData } from '../schemas';

interface HrRoleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HrRoleFormData) => Promise<void>;
  defaultValues?: Partial<HrRoleFormData>;
}

export function HrRoleForm({ isOpen, onClose, onSubmit, defaultValues }: HrRoleFormProps) {
  return (
    <DialogForm<HrRoleFormData>
      isOpen={isOpen}
      onClose={onClose}
      title={defaultValues?.title ? 'Editar Cargo/Nível' : 'Novo Cargo/Nível'}
      schema={HrRoleSchema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
    >
      {(form) => (
        <div className="space-y-4">
          <Input
            label="Título do Cargo"
            {...form.register('title')}
            error={form.formState.errors.title?.message}
            placeholder="Ex: Desenvolvedor Full Stack"
          />
          <Input
            label="Nível"
            {...form.register('level')}
            error={form.formState.errors.level?.message}
            placeholder="Ex: Senior III"
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
