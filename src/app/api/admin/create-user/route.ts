import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminServiceClient } from '@/shared/lib/supabase/admin.server';

/**
 * POST /api/admin/create-user
 *
 * Cria usuário admin no ADMIN Supabase Auth.
 * NUNCA escreve no banco do ERP/tenant.
 *
 * SEGURANÇA: Requer sessão autenticada + role admin/owner.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validar sessão ADMIN via cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_ADMIN_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() { },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado — sessão inválida ou expirada' },
        { status: 401 }
      );
    }

    // 2. Verificar que o caller é admin
    const adminService = createAdminServiceClient();
    const { data: callerProfile } = await adminService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || !['admin', 'owner'].includes(callerProfile.role || '')) {
      return NextResponse.json(
        { error: 'Apenas administradores podem criar usuários' },
        { status: 403 }
      );
    }

    // 3. Validar body
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // 4. Criar usuário no ADMIN auth
    const { data, error } = await adminService.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || 'Administrador',
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 5. Criar profile no ADMIN DB
    await adminService
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: data.user.email,
        name: name || 'Administrador',
        role: 'admin',
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
      },
    });

  } catch (error: any) {
    console.error('[Create User] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
