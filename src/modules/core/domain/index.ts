// =====================================================
// ERP Core Domain Types
// =====================================================

// Empresa (Company)
export interface Empresa {
  id: string;
  codigo: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;

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
  website?: string;

  // Configurações
  regime_tributario: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei';
  ativo: boolean;
  logo_url?: string;
  configuracoes?: Record<string, unknown>;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Filial (Branch)
export interface Filial {
  id: string;
  empresa_id: string;
  codigo: string;
  nome: string;
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
  codigo_ibge?: string;

  // Contato
  telefone?: string;
  email?: string;

  // Configurações
  matriz: boolean;
  ativo: boolean;
  configuracoes?: Record<string, unknown>;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Configuração de Empresa
export interface EmpresaConfiguracao {
  id: string;
  empresa_id: string;
  categoria: string;
  chave: string;
  valor?: string;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  descricao?: string;
  created_at: string;
  updated_at: string;
}

// Módulo do Sistema
export interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  icone?: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

// Ações do Módulo
export interface ModuloAcao {
  id: string;
  modulo_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
}

// Perfil de Acesso
export interface PerfilAcesso {
  id: string;
  empresa_id?: string;
  codigo: string;
  nome: string;
  descricao?: string;
  nivel: number; // 1=operador, 2=supervisor, 3=gerente, 4=admin, 5=super_admin
  sistema: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Permissão do Perfil
export interface PerfilPermissao {
  id: string;
  perfil_id: string;
  modulo_id: string;
  acao_id: string;
  permitido: boolean;
  created_at: string;
}

// Vínculo Usuário-Empresa
export interface UsuarioEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  filial_id?: string;
  perfil_id: string;
  padrao: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;

  // Relations (optional)
  empresa?: Empresa;
  filial?: Filial;
  perfil?: PerfilAcesso;
}

// Log de Auditoria
export interface AuditLog {
  id: string;
  user_id?: string;
  empresa_id?: string;
  tabela: string;
  registro_id: string;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  dados_antes?: Record<string, unknown>;
  dados_depois?: Record<string, unknown>;
  campos_alterados?: string[];
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// =====================================================
// DTOs (Data Transfer Objects)
// =====================================================

export interface CreateEmpresaDTO {
  codigo: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
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
  website?: string;
  regime_tributario?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei';
  logo_url?: string;
}

export interface UpdateEmpresaDTO extends Partial<CreateEmpresaDTO> {
  ativo?: boolean;
}

export interface CreateFilialDTO {
  empresa_id: string;
  codigo: string;
  nome: string;
  cnpj?: string;
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
  matriz?: boolean;
}

export interface UpdateFilialDTO extends Partial<Omit<CreateFilialDTO, 'empresa_id'>> {
  ativo?: boolean;
}

// =====================================================
// Context Types
// =====================================================

export interface EmpresaContextType {
  empresaAtual: Empresa | null;
  filialAtual: Filial | null;
  empresas: Empresa[];
  filiais: Filial[];
  loading: boolean;
  error: string | null;
  setEmpresaAtual: (empresa: Empresa | null) => void;
  setFilialAtual: (filial: Filial | null) => void;
  refreshEmpresas: () => Promise<void>;
}

export interface PermissaoContextType {
  permissoes: Map<string, Set<string>>; // modulo -> Set<acao>
  perfil: PerfilAcesso | null;
  loading: boolean;
  hasPermission: (modulo: string, acao: string) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

// =====================================================
// API Response Types
// =====================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}
