// =====================================================
// ERP Cadastros Domain Types
// =====================================================

// =====================================================
// Tabelas Auxiliares
// =====================================================

export interface UnidadeMedida {
  id: string;
  codigo: string;
  descricao: string;
  created_at: string;
}

export interface FormaPagamento {
  id: string;
  empresa_id?: string;
  codigo: string;
  descricao: string;
  tipo: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'boleto' | 'cheque' | 'transferencia' | 'outros';
  ativo: boolean;
  taxa_percentual: number;
  dias_recebimento: number;
  created_at: string;
}

export interface CondicaoPagamento {
  id: string;
  empresa_id?: string;
  codigo: string;
  descricao: string;
  parcelas: number;
  intervalo_dias: number;
  primeira_parcela_dias: number;
  ativo: boolean;
  created_at: string;
}

export interface CategoriaProduto {
  id: string;
  empresa_id?: string;
  categoria_pai_id?: string;
  codigo: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;

  // Relations
  categoria_pai?: CategoriaProduto;
  subcategorias?: CategoriaProduto[];
}

export interface NCM {
  id: string;
  codigo: string;
  descricao: string;
  aliquota_ipi?: number;
  created_at: string;
}

export interface CFOP {
  id: string;
  codigo: string;
  descricao: string;
  tipo: 'entrada' | 'saida';
  created_at: string;
}

// =====================================================
// Cadastros Principais
// =====================================================

// Cliente
export interface Cliente {
  id: string;
  empresa_id: string;
  codigo: string;
  tipo_pessoa: 'F' | 'J';
  nome: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  rg_ie?: string;

  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  codigo_ibge?: string;

  // Contato
  telefone?: string;
  celular?: string;
  email?: string;

  // Comercial
  limite_credito: number;
  tabela_preco_id?: string;
  condicao_pagamento_id?: string;
  vendedor_id?: string;

  // Controle
  observacoes?: string;
  ativo: boolean;

  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Relations
  condicao_pagamento?: CondicaoPagamento;
  vendedor?: Vendedor;
}

// Fornecedor
export interface Fornecedor {
  id: string;
  empresa_id: string;
  codigo: string;
  tipo_pessoa: 'F' | 'J';
  razao_social: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  inscricao_estadual?: string;

  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  codigo_ibge?: string;

  // Contato
  telefone?: string;
  email?: string;
  contato_nome?: string;
  contato_telefone?: string;

  // Dados bancários
  banco_codigo?: string;
  banco_agencia?: string;
  banco_conta?: string;
  banco_tipo_conta?: string;
  pix_chave?: string;

  // Controle
  observacoes?: string;
  ativo: boolean;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Transportadora
export interface Transportadora {
  id: string;
  empresa_id: string;
  codigo: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  inscricao_estadual?: string;

  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;

  // Contato
  telefone?: string;
  email?: string;

  // Veículo padrão
  veiculo_placa?: string;
  veiculo_uf?: string;
  veiculo_rntc?: string;

  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Vendedor
export interface Vendedor {
  id: string;
  empresa_id: string;
  user_id?: string;
  codigo: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  comissao_percentual: number;
  meta_mensal?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Produto
export interface Produto {
  id: string;
  empresa_id: string;
  codigo: string;
  codigo_barras?: string;
  descricao: string;
  descricao_complementar?: string;

  // Classificação
  tipo: 'produto' | 'servico' | 'kit' | 'materia_prima';
  categoria_id?: string;
  marca?: string;

  // Unidades
  unidade_id?: string;
  unidade_tributavel_id?: string;
  fator_conversao: number;

  // Preços
  preco_custo: number;
  preco_venda: number;
  margem_lucro?: number;

  // Estoque
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo?: number;
  localizacao?: string;

  // Fiscal
  ncm_id?: string;
  cest?: string;
  origem: string;

  // Tributação ICMS
  icms_cst?: string;
  icms_aliquota?: number;
  icms_reducao_base?: number;

  // Tributação PIS/COFINS
  pis_cst?: string;
  pis_aliquota?: number;
  cofins_cst?: string;
  cofins_aliquota?: number;

  // Tributação IPI
  ipi_cst?: string;
  ipi_aliquota?: number;

  // Peso/Dimensões
  peso_bruto?: number;
  peso_liquido?: number;

  // Controle
  imagem_url?: string;
  ativo: boolean;

  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Relations
  categoria?: CategoriaProduto;
  unidade?: UnidadeMedida;
  ncm?: NCM;
}

// Serviço
export interface Servico {
  id: string;
  empresa_id: string;
  codigo: string;
  descricao: string;
  descricao_complementar?: string;
  preco: number;
  unidade: string;
  codigo_servico_municipal?: string;
  aliquota_iss?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// DTOs
// =====================================================

export interface CreateClienteDTO {
  codigo?: string;
  tipo_pessoa: 'F' | 'J';
  nome: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  rg_ie?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  codigo_ibge?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  limite_credito?: number;
  condicao_pagamento_id?: string;
  vendedor_id?: string;
  observacoes?: string;
}

export interface UpdateClienteDTO extends Partial<CreateClienteDTO> {
  ativo?: boolean;
}

export interface CreateFornecedorDTO {
  codigo: string;
  tipo_pessoa?: 'F' | 'J';
  razao_social: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  inscricao_estadual?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  codigo_ibge?: string;
  telefone?: string;
  email?: string;
  contato_nome?: string;
  contato_telefone?: string;
  banco_codigo?: string;
  banco_agencia?: string;
  banco_conta?: string;
  banco_tipo_conta?: string;
  pix_chave?: string;
  observacoes?: string;
}

export interface UpdateFornecedorDTO extends Partial<CreateFornecedorDTO> {
  ativo?: boolean;
}

export interface CreateProdutoDTO {
  codigo: string;
  codigo_barras?: string;
  descricao: string;
  descricao_complementar?: string;
  tipo?: 'produto' | 'servico' | 'kit' | 'materia_prima';
  categoria_id?: string;
  marca?: string;
  unidade_id?: string;
  preco_custo?: number;
  preco_venda?: number;
  estoque_minimo?: number;
  estoque_maximo?: number;
  localizacao?: string;
  ncm_id?: string;
  cest?: string;
  origem?: string;
  icms_cst?: string;
  icms_aliquota?: number;
  pis_cst?: string;
  cofins_cst?: string;
  peso_bruto?: number;
  peso_liquido?: number;
  imagem_url?: string;
}

export interface UpdateProdutoDTO extends Partial<CreateProdutoDTO> {
  ativo?: boolean;
}

export interface CreateVendedorDTO {
  codigo: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  user_id?: string;
  comissao_percentual?: number;
  meta_mensal?: number;
}

export interface UpdateVendedorDTO extends Partial<CreateVendedorDTO> {
  ativo?: boolean;
}

export interface CreateTransportadoraDTO {
  codigo: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  email?: string;
  veiculo_placa?: string;
  veiculo_uf?: string;
  veiculo_rntc?: string;
}

export interface UpdateTransportadoraDTO extends Partial<CreateTransportadoraDTO> {
  ativo?: boolean;
}
