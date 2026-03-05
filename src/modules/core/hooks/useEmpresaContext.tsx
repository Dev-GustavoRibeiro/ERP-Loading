'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { empresaService, filialService } from '../services/empresaService';
import { permissaoService } from '../services/permissaoService';
import type { Empresa, Filial, UsuarioEmpresa } from '../domain';

// =====================================================
// Empresa Context
// =====================================================

interface EmpresaContextType {
  empresaAtual: Empresa | null;
  filialAtual: Filial | null;
  empresas: Empresa[];
  filiais: Filial[];
  usuarioEmpresas: UsuarioEmpresa[];
  loading: boolean;
  error: string | null;
  setEmpresaAtual: (empresa: Empresa | null) => void;
  setFilialAtual: (filial: Filial | null) => void;
  trocarEmpresa: (empresaId: string) => Promise<void>;
  refreshEmpresas: () => Promise<void>;
}

const EmpresaContext = createContext<EmpresaContextType | null>(null);

interface EmpresaProviderProps {
  children: ReactNode;
}

export function EmpresaProvider({ children }: EmpresaProviderProps) {
  const [empresaAtual, setEmpresaAtual] = useState<Empresa | null>(null);
  const [filialAtual, setFilialAtual] = useState<Filial | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [usuarioEmpresas, setUsuarioEmpresas] = useState<UsuarioEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega empresas do usuário
  const refreshEmpresas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Busca vínculos do usuário com empresas
      const vinculos = await permissaoService.getUsuarioEmpresas();
      setUsuarioEmpresas(vinculos);

      // Extrai empresas únicas
      const empresasUnicas = vinculos
        .map(v => v.empresa)
        .filter((e, i, arr) => e && arr.findIndex(x => x?.id === e.id) === i) as Empresa[];
      setEmpresas(empresasUnicas);

      // Se não tem empresa selecionada, seleciona a padrão
      if (!empresaAtual && vinculos.length > 0) {
        const vinculoPadrao = vinculos.find(v => v.padrao) || vinculos[0];
        if (vinculoPadrao?.empresa) {
          setEmpresaAtual(vinculoPadrao.empresa);
          if (vinculoPadrao.filial) {
            setFilialAtual(vinculoPadrao.filial);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  }, [empresaAtual]);

  // Carrega filiais quando empresa muda
  useEffect(() => {
    if (empresaAtual) {
      filialService.listByEmpresa(empresaAtual.id, { filters: { ativo: true } })
        .then(result => setFiliais(result.data))
        .catch(err => console.error('Erro ao carregar filiais:', err));
    } else {
      setFiliais([]);
    }
  }, [empresaAtual]);

  // Carrega dados iniciais
  useEffect(() => {
    refreshEmpresas();
  }, [refreshEmpresas]);

  // Troca de empresa
  const trocarEmpresa = useCallback(async (empresaId: string) => {
    const empresa = empresas.find(e => e.id === empresaId);
    if (empresa) {
      setEmpresaAtual(empresa);
      setFilialAtual(null);

      // Busca filial matriz ou primeira filial
      try {
        const matriz = await filialService.getMatriz(empresaId);
        if (matriz) {
          setFilialAtual(matriz);
        } else {
          const result = await filialService.listByEmpresa(empresaId, { pageSize: 1 });
          if (result.data.length > 0) {
            setFilialAtual(result.data[0]);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar filial:', err);
      }
    }
  }, [empresas]);

  const value: EmpresaContextType = {
    empresaAtual,
    filialAtual,
    empresas,
    filiais,
    usuarioEmpresas,
    loading,
    error,
    setEmpresaAtual,
    setFilialAtual,
    trocarEmpresa,
    refreshEmpresas
  };

  return (
    <EmpresaContext.Provider value={value}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa(): EmpresaContextType {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error('useEmpresa deve ser usado dentro de um EmpresaProvider');
  }
  return context;
}

// Hook simplificado para obter empresa atual
export function useEmpresaAtual(): { empresa: Empresa | null; filial: Filial | null; loading: boolean } {
  const { empresaAtual, filialAtual, loading } = useEmpresa();
  return { empresa: empresaAtual, filial: filialAtual, loading };
}
