import { z } from 'zod';

// =====================================================
// Helpers
// =====================================================
const req = (f: string) => z.string({ required_error: `${f} é obrigatório` }).min(1, `${f} é obrigatório`);
const posNum = (f: string) => z.coerce.number({ required_error: `${f} é obrigatório` }).positive(`${f} deve ser > 0`);
const optNum = () => z.coerce.number().min(0).optional().default(0);
const optUuid = () => z.string().uuid().optional().or(z.literal(''));
const dateStr = (f: string) => z.string({ required_error: `${f} é obrigatório` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${f}: YYYY-MM-DD`);

// =====================================================
// Warehouse
// =====================================================
export const warehouseCreateSchema = z.object({
  code: req('Código'),
  name: req('Nome'),
  address: z.string().optional(),
  is_default: z.boolean().optional().default(false),
});
export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>;

// =====================================================
// Location
// =====================================================
export const locationCreateSchema = z.object({
  warehouse_id: req('Depósito'),
  parent_id: optUuid(),
  code: req('Código'),
  name: req('Nome'),
  location_type: z.enum(['storage','receiving','shipping','scrap','virtual','production','transit']).default('storage'),
  barcode: z.string().optional(),
  capacity: optNum(),
  capacity_uom: z.string().optional(),
});
export type LocationCreateInput = z.infer<typeof locationCreateSchema>;

// =====================================================
// Inventory Item
// =====================================================
export const itemCreateSchema = z.object({
  sku: req('SKU'),
  name: req('Nome'),
  description: z.string().optional(),
  category: z.string().optional(),
  uom: z.string().optional().default('un'),
  barcode: z.string().optional(),
  weight: optNum(),
  volume: optNum(),
  tracking_type: z.enum(['none','lot','serial']).default('none'),
  has_expiration: z.boolean().optional().default(false),
  costing_method: z.enum(['standard','avco','fifo']).default('standard'),
  standard_cost: optNum(),
  min_qty: optNum(),
  max_qty: optNum(),
  lead_time_days: z.coerce.number().int().min(0).optional().default(0),
});
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;

// =====================================================
// Lot / Serial
// =====================================================
export const lotCreateSchema = z.object({
  item_id: req('Item'),
  lot_number: req('Nº Lote'),
  serial_number: z.string().optional(),
  expiration_date: z.string().optional(),
  manufacture_date: z.string().optional(),
  supplier_lot: z.string().optional(),
  notes: z.string().optional(),
});
export type LotCreateInput = z.infer<typeof lotCreateSchema>;

// =====================================================
// Stock Move (Operation)
// =====================================================
export const stockMoveCreateSchema = z.object({
  move_type: z.enum(['inbound','outbound','internal','adjustment','scrap','return_in','return_out']),
  source_warehouse_id: optUuid(),
  source_location_id: optUuid(),
  dest_warehouse_id: optUuid(),
  dest_location_id: optUuid(),
  scheduled_date: z.string().optional(),
  notes: z.string().optional(),
  reference: z.string().optional(),
});
export type StockMoveCreateInput = z.infer<typeof stockMoveCreateSchema>;

export const stockMoveLineSchema = z.object({
  item_id: req('Item'),
  lot_id: optUuid(),
  source_location_id: optUuid(),
  dest_location_id: optUuid(),
  qty: posNum('Quantidade'),
  uom: z.string().optional().default('un'),
  unit_cost: optNum(),
  notes: z.string().optional(),
});
export type StockMoveLineInput = z.infer<typeof stockMoveLineSchema>;

// =====================================================
// Operation (Transfer Document)
// =====================================================
export const operationCreateSchema = z.object({
  move_type: z.enum(['inbound','outbound','internal']),
  source_warehouse_id: optUuid(),
  dest_warehouse_id: optUuid(),
  source_location_id: optUuid(),
  dest_location_id: optUuid(),
  scheduled_date: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(stockMoveLineSchema).min(1, 'Pelo menos 1 item'),
});
export type OperationCreateInput = z.infer<typeof operationCreateSchema>;

// =====================================================
// Inventory Count
// =====================================================
export const countCreateSchema = z.object({
  warehouse_id: req('Depósito'),
  location_id: optUuid(),
  count_type: z.enum(['full','cycle','spot']).default('full'),
  scheduled_date: z.string().optional(),
  notes: z.string().optional(),
});
export type CountCreateInput = z.infer<typeof countCreateSchema>;

export const countLineEntrySchema = z.object({
  count_line_id: req('Linha'),
  counted_qty: z.coerce.number().min(0, 'Qtd deve ser >= 0'),
  notes: z.string().optional(),
});
export type CountLineEntryInput = z.infer<typeof countLineEntrySchema>;

// =====================================================
// Adjustment
// =====================================================
export const adjustmentCreateSchema = z.object({
  item_id: req('Item'),
  warehouse_id: req('Depósito'),
  location_id: optUuid(),
  lot_id: optUuid(),
  qty: z.coerce.number({ required_error: 'Quantidade é obrigatória' }),
  reason: req('Motivo'),
  notes: z.string().optional(),
});
export type AdjustmentCreateInput = z.infer<typeof adjustmentCreateSchema>;

// =====================================================
// Scrap Order
// =====================================================
export const scrapCreateSchema = z.object({
  item_id: req('Item'),
  warehouse_id: req('Depósito'),
  location_id: optUuid(),
  lot_id: optUuid(),
  qty: posNum('Quantidade'),
  reason: req('Motivo'),
  notes: z.string().optional(),
});
export type ScrapCreateInput = z.infer<typeof scrapCreateSchema>;

// =====================================================
// Reordering Rule
// =====================================================
export const reorderRuleSchema = z.object({
  item_id: req('Item'),
  warehouse_id: req('Depósito'),
  min_qty: z.coerce.number().min(0, 'Min >= 0'),
  max_qty: z.coerce.number().min(0, 'Max >= 0'),
  reorder_qty: optNum(),
  lead_time_days: z.coerce.number().int().min(0).optional().default(0),
});
export type ReorderRuleInput = z.infer<typeof reorderRuleSchema>;

// =====================================================
// Putaway Rule
// =====================================================
export const putawayRuleSchema = z.object({
  warehouse_id: req('Depósito'),
  item_id: optUuid(),
  category: z.string().optional(),
  dest_location_id: req('Local destino'),
  priority: z.coerce.number().int().min(0).optional().default(10),
});
export type PutawayRuleInput = z.infer<typeof putawayRuleSchema>;

// =====================================================
// Route
// =====================================================
export const routeCreateSchema = z.object({
  name: req('Nome'),
  route_type: z.enum(['push','pull']),
});
export type RouteCreateInput = z.infer<typeof routeCreateSchema>;

export const routeRuleSchema = z.object({
  route_id: req('Rota'),
  source_location_id: optUuid(),
  dest_location_id: optUuid(),
  action: z.enum(['move','buy','manufacture']).default('move'),
  auto: z.boolean().optional().default(false),
  priority: z.coerce.number().int().min(0).optional().default(10),
});
export type RouteRuleInput = z.infer<typeof routeRuleSchema>;

// =====================================================
// Valuation Config
// =====================================================
export const valuationConfigSchema = z.object({
  item_id: optUuid(),
  category: z.string().optional(),
  costing_method: z.enum(['standard','avco','fifo']).default('standard'),
  valuation_mode: z.enum(['manual','automated']).default('manual'),
});
export type ValuationConfigInput = z.infer<typeof valuationConfigSchema>;

// =====================================================
// Filter schemas
// =====================================================
export const stockFilterSchema = z.object({
  search: z.string().optional(),
  warehouse_id: z.string().optional(),
  location_id: z.string().optional(),
  category: z.string().optional(),
  tracking_type: z.string().optional(),
  below_min: z.boolean().optional(),
  lot_id: z.string().optional(),
  has_expiration: z.boolean().optional(),
});
export type StockFilterInput = z.infer<typeof stockFilterSchema>;

export const moveFilterSchema = z.object({
  search: z.string().optional(),
  move_type: z.string().optional(),
  status: z.string().optional(),
  warehouse_id: z.string().optional(),
  item_id: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});
export type MoveFilterInput = z.infer<typeof moveFilterSchema>;
