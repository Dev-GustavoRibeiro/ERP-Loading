import { NextResponse } from 'next/server';
import { createAdminServiceClient } from '@/shared/lib/supabase/admin.server';
import { getTenantClient } from '@/shared/lib/supabase/tenant.server';

/**
 * Rotas de CRUD de empresas.
 *
 * Auth: x-provisioning-secret header
 * Dados de empresa: TENANT Supabase
 * Dados de auth/user: ADMIN Supabase
 */

const PROVISIONING_SECRET = process.env.PROVISIONING_SECRET;

function getTenant(request: Request): string {
  const url = new URL(request.url);
  return url.searchParams.get('tenant') || 'default';
}

function validateSecret(request: Request): boolean {
  const secret = request.headers.get('x-provisioning-secret');
  return !!PROVISIONING_SECRET && secret === PROVISIONING_SECRET;
}

// =====================================================
// GET - Listar empresas do usuário
// =====================================================

export async function GET(request: Request) {
  try {
    if (!validateSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const tenantSlug = getTenant(request);

    if (!user_id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Buscar memberships no ADMIN
    const adminService = createAdminServiceClient();
    const { data: memberships } = await adminService
      .from('tenant_memberships')
      .select('empresa_id')
      .eq('user_id', user_id)
      .eq('tenant_slug', tenantSlug)
      .eq('ativo', true);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ companies: [] });
    }

    const companyIds = memberships.map((m: any) => m.empresa_id);

    // Buscar dados das empresas no TENANT
    const tenantClient = getTenantClient(tenantSlug);
    const { data: companies, error: companyError } = await tenantClient
      .from('empresas')
      .select('*')
      .in('id', companyIds)
      .order('created_at', { ascending: false });

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 500 });
    }

    return NextResponse.json({ companies });

  } catch (error: any) {
    console.error('[Companies GET] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =====================================================
// POST - Criar empresa
// =====================================================

export async function POST(request: Request) {
  try {
    if (!validateSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      user_id,
      razao_social,
      nome_fantasia,
      cnpj,
      inscricao_estadual,
      telefone,
      email,
      endereco_cep,
      endereco_logradouro,
      endereco_numero,
      endereco_complemento,
      endereco_bairro,
      endereco_cidade,
      endereco_uf,
      tenant_slug = 'default',
    } = body;

    if (!user_id || !razao_social || !cnpj) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // --- TENANT: Criar empresa ---
    const tenantClient = getTenantClient(tenant_slug);

    let company;
    const { data: existingCompany } = await tenantClient
      .from('empresas')
      .select('*')
      .eq('cnpj', cnpj.replace(/\D/g, ''))
      .single();

    if (existingCompany) {
      company = existingCompany;
    } else {
      const { data: newCompany, error: createError } = await tenantClient
        .from('empresas')
        .insert({
          razao_social,
          nome_fantasia: nome_fantasia || razao_social,
          cnpj: cnpj.replace(/\D/g, ''),
          codigo: `EMP${Date.now().toString().slice(-6)}`,
          ativo: true,
          inscricao_estadual,
          telefone,
          email,
          cep: endereco_cep,
          logradouro: endereco_logradouro,
          numero: endereco_numero,
          complemento: endereco_complemento,
          bairro: endereco_bairro,
          cidade: endereco_cidade,
          uf: endereco_uf,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
      company = newCompany;
    }

    // --- TENANT: Criar perfil admin ---
    let adminProfile;
    const { data: profiles } = await tenantClient
      .from('perfis_acesso')
      .select('*')
      .eq('empresa_id', company.id)
      .eq('nome', 'Admin')
      .single();

    if (profiles) {
      adminProfile = profiles;
    } else {
      const { data: newProfile, error: profileError } = await tenantClient
        .from('perfis_acesso')
        .insert({
          empresa_id: company.id,
          nome: 'Admin',
          descricao: 'Administrador do Sistema',
          ativo: true,
          codigo: 'ADMIN',
        })
        .select()
        .single();

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
      adminProfile = newProfile;
    }

    // --- TENANT: Vincular user à empresa (usuario_empresas) ---
    const { data: existingAuthLink } = await tenantClient
      .from('usuario_empresas')
      .select('id')
      .eq('user_id', user_id)
      .eq('empresa_id', company.id)
      .single();

    if (!existingAuthLink) {
      await tenantClient.from('usuario_empresas').insert({
        user_id,
        empresa_id: company.id,
        perfil_id: adminProfile.id,
        ativo: true,
      });
    }

    // --- ADMIN: Criar membership ---
    const adminService = createAdminServiceClient();
    await adminService
      .from('tenant_memberships')
      .upsert(
        {
          user_id,
          empresa_id: company.id,
          tenant_slug,
          role: 'admin',
          ativo: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,empresa_id' }
      );

    return NextResponse.json({ success: true, company });

  } catch (error: any) {
    console.error('[Companies POST] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =====================================================
// PUT - Atualizar empresa
// =====================================================

export async function PUT(request: Request) {
  try {
    if (!validateSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { company_id, tenant_slug = 'default', ...updateFields } = body;

    if (!company_id) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const tenantClient = getTenantClient(tenant_slug);

    const updateData: any = { updated_at: new Date().toISOString() };

    // Mapeamento de nomes do admin -> nomes no schema ERP
    const fieldMapping: Record<string, string> = {
      'razao_social': 'razao_social',
      'nome_fantasia': 'nome_fantasia',
      'cnpj': 'cnpj',
      'inscricao_estadual': 'inscricao_estadual',
      'telefone': 'telefone',
      'email': 'email',
      'endereco_cep': 'cep',
      'endereco_logradouro': 'logradouro',
      'endereco_numero': 'numero',
      'endereco_complemento': 'complemento',
      'endereco_bairro': 'bairro',
      'endereco_cidade': 'cidade',
      'endereco_uf': 'uf',
    };

    for (const [inputField, dbField] of Object.entries(fieldMapping)) {
      if (updateFields[inputField] !== undefined) {
        updateData[dbField] = inputField === 'cnpj'
          ? updateFields[inputField].replace(/\D/g, '')
          : updateFields[inputField];
      }
    }

    const { data: company, error } = await tenantClient
      .from('empresas')
      .update(updateData)
      .eq('id', company_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, company });

  } catch (error: any) {
    console.error('[Companies PUT] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =====================================================
// DELETE - Excluir empresa
// =====================================================

export async function DELETE(request: Request) {
  try {
    if (!validateSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id');
    const tenantSlug = getTenant(request);

    if (!company_id) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const tenantClient = getTenantClient(tenantSlug);

    // Cascade manual no TENANT
    await tenantClient.from('usuario_empresas').delete().eq('empresa_id', company_id);
    await tenantClient.from('funcionarios').delete().eq('empresa_id', company_id);
    await tenantClient.from('perfis_acesso').delete().eq('empresa_id', company_id);

    const { error } = await tenantClient.from('empresas').delete().eq('id', company_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Limpar memberships no ADMIN
    const adminService = createAdminServiceClient();
    await adminService
      .from('tenant_memberships')
      .delete()
      .eq('empresa_id', company_id);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Companies DELETE] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =====================================================
// PATCH - Toggle ativo
// =====================================================

export async function PATCH(request: Request) {
  try {
    if (!validateSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { company_id, ativa, tenant_slug = 'default' } = body;

    if (!company_id || typeof ativa !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tenantClient = getTenantClient(tenant_slug);

    const { data: company, error } = await tenantClient
      .from('empresas')
      .update({ ativo: ativa })
      .eq('id', company_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, company });

  } catch (error: any) {
    console.error('[Companies PATCH] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
