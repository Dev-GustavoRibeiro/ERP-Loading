'use client';

import React, { useState } from 'react';
import { Modal, Button, Badge, Input, Select } from '@/shared/components/ui';
import { FileText, Plus, BarChart3, Clock } from 'lucide-react';
import { useHrSurveys, Survey } from '../hooks/useHrSurveys';
import { format } from 'date-fns';
import { DialogForm } from '@/shared/components/organisms/DialogForm';
import { z } from 'zod';
import { Controller } from 'react-hook-form';

interface HrSurveysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HrSurveysModal({ isOpen, onClose }: HrSurveysModalProps) {
  const { surveys, loading, createSurvey } = useHrSurveys();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Schema for New Survey
  const schema = z.object({
    title: z.string().min(5, 'Título obrigatório'),
    type: z.enum(['climate', 'engagement', 'specific']),
    deadline: z.string().min(1, 'Prazo obrigatório'),
    description: z.string().optional(),
    status: z.enum(['draft', 'active']),
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Pesquisas de Clima e Engajamento"
        size="full"
        footer={
          <div className="flex justify-between w-full">
            <div className="text-sm text-slate-400">
              {surveys.length} pesquisas encontradas
            </div>
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        }
      >
        <div className="space-y-6 h-full flex flex-col">
          {/* Controls */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-white">Pesquisas Ativas</h2>
              <p className="text-sm text-slate-400">Gerencie pesquisas de satisfação e clima.</p>
            </div>
            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
              <Plus size={16} className="mr-2" /> Nova Pesquisa
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto p-1">
            {surveys.map(survey => (
              <SurveyCard key={survey.id} survey={survey} />
            ))}
            {surveys.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-slate-500">
                Nenhuma pesquisa encontrada.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {isFormOpen && (
        <DialogForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Nova Pesquisa"
          schema={schema}
          defaultValues={{ status: 'draft', type: 'climate' }}
          onSubmit={async (data) => {
            await createSurvey(data as any);
            setIsFormOpen(false);
          }}
        >
          {(form) => (
            <div className="space-y-4">
              <Input
                label="Título da Pesquisa"
                {...form.register('title')}
                placeholder="Ex: Pesquisa de Clima Q1 2024"
                error={form.formState.errors.title?.message as string}
              />
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      label="Tipo"
                      {...field}
                      options={[
                        { label: 'Clima', value: 'climate' },
                        { label: 'Engajamento', value: 'engagement' },
                        { label: 'Específica', value: 'specific' },
                      ]}
                      error={form.formState.errors.type?.message as string}
                    />
                  )}
                />
                <Input
                  label="Prazo"
                  type="date"
                  {...form.register('deadline')}
                  error={form.formState.errors.deadline?.message as string}
                />
              </div>
              <Input
                label="Descrição"
                {...form.register('description')}
                error={form.formState.errors.description?.message as string}
              />
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    label="Status Inicial"
                    {...field}
                    options={[
                      { label: 'Rascunho', value: 'draft' },
                      { label: 'Ativa', value: 'active' },
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

function SurveyCard({ survey }: { survey: Survey }) {
  return (
    <div className="bg-[#1a2235] border border-white/5 p-4 rounded-xl space-y-4 hover:bg-white/5 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-medium text-white">{survey.title}</h3>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{survey.type}</p>
          </div>
        </div>
        <Badge variant={survey.status === 'active' ? 'success' : 'default'}>
          {survey.status.toUpperCase()}
        </Badge>
      </div>

      <p className="text-sm text-slate-400 line-clamp-2">{survey.description}</p>

      <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>Prazo: {format(new Date(survey.deadline), 'dd/MM/yyyy')}</span>
        </div>
        <div className="flex items-center gap-1">
          <BarChart3 size={12} />
          <span>{survey.response_count || 0} Respostas</span>
        </div>
      </div>

      <Button variant="secondary" className="w-full text-xs h-8">
        Gerenciar Perguntas
      </Button>
    </div>
  );
}
