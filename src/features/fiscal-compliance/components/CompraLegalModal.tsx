'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, Search, AlertTriangle, CheckCircle } from 'lucide-react';

interface CompraLegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompraLegalModal({ isOpen, onClose }: CompraLegalModalProps) {
  const [alertas, setAlertas] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { complianceService } = await import('@/modules/fiscal/services/complianceService');
      const data = await complianceService.listarAlertas();
      setAlertas(data);
    } catch (error) {
      console.error('Erro ao carregar compliance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#0f1219] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">

        <div className="flex items-center justify-between p-6 border-b border-white/5">
          {/* Header content same as before */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
              <ShieldCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Compra Legal</h2>
              <p className="text-sm text-gray-400">Monitoramento de conformidade fiscal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">98%</p>
              <p className="text-xs text-gray-400">Conformidade Geral</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{alertas.length}</p>
              <p className="text-xs text-gray-400">Fornecedores em Alerta</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 py-2 w-full max-w-sm">
              <Search className="w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Buscar fornecedor ou CNPJ..." className="bg-transparent text-white w-full outline-none text-sm" />
            </div>
          </div>

          {alertas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma irregularidade encontrada recentemente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((alerta, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <div>
                    <p className="text-white font-medium">{alerta.razao_social}</p>
                    <p className="text-xs text-gray-500">{alerta.cnpj}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                      {alerta.status_sefaz}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{alerta.score}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Score</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modal, document.body) : null;
}
