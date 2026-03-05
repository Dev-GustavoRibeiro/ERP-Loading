'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { permissaoService } from '../services/permissaoService';
import type { PerfilAcesso, Modulo } from '../domain';

// =====================================================
// Permissao Context
// =====================================================

interface PermissaoContextType {
  permissoes: Map<string, Set<string>>;
  perfil: PerfilAcesso | null;
  modulos: Modulo[];
  loading: boolean;
  hasPermission: (modulo: string, acao: string) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  refreshPermissoes: () => Promise<void>;
}

const PermissaoContext = createContext<PermissaoContextType | null>(null);

interface PermissaoProviderProps {
  children: ReactNode;
}

export function PermissaoProvider({ children }: PermissaoProviderProps) {
  const [permissoes, setPermissoes] = useState<Map<string, Set<string>>>(new Map());
  const [perfil, setPerfil] = useState<PerfilAcesso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [nivelPerfil, setNivelPerfil] = useState(0);

  const refreshPermissoes = useCallback(async () => {
    try {
      setLoading(true);

      // Carrega permissões
      const perms = await permissaoService.getUserPermissions();
      setPermissoes(perms);

      // Carrega módulos
      const mods = await permissaoService.getModulos();
      setModulos(mods);

      // Verifica nível do perfil
      const isAdmin = await permissaoService.isAdmin();
      const isSuperAdmin = await permissaoService.isSuperAdmin();
      setNivelPerfil(isSuperAdmin ? 5 : isAdmin ? 4 : 1);

    } catch (err) {
      console.error('Erro ao carregar permissões:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPermissoes();
  }, [refreshPermissoes]);

  const hasPermission = useCallback((modulo: string, acao: string): boolean => {
    // Super admin tem todas as permissões
    if (permissoes.has('*')) return true;

    // Verifica permissão específica
    return permissoes.get(modulo)?.has(acao) || false;
  }, [permissoes]);

  const isAdmin = useCallback((): boolean => {
    return nivelPerfil >= 4;
  }, [nivelPerfil]);

  const isSuperAdmin = useCallback((): boolean => {
    return nivelPerfil >= 5;
  }, [nivelPerfil]);

  const value: PermissaoContextType = {
    permissoes,
    perfil,
    modulos,
    loading,
    hasPermission,
    isAdmin,
    isSuperAdmin,
    refreshPermissoes
  };

  return (
    <PermissaoContext.Provider value={value}>
      {children}
    </PermissaoContext.Provider>
  );
}

export function usePermissao(): PermissaoContextType {
  const context = useContext(PermissaoContext);
  if (!context) {
    throw new Error('usePermissao deve ser usado dentro de um PermissaoProvider');
  }
  return context;
}

// Hook para verificar permissão específica
export function useHasPermission(modulo: string, acao: string): boolean {
  const { hasPermission, loading } = usePermissao();

  if (loading) return false;
  return hasPermission(modulo, acao);
}

// Componente para renderização condicional baseada em permissão
interface RequirePermissionProps {
  modulo: string;
  acao: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ modulo, acao, children, fallback = null }: RequirePermissionProps) {
  const hasPermission = useHasPermission(modulo, acao);

  if (!hasPermission) return <>{fallback}</>;
  return <>{children}</>;
}

// Componente para renderização condicional para admins
interface RequireAdminProps {
  children: ReactNode;
  fallback?: ReactNode;
  superOnly?: boolean;
}

export function RequireAdmin({ children, fallback = null, superOnly = false }: RequireAdminProps) {
  const { isAdmin, isSuperAdmin, loading } = usePermissao();

  if (loading) return null;

  const hasAccess = superOnly ? isSuperAdmin() : isAdmin();
  if (!hasAccess) return <>{fallback}</>;

  return <>{children}</>;
}
