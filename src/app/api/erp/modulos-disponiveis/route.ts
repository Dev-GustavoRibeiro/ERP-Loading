import { NextResponse } from 'next/server';
import { withAdminSession } from '@/shared/lib/api/withAdminSession';
import { createAdminServiceClient } from '@/shared/lib/supabase/admin.server';
import { resolveAdminClientId } from '@/app/actions/permissions';

/**
 * GET /api/erp/modulos-disponiveis?empresa_id=xxx
 *
 * Retorna os módulos assinados pela empresa (via admin_client_modules)
 * junto com as funcionalidades de cada módulo (via admin_module_features).
 *
 * Usado no formulário de criação/edição de usuário para exibir
 * quais módulos e features podem ser atribuídos.
 */
export const GET = withAdminSession(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresa_id');

  if (!empresaId) {
    return NextResponse.json(
      { error: 'empresa_id é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminServiceClient();

    // Resolver admin_client_id a partir do empresa_id do ERP
    const adminClientId = await resolveAdminClientId(empresaId);
    if (!adminClientId) {
      return NextResponse.json(
        { error: 'Empresa não encontrada no sistema administrativo' },
        { status: 404 }
      );
    }

    // Buscar módulos assinados pela empresa
    const { data: clientModules, error: cmError } = await admin
      .from('admin_client_modules')
      .select(`
        module_id,
        module:admin_modules (
          id,
          key,
          name
        )
      `)
      .eq('client_id', adminClientId);

    if (cmError) {
      console.error('[ModulosDisponiveis] Erro client_modules:', cmError);
      return NextResponse.json({ error: cmError.message }, { status: 500 });
    }

    if (!clientModules || clientModules.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Extrair IDs dos módulos assinados
    const moduleIds = clientModules
      .map((cm: any) => cm.module_id)
      .filter(Boolean);

    // Buscar features dos módulos assinados
    const { data: features, error: fError } = await admin
      .from('admin_module_features')
      .select('id, module_id, key, name, description, ordem')
      .in('module_id', moduleIds)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (fError) {
      console.error('[ModulosDisponiveis] Erro features:', fError);
      return NextResponse.json({ error: fError.message }, { status: 500 });
    }

    // Agrupar features por módulo
    const modulesWithFeatures = clientModules.map((cm: any) => {
      const mod = cm.module as any;
      return {
        id: mod?.id,
        key: mod?.key,
        name: mod?.name,
        features: (features || [])
          .filter((f: any) => f.module_id === cm.module_id)
          .map((f: any) => ({
            id: f.id,
            key: f.key,
            name: f.name,
            description: f.description,
          })),
      };
    });

    return NextResponse.json({ data: modulesWithFeatures });
  } catch (error: any) {
    console.error('[ModulosDisponiveis] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
