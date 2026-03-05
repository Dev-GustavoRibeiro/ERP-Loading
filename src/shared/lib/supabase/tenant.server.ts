import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// Tipos
// =====================================================

interface TenantConfig {
  url: string;
  serviceKey: string;
}

type TenantsMap = Record<string, TenantConfig>;

// =====================================================
// Cache do mapa de tenants
// =====================================================

let _tenantsMap: TenantsMap | null = null;

function getTenantsMap(): TenantsMap {
  if (_tenantsMap) return _tenantsMap;

  const json = process.env.TENANTS_JSON;
  if (!json) {
    throw new Error(
      'TENANTS_JSON é obrigatório (variável de ambiente server-only). ' +
      'Formato: {"slug": {"url": "...", "serviceKey": "..."}}'
    );
  }

  try {
    _tenantsMap = JSON.parse(json) as TenantsMap;
    return _tenantsMap;
  } catch {
    throw new Error(
      'TENANTS_JSON deve ser um JSON válido. ' +
      'Formato: {"slug": {"url": "...", "serviceKey": "..."}}'
    );
  }
}

// =====================================================
// Tenant Client Factory
// =====================================================

/**
 * Retorna um SupabaseClient para o tenant especificado.
 *
 * Usa service_role key — bypass total de RLS.
 * Todas as queries de dados do ERP devem usar este client.
 *
 * REGRAS:
 * - Esta função NUNCA pode ser importada em Client Components.
 * - O import de 'server-only' garante isso em build time.
 * - Em cada write, salvar created_by_admin_user_id = adminUser.id no registro.
 *
 * @param tenantSlug - Slug do tenant (ex: "cliente1", "default")
 */
export function getTenantClient(tenantSlug: string): SupabaseClient {
  const tenantsMap = getTenantsMap();
  const config = tenantsMap[tenantSlug];

  if (!config) {
    throw new Error(
      `Tenant "${tenantSlug}" não encontrado em TENANTS_JSON. ` +
      `Slugs disponíveis: ${Object.keys(tenantsMap).join(', ')}`
    );
  }

  if (!config.url || !config.serviceKey) {
    throw new Error(
      `Configuração incompleta para tenant "${tenantSlug}". ` +
      'Necessário: { "url": "...", "serviceKey": "..." }'
    );
  }

  return createClient(config.url, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Retorna todos os slugs de tenant configurados.
 */
export function getTenantSlugs(): string[] {
  return Object.keys(getTenantsMap());
}

/**
 * Verifica se um slug de tenant existe na configuração.
 */
export function isTenantValid(tenantSlug: string): boolean {
  const tenantsMap = getTenantsMap();
  return tenantSlug in tenantsMap;
}
