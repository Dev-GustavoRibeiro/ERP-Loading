'use client';

// =====================================================
// PDV Domain Types
// =====================================================

// Caixa (Terminal PDV)
export interface Caixa {
  id: string;
  empresa_id: string;
  filial_id?: string;
  codigo: string;
  descricao?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCaixaDTO {
  codigo: string;
  descricao?: string;
  filial_id?: string;
}

// Sessão de Caixa (Abertura/Fechamento)
export interface CaixaSessao {
  id: string;
  caixa_id: string;
  operador_id: string;
  data_abertura: string;
  data_fechamento?: string;
  valor_abertura: number;
  valor_fechamento?: number;
  valor_vendas: number;
  valor_sangrias: number;
  valor_suprimentos: number;
  status: 'aberto' | 'fechado';
  observacao?: string;
  created_at?: string;
  // Relations
  caixa?: Caixa;
}

// Venda PDV
export interface VendaPDV {
  id: string;
  empresa_id: string;
  sessao_id: string;
  cliente_id?: string;
  numero: string;
  data_venda: string;
  subtotal: number;
  desconto_valor: number;
  desconto_percentual: number;
  acrescimo: number;
  total: number;
  troco: number;
  status: 'em_andamento' | 'finalizada' | 'cancelada';
  nfce_numero?: string;
  nfce_chave?: string;
  observacao?: string;
  created_at?: string;
  // Relations
  itens?: VendaPDVItem[];
  pagamentos?: VendaPDVPagamento[];
  cliente?: {
    id: string;
    nome: string;
    cpf_cnpj?: string;
  };
}

// Item da Venda PDV
export interface VendaPDVItem {
  id: string;
  venda_id: string;
  produto_id: string;
  codigo_barras?: string;
  descricao: string;
  quantidade: number;
  unidade?: string;
  preco_unitario: number;
  desconto_percentual: number;
  desconto_valor: number;
  total: number;
  cancelado: boolean;
  ordem?: number;
  // Relations
  produto?: {
    id: string;
    codigo: string;
    nome: string;
    preco_venda: number;
  };
}

// Pagamento da Venda
export interface VendaPDVPagamento {
  id: string;
  venda_id: string;
  forma_pagamento_id?: string;
  tipo: 'dinheiro' | 'credito' | 'debito' | 'pix' | 'vale' | 'outro';
  valor: number;
  bandeira?: string;
  nsu?: string;
  autorizacao?: string;
  parcelas: number;
}

export interface CreatePagamentoDTO {
  tipo: VendaPDVPagamento['tipo'];
  valor: number;
  forma_pagamento_id?: string;
  bandeira?: string;
  nsu?: string;
  autorizacao?: string;
  parcelas?: number;
}

// Movimento de Caixa (Sangria/Suprimento)
export interface CaixaMovimento {
  id: string;
  sessao_id: string;
  tipo: 'sangria' | 'suprimento';
  valor: number;
  motivo?: string;
  operador_id: string;
  created_at?: string;
}

// DTOs
export interface AbrirCaixaDTO {
  caixa_id: string;
  valor_abertura: number;
}

export interface FecharCaixaDTO {
  valor_fechamento: number;
  observacao?: string;
}

export interface AdicionarItemDTO {
  produto_id: string;
  quantidade: number;
  desconto_percentual?: number;
}

export interface AplicarDescontoDTO {
  tipo: 'valor' | 'percentual';
  valor: number;
}

export interface MovimentoCaixaDTO {
  tipo: 'sangria' | 'suprimento';
  valor: number;
  motivo?: string;
}

// Estado do PDV
export interface PDVState {
  caixa?: Caixa;
  sessao?: CaixaSessao;
  vendaAtual?: VendaPDV;
  itens: VendaPDVItem[];
  subtotal: number;
  desconto: number;
  total: number;
}

// Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
