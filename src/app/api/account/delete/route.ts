import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminServiceClient } from '@/shared/lib/supabase/admin.server';

/**
 * POST /api/account/delete
 *
 * Exclui a conta do usuário do ADMIN Supabase.
 * Remove: avatar do storage, profile do ADMIN DB, auth user do ADMIN.
 * NUNCA toca no banco do ERP/tenant.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação via sessão ADMIN
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Validar body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // 3. Garantir que só pode excluir a própria conta
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Você só pode excluir sua própria conta' },
        { status: 403 }
      );
    }

    // 4. Usar ADMIN service client para operações administrativas
    const adminService = createAdminServiceClient();

    try {
      // 4.1 Excluir avatar do ADMIN storage se existir
      const { data: profile } = await adminService
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (profile?.avatar_url) {
        const urlParts = profile.avatar_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${userId}/${fileName}`;

        await adminService.storage.from('public-assets').remove([filePath]);
      }

      // 4.2 Excluir memberships do ADMIN
      await adminService
        .from('tenant_memberships')
        .delete()
        .eq('user_id', userId);

      // 4.3 Excluir profile do ADMIN
      await adminService
        .from('profiles')
        .delete()
        .eq('id', userId);

    } catch (error) {
      console.error('[Delete Account] Erro ao excluir dados relacionados:', error);
      // Continuar — o importante é excluir a conta do Auth
    }

    // 5. Excluir auth user do ADMIN
    const { error: deleteError } = await adminService.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[Delete Account] Erro ao excluir usuário:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao excluir conta. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conta excluída com sucesso',
    });

  } catch (error: any) {
    console.error('[Delete Account] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro ao processar exclusão da conta' },
      { status: 500 }
    );
  }
}
