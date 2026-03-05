import { z } from 'zod';

export const HrEmployeeSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  cargo_id: z.string().uuid('Selecione um cargo'),
  departamento_id: z.string().uuid('Selecione um departamento'),
  manager_id: z.string().uuid().optional().nullable(),
  data_admissao: z.string().min(1, 'Data de admissão obrigatória'), // YYYY-MM-DD
  ativo: z.boolean().default(true),
});

export type HrEmployeeFormData = z.infer<typeof HrEmployeeSchema>;

export const HrRoleSchema = z.object({
  title: z.string().min(2, 'Título obrigatório'),
  level: z.string().min(1, 'Nível obrigatório'), // Jr, Pl, Sr, etc
  description: z.string().optional(),
});

export type HrRoleFormData = z.infer<typeof HrRoleSchema>;

export const HrTeamSchema = z.object({
  name: z.string().min(2, 'Nome do departamento obrigatório'),
  manager_id: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
});

export type HrTeamFormData = z.infer<typeof HrTeamSchema>;
