'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import type {
  Empresa,
  Filial,
  CreateEmpresaDTO,
  UpdateEmpresaDTO,
  CreateFilialDTO,
  UpdateFilialDTO,
  ApiResponse,
  PaginatedResponse,
  ListParams
} from '../domain';
import { usuarioEmpresaService } from './usuarioEmpresaService';

const supabase = createClient();

// =====================================================
// Empresa Service
// =====================================================

export const empresaService = {
  /**
   * Lista empresas do usuário autenticado
   */
  async list(params?: ListParams): Promise<PaginatedResponse<Empresa>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('empresas')
      .select('*', { count: 'exact' })
      .eq('ativo', true)
      .order(params?.orderBy || 'razao_social', { ascending: params?.order !== 'desc' })
      .range(offset, offset + pageSize - 1);

    if (params?.search) {
      query = query.or(`razao_social.ilike.%${params.search}%,nome_fantasia.ilike.%${params.search}%,cnpj.ilike.%${params.search}%`);
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
   * Lista todas as empresas (incluindo inativas)
   */
  async listAll(params?: ListParams): Promise<PaginatedResponse<Empresa>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('empresas')
      .select('*', { count: 'exact' })
      .order(params?.orderBy || 'razao_social', { ascending: params?.order !== 'desc' })
      .range(offset, offset + pageSize - 1);

    if (params?.search) {
      query = query.or(`razao_social.ilike.%${params.search}%,nome_fantasia.ilike.%${params.search}%,cnpj.ilike.%${params.search}%`);
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
   * Busca empresa por ID
   */
  async getById(id: string): Promise<Empresa | null> {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Busca empresa por CNPJ
   */
  async getByCnpj(cnpj: string): Promise<Empresa | null> {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('cnpj', cnpj)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Cria nova empresa
   */
  async create(dto: CreateEmpresaDTO): Promise<ApiResponse<Empresa>> {
    // Validação básica
    if (!dto.cnpj || !dto.razao_social) {
      return { error: 'CNPJ e razão social são obrigatórios' };
    }

    // Verifica se CNPJ já existe
    const existing = await this.getByCnpj(dto.cnpj);
    if (existing) {
      return { error: 'CNPJ já cadastrado' };
    }

    // Gera código se não fornecido
    const codigo = dto.codigo || `EMP${Date.now().toString().slice(-6)}`;

    // @ts-ignore
    const { data, error } = await supabase
      .from('empresas')
      .insert({
        ...dto,
        codigo,
        regime_tributario: dto.regime_tributario || 'simples_nacional',
        ativo: true
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Vincula o usuário criador à empresa para garantir acesso
    if (data) {
      await usuarioEmpresaService.vincularUsuario(data.id, undefined, undefined);
    }

    return { data, message: 'Empresa criada com sucesso' };
  },

  /**
   * Atualiza empresa
   */
  async update(id: string, dto: UpdateEmpresaDTO): Promise<ApiResponse<Empresa>> {
    // @ts-ignore
    const { data, error } = await supabase
      .from('empresas')
      .update({
        ...dto,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data, message: 'Empresa atualizada com sucesso' };
  },

  /**
   * Exclusão da empresa (soft delete via ativo=false)
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    // @ts-ignore
    const { error } = await supabase
      .from('empresas')
      .update({
        ativo: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    return { message: 'Empresa excluída com sucesso' };
  },

  /**
   * Exclusão permanente da empresa
   */
  async deletePermanent(id: string): Promise<ApiResponse<void>> {
    // @ts-ignore
    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    return { message: 'Empresa excluída permanentemente' };
  },

  /**
   * Ativa/desativa empresa
   */
  async toggleAtivo(id: string, ativo: boolean): Promise<ApiResponse<Empresa>> {
    return this.update(id, { ativo });
  }
};

// =====================================================
// Filial Service
// =====================================================

export const filialService = {
  /**
   * Lista filiais de uma empresa
   */
  async listByEmpresa(empresaId: string, params?: ListParams): Promise<PaginatedResponse<Filial>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('filiais')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order(params?.orderBy || 'nome', { ascending: params?.order !== 'desc' })
      .range(offset, offset + pageSize - 1);

    if (params?.search) {
      query = query.or(`nome.ilike.%${params.search}%,codigo.ilike.%${params.search}%`);
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
   * Busca filial por ID
   */
  async getById(id: string): Promise<Filial | null> {
    const { data, error } = await supabase
      .from('filiais')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Busca filial matriz de uma empresa
   */
  async getMatriz(empresaId: string): Promise<Filial | null> {
    const { data, error } = await supabase
      .from('filiais')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('matriz', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Cria nova filial
   */
  async create(dto: CreateFilialDTO): Promise<ApiResponse<Filial>> {
    if (!dto.empresa_id || !dto.codigo || !dto.nome) {
      return { error: 'Empresa, código e nome são obrigatórios' };
    }

    // @ts-ignore
    const { data, error } = await supabase
      .from('filiais')
      .insert({
        ...dto,
        ativo: true
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data, message: 'Filial criada com sucesso' };
  },

  /**
   * Atualiza filial
   */
  async update(id: string, dto: UpdateFilialDTO): Promise<ApiResponse<Filial>> {
    // @ts-ignore
    const { data, error } = await supabase
      .from('filiais')
      .update({
        ...dto,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data, message: 'Filial atualizada com sucesso' };
  },

  /**
   * Soft delete da filial
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    const { error } = await supabase
      .from('filiais')
      .update({
        ativo: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    return { message: 'Filial excluída com sucesso' };
  }
};

export default empresaService;
