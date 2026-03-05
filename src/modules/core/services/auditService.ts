'use client';

import { createLegacyTenantClient } from '@/shared/lib/supabase/client';
import type { AuditLog, ListParams, PaginatedResponse } from '../domain/index';

// Usa o client do TENANT (ERP data), não do ADMIN (auth).
const supabase = createLegacyTenantClient();

// =====================================================
// Audit Service
// =====================================================

export const auditService = {
  /**
   * Registra uma alteração no log de auditoria
   */
  async logChange(params: {
    empresaId?: string;
    tabela: string;
    registroId: string;
    acao: 'INSERT' | 'UPDATE' | 'DELETE';
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
    camposAlterados?: string[];
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('audit_log')
      .insert({
        user_id: user?.id,
        empresa_id: params.empresaId,
        tabela: params.tabela,
        registro_id: params.registroId,
        acao: params.acao,
        dados_antes: params.dadosAntes,
        dados_depois: params.dadosDepois,
        campos_alterados: params.camposAlterados,
        ip_address: params.ipAddress,
        user_agent: params.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined)
      });

    if (error) {
      console.error('Erro ao registrar auditoria:', error);
    }
  },

  /**
   * Registra inserção
   */
  async logInsert(tabela: string, registroId: string, dados: Record<string, unknown>, empresaId?: string): Promise<void> {
    await this.logChange({
      empresaId,
      tabela,
      registroId,
      acao: 'INSERT',
      dadosDepois: dados
    });
  },

  /**
   * Registra atualização
   */
  async logUpdate(
    tabela: string,
    registroId: string,
    dadosAntes: Record<string, unknown>,
    dadosDepois: Record<string, unknown>,
    empresaId?: string
  ): Promise<void> {
    // Calcula campos alterados
    const camposAlterados: string[] = [];
    for (const key of Object.keys(dadosDepois)) {
      if (JSON.stringify(dadosAntes[key]) !== JSON.stringify(dadosDepois[key])) {
        camposAlterados.push(key);
      }
    }

    await this.logChange({
      empresaId,
      tabela,
      registroId,
      acao: 'UPDATE',
      dadosAntes,
      dadosDepois,
      camposAlterados
    });
  },

  /**
   * Registra exclusão
   */
  async logDelete(tabela: string, registroId: string, dados: Record<string, unknown>, empresaId?: string): Promise<void> {
    await this.logChange({
      empresaId,
      tabela,
      registroId,
      acao: 'DELETE',
      dadosAntes: dados
    });
  },

  /**
   * Registra uma ação genérica (usado pelo PDV)
   */
  async log(params: {
    acao: string;
    tabela: string;
    registro_id: string;
    dados_novos?: Record<string, unknown>;
    dados_anteriores?: Record<string, unknown>;
  }): Promise<void> {
    await this.logChange({
      tabela: params.tabela,
      registroId: params.registro_id,
      acao: params.acao.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE',
      dadosDepois: params.dados_novos,
      dadosAntes: params.dados_anteriores
    });
  },

  /**
   * Lista logs de auditoria
   */
  async list(params?: ListParams & {
    tabela?: string;
    registroId?: string;
    acao?: 'INSERT' | 'UPDATE' | 'DELETE';
    empresaId?: string;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<PaginatedResponse<AuditLog>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params?.tabela) {
      query = query.eq('tabela', params.tabela);
    }

    if (params?.registroId) {
      query = query.eq('registro_id', params.registroId);
    }

    if (params?.acao) {
      query = query.eq('acao', params.acao);
    }

    if (params?.empresaId) {
      query = query.eq('empresa_id', params.empresaId);
    }

    if (params?.dataInicio) {
      query = query.gte('created_at', params.dataInicio);
    }

    if (params?.dataFim) {
      query = query.lte('created_at', params.dataFim);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  },

  /**
   * Busca histórico de um registro específico
   */
  async getHistoricoRegistro(tabela: string, registroId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('tabela', tabela)
      .eq('registro_id', registroId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Busca atividades recentes do usuário
   */
  async getAtividadesUsuario(userId: string, limit = 20): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  }
};

export default auditService;
