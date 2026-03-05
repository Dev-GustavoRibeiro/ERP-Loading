// =====================================================
// Compras Domain Types
// =====================================================

// Requisição de Compra
export interface RequisicaoCompra {
  id: string;
  empresa_id: string;
  filial_id?: string;
  numero: string;
  data_requisicao: string;
  data_necessidade?: string;
  solicitante_id?: string;
  departamento?: string;
  status: 'pendente' | 'aprovada' | 'reprovada' | 'parcial' | 'concluida' | 'cancelada';
  aprovador_id?: string;
  data_aprovacao?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  itens?: RequisicaoItem[];
}

export interface RequisicaoItem {
  id: string;
  requisicao_id: string;
  produto_id: string;
  quantidade: number;
  quantidade_atendida: number;
  unidade_medida_id?: string;
  justificativa?: string;
  produto?: {
    id: string;
    codigo: string;
    descricao: string;
  };
}

export interface CreateRequisicaoDTO {
  numero: string;
  filial_id?: string;
  data_necessidade?: string;
  departamento?: string;
  observacao?: string;
  itens: CreateRequisicaoItemDTO[];
}

export interface CreateRequisicaoItemDTO {
  produto_id: string;
  quantidade: number;
  unidade_medida_id?: string;
  justificativa?: string;
}

// Cotação
export interface Cotacao {
  id: string;
  empresa_id: string;
  numero: string;
  data_cotacao: string;
  data_validade?: string;
  requisicao_id?: string;
  status: 'aberta' | 'em_analise' | 'concluida' | 'cancelada';
  observacao?: string;
  created_at: string;
  updated_at: string;
  fornecedores?: CotacaoFornecedor[];
}

export interface CotacaoFornecedor {
  id: string;
  cotacao_id: string;
  fornecedor_id: string;
  data_resposta?: string;
  prazo_entrega?: number;
  condicao_pagamento_id?: string;
  valor_total?: number;
  selecionado: boolean;
  observacao?: string;
  fornecedor?: {
    id: string;
    razao_social: string;
  };
  itens?: CotacaoItem[];
}

export interface CotacaoItem {
  id: string;
  cotacao_fornecedor_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario?: number;
  desconto_percentual: number;
  preco_final?: number;
}

// Pedido de Compra
export interface PedidoCompra {
  id: string;
  empresa_id: string;
  filial_id?: string;
  numero: string;
  fornecedor_id: string;
  cotacao_id?: string;
  requisicao_id?: string;
  data_pedido: string;
  data_entrega_prevista?: string;
  data_entrega_realizada?: string;
  condicao_pagamento_id?: string;
  forma_pagamento_id?: string;
  transportadora_id?: string;
  frete_tipo: 'CIF' | 'FOB';
  frete_valor: number;
  desconto_valor: number;
  outras_despesas: number;
  subtotal: number;
  total: number;
  status: 'pendente' | 'aprovado' | 'parcial' | 'entregue' | 'cancelado';
  aprovador_id?: string;
  data_aprovacao?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Relacionamentos
  fornecedor?: {
    id: string;
    razao_social: string;
    cpf_cnpj: string;
  };
  itens?: PedidoCompraItem[];
}

export interface PedidoCompraItem {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  quantidade_entregue: number;
  unidade_medida_id?: string;
  preco_unitario: number;
  desconto_percentual: number;
  desconto_valor: number;
  total: number;
  icms_base: number;
  icms_aliquota: number;
  icms_valor: number;
  ipi_base: number;
  ipi_aliquota: number;
  ipi_valor: number;
  cfop_id?: string;
  ncm_id?: string;
  produto?: {
    id: string;
    codigo: string;
    descricao: string;
  };
}

export interface CreatePedidoCompraDTO {
  numero: string;
  fornecedor_id: string;
  filial_id?: string;
  cotacao_id?: string;
  requisicao_id?: string;
  data_entrega_prevista?: string;
  condicao_pagamento_id?: string;
  forma_pagamento_id?: string;
  transportadora_id?: string;
  frete_tipo?: 'CIF' | 'FOB';
  frete_valor?: number;
  desconto_valor?: number;
  outras_despesas?: number;
  observacao?: string;
  itens: CreatePedidoCompraItemDTO[];
}

export interface CreatePedidoCompraItemDTO {
  produto_id: string;
  quantidade: number;
  unidade_medida_id?: string;
  preco_unitario: number;
  desconto_percentual?: number;
  cfop_id?: string;
  ncm_id?: string;
}

export interface UpdatePedidoCompraDTO extends Partial<Omit<CreatePedidoCompraDTO, 'itens'>> {
  status?: 'pendente' | 'aprovado' | 'parcial' | 'entregue' | 'cancelado';
}
