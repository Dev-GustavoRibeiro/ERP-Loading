// =====================================================
// Vendas Domain Types
// =====================================================

// Orçamento/Proposta
export interface Orcamento {
  id: string;
  empresa_id: string;
  filial_id?: string;
  numero: string;
  cliente_id: string;
  vendedor_id?: string;
  data_orcamento: string;
  data_validade?: string;
  condicao_pagamento_id?: string;
  forma_pagamento_id?: string;
  transportadora_id?: string;
  frete_tipo: 'CIF' | 'FOB';
  frete_valor: number;
  desconto_percentual: number;
  desconto_valor: number;
  acrescimo_valor: number;
  subtotal: number;
  total: number;
  status: 'pendente' | 'aprovado' | 'reprovado' | 'convertido' | 'expirado' | 'cancelado';
  motivo_reprovacao?: string;
  observacao?: string;
  observacao_interna?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Relacionamentos
  cliente?: {
    id: string;
    nome: string;
    cpf_cnpj?: string;
  };
  vendedor?: {
    id: string;
    nome: string;
  };
  itens?: OrcamentoItem[];
}

export interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  produto_id?: string;
  servico_id?: string;
  descricao: string;
  quantidade: number;
  unidade_medida_id?: string;
  preco_unitario: number;
  desconto_percentual: number;
  desconto_valor: number;
  total: number;
  ordem: number;
  produto?: {
    id: string;
    codigo: string;
    descricao: string;
  };
}

export interface CreateOrcamentoDTO {
  numero: string;
  cliente_id: string;
  vendedor_id?: string;
  filial_id?: string;
  data_validade?: string;
  condicao_pagamento_id?: string;
  forma_pagamento_id?: string;
  frete_tipo?: 'CIF' | 'FOB';
  frete_valor?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  observacao?: string;
  observacao_interna?: string;
  itens: CreateOrcamentoItemDTO[];
}

export interface CreateOrcamentoItemDTO {
  produto_id?: string;
  servico_id?: string;
  descricao: string;
  quantidade: number;
  unidade_medida_id?: string;
  preco_unitario: number;
  desconto_percentual?: number;
  ordem?: number;
}

export interface UpdateOrcamentoDTO extends Partial<Omit<CreateOrcamentoDTO, 'itens'>> {
  status?: 'pendente' | 'aprovado' | 'reprovado' | 'convertido' | 'expirado' | 'cancelado';
  motivo_reprovacao?: string;
}

// Pedido de Venda
export interface PedidoVenda {
  id: string;
  empresa_id: string;
  filial_id?: string;
  numero: string;
  orcamento_id?: string;
  cliente_id: string;
  vendedor_id?: string;
  data_pedido: string;
  data_entrega_prevista?: string;
  data_entrega_realizada?: string;
  condicao_pagamento_id?: string;
  forma_pagamento_id?: string;
  transportadora_id?: string;
  frete_tipo: 'CIF' | 'FOB';
  frete_valor: number;
  desconto_percentual: number;
  desconto_valor: number;
  acrescimo_valor: number;
  subtotal: number;
  total: number;
  comissao_percentual: number;
  comissao_valor: number;
  status: 'pendente' | 'aprovado' | 'separacao' | 'faturado' | 'entregue' | 'cancelado';
  nfe_id?: string;
  aprovador_id?: string;
  data_aprovacao?: string;
  observacao?: string;
  observacao_interna?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Relacionamentos
  cliente?: {
    id: string;
    nome: string;
    cpf_cnpj?: string;
  };
  vendedor?: {
    id: string;
    nome: string;
    comissao_percentual: number;
  };
  itens?: PedidoVendaItem[];
}

export interface PedidoVendaItem {
  id: string;
  pedido_id: string;
  produto_id?: string;
  servico_id?: string;
  descricao: string;
  quantidade: number;
  quantidade_entregue: number;
  unidade_medida_id?: string;
  preco_unitario: number;
  desconto_percentual: number;
  desconto_valor: number;
  total: number;
  custo_unitario: number;
  cfop_id?: string;
  ncm_id?: string;
  cst_icms?: string;
  icms_base: number;
  icms_aliquota: number;
  icms_valor: number;
  pis_aliquota: number;
  pis_valor: number;
  cofins_aliquota: number;
  cofins_valor: number;
  ordem: number;
  produto?: {
    id: string;
    codigo: string;
    descricao: string;
  };
}

export interface CreatePedidoVendaDTO {
  numero: string;
  cliente_id: string;
  vendedor_id?: string;
  orcamento_id?: string;
  filial_id?: string;
  data_entrega_prevista?: string;
  condicao_pagamento_id?: string;
  forma_pagamento_id?: string;
  transportadora_id?: string;
  frete_tipo?: 'CIF' | 'FOB';
  frete_valor?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  observacao?: string;
  observacao_interna?: string;
  itens: CreatePedidoVendaItemDTO[];
}

export interface CreatePedidoVendaItemDTO {
  produto_id?: string;
  servico_id?: string;
  descricao: string;
  quantidade: number;
  unidade_medida_id?: string;
  preco_unitario: number;
  desconto_percentual?: number;
  cfop_id?: string;
  ncm_id?: string;
  ordem?: number;
}

export interface UpdatePedidoVendaDTO extends Partial<Omit<CreatePedidoVendaDTO, 'itens'>> {
  status?: 'pendente' | 'aprovado' | 'separacao' | 'faturado' | 'entregue' | 'cancelado';
}

// Comissão
export interface Comissao {
  id: string;
  empresa_id: string;
  vendedor_id: string;
  pedido_id: string;
  valor_venda: number;
  percentual: number;
  valor_comissao: number;
  status: 'pendente' | 'aprovada' | 'paga' | 'cancelada';
  data_pagamento?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
  vendedor?: {
    id: string;
    nome: string;
  };
  pedido?: {
    id: string;
    numero: string;
  };
}
