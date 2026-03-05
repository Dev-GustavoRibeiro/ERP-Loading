// =====================================================
// Fiscal Domain Types (NF-e / NFC-e)
// =====================================================

export interface NotaFiscal {
  id: string;
  empresa_id: string;
  filial_id?: string;
  // Identificação
  modelo: '55' | '65'; // 55=NF-e, 65=NFC-e
  serie: string;
  numero: number;
  chave_acesso?: string;
  // Datas
  data_emissao: string;
  data_saida_entrada?: string;
  // Natureza
  natureza_operacao: string;
  tipo_operacao: '0' | '1'; // 0=Entrada, 1=Saída
  finalidade: '1' | '2' | '3' | '4';
  // Destinatário
  destinatario_id?: string;
  destinatario_nome?: string;
  destinatario_cpf_cnpj?: string;
  destinatario_ie?: string;
  destinatario_endereco?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade_ibge?: string;
    cidade_nome?: string;
    uf?: string;
  };
  // Valores
  valor_produtos: number;
  valor_frete: number;
  valor_seguro: number;
  valor_desconto: number;
  valor_outras_despesas: number;
  valor_ipi: number;
  valor_icms: number;
  valor_icms_st: number;
  valor_pis: number;
  valor_cofins: number;
  valor_total: number;
  // Transporte
  transportadora_id?: string;
  modalidade_frete: '0' | '1' | '2' | '3' | '4' | '9';
  placa_veiculo?: string;
  uf_veiculo?: string;
  quantidade_volumes: number;
  especie_volumes?: string;
  peso_liquido: number;
  peso_bruto: number;
  // Status
  status: 'digitacao' | 'validada' | 'autorizada' | 'cancelada' | 'denegada' | 'inutilizada';
  status_sefaz?: string;
  motivo_sefaz?: string;
  protocolo_autorizacao?: string;
  data_autorizacao?: string;
  // Cancelamento
  cancelada: boolean;
  data_cancelamento?: string;
  protocolo_cancelamento?: string;
  justificativa_cancelamento?: string;
  numero_carta_correcao: number;
  // XMLs
  xml_envio?: string;
  xml_retorno?: string;
  xml_proc?: string;
  // Referências
  pedido_venda_id?: string;
  pedido_compra_id?: string;
  nfe_referenciada?: string;
  // Observações
  informacoes_adicionais_fisco?: string;
  informacoes_adicionais_contribuinte?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Relacionamentos
  destinatario?: {
    id: string;
    nome: string;
    cpf_cnpj?: string;
  };
  itens?: NotaFiscalItem[];
}

export interface NotaFiscalItem {
  id: string;
  nota_fiscal_id: string;
  numero_item: number;
  produto_id?: string;
  servico_id?: string;
  codigo: string;
  descricao: string;
  ncm?: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto: number;
  valor_frete: number;
  valor_seguro: number;
  valor_outras_despesas: number;
  // Tributação
  cst_icms?: string;
  origem: string;
  base_icms: number;
  aliquota_icms: number;
  valor_icms: number;
  base_icms_st: number;
  aliquota_icms_st: number;
  valor_icms_st: number;
  cst_ipi?: string;
  base_ipi: number;
  aliquota_ipi: number;
  valor_ipi: number;
  cst_pis?: string;
  base_pis: number;
  aliquota_pis: number;
  valor_pis: number;
  cst_cofins?: string;
  base_cofins: number;
  aliquota_cofins: number;
  valor_cofins: number;
  informacoes_adicionais?: string;
  produto?: {
    id: string;
    codigo: string;
    descricao: string;
  };
}

export interface CreateNotaFiscalDTO {
  modelo: '55' | '65';
  serie?: string;
  natureza_operacao: string;
  tipo_operacao: '0' | '1';
  finalidade?: '1' | '2' | '3' | '4';
  destinatario_id?: string;
  filial_id?: string;
  transportadora_id?: string;
  modalidade_frete?: string;
  pedido_venda_id?: string;
  informacoes_adicionais_contribuinte?: string;
  itens: CreateNotaFiscalItemDTO[];
}

export interface CreateNotaFiscalItemDTO {
  produto_id?: string;
  servico_id?: string;
  codigo: string;
  descricao: string;
  ncm?: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  cst_icms?: string;
  aliquota_icms?: number;
  aliquota_ipi?: number;
  cst_pis?: string;
  aliquota_pis?: number;
  cst_cofins?: string;
  aliquota_cofins?: number;
}

// Inutilização
export interface NfeInutilizacao {
  id: string;
  empresa_id: string;
  modelo: string;
  serie: string;
  numero_inicial: number;
  numero_final: number;
  justificativa: string;
  data_inutilizacao: string;
  protocolo?: string;
  status: string;
  xml_retorno?: string;
  created_at: string;
}

// Carta de Correção
export interface NfeCartaCorrecao {
  id: string;
  nota_fiscal_id: string;
  sequencia: number;
  correcao: string;
  data_evento: string;
  protocolo?: string;
  status: string;
  xml_retorno?: string;
  created_at: string;
}
