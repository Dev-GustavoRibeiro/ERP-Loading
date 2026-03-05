'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';
import type {
  OrdemServico,
  OSServico,
  OSPeca,
  OSApontamento,
  OSHistorico,
  CreateOrdemServicoDTO,
  UpdateOrdemServicoDTO,
  AddServicoDTO,
  AddPecaDTO,
  IniciarApontamentoDTO,
  Servico,
  CreateServicoDTO
} from '../domain';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// OS Service
// =====================================================

export const osService = {
  // =====================================================
  // Ordens de Serviço
  // =====================================================

  async listOS(empresaId: string, params?: {
    status?: string;
    cliente_id?: string;
    tecnico_id?: string;
    tipo?: string;
    data_inicio?: string;
    data_fim?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: OrdemServico[]; total: number }> {
    const supabase = createClient();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // @ts-ignore
    let query = supabase
      .from('ordens_servico')
      .select(`
        *,
        cliente:clientes(id, nome, telefone),
        tecnico:funcionarios!ordens_servico_tecnico_id_fkey(id, nome)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('data_abertura', { ascending: false })
      .range(from, to);

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.cliente_id) {
      query = query.eq('cliente_id', params.cliente_id);
    }
    if (params?.tecnico_id) {
      query = query.eq('tecnico_id', params.tecnico_id);
    }
    if (params?.tipo) {
      query = query.eq('tipo', params.tipo);
    }
    if (params?.data_inicio) {
      query = query.gte('data_abertura', params.data_inicio);
    }
    if (params?.data_fim) {
      query = query.lte('data_abertura', params.data_fim + 'T23:59:59');
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao listar OS:', error);
      return { data: [], total: 0 };
    }

    return { data: data as OrdemServico[], total: count || 0 };
  },

  async getOSById(id: string): Promise<OrdemServico | null> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('ordens_servico')
      .select(`
        *,
        cliente:clientes(id, nome, telefone, email, logradouro, numero, bairro, cidade, uf),
        tecnico:funcionarios!ordens_servico_tecnico_id_fkey(id, nome)
      `)
      .eq('id', id)
      .single();

    if (error) return null;

    // Buscar serviços e peças
    // @ts-ignore
    const { data: servicos } = await supabase
      .from('os_servicos')
      .select('*')
      .eq('ordem_servico_id', id);

    // @ts-ignore
    const { data: pecas } = await supabase
      .from('os_pecas')
      .select('*')
      .eq('ordem_servico_id', id);

    return {
      ...data,
      servicos: servicos || [],
      pecas: pecas || []
    } as OrdemServico;
  },

  async createOS(empresaId: string, dto: CreateOrdemServicoDTO): Promise<ApiResponse<OrdemServico>> {
    const supabase = createClient();

    // Gerar número da OS
    const numero = await this.gerarNumeroOS(empresaId);

    // @ts-ignore
    const { data, error } = await supabase
      .from('ordens_servico')
      .insert({
        empresa_id: empresaId,
        numero,
        cliente_id: dto.cliente_id,
        tipo: dto.tipo,
        prioridade: dto.prioridade,
        tecnico_id: dto.tecnico_id,
        data_previsao: dto.data_previsao,
        equipamento: dto.equipamento_tipo,
        marca: dto.equipamento_marca,
        modelo: dto.equipamento_modelo,
        numero_serie: dto.equipamento_serie,
        defeito_relatado: dto.descricao_problema,
        status: 'aberta',
        subtotal_servicos: 0,
        subtotal_pecas: 0,
        desconto: 0,
        total: 0
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Registrar no histórico
    await this.registrarHistorico(data.id, null, 'aberta', 'Ordem de serviço criada');

    await auditService.logInsert('ordens_servico', data.id, data, empresaId);

    return { success: true, data: data as OrdemServico };
  },

  async gerarNumeroOS(empresaId: string): Promise<string> {
    const supabase = createClient();
    const ano = new Date().getFullYear();

    // @ts-ignore
    const { data } = await supabase
      .from('ordens_servico')
      .select('numero')
      .eq('empresa_id', empresaId)
      .ilike('numero', `${ano}%`)
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    if (data?.numero) {
      const num = parseInt(data.numero.split('-')[1] || '0') + 1;
      return `${ano}-${num.toString().padStart(5, '0')}`;
    }

    return `${ano}-00001`;
  },

  async updateOS(id: string, dto: UpdateOrdemServicoDTO): Promise<ApiResponse<OrdemServico>> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('ordens_servico')
      .update({
        ...dto,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OrdemServico };
  },

  async alterarStatus(id: string, novoStatus: OrdemServico['status'], observacao?: string): Promise<ApiResponse<OrdemServico>> {
    const supabase = createClient();

    // Buscar status atual
    // @ts-ignore
    const { data: osAtual } = await supabase
      .from('ordens_servico')
      .select('status, data_inicio')
      .eq('id', id)
      .single();

    const updates: Record<string, any> = {
      status: novoStatus,
      updated_at: new Date().toISOString()
    };

    // Atualizar datas conforme status
    if (novoStatus === 'em_andamento' && !osAtual?.data_inicio) {
      updates.data_inicio = new Date().toISOString();
    }
    if (novoStatus === 'concluida') {
      updates.data_conclusao = new Date().toISOString();
    }
    if (novoStatus === 'entregue') {
      updates.data_entrega = new Date().toISOString();
    }

    // @ts-ignore
    const { data, error } = await supabase
      .from('ordens_servico')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Registrar no histórico
    await this.registrarHistorico(id, osAtual?.status, novoStatus, observacao);

    return { success: true, data: data as OrdemServico };
  },

  // =====================================================
  // Serviços da OS
  // =====================================================

  async addServico(osId: string, empresaId: string, dto: AddServicoDTO): Promise<ApiResponse<OSServico>> {
    const supabase = createClient();

    const quantidade = dto.quantidade || 1;
    const valorDesconto = dto.valor_desconto || 0;
    const valorTotal = (quantidade * dto.valor_unitario) - valorDesconto;

    // @ts-ignore
    const { data, error } = await supabase
      .from('os_servicos')
      .insert({
        ordem_servico_id: osId,
        servico_id: dto.servico_id,
        descricao: dto.descricao,
        valor_unitario: dto.valor_unitario,
        tecnico_id: dto.tecnico_id,
        quantidade,
        desconto: valorDesconto,
        total: valorTotal
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Atualizar totais da OS
    await this.recalcularTotais(osId);

    return { success: true, data: data as OSServico };
  },

  async removeServico(id: string): Promise<ApiResponse<void>> {
    const supabase = createClient();

    // @ts-ignore
    const { data: servico } = await supabase
      .from('os_servicos')
      .select('ordem_servico_id')
      .eq('id', id)
      .single();

    // @ts-ignore
    const { error } = await supabase
      .from('os_servicos')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Recalcular totais
    if (servico?.ordem_servico_id) {
      await this.recalcularTotais(servico.ordem_servico_id);
    }

    return { success: true };
  },

  // =====================================================
  // Peças da OS
  // =====================================================

  async addPeca(osId: string, empresaId: string, dto: AddPecaDTO): Promise<ApiResponse<OSPeca>> {
    const supabase = createClient();

    const quantidade = dto.quantidade || 1;
    const valorDesconto = dto.valor_desconto || 0;
    const valorTotal = (quantidade * dto.valor_unitario) - valorDesconto;

    // @ts-ignore
    const { data, error } = await supabase
      .from('os_pecas')
      .insert({
        ordem_servico_id: osId,
        produto_id: dto.produto_id,
        descricao: dto.descricao,
        valor_unitario: dto.valor_unitario,
        quantidade,
        desconto: valorDesconto,
        total: valorTotal
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Atualizar totais da OS
    await this.recalcularTotais(osId);

    return { success: true, data: data as OSPeca };
  },

  async removePeca(id: string): Promise<ApiResponse<void>> {
    const supabase = createClient();

    // @ts-ignore
    const { data: peca } = await supabase
      .from('os_pecas')
      .select('ordem_servico_id')
      .eq('id', id)
      .single();

    // @ts-ignore
    const { error } = await supabase
      .from('os_pecas')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    if (peca?.ordem_servico_id) {
      await this.recalcularTotais(peca.ordem_servico_id);
    }

    return { success: true };
  },

  // =====================================================
  // Apontamentos
  // =====================================================

  async iniciarApontamento(osId: string, empresaId: string, dto: IniciarApontamentoDTO): Promise<ApiResponse<OSApontamento>> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('os_apontamentos')
      .insert({
        ordem_servico_id: osId,
        tecnico_id: dto.tecnico_id,
        data_inicio: new Date().toISOString(),
        descricao: dto.descricao
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OSApontamento };
  },

  async finalizarApontamento(id: string): Promise<ApiResponse<OSApontamento>> {
    const supabase = createClient();

    // @ts-ignore
    const { data: apontamento } = await supabase
      .from('os_apontamentos')
      .select('data_inicio')
      .eq('id', id)
      .single();

    const dataFim = new Date();
    const dataInicio = new Date(apontamento?.data_inicio || dataFim);
    const duracaoMinutos = Math.round((dataFim.getTime() - dataInicio.getTime()) / 60000);

    // @ts-ignore
    const { data, error } = await supabase
      .from('os_apontamentos')
      .update({
        data_fim: dataFim.toISOString(),
        horas: Math.round((duracaoMinutos / 60) * 100) / 100
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OSApontamento };
  },

  async listApontamentos(osId: string): Promise<OSApontamento[]> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('os_apontamentos')
      .select(`
        *,
        tecnico:funcionarios(id, nome)
      `)
      .eq('ordem_servico_id', osId)
      .order('data_inicio', { ascending: false });

    if (error) {
      console.error('Erro ao listar apontamentos:', error);
      return [];
    }

    return data as OSApontamento[];
  },

  // =====================================================
  // Histórico
  // =====================================================

  async registrarHistorico(osId: string, statusAnterior: string | null, statusNovo: string, observacao?: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // @ts-ignore
    await supabase
      .from('os_historico')
      .insert({
        ordem_servico_id: osId,
        status_anterior: statusAnterior,
        status_novo: statusNovo,
        descricao: observacao,
        user_id: user?.id
      });
  },

  async listHistorico(osId: string): Promise<OSHistorico[]> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('os_historico')
      .select('*')
      .eq('ordem_servico_id', osId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar histórico:', error);
      return [];
    }

    return data as OSHistorico[];
  },

  // =====================================================
  // Helpers
  // =====================================================

  async recalcularTotais(osId: string): Promise<void> {
    const supabase = createClient();

    // Buscar todos os serviços
    // @ts-ignore
    const { data: servicos } = await supabase
      .from('os_servicos')
      .select('total')
      .eq('ordem_servico_id', osId);

    // @ts-ignore
    const { data: pecas } = await supabase
      .from('os_pecas')
      .select('total')
      .eq('ordem_servico_id', osId);

    const valorServicos = servicos?.reduce((acc: number, s: any) => acc + (s.total || 0), 0) || 0;
    const valorPecas = pecas?.reduce((acc: number, p: any) => acc + (p.total || 0), 0) || 0;
    const valorTotal = valorServicos + valorPecas;

    // @ts-ignore
    await supabase
      .from('ordens_servico')
      .update({
        subtotal_servicos: valorServicos,
        subtotal_pecas: valorPecas,
        total: valorTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', osId);
  },

  // =====================================================
  // Dashboard
  // =====================================================

  async getDashboard(empresaId: string): Promise<{
    abertas: number;
    emAndamento: number;
    concluidas: number;
    atrasadas: number;
    valorTotal: number;
  }> {
    const supabase = createClient();
    const hoje = new Date().toISOString();

    // @ts-ignore
    const { data: os } = await supabase
      .from('ordens_servico')
      .select('status, data_previsao, total')
      .eq('empresa_id', empresaId)
      .not('status', 'in', '("cancelada","entregue")');

    if (!os) {
      return { abertas: 0, emAndamento: 0, concluidas: 0, atrasadas: 0, valorTotal: 0 };
    }

    return {
      abertas: os.filter(o => o.status === 'aberta').length,
      emAndamento: os.filter(o => o.status === 'em_andamento').length,
      concluidas: os.filter(o => o.status === 'concluida').length,
      atrasadas: os.filter(o => o.data_previsao && o.data_previsao < hoje && o.status !== 'concluida').length,
      valorTotal: os.reduce((acc, o) => acc + (o.total || 0), 0)
    };
  },

  // =====================================================
  // Serviços (Cadastro)
  // =====================================================

  async listServicos(empresaId: string, params?: { ativo?: boolean }): Promise<Servico[]> {
    const supabase = createClient();

    // @ts-ignore
    let query = supabase
      .from('servicos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('descricao');

    if (params?.ativo !== undefined) {
      query = query.eq('ativo', params.ativo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar serviços:', error);
      return [];
    }

    return data as Servico[];
  },

  async createServico(empresaId: string, dto: CreateServicoDTO): Promise<ApiResponse<Servico>> {
    const supabase = createClient();

    // @ts-ignore
    const { data, error } = await supabase
      .from('servicos')
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

    return { success: true, data: data as Servico };
  }
};

export default osService;
