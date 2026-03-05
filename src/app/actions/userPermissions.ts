'use server';

import { createAdminServiceClient } from '@/shared/lib/supabase/admin.server';
import { getTenantClient } from '@/shared/lib/supabase/tenant.server';
import { resolveAdminClientId } from '@/app/actions/permissions';

// =====================================================
// Tipos
// =====================================================

export interface UserFeaturePermission {
  feature_key: string;
  pode_visualizar: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  pode_exportar: boolean;
}

export interface UserModulePermission {
  module_key: string;
  features: UserFeaturePermission[];
}

export interface UserPermissions {
  userId: string;
  empresaId: string;
  modulos: UserModulePermission[];
  allowedModuleKeys: string[];
  allowedFeatureKeys: string[];
}

// =====================================================
// Server Action: buscar permissões do usuário no ERP
// =====================================================

/**
 * Busca os módulos e funcionalidades atribuídos a um usuário
 * em uma empresa específica no banco do ERP (tenant).
 *
 * Schema DB:
 *   usuario_modulos: user_id, empresa_id, modulo_codigo, pode_*
 *   usuario_funcionalidades: user_id, empresa_id, modulo_codigo, funcionalidade_codigo, pode_*
 */
export async function getUserPermissions(
  userId: string,
  empresaId: string
): Promise<{ data: UserPermissions | null; error?: string }> {
  if (!userId || !empresaId) {
    return { data: null, error: 'userId e empresaId são obrigatórios' };
  }

  try {
    const tenant = getTenantClient('default');

    // Buscar módulos do usuário (sem coluna ativo — se existir, está ativo)
    const { data: userModulos, error: umError } = await tenant
      .from('usuario_modulos')
      .select('*')
      .eq('user_id', userId)
      .eq('empresa_id', empresaId);

    if (umError) {
      console.error('[getUserPermissions] Erro modulos:', umError);
      return { data: null, error: umError.message };
    }

    // Buscar funcionalidades do usuário
    const { data: userFeatures, error: ufError } = await tenant
      .from('usuario_funcionalidades')
      .select('*')
      .eq('user_id', userId)
      .eq('empresa_id', empresaId);

    if (ufError) {
      console.error('[getUserPermissions] Erro features:', ufError);
      return { data: null, error: ufError.message };
    }

    // Montar estrutura agrupada (mapear modulo_codigo → module_key para interface)
    const modulos: UserModulePermission[] = (userModulos || []).map((um: any) => ({
      module_key: um.modulo_codigo,
      features: (userFeatures || [])
        .filter((uf: any) => uf.modulo_codigo === um.modulo_codigo)
        .map((uf: any) => ({
          feature_key: uf.funcionalidade_codigo,
          pode_visualizar: uf.pode_visualizar,
          pode_criar: uf.pode_criar,
          pode_editar: uf.pode_editar,
          pode_excluir: uf.pode_excluir,
          pode_exportar: uf.pode_exportar,
        })),
    }));

    const allowedModuleKeys = modulos.map((m) => m.module_key);
    const allowedFeatureKeys = modulos.flatMap((m) =>
      m.features
        .filter((f) => f.pode_visualizar)
        .map((f) => f.feature_key)
    );

    return {
      data: {
        userId,
        empresaId,
        modulos,
        allowedModuleKeys,
        allowedFeatureKeys,
      },
    };
  } catch (error: any) {
    console.error('[getUserPermissions] Erro inesperado:', error);
    return { data: null, error: error.message };
  }
}

// =====================================================
// Server Action: buscar módulos disponíveis (empresa)
// com features, para formulário de criação de usuário
// =====================================================

export async function getAvailableModulesWithFeatures(empresaId: string) {
  if (!empresaId) return { data: [] };

  try {
    const admin = createAdminServiceClient();

    // Resolver admin_client_id a partir do empresa_id do ERP
    const adminClientId = await resolveAdminClientId(empresaId);
    if (!adminClientId) {
      console.error('[getAvailableModules] Não foi possível resolver admin_client_id');
      return { data: [] };
    }

    // Módulos assinados
    const { data: clientModules, error: cmError } = await admin
      .from('admin_client_modules')
      .select(`
        module_id,
        module:admin_modules (
          id,
          key,
          name
        )
      `)
      .eq('client_id', adminClientId);

    if (cmError) {
      console.error('[getAvailableModules] Erro:', cmError);
      return { data: [], error: cmError.message };
    }

    if (!clientModules || clientModules.length === 0) {
      return { data: [] };
    }

    const moduleIds = clientModules.map((cm: any) => cm.module_id).filter(Boolean);

    // Features ativas
    const { data: features, error: fError } = await admin
      .from('admin_module_features')
      .select('id, module_id, key, name, description, ordem')
      .in('module_id', moduleIds)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (fError) {
      console.error('[getAvailableModules] Erro features:', fError);
      return { data: [], error: fError.message };
    }

    const result = clientModules.map((cm: any) => {
      const mod = cm.module as any;
      return {
        id: mod?.id,
        key: mod?.key,
        name: mod?.name,
        features: (features || [])
          .filter((f: any) => f.module_id === cm.module_id)
          .map((f: any) => ({
            id: f.id,
            key: f.key,
            name: f.name,
            description: f.description,
          })),
      };
    });

    return { data: result };
  } catch (error: any) {
    console.error('[getAvailableModules] Erro inesperado:', error);
    return { data: [], error: error.message };
  }
}
