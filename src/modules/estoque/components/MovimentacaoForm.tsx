'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, Search, X } from 'lucide-react';
import { produtoService as prodService } from '@/modules/cadastros/services';
import type { Produto } from '@/modules/cadastros/domain';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { cn } from '@/shared/lib/utils';

// We need to make sure we import from correct places or create missing exports.
// Assuming estoqueService handles movements.

interface MovimentacaoFormProps {
  tipo: 'entrada' | 'saida';
  onClose: () => void;
  onSave: () => void;
}

export function MovimentacaoForm({ tipo, onClose, onSave }: MovimentacaoFormProps) {
  const empresaId = useEmpresaId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search State
  const [search, setSearch] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [searching, setSearching] = useState(false);

  // Form State
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 2 && empresaId) {
        handleSearch();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, empresaId]);

  const handleSearch = async () => {
    if (!empresaId) return;
    setSearching(true);
    try {
      const result = await prodService.list(empresaId, { search, pageSize: 5 });
      setProdutos(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !selectedProduto) return;

    setLoading(true);
    setError(null);

    try {
      // Assuming prodService has stock update method or creating a movement record
      // Ideally we should have a MovimentacaoService that records the movement and triggers stock update triggers in DB
      // But based on produtoService analysis, we have updatingEstoque method

      const result = await prodService.atualizarEstoque(selectedProduto.id, quantidade, tipo);

      if (result.error) throw new Error(result.error);

      // Optionally record the movement log if not handled by trigger
      // But based on auditService usage in produtoService, it might not be enough for full stock history if we just update the field.
      // However, usually we should use a specific service for this.
      // Let's use the updatingEstoque from produtoService for now as it was verified.

      onSave();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar movimentação');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Produto Selection */}
      <div className="space-y-2">
        <label className={labelClass}>Produto *</label>

        {!selectedProduto ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Digite nome ou código..."
              className={cn(inputClass, "pl-10")}
              autoFocus
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              </div>
            )}

            {/* Results Dropdown */}
            {produtos.length > 0 && search.length >= 2 && !selectedProduto && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1f2e] border border-white/10 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                {produtos.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduto(p);
                      setSearch('');
                      setProdutos([]);
                    }}
                    className="w-full text-left p-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                  >
                    <p className="text-white font-medium">{p.descricao}</p>
                    <div className="flex justify-between mt-1 text-xs text-slate-400">
                      <span>Cód: {p.codigo}</span>
                      <span>Estoque: {p.estoque_atual}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div>
              <p className="text-purple-300 font-medium">{selectedProduto.descricao}</p>
              <p className="text-xs text-purple-300/70">Estoque Atual: {selectedProduto.estoque_atual}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProduto(null)}
              className="p-1.5 hover:bg-purple-500/20 rounded-lg text-purple-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tipo Movimentação</label>
          <div className={cn(
            "px-4 py-2.5 rounded-lg border font-medium text-center capitalize",
            tipo === 'entrada'
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            {tipo} Manual
          </div>
        </div>
        <div>
          <label className={labelClass}>Quantidade *</label>
          <input
            type="number"
            min="1"
            value={quantidade}
            onChange={e => setQuantidade(parseInt(e.target.value) || 0)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Observação</label>
        <textarea
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          className={cn(inputClass, "min-h-[100px] resize-none")}
          placeholder="Motivo da movimentação..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-lg bg-[#252d3d] border border-white/10 text-white hover:bg-[#2d3548] transition-colors"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !selectedProduto || quantidade <= 0}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Confirmar
        </button>
      </div>
    </form>
  );
}
