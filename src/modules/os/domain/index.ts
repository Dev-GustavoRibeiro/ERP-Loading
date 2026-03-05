// =====================================================
// Ordem de Serviço Domain Types
// =====================================================

export interface OrdemServico {
  id: string;
  empresa_id: string;
  filial_id?: string;
  numero?: string;
  // Cliente e Contato
  cliente_id?: string;
  contato_nome?: string;
  contato_telefone?: string;
  // Tipo e Prioridade
  tipo: 'manutencao' | 'instalacao' | 'reparo' | 'assistencia' | 'outros';
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  // Equipamento/Veículo
  equipamento_tipo?: string;
  equipamento_marca?: string;
  equipamento_modelo?: string;
  equipamento_serie?: string;
  equipamento_placa?: string;
  equipamento_km?: number;
  // Descrição
  descricao_problema?: string;
  descricao_servico?: string;
  diagnostico?: string;
  solucao?: string;
  observacao_interna?: string;
  // Responsáveis
  tecnico_id?: string;
  vendedor_id?: string;
  // Datas
  data_abertura: string;
  data_previsao?: string;
  data_inicio?: string;
  data_conclusao?: string;
  data_entrega?: string;
  // Valores
  valor_servicos: number;
  valor_pecas: number;
  valor_desconto: number;
  valor_total: number;
  // Status
  status: 'aberta' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada' | 'entregue';
  garantia_meses: number;
  created_at?: string;
  updated_at?: string;
  // Relacionamentos
  cliente?: {
    id: string;
    nome: string;
    telefone?: string;
  };
  tecnico?: {
    id: string;
    nome: string;
  };
  servicos?: OSServico[];
  pecas?: OSPeca[];
}

export interface OSServico {
  id: string;
  empresa_id: string;
  os_id: string;
  servico_id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_desconto: number;
  valor_total: number;
  tecnico_id?: string;
  data_execucao?: string;
  observacao?: string;
  created_at?: string;
}

export interface OSPeca {
  id: string;
  empresa_id: string;
  os_id: string;
  produto_id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_desconto: number;
  valor_total: number;
  created_at?: string;
}

export interface OSApontamento {
  id: string;
  empresa_id: string;
  os_id: string;
  tecnico_id: string;
  data_inicio: string;
  data_fim?: string;
  duracao_minutos?: number;
  descricao?: string;
  created_at?: string;
  tecnico?: {
    id: string;
    nome: string;
  };
}

export interface OSHistorico {
  id: string;
  os_id: string;
  status_anterior?: string;
  status_novo: string;
  observacao?: string;
  usuario_id?: string;
  created_at?: string;
}

// =====================================================
// DTOs
// =====================================================

export interface CreateOrdemServicoDTO {
  cliente_id?: string;
  contato_nome?: string;
  contato_telefone?: string;
  tipo?: 'manutencao' | 'instalacao' | 'reparo' | 'assistencia' | 'outros';
  prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';
  equipamento_tipo?: string;
  equipamento_marca?: string;
  equipamento_modelo?: string;
  equipamento_serie?: string;
  equipamento_placa?: string;
  equipamento_km?: number;
  descricao_problema?: string;
  tecnico_id?: string;
  data_previsao?: string;
  filial_id?: string;
}

export interface UpdateOrdemServicoDTO extends Partial<CreateOrdemServicoDTO> {
  descricao_servico?: string;
  diagnostico?: string;
  solucao?: string;
  observacao_interna?: string;
  garantia_meses?: number;
}

export interface AddServicoDTO {
  servico_id?: string;
  descricao: string;
  quantidade?: number;
  valor_unitario: number;
  valor_desconto?: number;
  tecnico_id?: string;
}

export interface AddPecaDTO {
  produto_id?: string;
  descricao: string;
  quantidade?: number;
  valor_unitario: number;
  valor_desconto?: number;
}

export interface IniciarApontamentoDTO {
  tecnico_id: string;
  descricao?: string;
}

// =====================================================
// Serviços (Cadastro)
// =====================================================

export interface Servico {
  id: string;
  empresa_id: string;
  codigo?: string;
  descricao: string;
  categoria?: string;
  unidade: string;
  preco_venda: number;
  comissao_percentual: number;
  tempo_estimado_minutos?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateServicoDTO {
  codigo?: string;
  descricao: string;
  categoria?: string;
  unidade?: string;
  preco_venda?: number;
  comissao_percentual?: number;
  tempo_estimado_minutos?: number;
}
