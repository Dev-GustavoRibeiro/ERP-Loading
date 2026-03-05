'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/shared/components/atoms/Portal';
import {
  BarChart3,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  DollarSign,
  X,
  Loader2,
  AlertCircle,
  PieChart,
  Calendar,
} from 'lucide-react';
import { PageTemplate, StatCardData, ModuleCardData, ActionButtonData } from '@/shared/components/templates';
import { cn } from '@/shared/lib/utils';
import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { financeiroService } from '@/modules/financeiro/services/financeiroService';

// =====================================================
// Hooks & Utils
// =====================================================

import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
const supabase = createClient();

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
// UI Components
// =====================================================

const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
    <p className="text-slate-400">{message}</p>
  </div>
);

// =====================================================
// Modal Contents - Connected to Database
// =====================================================

interface ResumoGeralContentProps {
  empresaId: string | null;
}

const ResumoGeralContent: React.FC<ResumoGeralContentProps> = ({ empresaId }) => {
  const [data, setData] = useState<{ totalClientes: number; totalProdutos: number; totalVendas: number; totalReceber: number; totalPagar: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!empresaId) { setLoading(false); return; }
      try {
        const [clientesRes, produtosRes, vendasRes] = await Promise.all([
          supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
          supabase.from('produtos').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
          supabase.from('vendas').select('id, total').eq('empresa_id', empresaId),
        ]);

        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

        const resumo = await financeiroService.getResumoFinanceiro(empresaId, inicioMes, fimMes);

        setData({
          totalClientes: clientesRes.count || 0,
          totalProdutos: produtosRes.count || 0,
          totalVendas: vendasRes.data?.length || 0,
          totalReceber: resumo.total_receber || 0,
          totalPagar: resumo.total_pagar || 0,
        });
      } catch (error) {
        console.error('Erro ao carregar resumo:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [empresaId]);

  if (!empresaId) return <EmptyState message="Selecione uma empresa" />;
  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-[#252d3d]/50 rounded-lg text-center">
          <Users className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{data?.totalClientes || 0}</p>
          <p className="text-sm text-slate-400">Clientes</p>
        </div>
        <div className="p-4 bg-[#252d3d]/50 rounded-lg text-center">
          <Package className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{data?.totalProdutos || 0}</p>
          <p className="text-sm text-slate-400">Produtos</p>
        </div>
        <div className="p-4 bg-[#252d3d]/50 rounded-lg text-center">
          <DollarSign className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{data?.totalVendas || 0}</p>
          <p className="text-sm text-slate-400">Vendas</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <p className="text-sm text-slate-400">A Receber</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">R$ {(data?.totalReceber || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <p className="text-sm text-slate-400">A Pagar</p>
          </div>
          <p className="text-2xl font-bold text-red-400">R$ {(data?.totalPagar || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    </div>
  );
};

const VendasContent: React.FC<{ empresaId: string | null }> = ({ empresaId }) => {
  const [data, setData] = useState<{
    vendasPeriodo: { mes: string; total: number; quantidade: number }[];
    topProdutos: { nome: string; quantidade: number; total: number }[];
    totalGeral: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'ano'>('mes');

  useEffect(() => {
    const load = async () => {
      if (!empresaId) { setLoading(false); return; }
      try {
        const hoje = new Date();
        let dataInicio: Date;

        switch (periodo) {
          case 'trimestre':
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
            break;
          case 'ano':
            dataInicio = new Date(hoje.getFullYear(), 0, 1);
            break;
          default:
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        }

        const { data: vendas } = await supabase
          .from('vendas')
          .select('id, data_emissao, total, status')
          .eq('empresa_id', empresaId)
          .gte('data_emissao', dataInicio.toISOString().split('T')[0])
          .eq('status', 'finalizada');

        const { data: itens } = await supabase
          .from('venda_itens')
          .select(`
            quantidade, 
            total,
            produto:produtos(nome)
          `)
          .eq('empresa_id', empresaId);

        // Agrupar vendas por mês
        const vendasPorMes: { [key: string]: { total: number; quantidade: number } } = {};
        vendas?.forEach(v => {
          const mes = new Date(v.data_emissao).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          if (!vendasPorMes[mes]) vendasPorMes[mes] = { total: 0, quantidade: 0 };
          vendasPorMes[mes].total += v.total || 0;
          vendasPorMes[mes].quantidade += 1;
        });

        // Top produtos
        const produtosMap: { [key: string]: { quantidade: number; total: number } } = {};
        itens?.forEach(i => {
          const nome = (i.produto as any)?.nome || 'Produto';
          if (!produtosMap[nome]) produtosMap[nome] = { quantidade: 0, total: 0 };
          produtosMap[nome].quantidade += i.quantidade || 0;
          produtosMap[nome].total += i.total || 0;
        });

        const topProdutos = Object.entries(produtosMap)
          .map(([nome, dados]) => ({ nome, ...dados }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        setData({
          vendasPeriodo: Object.entries(vendasPorMes).map(([mes, dados]) => ({ mes, ...dados })),
          topProdutos,
          totalGeral: vendas?.reduce((acc, v) => acc + (v.total || 0), 0) || 0
        });
      } catch (error) {
        console.error('Erro ao carregar vendas:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [empresaId, periodo]);

  if (!empresaId) return <EmptyState message="Selecione uma empresa" />;
  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {['mes', 'trimestre', 'ano'].map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p as any)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              periodo === p ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            {p === 'mes' ? 'Este Mês' : p === 'trimestre' ? 'Trimestre' : 'Ano'}
          </button>
        ))}
      </div>

      <div className="p-4 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-lg border border-purple-500/20">
        <p className="text-sm text-slate-400 mb-1">Total de Vendas no Período</p>
        <p className="text-3xl font-bold text-white">
          R$ {(data?.totalGeral || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Vendas por Período</h3>
        <div className="space-y-2">
          {(data?.vendasPeriodo || []).map((v, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="text-white">{v.mes}</span>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-medium">R$ {v.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-400">{v.quantidade} vendas</p>
              </div>
            </div>
          ))}
          {(!data?.vendasPeriodo || data.vendasPeriodo.length === 0) && (
            <p className="text-center text-slate-500 py-4">Nenhuma venda no período</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Top 5 Produtos</h3>
        <div className="space-y-2">
          {(data?.topProdutos || []).map((p, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">{i + 1}</span>
                <span className="text-white truncate max-w-[200px]">{p.nome}</span>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-medium">R$ {p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-400">{p.quantidade} un.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ComissoesContent: React.FC<{ empresaId: string | null }> = ({ empresaId }) => {
  const [data, setData] = useState<{
    vendedores: { id: string; nome: string; vendas: number; comissao: number }[];
    totalComissoes: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!empresaId) { setLoading(false); return; }
      try {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];

        const { data: comissoes } = await supabase
          .from('comissoes')
          .select(`
            valor,
            vendedor:vendedores(id, nome)
          `)
          .eq('empresa_id', empresaId)
          .gte('data_venda', inicioMes);

        // Agrupar por vendedor
        const vendedorMap: { [key: string]: { nome: string; vendas: number; comissao: number } } = {};
        comissoes?.forEach(c => {
          const vendedor = c.vendedor as any;
          if (!vendedor?.id) return;
          if (!vendedorMap[vendedor.id]) {
            vendedorMap[vendedor.id] = { nome: vendedor.nome || 'Vendedor', vendas: 0, comissao: 0 };
          }
          vendedorMap[vendedor.id].vendas += 1;
          vendedorMap[vendedor.id].comissao += c.valor || 0;
        });

        const vendedores = Object.entries(vendedorMap)
          .map(([id, dados]) => ({ id, ...dados }))
          .sort((a, b) => b.comissao - a.comissao);

        setData({
          vendedores,
          totalComissoes: vendedores.reduce((acc, v) => acc + v.comissao, 0)
        });
      } catch (error) {
        console.error('Erro ao carregar comissões:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [empresaId]);

  if (!empresaId) return <EmptyState message="Selecione uma empresa" />;
  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-lg border border-emerald-500/20">
        <p className="text-sm text-slate-400 mb-1">Total de Comissões (Este Mês)</p>
        <p className="text-3xl font-bold text-emerald-400">
          R$ {(data?.totalComissoes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Ranking de Vendedores</h3>
        <div className="space-y-2">
          {(data?.vendedores || []).map((v, i) => (
            <div key={v.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={cn(
                  'w-6 h-6 rounded-full text-white text-xs flex items-center justify-center',
                  i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-slate-600'
                )}>{i + 1}</span>
                <span className="text-white">{v.nome}</span>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-medium">R$ {v.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-400">{v.vendas} vendas</p>
              </div>
            </div>
          ))}
          {(!data?.vendedores || data.vendedores.length === 0) && (
            <p className="text-center text-slate-500 py-4">Nenhuma comissão no período</p>
          )}
        </div>
      </div>
    </div>
  );
};

const PlaceholderContent: React.FC<{ feature: string }> = ({ feature }) => (
  <EmptyState message={`Relatório "${feature}" será implementado em breve. Os dados serão carregados do banco de dados.`} />
);

// =====================================================
// Page Component
// =====================================================

type ModalType = 'resumo' | 'vendas' | 'comissoes' | 'financeiro' | 'estoque' | 'clientes' | 'fiscal' | 'rh' | 'personalizado' | null;

export default function RelatoriosPage() {
  const empresaId = useEmpresaId();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [stats, setStats] = useState<StatCardData[]>([
    { title: 'Relatórios', value: '9', description: 'Disponíveis', trend: 0, icon: BarChart3, color: 'indigo' },
    { title: 'Exportações', value: '-', description: 'Este mês', trend: 0, icon: Download, color: 'blue' },
    { title: 'Agendados', value: '-', description: 'Automáticos', trend: 0, icon: Calendar, color: 'purple' },
  ]);

  const loadStats = useCallback(async () => {
    // Stats for reports page
    setStats([
      { title: 'Relatórios', value: '9', description: 'Disponíveis', trend: 0, icon: BarChart3, color: 'indigo' },
      { title: 'Exportações', value: '0', description: 'Este mês', trend: 5, icon: Download, color: 'blue' },
      { title: 'Agendados', value: '0', description: 'Automáticos', trend: 0, icon: Calendar, color: 'purple' },
    ]);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const actionButtons: ActionButtonData[] = [
    { icon: BarChart3, label: 'Resumo Geral', variant: 'primary', onClick: () => setActiveModal('resumo') },
    { icon: Download, label: 'Exportar', variant: 'secondary', onClick: () => setActiveModal('personalizado') },
  ];

  const modules: ModuleCardData[] = [
    { icon: BarChart3, label: 'Resumo Geral', description: 'Visão consolidada de clientes, produtos, vendas e situação financeira', color: 'indigo', onClick: () => setActiveModal('resumo') },
    { icon: TrendingUp, label: 'Vendas', description: 'Análise de vendas por período, top produtos e evolução de faturamento', color: 'emerald', onClick: () => setActiveModal('vendas') },
    { icon: Users, label: 'Comissões', description: 'Dashboard de comissões por vendedor e ranking de desempenho', color: 'amber', onClick: () => setActiveModal('comissoes') },
    { icon: DollarSign, label: 'Financeiro', description: 'Relatórios de contas a pagar, receber e fluxo de caixa', color: 'emerald', onClick: () => setActiveModal('financeiro') },
    { icon: Package, label: 'Estoque', description: 'Análise de movimentação, giro e posição de estoque', color: 'blue', onClick: () => setActiveModal('estoque') },
    { icon: Users, label: 'Clientes', description: 'Relatórios de base de clientes, inadimplência e faturamento por cliente', color: 'cyan', onClick: () => setActiveModal('clientes') },
    { icon: FileText, label: 'Fiscal', description: 'Consultas fiscais, apuração de impostos e obrigações acessórias', color: 'purple', onClick: () => setActiveModal('fiscal') },
    { icon: Users, label: 'RH', description: 'Relatórios de folha, turnover, headcount e desempenho da equipe', color: 'pink', onClick: () => setActiveModal('rh') },
    { icon: PieChart, label: 'Personalizado', description: 'Crie relatórios customizados com filtros e colunas escolhidas', color: 'orange', onClick: () => setActiveModal('personalizado') },
  ];

  const closeModal = () => setActiveModal(null);

  return (
    <>
      <PageTemplate title="Relatórios" subtitle="Análises e insights do seu negócio" icon={BarChart3} accentColor="indigo" actionButtons={actionButtons} stats={stats} modules={{ title: 'Módulos Principais', items: modules }} />

      <Modal isOpen={activeModal === 'resumo'} onClose={closeModal} title="Resumo Geral" size="lg"><ResumoGeralContent empresaId={empresaId} /></Modal>
      <Modal isOpen={activeModal === 'vendas'} onClose={closeModal} title="Relatórios de Vendas" size="lg"><VendasContent empresaId={empresaId} /></Modal>
      <Modal isOpen={activeModal === 'comissoes'} onClose={closeModal} title="Dashboard de Comissões" size="lg"><ComissoesContent empresaId={empresaId} /></Modal>
      <Modal isOpen={activeModal === 'financeiro'} onClose={closeModal} title="Relatórios Financeiros" size="lg"><PlaceholderContent feature="Financeiro" /></Modal>
      <Modal isOpen={activeModal === 'estoque'} onClose={closeModal} title="Relatórios de Estoque" size="lg"><PlaceholderContent feature="Estoque" /></Modal>
      <Modal isOpen={activeModal === 'clientes'} onClose={closeModal} title="Relatórios de Clientes" size="lg"><PlaceholderContent feature="Clientes" /></Modal>
      <Modal isOpen={activeModal === 'fiscal'} onClose={closeModal} title="Relatórios Fiscais" size="lg"><PlaceholderContent feature="Fiscal" /></Modal>
      <Modal isOpen={activeModal === 'rh'} onClose={closeModal} title="Relatórios de RH" size="lg"><PlaceholderContent feature="RH" /></Modal>
      <Modal isOpen={activeModal === 'personalizado'} onClose={closeModal} title="Relatório Personalizado" size="lg"><PlaceholderContent feature="Personalizado" /></Modal>
    </>
  );
}
