'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, User, Package, Truck, CheckSquare,
  ChevronRight, ChevronLeft, Plus, Trash2, Search, Loader2
} from 'lucide-react';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { fiscalService } from '@/modules/fiscal/services/fiscalService';
import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';

interface CreateNfeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = [
  { key: 'dados', label: 'Dados Gerais', icon: FileText },
  { key: 'destinatario', label: 'Destinatário', icon: User },
  { key: 'itens', label: 'Itens', icon: Package },
  { key: 'transporte', label: 'Transporte', icon: Truck },
  { key: 'revisao', label: 'Revisão', icon: CheckSquare },
] as const;

interface ItemRow {
  produto_id?: string;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  cst_icms: string;
  aliquota_icms: number;
  aliquota_ipi: number;
}

const emptyItem: ItemRow = {
  codigo: '', descricao: '', ncm: '', cfop: '5102',
  unidade: 'UN', quantidade: 1, valor_unitario: 0,
  cst_icms: '00', aliquota_icms: 0, aliquota_ipi: 0,
};

export function CreateNfeDialog({ isOpen, onClose, onSuccess }: CreateNfeDialogProps) {
  const empresaId = useEmpresaId();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Dados Gerais
  const [modelo, setModelo] = useState<'55' | '65'>('55');
  const [serie, setSerie] = useState('1');
  const [naturezaOp, setNaturezaOp] = useState('Venda de Mercadoria');
  const [tipoOp, setTipoOp] = useState<'entrada' | 'saida'>('saida');
  const [finalidade, setFinalidade] = useState<'normal' | 'complementar' | 'ajuste' | 'devolucao'>('normal');
  const [infoComplementares, setInfoComplementares] = useState('');

  // Step 2: Destinatário
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string; cpf_cnpj?: string }>>([]);
  const [clienteLabel, setClienteLabel] = useState('');
  const [searchingClientes, setSearchingClientes] = useState(false);

  // Step 3: Itens
  const [itens, setItens] = useState<ItemRow[]>([{ ...emptyItem }]);

  // Step 4: Transporte
  const [transportadoraId, setTransportadoraId] = useState('');

  // Search clients
  const searchClientes = useCallback(async (term: string) => {
    if (!empresaId || term.length < 2) { setClientes([]); return; }
    setSearchingClientes(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, cpf_cnpj')
        .eq('empresa_id', empresaId)
        .ilike('nome', `%${term}%`)
        .limit(10);
      setClientes(data || []);
    } catch {
      setClientes([]);
    } finally {
      setSearchingClientes(false);
    }
  }, [empresaId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (clienteSearch.length >= 2) searchClientes(clienteSearch);
    }, 300);
    return () => clearTimeout(timeout);
  }, [clienteSearch, searchClientes]);

  // Item helpers
  const addItem = () => setItens(prev => [...prev, { ...emptyItem }]);
  const removeItem = (idx: number) => setItens(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ItemRow, value: string | number) => {
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const totalProdutos = itens.reduce((sum, i) => sum + (i.quantidade * i.valor_unitario), 0);

  // Submit
  const handleSubmit = async () => {
    if (!empresaId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await fiscalService.createNota(empresaId, {
        modelo,
        serie,
        natureza_operacao: naturezaOp,
        tipo_operacao: tipoOp === 'saida' ? '1' : '0',
        finalidade: finalidade === 'normal' ? '1' : finalidade === 'complementar' ? '2' : finalidade === 'ajuste' ? '3' : '4',
        destinatario_id: clienteId || undefined,
        transportadora_id: transportadoraId || undefined,
        informacoes_adicionais_contribuinte: infoComplementares || undefined,
        itens: itens.filter(i => i.descricao).map(i => ({
          codigo: i.codigo,
          descricao: i.descricao,
          ncm: i.ncm || undefined,
          cfop: i.cfop,
          unidade: i.unidade,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
          cst_icms: i.cst_icms || undefined,
          aliquota_icms: i.aliquota_icms || undefined,
          aliquota_ipi: i.aliquota_ipi || undefined,
        })),
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar nota fiscal');
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = () => {
    if (step === 0) return naturezaOp.length > 0;
    if (step === 2) return itens.some(i => i.descricao && i.valor_unitario > 0);
    return true;
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (!isOpen) return null;

  const inputClasses = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50';
  const labelClasses = 'block text-xs font-medium text-gray-400 mb-1';
  const selectClasses = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none';

  const modal = (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0f1219] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white">Emitir Nota Fiscal</h2>
            <p className="text-xs text-gray-400 mt-0.5">Passo {step + 1} de {STEPS.length} — {STEPS[step].label}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-5 py-3 bg-white/[0.02] border-b border-white/5 overflow-x-auto">
          {STEPS.map((s, idx) => {
            const StepIcon = s.icon;
            const isActive = idx === step;
            const isDone = idx < step;
            return (
              <button
                key={s.key}
                onClick={() => idx <= step && setStep(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${isActive ? 'bg-emerald-500/20 text-emerald-400' :
                    isDone ? 'text-emerald-400/60 hover:bg-white/5' :
                      'text-gray-500'
                  }`}
              >
                <StepIcon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Step 0: Dados Gerais */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Modelo *</label>
                  <select value={modelo} onChange={e => setModelo(e.target.value as '55' | '65')} className={selectClasses}>
                    <option value="55">NF-e (Modelo 55)</option>
                    <option value="65">NFC-e (Modelo 65)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Série</label>
                  <input value={serie} onChange={e => setSerie(e.target.value)} className={inputClasses} />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Natureza da Operação *</label>
                <input value={naturezaOp} onChange={e => setNaturezaOp(e.target.value)} className={inputClasses} placeholder="Ex: Venda de Mercadoria" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Tipo de Operação *</label>
                  <select value={tipoOp} onChange={e => setTipoOp(e.target.value as 'entrada' | 'saida')} className={selectClasses}>
                    <option value="saida">Saída</option>
                    <option value="entrada">Entrada</option>
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Finalidade</label>
                  <select value={finalidade} onChange={e => setFinalidade(e.target.value as typeof finalidade)} className={selectClasses}>
                    <option value="normal">Normal</option>
                    <option value="complementar">Complementar</option>
                    <option value="ajuste">Ajuste</option>
                    <option value="devolucao">Devolução</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClasses}>Informações Complementares</label>
                <textarea
                  value={infoComplementares}
                  onChange={e => setInfoComplementares(e.target.value)}
                  className={`${inputClasses} min-h-[80px] resize-y`}
                  placeholder="Informações adicionais para o contribuinte"
                />
              </div>
            </div>
          )}

          {/* Step 1: Destinatário */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={labelClasses}>Buscar Cliente / Destinatário</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    value={clienteSearch}
                    onChange={e => setClienteSearch(e.target.value)}
                    className={`${inputClasses} pl-9`}
                    placeholder="Digite o nome do cliente..."
                  />
                  {searchingClientes && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />}
                </div>
              </div>
              {clientes.length > 0 && !clienteId && (
                <div className="bg-white/5 rounded-lg border border-white/10 max-h-48 overflow-y-auto">
                  {clientes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setClienteId(c.id); setClienteLabel(c.nome); setClientes([]); setClienteSearch(''); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <span className="text-sm text-white">{c.nome}</span>
                      {c.cpf_cnpj && <span className="text-xs text-gray-500 ml-2">{c.cpf_cnpj}</span>}
                    </button>
                  ))}
                </div>
              )}
              {clienteId && (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <User className="w-5 h-5 text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{clienteLabel}</p>
                    <p className="text-xs text-gray-400">Selecionado como destinatário</p>
                  </div>
                  <button onClick={() => { setClienteId(''); setClienteLabel(''); }} className="text-gray-400 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {modelo === '65' && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  💡 O destinatário é opcional para NFC-e (Modelo 65).
                </p>
              )}
            </div>
          )}

          {/* Step 2: Itens */}
          {step === 2 && (
            <div className="space-y-4">
              {itens.map((item, idx) => (
                <div key={idx} className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Item {idx + 1}</span>
                    {itens.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className={labelClasses}>Descrição *</label>
                      <input value={item.descricao} onChange={e => updateItem(idx, 'descricao', e.target.value)} className={inputClasses} placeholder="Descrição do item" />
                    </div>
                    <div>
                      <label className={labelClasses}>NCM</label>
                      <input value={item.ncm} onChange={e => updateItem(idx, 'ncm', e.target.value)} className={inputClasses} placeholder="00000000" />
                    </div>
                    <div>
                      <label className={labelClasses}>CFOP *</label>
                      <input value={item.cfop} onChange={e => updateItem(idx, 'cfop', e.target.value)} className={inputClasses} placeholder="5102" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className={labelClasses}>Unidade</label>
                      <input value={item.unidade} onChange={e => updateItem(idx, 'unidade', e.target.value)} className={inputClasses} placeholder="UN" />
                    </div>
                    <div>
                      <label className={labelClasses}>Quantidade *</label>
                      <input type="number" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', parseFloat(e.target.value) || 0)} className={inputClasses} min="0.01" step="0.01" />
                    </div>
                    <div>
                      <label className={labelClasses}>Valor Unitário *</label>
                      <input type="number" value={item.valor_unitario} onChange={e => updateItem(idx, 'valor_unitario', parseFloat(e.target.value) || 0)} className={inputClasses} min="0.01" step="0.01" />
                    </div>
                    <div>
                      <label className={labelClasses}>Total</label>
                      <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-emerald-400 font-medium">
                        {formatCurrency(item.quantidade * item.valor_unitario)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelClasses}>CST ICMS</label>
                      <input value={item.cst_icms} onChange={e => updateItem(idx, 'cst_icms', e.target.value)} className={inputClasses} placeholder="00" />
                    </div>
                    <div>
                      <label className={labelClasses}>Alíq. ICMS (%)</label>
                      <input type="number" value={item.aliquota_icms} onChange={e => updateItem(idx, 'aliquota_icms', parseFloat(e.target.value) || 0)} className={inputClasses} min="0" max="100" step="0.01" />
                    </div>
                    <div>
                      <label className={labelClasses}>Alíq. IPI (%)</label>
                      <input type="number" value={item.aliquota_ipi} onChange={e => updateItem(idx, 'aliquota_ipi', parseFloat(e.target.value) || 0)} className={inputClasses} min="0" max="100" step="0.01" />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addItem}
                className="w-full py-2.5 border-2 border-dashed border-white/10 rounded-xl text-sm text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar Item
              </button>
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total dos Produtos</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalProdutos)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Transporte */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className={labelClasses}>ID da Transportadora (opcional)</label>
                <input value={transportadoraId} onChange={e => setTransportadoraId(e.target.value)} className={inputClasses} placeholder="UUID da transportadora" />
              </div>
              <p className="text-xs text-gray-500">
                💡 Deixe em branco para &quot;Sem frete&quot;.
              </p>
            </div>
          )}

          {/* Step 4: Revisão */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white mb-3">Resumo da Nota Fiscal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <p className="text-xs text-gray-400 mb-1">Modelo</p>
                  <p className="text-sm text-white font-medium">{modelo === '55' ? 'NF-e (55)' : 'NFC-e (65)'}</p>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <p className="text-xs text-gray-400 mb-1">Natureza</p>
                  <p className="text-sm text-white font-medium">{naturezaOp}</p>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <p className="text-xs text-gray-400 mb-1">Destinatário</p>
                  <p className="text-sm text-white font-medium">{clienteLabel || '—'}</p>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <p className="text-xs text-gray-400 mb-1">Qtd. Itens</p>
                  <p className="text-sm text-white font-medium">{itens.filter(i => i.descricao).length}</p>
                </div>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                <span className="text-sm text-emerald-300">Valor Total dos Produtos</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(totalProdutos)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-white/5 bg-white/[0.02]">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canNext()}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              {submitting ? 'Salvando...' : 'Emitir NF-e'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modal, document.body) : null;
}
