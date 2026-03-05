'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  Boleto,
  CreateBoletoDTO,
  BoletoRemessa,
  BoletoRetorno
} from '../domain';

// Helper type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// Boleto Service
// =====================================================

export const boletoService = {
  // =====================================================
  // Boletos
  // =====================================================

  async listBoletos(empresaId: string, params?: {
    status?: string;
    cliente_id?: string;
    data_vencimento_inicio?: string;
    data_vencimento_fim?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Boleto[]; total: number }> {
    const supabase = createClient();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // @ts-ignore
    let query = supabase
      .from('boletos')
      .select(`
        *,
        cliente:clientes(id, nome, cpf_cnpj),
        conta_receber:contas_receber(id, documento_numero, valor_original)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true })
      .range(from, to);

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
      console.error('Erro ao listar boletos:', error);
      return { data: [], total: 0 };
    }

    return { data: data as Boleto[], total: count || 0 };
  },

  async getBoletoById(id: string): Promise<Boleto | null> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('boletos')
      .select(`
        *,
        cliente:clientes(id, nome, cpf_cnpj, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf, endereco_cep),
        conta_receber:contas_receber(*)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Boleto;
  },

  async createBoleto(empresaId: string, dto: CreateBoletoDTO): Promise<ApiResponse<Boleto>> {
    const supabase = createClient();

    // Gerar nosso número
    const nossoNumero = await this.gerarNossoNumero(empresaId, dto.conta_bancaria_id);

    // @ts-ignore
    const { data, error } = await supabase
      .from('boletos')
      .insert({
        empresa_id: empresaId,
        ...dto,
        nosso_numero: nossoNumero,
        status: 'gerado'
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await auditService.logInsert('boletos', data.id, data, empresaId);

    return { success: true, data: data as Boleto };
  },

  async gerarNossoNumero(empresaId: string, contaBancariaId: string): Promise<string> {
    const supabase = createClient();

    // Busca último nosso número
    // @ts-ignore
    const { data } = await supabase
      .from('boletos')
      .select('nosso_numero')
      .eq('empresa_id', empresaId)
      .eq('conta_bancaria_id', contaBancariaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data?.nosso_numero) {
      const num = parseInt(data.nosso_numero.replace(/\D/g, '')) + 1;
      return num.toString().padStart(10, '0');
    }

    return '0000000001';
  },

  async cancelarBoleto(id: string, motivo?: string): Promise<ApiResponse<Boleto>> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('boletos')
      .update({
        status: 'cancelado',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await auditService.logInsert('boletos', data.id, { status: 'cancelado', motivo });

    return { success: true, data: data as Boleto };
  },

  async registrarPagamento(id: string, dto: {
    data_pagamento: string;
    valor_pago: number;
    data_credito?: string;
  }): Promise<ApiResponse<Boleto>> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('boletos')
      .update({
        ...dto,
        status: 'pago',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Se tem conta a receber vinculada, atualiza também
    if (data.conta_receber_id) {
      // @ts-ignore
      await supabase
        .from('contas_receber')
        .update({
          data_recebimento: dto.data_pagamento,
          valor_recebido: dto.valor_pago,
          status: 'recebida'
        })
        .eq('id', data.conta_receber_id);
    }

    await auditService.logInsert('boletos', data.id, dto);

    return { success: true, data: data as Boleto };
  },

  // =====================================================
  // Remessas
  // =====================================================

  async gerarRemessa(empresaId: string, contaBancariaId: string, boletoIds: string[]): Promise<ApiResponse<BoletoRemessa>> {
    const supabase = createClient();

    // Buscar boletos
    // @ts-ignore
    const { data: boletos, error: errBoletos } = await supabase
      .from('boletos')
      .select('*, cliente:clientes(*)')
      .in('id', boletoIds);

    if (errBoletos || !boletos?.length) {
      return { success: false, error: 'Boletos não encontrados' };
    }

    // Calcular totais
    const valorTotal = boletos.reduce((acc, b) => acc + (b.valor_nominal || 0), 0);

    // Buscar próximo número sequencial
    // @ts-ignore
    const { data: ultimaRemessa } = await supabase
      .from('boleto_remessas')
      .select('numero_sequencial')
      .eq('empresa_id', empresaId)
      .eq('conta_bancaria_id', contaBancariaId)
      .order('numero_sequencial', { ascending: false })
      .limit(1)
      .single();

    const numeroSequencial = (ultimaRemessa?.numero_sequencial || 0) + 1;

    // Criar remessa
    // @ts-ignore
    const { data: remessa, error } = await supabase
      .from('boleto_remessas')
      .insert({
        empresa_id: empresaId,
        conta_bancaria_id: contaBancariaId,
        numero_sequencial: numeroSequencial,
        quantidade_boletos: boletos.length,
        valor_total: valorTotal,
        status: 'gerado'
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Atualizar boletos com remessa_id
    // @ts-ignore
    await supabase
      .from('boletos')
      .update({
        remessa_id: remessa.id,
        status: 'registrado'
      })
      .in('id', boletoIds);

    await auditService.logInsert('boleto_remessas', remessa.id, { boletos: boletoIds.length, valor_total: valorTotal }, empresaId);

    return { success: true, data: remessa as BoletoRemessa };
  },

  async listRemessas(empresaId: string): Promise<BoletoRemessa[]> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('boleto_remessas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_geracao', { ascending: false });

    if (error) {
      console.error('Erro ao listar remessas:', error);
      return [];
    }

    return data as BoletoRemessa[];
  },

  // =====================================================
  // Retornos
  // =====================================================

  async processarRetorno(empresaId: string, contaBancariaId: string, arquivo: {
    nome: string;
    conteudo: string;
  }): Promise<ApiResponse<BoletoRetorno>> {
    const supabase = createClient();

    // Criar registro de retorno
    // @ts-ignore
    const { data: retorno, error } = await supabase
      .from('boleto_retornos')
      .insert({
        empresa_id: empresaId,
        conta_bancaria_id: contaBancariaId,
        arquivo_nome: arquivo.nome,
        status: 'processando'
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // TODO: Implementar parser CNAB 240/400
    // Por enquanto, apenas cria o registro

    await auditService.logInsert('boleto_retornos', retorno.id, { arquivo: arquivo.nome }, empresaId);

    return { success: true, data: retorno as BoletoRetorno };
  },

  async listRetornos(empresaId: string): Promise<BoletoRetorno[]> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('boleto_retornos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_processamento', { ascending: false });

    if (error) {
      console.error('Erro ao listar retornos:', error);
      return [];
    }

    return data as BoletoRetorno[];
  },

  // =====================================================
  // Resumos
  // =====================================================

  async getResumoBoletosStatus(empresaId: string): Promise<{
    gerados: number;
    registrados: number;
    pagos: number;
    vencidos: number;
    valorTotal: number;
    valorPago: number;
  }> {
    const supabase = createClient();
    const hoje = new Date().toISOString().split('T')[0];

    // @ts-ignore
    const { data: boletos } = await supabase
      .from('boletos')
      .select('status, valor_nominal, valor_pago, data_vencimento')
      .eq('empresa_id', empresaId)
      .neq('status', 'cancelado');

    if (!boletos) {
      return { gerados: 0, registrados: 0, pagos: 0, vencidos: 0, valorTotal: 0, valorPago: 0 };
    }

    const resumo = {
      gerados: boletos.filter(b => b.status === 'gerado').length,
      registrados: boletos.filter(b => b.status === 'registrado').length,
      pagos: boletos.filter(b => b.status === 'pago').length,
      vencidos: boletos.filter(b => b.status !== 'pago' && b.data_vencimento < hoje).length,
      valorTotal: boletos.reduce((acc, b) => acc + (b.valor_nominal || 0), 0),
      valorPago: boletos.filter(b => b.status === 'pago').reduce((acc, b) => acc + (b.valor_pago || 0), 0)
    };

    return resumo;
  }
};

export default boletoService;
