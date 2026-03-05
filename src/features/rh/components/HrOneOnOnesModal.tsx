'use client';

import React, { useState } from 'react';
import { Modal, Button, DataTable, Badge, Select } from '@/shared/components/ui';
import { Plus, Calendar, User, MessageSquare } from 'lucide-react';
import { useHrOneOnOnes, OneOnOne } from '../hooks/useHrOneOnOnes';
import { format } from 'date-fns';
import { DialogForm } from '@/shared/components/organisms/DialogForm';
import { z } from 'zod'; // Assuming zod is available
import { Input } from '@/shared/components/ui'; // Assuming Input is available
import { useHrPeople } from '../hooks/useHrPeople'; // For employee list in form

interface HrOneOnOnesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HrOneOnOnesModal({ isOpen, onClose }: HrOneOnOnesModalProps) {
  const { meetings, loading, createMeeting } = useHrOneOnOnes();
  const { employees } = useHrPeople(); // Reuse people hook for selection
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Schema
  const schema = z.object({
    employee_id: z.string().min(1, 'Funcionário obrigatório'),
    manager_id: z.string().min(1, 'Gestor obrigatório'),
    scheduled_at: z.string().min(1, 'Data obrigatória'),
  });

  const columns = [
    {
      key: 'participants',
      header: 'Participantes',
      render: (item: OneOnOne) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <User size={12} />
            <span>M: {item.manager?.nome}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white font-medium">
            <User size={12} />
            <span>F: {item.employee?.nome}</span>
          </div>
        </div>
      )
    },
    {
      key: 'date',
      header: 'Data',
      render: (item: OneOnOne) => (
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar size={14} />
          {format(new Date(item.scheduled_at), 'dd/MM/yyyy HH:mm')}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: OneOnOne) => (
        <Badge variant={
          item.status === 'completed' ? 'success' :
            item.status === 'scheduled' ? 'warning' : 'default'
        }>
          {item.status.toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (item: OneOnOne) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => alert('Detalhes 1:1: ' + item.id)}
        >
          <MessageSquare size={14} className="mr-1" /> Abrir
        </Button>
      )
    }
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="1:1s (One-on-Ones)"
        size="full"
        footer={
          <div className="flex justify-between w-full">
            <div className="text-sm text-slate-400">
              {meetings.length} reuniões encontradas
            </div>
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        }
      >
        <div className="space-y-6 h-full flex flex-col">
          {/* Controls */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-white">Minhas Reuniões</h2>
            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
              <Plus size={16} className="mr-2" /> Agendar 1:1
            </Button>
          </div>

          <div className="bg-white/5 rounded-lg border border-white/10 flex-1 overflow-hidden flex flex-col">
            <DataTable
              columns={columns}
              data={meetings}
              isLoading={loading}
            />
          </div>
        </div>
      </Modal>

      {isFormOpen && (
        <DialogForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Agendar 1:1"
          schema={schema}
          onSubmit={async (data) => {
            await createMeeting({ ...data, status: 'scheduled' } as any);
            setIsFormOpen(false);
          }}
        >
          {(form) => (
            <div className="space-y-4">
              <Select
                label="Gestor"
                {...form.register('manager_id')}
                options={employees.map(e => ({ label: e.nome, value: e.id }))}
                error={form.formState.errors.manager_id?.message as string}
              />
              <Select
                label="Funcionário"
                {...form.register('employee_id')}
                options={employees.map(e => ({ label: e.nome, value: e.id }))}
                error={form.formState.errors.employee_id?.message as string}
              />
              <Input
                label="Data e Hora"
                type="datetime-local"
                {...form.register('scheduled_at')}
                error={form.formState.errors.scheduled_at?.message as string}
              />
            </div>
          )}
        </DialogForm>
      )}
    </>
  );
}
