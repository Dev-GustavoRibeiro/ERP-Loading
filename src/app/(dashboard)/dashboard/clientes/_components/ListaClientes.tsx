'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight,
  Download, ToggleLeft, ToggleRight, Phone, Mail, MessageCircle,
  ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, UserPlus,
  CheckSquare, Square, Filter,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { clienteService } from '@/modules/cadastros/services/clienteService';
import type { Cliente } from '@/modules/cadastros/domain';
import {
  FormButton, FormInput, StatusBadge, TipoPessoaBadge,
  LoadingState, EmptyState, formatCPFCNPJ, formatPhone, formatDate,
  exportToCSV, useDebounce, cleanDigits,
} from './shared';

// =====================================================
// Types
// =====================================================

type SortField = 'codigo' | 'nome' | 'cpf_cnpj' | 'cidade' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface ListaClientesProps {
  empresaId: string | null;
  onEdit: (cliente: Cliente) => void;
  onView: (cliente: Cliente) => void;
  onRefresh: () => void;
  onNewCliente: () => void;
}

// =====================================================
// Component
// =====================================================

export const ListaClientes: React.FC<ListaClientesProps> = ({
  empresaId, onEdit, onView, onRefresh, onNewCliente,
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(15);
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterTipo, setFilterTipo] = useState<'all' | 'F' | 'J'>('all');

  const debouncedSearch = useDebounce(search, 400);

  const loadClientes = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const filters: Record<string, unknown> = {};
      if (filterStatus === 'active') filters.ativo = true;
      if (filterStatus === 'inactive') filters.ativo = false;
      if (filterTipo !== 'all') filters.tipo_pessoa = filterTipo;

      const result = await clienteService.list(empresaId, {
        search: debouncedSearch,
        page,
        pageSize,
        orderBy: sortField,
        order: sortOrder,
        filters,
      });
      setClientes(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, debouncedSearch, page, pageSize, sortField, sortOrder, filterStatus, filterTipo]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus, filterTipo]);

  // ── Actions ──
  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir "${nome}"?`)) return;
    try {
      await clienteService.delete(id);
      loadClientes();
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleToggleStatus = async (cliente: Cliente) => {
    try {
      await clienteService.toggleAtivo(cliente.id, !cliente.ativo);
      loadClientes();
      onRefresh();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === clientes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clientes.map(c => c.id)));
    }
  };

  const handleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkToggle = async (ativo: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => clienteService.toggleAtivo(id, ativo))
      );
      setSelectedIds(new Set());
      loadClientes();
      onRefresh();
    } catch (error) {
      console.error('Erro em operação em lote:', error);
    }
  };

  const handleExport = () => {
    const data = clientes.map(c => ({
      Código: c.codigo,
      Nome: c.nome,
      'Nome Fantasia': c.nome_fantasia || '',
      'Tipo Pessoa': c.tipo_pessoa === 'J' ? 'Jurídica' : 'Física',
      'CPF/CNPJ': c.cpf_cnpj || '',
      Email: c.email || '',
      Telefone: c.telefone || '',
      Celular: c.celular || '',
      CEP: c.cep || '',
      Logradouro: c.logradouro || '',
      Número: c.numero || '',
      Bairro: c.bairro || '',
      Cidade: c.cidade || '',
      UF: c.uf || '',
      Status: c.ativo ? 'Ativo' : 'Inativo',
      'Criado em': c.created_at ? formatDate(c.created_at) : '',
    }));
    exportToCSV(data, 'clientes');
  };

  const getWhatsAppLink = (phone: string) => {
    const digits = cleanDigits(phone);
    if (digits.length < 10) return null;
    const number = digits.startsWith('55') ? digits : `55${digits}`;
    return `https://wa.me/${number}`;
  };

  // ── Render Helpers ──
  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 text-purple-400" />
      : <ArrowDown className="w-3 h-3 text-purple-400" />;
  };

  if (!empresaId) {
    return <EmptyState message="Selecione uma empresa" description="Selecione uma empresa para visualizar os clientes cadastrados." />;
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl text-xs cursor-pointer select-zed"
          >
            <option value="all">Todos Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as 'all' | 'F' | 'J')}
            className="px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl text-xs cursor-pointer select-zed"
          >
            <option value="all">Todos Tipos</option>
            <option value="F">Pessoa Física</option>
            <option value="J">Pessoa Jurídica</option>
          </select>
        </div>

        <div className="flex gap-2">
          <FormButton variant="secondary" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> CSV
          </FormButton>
          <FormButton variant="primary" size="sm" onClick={onNewCliente}>
            <UserPlus className="w-3.5 h-3.5" /> Novo
          </FormButton>
        </div>
      </div>

      {/* ── Bulk Actions ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <span className="text-xs font-semibold text-purple-300">{selectedIds.size} selecionado(s)</span>
          <div className="flex gap-2 ml-auto">
            <FormButton variant="success" size="sm" onClick={() => handleBulkToggle(true)}>
              Ativar
            </FormButton>
            <FormButton variant="danger" size="sm" onClick={() => handleBulkToggle(false)}>
              Desativar
            </FormButton>
            <FormButton variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Limpar
            </FormButton>
          </div>
        </div>
      )}

      {/* ── Results Info ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {total} cliente(s) encontrado(s)
          {debouncedSearch && <span> para &quot;{debouncedSearch}&quot;</span>}
        </p>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <LoadingState />
      ) : clientes.length === 0 ? (
        <EmptyState
          message="Nenhum cliente encontrado"
          description={debouncedSearch ? 'Tente refinar sua busca' : 'Cadastre seu primeiro cliente'}
          action={!debouncedSearch ? { label: 'Novo Cliente', onClick: onNewCliente } : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d1117] border-b border-white/5">
                <th className="w-10 px-3 py-3">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-white">
                    {selectedIds.size === clientes.length && clientes.length > 0
                      ? <CheckSquare className="w-4 h-4 text-purple-400" />
                      : <Square className="w-4 h-4" />
                    }
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
                <th className="px-3 py-3 text-left hidden md:table-cell">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo</span>
                </th>
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
                <th className="px-3 py-3 text-left hidden lg:table-cell">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contato</span>
                </th>
                <th className="px-3 py-3 text-center">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</span>
                </th>
                <th className="px-3 py-3 text-right">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {clientes.map((cliente) => {
                const whatsappLink = (cliente.celular || cliente.telefone)
                  ? getWhatsAppLink(cliente.celular || cliente.telefone || '')
                  : null;

                return (
                  <tr
                    key={cliente.id}
                    className={cn(
                      'hover:bg-white/[0.02] transition-colors cursor-pointer',
                      selectedIds.has(cliente.id) && 'bg-purple-500/5'
                    )}
                    onClick={() => onView(cliente)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleSelect(cliente.id)} className="text-slate-400 hover:text-white">
                        {selectedIds.has(cliente.id)
                          ? <CheckSquare className="w-4 h-4 text-purple-400" />
                          : <Square className="w-4 h-4" />
                        }
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-mono text-slate-500">{cliente.codigo}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        <p className="font-semibold text-white text-sm truncate max-w-[200px]">{cliente.nome}</p>
                        {cliente.nome_fantasia && (
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{cliente.nome_fantasia}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <TipoPessoaBadge tipo={cliente.tipo_pessoa as 'F' | 'J'} />
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-400 font-mono">
                        {cliente.cpf_cnpj
                          ? formatCPFCNPJ(cliente.cpf_cnpj, cliente.tipo_pessoa as 'F' | 'J')
                          : '—'
                        }
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <span className="text-xs text-slate-400">
                        {cliente.cidade && cliente.uf
                          ? `${cliente.cidade}/${cliente.uf}`
                          : cliente.cidade || cliente.uf || '—'
                        }
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {cliente.telefone && (
                          <a
                            href={`tel:${cleanDigits(cliente.telefone)}`}
                            className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors"
                            title={formatPhone(cliente.telefone)}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {cliente.email && (
                          <a
                            href={`mailto:${cliente.email}`}
                            className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors"
                            title={cliente.email}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {whatsappLink && (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-emerald-500/20 rounded text-slate-500 hover:text-emerald-400 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleToggleStatus(cliente)} title={cliente.ativo ? 'Desativar' : 'Ativar'}>
                        <StatusBadge active={cliente.ativo} />
                      </button>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onView(cliente)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEdit(cliente)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.id, cliente.nome)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
          <p className="text-xs text-slate-500">
            Página {page} de {totalPages} • {total} registros
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-slate-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                    page === pageNum
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-slate-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaClientes;
