'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/shared/components/atoms/Portal';
import {
  Wrench,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Car,
  X,
  Loader2,
  Calendar,
  DollarSign,
  Play,
  Pause,
  Package,
  FileText
} from 'lucide-react';
import { PageTemplate, StatCardData, ActionButtonData } from '@/shared/components/templates';
import { cn } from '@/shared/lib/utils';
import { osService } from '@/modules/os/services/osService';
import type { OrdemServico, CreateOrdemServicoDTO } from '@/modules/os/domain';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';

// =====================================================
// Modal Component
// =====================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full p-4", sizeClasses[size])}>
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-none">{children}</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

// =====================================================
// Status Badge
// =====================================================

const StatusBadge: React.FC<{ status: OrdemServico['status'] }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    aberta: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <Clock className="w-3 h-3" /> },
    em_andamento: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Play className="w-3 h-3" /> },
    pausada: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: <Pause className="w-3 h-3" /> },
    concluida: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: <CheckCircle className="w-3 h-3" /> },
    cancelada: { bg: 'bg-red-500/20', text: 'text-red-400', icon: <X className="w-3 h-3" /> },
    entregue: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: <CheckCircle className="w-3 h-3" /> },
  };

  const { bg, text, icon } = config[status] || config.aberta;
  const labels: Record<string, string> = {
    aberta: 'Aberta', em_andamento: 'Em Andamento', pausada: 'Pausada',
    concluida: 'Concluída', cancelada: 'Cancelada', entregue: 'Entregue'
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', bg, text)}>
      {icon} {labels[status] || status}
    </span>
  );
};

// =====================================================
// Forms
// =====================================================

interface NovaOSFormProps {
  onSubmit: (dto: CreateOrdemServicoDTO) => Promise<void>;
  onClose: () => void;
}

const NovaOSForm: React.FC<NovaOSFormProps> = ({ onSubmit, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateOrdemServicoDTO>({
    tipo: 'manutencao',
    prioridade: 'normal'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Tipo</label>
          <select
            value={form.tipo}
            onChange={e => setForm({ ...form, tipo: e.target.value as any })}
            className="w-full px-3 py-2 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl select-zed"
          >
            <option value="manutencao">Manutenção</option>
            <option value="instalacao">Instalação</option>
            <option value="reparo">Reparo</option>
            <option value="assistencia">Assistência Técnica</option>
            <option value="outros">Outros</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Prioridade</label>
          <select
            value={form.prioridade}
            onChange={e => setForm({ ...form, prioridade: e.target.value as any })}
            className="w-full px-3 py-2 bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all rounded-xl select-zed"
          >
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Nome do Contato</label>
        <input
          type="text"
          value={form.contato_nome || ''}
          onChange={e => setForm({ ...form, contato_nome: e.target.value })}
          className="w-full px-3 py-2 bg-[#252d3d] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
          placeholder="Nome do cliente ou contato"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Telefone</label>
        <input
          type="tel"
          value={form.contato_telefone || ''}
          onChange={e => setForm({ ...form, contato_telefone: e.target.value })}
          className="w-full px-3 py-2 bg-[#252d3d] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
          placeholder="(00) 00000-0000"
        />
      </div>

      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Car className="w-4 h-4" /> Equipamento / Veículo
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Tipo</label>
            <input
              type="text"
              value={form.equipamento_tipo || ''}
              onChange={e => setForm({ ...form, equipamento_tipo: e.target.value })}
              className="w-full px-3 py-2 bg-[#252d3d] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
              placeholder="Ex: Veículo, Ar Condicionado..."
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Marca</label>
            <input
              type="text"
              value={form.equipamento_marca || ''}
              onChange={e => setForm({ ...form, equipamento_marca: e.target.value })}
              className="w-full px-3 py-2 bg-[#252d3d] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Modelo</label>
            <input
              type="text"
              value={form.equipamento_modelo || ''}
              onChange={e => setForm({ ...form, equipamento_modelo: e.target.value })}
              className="w-full px-3 py-2 bg-[#252d3d] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Placa / Série</label>
            <input
              type="text"
              value={form.equipamento_placa || form.equipamento_serie || ''}
              onChange={e => setForm({ ...form, equipamento_placa: e.target.value })}
              className="w-full px-3 py-2 bg-[#252d3d] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Descrição do Problema</label>
        <textarea
          value={form.descricao_problema || ''}
          onChange={e => setForm({ ...form, descricao_problema: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none"
          placeholder="Descreva o problema ou serviço solicitado..."
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Criar OS
        </button>
      </div>
    </form>
  );
};

// =====================================================
// OS Card Component
// =====================================================

interface OSCardProps {
  os: OrdemServico;
  onClick: () => void;
}

const OSCard: React.FC<OSCardProps> = ({ os, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="p-4 bg-[#252d3d]/50 rounded-xl border border-white/5 hover:border-purple-500/30 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-medium">OS #{os.numero}</p>
          <p className="text-sm text-slate-400">{os.contato_nome || os.cliente?.nome || 'Sem cliente'}</p>
        </div>
        <StatusBadge status={os.status} />
      </div>

      {os.equipamento_modelo && (
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <Car className="w-4 h-4" />
          <span>{os.equipamento_marca} {os.equipamento_modelo}</span>
          {os.equipamento_placa && <span className="text-purple-400">({os.equipamento_placa})</span>}
        </div>
      )}

      {os.descricao_problema && (
        <p className="text-sm text-slate-500 truncate mb-3">{os.descricao_problema}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="w-3 h-3" />
          <span>{new Date(os.data_abertura).toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 font-medium">
            R$ {os.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// =====================================================
// Page Component
// =====================================================

export default function OrdemServicoPage() {
  const empresaId = useEmpresaId();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovaOS, setShowNovaOS] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [stats, setStats] = useState<StatCardData[]>([
    { title: 'Abertas', value: '0', description: 'Aguardando', trend: 0, icon: Clock, color: 'blue' },
    { title: 'Em Andamento', value: '0', description: 'Em execução', trend: 0, icon: Play, color: 'amber' },
    { title: 'Concluídas', value: '0', description: 'Este mês', trend: 0, icon: CheckCircle, color: 'emerald' },
    { title: 'Valor Total', value: 'R$ 0', description: 'Em OS abertas', trend: 0, icon: DollarSign, color: 'cyan' },
  ]);

  const loadData = useCallback(async () => {
    if (!empresaId) return;

    setLoading(true);
    try {
      const [ordemResult, dashboard] = await Promise.all([
        osService.listOS(empresaId, { status: filtroStatus || undefined }),
        osService.getDashboard(empresaId)
      ]);

      setOrdens(ordemResult.data);
      setStats([
        { title: 'Abertas', value: dashboard.abertas.toString(), description: 'Aguardando', trend: 5, icon: Clock, color: 'blue' },
        { title: 'Em Andamento', value: dashboard.emAndamento.toString(), description: 'Em execução', trend: 3, icon: Play, color: 'amber' },
        { title: 'Concluídas (mês)', value: dashboard.concluidas.toString(), description: 'Este mês', trend: 22, icon: CheckCircle, color: 'emerald' },
        { title: 'Valor Total', value: `R$ ${dashboard.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, description: 'Em OS', trend: 14, icon: DollarSign, color: 'cyan' },
      ]);
    } catch (error) {
      console.error('Erro ao carregar OS:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, filtroStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNovaOS = async (dto: CreateOrdemServicoDTO) => {
    if (!empresaId) return;

    const result = await osService.createOS(empresaId, dto);
    if (result.success) {
      setShowNovaOS(false);
      loadData();
    }
  };

  const ordensFiltradas = ordens.filter(os => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      os.numero?.toLowerCase().includes(termo) ||
      os.contato_nome?.toLowerCase().includes(termo) ||
      os.equipamento_modelo?.toLowerCase().includes(termo) ||
      os.equipamento_placa?.toLowerCase().includes(termo)
    );
  });

  const actionButtons: ActionButtonData[] = [
    { icon: Plus, label: 'Nova OS', variant: 'primary', onClick: () => setShowNovaOS(true) },
  ];

  return (
    <>
      <PageTemplate
        title="Ordens de Serviço"
        subtitle="Gerenciamento de serviços e manutenções"
        icon={Wrench}
        accentColor="cyan"
        actionButtons={actionButtons}
        stats={stats}
      />

      <div className="px-6 py-4">
        {/* Filtros */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por número, cliente, equipamento..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
            />
          </div>

          <div className="flex gap-2">
            {['', 'aberta', 'em_andamento', 'concluida'].map(status => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  filtroStatus === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
              >
                {status === '' ? 'Todas' : status === 'aberta' ? 'Abertas' : status === 'em_andamento' ? 'Em Andamento' : 'Concluídas'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de OS */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : ordensFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="w-12 h-12 text-slate-500 mb-4" />
            <p className="text-slate-400">Nenhuma ordem de serviço encontrada</p>
            <button
              onClick={() => setShowNovaOS(true)}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Criar primeira OS
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ordensFiltradas.map(os => (
              <OSCard key={os.id} os={os} onClick={() => { }} />
            ))}
          </div>
        )}
      </div>

      {/* Modal Nova OS */}
      <Modal isOpen={showNovaOS} onClose={() => setShowNovaOS(false)} title="Nova Ordem de Serviço" size="lg">
        <NovaOSForm onSubmit={handleNovaOS} onClose={() => setShowNovaOS(false)} />
      </Modal>
    </>
  );
}
