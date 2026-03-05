'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  Almoxarifado,
  CreateAlmoxarifadoDTO,
  UpdateAlmoxarifadoDTO,
  MovimentacaoEstoque,
  CreateMovimentacaoDTO,
  SaldoEstoque,
  MovimentacaoFilters,
  SaldoFilters
} from '../domain/index';
import type { ApiResponse, PaginatedResponse, ListParams } from '@/modules/core/domain/index';

const supabase = createClient();

// =====================================================
// Estoque Service
// =====================================================

export const estoqueService = {
  // =====================================================
  // Almoxarifados
  // =====================================================

  async listAlmoxarifados(empresaId: string, params?: ListParams): Promise<PaginatedResponse<Almoxarifado>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('almoxarifados')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order(params?.orderBy || 'descricao', { ascending: params?.order !== 'desc' })
      .range(offset, offset + pageSize - 1);

    if (params?.search) {
      query = query.or(`descricao.ilike.%${params.search}%,codigo.ilike.%${params.search}%`);
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

  async getAlmoxarifadoById(id: string): Promise<Almoxarifado | null> {
    const { data, error } = await supabase
      .from('almoxarifados')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async createAlmoxarifado(empresaId: string, dto: CreateAlmoxarifadoDTO): Promise<ApiResponse<Almoxarifado>> {
    if (!dto.descricao || !dto.codigo) {
      return { error: 'Descrição e código são obrigatórios' };
    }

    const { data, error } = await supabase
      .from('almoxarifados')
      .insert({
        ...dto,
        empresa_id: empresaId
      })
      .select()
      .single();

    if (error) return { error: error.message };

    await auditService.logInsert('almoxarifados', data.id, data as unknown as Record<string, unknown>, empresaId);
    return { data, message: 'Almoxarifado criado com sucesso' };
  },

  async updateAlmoxarifado(id: string, dto: UpdateAlmoxarifadoDTO): Promise<ApiResponse<Almoxarifado>> {
    const anterior = await this.getAlmoxarifadoById(id);
    if (!anterior) return { error: 'Almoxarifado não encontrado' };

    const { data, error } = await supabase
      .from('almoxarifados')
      .update({
        ...dto,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error.message };

    await auditService.logUpdate('almoxarifados', id, anterior as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, anterior.empresa_id);
    return { data, message: 'Almoxarifado atualizado com sucesso' };
  },

  // =====================================================
  // Movimentações
  // =====================================================

  async listMovimentacoes(empresaId: string, params?: ListParams & MovimentacaoFilters): Promise<PaginatedResponse<MovimentacaoEstoque>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('movimentacoes_estoque')
      .select(`
        *,
        produto:produtos(id, codigo, descricao),
        almoxarifado:almoxarifados(id, codigo, descricao)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params?.tipo) {
      query = query.eq('tipo', params.tipo);
    }
    if (params?.produto_id) {
      query = query.eq('produto_id', params.produto_id);
    }
    if (params?.almoxarifado_id) {
      query = query.eq('almoxarifado_id', params.almoxarifado_id);
    }
    if (params?.data_inicio) {
      query = query.gte('created_at', params.data_inicio);
    }
    if (params?.data_fim) {
      query = query.lte('created_at', params.data_fim);
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

  async registrarMovimentacao(empresaId: string, dto: CreateMovimentacaoDTO): Promise<ApiResponse<MovimentacaoEstoque>> {
    if (!dto.produto_id || !dto.quantidade) {
      return { error: 'Produto e quantidade são obrigatórios' };
    }

    // Busca quantidade anterior
    const { data: produto } = await supabase
      .from('produtos')
      .select('estoque_atual')
      .eq('id', dto.produto_id)
      .single();

    const quantidadeAnterior = produto?.estoque_atual || 0;
    const quantidadePosterior = dto.tipo === 'entrada' || dto.tipo === 'devolucao'
      ? quantidadeAnterior + dto.quantidade
      : quantidadeAnterior - dto.quantidade;

    const custo_total = dto.custo_unitario ? dto.custo_unitario * dto.quantidade : null;

    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .insert({
        empresa_id: empresaId,
        produto_id: dto.produto_id,
        almoxarifado_id: dto.almoxarifado_id,
        tipo: dto.tipo,
        quantidade: dto.quantidade,
        custo_unitario: dto.custo_unitario,
        custo_total,
        documento_tipo: dto.documento_tipo,
        documento_numero: dto.documento_numero,
        observacao: dto.observacao
      })
      .select()
      .single();

    if (error) return { error: error.message };

    return { data, message: 'Movimentação registrada com sucesso' };
  },

  // =====================================================
  // Saldos
  // =====================================================

  async listSaldos(empresaId: string, params?: ListParams & SaldoFilters): Promise<PaginatedResponse<SaldoEstoque>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('saldos_estoque')
      .select(`
        *,
        produto:produtos(id, codigo, descricao, estoque_minimo, estoque_maximo),
        almoxarifado:almoxarifados(id, codigo, descricao)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('produto_id')
      .range(offset, offset + pageSize - 1);

    if (params?.almoxarifado_id) {
      query = query.eq('almoxarifado_id', params.almoxarifado_id);
    }
    if (params?.estoque_zerado) {
      query = query.eq('quantidade', 0);
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

  async getSaldoProduto(empresaId: string, produtoId: string, almoxarifadoId?: string): Promise<SaldoEstoque | null> {
    let query = supabase
      .from('saldos_estoque')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('produto_id', produtoId);

    if (almoxarifadoId) {
      query = query.eq('almoxarifado_id', almoxarifadoId);
    }

    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  // =====================================================
  // Operações de Estoque Simplificadas
  // =====================================================

  async entradaEstoque(empresaId: string, produtoId: string, quantidade: number, opcoes?: {
    almoxarifadoId?: string;
    custoUnitario?: number;
    documentoTipo?: string;
    documentoNumero?: string;
    observacao?: string;
  }): Promise<ApiResponse<MovimentacaoEstoque>> {
    return this.registrarMovimentacao(empresaId, {
      produto_id: produtoId,
      quantidade,
      tipo: 'entrada',
      almoxarifado_id: opcoes?.almoxarifadoId,
      custo_unitario: opcoes?.custoUnitario,
      documento_tipo: opcoes?.documentoTipo,
      documento_numero: opcoes?.documentoNumero,
      observacao: opcoes?.observacao
    });
  },

  async saidaEstoque(empresaId: string, produtoId: string, quantidade: number, opcoes?: {
    almoxarifadoId?: string;
    documentoTipo?: string;
    documentoNumero?: string;
    observacao?: string;
  }): Promise<ApiResponse<MovimentacaoEstoque>> {
    return this.registrarMovimentacao(empresaId, {
      produto_id: produtoId,
      quantidade,
      tipo: 'saida',
      almoxarifado_id: opcoes?.almoxarifadoId,
      documento_tipo: opcoes?.documentoTipo,
      documento_numero: opcoes?.documentoNumero,
      observacao: opcoes?.observacao
    });
  },

  async ajustarEstoque(empresaId: string, produtoId: string, novaQuantidade: number, observacao?: string): Promise<ApiResponse<MovimentacaoEstoque>> {
    const { data: produto } = await supabase
      .from('produtos')
      .select('estoque_atual')
      .eq('id', produtoId)
      .single();

    const estoqueAtual = produto?.estoque_atual || 0;
    const diferenca = novaQuantidade - estoqueAtual;

    if (diferenca === 0) {
      return { error: 'Não há diferença para ajustar' };
    }

    return this.registrarMovimentacao(empresaId, {
      produto_id: produtoId,
      quantidade: Math.abs(diferenca),
      tipo: 'ajuste',
      observacao: observacao || `Ajuste de estoque: ${estoqueAtual} -> ${novaQuantidade}`
    });
  }
};

export default estoqueService;
