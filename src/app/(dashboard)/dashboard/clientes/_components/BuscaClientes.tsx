'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Download,
  Phone, Mail, MessageCircle, ArrowUpDown, ArrowUp, ArrowDown,
  CheckSquare, Square, Filter, X, RotateCcw, ChevronDown,
  ToggleLeft, ToggleRight, Save, Star, Bookmark,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { clienteService } from '@/modules/cadastros/services/clienteService';
import type { Cliente } from '@/modules/cadastros/domain';
import {
  FormButton, FormInput, FormSelect, StatusBadge, TipoPessoaBadge,
  LoadingState, EmptyState, UF_OPTIONS,
  formatCPFCNPJ, formatPhone, formatDate, exportToCSV, useDebounce, cleanDigits,
  isTableNotFoundError, TableNotConfigured,
} from './shared';

// =====================================================
// Types
// =====================================================

type SortField = 'codigo' | 'nome' | 'cpf_cnpj' | 'cidade' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface SavedFilter {
  id: string;
  name: string;
  criteria: FilterCriteria;
}

interface FilterCriteria {
  status: 'all' | 'active' | 'inactive';
  tipo_pessoa: 'all' | 'F' | 'J';
  uf: string;
  cidade: string;
  com_email: 'all' | 'sim' | 'nao';
  com_telefone: 'all' | 'sim' | 'nao';
  data_de: string;
  data_ate: string;
}

const defaultFilters: FilterCriteria = {
  status: 'all', tipo_pessoa: 'all', uf: '', cidade: '',
  com_email: 'all', com_telefone: 'all', data_de: '', data_ate: '',
};

interface BuscaClientesProps {
  empresaId: string | null;
  onEdit: (cliente: Cliente) => void;
  onView: (cliente: Cliente) => void;
  onRefresh: () => void;
}

// =====================================================
// Component
// =====================================================

export const BuscaClientes: React.FC<BuscaClientesProps> = ({
  empresaId, onEdit, onView, onRefresh,
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(15);
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>({ ...defaultFilters });
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [filterName, setFilterName] = useState('');

  const debouncedSearch = useDebounce(search, 400);

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clientes_saved_filters');
      if (saved) setSavedFilters(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Load clients
  const loadClientes = useCallback(async () => {
    if (!empresaId) { setLoading(false); return; }
    setLoading(true);
    try {
      const serviceFilters: Record<string, unknown> = {};
      if (filters.status === 'active') serviceFilters.ativo = true;
      if (filters.status === 'inactive') serviceFilters.ativo = false;
      if (filters.tipo_pessoa !== 'all') serviceFilters.tipo_pessoa = filters.tipo_pessoa;

      const result = await clienteService.list(empresaId, {
        search: debouncedSearch, page, pageSize,
        orderBy: sortField, order: sortOrder, filters: serviceFilters,
      });

      // Apply client-side filters for fields the API doesn't support
      let data = result.data;
      if (filters.uf) data = data.filter(c => c.uf === filters.uf);
      if (filters.cidade) data = data.filter(c => c.cidade?.toLowerCase().includes(filters.cidade.toLowerCase()));
      if (filters.com_email === 'sim') data = data.filter(c => c.email);
      if (filters.com_email === 'nao') data = data.filter(c => !c.email);
      if (filters.com_telefone === 'sim') data = data.filter(c => c.telefone || c.celular);
      if (filters.com_telefone === 'nao') data = data.filter(c => !c.telefone && !c.celular);
      if (filters.data_de) data = data.filter(c => new Date(c.created_at) >= new Date(filters.data_de));
      if (filters.data_ate) {
        const to = new Date(filters.data_ate); to.setHours(23, 59, 59);
        data = data.filter(c => new Date(c.created_at) <= to);
      }

      setClientes(data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      if (isTableNotFoundError(error)) { setTableError(true); return; }
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, debouncedSearch, page, pageSize, sortField, sortOrder, filters]);

  useEffect(() => { loadClientes(); }, [loadClientes]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filters]);

  // Actions
  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Excluir "${nome}"?`)) return;
    try {
      await clienteService.delete(id);
      loadClientes(); onRefresh();
    } catch (error) { console.error(error); }
  };

  const handleToggleStatus = async (c: Cliente) => {
    try {
      await clienteService.toggleAtivo(c.id, !c.ativo);
      loadClientes(); onRefresh();
    } catch (error) { console.error(error); }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const handleSelectAll = () => {
    setSelectedIds(prev => prev.size === clientes.length ? new Set() : new Set(clientes.map(c => c.id)));
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBulkToggle = async (ativo: boolean) => {
    try {
      await Promise.all(Array.from(selectedIds).map(id => clienteService.toggleAtivo(id, ativo)));
      setSelectedIds(new Set()); loadClientes(); onRefresh();
    } catch (error) { console.error(error); }
  };

  const handleExport = () => {
    exportToCSV(clientes.map(c => ({
      Código: c.codigo, Nome: c.nome, 'Nome Fantasia': c.nome_fantasia || '',
      Tipo: c.tipo_pessoa === 'J' ? 'PJ' : 'PF', 'CPF/CNPJ': c.cpf_cnpj || '',
      Email: c.email || '', Telefone: c.telefone || '', Celular: c.celular || '',
      Cidade: c.cidade || '', UF: c.uf || '', Status: c.ativo ? 'Ativo' : 'Inativo',
      Criado: c.created_at ? formatDate(c.created_at) : '',
    })), 'clientes');
  };

  const resetFilters = () => { setFilters({ ...defaultFilters }); setSearch(''); };

  const saveFilter = () => {
    if (!filterName.trim()) return;
    const newFilters = [{ id: `f-${Date.now()}`, name: filterName.trim(), criteria: { ...filters } }, ...savedFilters];
    setSavedFilters(newFilters);
    localStorage.setItem('clientes_saved_filters', JSON.stringify(newFilters));
    setFilterName(''); setShowSaveFilter(false);
  };

  const deleteFilter = (id: string) => {
    const newFilters = savedFilters.filter(f => f.id !== id);
    setSavedFilters(newFilters);
    localStorage.setItem('clientes_saved_filters', JSON.stringify(newFilters));
  };

  const getWhatsAppLink = (phone: string) => {
    const d = cleanDigits(phone);
    return d.length >= 10 ? `https://wa.me/${d.startsWith('55') ? d : `55${d}`}` : null;
  };

  const activeCount = Object.entries(filters).filter(([, v]) => v !== '' && v !== 'all').length;

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-400" />;
  };

  if (!empresaId) return <EmptyState message="Selecione uma empresa" />;
  if (tableError) return <TableNotConfigured entity="clientes" />;

  return (
    <div className="space-y-4">
      {/* ── Search + Quick Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Buscar por nome, CPF/CNPJ ou código..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div className="flex gap-2">
          <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as FilterCriteria['status'] }))}
            className="px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl text-xs cursor-pointer select-zed">
            <option value="all">Todos Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <select value={filters.tipo_pessoa} onChange={(e) => setFilters(prev => ({ ...prev, tipo_pessoa: e.target.value as FilterCriteria['tipo_pessoa'] }))}
            className="px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl text-xs cursor-pointer select-zed">
            <option value="all">Todos Tipos</option>
            <option value="F">Pessoa Física</option>
            <option value="J">Pessoa Jurídica</option>
          </select>
          <FormButton variant={showAdvanced ? 'primary' : 'secondary'} size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
            <Filter className="w-3.5 h-3.5" />
            {activeCount > 0 && <span className="px-1.5 py-0.5 bg-purple-500/30 rounded-full text-[9px] font-bold">{activeCount}</span>}
          </FormButton>
          <FormButton variant="secondary" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
          </FormButton>
        </div>
      </div>

      {/* ── Advanced Filters Panel ── */}
      {showAdvanced && (
        <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5 space-y-4">
          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-3 border-b border-white/5">
              {savedFilters.map(f => (
                <div key={f.id} className="flex items-center gap-1 group">
                  <button onClick={() => setFilters({ ...f.criteria })}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-300 hover:bg-blue-500/20 transition-colors">
                    <Star className="w-3 h-3" /> {f.name}
                  </button>
                  <button onClick={() => deleteFilter(f.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FormSelect label="UF" options={[{ value: '', label: 'Todos' }, ...UF_OPTIONS.filter(u => u.value)]}
              value={filters.uf} onChange={(v) => setFilters(p => ({ ...p, uf: v }))} />
            <FormInput label="Cidade" placeholder="Filtrar cidade"
              value={filters.cidade} onChange={(v) => setFilters(p => ({ ...p, cidade: v }))} />
            <FormSelect label="Com Email" options={[{ value: 'all', label: 'Todos' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]}
              value={filters.com_email} onChange={(v) => setFilters(p => ({ ...p, com_email: v as FilterCriteria['com_email'] }))} />
            <FormSelect label="Com Telefone" options={[{ value: 'all', label: 'Todos' }, { value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]}
              value={filters.com_telefone} onChange={(v) => setFilters(p => ({ ...p, com_telefone: v as FilterCriteria['com_telefone'] }))} />
            <FormInput label="Cadastro de" type="date" value={filters.data_de} onChange={(v) => setFilters(p => ({ ...p, data_de: v }))} />
            <FormInput label="Cadastro até" type="date" value={filters.data_ate} onChange={(v) => setFilters(p => ({ ...p, data_ate: v }))} />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <FormButton variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="w-3.5 h-3.5" /> Limpar</FormButton>
              <FormButton variant="ghost" size="sm" onClick={() => setShowSaveFilter(!showSaveFilter)}><Save className="w-3.5 h-3.5" /> Salvar</FormButton>
            </div>
            <FormButton variant="ghost" size="sm" onClick={() => setShowAdvanced(false)}>Fechar filtros</FormButton>
          </div>

          {showSaveFilter && (
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <FormInput label="" placeholder="Nome do filtro..." value={filterName} onChange={setFilterName} className="flex-1" />
              <FormButton size="sm" onClick={saveFilter} disabled={!filterName.trim()} className="self-end"><Save className="w-3.5 h-3.5" /></FormButton>
            </div>
          )}
        </div>
      )}

      {/* ── Bulk Actions ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <span className="text-xs font-semibold text-purple-300">{selectedIds.size} selecionado(s)</span>
          <div className="flex gap-2 ml-auto">
            <FormButton variant="success" size="sm" onClick={() => handleBulkToggle(true)}>Ativar</FormButton>
            <FormButton variant="danger" size="sm" onClick={() => handleBulkToggle(false)}>Desativar</FormButton>
            <FormButton variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Limpar</FormButton>
          </div>
        </div>
      )}

      {/* ── Results Info ── */}
      <p className="text-xs text-slate-500">
        {total} cliente(s) encontrado(s)
        {debouncedSearch && <span> para &quot;{debouncedSearch}&quot;</span>}
      </p>

      {/* ── Table ── */}
      {loading ? <LoadingState /> : clientes.length === 0 ? (
        <EmptyState message="Nenhum cliente encontrado"
          description={debouncedSearch ? 'Tente refinar sua busca' : 'Nenhum cliente cadastrado ainda.'} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d1117] border-b border-white/5">
                <th className="w-10 px-3 py-3">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-white">
                    {selectedIds.size === clientes.length && clientes.length > 0
                      ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-3 py-3">
                  <button onClick={() => handleSort('codigo')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white uppercase tracking-wider">
                    Cód <SortIcon field="codigo" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left">
                  <button onClick={() => handleSort('nome')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white uppercase tracking-wider">
                    Cliente <SortIcon field="nome" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left hidden md:table-cell"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo</span></th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">
                  <button onClick={() => handleSort('cpf_cnpj')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white uppercase tracking-wider">
                    CPF/CNPJ <SortIcon field="cpf_cnpj" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left hidden xl:table-cell">
                  <button onClick={() => handleSort('cidade')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white uppercase tracking-wider">
                    Cidade/UF <SortIcon field="cidade" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left hidden lg:table-cell"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contato</span></th>
                <th className="px-3 py-3 text-center"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</span></th>
                <th className="px-3 py-3 text-right"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {clientes.map((c) => {
                const wpp = (c.celular || c.telefone) ? getWhatsAppLink(c.celular || c.telefone || '') : null;
                return (
                  <tr key={c.id} className={cn('hover:bg-white/[0.02] transition-colors cursor-pointer', selectedIds.has(c.id) && 'bg-purple-500/5')}
                    onClick={() => onView(c)}>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleSelect(c.id)} className="text-slate-400 hover:text-white">
                        {selectedIds.has(c.id) ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-3"><span className="text-xs font-mono text-slate-500">{c.codigo}</span></td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-white text-sm truncate max-w-[200px]">{c.nome}</p>
                      {c.nome_fantasia && <p className="text-xs text-slate-500 truncate max-w-[200px]">{c.nome_fantasia}</p>}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell"><TipoPessoaBadge tipo={c.tipo_pessoa as 'F' | 'J'} /></td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-400 font-mono">{c.cpf_cnpj ? formatCPFCNPJ(c.cpf_cnpj, c.tipo_pessoa as 'F' | 'J') : '—'}</span>
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <span className="text-xs text-slate-400">{c.cidade && c.uf ? `${c.cidade}/${c.uf}` : c.cidade || c.uf || '—'}</span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {c.telefone && <a href={`tel:${cleanDigits(c.telefone)}`} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors" title={formatPhone(c.telefone)}><Phone className="w-3.5 h-3.5" /></a>}
                        {c.email && <a href={`mailto:${c.email}`} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors" title={c.email}><Mail className="w-3.5 h-3.5" /></a>}
                        {wpp && <a href={wpp} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-emerald-500/20 rounded text-slate-500 hover:text-emerald-400 transition-colors"><MessageCircle className="w-3.5 h-3.5" /></a>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleToggleStatus(c)}><StatusBadge active={c.ativo} /></button>
                    </td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onView(c)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors" title="Ver perfil"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onEdit(c)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(c.id, c.nome)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">Página {page} de {totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-30 text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pn: number;
              if (totalPages <= 5) pn = i + 1;
              else if (page <= 3) pn = i + 1;
              else if (page >= totalPages - 2) pn = totalPages - 4 + i;
              else pn = page - 2 + i;
              return (
                <button key={pn} onClick={() => setPage(pn)}
                  className={cn('w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                    page === pn ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:bg-white/5'
                  )}>{pn}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-30 text-slate-400"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuscaClientes;
