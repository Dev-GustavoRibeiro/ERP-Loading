'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import type { SefazProvider, SefazConfig } from './types';
import { MockSefazProvider } from './mock-provider';
import { RealSefazProvider } from './real-provider';

// =====================================================
// SEFAZ Provider Factory
// Returns MockProvider for homologacao, RealProvider for producao
// =====================================================

const supabase = createClient();

/**
 * Creates the appropriate SefazProvider based on the company's nfe_settings.
 * Falls back to MockProvider if no settings are found.
 */
export async function createSefazProvider(
  empresaId: string
): Promise<{ provider: SefazProvider; config: SefazConfig }> {
  const { data: settings } = await supabase
    .from('nfe_settings')
    .select('environment, sefaz_uf, id')
    .eq('empresa_id', empresaId)
    .single();

  // Check for active certificate
  const { data: certificate } = await supabase
    .from('nfe_certificates')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString())
    .limit(1)
    .single();

  const config: SefazConfig = {
    empresaId,
    environment: settings?.environment ?? 'homologacao',
    uf: settings?.sefaz_uf ?? 'SP',
    certificateId: certificate?.id ?? undefined,
  };

  const isProduction = config.environment === 'producao';

  const provider: SefazProvider = isProduction
    ? new RealSefazProvider()
    : new MockSefazProvider();

  return { provider, config };
}
