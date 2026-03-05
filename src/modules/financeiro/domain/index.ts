// =====================================================
// Financeiro Domain Types
// =====================================================

// Plano de Contas
export interface PlanoConta {
  id: string;
  empresa_id: string;
  codigo: string;
  descricao: string;
  tipo: 'R' | 'D'; // R=Receita, D=Despesa
  nivel: number;
  pai_id?: string;
  analitica: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  filhos?: PlanoConta[];
}

export interface CreatePlanoContaDTO {
  codigo: string;
  descricao: string;
  tipo: 'R' | 'D';
  pai_id?: string;
  analitica?: boolean;
}

// Centro de Custo
export interface CentroCusto {
  id: string;
  empresa_id: string;
  codigo: string;
  descricao: string;
  pai_id?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCentroCustoDTO {
  codigo: string;
  descricao: string;
  pai_id?: string;
}

// Conta Bancária
export interface ContaBancaria {
  id: string;
  empresa_id: string;
  filial_id?: string;
  banco_codigo: string;
  banco_nome: string;
  agencia: string;
  agencia_digito?: string;
  conta: string;
  conta_digito?: string;
  tipo: 'corrente' | 'poupanca' | 'investimento' | 'caixa';
  descricao?: string;
  saldo_inicial: number;
  saldo_atual: number;
  data_saldo_inicial?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateContaBancariaDTO {
  banco_codigo: string;
  banco_nome: string;
  agencia: string;
  agencia_digito?: string;
  conta: string;
  conta_digito?: string;
  tipo?: 'corrente' | 'poupanca' | 'investimento' | 'caixa';
  descricao?: string;
  saldo_inicial?: number;
  data_saldo_inicial?: string;
  filial_id?: string;
}

// Conta a Pagar
export interface ContaPagar {
  id: string;
  empresa_id: string;
  filial_id?: string;
  fornecedor_id?: string;
  documento_tipo: string;
  numero_documento?: string;
  documento_id?: string;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  valor_original: number;
  valor_juros: number;
  valor_multa: number;
  valor_desconto: number;
  valor_pago: number;
  plano_conta_id?: string;
  centro_custo_id?: string;
  conta_bancaria_id?: string;
  forma_pagamento_id?: string;
  status: 'aberta' | 'parcial' | 'paga' | 'cancelada' | 'vencida';
  parcela_numero: number;
  parcela_total: number;
  observacao?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  fornecedor?: {
    id: string;
    razao_social: string;
  };
}

export interface CreateContaPagarDTO {
  fornecedor_id?: string;
  documento_tipo?: string;
  numero_documento?: string;
  documento_id?: string;
  data_emissao: string;
  data_vencimento: string;
  valor_original: number;
  plano_conta_id?: string;
  centro_custo_id?: string;
  forma_pagamento_id?: string;
  parcela_numero?: number;
  parcela_total?: number;
  observacao?: string;
  filial_id?: string;
}

export interface UpdateContaPagarDTO extends Partial<CreateContaPagarDTO> {
  data_pagamento?: string;
  valor_juros?: number;
  valor_multa?: number;
  valor_desconto?: number;
  valor_pago?: number;
  conta_bancaria_id?: string;
  status?: 'aberta' | 'parcial' | 'paga' | 'cancelada';
}

// Conta a Receber
export interface ContaReceber {
  id: string;
  empresa_id: string;
  filial_id?: string;
  cliente_id?: string;
  documento_tipo: string;
  numero_documento?: string;
  documento_id?: string;
  data_emissao: string;
  data_vencimento: string;
  data_recebimento?: string;
  valor_original: number;
  valor_juros: number;
  valor_multa: number;
  valor_desconto: number;
  valor_recebido: number;
  plano_conta_id?: string;
  centro_custo_id?: string;
  conta_bancaria_id?: string;
  forma_pagamento_id?: string;
  status: 'aberta' | 'parcial' | 'recebida' | 'cancelada' | 'vencida';
  parcela_numero: number;
  parcela_total: number;
  nosso_numero?: string;
  linha_digitavel?: string;
  codigo_barras?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  cliente?: {
    id: string;
    nome: string;
  };
}

export interface CreateContaReceberDTO {
  cliente_id?: string;
  documento_tipo?: string;
  numero_documento?: string;
  documento_id?: string;
  data_emissao: string;
  data_vencimento: string;
  valor_original: number;
  plano_conta_id?: string;
  centro_custo_id?: string;
  forma_pagamento_id?: string;
  parcela_numero?: number;
  parcela_total?: number;
  observacao?: string;
  filial_id?: string;
}

export interface UpdateContaReceberDTO extends Partial<CreateContaReceberDTO> {
  data_recebimento?: string;
  valor_juros?: number;
  valor_multa?: number;
  valor_desconto?: number;
  valor_recebido?: number;
  conta_bancaria_id?: string;
  status?: 'aberta' | 'parcial' | 'recebida' | 'cancelada';
}

// Movimentação Bancária
export interface MovimentacaoBancaria {
  id: string;
  empresa_id: string;
  conta_bancaria_id: string;
  tipo: 'credito' | 'debito' | 'transferencia';
  data_movimento: string;
  valor: number;
  saldo_anterior: number;
  saldo_posterior: number;
  plano_conta_id?: string;
  centro_custo_id?: string;
  origem_tipo?: string;
  origem_id?: string;
  conta_pagar_id?: string;
  conta_receber_id?: string;
  conta_destino_id?: string;
  descricao: string;
  numero_documento?: string;
  conciliado: boolean;
  data_conciliacao?: string;
  observacao?: string;
  created_at: string;
  // Relacionamentos
  conta_bancaria?: ContaBancaria;
  plano_conta?: PlanoConta;
}

export interface CreateMovimentacaoBancariaDTO {
  conta_bancaria_id: string;
  tipo: 'credito' | 'debito' | 'transferencia';
  data_movimento: string;
  valor: number;
  descricao: string;
  plano_conta_id?: string;
  centro_custo_id?: string;
  numero_documento?: string;
  conta_destino_id?: string;
  observacao?: string;
}

// =====================================================
// Tipos de Relatórios
// =====================================================

export interface FluxoCaixaItem {
  data: string;
  descricao: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  saldo: number;
  categoria?: string;
}

export interface ResumoFinanceiro {
  periodo: string;
  total_pagar: number;
  total_receber: number;
  saldo_previsto: number;
  pago: number;
  recebido: number;
  vencidos_pagar: number;
  vencidos_receber: number;
}

// =====================================================
// Boletos Bancários
// =====================================================

export interface Boleto {
  id: string;
  empresa_id: string;
  conta_receber_id?: string;
  cliente_id?: string;
  conta_bancaria_id?: string;
  // Dados do Boleto
  nosso_numero?: string;
  numero_documento?: string;
  linha_digitavel?: string;
  codigo_barras?: string;
  // Valores
  valor_nominal: number;
  valor_desconto: number;
  valor_juros: number;
  valor_multa: number;
  valor_pago?: number;
  // Datas
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  data_credito?: string;
  // Status
  status: 'gerado' | 'registrado' | 'pago' | 'cancelado' | 'vencido';
  // Instruções
  instrucao_1?: string;
  instrucao_2?: string;
  instrucao_3?: string;
  // Remessa/Retorno
  remessa_id?: string;
  retorno_id?: string;
  pdf_url?: string;
  created_at?: string;
  updated_at?: string;
  // Relacionamentos
  cliente?: {
    id: string;
    nome: string;
    cpf_cnpj?: string;
  };
  conta_receber?: ContaReceber;
}

export interface CreateBoletoDTO {
  conta_receber_id?: string;
  cliente_id?: string;
  conta_bancaria_id: string;
  numero_documento?: string;
  valor_nominal: number;
  valor_desconto?: number;
  data_emissao: string;
  data_vencimento: string;
  instrucao_1?: string;
  instrucao_2?: string;
  instrucao_3?: string;
}

export interface BoletoRemessa {
  id: string;
  empresa_id: string;
  conta_bancaria_id?: string;
  numero_sequencial?: number;
  data_geracao: string;
  arquivo_nome?: string;
  arquivo_url?: string;
  quantidade_boletos: number;
  valor_total: number;
  status: 'gerado' | 'enviado' | 'processado';
  created_at?: string;
}

export interface BoletoRetorno {
  id: string;
  empresa_id: string;
  conta_bancaria_id?: string;
  numero_sequencial?: number;
  data_processamento: string;
  arquivo_nome?: string;
  arquivo_url?: string;
  quantidade_registros: number;
  quantidade_pagos: number;
  valor_total_pago: number;
  status: 'processando' | 'processado' | 'erro';
  created_at?: string;
}

// =====================================================
// Fluxo de Caixa
// =====================================================

export interface FluxoCaixaProjetado {
  id: string;
  empresa_id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao?: string;
  valor: number;
  realizado: boolean;
  conta_bancaria_id?: string;
  conta_pagar_id?: string;
  conta_receber_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateFluxoCaixaDTO {
  data: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao?: string;
  valor: number;
  conta_bancaria_id?: string;
}

export interface FluxoCaixaResumo {
  data: string;
  saldo_inicial: number;
  entradas: number;
  saidas: number;
  saldo_final: number;
  entradas_realizadas: number;
  saidas_realizadas: number;
}

// =====================================================
// Movimento de Caixa
// =====================================================

export interface MovimentoCaixa {
  id: string;
  empresa_id: string;
  filial_id?: string;
  data: string;
  tipo: 'abertura' | 'entrada' | 'saida' | 'fechamento';
  categoria?: string;
  descricao?: string;
  valor: number;
  forma_pagamento?: string;
  conta_bancaria_id?: string;
  documento_tipo?: string;
  documento_numero?: string;
  operador_id?: string;
  created_at?: string;
}

export interface CreateMovimentoCaixaDTO {
  data: string;
  tipo: 'abertura' | 'entrada' | 'saida' | 'fechamento';
  categoria?: string;
  descricao?: string;
  valor: number;
  forma_pagamento?: string;
  documento_tipo?: string;
  documento_numero?: string;
  filial_id?: string;
}

