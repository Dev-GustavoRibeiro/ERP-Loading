// =====================================================
// Estoque Domain Types
// =====================================================

// Almoxarifado/Depósito
export interface Almoxarifado {
  id: string;
  empresa_id: string;
  filial_id?: string;
  codigo: string;
  descricao: string;
  endereco?: string;
  responsavel_id?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAlmoxarifadoDTO {
  codigo: string;
  descricao: string;
  endereco?: string;
  responsavel_id?: string;
  filial_id?: string;
}

export interface UpdateAlmoxarifadoDTO extends Partial<CreateAlmoxarifadoDTO> {
  ativo?: boolean;
}

// Movimentação de Estoque
export interface MovimentacaoEstoque {
  id: string;
  empresa_id: string;
  filial_id?: string;
  almoxarifado_id?: string;
  produto_id: string;
  tipo: 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'inventario' | 'devolucao';
  documento_tipo?: string;
  documento_id?: string;
  documento_numero?: string;
  quantidade: number;
  custo_unitario?: number;
  custo_total?: number;
  lote?: string;
  data_validade?: string;
  observacao?: string;
  user_id?: string;
  created_at: string;
  // Relacionamentos  
  produto?: {
    id: string;
    codigo: string;
    descricao: string;
  };
  almoxarifado?: Almoxarifado;
}

export interface CreateMovimentacaoDTO {
  almoxarifado_id?: string;
  produto_id: string;
  tipo: 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'inventario' | 'devolucao';
  documento_tipo?: string;
  documento_id?: string;
  documento_numero?: string;
  quantidade: number;
  custo_unitario?: number;
  lote?: string;
  data_validade?: string;
  observacao?: string;
}

// Saldo de Estoque
export interface SaldoEstoque {
  id: string;
  empresa_id: string;
  almoxarifado_id: string;
  produto_id: string;
  quantidade: number;
  custo_medio: number;
  custo_ultima_entrada: number;
  data_ultima_entrada?: string;
  data_ultima_saida?: string;
  updated_at: string;
  // Relacionamentos
  produto?: {
    id: string;
    codigo: string;
    descricao: string;
  };
  almoxarifado?: Almoxarifado;
}

// Inventário
export interface Inventario {
  id: string;
  empresa_id: string;
  filial_id?: string;
  almoxarifado_id?: string;
  numero: string;
  data_abertura: string;
  data_fechamento?: string;
  status: 'aberto' | 'em_contagem' | 'conferencia' | 'ajustado' | 'finalizado' | 'cancelado';
  tipo: 'completo' | 'rotativo' | 'por_categoria';
  responsavel_id?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  almoxarifado?: Almoxarifado;
  itens?: InventarioItem[];
}

export interface CreateInventarioDTO {
  numero: string;
  almoxarifado_id?: string;
  filial_id?: string;
  tipo?: 'completo' | 'rotativo' | 'por_categoria';
  observacao?: string;
}

export interface UpdateInventarioDTO extends Partial<CreateInventarioDTO> {
  status?: 'aberto' | 'em_contagem' | 'conferencia' | 'ajustado' | 'finalizado' | 'cancelado';
  data_fechamento?: string;
}

// Item do Inventário
export interface InventarioItem {
  id: string;
  inventario_id: string;
  produto_id: string;
  quantidade_sistema: number;
  quantidade_contada?: number;
  quantidade_diferenca: number;
  custo_unitario?: number;
  valor_diferenca: number;
  contado_por?: string;
  contado_em?: string;
  conferido_por?: string;
  conferido_em?: string;
  ajustado: boolean;
  observacao?: string;
  // Relacionamentos
  produto?: {
    id: string;
    codigo: string;
    descricao: string;
  };
}

export interface UpdateInventarioItemDTO {
  quantidade_contada: number;
  observacao?: string;
}

// =====================================================
// Tipos de Filtros e Parâmetros
// =====================================================

export interface MovimentacaoFilters {
  tipo?: string;
  produto_id?: string;
  almoxarifado_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface SaldoFilters {
  almoxarifado_id?: string;
  estoque_baixo?: boolean;
  estoque_zerado?: boolean;
}
