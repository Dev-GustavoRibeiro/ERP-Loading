'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmpresaId } from './useEmpresaId';
import { useSupabaseAuth } from './useSupabaseAuth';
import { getUserPermissions, type UserPermissions } from '@/app/actions/userPermissions';

/**
 * Hook que busca as permissões granulares (módulos + features)
 * do usuário logado para a empresa selecionada.
 *
 * Retorna:
 * - permissions: objeto com módulos e features permitidos
 * - isLoading: estado de carregamento
 * - hasModule(key): verifica se o usuário tem acesso a um módulo
 * - hasFeature(key): verifica se o usuário pode visualizar uma feature
 * - canCreate(moduleKey, featureKey): verifica permissão de criação
 * - canEdit(moduleKey, featureKey): verifica permissão de edição
 * - canDelete(moduleKey, featureKey): verifica permissão de exclusão
 * - canExport(moduleKey, featureKey): verifica permissão de exportação
 * - refresh(): recarrega as permissões
 */
export const useUserModulePermissions = () => {
  const empresaId = useEmpresaId();
  const { user } = useSupabaseAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user?.id || !empresaId) {
      setPermissions(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await getUserPermissions(user.id, empresaId);
      setPermissions(data);
    } catch (error) {
      console.error('[useUserModulePermissions] Erro:', error);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, empresaId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasModule = useCallback(
    (moduleKey: string): boolean => {
      if (!permissions) return false;
      return permissions.allowedModuleKeys.includes(moduleKey);
    },
    [permissions]
  );

  const hasFeature = useCallback(
    (featureKey: string): boolean => {
      if (!permissions) return false;
      return permissions.allowedFeatureKeys.includes(featureKey);
    },
    [permissions]
  );

  const getFeaturePermission = useCallback(
    (moduleKey: string, featureKey: string) => {
      if (!permissions) return null;
      const mod = permissions.modulos.find((m) => m.module_key === moduleKey);
      if (!mod) return null;
      return mod.features.find((f) => f.feature_key === featureKey) || null;
    },
    [permissions]
  );

  const canCreate = useCallback(
    (moduleKey: string, featureKey: string): boolean => {
      const perm = getFeaturePermission(moduleKey, featureKey);
      return perm?.pode_criar ?? false;
    },
    [getFeaturePermission]
  );

  const canEdit = useCallback(
    (moduleKey: string, featureKey: string): boolean => {
      const perm = getFeaturePermission(moduleKey, featureKey);
      return perm?.pode_editar ?? false;
    },
    [getFeaturePermission]
  );

  const canDelete = useCallback(
    (moduleKey: string, featureKey: string): boolean => {
      const perm = getFeaturePermission(moduleKey, featureKey);
      return perm?.pode_excluir ?? false;
    },
    [getFeaturePermission]
  );

  const canExport = useCallback(
    (moduleKey: string, featureKey: string): boolean => {
      const perm = getFeaturePermission(moduleKey, featureKey);
      return perm?.pode_exportar ?? false;
    },
    [getFeaturePermission]
  );

  return {
    permissions,
    isLoading,
    hasModule,
    hasFeature,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    refresh: fetchPermissions,
  };
};
