'use client';

import React from 'react';
import { Modal, Button, StatCard } from '@/shared/components/ui';
import { Users, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { useHrPeople } from '../hooks/useHrPeople';
import { useHrOkrs } from '../hooks/useHrOkrs';

interface HrAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HrAnalyticsModal({ isOpen, onClose }: HrAnalyticsModalProps) {
  const { employees, loading: peopleLoading } = useHrPeople();
  const { objectives, loading: okrLoading } = useHrOkrs();

  // Basic Stats Calculation
  const totalEmployees = employees.length;
  // TODO: Add active vs inactive check if status exists

  const totalObjectives = objectives.length;
  const completedObjectives = objectives.filter(o => o.status === 'completed').length || 0;
  const avgProgress = totalObjectives > 0
    ? (objectives.reduce((acc, curr) => acc + (curr.progress || 0), 0) / totalObjectives).toFixed(1)
    : '0';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Analytics de RH"
      size="full"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      }
    >
      <div className="space-y-6 group">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Colaboradores"
            value={peopleLoading ? '...' : totalEmployees}
            icon={<Users size={24} />}
            color="blue"
          />
          <StatCard
            title="Média Progresso OKR"
            value={okrLoading ? '...' : `${avgProgress}%`}
            icon={<Target size={24} />}
            color="emerald"
          />
          {/* Placeholders for now */}
          <StatCard
            title="Turnover (YTD)"
            value="2.1%"
            icon={<AlertTriangle size={24} />}
            color="amber"
          />
          <StatCard
            title="Promotoria eNPS"
            value="78"
            icon={<TrendingUp size={24} />}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#1a2235] p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-medium text-white mb-4">Distribuição por Departamento</h3>
            <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-lg text-slate-500">
              Gráfico de Pizza (Placeholder)
            </div>
          </div>
          <div className="bg-[#1a2235] p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-medium text-white mb-4">Evolução do Headcount</h3>
            <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-lg text-slate-500">
              Gráfico de Linha (Placeholder)
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
