'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/shared/components/atoms/Portal';
import {
  Users,
  UserPlus,
  Clock,
  Calendar,
  Award,
  Briefcase,
  Building2,
  Plus,
  X,
  Loader2,
  AlertCircle,
  BarChart3,
  GraduationCap,
  MessageSquare,
  Target,
  ThumbsUp,
  TrendingUp,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { PageTemplate, StatCardData, ModuleCardData, ActionButtonData } from '@/shared/components/templates';
import { cn } from '@/shared/lib/utils';
import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { HrPeopleModal } from '@/features/rh/components/HrPeopleModal';
import { HrOkrsModal } from '@/features/rh/components/HrOkrsModal';
import { HrPerformanceModal } from '@/features/rh/components/HrPerformanceModal';
import { HrOneOnOnesModal } from '@/features/rh/components/HrOneOnOnesModal';
import { HrFeedbackModal } from '@/features/rh/components/HrFeedbackModal';
import { HrDevelopmentModal } from '@/features/rh/components/HrDevelopmentModal';
import { HrSurveysModal } from '@/features/rh/components/HrSurveysModal';
import { HrSuccessionModal } from '@/features/rh/components/HrSuccessionModal';
import { HrAnalyticsModal } from '@/features/rh/components/HrAnalyticsModal';

// =====================================================
// Types
// =====================================================

interface Funcionario {
  id: string;
  nome: string;
  matricula: string;
  cpf: string;
  cargo_id: string;
  departamento_id: string;
  data_admissao: string;
  salario: number;
  ativo: boolean;
  email: string;
  celular: string;
}

interface Cargo {
  id: string;
  nome: string;
  salario_base: number;
}

interface Departamento {
  id: string;
  nome: string;
  codigo: string;
}

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

const Button: React.FC<{ children: React.ReactNode; variant?: 'primary' | 'secondary'; onClick?: () => void }> = ({ children, variant = 'primary', onClick }) => (
  <button onClick={onClick} className={cn("flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all", variant === 'primary' ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-[#252d3d] hover:bg-[#2d3548] text-white border border-white/10")}>
    {children}
  </button>
);

// =====================================================
// Modal Contents - Connected to Database
// =====================================================



const PlaceholderContent: React.FC<{ feature: string }> = ({ feature }) => (
  <EmptyState message={`Funcionalidade "${feature}" será conectada ao banco de dados em breve.`} />
);

// =====================================================
// Page Component
// =====================================================

type ModalType =
  | 'funcionarios' | 'cargos' | 'departamentos'
  | 'ponto' | 'ferias' | 'beneficios' | 'documentos'
  | 'novo' | 'okr' | 'performance' | 'one_on_one' | 'feedback' | 'development' | 'surveys' | 'succession' | 'analytics' | null;

export default function RHPage() {
  const empresaId = useEmpresaId();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [stats, setStats] = useState<StatCardData[]>([
    { title: 'Funcionários', value: '-', description: 'Ativos', trend: 0, icon: Users, color: 'pink' },
    { title: 'Cargos', value: '-', description: 'Cadastrados', trend: 0, icon: Briefcase, color: 'blue' },
    { title: 'Departamentos', value: '-', description: 'Ativos', trend: 0, icon: Building2, color: 'purple' },
  ]);

  const loadStats = useCallback(async () => {
    if (!empresaId) return;
    try {
      const [funcRes, cargosRes, deptosRes] = await Promise.all([
        supabase.from('hr_employees').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'active'),
        supabase.from('hr_roles_levels').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('hr_teams').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('active', true),
      ]);

      setStats([
        { title: 'Funcionários (Novo)', value: String(funcRes.count || 0), description: 'Ativos', trend: 4, icon: Users, color: 'pink' },
        { title: 'Cargos (Novo)', value: String(cargosRes.count || 0), description: 'Definidos', trend: 0, icon: Briefcase, color: 'blue' },
        { title: 'Departamentos (Novo)', value: String(deptosRes.count || 0), description: 'Ativos', trend: 2, icon: Building2, color: 'purple' },
      ]);
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    }
  }, [empresaId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const actionButtons: ActionButtonData[] = [
    { icon: UserPlus, label: 'Novo Funcionário', variant: 'primary', onClick: () => setActiveModal('novo') },
    { icon: Clock, label: 'Ponto', variant: 'secondary', onClick: () => setActiveModal('ponto') },
  ];

  const modules: ModuleCardData[] = [
    { icon: Users, label: 'Funcionários', description: 'Cadastro de colaboradores', color: 'pink', onClick: () => setActiveModal('funcionarios') },
    { icon: Briefcase, label: 'Cargos', description: 'Estrutura de cargos', color: 'purple', onClick: () => setActiveModal('cargos') },
    { icon: Building2, label: 'Departamentos', description: 'Organização hierárquica', color: 'cyan', onClick: () => setActiveModal('departamentos') },
    { icon: Target, label: 'OKRs', description: 'Metas e Objetivos', color: 'emerald', onClick: () => setActiveModal('okr') },
    { icon: BarChart3, label: 'Desempenho', description: 'Avaliações e Reviews', color: 'orange', onClick: () => setActiveModal('performance') },
    { icon: MessageSquare, label: '1:1s', description: 'Reuniões de Alinhamento', color: 'violet', onClick: () => setActiveModal('one_on_one') },
    { icon: ThumbsUp, label: 'Feedback', description: 'Elogios e Feedback', color: 'pink', onClick: () => setActiveModal('feedback') },
    { icon: TrendingUp, label: 'PDI', description: 'Plano de Desenvolvimento', color: 'blue', onClick: () => setActiveModal('development') },
    { icon: FileText, label: 'Pesquisas', description: 'Clima e Engajamento', color: 'cyan', onClick: () => setActiveModal('surveys') },
    { icon: ArrowUpRight, label: 'Sucessão', description: 'Mapa de Talentos', color: 'purple', onClick: () => setActiveModal('succession') },
    { icon: BarChart3, label: 'Analytics', description: 'Indicadores de RH', color: 'rose', onClick: () => setActiveModal('analytics') },
  ];

  const closeModal = () => setActiveModal(null);

  // Determine key for new components
  const isPeopleModalOpen = activeModal === 'funcionarios' || activeModal === 'cargos' || activeModal === 'departamentos' || activeModal === 'novo';
  const getPeopleModalTab = () => {
    if (activeModal === 'cargos') return 'roles';
    if (activeModal === 'departamentos') return 'teams';
    return 'employees';
  };

  return (
    <>
      <PageTemplate title="Recursos Humanos" subtitle="Gestão Estratégica de Pessoas" icon={Users} accentColor="pink" actionButtons={actionButtons} stats={stats} modules={{ title: 'Módulos RH', items: modules }} />

      {/* New HR Modals */}
      {isPeopleModalOpen && (
        <HrPeopleModal
          isOpen={true}
          onClose={closeModal}
          initialTab={getPeopleModalTab()}
        />
      )}

      {activeModal === 'okr' && (
        <HrOkrsModal isOpen={true} onClose={closeModal} />
      )}

      {activeModal === 'performance' && (
        <HrPerformanceModal isOpen={true} onClose={closeModal} />
      )}

      {activeModal === 'one_on_one' && ( // Changed from '1:1' to avoid syntax issues if any, checking module def
        <HrOneOnOnesModal isOpen={true} onClose={closeModal} />
      )}

      {activeModal === 'feedback' && (
        <HrFeedbackModal isOpen={true} onClose={closeModal} />
      )}

      {activeModal === 'development' && (
        <HrDevelopmentModal isOpen={true} onClose={closeModal} />
      )}

      {activeModal === 'surveys' && (
        <HrSurveysModal isOpen={true} onClose={closeModal} />
      )}

      {activeModal === 'succession' && (
        <HrSuccessionModal isOpen={true} onClose={closeModal} />
      )}

      {activeModal === 'analytics' && (
        <HrAnalyticsModal isOpen={true} onClose={closeModal} />
      )}

      {/* Legacy/Placeholder Modals */}
      <Modal isOpen={activeModal === 'ponto'} onClose={closeModal} title="Registro de Ponto" size="lg"><PlaceholderContent feature="Ponto" /></Modal>
    </>
  );
}
