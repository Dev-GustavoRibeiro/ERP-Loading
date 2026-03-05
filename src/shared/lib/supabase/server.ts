/**
 * Server client Supabase apontando para o ADMIN.
 *
 * Usado para:
 * - Validar sessão do usuário em route handlers e server actions
 * - Ler/escrever dados do ADMIN DB (profiles, memberships)
 *
 * Para dados do ERP (tenant), use getTenantClient() de tenant.server.ts.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorar quando chamado de Server Component.
            // O middleware se encarrega de manter a sessão atualizada.
          }
        },
      },
    }
  );
}
