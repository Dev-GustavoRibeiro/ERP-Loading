import { updateSession } from '@/shared/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

/**
 * Middleware principal do Next.js.
 *
 * Delega para updateSession() que:
 * 1. Valida/refresha sessão ADMIN via @supabase/ssr
 * 2. Protege rotas (guest → login, auth → dashboard)
 * 3. Resolve e seta cookie do tenant
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Arquivos estáticos (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
