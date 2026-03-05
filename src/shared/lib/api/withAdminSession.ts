import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

// =====================================================
// Tipos
// =====================================================

export interface AdminSessionContext {
  adminUser: User;
  request: NextRequest;
}

type HandlerFn = (ctx: AdminSessionContext) => Promise<NextResponse>;

// =====================================================
// Wrapper de Sessão ADMIN
// =====================================================

/**
 * Higher-order function que valida a sessão ADMIN via @supabase/ssr (cookie-based)
 * e injeta `adminUser` no contexto do handler.
 *
 * Uso:
 * ```ts
 * export const GET = withAdminSession(async ({ adminUser, request }) => {
 *   // adminUser está garantido como autenticado
 *   return NextResponse.json({ userId: adminUser.id });
 * });
 * ```
 */
export function withAdminSession(handler: HandlerFn) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const url = process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json(
        { error: 'Configuração ADMIN Supabase ausente no servidor' },
        { status: 500 }
      );
    }

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Read-only em route handlers — middleware cuida do refresh
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Não autorizado — sessão ADMIN inválida ou expirada' },
        { status: 401 }
      );
    }

    return handler({ adminUser: user, request });
  };
}
