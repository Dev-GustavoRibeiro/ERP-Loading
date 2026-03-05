'use client';

import React, { useEffect } from 'react';
import { useForm, DefaultValues, FieldValues, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Button } from '@/shared/components/ui';

interface DialogFormProps<T extends FieldValues> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  schema: z.ZodType<T>;
  defaultValues?: DefaultValues<T>;
  onSubmit: (data: T) => Promise<void>;
  children: (form: UseFormReturn<T>) => React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function DialogForm<T extends FieldValues>({
  isOpen,
  onClose,
  title,
  schema,
  defaultValues,
  onSubmit,
  children,
  size = 'md'
}: DialogFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema as any),
    defaultValues
  });

  // Reset form when modal opens/closes or defaultValues change
  useEffect(() => {
    if (isOpen && defaultValues) {
      form.reset(defaultValues);
    }
  }, [isOpen, defaultValues, form]);

  const handleFormSubmit = async (data: T) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={form.handleSubmit(handleFormSubmit)}
            isLoading={form.formState.isSubmitting}
            disabled={!form.formState.isValid}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {children(form)}
      </form>
    </Modal>
  );
}
