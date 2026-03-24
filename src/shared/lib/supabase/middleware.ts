import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveTenantFromRequest, TENANT_COOKIE } from '@/shared/lib/tenant/resolveTenant';

/**
 * Atualiza a sessão do ADMIN Supabase via cookies e aplica regras de roteamento.
 *
 * Responsabilidades:
 * 1. Refresh do token ADMIN (via getUser)
 * 2. Proteção de rotas (redirect guest → login, auth → dashboard)
 * 3. Resolução do tenant (subdomínio/cookie) e set do cookie x-tenant-slug
 */
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Rotas estáticas e de API — passar direto (evita chamadas desnecessárias ao Auth)
  if (
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.startsWith('/api') ||
    path.includes('.')
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: Não colocar lógica entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Rotas públicas
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth'];
  const isPublicRoute = publicRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  // 3. Redirecionamentos de segurança

  // Caso 1: Guest tentando acessar rota protegida
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Caso 2: Usuário logado em rota pública
  if (user && isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Caso 3: Usuário logado na raiz
  if (user && path === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 4. Resolver tenant e setar cookie (para rotas protegidas)
  if (user && !isPublicRoute) {
    const tenantSlug = resolveTenantFromRequest(request);
    supabaseResponse.cookies.set(TENANT_COOKIE, tenantSlug, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });
  }

  return supabaseResponse;
}
