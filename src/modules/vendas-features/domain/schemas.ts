import { z } from 'zod';

// =====================================================
// Helpers
// =====================================================
const req = (f: string) => z.string({ required_error: `${f} é obrigatório` }).min(1, `${f} é obrigatório`);
const posNum = (f: string) => z.coerce.number({ required_error: `${f} é obrigatório` }).positive(`${f} deve ser > 0`);
const nnNum = () => z.coerce.number().min(0).default(0);

// =====================================================
// COUPONS
// =====================================================
export const couponCreateSchema = z.object({
  code: req('Código').max(50).transform(v => v.toUpperCase().trim()),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed'], { required_error: 'Tipo é obrigatório' }),
  discount_value: posNum('Valor do desconto'),
  max_discount: z.coerce.number().positive().optional().nullable(),
  min_cart_total: nnNum(),
  max_uses_total: z.coerce.number().int().positive().optional().nullable(),
  max_uses_per_customer: z.coerce.number().int().positive().optional().nullable(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});
export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

export const couponUpdateSchema = couponCreateSchema.partial();
export type CouponUpdateInput = z.infer<typeof couponUpdateSchema>;

export const applyCouponSchema = z.object({
  code: req('Código do cupom').transform(v => v.toUpperCase().trim()),
});
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

// =====================================================
// RETURNS
// =====================================================
export const returnCreateSchema = z.object({
  sale_id: req('Venda'),
  sale_type: z.enum(['pdv', 'pedido']).default('pdv'),
  sale_number: z.string().optional(),
  return_type: z.enum(['refund', 'exchange', 'store_credit'], { required_error: 'Tipo é obrigatório' }),
  reason: req('Motivo'),
  notes: z.string().optional(),
  customer_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().optional(),
  items: z.array(z.object({
    sale_item_id: z.string().uuid().optional(),
    produto_id: z.string().uuid().optional(),
    descricao: req('Descrição'),
    qty_sold: posNum('Qtd vendida'),
    qty_returned: posNum('Qtd devolvida'),
    unit_price: z.coerce.number().min(0),
    restock_flag: z.boolean().default(false),
  })).min(1, 'Selecione pelo menos um item'),
});
export type ReturnCreateInput = z.infer<typeof returnCreateSchema>;

// =====================================================
// COMMISSIONS
// =====================================================
export const commissionRuleCreateSchema = z.object({
  name: req('Nome'),
  description: z.string().optional(),
  seller_id: z.string().uuid().optional().nullable().or(z.literal('')),
  category_id: z.string().uuid().optional().nullable().or(z.literal('')),
  product_id: z.string().uuid().optional().nullable().or(z.literal('')),
  channel: z.enum(['all', 'pdv', 'pedido']).default('all'),
  commission_type: z.enum(['pct_subtotal', 'pct_total', 'fixed_per_item'], { required_error: 'Tipo é obrigatório' }),
  commission_value: posNum('Valor da comissão'),
  priority: z.coerce.number().int().default(0),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});
export type CommissionRuleCreateInput = z.infer<typeof commissionRuleCreateSchema>;

export const commissionRuleUpdateSchema = commissionRuleCreateSchema.partial();
export type CommissionRuleUpdateInput = z.infer<typeof commissionRuleUpdateSchema>;

// =====================================================
// GAMIFICATION - MISSIONS
// =====================================================
export const missionCreateSchema = z.object({
  name: req('Nome'),
  description: z.string().optional(),
  mission_type: z.enum(['sales_count', 'sales_value', 'avg_ticket', 'items_sold', 'no_cancellations', 'no_returns', 'streak'], {
    required_error: 'Tipo é obrigatório',
  }),
  period: z.enum(['daily', 'weekly', 'monthly'], { required_error: 'Período é obrigatório' }),
  target_value: posNum('Meta'),
  xp_reward: z.coerce.number().int().positive('XP deve ser > 0').default(10),
  icon: z.string().optional(),
  is_active: z.boolean().default(true),
});
export type MissionCreateInput = z.infer<typeof missionCreateSchema>;

export const missionUpdateSchema = missionCreateSchema.partial();
export type MissionUpdateInput = z.infer<typeof missionUpdateSchema>;

// =====================================================
// GAMIFICATION - BADGES
// =====================================================
export const badgeCreateSchema = z.object({
  name: req('Nome'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().default('amber'),
  criteria_type: z.enum(['first_sale', 'streak_days', 'top_weekly', 'top_monthly', 'no_returns', 'sales_milestone', 'xp_milestone', 'custom'], {
    required_error: 'Critério é obrigatório',
  }),
  criteria_value: z.coerce.number().optional().nullable(),
  is_active: z.boolean().default(true),
});
export type BadgeCreateInput = z.infer<typeof badgeCreateSchema>;

// =====================================================
// FILTER SCHEMAS
// =====================================================
export const couponFilterSchema = z.object({
  search: z.string().optional(),
  is_active: z.enum(['all', 'true', 'false']).optional(),
  discount_type: z.enum(['all', 'percentage', 'fixed']).optional(),
});
export type CouponFilterInput = z.infer<typeof couponFilterSchema>;

export const returnFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'pending', 'approved', 'completed', 'cancelled']).optional(),
  return_type: z.enum(['all', 'refund', 'exchange', 'store_credit']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});
export type ReturnFilterInput = z.infer<typeof returnFilterSchema>;

export const commissionFilterSchema = z.object({
  seller_id: z.string().optional(),
  period_key: z.string().optional(),
  status: z.enum(['all', 'forecast', 'eligible', 'paid', 'reversed']).optional(),
});
export type CommissionFilterInput = z.infer<typeof commissionFilterSchema>;
