import { z } from 'zod';

const req = (field: string) => z.string().min(1, `${field} é obrigatório`);

// =====================================================
// Leads
// =====================================================

export const leadCreateSchema = z.object({
  nome: req('Nome'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional().or(z.literal('')),
  empresa: z.string().optional().or(z.literal('')),
  cargo: z.string().optional().or(z.literal('')),
  origem: z.string().default('manual'),
  valor_estimado: z.number().min(0).default(0),
  owner_id: z.string().optional().or(z.literal('')),
  observacoes: z.string().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial().extend({
  status: z.enum(['novo', 'contatado', 'qualificado', 'desqualificado', 'convertido']).optional(),
});

export const leadConvertSchema = z.object({
  lead_id: req('Lead'),
  pipeline_id: req('Pipeline'),
  stage_id: req('Estágio'),
  opportunity_title: req('Título da oportunidade'),
  opportunity_value: z.number().min(0).default(0),
  opportunity_probability: z.number().min(0).max(100).default(0),
  expected_close_date: z.string().optional().or(z.literal('')),
});

export const leadFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  origem: z.string().optional(),
  owner_id: z.string().optional(),
  has_activity: z.enum(['all', 'with', 'without']).optional(),
  has_owner: z.enum(['all', 'with', 'without']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

// =====================================================
// Opportunities
// =====================================================

export const opportunityCreateSchema = z.object({
  title: req('Título'),
  pipeline_id: req('Pipeline'),
  stage_id: req('Estágio'),
  value: z.number().min(0).default(0),
  probability: z.number().min(0).max(100).default(0),
  expected_close_date: z.string().optional().or(z.literal('')),
  origin: z.string().optional().or(z.literal('')),
  owner_id: z.string().optional().or(z.literal('')),
  lead_id: z.string().optional().or(z.literal('')),
  cliente_id: z.string().optional().or(z.literal('')),
  contact_name: z.string().optional().or(z.literal('')),
  contact_email: z.string().optional().or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
  observacoes: z.string().optional().or(z.literal('')),
});

export const opportunityUpdateSchema = opportunityCreateSchema.partial();

export const opportunityWinSchema = z.object({
  won_notes: z.string().optional().or(z.literal('')),
  actual_close_date: z.string().optional(),
});

export const opportunityLoseSchema = z.object({
  loss_reason_id: req('Motivo de perda'),
  loss_notes: z.string().optional().or(z.literal('')),
  actual_close_date: z.string().optional(),
});

// =====================================================
// Activities
// =====================================================

export const activityCreateSchema = z.object({
  type: z.enum(['task', 'call', 'meeting', 'note']),
  title: req('Título'),
  description: z.string().optional().or(z.literal('')),
  due_at: z.string().optional().or(z.literal('')),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  owner_id: z.string().optional().or(z.literal('')),
  lead_id: z.string().optional().or(z.literal('')),
  opportunity_id: z.string().optional().or(z.literal('')),
});

export const activityUpdateSchema = activityCreateSchema.partial();

// =====================================================
// Pipelines & Stages (Settings)
// =====================================================

export const pipelineCreateSchema = z.object({
  name: req('Nome'),
  description: z.string().optional().or(z.literal('')),
  is_default: z.boolean().default(false),
});

export const stageCreateSchema = z.object({
  pipeline_id: req('Pipeline'),
  name: req('Nome'),
  sort_order: z.number().int().min(0).default(0),
  probability_default: z.number().int().min(0).max(100).default(0),
  color: z.string().default('blue'),
  is_won: z.boolean().default(false),
  is_lost: z.boolean().default(false),
});

export const stageUpdateSchema = stageCreateSchema.partial();

export const lossReasonCreateSchema = z.object({
  name: req('Nome'),
  sort_order: z.number().int().default(0),
});

export const automationCreateSchema = z.object({
  stage_id: req('Estágio'),
  action_type: z.enum(['create_task', 'notify_owner']),
  task_title: z.string().optional().or(z.literal('')),
  task_description: z.string().optional().or(z.literal('')),
  task_due_days: z.number().int().min(0).default(1),
  is_active: z.boolean().default(true),
});

// =====================================================
// Tags
// =====================================================

export const tagCreateSchema = z.object({
  name: req('Nome'),
  color: z.string().default('blue'),
});

// =====================================================
// Type exports
// =====================================================

export type LeadCreate = z.infer<typeof leadCreateSchema>;
export type LeadUpdate = z.infer<typeof leadUpdateSchema>;
export type LeadConvert = z.infer<typeof leadConvertSchema>;
export type LeadFilter = z.infer<typeof leadFilterSchema>;
export type OpportunityCreate = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdate = z.infer<typeof opportunityUpdateSchema>;
export type OpportunityWin = z.infer<typeof opportunityWinSchema>;
export type OpportunityLose = z.infer<typeof opportunityLoseSchema>;
export type ActivityCreate = z.infer<typeof activityCreateSchema>;
export type ActivityUpdate = z.infer<typeof activityUpdateSchema>;
export type PipelineCreate = z.infer<typeof pipelineCreateSchema>;
export type StageCreate = z.infer<typeof stageCreateSchema>;
export type StageUpdate = z.infer<typeof stageUpdateSchema>;
export type LossReasonCreate = z.infer<typeof lossReasonCreateSchema>;
export type AutomationCreate = z.infer<typeof automationCreateSchema>;
export type TagCreate = z.infer<typeof tagCreateSchema>;
