import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// =====================================================
// Admin Server Client (cookie-based session)
// =====================================================

/**
 * Cria um client SSR do ADMIN com cookies para validar sessão do usuário.
 * Usar em Server Components, route handlers e server actions.
 */
export async function createAdminServerClient() {
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
            // Ignorar quando chamado de Server Component (read-only context).
            // O middleware se encarrega de manter a sessão atualizada.
          }
        },
      },
    }
  );
}

// =====================================================
// Admin Service Client (bypass RLS — server only)
// =====================================================

/**
 * Client ADMIN com service_role key. Bypass total de RLS.
 *
 * Usar APENAS em:
 *  - Criação/exclusão de auth users (admin.createUser, admin.deleteUser)
 *  - Operações administrativas no ADMIN DB
 *
 * NUNCA retornar ou expor este client ao frontend.
 */
export function createAdminServiceClient() {
  const url = process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL;
  const serviceKey = process.env.ADMIN_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'NEXT_PUBLIC_ADMIN_SUPABASE_URL e ADMIN_SUPABASE_SERVICE_ROLE_KEY são obrigatórios. ' +
      'Verifique as variáveis de ambiente do servidor.'
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =====================================================
// Helper: obter usuário autenticado ou lançar erro
// =====================================================

/**
 * Valida sessão ADMIN via cookies e retorna o usuário.
 * Lança erro se não autenticado.
 */
export async function getAdminUserOrThrow() {
  const client = await createAdminServerClient();
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    throw new Error('Não autorizado — sessão ADMIN inválida ou expirada.');
  }

  return user;
}
