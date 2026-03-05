'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import type { ApiResponse } from '@/modules/core/domain';

const supabase = createClient();

// Tipo para o relacionamento
export interface UsuarioEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  padrao: boolean;
  ativo: boolean;
  created_at: string;
}

export const usuarioEmpresaService = {
  /**
   * Lista empresas vinculadas ao usuário logado
   */
  async listMinhasEmpresas(): Promise<ApiResponse<any[]>> {
    try {
      // Busca a sessão atual para garantir
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: 'Usuário não autenticado' };

      // Como habilitamos RLS na tabela empresas para filtrar por vínculo,
      // podemos consultar diretamente a tabela empresas.
      // A policy "Acesso a empresas vinculadas" fará o filtro.
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('ativo', true)
        .order('razao_social');

      if (error) {
        console.error('Erro ao listar empresas:', JSON.stringify(error, null, 2));
        return { error: error.message };
      }

      return { data: data || [] };
    } catch (error) {
      console.error('Erro inesperado:', error);
      return { error: 'Erro ao listar empresas' };
    }
  },

  /**
   * Vincula usuário a uma empresa
   */
  async vincularUsuario(empresaId: string, userId?: string, profileId?: string): Promise<ApiResponse<UsuarioEmpresa>> {
    try {
      const id = userId || (await supabase.auth.getSession()).data.session?.user.id;
      if (!id) return { error: 'Usuário não identificado' };

      // @ts-ignore
      // @ts-ignore
      const { data, error } = await supabase
        .from('usuario_empresas')
        .insert({
          user_id: id,
          empresa_id: empresaId,
          ativo: true,
          perfil_id: profileId || null
        })
        .select()
        .single();

      if (error) {
        // Se erro for violação de unicidade, significa que já existe
        if (error.code === '23505') {
          return { message: 'Usuário já vinculado' };
        }
        return { error: error.message };
      }

      return { data };
    } catch (error) {
      return { error: 'Erro ao vincular usuário' };
    }
  }
};
