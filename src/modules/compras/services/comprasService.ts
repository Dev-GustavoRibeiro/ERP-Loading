'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  PedidoCompra,
  PedidoCompraItem,
  CreatePedidoCompraDTO,
  UpdatePedidoCompraDTO
} from '../domain/index';
import type { ApiResponse, PaginatedResponse, ListParams } from '@/modules/core/domain/index';

const supabase = createClient();

// =====================================================
// Compras Service
// =====================================================

export const comprasService = {
  // =====================================================
  // Pedidos de Compra
  // =====================================================

  async listPedidos(empresaId: string, params?: ListParams & {
    status?: string;
    fornecedor_id?: string;
    data_inicio?: string;
    data_fim?: string;
  }): Promise<PaginatedResponse<PedidoCompra>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('pedidos_compra')
      .select(`
        *,
        fornecedor:fornecedores(id, razao_social, cpf_cnpj)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .is('deleted_at', null)
      .order('data_pedido', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params?.search) {
      query = query.or(`numero.ilike.%${params.search}%`);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.fornecedor_id) {
      query = query.eq('fornecedor_id', params.fornecedor_id);
    }
    if (params?.data_inicio) {
      query = query.gte('data_pedido', params.data_inicio);
    }
    if (params?.data_fim) {
      query = query.lte('data_pedido', params.data_fim);
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

  async getPedidoById(id: string): Promise<PedidoCompra | null> {
    const { data, error } = await supabase
      .from('pedidos_compra')
      .select(`
        *,
        fornecedor:fornecedores(id, razao_social, cpf_cnpj),
        itens:pedido_compra_itens(
          *,
          produto:produtos(id, codigo, descricao)
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async getProximoNumero(empresaId: string): Promise<string> {
    const { data } = await supabase
      .from('pedidos_compra')
      .select('numero')
      .eq('empresa_id', empresaId)
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    if (!data) return '00001';
    const ultimo = parseInt(data.numero, 10);
    return String(ultimo + 1).padStart(5, '0');
  },

  async createPedido(empresaId: string, dto: CreatePedidoCompraDTO): Promise<ApiResponse<PedidoCompra>> {
    if (!dto.fornecedor_id) {
      return { error: 'Fornecedor é obrigatório' };
    }
    if (!dto.itens || dto.itens.length === 0) {
      return { error: 'O pedido deve ter pelo menos um item' };
    }

    // Calcula totais
    const itensCalculados = dto.itens.map(item => {
      const desconto = item.desconto_percentual ? item.preco_unitario * (item.desconto_percentual / 100) : 0;
      const total = (item.preco_unitario - desconto) * item.quantidade;
      return { ...item, desconto_valor: desconto * item.quantidade, total };
    });

    const subtotal = itensCalculados.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + (dto.frete_valor || 0) + (dto.outras_despesas || 0) - (dto.desconto_valor || 0);

    // Insere o pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_compra')
      .insert({
        empresa_id: empresaId,
        numero: dto.numero,
        fornecedor_id: dto.fornecedor_id,
        filial_id: dto.filial_id,
        cotacao_id: dto.cotacao_id,
        requisicao_id: dto.requisicao_id,
        data_entrega_prevista: dto.data_entrega_prevista,
        condicao_pagamento_id: dto.condicao_pagamento_id,
        forma_pagamento_id: dto.forma_pagamento_id,
        transportadora_id: dto.transportadora_id,
        frete_tipo: dto.frete_tipo || 'CIF',
        frete_valor: dto.frete_valor || 0,
        desconto_valor: dto.desconto_valor || 0,
        outras_despesas: dto.outras_despesas || 0,
        subtotal,
        total,
        observacao: dto.observacao
      })
      .select()
      .single();

    if (pedidoError) return { error: pedidoError.message };

    // Insere os itens
    const itensParaInserir = itensCalculados.map(item => ({
      pedido_id: pedido.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      unidade_medida_id: item.unidade_medida_id,
      preco_unitario: item.preco_unitario,
      desconto_percentual: item.desconto_percentual || 0,
      desconto_valor: item.desconto_valor,
      total: item.total,
      cfop_id: item.cfop_id,
      ncm_id: item.ncm_id
    }));

    const { error: itensError } = await supabase
      .from('pedido_compra_itens')
      .insert(itensParaInserir);

    if (itensError) {
      await supabase.from('pedidos_compra').delete().eq('id', pedido.id);
      return { error: itensError.message };
    }

    await auditService.logInsert('pedidos_compra', pedido.id, pedido as unknown as Record<string, unknown>, empresaId);
    return { data: pedido, message: 'Pedido de compra criado com sucesso' };
  },

  async updatePedido(id: string, dto: UpdatePedidoCompraDTO): Promise<ApiResponse<PedidoCompra>> {
    const anterior = await this.getPedidoById(id);
    if (!anterior) return { error: 'Pedido não encontrado' };

    const { data, error } = await supabase
      .from('pedidos_compra')
      .update({
        ...dto,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) return { error: error.message };

    await auditService.logUpdate('pedidos_compra', id, anterior as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, anterior.empresa_id);
    return { data, message: 'Pedido atualizado com sucesso' };
  },

  async aprovarPedido(id: string): Promise<ApiResponse<PedidoCompra>> {
    return this.updatePedido(id, { status: 'aprovado' });
  },

  async cancelarPedido(id: string): Promise<ApiResponse<PedidoCompra>> {
    return this.updatePedido(id, { status: 'cancelado' });
  },

  async deletePedido(id: string): Promise<ApiResponse<void>> {
    const pedido = await this.getPedidoById(id);
    if (!pedido) return { error: 'Pedido não encontrado' };

    if (pedido.status !== 'pendente') {
      return { error: 'Apenas pedidos pendentes podem ser excluídos' };
    }

    const { error } = await supabase
      .from('pedidos_compra')
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) return { error: error.message };

    await auditService.logDelete('pedidos_compra', id, pedido as unknown as Record<string, unknown>, pedido.empresa_id);
    return { message: 'Pedido excluído com sucesso' };
  }
};

export default comprasService;
