'use client';

import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui';
import {
  Users, Target, BarChart2, MessageSquare, Heart,
  TrendingUp, ClipboardList, Crown, PieChart
} from 'lucide-react';
import { HrPeopleModal } from './HrPeopleModal';

interface HrMainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const modules = [
  { id: 'people', label: 'Pessoas e Estrutura', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'okr', label: 'Metas e OKRs', icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'performance', label: 'Avaliação de Desempenho', icon: BarChart2, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'oneonone', label: '1:1s', icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { id: 'feedback', label: 'Feedback e Kudos', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { id: 'development', label: 'PDI e Desenvolvimento', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'surveys', label: 'Pesquisas e Clima', icon: ClipboardList, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { id: 'succession', label: 'Sucessão e Talentos', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { id: 'analytics', label: 'People Analytics', icon: PieChart, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
];

export function HrMainModal({ isOpen, onClose }: HrMainModalProps) {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  if (!isOpen) return null;

  // Render Sub-Modals
  if (activeModule === 'people') {
    return <HrPeopleModal isOpen={true} onClose={() => setActiveModule(null)} />;
  }

  // TODO: Add other modals conditions here
  if (activeModule) {
    // Placeholder for other modules
    return (
      <Modal isOpen={true} onClose={() => setActiveModule(null)} title="Em Breve">
        <div className="p-4 text-center">Módulo em desenvolvimento.</div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recursos Humanos (People Ops)"
      size="xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => setActiveModule(mod.id)}
            className={`
              flex flex-col items-center justify-center p-6 rounded-xl border transition-all duration-200
              ${mod.bg} ${mod.border} hover:scale-[1.02] hover:shadow-lg group
            `}
          >
            <div className={`p-4 rounded-full bg-white/5 mb-4 group-hover:bg-white/10 transition-colors`}>
              <mod.icon size={32} className={mod.color} />
            </div>
            <span className="text-white font-semibold text-lg text-center">{mod.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
