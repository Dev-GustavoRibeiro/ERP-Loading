'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  NotaFiscal,
  CreateNotaFiscalDTO,
  NfeInutilizacao,
  NfeCartaCorrecao
} from '../domain/index';
import type { ApiResponse, PaginatedResponse, ListParams } from '@/modules/core/domain/index';

const supabase = createClient();

// =====================================================
// Fiscal Service (NF-e / NFC-e)
// =====================================================

export const fiscalService = {
  // =====================================================
  // Notas Fiscais
  // =====================================================

  async listNotas(empresaId: string, params?: ListParams & {
    modelo?: '55' | '65';
    status?: string;
    data_inicio?: string;
    data_fim?: string;
  }): Promise<PaginatedResponse<NotaFiscal>> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('notas_fiscais')
      .select(`
        *,
        destinatario:clientes(id, nome, cpf_cnpj)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('data_emissao', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params?.modelo) {
      query = query.eq('tipo', params.modelo === '55' ? 'nfe' : params.modelo === '65' ? 'nfce' : 'nfse');
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.data_inicio) {
      query = query.gte('data_emissao', params.data_inicio);
    }
    if (params?.data_fim) {
      query = query.lte('data_emissao', params.data_fim);
    }
    if (params?.search) {
      query = query.or(`numero::text.ilike.%${params.search}%,chave_acesso.ilike.%${params.search}%`);
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

  async getNotaById(id: string): Promise<NotaFiscal | null> {
    const { data, error } = await supabase
      .from('notas_fiscais')
      .select(`
        *,
        destinatario:clientes(id, nome, cpf_cnpj),
        itens:nota_fiscal_itens(
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

  async getProximoNumero(empresaId: string, modelo: '55' | '65', serie: string = '1'): Promise<number> {
    const { data } = await supabase
      .from('notas_fiscais')
      .select('numero')
      .eq('empresa_id', empresaId)
      .eq('tipo', modelo === '55' ? 'nfe' : 'nfce')
      .eq('serie', serie)
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    return data ? data.numero + 1 : 1;
  },

  async createNota(empresaId: string, dto: CreateNotaFiscalDTO, filialId?: string): Promise<ApiResponse<NotaFiscal>> {
    if (!dto.itens || dto.itens.length === 0) {
      return { error: 'A nota deve ter pelo menos um item' };
    }

    // Gera número da nota
    const numero = await this.getProximoNumero(empresaId, dto.modelo, dto.serie || '1');

    // Calcula totais
    const itensCalculados = dto.itens.map((item, index) => {
      const valorTotal = item.quantidade * item.valor_unitario;
      const baseIcms = valorTotal;
      const valorIcms = baseIcms * ((item.aliquota_icms || 0) / 100);
      const valorIpi = valorTotal * ((item.aliquota_ipi || 0) / 100);
      const valorPis = valorTotal * ((item.aliquota_pis || 0) / 100);
      const valorCofins = valorTotal * ((item.aliquota_cofins || 0) / 100);

      return {
        numero_item: index + 1,
        ...item,
        valor_total: valorTotal,
        base_icms: baseIcms,
        valor_icms: valorIcms,
        valor_ipi: valorIpi,
        base_pis: valorTotal,
        valor_pis: valorPis,
        base_cofins: valorTotal,
        valor_cofins: valorCofins
      };
    });

    const valorProdutos = itensCalculados.reduce((sum, item) => sum + item.valor_total, 0);
    const valorIcms = itensCalculados.reduce((sum, item) => sum + item.valor_icms, 0);
    const valorIpi = itensCalculados.reduce((sum, item) => sum + item.valor_ipi, 0);
    const valorPis = itensCalculados.reduce((sum, item) => sum + item.valor_pis, 0);
    const valorCofins = itensCalculados.reduce((sum, item) => sum + item.valor_cofins, 0);
    const valorTotal = valorProdutos + valorIpi;

    // Insere a nota
    const { data: nota, error: notaError } = await supabase
      .from('notas_fiscais')
      .insert({
        empresa_id: empresaId,
        tipo: dto.modelo === '55' ? 'nfe' : dto.modelo === '65' ? 'nfce' : 'nfse',
        serie: parseInt(dto.serie || '1'),
        numero,
        natureza_operacao: dto.natureza_operacao,
        tipo_operacao: dto.tipo_operacao,
        finalidade: dto.finalidade || 'normal',
        cliente_id: dto.destinatario_id,
        transportadora_id: dto.transportadora_id,
        pedido_venda_id: dto.pedido_venda_id,
        valor_produtos: valorProdutos,
        valor_icms: valorIcms,
        valor_ipi: valorIpi,
        valor_pis: valorPis,
        valor_cofins: valorCofins,
        valor_total: valorTotal,
        informacoes_complementares: dto.informacoes_adicionais_contribuinte,
        status: 'digitacao'
      })
      .select()
      .single();

    if (notaError) return { error: notaError.message };

    // Insere os itens
    const itensParaInserir = itensCalculados.map(item => ({
      nota_fiscal_id: nota.id,
      ...item
    }));

    const { error: itensError } = await supabase
      .from('nota_fiscal_itens')
      .insert(itensParaInserir);

    if (itensError) {
      await supabase.from('notas_fiscais').delete().eq('id', nota.id);
      return { error: itensError.message };
    }

    await auditService.logInsert('notas_fiscais', nota.id, nota as unknown as Record<string, unknown>, empresaId);
    return { data: nota, message: 'Nota fiscal criada com sucesso' };
  },

  // =====================================================
  // Operações com SEFAZ (Placeholder - requer integração)
  // =====================================================

  async enviarNota(id: string): Promise<ApiResponse<NotaFiscal>> {
    // TODO: Implementar integração com SEFAZ
    // Por enquanto, apenas atualiza o status
    const { data, error } = await supabase
      .from('notas_fiscais')
      .update({
        status: 'validada',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error.message };
    return {
      data,
      message: 'Nota enviada para processamento. A integração com SEFAZ precisa ser configurada.'
    };
  },

  async cancelarNota(id: string, justificativa: string): Promise<ApiResponse<NotaFiscal>> {
    if (!justificativa || justificativa.length < 15) {
      return { error: 'Justificativa deve ter no mínimo 15 caracteres' };
    }

    const { data: nota } = await supabase
      .from('notas_fiscais')
      .select('status')
      .eq('id', id)
      .single();

    if (!nota || nota.status !== 'autorizada') {
      return { error: 'Apenas notas autorizadas podem ser canceladas' };
    }

    // TODO: Enviar cancelamento à SEFAZ
    const { data, error } = await supabase
      .from('notas_fiscais')
      .update({
        status: 'cancelada',
        data_cancelamento: new Date().toISOString(),
        motivo_cancelamento: justificativa,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data, message: 'Nota cancelada com sucesso' };
  },

  async cartaCorrecao(notaFiscalId: string, correcao: string): Promise<ApiResponse<NfeCartaCorrecao>> {
    if (!correcao || correcao.length < 15) {
      return { error: 'Correção deve ter no mínimo 15 caracteres' };
    }

    // Busca última sequência
    const { data: ultima } = await supabase
      .from('nfe_cartas_correcao')
      .select('sequencia')
      .eq('nota_fiscal_id', notaFiscalId)
      .order('sequencia', { ascending: false })
      .limit(1)
      .single();

    const novaSequencia = ultima ? ultima.sequencia + 1 : 1;

    // TODO: Enviar CC-e à SEFAZ
    const { data, error } = await supabase
      .from('nfe_cartas_correcao')
      .insert({
        nota_fiscal_id: notaFiscalId,
        sequencia: novaSequencia,
        correcao,
        status: 'pendente'
      })
      .select()
      .single();

    if (error) return { error: error.message };

    return { data, message: 'Carta de correção registrada com sucesso' };
  },

  async inutilizar(empresaId: string, dto: {
    modelo: '55' | '65';
    serie: string;
    numero_inicial: number;
    numero_final: number;
    justificativa: string;
  }): Promise<ApiResponse<NfeInutilizacao>> {
    if (!dto.justificativa || dto.justificativa.length < 15) {
      return { error: 'Justificativa deve ter no mínimo 15 caracteres' };
    }

    // TODO: Enviar inutilização à SEFAZ
    const { data, error } = await supabase
      .from('nfe_inutilizacoes')
      .insert({
        empresa_id: empresaId,
        tipo: dto.modelo === '55' ? 'nfe' : 'nfce',
        serie: parseInt(dto.serie),
        numero_inicial: dto.numero_inicial,
        numero_final: dto.numero_final,
        justificativa: dto.justificativa,
        status: 'pendente'
      })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data, message: 'Inutilização registrada com sucesso' };
  },

  // =====================================================
  // Stats (KPIs)
  // =====================================================

  async getStats(empresaId: string): Promise<{
    total: number;
    autorizadas: number;
    digitacao: number;
    canceladas: number;
    valorFaturado: number;
  }> {
    const { count: total } = await supabase
      .from('notas_fiscais')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);

    const { count: autorizadas } = await supabase
      .from('notas_fiscais')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('status', 'autorizada');

    const { count: digitacao } = await supabase
      .from('notas_fiscais')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('status', 'digitacao');

    const { count: canceladas } = await supabase
      .from('notas_fiscais')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('status', 'cancelada');

    // Sum of valor_total for authorized NFs in the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: faturamento } = await supabase
      .from('notas_fiscais')
      .select('valor_total')
      .eq('empresa_id', empresaId)
      .eq('status', 'autorizada')
      .gte('data_emissao', startOfMonth);

    const valorFaturado = (faturamento || []).reduce(
      (sum, nf) => sum + (Number(nf.valor_total) || 0),
      0
    );

    return {
      total: total || 0,
      autorizadas: autorizadas || 0,
      digitacao: digitacao || 0,
      canceladas: canceladas || 0,
      valorFaturado,
    };
  }
};

export default fiscalService;
