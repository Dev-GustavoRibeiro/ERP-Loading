'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  PedidoVenda,
  CreatePedidoVendaDTO,
  UpdatePedidoVendaDTO,
  Orcamento,
  CreateOrcamentoDTO,
  UpdateOrcamentoDTO
} from '../domain/index';
import type { ApiResponse, PaginatedResponse, ListParams } from '@/modules/core/domain/index';

const supabase = createClient();

// =====================================================
// Vendas Service
// =====================================================

export const vendasService = {
  // =====================================================
  // Orçamentos
  // =====================================================

  async listOrcamentos(empresaId: string, params?: ListParams & {
    status?: string;
    cliente_id?: string;
    vendedor_id?: string;
    data_inicio?: string;
    data_fim?: string;
  }): Promise<PaginatedResponse<Orcamento>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('orcamentos')
      .select(`
        *,
        cliente:clientes(id, nome, cpf_cnpj),
        vendedor:vendedores(id, nome)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('data_orcamento', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params?.search) {
      query = query.or(`numero.ilike.%${params.search}%`);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.cliente_id) {
      query = query.eq('cliente_id', params.cliente_id);
    }
    if (params?.vendedor_id) {
      query = query.eq('vendedor_id', params.vendedor_id);
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

  async getOrcamentoById(id: string): Promise<Orcamento | null> {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(`
        *,
        cliente:clientes(id, nome, cpf_cnpj),
        vendedor:vendedores(id, nome),
        itens:orcamento_itens(
          *,
          produto:produtos(id, codigo, descricao)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  // =====================================================
  // Pedidos de Venda
  // =====================================================

  async listPedidos(empresaId: string, params?: ListParams & {
    status?: string;
    cliente_id?: string;
    vendedor_id?: string;
    data_inicio?: string;
    data_fim?: string;
  }): Promise<PaginatedResponse<PedidoVenda>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('pedidos_venda')
      .select(`
        *,
        cliente:clientes(id, nome, cpf_cnpj),
        vendedor:vendedores(id, nome, comissao_percentual)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('data_pedido', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params?.search) {
      query = query.or(`numero.ilike.%${params.search}%`);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.cliente_id) {
      query = query.eq('cliente_id', params.cliente_id);
    }
    if (params?.vendedor_id) {
      query = query.eq('vendedor_id', params.vendedor_id);
    }

    const { data, error, count } = await query;
    if (error) {
      console.warn('vendasService.listPedidos:', error.message);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  },

  async getPedidoById(id: string): Promise<PedidoVenda | null> {
    const { data, error } = await supabase
      .from('pedidos_venda')
      .select(`
        *,
        cliente:clientes(id, nome, cpf_cnpj),
        vendedor:vendedores(id, nome, comissao_percentual),
        itens:pedido_venda_itens(
          *,
          produto:produtos(id, codigo, descricao)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async getProximoNumero(empresaId: string, tipo: 'orcamento' | 'pedido'): Promise<string> {
    const tabela = tipo === 'orcamento' ? 'orcamentos' : 'pedidos_venda';

    const { data } = await supabase
      .from(tabela)
      .select('numero')
      .eq('empresa_id', empresaId)
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    if (!data) return '00001';
    const ultimo = parseInt(data.numero, 10);
    return String(ultimo + 1).padStart(5, '0');
  },

  async createPedido(empresaId: string, dto: CreatePedidoVendaDTO): Promise<ApiResponse<PedidoVenda>> {
    if (!dto.cliente_id) {
      return { error: 'Cliente é obrigatório' };
    }
    if (!dto.itens || dto.itens.length === 0) {
      return { error: 'O pedido deve ter pelo menos um item' };
    }

    // Busca comissão do vendedor
    let comissaoPercentual = 0;
    if (dto.vendedor_id) {
      const { data: vendedor } = await supabase
        .from('vendedores')
        .select('comissao_percentual')
        .eq('id', dto.vendedor_id)
        .single();
      comissaoPercentual = vendedor?.comissao_percentual || 0;
    }

    // Calcula totais
    const itensCalculados = dto.itens.map((item, index) => {
      const desconto = item.desconto_percentual ? item.preco_unitario * (item.desconto_percentual / 100) : 0;
      const total = (item.preco_unitario - desconto) * item.quantidade;
      return {
        ...item,
        descricao: item.descricao,
        desconto_valor: desconto * item.quantidade,
        total,
        ordem: item.ordem ?? index
      };
    });

    const subtotal = itensCalculados.reduce((sum, item) => sum + item.total, 0);
    const descontoTotal = dto.desconto_valor || (subtotal * (dto.desconto_percentual || 0) / 100);
    const total = subtotal + (dto.frete_valor || 0) - descontoTotal;
    const comissaoValor = total * (comissaoPercentual / 100);

    // Insere o pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_venda')
      .insert({
        empresa_id: empresaId,
        numero: dto.numero,
        cliente_id: dto.cliente_id,
        vendedor_id: dto.vendedor_id,
        orcamento_id: dto.orcamento_id,
        data_entrega_prevista: dto.data_entrega_prevista,
        condicao_pagamento_id: dto.condicao_pagamento_id,
        transportadora_id: dto.transportadora_id,
        frete: dto.frete_valor || 0,
        desconto_percentual: dto.desconto_percentual || 0,
        desconto: descontoTotal,
        subtotal,
        total,
        observacoes: dto.observacao
      })
      .select()
      .single();

    if (pedidoError) return { error: pedidoError.message };

    // Insere os itens
    const itensParaInserir = itensCalculados.map(item => ({
      pedido_id: pedido.id,
      produto_id: item.produto_id,
      servico_id: item.servico_id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto_percentual: item.desconto_percentual || 0,
      valor_total: item.total,
      cfop_id: item.cfop_id
    }));

    const { error: itensError } = await supabase
      .from('pedido_venda_itens')
      .insert(itensParaInserir);

    if (itensError) {
      await supabase.from('pedidos_venda').delete().eq('id', pedido.id);
      return { error: itensError.message };
    }

    await auditService.logInsert('pedidos_venda', pedido.id, pedido as unknown as Record<string, unknown>, empresaId);
    return { data: pedido, message: 'Pedido de venda criado com sucesso' };
  },

  async updatePedido(id: string, dto: UpdatePedidoVendaDTO): Promise<ApiResponse<PedidoVenda>> {
    const anterior = await this.getPedidoById(id);
    if (!anterior) return { error: 'Pedido não encontrado' };

    const { data, error } = await supabase
      .from('pedidos_venda')
      .update({
        ...dto,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error.message };

    await auditService.logUpdate('pedidos_venda', id, anterior as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, anterior.empresa_id);
    return { data, message: 'Pedido atualizado com sucesso' };
  },

  async aprovarPedido(id: string): Promise<ApiResponse<PedidoVenda>> {
    const pedido = await this.getPedidoById(id);
    if (!pedido) return { error: 'Pedido não encontrado' };

    // Gera comissão ao aprovar
    if (pedido.vendedor_id) {
      await supabase.from('comissoes').insert({
        empresa_id: pedido.empresa_id,
        vendedor_id: pedido.vendedor_id,
        pedido_venda_id: pedido.id,
        valor_base: pedido.total,
        status: 'pendente'
      });
    }

    return this.updatePedido(id, { status: 'aprovado' });
  },

  async faturarPedido(id: string): Promise<ApiResponse<PedidoVenda>> {
    return this.updatePedido(id, { status: 'faturado' });
  },

  async cancelarPedido(id: string): Promise<ApiResponse<PedidoVenda>> {
    return this.updatePedido(id, { status: 'cancelado' });
  }
};

export default vendasService;
