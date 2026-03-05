'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase do ADMIN para uso no browser.
 *
 * Usado EXCLUSIVAMENTE para:
 *  - Login / Signup / Logout (auth)
 *  - Leitura/escrita de profiles do usuário
 *  - Listener de estado de autenticação
 *
 * NUNCA use este client para acessar dados do ERP (clientes, vendas, etc.).
 * Dados do ERP devem ser acessados via server actions ou route handlers
 * utilizando getTenantClient() de tenant.server.ts.
 */
export function createAdminBrowserClient() {
  const url = process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window === 'undefined') {
      console.warn('[AdminBrowser] Variáveis NEXT_PUBLIC_ADMIN_SUPABASE_* não configuradas durante build');
    }
    throw new Error(
      'NEXT_PUBLIC_ADMIN_SUPABASE_URL e NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY são obrigatórios. ' +
      'Configure as variáveis de ambiente do projeto ADMIN.'
    );
  }

  return createBrowserClient(url, anonKey);
}
