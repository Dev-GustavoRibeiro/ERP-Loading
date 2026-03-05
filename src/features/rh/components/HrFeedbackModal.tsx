'use client';

import React, { useState } from 'react';
import { Modal, Button, Tabs, Select, Badge, Input } from '@/shared/components/ui';
import { ThumbsUp, MessageSquare, Plus, User } from 'lucide-react';
import { useHrFeedback, Feedback } from '../hooks/useHrFeedback';
import { format } from 'date-fns';
import { DialogForm } from '@/shared/components/organisms/DialogForm';
import { z } from 'zod';
import { useHrPeople } from '../hooks/useHrPeople';
import { Controller } from 'react-hook-form';

interface HrFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HrFeedbackModal({ isOpen, onClose }: HrFeedbackModalProps) {
  const { feedbacks, loading, sendFeedback } = useHrFeedback();
  const { employees } = useHrPeople();
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'public'>('public');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Schema
  const schema = z.object({
    receiver_id: z.string().min(1, 'Destinatário obrigatório'),
    type: z.enum(['praise', 'constructive', 'general']),
    content: z.string().min(10, 'Mensagem muito curta'),
    visibility: z.enum(['public', 'private', 'manager_only']),
    // sender_id should be injected from context/auth
  });

  const filteredFeedbacks = feedbacks.filter(f => {
    if (activeTab === 'public') return f.visibility === 'public';
    // TODO: Add filtering by sender/receiver based on current user
    return true;
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Feedback & Elogios"
        size="full"
        footer={
          <div className="flex justify-between w-full">
            <div className="text-sm text-slate-400">
              {filteredFeedbacks.length} feedbacks encontrados
            </div>
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        }
      >
        <div className="space-y-6 h-full flex flex-col">
          {/* Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Tabs
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as any)}
              tabs={[
                { id: 'public', label: 'Elogios Públicos' },
                { id: 'received', label: 'Recebidos' },
                { id: 'sent', label: 'Enviados' },
              ]}
            />
            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
              <Plus size={16} className="mr-2" /> Enviar Feedback
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto p-1">
            {filteredFeedbacks.map(f => (
              <FeedbackCard key={f.id} feedback={f} />
            ))}
            {filteredFeedbacks.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-slate-500">
                Nenhum feedback encontrado.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {isFormOpen && (
        <DialogForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Enviar Feedback"
          schema={schema}
          defaultValues={{ type: 'praise', visibility: 'public' }}
          onSubmit={async (data) => {
            // TODO: Inject current user as sender
            // await sendFeedback({ ...data, sender_id: 'CURRENT_USER' });
            console.log(data);
            await sendFeedback({
              ...data,
              sender_id: employees[0]?.id // TEMP: use first employee as sender until auth ready
            } as any);
            setIsFormOpen(false);
          }}
        >
          {(form) => (
            <div className="space-y-4">
              <Controller
                control={form.control}
                name="receiver_id"
                render={({ field }) => (
                  <Select
                    label="Para quem?"
                    {...field}
                    options={[
                      { label: 'Selecione...', value: '' },
                      ...employees.map(e => ({ label: e.nome, value: e.id }))
                    ]}
                    error={form.formState.errors.receiver_id?.message as string}
                  />
                )}
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
                        { label: 'Elogio (Praise)', value: 'praise' },
                        { label: 'Construtivo', value: 'constructive' },
                        { label: 'Geral', value: 'general' },
                      ]}
                      error={form.formState.errors.type?.message as string}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <Select
                      label="Visibilidade"
                      {...field}
                      options={[
                        { label: 'Público', value: 'public' },
                        { label: 'Privado', value: 'private' },
                        { label: 'Apenas Gestor', value: 'manager_only' },
                      ]}
                      error={form.formState.errors.visibility?.message as string}
                    />
                  )}
                />
              </div>

              <Input
                label="Mensagem"
                {...form.register('content')}
                placeholder="Descreva seu feedback..."
                error={form.formState.errors.content?.message as string}
              />
            </div>
          )}
        </DialogForm>
      )}
    </>
  );
}

function FeedbackCard({ feedback }: { feedback: Feedback }) {
  return (
    <div className="bg-[#1a2235] border border-white/5 p-4 rounded-xl space-y-3 hover:bg-white/5 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
            {feedback.sender?.avatar_url ? (
              <img src={feedback.sender.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={14} className="text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{feedback.sender?.nome}</p>
            <p className="text-xs text-slate-500">{format(new Date(feedback.created_at), 'dd MMM')}</p>
          </div>
        </div>
        <Badge variant={feedback.type === 'praise' ? 'success' : 'default'}>
          {feedback.type === 'praise' ? <ThumbsUp size={12} className="mr-1" /> : <MessageSquare size={12} className="mr-1" />}
          {feedback.type.toUpperCase()}
        </Badge>
      </div>

      <div className="text-slate-300 text-sm italic">
        "{feedback.content}"
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center gap-2">
        <span className="text-xs text-slate-500">Para:</span>
        <div className="flex items-center gap-1 text-xs text-white">
          {feedback.receiver?.avatar_url && (
            <div className="w-4 h-4 rounded-full overflow-hidden">
              <img src={feedback.receiver.avatar_url} alt="" />
            </div>
          )}
          <span>{feedback.receiver?.nome}</span>
        </div>
      </div>
    </div>
  )
}
