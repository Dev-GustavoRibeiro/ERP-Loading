'use server';

import { getTenantClient } from '@/shared/lib/supabase/tenant.server';

/**
 * Server Action para buscar empresas ativas do ERP (tenant).
 *
 * Substitui a query client-side que antes usava createClient()
 * (que agora aponta para ADMIN DB onde a tabela empresas não existe).
 */
export async function getMinhasEmpresas() {
  try {
    const tenant = getTenantClient('default');

    const { data, error } = await tenant
      .from('empresas')
      .select('*')
      .eq('ativo', true)
      .order('razao_social');

    if (error) {
      console.error('[getMinhasEmpresas] Erro:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error: any) {
    console.error('[getMinhasEmpresas] Erro inesperado:', error);
    return { data: [], error: error.message };
  }
}
