/**
 * Client Supabase para uso no browser.
 *
 * IMPORTANTE — MIGRAÇÃO MULTI-TENANT:
 * Este client agora aponta para o projeto ADMIN (auth + identity).
 * É usado pelos hooks de autenticação (useSupabaseAuth, useUserProfile).
 *
 * Módulos do ERP que faziam queries client-side (empresaService, clienteService, etc.)
 * devem ser migrados para server actions usando getTenantClient() de tenant.server.ts.
 * Durante a migração, esses módulos podem temporariamente usar createLegacyTenantClient().
 */

import { createBrowserClient } from '@supabase/ssr';
import { createAdminBrowserClient } from './admin.browser';

/**
 * @returns Browser client apontando para o ADMIN Supabase.
 * Usado para auth e profiles.
 */
export function createClient() {
  return createAdminBrowserClient();
}

/**
 * Client browser LEGACY para dados do ERP (tenant).
 *
 * Usa as variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 * que apontam para o banco do tenant (dados do ERP).
 *
 * NOTA: Este client é TEMPORÁRIO. Quando todos os módulos do ERP forem
 * migrados para server actions com getTenantClient(), este client será removido.
 */
export function createLegacyTenantClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window === 'undefined') {
      console.warn('[LegacyTenant] Variáveis NEXT_PUBLIC_SUPABASE_* não configuradas durante build');
    }
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios ' +
      'para acessar dados do ERP no browser. Configure as variáveis do tenant.'
    );
  }

  return createBrowserClient(url, anonKey);
}
