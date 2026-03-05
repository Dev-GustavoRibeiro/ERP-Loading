'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  Caixa,
  CreateCaixaDTO,
  CaixaSessao,
  VendaPDV,
  VendaPDVItem,
  VendaPDVPagamento,
  CaixaMovimento,
  AbrirCaixaDTO,
  FecharCaixaDTO,
  AdicionarItemDTO,
  CreatePagamentoDTO,
  MovimentoCaixaDTO,
  ApiResponse
} from '../domain';

// =====================================================
// PDV Service
// =====================================================

export const pdvService = {
  // =====================================================
  // Caixas
  // =====================================================

  async listCaixas(empresaId: string): Promise<Caixa[]> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('caixas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('codigo');

    if (error) {
      console.error('Erro ao listar caixas:', error);
      return [];
    }

    return data as Caixa[];
  },

  async createCaixa(empresaId: string, dto: CreateCaixaDTO): Promise<ApiResponse<Caixa>> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('caixas')
      .insert({
        empresa_id: empresaId,
        ...dto,
        ativo: true
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await auditService.log({
      acao: 'criar',
      tabela: 'caixas',
      registro_id: data.id,
      dados_novos: data
    });

    return { success: true, data: data as Caixa };
  },

  // =====================================================
  // Sessões de Caixa
  // =====================================================

  async getSessaoAberta(caixaId: string): Promise<CaixaSessao | null> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('caixa_sessoes')
      .select('*, caixa:caixas(*)')
      .eq('caixa_id', caixaId)
      .eq('status', 'aberto')
      .single();

    if (error) return null;
    return data as CaixaSessao;
  },

  async abrirCaixa(dto: AbrirCaixaDTO): Promise<ApiResponse<CaixaSessao>> {
    const supabase = createClient();

    // Verificar se já existe sessão aberta
    const sessaoAberta = await this.getSessaoAberta(dto.caixa_id);
    if (sessaoAberta) {
      return { success: false, error: 'Este caixa já está aberto' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    // @ts-ignore
    const { data, error } = await supabase
      .from('caixa_sessoes')
      .insert({
        caixa_id: dto.caixa_id,
        operador_id: user.id,
        valor_abertura: dto.valor_abertura,
        status: 'aberto'
      })
      .select('*, caixa:caixas(*)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await auditService.log({
      acao: 'abrir_caixa',
      tabela: 'caixa_sessoes',
      registro_id: data.id,
      dados_novos: data
    });

    return { success: true, data: data as CaixaSessao };
  },

  async fecharCaixa(sessaoId: string, dto: FecharCaixaDTO): Promise<ApiResponse<CaixaSessao>> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('caixa_sessoes')
      .update({
        data_fechamento: new Date().toISOString(),
        valor_fechamento: dto.valor_fechamento,
        status: 'fechado',
        observacao: dto.observacao
      })
      .eq('id', sessaoId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await auditService.log({
      acao: 'fechar_caixa',
      tabela: 'caixa_sessoes',
      registro_id: data.id,
      dados_novos: data
    });

    return { success: true, data: data as CaixaSessao };
  },

  // =====================================================
  // Vendas PDV
  // =====================================================

  async getVendaEmAndamento(sessaoId: string): Promise<VendaPDV | null> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('vendas_pdv')
      .select(`
        *,
        itens:venda_pdv_itens(*),
        pagamentos:venda_pdv_pagamentos(*),
        cliente:clientes(id, nome, cpf_cnpj)
      `)
      .eq('sessao_id', sessaoId)
      .eq('status', 'em_andamento')
      .single();

    if (error) return null;
    return data as VendaPDV;
  },

  async iniciarVenda(empresaId: string, sessaoId: string): Promise<ApiResponse<VendaPDV>> {
    const supabase = createClient();

    // Verificar se já existe venda em andamento
    const vendaExistente = await this.getVendaEmAndamento(sessaoId);
    if (vendaExistente) {
      return { success: true, data: vendaExistente };
    }

    // Gerar próximo número
    const numero = await this.getProximoNumero(empresaId);

    // @ts-ignore
    const { data, error } = await supabase
      .from('vendas_pdv')
      .insert({
        empresa_id: empresaId,
        sessao_id: sessaoId,
        numero,
        subtotal: 0,
        desconto_valor: 0,
        desconto_percentual: 0,
        total: 0,
        status: 'em_andamento'
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { ...data, itens: [], pagamentos: [] } as VendaPDV };
  },

  async getProximoNumero(empresaId: string): Promise<string> {
    const supabase = createClient();

    // @ts-ignore
    const { data } = await supabase
      .from('vendas_pdv')
      .select('numero')
      .eq('empresa_id', empresaId)
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    if (data?.numero) {
      const num = parseInt(data.numero) + 1;
      return num.toString().padStart(6, '0');
    }
    return '000001';
  },

  async adicionarItem(vendaId: string, dto: AdicionarItemDTO): Promise<ApiResponse<VendaPDVItem>> {
    const supabase = createClient();

    // Buscar produto
    // @ts-ignore
    const { data: produto, error: errProduto } = await supabase
      .from('produtos')
      .select('id, codigo, nome, preco_venda, codigo_barras, unidade_id')
      .eq('id', dto.produto_id)
      .single();

    if (errProduto || !produto) {
      return { success: false, error: 'Produto não encontrado' };
    }

    const precoUnitario = produto.preco_venda || 0;
    const descontoPercentual = dto.desconto_percentual || 0;
    const descontoValor = (precoUnitario * dto.quantidade * descontoPercentual) / 100;
    const total = (precoUnitario * dto.quantidade) - descontoValor;

    // Buscar ordem do próximo item
    // @ts-ignore
    const { data: ultimoItem } = await supabase
      .from('venda_pdv_itens')
      .select('ordem')
      .eq('venda_id', vendaId)
      .order('ordem', { ascending: false })
      .limit(1)
      .single();

    const ordem = (ultimoItem?.ordem || 0) + 1;

    // @ts-ignore
    const { data, error } = await supabase
      .from('venda_pdv_itens')
      .insert({
        venda_id: vendaId,
        produto_id: dto.produto_id,
        codigo_barras: produto.codigo_barras,
        descricao: produto.nome,
        quantidade: dto.quantidade,
        preco_unitario: precoUnitario,
        desconto_percentual: descontoPercentual,
        desconto_valor: descontoValor,
        total,
        ordem,
        cancelado: false
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Atualizar totais da venda
    await this.recalcularTotais(vendaId);

    return { success: true, data: data as VendaPDVItem };
  },

  async removerItem(itemId: string): Promise<ApiResponse<void>> {
    const supabase = createClient();

    // @ts-ignore
    const { data: item, error: errItem } = await supabase
      .from('venda_pdv_itens')
      .select('venda_id')
      .eq('id', itemId)
      .single();

    if (errItem) {
      return { success: false, error: 'Item não encontrado' };
    }

    // @ts-ignore
    const { error } = await supabase
      .from('venda_pdv_itens')
      .update({ cancelado: true })
      .eq('id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    await this.recalcularTotais(item.venda_id);

    return { success: true };
  },

  async recalcularTotais(vendaId: string): Promise<void> {
    const supabase = createClient();

    // @ts-ignore
    const { data: itens } = await supabase
      .from('venda_pdv_itens')
      .select('total')
      .eq('venda_id', vendaId)
      .eq('cancelado', false);

    const subtotal = itens?.reduce((acc, item) => acc + (item.total || 0), 0) || 0;

    // @ts-ignore
    const { data: venda } = await supabase
      .from('vendas_pdv')
      .select('desconto_valor, desconto_percentual, acrescimo')
      .eq('id', vendaId)
      .single();

    let desconto = venda?.desconto_valor || 0;
    if (venda && venda.desconto_percentual > 0) {
      desconto = (subtotal * venda.desconto_percentual) / 100;
    }
    const total = subtotal - desconto + (venda?.acrescimo || 0);

    // @ts-ignore
    await supabase
      .from('vendas_pdv')
      .update({ subtotal, total })
      .eq('id', vendaId);
  },

  async aplicarDesconto(vendaId: string, tipo: 'valor' | 'percentual', valor: number): Promise<ApiResponse<VendaPDV>> {
    const supabase = createClient();

    const updates = tipo === 'valor'
      ? { desconto_valor: valor, desconto_percentual: 0 }
      : { desconto_percentual: valor, desconto_valor: 0 };

    // @ts-ignore
    const { data, error } = await supabase
      .from('vendas_pdv')
      .update(updates)
      .eq('id', vendaId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await this.recalcularTotais(vendaId);

    // Buscar venda atualizada
    // @ts-ignore
    const { data: vendaAtualizada } = await supabase
      .from('vendas_pdv')
      .select('*')
      .eq('id', vendaId)
      .single();

    return { success: true, data: vendaAtualizada as VendaPDV };
  },

  async vincularCliente(vendaId: string, clienteId: string): Promise<ApiResponse<VendaPDV>> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('vendas_pdv')
      .update({ cliente_id: clienteId })
      .eq('id', vendaId)
      .select('*, cliente:clientes(id, nome, cpf_cnpj)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as VendaPDV };
  },

  async finalizarVenda(vendaId: string, pagamentos: CreatePagamentoDTO[]): Promise<ApiResponse<VendaPDV>> {
    const supabase = createClient();

    // Buscar venda atual
    // @ts-ignore
    const { data: venda, error: errVenda } = await supabase
      .from('vendas_pdv')
      .select('total, sessao_id')
      .eq('id', vendaId)
      .single();

    if (errVenda || !venda) {
      return { success: false, error: 'Venda não encontrada' };
    }

    // Validar total de pagamentos
    const totalPagamentos = pagamentos.reduce((acc, p) => acc + p.valor, 0);
    if (totalPagamentos < venda.total) {
      return { success: false, error: 'Valor de pagamento insuficiente' };
    }

    const troco = totalPagamentos - venda.total;

    // Inserir pagamentos
    for (const pag of pagamentos) {
      // @ts-ignore
      await supabase
        .from('venda_pdv_pagamentos')
        .insert({
          venda_id: vendaId,
          tipo: pag.tipo,
          valor: pag.valor,
          forma_pagamento_id: pag.forma_pagamento_id,
          bandeira: pag.bandeira,
          nsu: pag.nsu,
          autorizacao: pag.autorizacao,
          parcelas: pag.parcelas || 1
        });
    }

    // Atualizar venda
    // @ts-ignore
    const { data, error } = await supabase
      .from('vendas_pdv')
      .update({
        status: 'finalizada',
        troco
      })
      .eq('id', vendaId)
      .select(`
        *,
        itens:venda_pdv_itens(*),
        pagamentos:venda_pdv_pagamentos(*)
      `)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Atualizar valor_vendas na sessão
    // @ts-ignore
    const { data: sessao } = await supabase
      .from('caixa_sessoes')
      .select('valor_vendas')
      .eq('id', venda.sessao_id)
      .single();

    // @ts-ignore
    await supabase
      .from('caixa_sessoes')
      .update({
        valor_vendas: (sessao?.valor_vendas || 0) + venda.total
      })
      .eq('id', venda.sessao_id);

    await auditService.log({
      acao: 'finalizar_venda_pdv',
      tabela: 'vendas_pdv',
      registro_id: data.id,
      dados_novos: data
    });

    return { success: true, data: data as VendaPDV };
  },

  async cancelarVenda(vendaId: string, motivo?: string): Promise<ApiResponse<VendaPDV>> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('vendas_pdv')
      .update({
        status: 'cancelada',
        observacao: motivo
      })
      .eq('id', vendaId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await auditService.log({
      acao: 'cancelar_venda_pdv',
      tabela: 'vendas_pdv',
      registro_id: data.id,
      dados_novos: data
    });

    return { success: true, data: data as VendaPDV };
  },

  // =====================================================
  // Movimentos de Caixa
  // =====================================================

  async registrarMovimento(sessaoId: string, dto: MovimentoCaixaDTO): Promise<ApiResponse<CaixaMovimento>> {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    // @ts-ignore
    const { data, error } = await supabase
      .from('caixa_movimentos')
      .insert({
        sessao_id: sessaoId,
        tipo: dto.tipo,
        valor: dto.valor,
        motivo: dto.motivo,
        operador_id: user.id
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Atualizar totais na sessão
    // @ts-ignore
    const { data: sessao } = await supabase
      .from('caixa_sessoes')
      .select('valor_sangrias, valor_suprimentos')
      .eq('id', sessaoId)
      .single();

    const campo = dto.tipo === 'sangria' ? 'valor_sangrias' : 'valor_suprimentos';
    const valorAtual = dto.tipo === 'sangria' ? sessao?.valor_sangrias : sessao?.valor_suprimentos;

    // @ts-ignore
    await supabase
      .from('caixa_sessoes')
      .update({
        [campo]: (valorAtual || 0) + dto.valor
      })
      .eq('id', sessaoId);

    await auditService.log({
      acao: dto.tipo,
      tabela: 'caixa_movimentos',
      registro_id: data.id,
      dados_novos: data
    });

    return { success: true, data: data as CaixaMovimento };
  },

  async listMovimentos(sessaoId: string): Promise<CaixaMovimento[]> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('caixa_movimentos')
      .select('*')
      .eq('sessao_id', sessaoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar movimentos:', error);
      return [];
    }

    return data as CaixaMovimento[];
  },

  // =====================================================
  // Busca de Produtos
  // =====================================================

  async buscarProduto(empresaId: string, termo: string): Promise<any[]> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('produtos')
      .select('id, codigo, nome, preco_venda, codigo_barras, unidade_id')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%,codigo_barras.eq.${termo}`)
      .limit(20);

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }

    return data || [];
  },

  async buscarProdutoPorCodigo(empresaId: string, codigo: string): Promise<any | null> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('produtos')
      .select('id, codigo, nome, preco_venda, codigo_barras, unidade_id')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .or(`codigo.eq.${codigo},codigo_barras.eq.${codigo}`)
      .single();

    if (error) return null;
    return data;
  }
};

export default pdvService;
