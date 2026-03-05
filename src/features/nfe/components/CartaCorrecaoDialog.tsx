'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, FileEdit, Loader2 } from 'lucide-react';
import { fiscalService } from '@/modules/fiscal/services/fiscalService';
import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';

interface CartaCorrecaoDialogProps {
  isOpen: boolean;
  notaFiscalId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface CartaCorrecaoRow {
  id: string;
  sequencia: number;
  correcao: string;
  status: string;
  created_at: string;
}

export function CartaCorrecaoDialog({ isOpen, notaFiscalId, onClose, onSuccess }: CartaCorrecaoDialogProps) {
  const [correcao, setCorrecao] = useState('');
  const [historico, setHistorico] = useState<CartaCorrecaoRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistorico = useCallback(async () => {
    setLoadingHist(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('nfe_cartas_correcao')
        .select('id, sequencia, correcao, status, created_at')
        .eq('nota_fiscal_id', notaFiscalId)
        .order('sequencia', { ascending: false });
      setHistorico(data || []);
    } catch {
      setHistorico([]);
    } finally {
      setLoadingHist(false);
    }
  }, [notaFiscalId]);

  useEffect(() => { fetchHistorico(); }, [fetchHistorico]);

  const handleSubmit = async () => {
    if (correcao.length < 15) {
      setError('Correção deve ter no mínimo 15 caracteres');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await fiscalService.cartaCorrecao(notaFiscalId, correcao);
      if (result.error) { setError(result.error); }
      else { onSuccess(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar CC-e');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const ic = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50';

  const el = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0f1219] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Carta de Correção</h2>
              <p className="text-xs text-gray-400">CC-e vinculada à NF-e</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{error}</div>
          )}

          {/* Historical CC-e */}
          {historico.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Histórico de CC-e</h3>
              <div className="space-y-2">
                {historico.map(cc => (
                  <div key={cc.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-400 font-medium">Seq. {cc.sequencia}</span>
                      <span className="text-xs text-gray-500">{new Date(cc.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-sm text-gray-300">{cc.correcao}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loadingHist && <p className="text-xs text-gray-500">Carregando histórico...</p>}

          {/* New CC-e */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nova Correção</h3>
            <textarea
              value={correcao}
              onChange={e => setCorrecao(e.target.value)}
              className={`${ic} min-h-[100px] resize-y`}
              placeholder="Descreva a correção (mínimo 15 caracteres)..."
            />
            <p className="text-xs text-gray-500 mt-1">{correcao.length}/15 caracteres mínimos</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-white/5 bg-white/[0.02]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={submitting || correcao.length < 15} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileEdit className="w-4 h-4" />}
            {submitting ? 'Enviando...' : 'Registrar CC-e'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(el, document.body) : null;
}
