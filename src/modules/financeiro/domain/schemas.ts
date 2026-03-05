import { z } from 'zod';

// =====================================================
// Helpers
// =====================================================

const requiredString = (field: string) =>
  z.string({ required_error: `${field} é obrigatório` }).min(1, `${field} é obrigatório`);

const positiveNumber = (field: string) =>
  z.coerce.number({ required_error: `${field} é obrigatório` }).positive(`${field} deve ser maior que zero`);

const optionalPositiveNumber = () =>
  z.coerce.number().min(0).optional().default(0);

const dateString = (field: string) =>
  z.string({ required_error: `${field} é obrigatório` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${field} deve estar no formato YYYY-MM-DD`);

// =====================================================
// Contas a Receber (AR)
// =====================================================

export const arCreateSchema = z.object({
  numero_documento: requiredString('Nº Documento'),
  descricao: requiredString('Descrição'),
  valor_original: positiveNumber('Valor'),
  data_emissao: dateString('Data de emissão'),
  data_vencimento: dateString('Data de vencimento'),
  data_competencia: z.string().optional(),
  cliente_id: z.string().uuid().optional().or(z.literal('')),
  plano_conta_id: z.string().uuid().optional().or(z.literal('')),
  centro_custo_id: z.string().uuid().optional().or(z.literal('')),
  forma_pagamento_id: z.string().uuid().optional().or(z.literal('')),
  parcela: z.coerce.number().min(1).optional().default(1),
  total_parcelas: z.coerce.number().min(1).optional().default(1),
  observacoes: z.string().optional(),
});

export type ARCreateInput = z.infer<typeof arCreateSchema>;

export const arEditSchema = arCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type AREditInput = z.infer<typeof arEditSchema>;

export const arReceiveSchema = z.object({
  conta_receber_id: z.string().uuid(),
  conta_bancaria_id: requiredString('Conta bancária'),
  data_recebimento: dateString('Data de recebimento'),
  valor_recebido: positiveNumber('Valor recebido'),
  valor_juros: optionalPositiveNumber(),
  valor_multa: optionalPositiveNumber(),
  valor_desconto: optionalPositiveNumber(),
  forma_pagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export type ARReceiveInput = z.infer<typeof arReceiveSchema>;

export const arReverseSchema = z.object({
  receipt_id: z.string().uuid(),
  motivo: requiredString('Motivo do estorno'),
});

export type ARReverseInput = z.infer<typeof arReverseSchema>;

// =====================================================
// Contas a Pagar (AP)
// =====================================================

export const apCreateSchema = z.object({
  numero_documento: requiredString('Nº Documento'),
  descricao: requiredString('Descrição'),
  valor_original: positiveNumber('Valor'),
  data_emissao: dateString('Data de emissão'),
  data_vencimento: dateString('Data de vencimento'),
  data_competencia: z.string().optional(),
  fornecedor_id: z.string().uuid().optional().or(z.literal('')),
  plano_conta_id: z.string().uuid().optional().or(z.literal('')),
  centro_custo_id: z.string().uuid().optional().or(z.literal('')),
  forma_pagamento_id: z.string().uuid().optional().or(z.literal('')),
  parcela: z.coerce.number().min(1).optional().default(1),
  total_parcelas: z.coerce.number().min(1).optional().default(1),
  observacoes: z.string().optional(),
});

export type APCreateInput = z.infer<typeof apCreateSchema>;

export const apEditSchema = apCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type APEditInput = z.infer<typeof apEditSchema>;

export const apPaySchema = z.object({
  conta_pagar_id: z.string().uuid(),
  conta_bancaria_id: requiredString('Conta bancária'),
  data_pagamento: dateString('Data de pagamento'),
  valor_pago: positiveNumber('Valor pago'),
  valor_juros: optionalPositiveNumber(),
  valor_multa: optionalPositiveNumber(),
  valor_desconto: optionalPositiveNumber(),
  forma_pagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export type APPayInput = z.infer<typeof apPaySchema>;

export const apReverseSchema = z.object({
  payment_id: z.string().uuid(),
  motivo: requiredString('Motivo do estorno'),
});

export type APReverseInput = z.infer<typeof apReverseSchema>;

// =====================================================
// Contas Bancárias
// =====================================================

export const bankAccountCreateSchema = z.object({
  banco_codigo: requiredString('Código do banco'),
  banco_nome: requiredString('Nome do banco'),
  agencia: requiredString('Agência'),
  agencia_digito: z.string().optional(),
  conta: requiredString('Conta'),
  conta_digito: z.string().optional(),
  tipo: z.enum(['corrente', 'poupanca', 'investimento', 'caixa']).default('corrente'),
  descricao: z.string().optional(),
  saldo_inicial: z.coerce.number().optional().default(0),
  data_saldo_inicial: z.string().optional(),
  filial_id: z.string().uuid().optional().or(z.literal('')),
});

export type BankAccountCreateInput = z.infer<typeof bankAccountCreateSchema>;

export const bankAccountEditSchema = bankAccountCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type BankAccountEditInput = z.infer<typeof bankAccountEditSchema>;

// =====================================================
// Movimentação Manual (Tarifas/Ajustes)
// =====================================================

export const manualMovementSchema = z.object({
  conta_bancaria_id: requiredString('Conta bancária'),
  tipo: z.enum(['credito', 'debito']),
  data_movimento: dateString('Data'),
  valor: positiveNumber('Valor'),
  descricao: requiredString('Descrição'),
  plano_conta_id: z.string().uuid().optional().or(z.literal('')),
  centro_custo_id: z.string().uuid().optional().or(z.literal('')),
  numero_documento: z.string().optional(),
  observacoes: z.string().optional(),
});

export type ManualMovementInput = z.infer<typeof manualMovementSchema>;

// =====================================================
// Plano de Contas
// =====================================================

export const chartAccountCreateSchema = z.object({
  codigo: requiredString('Código'),
  descricao: requiredString('Descrição'),
  tipo: z.enum(['receita', 'despesa', 'ativo', 'passivo', 'patrimonio']),
  natureza: z.enum(['credito', 'debito']),
  conta_pai_id: z.string().uuid().optional().or(z.literal('')),
  sintetica: z.boolean().optional().default(false),
});

export type ChartAccountCreateInput = z.infer<typeof chartAccountCreateSchema>;

export const chartAccountEditSchema = chartAccountCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type ChartAccountEditInput = z.infer<typeof chartAccountEditSchema>;

// =====================================================
// Centro de Custos
// =====================================================

export const costCenterCreateSchema = z.object({
  codigo: requiredString('Código'),
  descricao: requiredString('Descrição'),
  centro_pai_id: z.string().uuid().optional().or(z.literal('')),
});

export type CostCenterCreateInput = z.infer<typeof costCenterCreateSchema>;

export const costCenterEditSchema = costCenterCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type CostCenterEditInput = z.infer<typeof costCenterEditSchema>;

// =====================================================
// Allocation Rules (Rateio)
// =====================================================

export const allocationRuleItemSchema = z.object({
  centro_custo_id: z.string().uuid(),
  percentual: z.coerce.number().min(0).max(100).optional().default(0),
  valor_fixo: z.coerce.number().min(0).optional().default(0),
});

export const allocationRuleCreateSchema = z.object({
  nome: requiredString('Nome'),
  descricao: z.string().optional(),
  tipo: z.enum(['percentual', 'valor_fixo']),
  items: z.array(allocationRuleItemSchema).min(1, 'Adicione pelo menos um centro de custo'),
});

export type AllocationRuleCreateInput = z.infer<typeof allocationRuleCreateSchema>;

// =====================================================
// Conciliação Bancária
// =====================================================

export const reconciliationSessionCreateSchema = z.object({
  conta_bancaria_id: requiredString('Conta bancária'),
  data_inicio: dateString('Data início'),
  data_fim: dateString('Data fim'),
  saldo_extrato_inicial: z.coerce.number().optional().default(0),
  saldo_extrato_final: z.coerce.number().optional().default(0),
  observacoes: z.string().optional(),
});

export type ReconciliationSessionCreateInput = z.infer<typeof reconciliationSessionCreateSchema>;

// =====================================================
// CSV Import
// =====================================================

export const csvImportBankSchema = z.object({
  conta_bancaria_id: requiredString('Conta bancária'),
  data_column: z.string().default('data'),
  descricao_column: z.string().default('descricao'),
  valor_column: z.string().default('valor'),
  tipo_column: z.string().optional(),
  separator: z.string().default(';'),
  date_format: z.string().default('DD/MM/YYYY'),
});

export type CsvImportBankInput = z.infer<typeof csvImportBankSchema>;

// =====================================================
// AR/AP Filters
// =====================================================

export const financeFilterSchema = z.object({
  status: z.string().optional(),
  data_vencimento_inicio: z.string().optional(),
  data_vencimento_fim: z.string().optional(),
  data_emissao_inicio: z.string().optional(),
  data_emissao_fim: z.string().optional(),
  valor_min: z.coerce.number().optional(),
  valor_max: z.coerce.number().optional(),
  search: z.string().optional(),
  cliente_id: z.string().optional(),
  fornecedor_id: z.string().optional(),
  plano_conta_id: z.string().optional(),
  centro_custo_id: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(20),
  sortBy: z.string().optional().default('data_vencimento'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type FinanceFilterInput = z.infer<typeof financeFilterSchema>;

// =====================================================
// Fluxo de Caixa
// =====================================================

export const cashFlowEntrySchema = z.object({
  data: dateString('Data'),
  tipo: z.enum(['receita', 'despesa']),
  categoria: z.string().optional(),
  descricao: z.string().optional(),
  valor_previsto: positiveNumber('Valor previsto'),
  conta_bancaria_id: z.string().uuid().optional().or(z.literal('')),
});

export type CashFlowEntryInput = z.infer<typeof cashFlowEntrySchema>;
