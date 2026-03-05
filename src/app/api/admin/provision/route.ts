import { NextResponse } from 'next/server';
import { createAdminServiceClient } from '@/shared/lib/supabase/admin.server';
import { getTenantClient } from '@/shared/lib/supabase/tenant.server';

/**
 * POST /api/admin/provision
 *
 * Rota de provisionamento chamada pela plataforma ADMIN.
 * Ações: create | suspend | activate
 *
 * REGRAS:
 * - Criação de auth user: SOMENTE no ADMIN Supabase
 * - Criação de empresa/dados ERP: SOMENTE no TENANT Supabase
 * - Profile e memberships: SOMENTE no ADMIN
 */
export async function POST(request: Request) {
  try {
    // 1. Autenticação via PROVISIONING_SECRET
    const authHeader = request.headers.get('Authorization');
    const provisioningSecret = process.env.PROVISIONING_SECRET;

    if (!provisioningSecret || authHeader !== `Bearer ${provisioningSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      admin_email,
      admin_name,
      company_name,
      cnpj,
      password,
      external_id,
      tenant_slug = 'default',
      action,
    } = body;

    // Clients
    const adminService = createAdminServiceClient();

    if (action === 'create') {
      // --- TENANT: Criar empresa no ERP ---
      let tenantClient;
      try {
        tenantClient = getTenantClient(tenant_slug);
      } catch {
        return NextResponse.json(
          { error: `Tenant "${tenant_slug}" não configurado` },
          { status: 400 }
        );
      }

      let companyId: string;
      const { data: existingCompany } = await tenantClient
        .from('empresas')
        .select('id')
        .eq('cnpj', cnpj)
        .single();

      if (existingCompany) {
        companyId = existingCompany.id;
        await tenantClient
          .from('empresas')
          .update({ razao_social: company_name, ativo: true })
          .eq('id', companyId);
      } else {
        const codigo = cnpj.replace(/\D/g, '');
        const companyPayload: any = {
          razao_social: company_name,
          cnpj,
          codigo,
          ativo: true,
        };
        if (external_id) companyPayload.id = external_id;

        const { data: newCompany, error: createError } = await tenantClient
          .from('empresas')
          .insert(companyPayload)
          .select('id')
          .single();

        if (createError) throw createError;
        companyId = newCompany.id;
      }

      // --- TENANT: Criar perfil de acesso admin na empresa ---
      let adminProfileId: string;
      const { data: existingProfile } = await tenantClient
        .from('perfis_acesso')
        .select('id')
        .eq('empresa_id', companyId)
        .eq('codigo', 'admin')
        .single();

      if (existingProfile) {
        adminProfileId = existingProfile.id;
      } else {
        const { data: newProfile, error: profileCreateError } = await tenantClient
          .from('perfis_acesso')
          .insert({
            empresa_id: companyId,
            codigo: 'admin',
            nome: 'Administrador',
            descricao: 'Acesso total à empresa',
            ativo: true,
          })
          .select('id')
          .single();

        if (profileCreateError) throw profileCreateError;
        adminProfileId = newProfile.id;
      }

      // --- ADMIN: Criar/obter auth user ---
      const { data: { users } } = await adminService.auth.admin.listUsers();
      const existingUser = users.find((u) => u.email === admin_email);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser, error: inviteError } = await adminService.auth.admin.createUser({
          email: admin_email,
          email_confirm: true,
          password: password || undefined,
          user_metadata: { name: admin_name },
        });
        if (inviteError) throw inviteError;
        userId = newUser.user.id;

        if (!password) {
          await adminService.auth.admin.inviteUserByEmail(admin_email);
        }
      }

      // --- ADMIN: Criar/atualizar profile ---
      await adminService
        .from('profiles')
        .upsert({
          id: userId,
          email: admin_email,
          name: admin_name,
          role: 'admin',
          updated_at: new Date().toISOString(),
        });

      // --- ADMIN: Criar membership ---
      await adminService
        .from('tenant_memberships')
        .upsert(
          {
            user_id: userId,
            empresa_id: companyId,
            tenant_slug,
            role: 'admin',
            ativo: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,empresa_id' }
        );

      // --- TENANT: Vincular usuário à empresa (usuario_empresas no ERP) ---
      const { data: existingLink } = await tenantClient
        .from('usuario_empresas')
        .select('id')
        .eq('user_id', userId)
        .eq('empresa_id', companyId)
        .single();

      if (!existingLink) {
        await tenantClient.from('usuario_empresas').insert({
          user_id: userId,
          empresa_id: companyId,
          perfil_id: adminProfileId,
          padrao: true,
          ativo: true,
        });
      }

      return NextResponse.json({
        success: true,
        companyId,
        userId,
        message: 'Provisionamento concluído com sucesso',
      });
    }

    if (action === 'suspend' || action === 'activate') {
      let tenantClient;
      try {
        tenantClient = getTenantClient(tenant_slug || 'default');
      } catch {
        return NextResponse.json(
          { error: `Tenant "${tenant_slug}" não configurado` },
          { status: 400 }
        );
      }

      const { data: existingCompany } = await tenantClient
        .from('empresas')
        .select('id')
        .eq('cnpj', cnpj)
        .single();

      if (!existingCompany) {
        return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
      }

      const isActive = action === 'activate';
      await tenantClient
        .from('empresas')
        .update({ ativo: isActive })
        .eq('id', existingCompany.id);

      return NextResponse.json({
        success: true,
        message: isActive ? 'Empresa ativada' : 'Empresa suspensa',
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error: any) {
    console.error('[Provision] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
