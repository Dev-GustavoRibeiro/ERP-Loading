import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminServiceClient } from '@/shared/lib/supabase/admin.server';
import { TENANT_COOKIE } from '@/shared/lib/tenant/resolveTenant';

// =====================================================
// GET /api/session/bootstrap
//
// Valida sessão ADMIN e retorna:
// - adminUser (id, email, name, role)
// - memberships (tenants/empresas que o usuário tem acesso)
// - defaultTenantSlug
//
// O frontend chama isso após login para saber quais empresas
// o usuário pode acessar e definir o tenant ativo.
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Validar sessão ADMIN via cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Não autorizado — sessão expirada' },
        { status: 401 }
      );
    }

    // 2. Buscar profile no ADMIN
    const adminService = createAdminServiceClient();

    const { data: profile } = await adminService
      .from('profiles')
      .select('id, email, name, role, avatar_url')
      .eq('id', user.id)
      .single();

    // 3. Buscar memberships no ADMIN
    const { data: memberships } = await adminService
      .from('tenant_memberships')
      .select('id, empresa_id, tenant_slug, role, ativo')
      .eq('user_id', user.id)
      .eq('ativo', true);

    // 4. Determinar tenant padrão
    const currentTenant = request.cookies.get(TENANT_COOKIE)?.value;
    const defaultMembership = memberships?.find((m: any) => m.tenant_slug === currentTenant)
      || memberships?.[0];
    const defaultTenantSlug = defaultMembership?.tenant_slug || 'default';

    // 5. Resposta
    const response = NextResponse.json({
      adminUser: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || '',
        role: profile?.role || 'user',
        avatar_url: profile?.avatar_url || null,
      },
      memberships: memberships || [],
      defaultTenantSlug,
    });

    // 6. Setar cookie do tenant se não existir
    if (!currentTenant && defaultTenantSlug) {
      response.cookies.set(TENANT_COOKIE, defaultTenantSlug, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;

  } catch (error: any) {
    console.error('[Bootstrap] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
