'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import type { UnidadeMedida } from '../domain';
import type { ApiResponse } from '@/modules/core/domain';

const supabase = createClient();

export const unidadeService = {
  async list(): Promise<UnidadeMedida[]> {
    const { data, error } = await supabase
      .from('unidades_medida')
      .select('*')
      .order('codigo');

    if (error) throw new Error(error.message);
    return data as UnidadeMedida[];
  }
};
