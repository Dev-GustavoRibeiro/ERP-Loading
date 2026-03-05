'use client';

import React, { useState } from 'react';
import {
  FileText, Upload, Trash2, Eye, Download, Search,
  Calendar, AlertTriangle, CheckCircle2, Clock, Plus,
  File, FileBadge, FileCheck, FolderOpen, X,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Cliente } from '@/modules/cadastros/domain';
import {
  FormButton, FormInput, FormSelect, StatusBadge, EmptyState,
  DOCUMENT_TYPES, formatDate, formatDateTime, TabNav,
} from './shared';

// =====================================================
// Types
// =====================================================

interface Document {
  id: string;
  tipo: string;
  nome: string;
  descricao?: string;
  status: 'pendente' | 'valido' | 'vencido' | 'em_analise';
  data_emissao?: string;
  data_validade?: string;
  created_at: string;
  arquivo_url?: string;
}

interface DocumentosClienteProps {
  cliente: Cliente;
  empresaId: string | null;
}

// =====================================================
// Component
// =====================================================

export const DocumentosCliente: React.FC<DocumentosClienteProps> = ({
  cliente, empresaId,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newDoc, setNewDoc] = useState({
    tipo: 'rg',
    nome: '',
    descricao: '',
    data_emissao: '',
    data_validade: '',
  });

  // Categories for filtering
  const categories = [
    { value: 'all', label: 'Todas Categorias' },
    { value: 'pessoal', label: 'Documentos Pessoais' },
    { value: 'endereco', label: 'Comprovantes' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'contrato', label: 'Contratos' },
    { value: 'fiscal', label: 'Fiscal' },
    { value: 'outro', label: 'Outros' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Todos Status' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'valido', label: 'Válido' },
    { value: 'vencido', label: 'Vencido' },
    { value: 'em_analise', label: 'Em Análise' },
  ];

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    if (searchTerm && !doc.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory !== 'all') {
      const docType = DOCUMENT_TYPES.find(t => t.value === doc.tipo);
      if (docType && docType.category !== filterCategory) return false;
    }
    if (filterStatus !== 'all' && doc.status !== filterStatus) return false;
    return true;
  });

  // Document status helpers
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      pendente: {
        icon: <Clock className="w-3 h-3" />,
        label: 'Pendente',
        color: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
      },
      valido: {
        icon: <CheckCircle2 className="w-3 h-3" />,
        label: 'Válido',
        color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      },
      vencido: {
        icon: <AlertTriangle className="w-3 h-3" />,
        label: 'Vencido',
        color: 'bg-red-500/15 text-red-400 border-red-500/20',
      },
      em_analise: {
        icon: <Eye className="w-3 h-3" />,
        label: 'Em Análise',
        color: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
      },
    };
    return configs[status] || configs.pendente;
  };

  const getDocIcon = (tipo: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      rg: <FileBadge className="w-5 h-5" />,
      cpf: <FileCheck className="w-5 h-5" />,
      cnpj: <FileCheck className="w-5 h-5" />,
      contrato: <FileText className="w-5 h-5" />,
      alvara: <File className="w-5 h-5" />,
    };
    return iconMap[tipo] || <FileText className="w-5 h-5" />;
  };

  // Required docs check
  const getRequiredDocs = () => {
    const required = cliente.tipo_pessoa === 'J'
      ? [
          { tipo: 'cnpj', label: 'Cartão CNPJ', found: documents.some(d => d.tipo === 'cnpj') },
          { tipo: 'contrato', label: 'Contrato Social', found: documents.some(d => d.tipo === 'contrato') },
          { tipo: 'comprovante_endereco', label: 'Comprovante de Endereço', found: documents.some(d => d.tipo === 'comprovante_endereco') },
          { tipo: 'inscricao_estadual', label: 'Inscrição Estadual', found: documents.some(d => d.tipo === 'inscricao_estadual') },
        ]
      : [
          { tipo: 'rg', label: 'RG', found: documents.some(d => d.tipo === 'rg') },
          { tipo: 'cpf', label: 'CPF', found: documents.some(d => d.tipo === 'cpf') },
          { tipo: 'comprovante_endereco', label: 'Comprovante de Endereço', found: documents.some(d => d.tipo === 'comprovante_endereco') },
        ];
    return required;
  };

  const handleAddDoc = () => {
    if (!newDoc.nome.trim()) return;

    const doc: Document = {
      id: `doc-${Date.now()}`,
      tipo: newDoc.tipo,
      nome: newDoc.nome.trim(),
      descricao: newDoc.descricao.trim() || undefined,
      status: 'pendente',
      data_emissao: newDoc.data_emissao || undefined,
      data_validade: newDoc.data_validade || undefined,
      created_at: new Date().toISOString(),
    };

    setDocuments(prev => [doc, ...prev]);
    setNewDoc({ tipo: 'rg', nome: '', descricao: '', data_emissao: '', data_validade: '' });
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Deseja remover este documento?')) return;
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleChangeStatus = (id: string, status: Document['status']) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const requiredDocs = getRequiredDocs();
  const completionPct = requiredDocs.length > 0
    ? Math.round((requiredDocs.filter(d => d.found).length / requiredDocs.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* ── Required Docs Checklist ── */}
      <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Documentos Obrigatórios
          </h4>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-bold',
            completionPct === 100
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-amber-500/15 text-amber-400'
          )}>
            {completionPct}% completo
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full mb-3 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              completionPct === 100 ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            style={{ width: `${completionPct}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {requiredDocs.map((doc) => (
            <div
              key={doc.tipo}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border',
                doc.found
                  ? 'bg-emerald-500/5 border-emerald-500/10'
                  : 'bg-white/[0.02] border-white/5'
              )}
            >
              {doc.found
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                : <div className="w-4 h-4 rounded-full border-2 border-slate-600 flex-shrink-0" />
              }
              <span className={cn(
                'text-xs font-medium',
                doc.found ? 'text-emerald-300' : 'text-slate-400'
              )}>
                {doc.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl text-xs cursor-pointer select-zed"
          >
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl text-xs cursor-pointer select-zed"
          >
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <FormButton variant="primary" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddForm ? 'Cancelar' : 'Adicionar'}
          </FormButton>
        </div>
      </div>

      {/* ── Add Form ── */}
      {showAddForm && (
        <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
          <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">Novo Documento</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect
              label="Tipo de Documento"
              options={DOCUMENT_TYPES.map(t => ({ value: t.value, label: t.label }))}
              value={newDoc.tipo}
              onChange={(val) => setNewDoc(prev => ({ ...prev, tipo: val }))}
            />
            <FormInput
              label="Nome/Descrição"
              placeholder="Ex: RG do titular"
              value={newDoc.nome}
              onChange={(val) => setNewDoc(prev => ({ ...prev, nome: val }))}
              required
            />
            <FormInput
              label="Data de Emissão"
              type="date"
              value={newDoc.data_emissao}
              onChange={(val) => setNewDoc(prev => ({ ...prev, data_emissao: val }))}
            />
            <FormInput
              label="Data de Validade"
              type="date"
              value={newDoc.data_validade}
              onChange={(val) => setNewDoc(prev => ({ ...prev, data_validade: val }))}
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">Upload do arquivo (em breve)</span>
            </div>
            <FormButton size="sm" onClick={handleAddDoc} disabled={!newDoc.nome.trim()}>
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </FormButton>
          </div>
        </div>
      )}

      {/* ── Document List ── */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-12 h-12 text-slate-600 mb-4" />}
          message="Nenhum documento encontrado"
          description={documents.length === 0
            ? 'Adicione documentos para manter o cadastro do cliente organizado.'
            : 'Nenhum documento corresponde aos filtros aplicados.'
          }
          action={documents.length === 0 ? { label: 'Adicionar Documento', onClick: () => setShowAddForm(true) } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => {
            const statusConfig = getStatusConfig(doc.status);
            const docType = DOCUMENT_TYPES.find(t => t.value === doc.tipo);
            const isExpired = doc.data_validade && new Date(doc.data_validade) < new Date();

            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 bg-[#0d1117]/60 border border-white/5 rounded-xl hover:border-white/10 transition-all"
              >
                {/* Icon */}
                <div className="flex-shrink-0 p-2.5 bg-white/5 rounded-xl text-slate-400">
                  {getDocIcon(doc.tipo)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{doc.nome}</p>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border',
                      statusConfig.color
                    )}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                    {isExpired && doc.status !== 'vencido' && (
                      <span className="px-1.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded text-[9px] font-bold">
                        Vencido
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-500">
                      {docType?.label || doc.tipo}
                    </span>
                    {doc.data_emissao && (
                      <span className="text-[10px] text-slate-600">
                        Emissão: {formatDate(doc.data_emissao)}
                      </span>
                    )}
                    {doc.data_validade && (
                      <span className={cn(
                        'text-[10px]',
                        isExpired ? 'text-red-400' : 'text-slate-600'
                      )}>
                        Validade: {formatDate(doc.data_validade)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <select
                    value={doc.status}
                    onChange={(e) => handleChangeStatus(doc.id, e.target.value as Document['status'])}
                    className="px-2 py-1 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded text-[10px] cursor-pointer select-zed"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="valido">Válido</option>
                    <option value="vencido">Vencido</option>
                    <option value="em_analise">Em Análise</option>
                  </select>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DocumentosCliente;
