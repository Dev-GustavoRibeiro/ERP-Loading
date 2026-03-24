'use client';

import { useState, useEffect } from 'react';
import { useEmpresaId } from './useEmpresaId';
import { useSupabaseAuth } from './useSupabaseAuth';
import { getAllowedModules } from '@/app/actions/permissions';
import { getUserPermissions } from '@/app/actions/userPermissions';

/**
 * Hook que retorna os módulos permitidos para o usuário atual.
 *
 * Lógica de interseção:
 * 1. Aguarda auth carregar E empresaId estar disponível (evita fetches duplos)
 * 2. Busca módulos assinados pela empresa (admin_client_modules)
 * 3. Busca módulos atribuídos ao usuário (usuario_modulos no ERP)
 * 4. Se o usuário tem permissões granulares, faz a interseção
 * 5. Se o usuário é admin/owner (sem restrições no ERP), retorna todos os da empresa
 *
 * Módulos 'dashboard' e 'settings' são sempre incluídos.
 */
export const useAllowedModules = () => {
  const empresaId = useEmpresaId();
  const { user, isLoading: isAuthLoading } = useSupabaseAuth();
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Aguardar auth terminar E empresaId estar disponível antes de buscar.
    // Isso garante um único fetch com todos os dados prontos,
    // evitando o flash de "apenas Dashboard e Configurações".
    if (isAuthLoading || !empresaId) {
      return;
    }

    let cancelled = false;

    const fetchModules = async () => {
      setIsLoading(true);
      try {
        // 1) Módulos assinados pela empresa
        const { data: companyModules } = await getAllowedModules(empresaId);
        if (cancelled) return;

        const companyKeys: string[] = companyModules || [];

        // 2) Permissões granulares do usuário (se existirem)
        let finalModules: string[] = [...companyKeys];

        if (user?.id) {
          const { data: userPerms } = await getUserPermissions(user.id, empresaId);
          if (cancelled) return;

          if (userPerms && userPerms.allowedModuleKeys.length > 0) {
            // Interseção: só módulos que a empresa assinou E o usuário tem acesso
            finalModules = companyKeys.filter((key: string) =>
              userPerms.allowedModuleKeys.includes(key)
            );
          }
          // Se não tem permissões no ERP, é admin/owner → acesso total da empresa
        }

        // Garantir módulos essenciais
        if (!finalModules.includes('dashboard')) finalModules.push('dashboard');
        if (!finalModules.includes('settings')) finalModules.push('settings');

        if (!cancelled) setAllowedModules(finalModules);
      } catch (error) {
        console.error('Failed to fetch allowed modules', error);
        if (!cancelled) setAllowedModules(['dashboard', 'settings']);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchModules();

    return () => {
      cancelled = true;
    };
  }, [empresaId, user?.id, isAuthLoading]);

  return { allowedModules, isLoading };
};
