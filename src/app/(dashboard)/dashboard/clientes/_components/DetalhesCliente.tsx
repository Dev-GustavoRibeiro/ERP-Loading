'use client';

import React, { useState, useCallback } from 'react';
import {
  User, MapPin, Phone, Mail, MessageCircle, Building2, Calendar,
  CreditCard, Edit, ToggleLeft, ToggleRight, ExternalLink, Copy,
  Star, TrendingUp, Clock, Shield, FileText, History,
  Plus, ChevronDown, ChevronUp, Filter as FilterIcon, Send,
  Upload, Trash2, Eye, Download, Search,
  AlertTriangle, CheckCircle2, File, FileBadge, FileCheck, FolderOpen, X,
  ShoppingCart, Wrench,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Cliente } from '@/modules/cadastros/domain';
import {
  FormButton, FormInput, FormSelect, FormTextarea,
  StatusBadge, TipoPessoaBadge, HealthScoreBadge,
  EmptyState, TabNav, SectionTitle,
  INTERACTION_TYPES, DOCUMENT_TYPES,
  formatCPFCNPJ, formatPhone, formatCEP, formatCurrency, formatDate,
  formatDateTime, timeAgo, calculateHealthScore, cleanDigits,
} from './shared';

// =====================================================
// Types
// =====================================================

interface DetalhesClienteProps {
  cliente: Cliente;
  onEdit: () => void;
  onToggleStatus: () => void;
  onClose: () => void;
}

interface HistoryEntry {
  id: string; type: string; title: string; description: string;
  date: string; user?: string; isSystem?: boolean;
}

interface Document {
  id: string; tipo: string; nome: string; descricao?: string;
  status: 'pendente' | 'valido' | 'vencido' | 'em_analise';
  data_emissao?: string; data_validade?: string; created_at: string; arquivo_url?: string;
}

// =====================================================
// Profile Info Section
// =====================================================

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null; copyable?: boolean; href?: string }> = ({
  icon, label, value, copyable, href,
}) => {
  const handleCopy = () => value && navigator.clipboard.writeText(value);
  if (!value) return null;

  const content = (
    <div className="flex items-center gap-3 py-2.5 group">
      <span className="text-slate-600">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-white truncate">{value}</p>
      </div>
      {copyable && (
        <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-slate-500" title="Copiar">
          <Copy className="w-3 h-3" />
        </button>
      )}
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-purple-400">
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );

  return <div className="border-b border-white/[0.03]">{content}</div>;
};

// =====================================================
// Tab: Profile Data
// =====================================================

const TabPerfil: React.FC<{ cliente: Cliente; onEdit: () => void; onToggleStatus: () => void }> = ({
  cliente, onEdit, onToggleStatus,
}) => {
  const c = cliente;
  const whatsAppLink = (phone: string) => {
    const d = cleanDigits(phone);
    return d.length >= 10 ? `https://wa.me/${d.startsWith('55') ? d : `55${d}`}` : undefined;
  };

  const mapsLink = [c.logradouro, c.numero, c.bairro, c.cidade, c.uf].filter(Boolean).join(', ');

  return (
    <div className="space-y-5">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <FormButton size="sm" onClick={onEdit}><Edit className="w-3.5 h-3.5" /> Editar Dados</FormButton>
        <FormButton size="sm" variant={c.ativo ? 'danger' : 'success'} onClick={onToggleStatus}>
          {c.ativo ? <><ToggleLeft className="w-3.5 h-3.5" /> Desativar</> : <><ToggleRight className="w-3.5 h-3.5" /> Ativar</>}
        </FormButton>
      </div>

      {/* Contact Section */}
      <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-blue-400" /> Contato
        </h4>
        <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefone" value={c.telefone ? formatPhone(c.telefone) : null} copyable />
        <InfoRow icon={<Phone className="w-4 h-4" />} label="Celular" value={c.celular ? formatPhone(c.celular) : null} copyable
          href={c.celular ? whatsAppLink(c.celular) : undefined} />
        <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={c.email} copyable href={c.email ? `mailto:${c.email}` : undefined} />
        {c.celular && (
          <div className="pt-2">
            <a href={whatsAppLink(c.celular)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* Address Section */}
      <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Endereço
        </h4>
        <InfoRow icon={<MapPin className="w-4 h-4" />} label="CEP" value={c.cep ? formatCEP(c.cep) : null} copyable />
        <InfoRow icon={<MapPin className="w-4 h-4" />} label="Logradouro"
          value={[c.logradouro, c.numero && `nº ${c.numero}`].filter(Boolean).join(', ') || null}
          href={mapsLink ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsLink)}` : undefined}
        />
        {c.complemento && <InfoRow icon={<MapPin className="w-4 h-4" />} label="Complemento" value={c.complemento} />}
        <InfoRow icon={<MapPin className="w-4 h-4" />} label="Bairro" value={c.bairro} />
        <InfoRow icon={<MapPin className="w-4 h-4" />} label="Cidade/UF"
          value={c.cidade && c.uf ? `${c.cidade}/${c.uf}` : c.cidade || c.uf || null} />
      </div>

      {/* Document & Commercial */}
      <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-purple-400" /> Dados Cadastrais
        </h4>
        <InfoRow icon={<FileText className="w-4 h-4" />} label={c.tipo_pessoa === 'J' ? 'CNPJ' : 'CPF'}
          value={c.cpf_cnpj ? formatCPFCNPJ(c.cpf_cnpj, c.tipo_pessoa as 'F' | 'J') : null} copyable />
        {'rg_ie' in c && c.rg_ie && <InfoRow icon={<FileText className="w-4 h-4" />} label={c.tipo_pessoa === 'J' ? 'IE' : 'RG'} value={String(c.rg_ie)} />}
        {c.nome_fantasia && <InfoRow icon={<Building2 className="w-4 h-4" />} label="Nome Fantasia" value={c.nome_fantasia} />}
        <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Limite de Crédito"
          value={c.limite_credito ? formatCurrency(c.limite_credito) : null} />
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Cliente desde"
          value={c.created_at ? formatDate(c.created_at) : null} />
      </div>

      {/* Observations */}
      {c.observacoes && (
        <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Observações</h4>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{c.observacoes}</p>
        </div>
      )}
    </div>
  );
};

// =====================================================
// Tab: History
// =====================================================

const TabHistorico: React.FC<{ cliente: Cliente }> = ({ cliente }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => {
    const system: HistoryEntry[] = [{
      id: 'sys-create', type: 'nota', title: 'Cliente cadastrado no sistema',
      description: `${cliente.nome} foi adicionado ao sistema.`,
      date: cliente.created_at, isSystem: true,
    }];
    if (cliente.updated_at && cliente.updated_at !== cliente.created_at) {
      system.push({
        id: 'sys-update', type: 'nota', title: 'Dados atualizados',
        description: 'Informações do cliente foram modificadas.',
        date: cliente.updated_at, isSystem: true,
      });
    }
    return system;
  });

  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState('nota');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [filterType, setFilterType] = useState('all');

  const addEntry = () => {
    if (!newTitle.trim()) return;
    const entry: HistoryEntry = {
      id: `h-${Date.now()}`, type: newType, title: newTitle.trim(),
      description: newDesc.trim(), date: new Date().toISOString(), user: 'Usuário',
    };
    setEntries(prev => [entry, ...prev]);
    setNewTitle(''); setNewDesc(''); setShowForm(false);
  };

  const filtered = filterType === 'all' ? entries : entries.filter(e => e.type === filterType);
  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getTypeInfo = (type: string) => INTERACTION_TYPES.find(t => t.value === type) || INTERACTION_TYPES[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl text-xs select-zed">
          <option value="all">Todas interações</option>
          {INTERACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <FormButton size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> Registrar
        </FormButton>
      </div>

      {showForm && (
        <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Tipo" value={newType} onChange={setNewType}
              options={INTERACTION_TYPES.map(t => ({ value: t.value, label: t.label }))} />
            <FormInput label="Título" placeholder="Assunto da interação" value={newTitle} onChange={setNewTitle} />
          </div>
          <FormTextarea label="Descrição" placeholder="Detalhes..." value={newDesc} onChange={setNewDesc} rows={2} />
          <div className="flex justify-end gap-2">
            <FormButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</FormButton>
            <FormButton size="sm" onClick={addEntry} disabled={!newTitle.trim()}>
              <Send className="w-3.5 h-3.5" /> Registrar
            </FormButton>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState message="Nenhum registro" description="Registre interações com este cliente." />
      ) : (
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-2.5 top-2 bottom-2 w-px bg-white/10" />

          {sorted.map((entry, i) => {
            const typeInfo = getTypeInfo(entry.type);
            return (
              <div key={entry.id} className="relative mb-4 last:mb-0">
                {/* Timeline dot */}
                <div className={cn(
                  'absolute -left-[14px] top-1.5 w-3 h-3 rounded-full border-2',
                  entry.isSystem
                    ? 'bg-slate-700 border-slate-600'
                    : 'bg-purple-500/30 border-purple-500',
                )} />

                <div className={cn(
                  'p-3 rounded-xl border transition-colors',
                  entry.isSystem
                    ? 'bg-white/[0.01] border-white/[0.03]'
                    : 'bg-[#0d1117]/60 border-white/5 hover:border-white/10',
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase', typeInfo.color || 'bg-white/5 text-slate-400')}>
                        {typeInfo.label}
                      </span>
                      <span className="text-xs font-semibold text-white">{entry.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-600" title={formatDateTime(entry.date)}>
                      {timeAgo(entry.date)}
                    </span>
                  </div>
                  {entry.description && <p className="text-xs text-slate-400 leading-relaxed">{entry.description}</p>}
                  {entry.user && <p className="text-[10px] text-slate-600 mt-1">por {entry.user}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =====================================================
// Tab: Documents
// =====================================================

const TabDocumentos: React.FC<{ cliente: Cliente }> = ({ cliente }) => {
  const isPJ = cliente.tipo_pessoa === 'J';
  const requiredDocs = isPJ
    ? ['contrato_social', 'cnpj', 'inscricao_estadual', 'procuracao', 'comprovante_endereco']
    : ['cpf', 'rg', 'comprovante_endereco', 'comprovante_renda'];

  const [documents, setDocuments] = useState<Document[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newDoc, setNewDoc] = useState({ tipo: '', nome: '', descricao: '', data_emissao: '', data_validade: '' });
  const [filterStatus, setFilterStatus] = useState('all');

  const addDocument = () => {
    if (!newDoc.tipo || !newDoc.nome.trim()) return;
    const doc: Document = {
      id: `d-${Date.now()}`, ...newDoc, nome: newDoc.nome.trim(),
      status: 'pendente', created_at: new Date().toISOString(),
    };
    setDocuments(prev => [doc, ...prev]);
    setNewDoc({ tipo: '', nome: '', descricao: '', data_emissao: '', data_validade: '' });
    setShowForm(false);
  };

  const updateStatus = (id: string, status: Document['status']) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Checklist
  const docCheckStatus = requiredDocs.map(tipo => {
    const found = documents.find(d => d.tipo === tipo);
    return { tipo, found, status: found?.status || 'pendente' };
  });
  const completedCount = docCheckStatus.filter(d => d.status === 'valido').length;
  const progress = requiredDocs.length > 0 ? Math.round((completedCount / requiredDocs.length) * 100) : 0;

  const statusIcons: Record<string, React.ReactNode> = {
    pendente: <Clock className="w-3.5 h-3.5 text-amber-400" />,
    valido: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    vencido: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
    em_analise: <Search className="w-3.5 h-3.5 text-blue-400" />,
  };

  const statusLabels: Record<string, string> = {
    pendente: 'Pendente', valido: 'Válido', vencido: 'Vencido', em_analise: 'Em Análise',
  };

  const filtered = filterStatus === 'all' ? documents : documents.filter(d => d.status === filterStatus);

  return (
    <div className="space-y-5">
      {/* Checklist Progress */}
      <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase">Documentos Obrigatórios ({isPJ ? 'PJ' : 'PF'})</h4>
          <span className="text-xs font-bold text-white">{progress}%</span>
        </div>
        <div className="w-full bg-white/5 rounded-full h-1.5 mb-3">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {docCheckStatus.map(({ tipo, found, status }) => {
            const typeInfo = DOCUMENT_TYPES.find(t => t.value === tipo);
            return (
              <div key={tipo} className={cn(
                'flex items-center gap-2 p-2 rounded-lg border text-xs',
                status === 'valido' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : status === 'vencido' ? 'bg-red-500/5 border-red-500/20 text-red-400'
                  : 'bg-white/[0.02] border-white/5 text-slate-500',
              )}>
                {statusIcons[status]}
                <span className="truncate">{typeInfo?.label || tipo}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl text-xs select-zed">
          <option value="all">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="valido">Válidos</option>
          <option value="vencido">Vencidos</option>
          <option value="em_analise">Em Análise</option>
        </select>
        <FormButton size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </FormButton>
      </div>

      {showForm && (
        <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Tipo" value={newDoc.tipo} onChange={(v) => setNewDoc(p => ({ ...p, tipo: v }))}
              options={[{ value: '', label: 'Selecione...' }, ...DOCUMENT_TYPES.map(t => ({ value: t.value, label: t.label }))]} />
            <FormInput label="Nome" placeholder="Nome do documento"
              value={newDoc.nome} onChange={(v) => setNewDoc(p => ({ ...p, nome: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Emissão" type="date" value={newDoc.data_emissao} onChange={(v) => setNewDoc(p => ({ ...p, data_emissao: v }))} />
            <FormInput label="Validade" type="date" value={newDoc.data_validade} onChange={(v) => setNewDoc(p => ({ ...p, data_validade: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <FormButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</FormButton>
            <FormButton size="sm" onClick={addDocument} disabled={!newDoc.tipo || !newDoc.nome.trim()}>
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </FormButton>
          </div>
        </div>
      )}

      {/* Documents List */}
      {filtered.length === 0 ? (
        <EmptyState message="Nenhum documento" description="Adicione documentos do cliente." />
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-[#0d1117]/40 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {statusIcons[doc.status]}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.nome}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{DOCUMENT_TYPES.find(t => t.value === doc.tipo)?.label || doc.tipo}</span>
                    {doc.data_validade && <span>Val: {formatDate(doc.data_validade)}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <select value={doc.status} onChange={(e) => updateStatus(doc.id, e.target.value as Document['status'])}
                  className="px-2 py-1 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded text-[10px] select-zed">
                  <option value="pendente">Pendente</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="valido">Válido</option>
                  <option value="vencido">Vencido</option>
                </select>
                <button onClick={() => deleteDocument(doc.id)}
                  className="p-1 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =====================================================
// Main Component
// =====================================================

export const DetalhesCliente: React.FC<DetalhesClienteProps> = ({
  cliente, onEdit, onToggleStatus, onClose,
}) => {
  const [activeTab, setActiveTab] = useState('perfil');
  const healthData = calculateHealthScore(cliente);

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'historico', label: 'Histórico', icon: <History className="w-3.5 h-3.5" /> },
    { id: 'documentos', label: 'Documentos', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header Card ── */}
      <div className="flex items-start gap-4 p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-black text-white">{cliente.nome.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-bold text-white truncate">{cliente.nome}</h3>
            <TipoPessoaBadge tipo={cliente.tipo_pessoa as 'F' | 'J'} />
            <StatusBadge active={cliente.ativo} />
          </div>
          {cliente.nome_fantasia && <p className="text-xs text-slate-500 mb-1">{cliente.nome_fantasia}</p>}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="font-mono">#{cliente.codigo}</span>
            <HealthScoreBadge score={healthData.score} level={healthData.level} label={healthData.label} />
            {cliente.created_at && <span>Desde {formatDate(cliente.created_at)}</span>}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-[#0d1117]/40 rounded-xl border border-white/5">
        {tabs.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'perfil' && <TabPerfil cliente={cliente} onEdit={onEdit} onToggleStatus={onToggleStatus} />}
      {activeTab === 'historico' && <TabHistorico cliente={cliente} />}
      {activeTab === 'documentos' && <TabDocumentos cliente={cliente} />}
    </div>
  );
};

export default DetalhesCliente;
