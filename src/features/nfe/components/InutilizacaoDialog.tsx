'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Ban, Loader2 } from 'lucide-react';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { fiscalService } from '@/modules/fiscal/services/fiscalService';

interface InutilizacaoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InutilizacaoDialog({ isOpen, onClose, onSuccess }: InutilizacaoDialogProps) {
  const empresaId = useEmpresaId();
  const [modelo, setModelo] = useState<'55' | '65'>('55');
  const [serie, setSerie] = useState('1');
  const [numInicial, setNumInicial] = useState('');
  const [numFinal, setNumFinal] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!empresaId) return;
    if (justificativa.length < 15) {
      setError('Justificativa deve ter no mínimo 15 caracteres');
      return;
    }
    const ni = parseInt(numInicial);
    const nf = parseInt(numFinal);
    if (isNaN(ni) || isNaN(nf) || nf < ni) {
      setError('Números inválidos');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await fiscalService.inutilizar(empresaId, {
        modelo, serie,
        numero_inicial: ni,
        numero_final: nf,
        justificativa,
      });
      if (result.error) { setError(result.error); }
      else { onSuccess(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao inutilizar');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const ic = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50';
  const sc = `${ic} appearance-none`;
  const lc = 'block text-xs font-medium text-gray-400 mb-1';

  const el = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0f1219] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <Ban className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Inutilizar Numeração</h2>
              <p className="text-xs text-gray-400">Inutilizar faixa de números</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>Modelo</label>
              <select value={modelo} onChange={e => setModelo(e.target.value as '55' | '65')} className={sc}>
                <option value="55">NF-e (55)</option>
                <option value="65">NFC-e (65)</option>
              </select>
            </div>
            <div>
              <label className={lc}>Série</label>
              <input value={serie} onChange={e => setSerie(e.target.value)} className={ic} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>Nº Inicial</label>
              <input type="number" value={numInicial} onChange={e => setNumInicial(e.target.value)} className={ic} placeholder="1" min="1" />
            </div>
            <div>
              <label className={lc}>Nº Final</label>
              <input type="number" value={numFinal} onChange={e => setNumFinal(e.target.value)} className={ic} placeholder="10" min="1" />
            </div>
          </div>
          <div>
            <label className={lc}>Justificativa (mín. 15 chars)</label>
            <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} className={`${ic} min-h-[80px] resize-y`} placeholder="Motivo da inutilização..." />
            <p className="text-xs text-gray-500 mt-1">{justificativa.length}/15</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-white/5 bg-white/[0.02]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={submitting || justificativa.length < 15 || !numInicial || !numFinal} className="flex items-center gap-2 px-5 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            {submitting ? 'Processando...' : 'Inutilizar'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(el, document.body) : null;
}
