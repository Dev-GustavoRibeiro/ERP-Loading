'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  ContaPagar,
  ContaReceber,
  CreateContaPagarDTO,
  CreateContaReceberDTO,
  UpdateContaPagarDTO,
  UpdateContaReceberDTO,
  ContaBancaria,
  CreateContaBancariaDTO,
  CreateMovimentacaoBancariaDTO,
  MovimentacaoBancaria,
  PlanoConta,
  CentroCusto,
  ResumoFinanceiro
} from '../domain/index';
import type { ApiResponse, PaginatedResponse, ListParams } from '@/modules/core/domain/index';

const supabase = createClient();

// =====================================================
// Helpers
// =====================================================

/** Detecta erros de tabela inexistente / sem permissão no PostgREST */
function isTableError(error: { message: string } | null): boolean {
  if (!error) return false;
  const m = error.message;
  return m.includes('Could not find the table') ||
         (m.includes('relation') && m.includes('does not exist')) ||
         m.includes('permission denied');
}

/** Retorno vazio padrão para PaginatedResponse quando a tabela não existe */
function emptyPage<T>(page: number, pageSize: number): PaginatedResponse<T> & { tableNotFound?: boolean } {
  return { data: [], total: 0, page, pageSize, totalPages: 0, tableNotFound: true };
}

// =====================================================
// Financeiro Service
// =====================================================

export const financeiroService = {
  // =====================================================
  // Contas a Pagar
  // =====================================================

  async listContasPagar(empresaId: string, params?: ListParams & {
    status?: string;
    fornecedor_id?: string;
    data_vencimento_inicio?: string;
    data_vencimento_fim?: string;
  }): Promise<PaginatedResponse<ContaPagar> & { tableNotFound?: boolean }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('contas_pagar')
      .select(`
        *,
        fornecedor:fornecedores(id, razao_social)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.fornecedor_id) {
      query = query.eq('fornecedor_id', params.fornecedor_id);
    }
    if (params?.data_vencimento_inicio) {
      query = query.gte('data_vencimento', params.data_vencimento_inicio);
    }
    if (params?.data_vencimento_fim) {
      query = query.lte('data_vencimento', params.data_vencimento_fim);
    }

    const { data, error, count } = await query;
    if (error) {
      if (isTableError(error)) return emptyPage<ContaPagar>(page, pageSize);
      throw new Error(error.message);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  },

  async createContaPagar(empresaId: string, dto: CreateContaPagarDTO): Promise<ApiResponse<ContaPagar>> {
    const { data, error } = await supabase
      .from('contas_pagar')
      .insert({
        ...dto,
        empresa_id: empresaId,
        status: 'aberta'
      })
      .select()
      .single();

    if (error) return { error: error.message };

    await auditService.logInsert('contas_pagar', data.id, data as unknown as Record<string, unknown>, empresaId);
    return { data, message: 'Conta a pagar criada com sucesso' };
  },

  async pagarConta(id: string, dto: {
    data_pagamento: string;
    valor_pago: number;
    conta_bancaria_id: string;
    valor_juros?: number;
    valor_multa?: number;
    valor_desconto?: number;
  }): Promise<ApiResponse<ContaPagar>> {
    const { data: conta, error: fetchError } = await supabase
      .from('contas_pagar')
      .select('*, empresa_id')
      .eq('id', id)
      .single();

    if (fetchError || !conta) return { error: 'Conta não encontrada' };

    const valorTotal = conta.valor_original + (dto.valor_juros || 0) + (dto.valor_multa || 0) - (dto.valor_desconto || 0);
    const novoPago = conta.valor_pago + dto.valor_pago;
    const novoStatus = novoPago >= valorTotal ? 'paga' : 'parcial';

    // Atualiza a conta
    const { data, error } = await supabase
      .from('contas_pagar')
      .update({
        data_pagamento: dto.data_pagamento,
        valor_pago: novoPago,
        valor_juros: dto.valor_juros || conta.valor_juros,
        valor_multa: dto.valor_multa || conta.valor_multa,
        valor_desconto: dto.valor_desconto || conta.valor_desconto,
        conta_bancaria_id: dto.conta_bancaria_id,
        status: novoStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error.message };

    // Registra movimentação bancária
    const { data: contaBancaria } = await supabase
      .from('contas_bancarias')
      .select('saldo_atual')
      .eq('id', dto.conta_bancaria_id)
      .single();

    await supabase.from('movimentacoes_bancarias').insert({
      empresa_id: conta.empresa_id,
      conta_bancaria_id: dto.conta_bancaria_id,
      tipo: 'debito',
      data_movimentacao: dto.data_pagamento,
      valor: dto.valor_pago,
      saldo_anterior: contaBancaria?.saldo_atual || 0,
      saldo_posterior: (contaBancaria?.saldo_atual || 0) - dto.valor_pago,
      conta_pagar_id: id,
      descricao: `Pagamento - ${conta.numero_documento || 'Conta a Pagar'}`
    });

    await auditService.logUpdate('contas_pagar', id, conta as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, conta.empresa_id);
    return { data, message: 'Pagamento registrado com sucesso' };
  },

  // =====================================================
  // Contas a Receber
  // =====================================================

  async listContasReceber(empresaId: string, params?: ListParams & {
    status?: string;
    cliente_id?: string;
    data_vencimento_inicio?: string;
    data_vencimento_fim?: string;
  }): Promise<PaginatedResponse<ContaReceber> & { tableNotFound?: boolean }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('contas_receber')
      .select(`
        *,
        cliente:clientes(id, nome)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.cliente_id) {
      query = query.eq('cliente_id', params.cliente_id);
    }
    if (params?.data_vencimento_inicio) {
      query = query.gte('data_vencimento', params.data_vencimento_inicio);
    }
    if (params?.data_vencimento_fim) {
      query = query.lte('data_vencimento', params.data_vencimento_fim);
    }

    const { data, error, count } = await query;
    if (error) {
      if (isTableError(error)) return emptyPage<ContaReceber>(page, pageSize);
      throw new Error(error.message);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  },

  async createContaReceber(empresaId: string, dto: CreateContaReceberDTO): Promise<ApiResponse<ContaReceber>> {
    const { data, error } = await supabase
      .from('contas_receber')
      .insert({
        ...dto,
        empresa_id: empresaId,
        status: 'aberta'
      })
      .select()
      .single();

    if (error) return { error: error.message };

    await auditService.logInsert('contas_receber', data.id, data as unknown as Record<string, unknown>, empresaId);
    return { data, message: 'Conta a receber criada com sucesso' };
  },

  async receberConta(id: string, dto: {
    data_recebimento: string;
    valor_recebido: number;
    conta_bancaria_id: string;
    valor_juros?: number;
    valor_multa?: number;
    valor_desconto?: number;
  }): Promise<ApiResponse<ContaReceber>> {
    const { data: conta, error: fetchError } = await supabase
      .from('contas_receber')
      .select('*, empresa_id')
      .eq('id', id)
      .single();

    if (fetchError || !conta) return { error: 'Conta não encontrada' };

    const valorTotal = conta.valor_original + (dto.valor_juros || 0) + (dto.valor_multa || 0) - (dto.valor_desconto || 0);
    const novoRecebido = conta.valor_recebido + dto.valor_recebido;
    const novoStatus = novoRecebido >= valorTotal ? 'recebida' : 'parcial';

    const { data, error } = await supabase
      .from('contas_receber')
      .update({
        data_recebimento: dto.data_recebimento,
        valor_recebido: novoRecebido,
        valor_juros: dto.valor_juros || conta.valor_juros,
        valor_multa: dto.valor_multa || conta.valor_multa,
        valor_desconto: dto.valor_desconto || conta.valor_desconto,
        conta_bancaria_id: dto.conta_bancaria_id,
        status: novoStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error.message };

    // Registra movimentação bancária
    const { data: contaBancaria } = await supabase
      .from('contas_bancarias')
      .select('saldo_atual')
      .eq('id', dto.conta_bancaria_id)
      .single();

    await supabase.from('movimentacoes_bancarias').insert({
      empresa_id: conta.empresa_id,
      conta_bancaria_id: dto.conta_bancaria_id,
      tipo: 'credito',
      data_movimentacao: dto.data_recebimento,
      valor: dto.valor_recebido,
      saldo_anterior: contaBancaria?.saldo_atual || 0,
      saldo_posterior: (contaBancaria?.saldo_atual || 0) + dto.valor_recebido,
      conta_receber_id: id,
      descricao: `Recebimento - ${conta.numero_documento || 'Conta a Receber'}`
    });

    await auditService.logUpdate('contas_receber', id, conta as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, conta.empresa_id);
    return { data, message: 'Recebimento registrado com sucesso' };
  },

  // =====================================================
  // Contas Bancárias
  // =====================================================

  async listContasBancarias(empresaId: string): Promise<ContaBancaria[] & { tableNotFound?: boolean }> {
    const { data, error } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('banco_nome');

    if (error) {
      if (isTableError(error)) {
        const empty: ContaBancaria[] & { tableNotFound?: boolean } = [];
        empty.tableNotFound = true;
        return empty;
      }
      throw new Error(error.message);
    }
    return data || [];
  },

  async createContaBancaria(empresaId: string, dto: CreateContaBancariaDTO): Promise<ApiResponse<ContaBancaria>> {
    const { data, error } = await supabase
      .from('contas_bancarias')
      .insert({
        ...dto,
        empresa_id: empresaId,
        saldo_atual: dto.saldo_inicial || 0
      })
      .select()
      .single();

    if (error) return { error: error.message };

    await auditService.logInsert('contas_bancarias', data.id, data as unknown as Record<string, unknown>, empresaId);
    return { data, message: 'Conta bancária criada com sucesso' };
  },

  // =====================================================
  // Resumos e Relatórios
  // =====================================================

  async getResumoFinanceiro(empresaId: string, dataInicio: string, dataFim: string): Promise<ResumoFinanceiro> {
    const hoje = new Date().toISOString().split('T')[0];

    // Queries isoladas — se a tabela não existe, data fica null e os cálculos retornam 0
    const [pagarResult, receberResult] = await Promise.all([
      supabase
        .from('contas_pagar')
        .select('valor_original, valor_pago, status, data_vencimento')
        .eq('empresa_id', empresaId)
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim),
      supabase
        .from('contas_receber')
        .select('valor_original, valor_recebido, status, data_vencimento')
        .eq('empresa_id', empresaId)
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim),
    ]);

    const pagar = pagarResult.error ? null : pagarResult.data;
    const receber = receberResult.error ? null : receberResult.data;

    const totalPagar = pagar?.reduce((sum, c) => sum + (c.valor_original - c.valor_pago), 0) || 0;
    const totalReceber = receber?.reduce((sum, c) => sum + (c.valor_original - c.valor_recebido), 0) || 0;
    const pago = pagar?.filter(c => c.status === 'paga').reduce((sum, c) => sum + c.valor_original, 0) || 0;
    const recebido = receber?.filter(c => c.status === 'recebida').reduce((sum, c) => sum + c.valor_original, 0) || 0;
    const vencidosPagar = pagar?.filter(c => c.status !== 'paga' && c.data_vencimento < hoje).reduce((sum, c) => sum + (c.valor_original - c.valor_pago), 0) || 0;
    const vencidosReceber = receber?.filter(c => c.status !== 'recebida' && c.data_vencimento < hoje).reduce((sum, c) => sum + (c.valor_original - c.valor_recebido), 0) || 0;

    return {
      periodo: `${dataInicio} a ${dataFim}`,
      total_pagar: totalPagar,
      total_receber: totalReceber,
      saldo_previsto: totalReceber - totalPagar,
      pago,
      recebido,
      vencidos_pagar: vencidosPagar,
      vencidos_receber: vencidosReceber
    };
  }
};

export default financeiroService;
