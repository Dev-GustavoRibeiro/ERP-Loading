'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  Building2,
  Loader2,
  Check,
  LayoutGrid,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMinhasEmpresas } from '@/app/actions/empresas';
import type { Empresa } from '@/modules/core/domain';
import { setEmpresaId } from '@/shared/hooks/useEmpresaId';
import { cn } from '@/shared/lib/utils';

const GENERAL_OVERVIEW_ID = 'general-overview';

interface EmpresaSelectorProps {
  isOpen: boolean;
  onEmpresaChange?: (empresaId: string | null) => void;
  className?: string;
  isMobile?: boolean;
}

export const EmpresaSelector: React.FC<EmpresaSelectorProps> = ({ isOpen, onEmpresaChange, className, isMobile }) => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [isGeneralOverview, setIsGeneralOverview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load empresas
  const loadEmpresas = useCallback(async () => {
    try {
      // Buscar empresas via server action (ERP tenant DB)
      const result = await getMinhasEmpresas();

      const empresasData = (result.data || []) as Empresa[];
      setEmpresas(empresasData);

      const savedEmpresaId = localStorage.getItem('empresa_id');
      if (savedEmpresaId === GENERAL_OVERVIEW_ID) {
        setIsGeneralOverview(true);
        setSelectedEmpresa(null);
        onEmpresaChange?.(GENERAL_OVERVIEW_ID);
      } else if (savedEmpresaId) {
        const found = empresasData.find((e) => e.id === savedEmpresaId);
        if (found) {
          setSelectedEmpresa(found);
          setIsGeneralOverview(false);
          onEmpresaChange?.(found.id);
        } else if (empresasData.length > 0) {
          setSelectedEmpresa(empresasData[0]);
          setIsGeneralOverview(false);
          setEmpresaId(empresasData[0].id);
          onEmpresaChange?.(empresasData[0].id);
        }
      } else if (empresasData.length > 0) {
        setSelectedEmpresa(empresasData[0]);
        setIsGeneralOverview(false);
        setEmpresaId(empresasData[0].id);
        onEmpresaChange?.(empresasData[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  }, [onEmpresaChange]);

  useEffect(() => {
    loadEmpresas();
  }, [loadEmpresas]);

  const handleSelect = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setIsGeneralOverview(false);
    setEmpresaId(empresa.id);
    onEmpresaChange?.(empresa.id);
    setDropdownOpen(false);
    window.location.reload();
  };

  const handleSelectOverview = () => {
    setSelectedEmpresa(null);
    setIsGeneralOverview(true);
    setEmpresaId(GENERAL_OVERVIEW_ID);
    onEmpresaChange?.(GENERAL_OVERVIEW_ID);
    setDropdownOpen(false);
    window.location.reload();
  };

  // Collapsed state
  if (!isOpen) {
    return (
      <div className="px-3 py-3">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-xl mx-auto',
            'bg-gradient-to-br from-purple-500/10 to-violet-500/10',
            'border border-purple-500/20 hover:border-purple-500/40',
            'hover:shadow-lg hover:shadow-purple-500/10',
            'transition-all duration-300 group'
          )}
          title={isGeneralOverview ? 'Visão Geral' : (selectedEmpresa?.nome_fantasia || selectedEmpresa?.razao_social || 'Selecionar empresa')}
        >
          {isGeneralOverview ? (
            <LayoutGrid className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
          ) : (
            <Building2 className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 bg-white/10 rounded" />
            <div className="h-2 w-32 bg-white/5 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // No empresas found
  if (empresas.length === 0 && !loading) {
    return (
      <div className="px-4 py-3">
        <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-xl border border-amber-500/10">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Nenhuma empresa</span>
          </div>
          <p className="text-xs text-amber-200/60 leading-relaxed">
            Solicite o cadastro de uma nova empresa ao suporte técnico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", isMobile ? "px-0 py-0" : "px-4 py-3", className)}>
      {/* Selected empresa button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl text-left relative overflow-hidden',
          isMobile ? 'p-1.5' : 'p-3',
          'bg-gradient-to-br from-[#1a1f2e] to-[#111827]',
          'border transition-all duration-300 group',
          dropdownOpen
            ? 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
            : 'border-white/10 hover:border-purple-500/30'
        )}
      >
        {/* Active indicator glow */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent transition-opacity duration-300",
          dropdownOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )} />

        <div className={cn(
          "flex-shrink-0 rounded-lg flex items-center justify-center relative z-10 transition-all duration-300",
          isMobile ? "w-8 h-8" : "w-10 h-10",
          dropdownOpen ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30" : "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20"
        )}>
          {isGeneralOverview ? (
            <LayoutGrid className={cn(isMobile ? "w-4 h-4" : "w-5 h-5")} />
          ) : (
            <Building2 className={cn(isMobile ? "w-4 h-4" : "w-5 h-5")} />
          )}
        </div>

        <div className="flex-1 overflow-hidden relative z-10">
          <p className={cn(
            "text-sm font-medium truncate transition-colors",
            dropdownOpen ? "text-purple-100" : "text-slate-200 group-hover:text-white"
          )}>
            {isGeneralOverview ? 'Visão Geral' : (selectedEmpresa?.nome_fantasia || selectedEmpresa?.razao_social || 'Selecione')}
          </p>
          {!isGeneralOverview && selectedEmpresa && (
            <p className="text-xs text-slate-500 truncate mt-0.5 font-mono opacity-80 group-hover:opacity-100 transition-opacity">
              {selectedEmpresa.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
            </p>
          )}
          {isGeneralOverview && (
            <p className="text-xs text-purple-400/80 truncate mt-0.5">
              Todas as empresas
            </p>
          )}
        </div>

        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-500 transition-all duration-300 relative z-10',
            dropdownOpen ? 'rotate-180 text-purple-400' : 'group-hover:text-slate-300'
          )}
        />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={() => setDropdownOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                'absolute z-50 mt-2',
                isMobile ? 'fixed left-4 right-4 top-[70px] w-auto' : 'left-4 right-4 top-full',
                'bg-[#1a1f2e] border border-white/10 rounded-xl',
                'shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/5'
              )}
            >
              {/* General Overview Option */}
              <div className="p-2 border-b border-white/5 bg-white/[0.02]">
                <button
                  onClick={handleSelectOverview}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden',
                    isGeneralOverview
                      ? 'bg-purple-500/10 border border-purple-500/20'
                      : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    isGeneralOverview ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-400 group-hover:bg-purple-500/20 group-hover:text-purple-300'
                  )}>
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <p className={cn(
                      'text-sm font-medium transition-colors',
                      isGeneralOverview ? 'text-white' : 'text-slate-200 group-hover:text-white'
                    )}>Visão Geral</p>
                    <p className={cn(
                      "text-xs mt-0.5 transition-colors",
                      isGeneralOverview ? 'text-purple-300' : 'text-slate-500 group-hover:text-slate-400'
                    )}>Todas as empresas</p>
                  </div>
                  {isGeneralOverview && (
                    <motion.div layoutId="activeCheck" className="text-purple-400">
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </button>
              </div>

              {/* List Header */}
              <div className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-black/20">
                Empresas Disponíveis
              </div>

              {/* List */}
              <div className="py-2 max-h-[280px] overflow-y-auto scrollbar-none">
                {empresas.map((empresa) => {
                  const isSelected = selectedEmpresa?.id === empresa.id;
                  return (
                    <div
                      key={empresa.id}
                      className={cn(
                        'group flex items-center gap-2 px-2 mx-2 mb-0.5 rounded-lg transition-all duration-200',
                        isSelected ? 'bg-white/5' : 'hover:bg-white/5'
                      )}
                    >
                      <button
                        onClick={() => handleSelect(empresa)}
                        className="flex-1 flex items-center gap-3 py-2 px-2"
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                            isSelected
                              ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30'
                              : 'bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300'
                          )}
                        >
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-left overflow-hidden">
                          <p
                            className={cn(
                              'text-sm font-medium truncate transition-colors',
                              isSelected ? 'text-purple-300' : 'text-slate-300 group-hover:text-white'
                            )}
                          >
                            {empresa.nome_fantasia || empresa.razao_social}
                          </p>
                          <p className="text-xs text-slate-600 truncate font-mono mt-0.5 group-hover:text-slate-500">
                            {empresa.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
