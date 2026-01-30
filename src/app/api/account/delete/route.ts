import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/shared/lib/supabase/server';

// Função para criar cliente admin (lazy loading para evitar erro na build)
function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação do usuário usando server client
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Obter dados do body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Garantir que o usuário só pode excluir sua própria conta
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Você só pode excluir sua própria conta' },
        { status: 403 }
      );
    }

    // Excluir dados relacionados do usuário (em cascata, se configurado)
    // Nota: Se você tiver triggers ON DELETE CASCADE no banco, isso não é necessário
    // Mas vamos fazer explicitamente para garantir

    // Obter cliente admin
    const supabaseAdmin = getSupabaseAdmin();

    try {
      // Excluir avatar do storage se existir
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (profile?.avatar_url) {
        // Extrair o caminho do arquivo da URL
        const urlParts = profile.avatar_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${userId}/${fileName}`;

        // Excluir arquivo do storage
        await supabaseAdmin.storage
          .from('public-assets')
          .remove([filePath]);
      }

      // Excluir perfil (isso pode disparar cascata se configurado)
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);

    } catch (error) {
      console.error('[Delete Account] Erro ao excluir dados relacionados:', error);
      // Continuar mesmo se houver erro, pois o importante é excluir a conta do Auth
    }

    // Excluir a conta do Supabase Auth usando Admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[Delete Account] Erro ao excluir usuário:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao excluir conta. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Conta excluída com sucesso' 
    });

  } catch (error: any) {
    console.error('[Delete Account] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro ao processar exclusão da conta' },
      { status: 500 }
    );
  }
}

