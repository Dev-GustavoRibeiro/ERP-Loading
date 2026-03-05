'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import type {
  PerfilAcesso,
  PerfilPermissao,
  Modulo,
  ModuloAcao,
  UsuarioEmpresa
} from '../domain/index';

const supabase = createClient();

export interface PermissaoCheck {
  modulo: string;
  acao: string;
}

// =====================================================
// Permissão Service
// =====================================================

export const permissaoService = {
  /**
   * Busca todas as permissões do usuário atual
   */
  async getUserPermissions(): Promise<Map<string, Set<string>>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Map();

    // Busca os vínculos do usuário com empresas e perfis
    const { data: vinculos, error: vinculosError } = await supabase
      .from('usuario_empresas')
      .select(`
        perfil_id,
        perfis_acesso (
          id,
          nivel,
          perfil_permissoes (
            permitido,
            modulos (codigo),
            modulo_acoes (codigo)
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('ativo', true);

    if (vinculosError || !vinculos) return new Map();

    const permissoes = new Map<string, Set<string>>();

    for (const vinculo of vinculos) {
      const perfil = vinculo.perfis_acesso as unknown as {
        nivel: number;
        perfil_permissoes: Array<{
          permitido: boolean;
          modulos: { codigo: string };
          modulo_acoes: { codigo: string };
        }>;
      };

      if (!perfil) continue;

      // Super admin tem todas as permissões
      if (perfil.nivel >= 5) {
        return new Map([['*', new Set(['*'])]]);
      }

      // Processa permissões do perfil
      for (const perm of perfil.perfil_permissoes || []) {
        if (!perm.permitido) continue;

        const modulo = perm.modulos?.codigo;
        const acao = perm.modulo_acoes?.codigo;

        if (modulo && acao) {
          if (!permissoes.has(modulo)) {
            permissoes.set(modulo, new Set());
          }
          permissoes.get(modulo)!.add(acao);
        }
      }
    }

    return permissoes;
  },

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  async hasPermission(modulo: string, acao: string): Promise<boolean> {
    const permissoes = await this.getUserPermissions();

    // Super admin
    if (permissoes.has('*')) return true;

    // Permissão específica
    return permissoes.get(modulo)?.has(acao) || false;
  },

  /**
   * Verifica múltiplas permissões de uma vez
   */
  async hasPermissions(checks: PermissaoCheck[]): Promise<Map<string, boolean>> {
    const permissoes = await this.getUserPermissions();
    const results = new Map<string, boolean>();

    for (const check of checks) {
      const key = `${check.modulo}:${check.acao}`;

      if (permissoes.has('*')) {
        results.set(key, true);
      } else {
        results.set(key, permissoes.get(check.modulo)?.has(check.acao) || false);
      }
    }

    return results;
  },

  /**
   * Verifica se o usuário é admin (nível >= 4)
   */
  async isAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('usuario_empresas')
      .select(`
        perfis_acesso (nivel)
      `)
      .eq('user_id', user.id)
      .eq('ativo', true);

    if (!data) return false;

    return data.some((v: { perfis_acesso: unknown }) => {
      const perfil = v.perfis_acesso as unknown as { nivel: number };
      return perfil && perfil.nivel >= 4;
    });
  },

  /**
   * Verifica se o usuário é super admin (nível 5)
   */
  async isSuperAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('usuario_empresas')
      .select(`
        perfis_acesso (nivel)
      `)
      .eq('user_id', user.id)
      .eq('ativo', true);

    if (!data) return false;

    return data.some((v: { perfis_acesso: unknown }) => {
      const perfil = v.perfis_acesso as unknown as { nivel: number };
      return perfil && perfil.nivel >= 5;
    });
  },

  /**
   * Lista todos os módulos do sistema
   */
  async getModulos(): Promise<Modulo[]> {
    const { data, error } = await supabase
      .from('modulos')
      .select('*')
      .eq('ativo', true)
      .order('ordem');

    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Lista ações de um módulo
   */
  async getModuloAcoes(moduloId: string): Promise<ModuloAcao[]> {
    const { data, error } = await supabase
      .from('modulo_acoes')
      .select('*')
      .eq('modulo_id', moduloId);

    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Lista perfis de acesso de uma empresa
   */
  async getPerfis(empresaId?: string): Promise<PerfilAcesso[]> {
    let query = supabase
      .from('perfis_acesso')
      .select('*')
      .eq('ativo', true)
      .order('nivel', { ascending: false });

    if (empresaId) {
      query = query.or(`empresa_id.eq.${empresaId},empresa_id.is.null`);
    } else {
      query = query.is('empresa_id', null);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Busca as empresas vinculadas ao usuário atual
   */
  async getUsuarioEmpresas(): Promise<UsuarioEmpresa[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('usuario_empresas')
      .select(`
        *,
        empresa:empresas (*),
        filial:filiais (*),
        perfil:perfis_acesso (*)
      `)
      .eq('user_id', user.id)
      .eq('ativo', true);

    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Busca a empresa padrão do usuário
   */
  async getEmpresaPadrao(): Promise<UsuarioEmpresa | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('usuario_empresas')
      .select(`
        *,
        empresa:empresas (*),
        filial:filiais (*),
        perfil:perfis_acesso (*)
      `)
      .eq('user_id', user.id)
      .eq('padrao', true)
      .eq('ativo', true)
      .single();

    if (error) {
      // Se não encontrar padrão, busca a primeira
      const { data: first } = await supabase
        .from('usuario_empresas')
        .select(`
          *,
          empresa:empresas (*),
          filial:filiais (*),
          perfil:perfis_acesso (*)
        `)
        .eq('user_id', user.id)
        .eq('ativo', true)
        .limit(1)
        .single();

      return first || null;
    }

    return data;
  }
};

export default permissaoService;
