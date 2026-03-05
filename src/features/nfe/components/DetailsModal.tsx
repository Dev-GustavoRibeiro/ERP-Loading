'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, User, Package, Truck, DollarSign,
  Send, XCircle, FileEdit, Download, Loader2, AlertTriangle
} from 'lucide-react';
import { fiscalService } from '@/modules/fiscal/services/fiscalService';
import { createSefazProvider } from '@/modules/fiscal/integrations/sefaz';
import { NF_STATUS_CONFIG } from '@/features/nfe/schemas';
import type { NfStatus } from '@/features/nfe/schemas';
import type { NotaFiscal } from '@/modules/fiscal/domain';

interface DetailsModalProps {
  isOpen: boolean;
  notaId: string;
  onClose: () => void;
  onCartaCorrecao: () => void;
  onRefresh: () => void;
}

export function DetailsModal({ isOpen, notaId, onClose, onCartaCorrecao, onRefresh }: DetailsModalProps) {
  const [nota, setNota] = useState<NotaFiscal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelJustification, setCancelJustification] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  const fetchNota = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fiscalService.getNotaById(notaId);
      setNota(result as unknown as NotaFiscal);
    } catch (err) {
      console.error('[DetailsModal] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [notaId]);

  useEffect(() => { fetchNota(); }, [fetchNota]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('pt-BR'); } catch { return d; }
  };

  const handleEmitir = async () => {
    if (!nota) return;
    setActionLoading('emitir');
    setError(null);
    try {
      const { provider, config } = await createSefazProvider(nota.empresa_id);
      const result = await provider.authorize(nota.id, config);

      if (result.success) {
        // Update note in DB
        await fiscalService.enviarNota(nota.id);
        await fetchNota();
        onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao emitir NF-e');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelar = async () => {
    if (!nota || cancelJustification.length < 15) return;
    setActionLoading('cancelar');
    setError(null);
    try {
      const result = await fiscalService.cancelarNota(nota.id, cancelJustification);
      if (result.error) {
        setError(result.error);
      } else {
        setShowCancelForm(false);
        setCancelJustification('');
        await fetchNota();
        onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar NF-e');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  const nfAny = (nota || {}) as unknown as Record<string, unknown>;
  const tipo = (nfAny.tipo as string) || '';
  const destinatario = nfAny.destinatario as { nome?: string; cpf_cnpj?: string } | undefined;
  const itens = (nfAny.itens || []) as Array<Record<string, unknown>>;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0f1219] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {loading ? 'Carregando...' : `NF-e ${nota?.numero || ''} / ${nota?.serie || ''}`}
              </h2>
              {nota && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">
                    {tipo === 'nfe' ? 'NF-e' : tipo === 'nfce' ? 'NFC-e' : tipo.toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${NF_STATUS_CONFIG[nota.status as NfStatus]?.color || 'text-gray-400'}`}>
                    {NF_STATUS_CONFIG[nota.status as NfStatus]?.label || nota.status}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : nota ? (
            <>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Identificação */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Identificação
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <InfoCard label="Número" value={`${nota.numero} / ${nota.serie}`} />
                  <InfoCard label="Chave de Acesso" value={nota.chave_acesso || '—'} />
                  <InfoCard label="Data Emissão" value={formatDate(nota.data_emissao)} />
                  <InfoCard label="Natureza" value={nota.natureza_operacao || '—'} />
                  <InfoCard label="Protocolo" value={nota.protocolo_autorizacao || '—'} />
                  <InfoCard label="Dt. Autorização" value={nota.data_autorizacao ? formatDate(nota.data_autorizacao) : '—'} />
                </div>
              </section>

              {/* Destinatário */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Destinatário
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Nome" value={destinatario?.nome || '—'} />
                  <InfoCard label="CPF/CNPJ" value={destinatario?.cpf_cnpj || '—'} />
                </div>
              </section>

              {/* Itens */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" /> Itens ({itens.length})
                </h3>
                {itens.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left px-3 py-2 text-gray-400">#</th>
                          <th className="text-left px-3 py-2 text-gray-400">Descrição</th>
                          <th className="text-right px-3 py-2 text-gray-400">Qtd</th>
                          <th className="text-right px-3 py-2 text-gray-400">Vlr Unit.</th>
                          <th className="text-right px-3 py-2 text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((item, idx) => (
                          <tr key={idx} className="border-b border-white/5">
                            <td className="px-3 py-2 text-gray-500">{(item.numero_item as number) || idx + 1}</td>
                            <td className="px-3 py-2 text-white">{(item.descricao as string) || '—'}</td>
                            <td className="px-3 py-2 text-right text-gray-300">{(item.quantidade as number) || 0}</td>
                            <td className="px-3 py-2 text-right text-gray-300">{formatCurrency((item.valor_unitario as number) || 0)}</td>
                            <td className="px-3 py-2 text-right text-white font-medium">{formatCurrency((item.valor_total as number) || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum item registrado</p>
                )}
              </section>

              {/* Totais */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" /> Totais
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <InfoCard label="Produtos" value={formatCurrency(nota.valor_produtos)} />
                  <InfoCard label="ICMS" value={formatCurrency(nota.valor_icms)} />
                  <InfoCard label="IPI" value={formatCurrency(nota.valor_ipi)} />
                  <InfoCard label="PIS" value={formatCurrency(nota.valor_pis)} />
                  <InfoCard label="COFINS" value={formatCurrency(nota.valor_cofins)} />
                  <InfoCard label="Desconto" value={formatCurrency(nota.valor_desconto)} highlight />
                </div>
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-emerald-300 font-medium">Valor Total</span>
                  <span className="text-xl font-bold text-emerald-400">{formatCurrency(nota.valor_total)}</span>
                </div>
              </section>

              {/* Cancel Form */}
              {showCancelForm && (
                <section className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <h3 className="text-sm font-semibold text-red-400 mb-3">Cancelar NF-e</h3>
                  <textarea
                    value={cancelJustification}
                    onChange={e => setCancelJustification(e.target.value)}
                    placeholder="Justificativa do cancelamento (mínimo 15 caracteres)..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 min-h-[80px] resize-y"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500">{cancelJustification.length}/15 caracteres mínimos</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowCancelForm(false); setCancelJustification(''); }}
                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={handleCancelar}
                        disabled={cancelJustification.length < 15 || actionLoading === 'cancelar'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === 'cancelar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        Confirmar Cancelamento
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">Nota fiscal não encontrada</div>
          )}
        </div>

        {/* Footer Actions */}
        {nota && !loading && (
          <div className="flex items-center justify-end gap-2 p-5 border-t border-white/5 bg-white/[0.02]">
            {nota.status === 'digitacao' && (
              <button
                onClick={handleEmitir}
                disabled={actionLoading === 'emitir'}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'emitir' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Emitir NF-e
              </button>
            )}
            {nota.status === 'autorizada' && !showCancelForm && (
              <>
                <button
                  onClick={onCartaCorrecao}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-medium rounded-lg transition-colors"
                >
                  <FileEdit className="w-4 h-4" /> Carta de Correção
                </button>
                <button
                  onClick={() => setShowCancelForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Cancelar
                </button>
              </>
            )}
            {nota.xml_envio && (
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-lg transition-colors">
                <Download className="w-4 h-4" /> XML
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modal, document.body) : null;
}

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-2.5 bg-white/[0.02] rounded-lg border border-white/5">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-medium truncate ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
