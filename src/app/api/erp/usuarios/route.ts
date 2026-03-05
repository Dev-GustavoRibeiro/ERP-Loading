import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenantClient, type TenantContext } from '@/shared/lib/api/withTenantClient';
import { createAdminServiceClient } from '@/shared/lib/supabase/admin.server';

// =====================================================
// Schemas de Validação
// =====================================================

const CreateUsuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  empresa_id: z.string().uuid('empresa_id inválido'),
  cargo: z.string().optional(),
  modulos: z.array(z.object({
    module_key: z.string(),
    features: z.array(z.object({
      feature_key: z.string(),
      pode_visualizar: z.boolean().default(true),
      pode_criar: z.boolean().default(false),
      pode_editar: z.boolean().default(false),
      pode_excluir: z.boolean().default(false),
      pode_exportar: z.boolean().default(false),
    })).default([]),
  })).default([]),
});

const UpdatePermissoesSchema = z.object({
  user_id: z.string().uuid('user_id inválido'),
  empresa_id: z.string().uuid('empresa_id inválido'),
  modulos: z.array(z.object({
    module_key: z.string(),
    features: z.array(z.object({
      feature_key: z.string(),
      pode_visualizar: z.boolean().default(true),
      pode_criar: z.boolean().default(false),
      pode_editar: z.boolean().default(false),
      pode_excluir: z.boolean().default(false),
      pode_exportar: z.boolean().default(false),
    })).default([]),
  })),
});

// =====================================================
// GET /api/erp/usuarios?empresa_id=xxx
// Lista usuários vinculados a uma empresa no ERP
// =====================================================

export const GET = withTenantClient(async ({ tenantClient, request }: TenantContext) => {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresa_id');

  if (!empresaId) {
    return NextResponse.json(
      { error: 'empresa_id é obrigatório' },
      { status: 400 }
    );
  }

  try {
    // Buscar módulos do usuário no ERP
    const { data: userModulos, error: umError } = await tenantClient
      .from('usuario_modulos')
      .select('*')
      .eq('empresa_id', empresaId);

    if (umError) {
      console.error('[ERP Usuarios] Erro usuario_modulos:', umError);
    }

    // Buscar funcionalidades do usuário no ERP
    const { data: userFeatures, error: ufError } = await tenantClient
      .from('usuario_funcionalidades')
      .select('*')
      .eq('empresa_id', empresaId);

    if (ufError) {
      console.error('[ERP Usuarios] Erro usuario_funcionalidades:', ufError);
    }

    // Buscar perfis dos usuários no ADMIN
    const userIds = [...new Set((userModulos || []).map((um: any) => um.user_id))];

    if (userIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const admin = createAdminServiceClient();
    const { data: profiles, error: pError } = await admin
      .from('profiles')
      .select('id, name, email, avatar_url, role')
      .in('id', userIds);

    if (pError) {
      console.error('[ERP Usuarios] Erro profiles:', pError);
    }

    // Montar resposta agrupada (mapear modulo_codigo → module_key na interface)
    const usuarios = (profiles || []).map((profile: any) => {
      const modulos = (userModulos || [])
        .filter((um: any) => um.user_id === profile.id)
        .map((um: any) => ({
          module_key: um.modulo_codigo,
          features: (userFeatures || [])
            .filter((uf: any) =>
              uf.user_id === profile.id &&
              uf.modulo_codigo === um.modulo_codigo
            )
            .map((uf: any) => ({
              feature_key: uf.funcionalidade_codigo,
              pode_visualizar: uf.pode_visualizar,
              pode_criar: uf.pode_criar,
              pode_editar: uf.pode_editar,
              pode_excluir: uf.pode_excluir,
              pode_exportar: uf.pode_exportar,
            })),
        }));

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        role: profile.role,
        modulos,
        totalModulos: modulos.length,
      };
    });

    return NextResponse.json({ data: usuarios });
  } catch (error: any) {
    console.error('[ERP Usuarios] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// =====================================================
// POST /api/erp/usuarios
// Cria um usuário no ADMIN Auth + vincula módulos no ERP
// =====================================================

export const POST = withTenantClient(async ({ tenantClient, adminUser, request }: TenantContext) => {
  try {
    const body = await request.json();
    const parsed = CreateUsuarioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, name, empresa_id, cargo, modulos } = parsed.data;
    const admin = createAdminServiceClient();

    // 1) Verificar se o usuário já existe no ADMIN Auth
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Criar usuário no ADMIN Auth com senha temporária
      const tempPassword = crypto.randomUUID().slice(0, 16) + 'Aa1!';
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name, cargo: cargo || '' },
      });

      if (createError) {
        console.error('[ERP Usuarios POST] Erro ao criar user:', createError);
        return NextResponse.json(
          { error: `Erro ao criar usuário: ${createError.message}` },
          { status: 500 }
        );
      }

      userId = newUser.user.id;

      // Garantir profile no ADMIN DB
      await admin.from('profiles').upsert({
        id: userId,
        email,
        name,
        role: 'user',
      }, { onConflict: 'id' });

      // Criar membership no ADMIN
      await admin.from('tenant_memberships').upsert({
        user_id: userId,
        tenant_slug: 'default',
        role: 'member',
      }, { onConflict: 'user_id,tenant_slug' });
    }

    // 2) Vincular módulos e features no ERP (usando nomes corretos do schema)
    for (const mod of modulos) {
      await tenantClient.from('usuario_modulos').upsert({
        user_id: userId,
        empresa_id,
        modulo_codigo: mod.module_key,
      }, { onConflict: 'user_id,empresa_id,modulo_codigo' });

      for (const feat of mod.features) {
        await tenantClient.from('usuario_funcionalidades').upsert({
          user_id: userId,
          empresa_id,
          modulo_codigo: mod.module_key,
          funcionalidade_codigo: feat.feature_key,
          pode_visualizar: feat.pode_visualizar,
          pode_criar: feat.pode_criar,
          pode_editar: feat.pode_editar,
          pode_excluir: feat.pode_excluir,
          pode_exportar: feat.pode_exportar,
        }, { onConflict: 'user_id,empresa_id,modulo_codigo,funcionalidade_codigo' });
      }
    }

    return NextResponse.json({
      data: { userId, email, name, modulosCount: modulos.length },
      message: 'Usuário criado com sucesso',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[ERP Usuarios POST] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// =====================================================
// PUT /api/erp/usuarios
// Atualiza permissões (módulos + features) de um usuário
// =====================================================

export const PUT = withTenantClient(async ({ tenantClient, request }: TenantContext) => {
  try {
    const body = await request.json();
    const parsed = UpdatePermissoesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { user_id, empresa_id, modulos } = parsed.data;

    // Deletar todos os módulos e features atuais (ao invés de desativar)
    await tenantClient
      .from('usuario_funcionalidades')
      .delete()
      .eq('user_id', user_id)
      .eq('empresa_id', empresa_id);

    await tenantClient
      .from('usuario_modulos')
      .delete()
      .eq('user_id', user_id)
      .eq('empresa_id', empresa_id);

    // Recriar os módulos e features selecionados
    for (const mod of modulos) {
      await tenantClient.from('usuario_modulos').insert({
        user_id,
        empresa_id,
        modulo_codigo: mod.module_key,
      });

      for (const feat of mod.features) {
        await tenantClient.from('usuario_funcionalidades').insert({
          user_id,
          empresa_id,
          modulo_codigo: mod.module_key,
          funcionalidade_codigo: feat.feature_key,
          pode_visualizar: feat.pode_visualizar,
          pode_criar: feat.pode_criar,
          pode_editar: feat.pode_editar,
          pode_excluir: feat.pode_excluir,
          pode_exportar: feat.pode_exportar,
        });
      }
    }

    return NextResponse.json({
      message: 'Permissões atualizadas com sucesso',
    });
  } catch (error: any) {
    console.error('[ERP Usuarios PUT] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// =====================================================
// DELETE /api/erp/usuarios?user_id=xxx&empresa_id=xxx
// Remove vínculos do usuário com a empresa no ERP
// =====================================================

export const DELETE = withTenantClient(async ({ tenantClient, request }: TenantContext) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const empresaId = searchParams.get('empresa_id');

  if (!userId || !empresaId) {
    return NextResponse.json(
      { error: 'user_id e empresa_id são obrigatórios' },
      { status: 400 }
    );
  }

  try {
    // Remover funcionalidades
    await tenantClient
      .from('usuario_funcionalidades')
      .delete()
      .eq('user_id', userId)
      .eq('empresa_id', empresaId);

    // Remover módulos
    await tenantClient
      .from('usuario_modulos')
      .delete()
      .eq('user_id', userId)
      .eq('empresa_id', empresaId);

    return NextResponse.json({
      message: 'Usuário removido da empresa com sucesso',
    });
  } catch (error: any) {
    console.error('[ERP Usuarios DELETE] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
