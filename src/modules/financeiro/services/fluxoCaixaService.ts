'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import type {
  FluxoCaixaProjetado,
  CreateFluxoCaixaDTO,
  FluxoCaixaResumo
} from '../domain';

// =====================================================
// Fluxo de Caixa Service
// =====================================================

export const fluxoCaixaService = {
  // =====================================================
  // Fluxo de Caixa Projetado
  // =====================================================

  async getFluxoCaixaProjetado(empresaId: string, dataInicio: string, dataFim: string): Promise<FluxoCaixaProjetado[]> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('fluxo_caixa')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: true });

    if (error) {
      console.error('Erro ao buscar fluxo de caixa:', error);
      return [];
    }

    return data as FluxoCaixaProjetado[];
  },

  async createLancamento(empresaId: string, dto: CreateFluxoCaixaDTO): Promise<{ success: boolean; data?: FluxoCaixaProjetado; error?: string }> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('fluxo_caixa')
      .insert({
        empresa_id: empresaId,
        ...dto,
        realizado: false
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as FluxoCaixaProjetado };
  },

  async marcarRealizado(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    // @ts-ignore
    const { error } = await supabase
      .from('fluxo_caixa')
      .update({ realizado: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  async deleteLancamento(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    // @ts-ignore
    const { error } = await supabase
      .from('fluxo_caixa')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  // =====================================================
  // Geração Automática a partir de Contas
  // =====================================================

  async gerarFluxoAutomatico(empresaId: string, dataInicio: string, dataFim: string): Promise<{ success: boolean; gerados: number }> {
    const supabase = createClient();

    // Buscar contas a pagar pendentes
    // @ts-ignore
    const { data: contasPagar } = await supabase
      .from('contas_pagar')
      .select('id, data_vencimento, valor_original, valor_pago, status, fornecedor:fornecedores(razao_social)')
      .eq('empresa_id', empresaId)
      .gte('data_vencimento', dataInicio)
      .lte('data_vencimento', dataFim)
      .in('status', ['aberta', 'parcial']);

    // Buscar contas a receber pendentes
    // @ts-ignore
    const { data: contasReceber } = await supabase
      .from('contas_receber')
      .select('id, data_vencimento, valor_original, valor_recebido, status, cliente:clientes(nome)')
      .eq('empresa_id', empresaId)
      .gte('data_vencimento', dataInicio)
      .lte('data_vencimento', dataFim)
      .in('status', ['aberta', 'parcial']);

    let gerados = 0;

    // Inserir contas a pagar no fluxo
    if (contasPagar?.length) {
      const lancamentosPagar = contasPagar.map(cp => ({
        empresa_id: empresaId,
        data: cp.data_vencimento,
        tipo: 'saida',
        categoria: 'Contas a Pagar',
        descricao: `Pgto ${(Array.isArray(cp.fornecedor) ? cp.fornecedor[0] : cp.fornecedor)?.razao_social || 'Fornecedor'}`,
        valor: (cp.valor_original || 0) - (cp.valor_pago || 0),
        conta_pagar_id: cp.id,
        realizado: false
      }));

      // @ts-ignore
      const { data: inserted } = await supabase
        .from('fluxo_caixa')
        .insert(lancamentosPagar)
        .select();

      gerados += inserted?.length || 0;
    }

    // Inserir contas a receber no fluxo
    if (contasReceber?.length) {
      const lancamentosReceber = contasReceber.map(cr => ({
        empresa_id: empresaId,
        data: cr.data_vencimento,
        tipo: 'entrada',
        categoria: 'Contas a Receber',
        descricao: `Rec ${(Array.isArray(cr.cliente) ? cr.cliente[0] : cr.cliente)?.nome || 'Cliente'}`,
        valor: (cr.valor_original || 0) - (cr.valor_recebido || 0),
        conta_receber_id: cr.id,
        realizado: false
      }));

      // @ts-ignore
      const { data: inserted } = await supabase
        .from('fluxo_caixa')
        .insert(lancamentosReceber)
        .select();

      gerados += inserted?.length || 0;
    }

    return { success: true, gerados };
  },

  // =====================================================
  // Resumo por Período
  // =====================================================

  async getResumoFluxoPorPeriodo(empresaId: string, dataInicio: string, dataFim: string): Promise<FluxoCaixaResumo[]> {
    const supabase = createClient();

    // @ts-ignore
    const { data: fluxo } = await supabase
      .from('fluxo_caixa')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data');

    if (!fluxo?.length) {
      return [];
    }

    // Agrupar por data
    const porData: { [key: string]: FluxoCaixaResumo } = {};
    let saldoAcumulado = 0;

    fluxo.forEach(f => {
      if (!porData[f.data]) {
        porData[f.data] = {
          data: f.data,
          saldo_inicial: saldoAcumulado,
          entradas: 0,
          saidas: 0,
          saldo_final: 0,
          entradas_realizadas: 0,
          saidas_realizadas: 0
        };
      }

      const resumo = porData[f.data];
      if (f.tipo === 'entrada') {
        resumo.entradas += f.valor;
        if (f.realizado) resumo.entradas_realizadas += f.valor;
      } else {
        resumo.saidas += f.valor;
        if (f.realizado) resumo.saidas_realizadas += f.valor;
      }
    });

    // Calcular saldos finais
    const datas = Object.keys(porData).sort();
    datas.forEach((data, idx) => {
      const resumo = porData[data];
      if (idx > 0) {
        resumo.saldo_inicial = porData[datas[idx - 1]].saldo_final;
      }
      resumo.saldo_final = resumo.saldo_inicial + resumo.entradas - resumo.saidas;
    });

    return datas.map(d => porData[d]);
  },

  // =====================================================
  // Dashboard de Fluxo de Caixa
  // =====================================================

  async getDashboardFluxo(empresaId: string, dias: number = 30): Promise<{
    saldoAtual: number;
    entradasPrevistas: number;
    saidasPrevistas: number;
    saldoPrevisto: number;
    porDia: { data: string; entradas: number; saidas: number; saldo: number }[];
  }> {
    const hoje = new Date();
    const dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() + dias);

    const dataInicioStr = hoje.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    const supabase = createClient();

    // Buscar saldo atual das contas bancárias
    // @ts-ignore
    const { data: contas } = await supabase
      .from('contas_bancarias')
      .select('saldo_atual')
      .eq('empresa_id', empresaId)
      .eq('ativo', true);

    const saldoAtual = contas?.reduce((acc, c) => acc + (c.saldo_atual || 0), 0) || 0;

    // Buscar fluxo projetado
    const resumo = await this.getResumoFluxoPorPeriodo(empresaId, dataInicioStr, dataFimStr);

    const entradasPrevistas = resumo.reduce((acc, r) => acc + r.entradas, 0);
    const saidasPrevistas = resumo.reduce((acc, r) => acc + r.saidas, 0);

    // Gerar série diária
    const porDia: { data: string; entradas: number; saidas: number; saldo: number }[] = [];
    let saldoAcum = saldoAtual;

    for (let i = 0; i <= dias; i++) {
      const data = new Date(hoje);
      data.setDate(data.getDate() + i);
      const dataStr = data.toISOString().split('T')[0];

      const diaResumo = resumo.find(r => r.data === dataStr);
      const entradas = diaResumo?.entradas || 0;
      const saidas = diaResumo?.saidas || 0;

      saldoAcum += entradas - saidas;

      porDia.push({
        data: dataStr,
        entradas,
        saidas,
        saldo: saldoAcum
      });
    }

    return {
      saldoAtual,
      entradasPrevistas,
      saidasPrevistas,
      saldoPrevisto: saldoAtual + entradasPrevistas - saidasPrevistas,
      porDia
    };
  }
};

export default fluxoCaixaService;
