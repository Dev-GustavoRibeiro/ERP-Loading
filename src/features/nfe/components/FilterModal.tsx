'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Filter, RotateCcw } from 'lucide-react';
import type { FilterNfeValues } from '@/features/nfe/schemas';

interface FilterModalProps {
  isOpen: boolean;
  currentFilters: FilterNfeValues;
  onApply: (filters: FilterNfeValues) => void;
  onClose: () => void;
}

export function FilterModal({ isOpen, currentFilters, onApply, onClose }: FilterModalProps) {
  const [status, setStatus] = useState(currentFilters.status || '');
  const [tipo, setTipo] = useState(currentFilters.tipo || '');
  const [dataInicio, setDataInicio] = useState(currentFilters.data_inicio || '');
  const [dataFim, setDataFim] = useState(currentFilters.data_fim || '');

  const handleApply = () => {
    onApply({
      status: (status || undefined) as FilterNfeValues['status'],
      tipo: tipo as FilterNfeValues['tipo'],
      data_inicio: dataInicio || undefined,
      data_fim: dataFim || undefined,
    });
  };

  const handleClear = () => {
    setStatus('');
    setTipo('');
    setDataInicio('');
    setDataFim('');
    onApply({});
  };

  if (!isOpen) return null;

  const selectClasses = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none';
  const inputClasses = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50';
  const labelClasses = 'block text-xs font-medium text-gray-400 mb-1';

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0f1219] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Filter className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Filtros</h2>
              <p className="text-xs text-gray-400">Refine a busca de notas fiscais</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className={labelClasses}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={selectClasses}>
              <option value="">Todos</option>
              <option value="digitacao">Em Digitação</option>
              <option value="validada">Validada</option>
              <option value="autorizada">Autorizada</option>
              <option value="cancelada">Cancelada</option>
              <option value="denegada">Denegada</option>
              <option value="inutilizada">Inutilizada</option>
            </select>
          </div>

          <div>
            <label className={labelClasses}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className={selectClasses}>
              <option value="">Todos</option>
              <option value="nfe">NF-e (Modelo 55)</option>
              <option value="nfce">NFC-e (Modelo 65)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClasses}>Data Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Data Fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inputClasses} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-white/5 bg-white/[0.02]">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Limpar
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4" /> Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modal, document.body) : null;
}
