import type { NextRequest } from 'next/server';

// =====================================================
// Constantes
// =====================================================

export const TENANT_COOKIE = 'x-tenant-slug';
export const DEFAULT_TENANT = 'default';

// =====================================================
// Validação de Slug
// =====================================================

/**
 * Sanitiza e valida um slug de tenant.
 * Aceita apenas letras minúsculas, números e hífens.
 * Retorna DEFAULT_TENANT se o slug for inválido.
 */
function sanitizeTenantSlug(slug: string): string {
  const clean = slug.trim().toLowerCase();
  if (!clean || clean.length > 63 || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(clean)) {
    return DEFAULT_TENANT;
  }
  return clean;
}

// =====================================================
// Resolução de Tenant via Request (Middleware / Route Handler)
// =====================================================

/**
 * Resolve o slug do tenant a partir do request, na seguinte prioridade:
 *
 * 1. Subdomínio — ex.: cliente1.loading.dev.br → "cliente1"
 * 2. Cookie "x-tenant-slug"
 * 3. Query param ?tenant=
 * 4. Fallback para "default"
 */
export function resolveTenantFromRequest(request: NextRequest): string {
  // 1. Subdomínio
  const host = request.headers.get('host') || '';
  const parts = host.split('.');
  // Se tem 3+ partes (ex: cliente1.loading.dev.br), o primeiro é o subdomínio
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Ignorar subdomínios padrão
    if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'localhost') {
      return sanitizeTenantSlug(subdomain);
    }
  }

  // 2. Cookie
  const cookieSlug = request.cookies.get(TENANT_COOKIE)?.value;
  if (cookieSlug) return sanitizeTenantSlug(cookieSlug);

  // 3. Query param
  const url = new URL(request.url);
  const queryTenant = url.searchParams.get('tenant');
  if (queryTenant) return sanitizeTenantSlug(queryTenant);

  // 4. Default
  return DEFAULT_TENANT;
}

// =====================================================
// Resolução Server-side (Server Actions / Route Handlers)
// =====================================================

/**
 * Resolve o slug do tenant server-side via cookies.
 * Para uso em server actions e route handlers que não recebem NextRequest.
 */
export async function resolveTenantSlug(): Promise<string> {
  // Dynamic import para evitar erro em contextos que não suportam cookies()
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const slug = cookieStore.get(TENANT_COOKIE)?.value;
  return slug ? sanitizeTenantSlug(slug) : DEFAULT_TENANT;
}

