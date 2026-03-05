'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  Produto,
  CreateProdutoDTO,
  UpdateProdutoDTO
} from '../domain';
import type { ApiResponse, PaginatedResponse, ListParams } from '@/modules/core/domain';

const supabase = createClient();

// =====================================================
// Produto Service
// =====================================================

export const produtoService = {
  /**
   * Lista produtos da empresa
   */
  async list(empresaId: string, params?: ListParams): Promise<PaginatedResponse<Produto>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('produtos')
      .select('*, categoria:categorias_produto(*), unidade:unidades_medida(*), ncm:ncms(*)', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .is('deleted_at', null)
      .order(params?.orderBy || 'descricao', { ascending: params?.order !== 'desc' })
      .range(offset, offset + pageSize - 1);

    if (params?.search) {
      query = query.or(`descricao.ilike.%${params.search}%,codigo.ilike.%${params.search}%,codigo_barras.ilike.%${params.search}%`);
    }

    if (params?.filters?.ativo !== undefined) {
      query = query.eq('ativo', params.filters.ativo);
    }

    if (params?.filters?.tipo) {
      query = query.eq('tipo', params.filters.tipo);
    }

    if (params?.filters?.categoria_id) {
      query = query.eq('categoria_id', params.filters.categoria_id);
    }

    if (params?.filters?.estoque_baixo) {
      query = query.lte('estoque_atual', supabase.rpc('get_estoque_minimo'));
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
   * Busca produto por ID
   */
  async getById(id: string): Promise<Produto | null> {
    const { data, error } = await supabase
      .from('produtos')
      .select('*, categoria:categorias_produto(*), unidade:unidades_medida(*), ncm:ncms(*)')
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
   * Busca produto por código de barras
   */
  async getByCodigoBarras(empresaId: string, codigoBarras: string): Promise<Produto | null> {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('codigo_barras', codigoBarras)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Gera próximo código de produto
   */
  async getProximoCodigo(empresaId: string): Promise<string> {
    const { data } = await supabase
      .from('produtos')
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
   * Cria novo produto
   */
  async create(empresaId: string, dto: CreateProdutoDTO): Promise<ApiResponse<Produto>> {
    if (!dto.descricao) {
      return { error: 'Descrição é obrigatória' };
    }

    // Gera código se não informado
    if (!dto.codigo) {
      dto.codigo = await this.getProximoCodigo(empresaId);
    }

    // Verifica se código de barras já existe
    if (dto.codigo_barras) {
      const existing = await this.getByCodigoBarras(empresaId, dto.codigo_barras);
      if (existing) {
        return { error: 'Código de barras já cadastrado' };
      }
    }

    const { data, error } = await supabase
      .from('produtos')
      .insert({
        ...dto,
        empresa_id: empresaId,
        tipo: dto.tipo || 'produto',
        origem: dto.origem || '0'
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    await auditService.logInsert('produtos', data.id, data as unknown as Record<string, unknown>, empresaId);

    return { data, message: 'Produto criado com sucesso' };
  },

  /**
   * Atualiza produto
   */
  async update(id: string, dto: UpdateProdutoDTO): Promise<ApiResponse<Produto>> {
    const anterior = await this.getById(id);
    if (!anterior) {
      return { error: 'Produto não encontrado' };
    }

    const { data, error } = await supabase
      .from('produtos')
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

    await auditService.logUpdate('produtos', id, anterior as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, anterior.empresa_id);

    return { data, message: 'Produto atualizado com sucesso' };
  },

  /**
   * Atualiza estoque do produto
   */
  async atualizarEstoque(id: string, quantidade: number, operacao: 'entrada' | 'saida'): Promise<ApiResponse<Produto>> {
    const produto = await this.getById(id);
    if (!produto) {
      return { error: 'Produto não encontrado' };
    }

    const novoEstoque = operacao === 'entrada'
      ? produto.estoque_atual + quantidade
      : produto.estoque_atual - quantidade;

    if (novoEstoque < 0) {
      return { error: 'Estoque insuficiente' };
    }

    return this.update(id, { estoque_atual: novoEstoque } as UpdateProdutoDTO);
  },

  /**
   * Soft delete do produto
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    const produto = await this.getById(id);
    if (!produto) {
      return { error: 'Produto não encontrado' };
    }

    const { error } = await supabase
      .from('produtos')
      .update({
        deleted_at: new Date().toISOString(),
        ativo: false
      })
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    await auditService.logDelete('produtos', id, produto as unknown as Record<string, unknown>, produto.empresa_id);

    return { message: 'Produto excluído com sucesso' };
  },

  /**
   * Lista produtos com estoque baixo
   */
  async getEstoqueBaixo(empresaId: string): Promise<Produto[]> {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .is('deleted_at', null);

    if (error) throw new Error(error.message);

    // Filter on client side for products where estoque_atual <= estoque_minimo
    return (data || []).filter((p) =>
      p.estoque_atual !== null &&
      p.estoque_minimo !== null &&
      p.estoque_atual <= p.estoque_minimo
    );
  }
};

export default produtoService;
