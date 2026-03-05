import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { withAdminSession, type AdminSessionContext } from './withAdminSession';
import { resolveTenantFromRequest } from '@/shared/lib/tenant/resolveTenant';
import { getTenantClient } from '@/shared/lib/supabase/tenant.server';

// =====================================================
// Tipos
// =====================================================

export interface TenantContext extends AdminSessionContext {
  tenantClient: SupabaseClient;
  tenantSlug: string;
}

type TenantHandlerFn = (ctx: TenantContext) => Promise<NextResponse>;

// =====================================================
// Wrapper de Sessão ADMIN + Tenant Client
// =====================================================

/**
 * Higher-order function que:
 * 1. Valida sessão ADMIN (via withAdminSession)
 * 2. Resolve o tenantSlug do request
 * 3. Cria o client do tenant (server-only, service_role)
 * 4. Injeta tudo no contexto do handler
 *
 * Uso:
 * ```ts
 * export const GET = withTenantClient(async ({ adminUser, tenantClient, tenantSlug }) => {
 *   const { data } = await tenantClient.from('clientes').select('*');
 *   return NextResponse.json({ data });
 * });
 * ```
 *
 * REGRAS:
 * - Toda query para dados do ERP deve acontecer dentro de route handlers
 *   que usem este wrapper.
 * - Em cada write, salvar created_by_admin_user_id = adminUser.id
 */
export function withTenantClient(handler: TenantHandlerFn) {
  return withAdminSession(async (ctx: AdminSessionContext) => {
    const tenantSlug = resolveTenantFromRequest(ctx.request);

    let tenantClient: SupabaseClient;
    try {
      tenantClient = getTenantClient(tenantSlug);
    } catch (error: any) {
      return NextResponse.json(
        { error: `Tenant inválido: ${tenantSlug}. ${error.message}` },
        { status: 400 }
      );
    }

    return handler({
      ...ctx,
      tenantClient,
      tenantSlug,
    });
  });
}
