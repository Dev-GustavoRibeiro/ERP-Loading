'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X, FileBarChart, Download, Calendar } from 'lucide-react';

interface SpedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpedModal({ isOpen, onClose }: SpedModalProps) {
  const [loading, setLoading] = React.useState(false);
  const { useEmpresaId } = require('@/shared/hooks/useEmpresaId');
  const empresaId = useEmpresaId();

  const handleGenerate = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { spedService } = await import('@/modules/fiscal/services/spedService');
      const today = new Date();
      // Mock period
      const periodo = { mes: today.getMonth() + 1, ano: today.getFullYear() };

      const result = await spedService.gerarSpedFiscal(empresaId, periodo);

      if (result.success) {
        const blob = new Blob([result.arquivo || ''], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SPED_FISCAL_${periodo.mes}_${periodo.ano}.txt`;
        a.click();
        alert('Arquivo SPED gerado com sucesso!');
      } else {
        alert('Erro ao gerar SPED: ' + result.error);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar arquivo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl h-auto max-h-[90vh] bg-[#0f1219] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">

        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <FileBarChart className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">SPED Fiscal</h2>
              <p className="text-sm text-gray-400">Geração de arquivo digital para fisco</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-4">Gerar Novo Arquivo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Data Início</label>
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <input type="date" className="bg-transparent text-white w-full outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Data Fim</label>
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <input type="date" className="bg-transparent text-white w-full outline-none" />
                </div>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {loading ? 'Gerando...' : 'Gerar Arquivo SPED'}
            </button>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Histórico de Gerações</h3>
            <div className="text-center py-8 text-gray-500 bg-white/[0.02] rounded-xl border border-white/5 border-dashed">
              Nenhum arquivo gerado recentemente
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modal, document.body) : null;
}
