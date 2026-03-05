'use client';

import React, { useState, useCallback } from 'react';
import {
  Clock, Plus, Phone, Mail, MapPin, MessageCircle,
  ShoppingCart, Wrench, FileText, Send, X,
  ChevronDown, ChevronUp, Calendar, Filter,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Cliente } from '@/modules/cadastros/domain';
import {
  FormButton, FormSelect, FormTextarea, FormInput,
  EmptyState, TabNav, INTERACTION_TYPES,
  formatDateTime, timeAgo,
} from './shared';

// =====================================================
// Types
// =====================================================

interface HistoryEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  user?: string;
  isSystem?: boolean;
}

interface HistoricoClienteProps {
  cliente: Cliente;
  empresaId: string | null;
}

// =====================================================
// Component
// =====================================================

export const HistoricoCliente: React.FC<HistoricoClienteProps> = ({
  cliente, empresaId,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [newEntry, setNewEntry] = useState({ type: 'nota', title: '', description: '' });

  // Generate history from client data (system events)
  const [customEntries, setCustomEntries] = useState<HistoryEntry[]>([]);

  const generateSystemHistory = useCallback((): HistoryEntry[] => {
    const entries: HistoryEntry[] = [];

    // Client creation
    if (cliente.created_at) {
      entries.push({
        id: 'sys-created',
        type: 'sistema',
        title: 'Cliente cadastrado no sistema',
        description: `${cliente.nome} foi cadastrado como ${cliente.tipo_pessoa === 'J' ? 'Pessoa Jurídica' : 'Pessoa Física'}${cliente.cpf_cnpj ? ` (${cliente.cpf_cnpj})` : ''}.`,
        date: cliente.created_at,
        isSystem: true,
      });
    }

    // Client update (if different from creation)
    if (cliente.updated_at && cliente.updated_at !== cliente.created_at) {
      entries.push({
        id: 'sys-updated',
        type: 'sistema',
        title: 'Dados do cliente atualizados',
        description: 'As informações cadastrais foram modificadas.',
        date: cliente.updated_at,
        isSystem: true,
      });
    }

    // Status change simulation
    if (!cliente.ativo) {
      entries.push({
        id: 'sys-inactive',
        type: 'sistema',
        title: 'Cliente desativado',
        description: 'O cadastro do cliente foi marcado como inativo.',
        date: cliente.updated_at || cliente.created_at,
        isSystem: true,
      });
    }

    // Completeness milestones
    if (cliente.email && cliente.telefone && cliente.cpf_cnpj && cliente.cep) {
      entries.push({
        id: 'sys-complete',
        type: 'sistema',
        title: 'Cadastro completo',
        description: 'Todos os dados principais do cliente foram preenchidos: email, telefone, documento e endereço.',
        date: cliente.updated_at || cliente.created_at,
        isSystem: true,
      });
    }

    return entries;
  }, [cliente]);

  const allEntries = [...customEntries, ...generateSystemHistory()]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredEntries = filterType === 'all'
    ? allEntries
    : allEntries.filter(e => e.type === filterType);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddEntry = () => {
    if (!newEntry.title.trim()) return;

    const entry: HistoryEntry = {
      id: `custom-${Date.now()}`,
      type: newEntry.type,
      title: newEntry.title.trim(),
      description: newEntry.description.trim(),
      date: new Date().toISOString(),
      user: 'Você',
    };

    setCustomEntries(prev => [entry, ...prev]);
    setNewEntry({ type: 'nota', title: '', description: '' });
    setShowAddForm(false);
  };

  const getTypeConfig = (type: string) => {
    const found = INTERACTION_TYPES.find(t => t.value === type);
    if (found) return found;
    return { value: type, label: type, color: 'slate', icon: '📋' };
  };

  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      nota: <FileText className="w-3.5 h-3.5" />,
      ligacao: <Phone className="w-3.5 h-3.5" />,
      email: <Mail className="w-3.5 h-3.5" />,
      visita: <MapPin className="w-3.5 h-3.5" />,
      reuniao: <MessageCircle className="w-3.5 h-3.5" />,
      venda: <ShoppingCart className="w-3.5 h-3.5" />,
      suporte: <Wrench className="w-3.5 h-3.5" />,
      whatsapp: <MessageCircle className="w-3.5 h-3.5" />,
      sistema: <Clock className="w-3.5 h-3.5" />,
    };
    return iconMap[type] || <FileText className="w-3.5 h-3.5" />;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      nota: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
      ligacao: 'bg-green-500/15 text-green-400 border-green-500/20',
      email: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
      visita: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
      reuniao: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
      venda: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      suporte: 'bg-red-500/15 text-red-400 border-red-500/20',
      whatsapp: 'bg-lime-500/15 text-lime-400 border-lime-500/20',
      sistema: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    };
    return colorMap[type] || 'bg-slate-500/15 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="space-y-5">
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-white">
            Histórico de {cliente.nome.split(' ')[0]}
          </h3>
          <span className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] text-slate-500 font-semibold">
            {filteredEntries.length} registro(s)
          </span>
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl text-xs cursor-pointer select-zed"
          >
            <option value="all">Todos os tipos</option>
            {INTERACTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
            <option value="sistema">📋 Sistema</option>
          </select>
          <FormButton
            variant="primary"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddForm ? 'Cancelar' : 'Nova Interação'}
          </FormButton>
        </div>
      </div>

      {/* ── Add Form ── */}
      {showAddForm && (
        <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
          <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">Nova Interação</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect
              label="Tipo"
              options={INTERACTION_TYPES.map(t => ({ value: t.value, label: `${t.icon} ${t.label}` }))}
              value={newEntry.type}
              onChange={(val) => setNewEntry(prev => ({ ...prev, type: val }))}
            />
            <FormInput
              label="Título"
              placeholder="Ex: Ligação para acompanhamento"
              value={newEntry.title}
              onChange={(val) => setNewEntry(prev => ({ ...prev, title: val }))}
              required
            />
          </div>
          <FormTextarea
            label="Descrição"
            placeholder="Detalhes da interação..."
            value={newEntry.description}
            onChange={(val) => setNewEntry(prev => ({ ...prev, description: val }))}
            rows={3}
          />
          <div className="flex justify-end">
            <FormButton size="sm" onClick={handleAddEntry} disabled={!newEntry.title.trim()}>
              <Send className="w-3.5 h-3.5" /> Registrar
            </FormButton>
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          message="Nenhum registro no histórico"
          description="Adicione interações para acompanhar o relacionamento com o cliente."
          action={{ label: 'Registrar Interação', onClick: () => setShowAddForm(true) }}
        />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-white/5" />

          <div className="space-y-1">
            {filteredEntries.map((entry, index) => {
              const isExpanded = expandedIds.has(entry.id);

              return (
                <div key={entry.id} className="relative pl-14">
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    getTypeColor(entry.type)
                  )}>
                    <div className="w-2 h-2 rounded-full bg-current" />
                  </div>

                  {/* Content */}
                  <div
                    className={cn(
                      'p-3.5 rounded-xl border transition-all duration-200 cursor-pointer',
                      entry.isSystem
                        ? 'bg-[#0d1117]/40 border-white/[0.03] hover:border-white/[0.06]'
                        : 'bg-[#0d1117]/60 border-white/5 hover:border-white/10'
                    )}
                    onClick={() => toggleExpand(entry.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={cn(
                          'flex-shrink-0 p-1.5 rounded-lg border',
                          getTypeColor(entry.type)
                        )}>
                          {getTypeIcon(entry.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{entry.title}</span>
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-[9px] font-bold border',
                              getTypeColor(entry.type)
                            )}>
                              {getTypeConfig(entry.type).label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500">
                              {formatDateTime(entry.date)}
                            </span>
                            <span className="text-[10px] text-slate-600">•</span>
                            <span className="text-[10px] text-slate-500">
                              {timeAgo(entry.date)}
                            </span>
                            {entry.user && (
                              <>
                                <span className="text-[10px] text-slate-600">•</span>
                                <span className="text-[10px] text-slate-400">{entry.user}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {entry.description && (
                        <button className="flex-shrink-0 text-slate-500">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {isExpanded && entry.description && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                          {entry.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoCliente;
