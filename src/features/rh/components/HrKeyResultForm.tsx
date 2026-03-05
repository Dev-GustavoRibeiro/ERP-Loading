'use client';

import React from 'react';
import { DialogForm } from '@/shared/components/organisms/DialogForm';
import { Input, Button } from '@/shared/components/ui';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(3, 'Título obrigatório'),
  start_value: z.coerce.number(),
  target_value: z.coerce.number().min(0.1, 'Meta deve ser maior que 0'),
  unit: z.string().min(1, 'Unidade obrigatória'), // %, R$, #
  weight: z.coerce.number().min(1).max(100).default(1),
  objective_id: z.string().uuid(),
});

type FormData = z.infer<typeof schema>;

interface HrKeyResultFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  objectiveId: string;
}

export function HrKeyResultForm({ isOpen, onClose, onSubmit, objectiveId }: HrKeyResultFormProps) {
  return (
    <DialogForm<FormData>
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Resultado Chave (KR)"
      schema={schema}
      defaultValues={{ objective_id: objectiveId, start_value: 0, weight: 1, unit: '#' }}
      onSubmit={onSubmit}
    >
      {(form) => (
        <div className="space-y-4">
          <Input
            label="Título do KR"
            {...form.register('title')}
            error={form.formState.errors.title?.message}
            placeholder="Ex: Alcançar 100 leads qualificados"
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Valor Inicial"
              type="number"
              {...form.register('start_value')}
              error={form.formState.errors.start_value?.message}
            />
            <Input
              label="Meta (Alvo)"
              type="number"
              {...form.register('target_value')}
              error={form.formState.errors.target_value?.message}
            />
            <Input
              label="Unidade"
              {...form.register('unit')}
              placeholder="%, R$, un"
              error={form.formState.errors.unit?.message}
            />
          </div>

          <Input
            label="Peso (1-100)"
            type="number"
            {...form.register('weight')}
            helperText="Peso deste KR no objetivo"
            error={form.formState.errors.weight?.message}
          />
        </div>
      )}
    </DialogForm>
  );
}
