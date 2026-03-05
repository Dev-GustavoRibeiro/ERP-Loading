'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Plus, Filter, MoreHorizontal,
  FileText, CheckCircle, Clock, Ban, Eye
} from 'lucide-react';
import { useNotasFiscais } from '@/features/nfe/hooks';
import { formatCurrency } from '@/shared/lib/utils';
import type { NfStatus, FilterNfeValues } from '@/features/nfe/schemas';
import { NF_STATUS_CONFIG } from '@/features/nfe/schemas';

interface NfeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  onDetails: (id: string) => void;
  onFilter: () => void;
  filters?: FilterNfeValues;
}

export function NfeListModal({
  isOpen,
  onClose,
  onCreate,
  onDetails,
  onFilter,
  filters = {}
}: NfeListModalProps) {
  const { notas, loading, page, totalPages, total, setPage } = useNotasFiscais(filters);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return date;
    }
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#0f1219] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Notas Fiscais (NF-e)</h2>
              <p className="text-sm text-gray-400">Gerencie todas as suas emissões fiscais</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCreate}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Nota
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md bg-black/20 border border-white/5 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por número, chave ou destinatário..."
              className="bg-transparent border-none outline-none text-sm text-white placeholder:text-gray-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={onFilter}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${Object.keys(filters).length > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : notas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 opacity-20" />
              </div>
              <p>Nenhuma nota fiscal encontrada</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-white/5 text-gray-400 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-3 font-medium">Número</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium">Destinatário</th>
                  <th className="px-6 py-3 font-medium">Data</th>
                  <th className="px-6 py-3 font-medium text-right">Valor</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                  <th className="px-6 py-3 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {notas.map((nota) => {
                  const nfAny = nota as unknown as Record<string, unknown>;
                  const destinatario = nfAny.destinatario as { nome?: string } | undefined;
                  const statusConfig = NF_STATUS_CONFIG[nota.status as NfStatus] || { label: nota.status, color: 'text-gray-400 bg-gray-500/10' };

                  return (
                    <tr
                      key={nota.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                      onClick={() => onDetails(nota.id)}
                    >
                      <td className="px-6 py-4 font-medium text-white">
                        {nota.numero} <span className="text-gray-500 font-normal">/ {nota.serie}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        <span className="bg-white/5 px-2 py-0.5 rounded text-xs uppercase text-gray-400 border border-white/5">
                          {nota.modelo === '65' ? 'NFC-e' : 'NF-e'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300 truncate max-w-[200px]" title={destinatario?.nome}>
                        {destinatario?.nome || '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {formatDate(nota.data_emissao)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-white">
                        {formatCurrency(nota.valor_total || 0)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDetails(nota.id); }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pagination */}
        <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-sm text-gray-400">
          <span>
            Mostrando <span className="text-white">{(page - 1) * 20 + 1}</span> a <span className="text-white">{Math.min(page * 20, total)}</span> de <span className="text-white">{total}</span> resultados
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="px-2">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modal, document.body) : null;
}
