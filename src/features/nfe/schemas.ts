import { z } from 'zod';

// =====================================================
// NF-e Schemas (Zod Validation)
// =====================================================

// --- Filter Schema ---
export const filterNfeSchema = z.object({
  status: z.enum(['digitacao', 'validada', 'autorizada', 'cancelada', 'denegada', 'inutilizada', '']).optional(),
  tipo: z.enum(['nfe', 'nfce', '']).optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  search: z.string().optional(),
});

export type FilterNfeValues = z.infer<typeof filterNfeSchema>;

// --- Create NF-e Item Schema ---
export const createNfeItemSchema = z.object({
  produto_id: z.string().uuid().optional(),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  ncm: z.string().optional(),
  cfop: z.string().min(1, 'CFOP obrigatório'),
  unidade: z.string().min(1, 'Unidade obrigatória'),
  quantidade: z.number().positive('Quantidade deve ser maior que 0'),
  valor_unitario: z.number().positive('Valor unitário deve ser maior que 0'),
  cst_icms: z.string().optional(),
  aliquota_icms: z.number().min(0).max(100).optional(),
  aliquota_ipi: z.number().min(0).max(100).optional(),
  cst_pis: z.string().optional(),
  aliquota_pis: z.number().min(0).max(100).optional(),
  cst_cofins: z.string().optional(),
  aliquota_cofins: z.number().min(0).max(100).optional(),
});

export type CreateNfeItemValues = z.infer<typeof createNfeItemSchema>;

// --- Create NF-e Schema ---
export const createNfeSchema = z.object({
  modelo: z.enum(['55', '65'], { error: 'Selecione o modelo' }),
  serie: z.string().default('1'),
  natureza_operacao: z.string().min(1, 'Natureza da operação obrigatória'),
  tipo_operacao: z.enum(['entrada', 'saida'], { error: 'Tipo obrigatório' }),
  finalidade: z.enum(['normal', 'complementar', 'ajuste', 'devolucao']).default('normal'),
  destinatario_id: z.string().uuid('Destinatário obrigatório').optional(),
  transportadora_id: z.string().uuid().optional(),
  pedido_venda_id: z.string().uuid().optional(),
  informacoes_complementares: z.string().optional(),
  itens: z.array(createNfeItemSchema).min(1, 'Adicione pelo menos um item'),
});

export type CreateNfeValues = z.infer<typeof createNfeSchema>;

// --- Cancel NF-e Schema ---
export const cancelNfeSchema = z.object({
  justificativa: z.string().min(15, 'Justificativa deve ter no mínimo 15 caracteres'),
});

export type CancelNfeValues = z.infer<typeof cancelNfeSchema>;

// --- Carta de Correção Schema ---
export const cartaCorrecaoSchema = z.object({
  correcao: z.string().min(15, 'Correção deve ter no mínimo 15 caracteres'),
});

export type CartaCorrecaoValues = z.infer<typeof cartaCorrecaoSchema>;

// --- Inutilização Schema ---
export const inutilizacaoSchema = z.object({
  modelo: z.enum(['55', '65'], { error: 'Selecione o modelo' }),
  serie: z.string().min(1, 'Série obrigatória'),
  numero_inicial: z.number().int().positive('Número inicial deve ser positivo'),
  numero_final: z.number().int().positive('Número final deve ser positivo'),
  justificativa: z.string().min(15, 'Justificativa deve ter no mínimo 15 caracteres'),
}).refine(
  (data) => data.numero_final >= data.numero_inicial,
  { message: 'Número final deve ser maior ou igual ao número inicial', path: ['numero_final'] }
);

export type InutilizacaoValues = z.infer<typeof inutilizacaoSchema>;

// --- Status labels & colors ---
export const NF_STATUS_CONFIG = {
  digitacao: { label: 'Digitação', color: 'bg-gray-500/20 text-gray-400', icon: 'pencil' },
  validada: { label: 'Validada', color: 'bg-blue-500/20 text-blue-400', icon: 'check' },
  autorizada: { label: 'Autorizada', color: 'bg-emerald-500/20 text-emerald-400', icon: 'check-circle' },
  cancelada: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400', icon: 'x-circle' },
  denegada: { label: 'Denegada', color: 'bg-orange-500/20 text-orange-400', icon: 'alert-triangle' },
  inutilizada: { label: 'Inutilizada', color: 'bg-yellow-500/20 text-yellow-400', icon: 'slash' },
} as const;

export type NfStatus = keyof typeof NF_STATUS_CONFIG;
