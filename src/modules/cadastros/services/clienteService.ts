'use client';

import { createLegacyTenantClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  Cliente,
  CreateClienteDTO,
  UpdateClienteDTO
} from '../domain';
import type { ApiResponse, PaginatedResponse, ListParams } from '@/modules/core/domain';

// Usa o client do TENANT (ERP data), não do ADMIN (auth).
const supabase = createLegacyTenantClient();

// =====================================================
// Cliente Service
// =====================================================

export const clienteService = {
  /**
   * Lista clientes da empresa
   */
  async list(empresaId: string, params?: ListParams): Promise<PaginatedResponse<Cliente>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('clientes')
      .select('*, condicoes_pagamento(*), vendedores(*)', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .is('deleted_at', null)
      .order(params?.orderBy || 'nome', { ascending: params?.order !== 'desc' })
      .range(offset, offset + pageSize - 1);

    if (params?.search) {
      query = query.or(`nome.ilike.%${params.search}%,cpf_cnpj.ilike.%${params.search}%,codigo.ilike.%${params.search}%`);
    }

    if (params?.filters?.ativo !== undefined) {
      query = query.eq('ativo', params.filters.ativo);
    }

    if (params?.filters?.tipo_pessoa) {
      query = query.eq('tipo_pessoa', params.filters.tipo_pessoa);
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
   * Busca cliente por ID
   */
  async getById(id: string): Promise<Cliente | null> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*, condicoes_pagamento(*), vendedores(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Busca cliente por CPF/CNPJ
   */
  async getByCpfCnpj(empresaId: string, cpfCnpj: string): Promise<Cliente | null> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('cpf_cnpj', cpfCnpj)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Gera próximo código de cliente
   */
  async getProximoCodigo(empresaId: string): Promise<string> {
    const { data } = await supabase
      .from('clientes')
      .select('codigo')
      .eq('empresa_id', empresaId)
      .order('codigo', { ascending: false })
      .limit(1)
      .single();

    if (!data) return '00001';

    const ultimoCodigo = parseInt(data.codigo, 10);
    return String(ultimoCodigo + 1).padStart(5, '0');
  },

  /**
   * Cria novo cliente
   */
  async create(empresaId: string, dto: CreateClienteDTO): Promise<ApiResponse<Cliente>> {
    if (!dto.nome) {
      return { error: 'Nome é obrigatório' };
    }

    // Gera código se não informado
    if (!dto.codigo) {
      dto.codigo = await this.getProximoCodigo(empresaId);
    }

    // Verifica se CPF/CNPJ já existe
    if (dto.cpf_cnpj) {
      const existing = await this.getByCpfCnpj(empresaId, dto.cpf_cnpj);
      if (existing) {
        return { error: 'CPF/CNPJ já cadastrado' };
      }
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert({
        ...dto,
        empresa_id: empresaId
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Registra auditoria
    await auditService.logInsert('clientes', data.id, data as unknown as Record<string, unknown>, empresaId);

    return { data, message: 'Cliente criado com sucesso' };
  },

  /**
   * Atualiza cliente
   */
  async update(id: string, dto: UpdateClienteDTO): Promise<ApiResponse<Cliente>> {
    // Busca dados anteriores para auditoria
    const anterior = await this.getById(id);
    if (!anterior) {
      return { error: 'Cliente não encontrado' };
    }

    const { data, error } = await supabase
      .from('clientes')
      .update({
        ...dto,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Registra auditoria
    await auditService.logUpdate('clientes', id, anterior as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, anterior.empresa_id);

    return { data, message: 'Cliente atualizado com sucesso' };
  },

  /**
   * Soft delete do cliente
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    const cliente = await this.getById(id);
    if (!cliente) {
      return { error: 'Cliente não encontrado' };
    }

    const { error } = await supabase
      .from('clientes')
      .update({
        deleted_at: new Date().toISOString(),
        ativo: false
      })
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    // Registra auditoria
    await auditService.logDelete('clientes', id, cliente as unknown as Record<string, unknown>, cliente.empresa_id);

    return { message: 'Cliente excluído com sucesso' };
  },

  /**
   * Ativa/desativa cliente
   */
  async toggleAtivo(id: string, ativo: boolean): Promise<ApiResponse<Cliente>> {
    return this.update(id, { ativo });
  }
};

export default clienteService;
