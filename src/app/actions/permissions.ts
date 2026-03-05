'use server';

import { createAdminServiceClient } from '@/shared/lib/supabase/admin.server';
import { getTenantClient } from '@/shared/lib/supabase/tenant.server';

/**
 * Server Action para buscar módulos permitidos para uma empresa.
 *
 * Fluxo:
 * 1. Recebe empresa_id do ERP (localStorage)
 * 2. Busca CNPJ da empresa no ERP DB
 * 3. Encontra o admin_cliente correspondente no ADMIN DB via CNPJ
 * 4. Busca módulos assinados via admin_client_modules
 *
 * Esse mapeamento é necessário porque o admin_clientes.id (ADMIN)
 * é diferente do empresas.id (ERP) — ambos representam a mesma entidade.
 */
export async function getAllowedModules(empresaId: string) {
  if (!empresaId) return { data: [] };

  try {
    const adminService = createAdminServiceClient();
    const tenant = getTenantClient('default');

    // 1) Buscar CNPJ da empresa no ERP (maybeSingle para não falhar com 0 rows)
    const { data: empresa, error: empError } = await tenant
      .from('empresas')
      .select('cnpj')
      .eq('id', empresaId)
      .maybeSingle();

    if (empError) {
      console.error('[Permissions] Erro ao buscar empresa no ERP:', empError);
      return { data: [] };
    }

    if (!empresa?.cnpj) {
      // Empresa não encontrada — pode ser ID stale no localStorage
      return { data: [] };
    }

    // 2) Encontrar admin_cliente correspondente via CNPJ
    const { data: adminClient, error: acError } = await adminService
      .from('admin_clientes')
      .select('id')
      .eq('cnpj', empresa.cnpj)
      .single();

    if (acError || !adminClient) {
      console.error('[Permissions] admin_cliente não encontrado para CNPJ:', empresa.cnpj);
      return { data: [] };
    }

    // 3) Buscar módulos vinculados ao admin_cliente
    const { data: clientModules, error } = await adminService
      .from('admin_client_modules')
      .select(`
        module_id,
        module:admin_modules (
          key
        )
      `)
      .eq('client_id', adminClient.id);

    if (error) {
      console.error('[Permissions] Erro ao buscar módulos:', error);
      return { error: error.message, data: [] };
    }

    if (!clientModules) return { data: [] };

    // Extrair chaves dos módulos
    const allowedKeys = clientModules
      .map((cm: any) => cm.module?.key)
      .filter(Boolean) as string[];

    return { data: allowedKeys };
  } catch (error: any) {
    console.error('[Permissions] Erro inesperado:', error);
    return { error: error.message, data: [] };
  }
}

/**
 * Resolve o admin_client_id a partir de um empresa_id do ERP.
 * Usa CNPJ como chave de mapeamento entre os dois bancos.
 *
 * @param empresaId - ID da empresa no ERP (tenant DB)
 * @returns admin_client_id do ADMIN DB, ou null se não encontrado
 */
export async function resolveAdminClientId(empresaId: string): Promise<string | null> {
  if (!empresaId) return null;

  try {
    const tenant = getTenantClient('default');
    const admin = createAdminServiceClient();

    // Buscar CNPJ no ERP (maybeSingle para não falhar com 0 rows)
    const { data: empresa } = await tenant
      .from('empresas')
      .select('cnpj')
      .eq('id', empresaId)
      .maybeSingle();

    if (!empresa?.cnpj) return null;

    // Buscar admin_cliente pelo CNPJ
    const { data: adminClient } = await admin
      .from('admin_clientes')
      .select('id')
      .eq('cnpj', empresa.cnpj)
      .single();

    return adminClient?.id || null;
  } catch {
    return null;
  }
}
