'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { auditService } from '@/modules/core/services/auditService';

// =====================================================
// XML Import Service
// Importação de XML de Fornecedores (NF-e)
// =====================================================

export interface XMLNotaFiscal {
  chave_acesso: string;
  numero: string;
  serie: string;
  data_emissao: string;
  // Emitente
  emitente_cnpj: string;
  emitente_razao_social: string;
  emitente_ie?: string;
  emitente_uf?: string;
  // Destinatário
  destinatario_cnpj: string;
  destinatario_razao_social: string;
  // Valores
  valor_produtos: number;
  valor_frete: number;
  valor_seguro: number;
  valor_desconto: number;
  valor_ipi: number;
  valor_icms: number;
  valor_icms_st: number;
  valor_total: number;
  // Itens
  itens: XMLNotaItem[];
}

export interface XMLNotaItem {
  codigo: string;
  descricao: string;
  ncm?: string;
  cfop?: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_icms?: number;
  valor_ipi?: number;
  aliq_icms?: number;
  aliq_ipi?: number;
}

export const xmlService = {
  // =====================================================
  // Processamento de XML
  // =====================================================

  async parseXML(xmlContent: string): Promise<{
    success: boolean;
    data?: XMLNotaFiscal;
    error?: string;
  }> {
    try {
      // Parser simples para extrair dados do XML da NF-e
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

      // Verificar erro de parsing
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        return { success: false, error: 'XML inválido' };
      }

      // Buscar namespace
      const nfe = xmlDoc.querySelector('NFe, nfeProc > NFe');
      if (!nfe) {
        return { success: false, error: 'XML não contém NF-e válida' };
      }

      const infNFe = nfe.querySelector('infNFe');
      const ide = infNFe?.querySelector('ide');
      const emit = infNFe?.querySelector('emit');
      const dest = infNFe?.querySelector('dest');
      const total = infNFe?.querySelector('total > ICMSTot');

      // Extrair chave de acesso
      const chaveAcesso = infNFe?.getAttribute('Id')?.replace('NFe', '') || '';

      // Dados da nota
      const nota: XMLNotaFiscal = {
        chave_acesso: chaveAcesso,
        numero: this.getText(ide, 'nNF'),
        serie: this.getText(ide, 'serie'),
        data_emissao: this.getText(ide, 'dhEmi'),
        // Emitente
        emitente_cnpj: this.getText(emit, 'CNPJ'),
        emitente_razao_social: this.getText(emit, 'xNome'),
        emitente_ie: this.getText(emit, 'IE'),
        emitente_uf: this.getText(emit?.querySelector('enderEmit'), 'UF'),
        // Destinatário
        destinatario_cnpj: this.getText(dest, 'CNPJ') || this.getText(dest, 'CPF'),
        destinatario_razao_social: this.getText(dest, 'xNome'),
        // Valores
        valor_produtos: this.getNumber(total, 'vProd'),
        valor_frete: this.getNumber(total, 'vFrete'),
        valor_seguro: this.getNumber(total, 'vSeg'),
        valor_desconto: this.getNumber(total, 'vDesc'),
        valor_ipi: this.getNumber(total, 'vIPI'),
        valor_icms: this.getNumber(total, 'vICMS'),
        valor_icms_st: this.getNumber(total, 'vST'),
        valor_total: this.getNumber(total, 'vNF'),
        // Itens
        itens: []
      };

      // Extrair itens
      const dets = infNFe?.querySelectorAll('det');
      dets?.forEach(det => {
        const prod = det.querySelector('prod');
        const imposto = det.querySelector('imposto');
        const icms = imposto?.querySelector('ICMS > *');
        const ipi = imposto?.querySelector('IPI > IPITrib, IPI > IPINT');

        nota.itens.push({
          codigo: this.getText(prod, 'cProd'),
          descricao: this.getText(prod, 'xProd'),
          ncm: this.getText(prod, 'NCM'),
          cfop: this.getText(prod, 'CFOP'),
          unidade: this.getText(prod, 'uCom'),
          quantidade: this.getNumber(prod, 'qCom'),
          valor_unitario: this.getNumber(prod, 'vUnCom'),
          valor_total: this.getNumber(prod, 'vProd'),
          valor_icms: this.getNumber(icms, 'vICMS'),
          valor_ipi: this.getNumber(ipi, 'vIPI'),
          aliq_icms: this.getNumber(icms, 'pICMS'),
          aliq_ipi: this.getNumber(ipi, 'pIPI')
        });
      });

      return { success: true, data: nota };
    } catch (error) {
      console.error('Erro ao processar XML:', error);
      return { success: false, error: 'Erro ao processar XML' };
    }
  },

  // =====================================================
  // Importação para o Sistema
  // =====================================================

  async importarNota(empresaId: string, nota: XMLNotaFiscal): Promise<{
    success: boolean;
    nota_id?: string;
    produtos_importados?: number;
    produtos_novos?: number;
    error?: string;
  }> {
    const supabase = createClient();

    try {
      // Verificar se a nota já existe
      const { data: existente } = await supabase
        .from('notas_fiscais')
        .select('id')
        .eq('chave_acesso', nota.chave_acesso)
        .eq('empresa_id', empresaId)
        .single();

      if (existente) {
        return { success: false, error: 'Nota fiscal já importada' };
      }

      // Verificar/criar fornecedor
      let fornecedorId: string | null = null;
      const { data: fornecedor } = await supabase
        .from('fornecedores')
        .select('id')
        .eq('cnpj', nota.emitente_cnpj)
        .eq('empresa_id', empresaId)
        .single();

      if (fornecedor) {
        fornecedorId = fornecedor.id;
      } else {
        // Criar fornecedor
        const { data: novoFornecedor } = await supabase
          .from('fornecedores')
          .insert({
            empresa_id: empresaId,
            razao_social: nota.emitente_razao_social,
            cnpj: nota.emitente_cnpj,
            ie: nota.emitente_ie,
            uf: nota.emitente_uf
          })
          .select()
          .single();

        fornecedorId = novoFornecedor?.id || null;
      }

      // Criar nota fiscal
      const { data: notaFiscal, error: notaError } = await supabase
        .from('notas_fiscais')
        .insert({
          empresa_id: empresaId,
          fornecedor_id: fornecedorId,
          tipo: 'entrada',
          modelo: '55',
          serie: nota.serie,
          numero: nota.numero,
          chave_acesso: nota.chave_acesso,
          data_emissao: nota.data_emissao,
          data_movimento: nota.data_emissao,
          valor_produtos: nota.valor_produtos,
          valor_frete: nota.valor_frete,
          valor_seguro: nota.valor_seguro,
          valor_desconto: nota.valor_desconto,
          valor_ipi: nota.valor_ipi,
          valor_icms: nota.valor_icms,
          valor_icms_st: nota.valor_icms_st,
          valor_total: nota.valor_total,
          status: 'autorizada',
          origem: 'importacao_xml'
        })
        .select()
        .single();

      if (notaError) {
        return { success: false, error: notaError.message };
      }

      // Importar itens
      let produtosImportados = 0;
      let produtosNovos = 0;

      for (const item of nota.itens) {
        // Verificar se produto existe
        let produtoId: string | null = null;
        const { data: produto } = await supabase
          .from('produtos')
          .select('id')
          .eq('codigo', item.codigo)
          .eq('empresa_id', empresaId)
          .single();

        if (produto) {
          produtoId = produto.id;
        } else {
          // Criar produto
          const { data: novoProduto } = await supabase
            .from('produtos')
            .insert({
              empresa_id: empresaId,
              codigo: item.codigo,
              descricao: item.descricao,
              ncm: item.ncm,
              unidade: item.unidade,
              preco_custo: item.valor_unitario,
              preco_venda: item.valor_unitario * 1.3, // Margem padrão 30%
              ativo: true
            })
            .select()
            .single();

          produtoId = novoProduto?.id || null;
          produtosNovos++;
        }

        // Criar item da nota
        if (produtoId) {
          await supabase
            .from('nota_fiscal_itens')
            .insert({
              empresa_id: empresaId,
              nota_fiscal_id: notaFiscal.id,
              produto_id: produtoId,
              cfop: item.cfop,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              valor_total: item.valor_total,
              valor_icms: item.valor_icms,
              valor_ipi: item.valor_ipi,
              aliq_icms: item.aliq_icms,
              aliq_ipi: item.aliq_ipi
            });

          produtosImportados++;
        }
      }

      await auditService.logInsert('notas_fiscais', notaFiscal.id, {
        chave_acesso: nota.chave_acesso,
        origem: 'importacao_xml',
        itens: produtosImportados
      }, empresaId);

      return {
        success: true,
        nota_id: notaFiscal.id,
        produtos_importados: produtosImportados,
        produtos_novos: produtosNovos
      };
    } catch (error) {
      console.error('Erro ao importar nota:', error);
      return { success: false, error: 'Erro ao importar nota fiscal' };
    }
  },

  // =====================================================
  // Importação em Lote
  // =====================================================

  async importarLote(empresaId: string, arquivos: File[]): Promise<{
    success: boolean;
    total: number;
    importadas: number;
    erros: { arquivo: string; erro: string }[];
  }> {
    const erros: { arquivo: string; erro: string }[] = [];
    let importadas = 0;

    for (const arquivo of arquivos) {
      try {
        const xmlContent = await arquivo.text();
        const parseResult = await this.parseXML(xmlContent);

        if (!parseResult.success || !parseResult.data) {
          erros.push({ arquivo: arquivo.name, erro: parseResult.error || 'Erro ao processar' });
          continue;
        }

        const importResult = await this.importarNota(empresaId, parseResult.data);

        if (!importResult.success) {
          erros.push({ arquivo: arquivo.name, erro: importResult.error || 'Erro ao importar' });
        } else {
          importadas++;
        }
      } catch (error) {
        erros.push({ arquivo: arquivo.name, erro: 'Erro inesperado' });
      }
    }

    return {
      success: erros.length === 0,
      total: arquivos.length,
      importadas,
      erros
    };
  },

  // =====================================================
  // Helpers
  // =====================================================

  getText(element: Element | null | undefined, tagName: string): string {
    return element?.querySelector(tagName)?.textContent?.trim() || '';
  },

  getNumber(element: Element | null | undefined, tagName: string): number {
    const text = this.getText(element, tagName);
    return parseFloat(text.replace(',', '.')) || 0;
  }
};

export default xmlService;
