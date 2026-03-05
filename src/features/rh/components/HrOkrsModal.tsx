'use client';

import React, { useState } from 'react';
import { Modal, Button, Tabs, Select, Badge } from '@/shared/components/ui';
import { Target, Plus, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { useHrOkrs, Objective, KeyResult } from '../hooks/useHrOkrs';
import { format } from 'date-fns';
import { HrObjectiveForm } from './HrObjectiveForm';
import { HrKeyResultForm } from './HrKeyResultForm';

interface HrOkrsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HrOkrsModal({ isOpen, onClose }: HrOkrsModalProps) {
  const {
    cycles, objectives, activeCycleId, setActiveCycleId, loading,
    checkinKeyResult, createObjective, createKeyResult
  } = useHrOkrs();

  const [activeTab, setActiveTab] = useState<'my' | 'team' | 'company'>('my');

  // Form States
  const [isObjectiveFormOpen, setIsObjectiveFormOpen] = useState(false);
  const [isKeyResultFormOpen, setIsKeyResultFormOpen] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);

  // Handlers
  const handleNewObjective = () => setIsObjectiveFormOpen(true);
  const handleSubmitObjective = async (data: any) => {
    await createObjective(data);
    setIsObjectiveFormOpen(false);
  };

  const handleNewKeyResult = (objectiveId: string) => {
    setSelectedObjectiveId(objectiveId);
    setIsKeyResultFormOpen(true);
  };
  const handleSubmitKeyResult = async (data: any) => {
    await createKeyResult(data);
    setIsKeyResultFormOpen(false);
  };

  // Filtering Logic
  const filteredObjectives = objectives.filter(obj => {
    if (activeTab === 'company') return obj.type === 'company';
    if (activeTab === 'team') return obj.type === 'team';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'success';
      case 'at_risk': return 'warning';
      case 'behind': return 'danger';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Metas e OKRs"
        size="full"
        footer={
          <div className="flex justify-between w-full">
            <div className="text-sm text-slate-400">
              {filteredObjectives.length} objetivos encontrados
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
                  { id: 'my', label: 'Meus OKRs' },
                  { id: 'team', label: 'Time' },
                  { id: 'company', label: 'Empresa' },
                ]}
              />
            </div>
            <Button variant="primary" onClick={handleNewObjective}>
              <Plus size={16} className="mr-2" /> Novo Objetivo
            </Button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {filteredObjectives.map(obj => (
              <OkrItem
                key={obj.id}
                objective={obj}
                onCheckin={checkinKeyResult}
                onAddKeyResult={() => handleNewKeyResult(obj.id)}
              />
            ))}

            {filteredObjectives.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-500">
                Nenhum objetivo encontrado neste ciclo para esta visão.
              </div>
            )}

            {loading && (
              <div className="text-center py-12 text-slate-500">Carregando...</div>
            )}
          </div>
        </div>
      </Modal>

      {isObjectiveFormOpen && (
        <HrObjectiveForm
          isOpen={isObjectiveFormOpen}
          onClose={() => setIsObjectiveFormOpen(false)}
          onSubmit={handleSubmitObjective}
          cycleId={activeCycleId || ''}
        />
      )}

      {isKeyResultFormOpen && selectedObjectiveId && (
        <HrKeyResultForm
          isOpen={isKeyResultFormOpen}
          onClose={() => setIsKeyResultFormOpen(false)}
          onSubmit={handleSubmitKeyResult}
          objectiveId={selectedObjectiveId}
        />
      )}
    </>
  );
}

// Sub-component for individual OKR item
function OkrItem({ objective, onCheckin, onAddKeyResult }: { objective: Objective, onCheckin: (id: string, val: number) => void, onAddKeyResult: () => void }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-[#1a2235] rounded-xl border border-white/5 overflow-hidden">
      {/* Objective Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1 rounded bg-white/5`}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium text-lg">{objective.title}</h3>
              <Badge variant={objective.status === 'on_track' ? 'success' : 'warning'}>
                {objective.status?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
              <span>{objective.owner?.nome || 'Sem dono'}</span>
              <span>•</span>
              <span>{objective.progress || 0}% Concluído</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32 hidden md:block">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400"
                style={{ width: `${objective.progress || 0}%` }}
              />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onAddKeyResult(); }}>
            <Plus size={14} className="mr-1" /> KR
          </Button>
        </div>
      </div>

      {/* Key Results */}
      {expanded && objective.key_results && (
        <div className="border-t border-white/5 bg-black/20">
          {objective.key_results.map(kr => (
            <div key={kr.id} className="p-3 pl-12 flex items-center justify-between border-b border-white/5 last:border-0 hover:bg-white/5">
              <div className="flex items-center gap-3">
                <Target size={14} className="text-slate-500" />
                <div>
                  <p className="text-sm text-slate-200">{kr.title}</p>
                  <p className="text-xs text-slate-500">
                    Meta: {kr.target_value} {kr.unit} • Peso: {kr.weight}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-white font-mono">{kr.current_value}</span>
                  <span className="text-slate-500 text-xs ml-1">/ {kr.target_value}</span>
                </div>
                {/* Simple Checkin Button */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const val = prompt('Novo valor:', String(kr.current_value));
                    if (val) onCheckin(kr.id, Number(val));
                  }}
                >
                  Check-in
                </Button>
              </div>
            </div>
          ))}
          {objective.key_results.length === 0 && (
            <div className="p-3 pl-12 text-sm text-slate-500">Nenhum resultado chave cadastrado.</div>
          )}
        </div>
      )}
    </div>
  );
}
