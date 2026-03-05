'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { produtoService, categoriaService, unidadeService } from '@/modules/cadastros/services';
import type { Produto, CreateProdutoDTO, CategoriaProduto, UnidadeMedida } from '@/modules/cadastros/domain';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';

interface ProdutoFormProps {
  produto?: Produto | null;
  onClose: () => void;
  onSave: () => void;
}

export function ProdutoForm({ produto, onClose, onSave }: ProdutoFormProps) {
  const empresaId = useEmpresaId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auxiliary Data
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);

  const [formData, setFormData] = useState<CreateProdutoDTO>({
    codigo: '',
    codigo_barras: '',
    descricao: '',
    descricao_complementar: '',
    tipo: 'produto',
    categoria_id: '',
    unidade_id: '',
    marca: '',
    preco_custo: 0,
    preco_venda: 0,
    estoque_minimo: 0,
    estoque_maximo: 0,
    localizacao: '',
    ncm_id: '',
    origem: '0',
    imagem_url: ''
  });

  useEffect(() => {
    if (empresaId) {
      loadAuxiliaryData();
      if (!produto) {
        // Generate next code for new product
        produtoService.getProximoCodigo(empresaId).then(codigo => {
          setFormData(prev => ({ ...prev, codigo }));
        });
      }
    }
  }, [empresaId, produto]);

  useEffect(() => {
    if (produto) {
      setFormData({
        codigo: produto.codigo,
        codigo_barras: produto.codigo_barras || '',
        descricao: produto.descricao,
        descricao_complementar: produto.descricao_complementar || '',
        tipo: produto.tipo,
        categoria_id: produto.categoria_id || '',
        unidade_id: produto.unidade_id || '',
        marca: produto.marca || '',
        preco_custo: produto.preco_custo || 0,
        preco_venda: produto.preco_venda || 0,
        estoque_minimo: produto.estoque_minimo || 0,
        estoque_maximo: produto.estoque_maximo || 0,
        localizacao: produto.localizacao || '',
        ncm_id: produto.ncm_id || '',
        origem: produto.origem || '0',
        imagem_url: produto.imagem_url || ''
      });
    }
  }, [produto]);

  const loadAuxiliaryData = async () => {
    if (!empresaId) return;
    try {
      const [cats, units] = await Promise.all([
        categoriaService.list(empresaId),
        unidadeService.list()
      ]);
      setCategorias(cats);
      setUnidades(units);
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    setLoading(true);
    setError(null);

    try {
      if (produto) {
        const result = await produtoService.update(produto.id, formData);
        if (result.error) throw new Error(result.error);
      } else {
        const result = await produtoService.create(empresaId, formData);
        if (result.error) throw new Error(result.error);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateProdutoDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const inputClass = "w-full px-4 py-2 bg-[#252d3d] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors";
  const selectClass = "w-full px-4 py-2 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl select-zed";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identificação */}
        <div className="space-y-4 md:col-span-2">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Identificação</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className={labelClass}>Código *</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={e => handleChange('codigo', e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className={labelClass}>Código de Barras (EAN/GTIN)</label>
              <input
                type="text"
                value={formData.codigo_barras}
                onChange={e => handleChange('codigo_barras', e.target.value)}
                className={inputClass}
                placeholder="Ex: 789..."
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Descrição *</label>
            <input
              type="text"
              value={formData.descricao}
              onChange={e => handleChange('descricao', e.target.value)}
              className={inputClass}
              required
              placeholder="Nome do produto"
            />
          </div>
        </div>

        {/* Classificação */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Classificação</h3>
          <div>
            <label className={labelClass}>Categoria</label>
            <select
              value={formData.categoria_id}
              onChange={e => handleChange('categoria_id', e.target.value)}
              className={selectClass}
            >
              <option value="">Selecione...</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Unidade Medida</label>
            <select
              value={formData.unidade_id}
              onChange={e => handleChange('unidade_id', e.target.value)}
              className={selectClass}
            >
              <option value="">Selecione...</option>
              {unidades.map(un => (
                <option key={un.id} value={un.id}>{un.codigo} - {un.descricao}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              value={formData.tipo}
              onChange={e => handleChange('tipo', e.target.value as any)}
              className={selectClass}
            >
              <option value="produto">Produto Acabado</option>
              <option value="servico">Serviço</option>
              <option value="kit">Kit/Combo</option>
              <option value="materia_prima">Matéria Prima</option>
            </select>
          </div>
        </div>

        {/* Valores e Estoque */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Valores e Estoque</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Preço Custo</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.preco_custo}
                onChange={e => handleChange('preco_custo', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Preço Venda *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.preco_venda}
                onChange={e => handleChange('preco_venda', parseFloat(e.target.value) || 0)}
                className={inputClass}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Estoque Mín.</label>
              <input
                type="number"
                min="0"
                value={formData.estoque_minimo}
                onChange={e => handleChange('estoque_minimo', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Estoque Máx.</label>
              <input
                type="number"
                min="0"
                value={formData.estoque_maximo}
                onChange={e => handleChange('estoque_maximo', parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
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
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Produto
        </button>
      </div>
    </form>
  );
}
