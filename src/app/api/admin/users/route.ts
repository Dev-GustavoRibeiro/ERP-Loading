import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminServiceClient } from '@/shared/lib/supabase/admin.server';

// =====================================================
// Schema de validação
// =====================================================

const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
  role: z.enum(['admin', 'manager', 'user']).default('user'),
  tenant_slug: z.string().optional(),
  empresa_id: z.string().uuid().optional(),
});

// =====================================================
// POST /api/admin/users
// Cria usuário EXCLUSIVAMENTE no ADMIN Supabase.
// NUNCA escreve no banco do ERP/tenant.
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação: PROVISIONING_SECRET ou sessão admin
    const authHeader = request.headers.get('Authorization');
    const provisioningSecret = process.env.PROVISIONING_SECRET;
    const secretHeader = request.headers.get('x-provisioning-secret');

    const isProvisioningAuth =
      (provisioningSecret && authHeader === `Bearer ${provisioningSecret}`) ||
      (provisioningSecret && secretHeader === provisioningSecret);

    if (!isProvisioningAuth) {
      // Tentar validar sessão admin via cookies (para chamadas do dashboard)
      const { createServerClient } = await import('@supabase/ssr');
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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      // Verificar se o usuário é admin no ADMIN DB
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
    }

    // 2. Validar body
    const body = await request.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, name, password, role, tenant_slug, empresa_id } = parsed.data;

    // 3. Criar/obter usuário no ADMIN Supabase Auth
    const adminService = createAdminServiceClient();

    // Verificar se já existe
    const { data: { users: existingUsers } } = await adminService.auth.admin.listUsers();
    const existingUser = existingUsers?.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      if (password) {
        // Criar com senha (confirma email automaticamente)
        const { data: newUser, error: createError } = await adminService.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });

        if (createError) {
          return NextResponse.json({ error: createError.message }, { status: 400 });
        }
        userId = newUser.user.id;
      } else {
        // Convidar por email (envia link de definição de senha)
        const { data: inviteData, error: inviteError } =
          await adminService.auth.admin.inviteUserByEmail(email, {
            data: { name },
          });

        if (inviteError) {
          return NextResponse.json({ error: inviteError.message }, { status: 400 });
        }
        userId = inviteData.user.id;
      }
    }

    // 4. Criar/atualizar profile no ADMIN DB
    const { error: profileError } = await adminService
      .from('profiles')
      .upsert({
        id: userId,
        email,
        name,
        role,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('[Admin Users] Erro ao criar profile:', profileError);
      // Não falhar — o usuário auth já foi criado
    }

    // 5. Criar membership no ADMIN DB (se empresa_id fornecido)
    if (empresa_id) {
      const { error: membershipError } = await adminService
        .from('tenant_memberships')
        .upsert(
          {
            user_id: userId,
            empresa_id,
            tenant_slug: tenant_slug || 'default',
            role,
            ativo: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,empresa_id' }
        );

      if (membershipError) {
        console.error('[Admin Users] Erro ao criar membership:', membershipError);
      }
    }

    // 6. Resposta — NUNCA escrevemos no banco do ERP aqui
    return NextResponse.json({
      success: true,
      userId,
      email,
      name,
      role,
      isNew: !existingUser,
      message: existingUser
        ? 'Usuário existente vinculado com sucesso'
        : password
          ? 'Usuário criado com sucesso'
          : 'Convite enviado por email',
    });

  } catch (error: any) {
    console.error('[Admin Users] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
