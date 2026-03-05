'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import type { CategoriaProduto } from '../domain';
import type { ApiResponse, PaginatedResponse, ListParams } from '@/modules/core/domain';

const supabase = createClient();

export const categoriaService = {
  async list(empresaId: string): Promise<CategoriaProduto[]> {
    const { data, error } = await supabase
      .from('categorias_produto')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome');

    if (error) throw new Error(error.message);
    return data as CategoriaProduto[];
  },

  async create(empresaId: string, nome: string): Promise<ApiResponse<CategoriaProduto>> {
    const { data, error } = await supabase
      .from('categorias_produto')
      .insert({ empresa_id: empresaId, nome, codigo: nome.substring(0, 3).toUpperCase(), ativo: true })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data: data as CategoriaProduto, message: 'Categoria criada com sucesso' };
  }
};
