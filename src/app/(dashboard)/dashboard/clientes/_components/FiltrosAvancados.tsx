'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Filter, Search, X, Save, Trash2, RotateCcw, Download,
  ChevronDown, Star, Clock, MapPin, UserCheck, Bookmark,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { clienteService } from '@/modules/cadastros/services/clienteService';
import type { Cliente } from '@/modules/cadastros/domain';
import {
  FormButton, FormInput, FormSelect, EmptyState, LoadingState,
  StatusBadge, TipoPessoaBadge, UF_OPTIONS, formatCPFCNPJ,
  formatPhone, formatDate, exportToCSV, cleanDigits,
} from './shared';

// =====================================================
// Types
// =====================================================

interface FilterCriteria {
  status: 'all' | 'active' | 'inactive';
  tipo_pessoa: 'all' | 'F' | 'J';
  uf: string;
  cidade: string;
  com_email: 'all' | 'sim' | 'nao';
  com_telefone: 'all' | 'sim' | 'nao';
  com_cpf_cnpj: 'all' | 'sim' | 'nao';
  com_endereco: 'all' | 'sim' | 'nao';
  data_cadastro_de: string;
  data_cadastro_ate: string;
  busca: string;
}

interface SavedFilter {
  id: string;
  name: string;
  criteria: FilterCriteria;
  created_at: string;
}

const defaultCriteria: FilterCriteria = {
  status: 'all',
  tipo_pessoa: 'all',
  uf: '',
  cidade: '',
  com_email: 'all',
  com_telefone: 'all',
  com_cpf_cnpj: 'all',
  com_endereco: 'all',
  data_cadastro_de: '',
  data_cadastro_ate: '',
  busca: '',
};

interface FiltrosAvancadosProps {
  empresaId: string | null;
  onViewCliente: (cliente: Cliente) => void;
  onEditCliente: (cliente: Cliente) => void;
}

// =====================================================
// Component
// =====================================================

export const FiltrosAvancados: React.FC<FiltrosAvancadosProps> = ({
  empresaId, onViewCliente, onEditCliente,
}) => {
  const [criteria, setCriteria] = useState<FilterCriteria>({ ...defaultCriteria });
  const [allClientes, setAllClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clientes_saved_filters');
      if (saved) setSavedFilters(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage
  const persistFilters = (filters: SavedFilter[]) => {
    setSavedFilters(filters);
    localStorage.setItem('clientes_saved_filters', JSON.stringify(filters));
  };

  // Load all clients for filtering
  const loadClientes = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await clienteService.list(empresaId, { pageSize: 1000 });
      setAllClientes(result.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  // Apply filters
  const applyFilters = useCallback(() => {
    let result = [...allClientes];

    // Status
    if (criteria.status === 'active') result = result.filter(c => c.ativo);
    if (criteria.status === 'inactive') result = result.filter(c => !c.ativo);

    // Tipo Pessoa
    if (criteria.tipo_pessoa !== 'all') {
      result = result.filter(c => c.tipo_pessoa === criteria.tipo_pessoa);
    }

    // UF
    if (criteria.uf) {
      result = result.filter(c => c.uf === criteria.uf);
    }

    // Cidade
    if (criteria.cidade) {
      result = result.filter(c =>
        c.cidade?.toLowerCase().includes(criteria.cidade.toLowerCase())
      );
    }

    // Com Email
    if (criteria.com_email === 'sim') result = result.filter(c => c.email);
    if (criteria.com_email === 'nao') result = result.filter(c => !c.email);

    // Com Telefone
    if (criteria.com_telefone === 'sim') result = result.filter(c => c.telefone || c.celular);
    if (criteria.com_telefone === 'nao') result = result.filter(c => !c.telefone && !c.celular);

    // Com CPF/CNPJ
    if (criteria.com_cpf_cnpj === 'sim') result = result.filter(c => c.cpf_cnpj);
    if (criteria.com_cpf_cnpj === 'nao') result = result.filter(c => !c.cpf_cnpj);

    // Com Endereço
    if (criteria.com_endereco === 'sim') result = result.filter(c => c.cep && c.cidade);
    if (criteria.com_endereco === 'nao') result = result.filter(c => !c.cep || !c.cidade);

    // Data Cadastro
    if (criteria.data_cadastro_de) {
      const from = new Date(criteria.data_cadastro_de);
      result = result.filter(c => new Date(c.created_at) >= from);
    }
    if (criteria.data_cadastro_ate) {
      const to = new Date(criteria.data_cadastro_ate);
      to.setHours(23, 59, 59);
      result = result.filter(c => new Date(c.created_at) <= to);
    }

    // Busca geral
    if (criteria.busca) {
      const term = criteria.busca.toLowerCase();
      result = result.filter(c =>
        c.nome.toLowerCase().includes(term) ||
        c.cpf_cnpj?.includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.codigo.includes(term) ||
        c.cidade?.toLowerCase().includes(term)
      );
    }

    setFilteredClientes(result);
    setHasSearched(true);
  }, [allClientes, criteria]);

  const handleReset = () => {
    setCriteria({ ...defaultCriteria });
    setFilteredClientes([]);
    setHasSearched(false);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name: filterName.trim(),
      criteria: { ...criteria },
      created_at: new Date().toISOString(),
    };
    persistFilters([newFilter, ...savedFilters]);
    setFilterName('');
    setShowSaveForm(false);
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    setCriteria({ ...filter.criteria });
  };

  const handleDeleteFilter = (id: string) => {
    persistFilters(savedFilters.filter(f => f.id !== id));
  };

  const handleExport = () => {
    const data = filteredClientes.map(c => ({
      Código: c.codigo,
      Nome: c.nome,
      Tipo: c.tipo_pessoa === 'J' ? 'PJ' : 'PF',
      'CPF/CNPJ': c.cpf_cnpj || '',
      Email: c.email || '',
      Telefone: c.telefone || '',
      Celular: c.celular || '',
      Cidade: c.cidade || '',
      UF: c.uf || '',
      Status: c.ativo ? 'Ativo' : 'Inativo',
      'Criado em': formatDate(c.created_at),
    }));
    exportToCSV(data, 'clientes_filtrados');
  };

  const activeFiltersCount = Object.entries(criteria).filter(([key, value]) => {
    if (key === 'busca') return !!value;
    if (typeof value === 'string') return value !== '' && value !== 'all';
    return false;
  }).length;

  const yesNoOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'sim', label: 'Sim' },
    { value: 'nao', label: 'Não' },
  ];

  if (!empresaId) return <EmptyState message="Selecione uma empresa" />;
  if (loading) return <LoadingState />;

  return (
    <div className="space-y-5">
      {/* ── Saved Filters ── */}
      {savedFilters.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Bookmark className="w-3.5 h-3.5 inline mr-1" />
            Filtros Salvos
          </p>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map((filter) => (
              <div key={filter.id} className="flex items-center gap-1 group">
                <button
                  onClick={() => handleLoadFilter(filter)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 hover:bg-blue-500/20 transition-colors"
                >
                  <Star className="w-3 h-3" />
                  {filter.name}
                </button>
                <button
                  onClick={() => handleDeleteFilter(filter.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Toggle Filters ── */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <Filter className="w-3.5 h-3.5" />
        {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        {activeFiltersCount > 0 && (
          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-[10px] font-bold">
            {activeFiltersCount}
          </span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showFilters && 'rotate-180')} />
      </button>

      {/* ── Filter Criteria ── */}
      {showFilters && (
        <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Busca geral: nome, CPF/CNPJ, email, código, cidade..."
              value={criteria.busca}
              onChange={(e) => setCriteria(prev => ({ ...prev, busca: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* Grid Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <FormSelect
              label="Status"
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'active', label: 'Ativos' },
                { value: 'inactive', label: 'Inativos' },
              ]}
              value={criteria.status}
              onChange={(val) => setCriteria(prev => ({ ...prev, status: val as FilterCriteria['status'] }))}
            />
            <FormSelect
              label="Tipo Pessoa"
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'F', label: 'Pessoa Física' },
                { value: 'J', label: 'Pessoa Jurídica' },
              ]}
              value={criteria.tipo_pessoa}
              onChange={(val) => setCriteria(prev => ({ ...prev, tipo_pessoa: val as FilterCriteria['tipo_pessoa'] }))}
            />
            <FormSelect
              label="UF"
              options={[{ value: '', label: 'Todos' }, ...UF_OPTIONS.filter(u => u.value)]}
              value={criteria.uf}
              onChange={(val) => setCriteria(prev => ({ ...prev, uf: val }))}
            />
            <FormInput
              label="Cidade"
              placeholder="Filtrar por cidade"
              value={criteria.cidade}
              onChange={(val) => setCriteria(prev => ({ ...prev, cidade: val }))}
            />
            <FormSelect
              label="Com Email"
              options={yesNoOptions}
              value={criteria.com_email}
              onChange={(val) => setCriteria(prev => ({ ...prev, com_email: val as FilterCriteria['com_email'] }))}
            />
            <FormSelect
              label="Com Telefone"
              options={yesNoOptions}
              value={criteria.com_telefone}
              onChange={(val) => setCriteria(prev => ({ ...prev, com_telefone: val as FilterCriteria['com_telefone'] }))}
            />
            <FormSelect
              label="Com CPF/CNPJ"
              options={yesNoOptions}
              value={criteria.com_cpf_cnpj}
              onChange={(val) => setCriteria(prev => ({ ...prev, com_cpf_cnpj: val as FilterCriteria['com_cpf_cnpj'] }))}
            />
            <FormSelect
              label="Com Endereço"
              options={yesNoOptions}
              value={criteria.com_endereco}
              onChange={(val) => setCriteria(prev => ({ ...prev, com_endereco: val as FilterCriteria['com_endereco'] }))}
            />
            <FormInput
              label="Cadastro De"
              type="date"
              value={criteria.data_cadastro_de}
              onChange={(val) => setCriteria(prev => ({ ...prev, data_cadastro_de: val }))}
            />
            <FormInput
              label="Cadastro Até"
              type="date"
              value={criteria.data_cadastro_ate}
              onChange={(val) => setCriteria(prev => ({ ...prev, data_cadastro_ate: val }))}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex gap-2">
              <FormButton variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" /> Limpar
              </FormButton>
              {hasSearched && (
                <FormButton variant="ghost" size="sm" onClick={() => setShowSaveForm(!showSaveForm)}>
                  <Save className="w-3.5 h-3.5" /> Salvar Filtro
                </FormButton>
              )}
            </div>
            <FormButton onClick={applyFilters}>
              <Search className="w-4 h-4" /> Aplicar Filtros
            </FormButton>
          </div>

          {/* Save Form */}
          {showSaveForm && (
            <div className="flex gap-2 pt-3 border-t border-white/5">
              <FormInput
                label=""
                placeholder="Nome do filtro..."
                value={filterName}
                onChange={setFilterName}
                className="flex-1"
              />
              <FormButton size="sm" onClick={handleSaveFilter} disabled={!filterName.trim()} className="self-end">
                <Save className="w-3.5 h-3.5" /> Salvar
              </FormButton>
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              <span className="font-bold text-white">{filteredClientes.length}</span> resultado(s) encontrado(s)
              <span className="text-slate-600"> de {allClientes.length} total</span>
            </p>
            {filteredClientes.length > 0 && (
              <FormButton variant="secondary" size="sm" onClick={handleExport}>
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </FormButton>
            )}
          </div>

          {filteredClientes.length === 0 ? (
            <EmptyState
              message="Nenhum cliente encontrado"
              description="Tente ajustar os critérios de busca."
              action={{ label: 'Limpar Filtros', onClick: handleReset }}
            />
          ) : (
            <div className="space-y-1.5">
              {filteredClientes.slice(0, 50).map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex items-center gap-4 p-3 bg-[#0d1117]/40 border border-white/[0.03] rounded-xl hover:border-white/10 transition-all cursor-pointer"
                  onClick={() => onViewCliente(cliente)}
                >
                  <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-slate-400">{cliente.nome.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{cliente.nome}</span>
                      <TipoPessoaBadge tipo={cliente.tipo_pessoa as 'F' | 'J'} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {cliente.cpf_cnpj && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatCPFCNPJ(cliente.cpf_cnpj, cliente.tipo_pessoa as 'F' | 'J')}
                        </span>
                      )}
                      {cliente.cidade && (
                        <span className="text-[10px] text-slate-500">
                          {cliente.cidade}/{cliente.uf}
                        </span>
                      )}
                      {cliente.email && (
                        <span className="text-[10px] text-slate-600 truncate max-w-[150px]">
                          {cliente.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge active={cliente.ativo} />
                </div>
              ))}
              {filteredClientes.length > 50 && (
                <p className="text-xs text-slate-500 text-center py-3">
                  Mostrando 50 de {filteredClientes.length} resultados. Exporte para ver todos.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FiltrosAvancados;
