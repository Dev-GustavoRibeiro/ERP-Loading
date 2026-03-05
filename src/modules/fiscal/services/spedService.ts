'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';

// =====================================================
// SPED Fiscal Service
// Geração de arquivos SPED EFD ICMS/IPI e SINTEGRA
// =====================================================

export interface SpedConfig {
  versao_layout: string;
  finalidade: '0' | '1'; // 0=Remessa, 1=Retificação
  perfil: 'A' | 'B' | 'C'; // A=Geral, B=Industrial, C=Outros
  cod_finalidade: '0' | '1' | '2' | '3'; // 0=Original, 1=Retificadora, etc.
}

export interface SpedRegistro {
  tipo: string;
  campos: string[];
}

export const spedService = {
  // =====================================================
  // Geração de SPED EFD ICMS/IPI
  // =====================================================

  async gerarSpedFiscal(empresaId: string, periodo: { mes: number; ano: number }, config?: Partial<SpedConfig>): Promise<{
    success: boolean;
    arquivo?: string;
    linhas?: number;
    error?: string;
  }> {
    const supabase = createClient();

    const dataInicio = new Date(periodo.ano, periodo.mes - 1, 1);
    const dataFim = new Date(periodo.ano, periodo.mes, 0);
    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    try {
      // Buscar dados da empresa
      const { data: empresa } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single();

      if (!empresa) {
        return { success: false, error: 'Empresa não encontrada' };
      }

      // Buscar notas fiscais do período
      const { data: notas } = await supabase
        .from('notas_fiscais')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('data_emissao', dataInicioStr)
        .lte('data_emissao', dataFimStr)
        .eq('status', 'autorizada');

      // Buscar movimentações de estoque
      const { data: movimentacoes } = await supabase
        .from('movimentacoes_estoque')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('data_movimento', dataInicioStr)
        .lte('data_movimento', dataFimStr);

      // Gerar registros SPED
      const registros: string[] = [];
      const cfg: SpedConfig = {
        versao_layout: config?.versao_layout || '017',
        finalidade: config?.finalidade || '0',
        perfil: config?.perfil || 'A',
        cod_finalidade: config?.cod_finalidade || '0'
      };

      // BLOCO 0 - Abertura e Identificação
      registros.push(this.gerarBloco0(empresa, periodo, cfg));

      // BLOCO C - Documentos Fiscais (Mercadorias)
      if (notas?.length) {
        registros.push(this.gerarBlocoC(notas));
      }

      // BLOCO H - Inventário Físico
      registros.push(await this.gerarBlocoH(empresaId, dataFimStr));

      // BLOCO K - Controle de Produção e Estoque
      if (movimentacoes?.length) {
        registros.push(this.gerarBlocoK(movimentacoes));
      }

      // BLOCO 9 - Encerramento
      registros.push(this.gerarBloco9(registros.length));

      const arquivo = registros.join('\r\n');

      return {
        success: true,
        arquivo,
        linhas: registros.length
      };
    } catch (error) {
      console.error('Erro ao gerar SPED:', error);
      return { success: false, error: 'Erro ao gerar arquivo SPED' };
    }
  },

  // Bloco 0 - Abertura
  gerarBloco0(empresa: any, periodo: { mes: number; ano: number }, config: SpedConfig): string {
    const dataInicio = new Date(periodo.ano, periodo.mes - 1, 1);
    const dataFim = new Date(periodo.ano, periodo.mes, 0);

    const reg0000 = [
      '0000',
      config.versao_layout,
      config.cod_finalidade,
      this.formatData(dataInicio),
      this.formatData(dataFim),
      empresa.razao_social?.substring(0, 100) || '',
      empresa.cnpj?.replace(/\D/g, '') || '',
      empresa.cpf?.replace(/\D/g, '') || '',
      empresa.uf || 'SP',
      empresa.ie?.replace(/\D/g, '') || '',
      empresa.codigo_municipio || '',
      empresa.im || '',
      empresa.suframa || '',
      config.perfil,
      '1' // Indicador de atividade
    ];

    return '|' + reg0000.join('|') + '|';
  },

  // Bloco C - Documentos Fiscais
  gerarBlocoC(notas: any[]): string {
    const registros: string[] = [];

    // C001 - Abertura do Bloco C
    registros.push('|C001|0|'); // 0 = há dados

    notas.forEach((nota, index) => {
      // C100 - Documento Fiscal
      const regC100 = [
        'C100',
        nota.tipo_operacao === 'entrada' ? '0' : '1', // 0=Entrada, 1=Saída
        '1', // Emissão própria
        nota.cliente_id ? '1' : '0', // 1=Terceiros, 0=Própria
        nota.modelo || '55',
        '00', // Situação normal
        nota.serie || '1',
        nota.numero?.toString() || '',
        nota.chave_acesso || '',
        this.formatData(new Date(nota.data_emissao)),
        this.formatData(new Date(nota.data_movimento || nota.data_emissao)),
        this.formatValor(nota.valor_total),
        '0', // Indicador pagamento
        this.formatValor(nota.valor_desconto || 0),
        this.formatValor(nota.valor_mercadorias || nota.valor_total),
        this.formatValor(nota.valor_frete || 0),
        this.formatValor(nota.valor_seguro || 0),
        this.formatValor(nota.valor_outras || 0),
        this.formatValor(nota.valor_icms_base || 0),
        this.formatValor(nota.valor_icms || 0),
        this.formatValor(nota.valor_icms_st_base || 0),
        this.formatValor(nota.valor_icms_st || 0),
        this.formatValor(nota.valor_ipi || 0),
        this.formatValor(nota.valor_pis || 0),
        this.formatValor(nota.valor_cofins || 0)
      ];

      registros.push('|' + regC100.join('|') + '|');
    });

    // C990 - Encerramento do Bloco C
    registros.push(`|C990|${registros.length + 1}|`);

    return registros.join('\r\n');
  },

  // Bloco H - Inventário Físico
  async gerarBlocoH(empresaId: string, data: string): Promise<string> {
    const supabase = createClient();
    const registros: string[] = [];

    // Buscar saldo de estoque
    const { data: saldos } = await supabase
      .from('saldos_estoque')
      .select(`
        *,
        produto:produtos(codigo, descricao, ncm)
      `)
      .eq('empresa_id', empresaId);

    // H001 - Abertura
    registros.push('|H001|' + (saldos?.length ? '0' : '1') + '|');

    if (saldos?.length) {
      // H005 - Totais do Inventário
      const valorTotal = saldos.reduce((acc, s) => acc + (s.quantidade * (s.custo_medio || 0)), 0);
      registros.push(`|H005|${data.replace(/-/g, '')}|${this.formatValor(valorTotal)}|01|`);

      // H010 - Inventário
      saldos.forEach(saldo => {
        const regH010 = [
          'H010',
          saldo.produto?.codigo || '',
          '00', // Unidade
          this.formatValor(saldo.quantidade),
          this.formatValor(saldo.custo_medio || 0),
          this.formatValor(saldo.quantidade * (saldo.custo_medio || 0)),
          '0', // Indicador propriedade
          '', // CNPJ possuidor
          '', // UF terceiro
          '06' // Inventário para balanço
        ];
        registros.push('|' + regH010.join('|') + '|');
      });
    }

    // H990 - Encerramento
    registros.push(`|H990|${registros.length + 1}|`);

    return registros.join('\r\n');
  },

  // Bloco K - Produção e Estoque
  gerarBlocoK(movimentacoes: any[]): string {
    const registros: string[] = [];

    // K001 - Abertura
    registros.push('|K001|0|');

    // K100 - Período
    if (movimentacoes.length > 0) {
      const primeiraData = new Date(movimentacoes[0].data_movimento);
      const ultimaData = new Date(movimentacoes[movimentacoes.length - 1].data_movimento);
      registros.push(`|K100|${this.formatData(primeiraData)}|${this.formatData(ultimaData)}|`);

      // K200 - Estoque Escriturado
      // Agrupar por produto
      const porProduto: { [key: string]: number } = {};
      movimentacoes.forEach(m => {
        if (!porProduto[m.produto_id]) porProduto[m.produto_id] = 0;
        porProduto[m.produto_id] += m.tipo === 'entrada' ? m.quantidade : -m.quantidade;
      });

      Object.entries(porProduto).forEach(([produtoId, quantidade]) => {
        registros.push(`|K200|${this.formatData(ultimaData)}|${produtoId}|${this.formatValor(quantidade)}|0||`);
      });
    }

    // K990 - Encerramento
    registros.push(`|K990|${registros.length + 1}|`);

    return registros.join('\r\n');
  },

  // Bloco 9 - Encerramento
  gerarBloco9(totalLinhas: number): string {
    const registros: string[] = [];

    registros.push('|9001|0|');
    registros.push(`|9900|0000|1|`);
    registros.push(`|9900|9001|1|`);
    registros.push(`|9900|9900|${4}|`);
    registros.push(`|9900|9990|1|`);
    registros.push(`|9900|9999|1|`);
    registros.push(`|9990|${registros.length + 2}|`);
    registros.push(`|9999|${totalLinhas + registros.length + 1}|`);

    return registros.join('\r\n');
  },

  // =====================================================
  // SINTEGRA
  // =====================================================

  async gerarSintegra(empresaId: string, periodo: { mes: number; ano: number }): Promise<{
    success: boolean;
    arquivo?: string;
    linhas?: number;
    error?: string;
  }> {
    const supabase = createClient();

    const dataInicio = new Date(periodo.ano, periodo.mes - 1, 1);
    const dataFim = new Date(periodo.ano, periodo.mes, 0);
    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    try {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single();

      if (!empresa) {
        return { success: false, error: 'Empresa não encontrada' };
      }

      const { data: notas } = await supabase
        .from('notas_fiscais')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('data_emissao', dataInicioStr)
        .lte('data_emissao', dataFimStr)
        .eq('status', 'autorizada');

      const registros: string[] = [];

      // Registro 10 - Mestre do Estabelecimento
      registros.push(this.gerarRegistro10(empresa, periodo));

      // Registro 11 - Dados Complementares
      registros.push(this.gerarRegistro11(empresa));

      // Registros 50 - Notas Fiscais
      notas?.forEach(nota => {
        registros.push(this.gerarRegistro50(nota));
      });

      // Registro 90 - Totalização
      registros.push(this.gerarRegistro90(registros.length + 1));

      const arquivo = registros.join('\r\n');

      return {
        success: true,
        arquivo,
        linhas: registros.length
      };
    } catch (error) {
      console.error('Erro ao gerar SINTEGRA:', error);
      return { success: false, error: 'Erro ao gerar arquivo SINTEGRA' };
    }
  },

  gerarRegistro10(empresa: any, periodo: { mes: number; ano: number }): string {
    const dataInicio = new Date(periodo.ano, periodo.mes - 1, 1);
    const dataFim = new Date(periodo.ano, periodo.mes, 0);

    return [
      '10',
      (empresa.cnpj || '').replace(/\D/g, '').padStart(14, '0'),
      (empresa.ie || '').replace(/\D/g, '').padEnd(14, ' '),
      (empresa.razao_social || '').padEnd(35, ' ').substring(0, 35),
      (empresa.cidade || '').padEnd(30, ' ').substring(0, 30),
      (empresa.uf || 'SP').padEnd(2, ' '),
      '0000000000', // Fax
      this.formatData(dataInicio),
      this.formatData(dataFim),
      '1', // Código identificação da estrutura
      '3', // Código natureza operações
      '3'  // Código finalidade
    ].join('');
  },

  gerarRegistro11(empresa: any): string {
    return [
      '11',
      (empresa.endereco || '').padEnd(34, ' ').substring(0, 34),
      (empresa.numero || '').padEnd(5, ' ').substring(0, 5),
      (empresa.complemento || '').padEnd(22, ' ').substring(0, 22),
      (empresa.bairro || '').padEnd(15, ' ').substring(0, 15),
      (empresa.cep || '').replace(/\D/g, '').padStart(8, '0'),
      (empresa.responsavel || '').padEnd(28, ' ').substring(0, 28),
      (empresa.telefone || '').replace(/\D/g, '').padStart(12, '0')
    ].join('');
  },

  gerarRegistro50(nota: any): string {
    return [
      '50',
      (nota.cnpj_destinatario || '').replace(/\D/g, '').padStart(14, '0'),
      (nota.ie_destinatario || '').replace(/\D/g, '').padEnd(14, ' '),
      this.formatData(new Date(nota.data_emissao)),
      (nota.uf_destinatario || 'SP').padEnd(2, ' '),
      (nota.modelo || '55').toString().padStart(2, '0'),
      (nota.serie || '1').padEnd(3, ' '),
      (nota.numero || '').toString().padStart(6, '0'),
      (nota.cfop || '').toString().padStart(4, '0'),
      'N', // Tipo de emissão
      this.formatValorSintegra(nota.valor_total || 0),
      this.formatValorSintegra(nota.valor_icms_base || 0),
      this.formatValorSintegra(nota.valor_icms || 0),
      this.formatValorSintegra(nota.valor_isentas || 0),
      this.formatValorSintegra(nota.valor_outras || 0),
      (nota.aliquota_icms || 0).toString().padStart(4, '0'),
      nota.tipo_operacao === 'entrada' ? 'P' : 'T'
    ].join('');
  },

  gerarRegistro90(totalRegistros: number): string {
    return [
      '90',
      ''.padEnd(14, '0'), // CNPJ
      ''.padEnd(14, ' '), // IE
      '50',
      totalRegistros.toString().padStart(8, '0'),
      ''.padEnd(85, ' '),
      '1'
    ].join('');
  },

  // =====================================================
  // Helpers
  // =====================================================

  formatData(data: Date): string {
    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const ano = data.getFullYear().toString();
    return dia + mes + ano;
  },

  formatValor(valor: number): string {
    return valor.toFixed(2).replace('.', ',');
  },

  formatValorSintegra(valor: number): string {
    return Math.round(valor * 100).toString().padStart(13, '0');
  }
};

export default spedService;
