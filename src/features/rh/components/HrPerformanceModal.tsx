'use client';

import React, { useState } from 'react';
import { Modal, Button, Tabs, Select, Badge, DataTable } from '@/shared/components/ui';
import { BarChart3, Plus, Calendar, FileText, User } from 'lucide-react';
import { useHrPerformance, ReviewAssignment } from '../hooks/useHrPerformance';
import { format } from 'date-fns';

interface HrPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HrPerformanceModal({ isOpen, onClose }: HrPerformanceModalProps) {
  const {
    cycles, assignments, activeCycleId, setActiveCycleId, loading,
    createCycle, createAssignment
  } = useHrPerformance();

  const [activeTab, setActiveTab] = useState<'my_reviews' | 'team_reviews' | 'all'>('my_reviews');

  // Filtering Logic
  // Placeholder: 'my_reviews' would filter by reviewer_id/reviewee_id = current_user
  const filteredAssignments = assignments.filter(a => {
    if (activeTab === 'my_reviews') return true; // TODO: Filter by me 
    if (activeTab === 'team_reviews') return true; // TODO: Filter by my team
    return true;
  });

  const columns = [
    {
      key: 'reviewee',
      header: 'Avaliado',
      render: (item: ReviewAssignment) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <User size={14} className="text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-white">{item.reviewee?.nome}</p>
            <p className="text-xs text-slate-500">{item.type}</p>
          </div>
        </div>
      )
    },
    {
      key: 'reviewer',
      header: 'Avaliador',
      render: (item: ReviewAssignment) => <span className="text-slate-300">{item.reviewer?.nome}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: ReviewAssignment) => (
        <Badge variant={
          item.status === 'submitted' ? 'success' :
            item.status === 'in_progress' ? 'warning' : 'default'
        }>
          {item.status.replace('_', ' ').toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (item: ReviewAssignment) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => alert('Abrir avaliação: ' + item.id)}
        >
          <FileText size={14} className="mr-1" /> Avaliar
        </Button>
      )
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Avaliação de Desempenho"
      size="full"
      footer={
        <div className="flex justify-between w-full">
          <div className="text-sm text-slate-400">
            {filteredAssignments.length} avaliações encontradas
          </div>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      }
    >
      <div className="space-y-6 h-full flex flex-col">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Select
              options={cycles.map(c => ({ label: c.name, value: c.id }))}
              value={activeCycleId || ''}
              onChange={(e) => setActiveCycleId(e.target.value)}
              className="w-48"
            />
            <Tabs
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as any)}
              tabs={[
                { id: 'my_reviews', label: 'Minhas Avaliações' },
                { id: 'team_reviews', label: 'Meu Time' },
                { id: 'all', label: 'Todas' },
              ]}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => createCycle({ name: 'Novo Ciclo', status: 'draft' })}>
              <Calendar size={16} className="mr-2" /> Ciclos
            </Button>
            <Button variant="primary" onClick={() => createAssignment({})}>
              <Plus size={16} className="mr-2" /> Nova Avaliação
            </Button>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg border border-white/10 flex-1 overflow-hidden flex flex-col">
          <DataTable
            columns={columns}
            data={filteredAssignments}
            isLoading={loading}
          />
        </div>
      </div>
    </Modal>
  );
}
