'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  Fornecedor,
  CreateFornecedorDTO,
  UpdateFornecedorDTO
} from '../domain';
import type { ApiResponse, PaginatedResponse, ListParams } from '@/modules/core/domain';

const supabase = createClient();

// =====================================================
// Fornecedor Service
// =====================================================

export const fornecedorService = {
  /**
   * Lista fornecedores da empresa
   */
  async list(empresaId: string, params?: ListParams): Promise<PaginatedResponse<Fornecedor>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('fornecedores')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .is('deleted_at', null)
      .order(params?.orderBy || 'razao_social', { ascending: params?.order !== 'desc' })
      .range(offset, offset + pageSize - 1);

    if (params?.search) {
      query = query.or(`razao_social.ilike.%${params.search}%,cpf_cnpj.ilike.%${params.search}%,codigo.ilike.%${params.search}%`);
    }

    if (params?.filters?.ativo !== undefined) {
      query = query.eq('ativo', params.filters.ativo);
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
   * Busca fornecedor por ID
   */
  async getById(id: string): Promise<Fornecedor | null> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
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
   * Busca fornecedor por CPF/CNPJ
   */
  async getByCpfCnpj(empresaId: string, cpfCnpj: string): Promise<Fornecedor | null> {
    const { data, error } = await supabase
      .from('fornecedores')
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
   * Gera próximo código
   */
  async getProximoCodigo(empresaId: string): Promise<string> {
    const { data } = await supabase
      .from('fornecedores')
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
   * Cria novo fornecedor
   */
  async create(empresaId: string, dto: CreateFornecedorDTO): Promise<ApiResponse<Fornecedor>> {
    if (!dto.razao_social) {
      return { error: 'Razão social é obrigatória' };
    }

    if (!dto.codigo) {
      dto.codigo = await this.getProximoCodigo(empresaId);
    }

    if (dto.cpf_cnpj) {
      const existing = await this.getByCpfCnpj(empresaId, dto.cpf_cnpj);
      if (existing) {
        return { error: 'CPF/CNPJ já cadastrado' };
      }
    }

    const { data, error } = await supabase
      .from('fornecedores')
      .insert({
        ...dto,
        empresa_id: empresaId,
        tipo_pessoa: dto.tipo_pessoa || 'J'
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    await auditService.logInsert('fornecedores', data.id, data as unknown as Record<string, unknown>, empresaId);

    return { data, message: 'Fornecedor criado com sucesso' };
  },

  /**
   * Atualiza fornecedor
   */
  async update(id: string, dto: UpdateFornecedorDTO): Promise<ApiResponse<Fornecedor>> {
    const anterior = await this.getById(id);
    if (!anterior) {
      return { error: 'Fornecedor não encontrado' };
    }

    const { data, error } = await supabase
      .from('fornecedores')
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

    await auditService.logUpdate('fornecedores', id, anterior as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, anterior.empresa_id);

    return { data, message: 'Fornecedor atualizado com sucesso' };
  },

  /**
   * Soft delete
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    const fornecedor = await this.getById(id);
    if (!fornecedor) {
      return { error: 'Fornecedor não encontrado' };
    }

    const { error } = await supabase
      .from('fornecedores')
      .update({
        deleted_at: new Date().toISOString(),
        ativo: false
      })
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    await auditService.logDelete('fornecedores', id, fornecedor as unknown as Record<string, unknown>, fornecedor.empresa_id);

    return { message: 'Fornecedor excluído com sucesso' };
  }
};

export default fornecedorService;
