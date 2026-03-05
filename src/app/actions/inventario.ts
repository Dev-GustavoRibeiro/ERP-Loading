'use server';

import { getTenantClient } from '@/shared/lib/supabase/tenant.server';

function getClient() { return getTenantClient('default'); }

// =====================================================
// Types
// =====================================================
interface ActionResult<T = unknown> { data?: T; error?: string; message?: string; }
interface PaginatedResult<T = unknown> { data: T[]; total: number; }
interface ListParams {
  page?: number; pageSize?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

// =====================================================
// Audit Log Helper
// =====================================================
async function writeInvAudit(
  empresaId: string, entityType: string, entityId: string,
  action: string, changes?: Record<string, unknown>, metadata?: Record<string, unknown>
) {
  const supabase = getClient();
  await supabase.from('inv_audit_logs').insert({
    empresa_id: empresaId, entity_type: entityType, entity_id: entityId,
    action, changes, metadata,
  });
}

// Clean empty UUID strings
function cleanUuid(val: unknown): string | null {
  if (!val || val === '') return null;
  return val as string;
}

// =====================================================
// WAREHOUSES
// =====================================================
export async function listWarehouses(empresaId: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data } = await supabase.from('inv_warehouses')
    .select('*').eq('empresa_id', empresaId).order('name');
  return data || [];
}

export async function createWarehouse(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_warehouses')
    .insert({ ...dto, empresa_id: empresaId }).select().single();
  if (error) return { error: error.message };
  await writeInvAudit(empresaId, 'inv_warehouses', data.id, 'create', { after: data });
  // Create default locations
  const locs = [
    { code: 'RECV', name: 'Recebimento', location_type: 'receiving' },
    { code: 'SHIP', name: 'Expedição', location_type: 'shipping' },
    { code: 'STOCK', name: 'Estoque Geral', location_type: 'storage' },
    { code: 'SCRAP', name: 'Sucata', location_type: 'scrap' },
  ];
  for (const l of locs) {
    await supabase.from('inv_locations').insert({ ...l, empresa_id: empresaId, warehouse_id: data.id });
  }
  return { data, message: 'Depósito criado com sucesso' };
}

export async function updateWarehouse(id: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data: before } = await supabase.from('inv_warehouses').select('*').eq('id', id).single();
  const { data, error } = await supabase.from('inv_warehouses')
    .update(dto).eq('id', id).select().single();
  if (error) return { error: error.message };
  if (before) await writeInvAudit(before.empresa_id, 'inv_warehouses', id, 'update', { before, after: data });
  return { data, message: 'Depósito atualizado' };
}

export async function deleteWarehouse(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: wh } = await supabase.from('inv_warehouses').select('empresa_id').eq('id', id).single();
  const { count } = await supabase.from('inv_stock_moves').select('id', { count: 'exact', head: true })
    .or(`source_warehouse_id.eq.${id},dest_warehouse_id.eq.${id}`);
  if ((count || 0) > 0) return { error: 'Depósito possui movimentações. Desative-o ao invés de excluir.' };
  const { error } = await supabase.from('inv_warehouses').delete().eq('id', id);
  if (error) return { error: error.message };
  if (wh) await writeInvAudit(wh.empresa_id, 'inv_warehouses', id, 'delete');
  return { message: 'Depósito excluído' };
}

// =====================================================
// LOCATIONS
// =====================================================
export async function listLocations(empresaId: string, warehouseId?: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  let q = supabase.from('inv_locations').select('*').eq('empresa_id', empresaId).order('code');
  if (warehouseId) q = q.eq('warehouse_id', warehouseId);
  const { data } = await q;
  return data || [];
}

export async function createLocation(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const cleaned = { ...dto, empresa_id: empresaId, parent_id: cleanUuid(dto.parent_id) };
  const { data, error } = await supabase.from('inv_locations').insert(cleaned).select().single();
  if (error) return { error: error.message };
  await writeInvAudit(empresaId, 'inv_locations', data.id, 'create', { after: data });
  return { data, message: 'Localização criada' };
}

export async function updateLocation(id: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_locations').update({ ...dto, parent_id: cleanUuid(dto.parent_id) }).eq('id', id).select().single();
  if (error) return { error: error.message };
  return { data, message: 'Localização atualizada' };
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { count } = await supabase.from('inv_balances').select('id', { count: 'exact', head: true }).eq('location_id', id).gt('on_hand', 0);
  if ((count || 0) > 0) return { error: 'Localização possui estoque. Mova os itens antes de excluir.' };
  const { error } = await supabase.from('inv_locations').delete().eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Localização excluída' };
}

// =====================================================
// INVENTORY ITEMS
// =====================================================
export async function listItems(empresaId: string, params?: ListParams): Promise<PaginatedResult> {
  const supabase = getClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const from = (page - 1) * pageSize;
  let q = supabase.from('inv_items').select('*', { count: 'exact' }).eq('empresa_id', empresaId);
  if (params?.search) q = q.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%,barcode.ilike.%${params.search}%`);
  if (params?.category) q = q.eq('category', params.category);
  if (params?.tracking_type) q = q.eq('tracking_type', params.tracking_type);
  q = q.order(params?.sortBy || 'name', { ascending: (params?.sortOrder || 'asc') === 'asc' })
    .range(from, from + pageSize - 1);
  const { data, count } = await q;
  return { data: data || [], total: count || 0 };
}

export async function getItem(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_items').select('*').eq('id', id).single();
  if (error) return { error: error.message };
  return { data };
}

export async function createItem(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_items').insert({ ...dto, empresa_id: empresaId }).select().single();
  if (error) return { error: error.message };
  await writeInvAudit(empresaId, 'inv_items', data.id, 'create', { after: data });
  return { data, message: 'Item criado' };
}

export async function updateItem(id: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_items').update(dto).eq('id', id).select().single();
  if (error) return { error: error.message };
  return { data, message: 'Item atualizado' };
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { count } = await supabase.from('inv_balances').select('id', { count: 'exact', head: true }).eq('item_id', id).gt('on_hand', 0);
  if ((count || 0) > 0) return { error: 'Item possui estoque. Ajuste para zero antes de excluir.' };
  const { error } = await supabase.from('inv_items').delete().eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Item excluído' };
}

// =====================================================
// LOTS
// =====================================================
export async function listLots(empresaId: string, itemId?: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  let q = supabase.from('inv_lots').select('*, item:inv_items(name, sku)').eq('empresa_id', empresaId).order('lot_number');
  if (itemId) q = q.eq('item_id', itemId);
  const { data } = await q;
  return data || [];
}

export async function createLot(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_lots').insert({ ...dto, empresa_id: empresaId }).select().single();
  if (error) return { error: error.message };
  return { data, message: 'Lote criado' };
}

// =====================================================
// INVENTORY BALANCES (Stock)
// =====================================================
export async function listBalances(empresaId: string, params?: ListParams): Promise<PaginatedResult> {
  const supabase = getClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const from = (page - 1) * pageSize;

  let q = supabase.from('inv_balances')
    .select('*, item:inv_items(name, sku, category, uom, barcode, tracking_type, min_qty, max_qty), warehouse:inv_warehouses(name, code), location:inv_locations(name, code), lot:inv_lots(lot_number, serial_number, expiration_date)', { count: 'exact' })
    .eq('empresa_id', empresaId);

  if (params?.warehouse_id) q = q.eq('warehouse_id', params.warehouse_id);
  if (params?.location_id) q = q.eq('location_id', params.location_id);
  if (params?.item_id) q = q.eq('item_id', params.item_id);
  if (params?.lot_id) q = q.eq('lot_id', params.lot_id);
  if (params?.search) {
    // Search via item name/sku requires a join filter approach
    // For simplicity, we filter client-side or use a view
  }

  q = q.order('updated_at', { ascending: false }).range(from, from + pageSize - 1);
  const { data, count } = await q;
  return { data: data || [], total: count || 0 };
}

export async function getStockSummary(empresaId: string) {
  const supabase = getClient();
  const { data: balances } = await supabase.from('inv_balances')
    .select('on_hand, reserved, incoming, outgoing, item:inv_items(min_qty)')
    .eq('empresa_id', empresaId).gt('on_hand', 0);
  const totals = { totalItems: 0, totalOnHand: 0, totalReserved: 0, belowMin: 0 };
  const itemSet = new Set<string>();
  (balances || []).forEach((b: Record<string, unknown>) => {
    totals.totalOnHand += (b.on_hand as number) || 0;
    totals.totalReserved += (b.reserved as number) || 0;
    const item = b.item as Record<string, unknown> | null;
    if (item?.min_qty && (b.on_hand as number) < (item.min_qty as number)) totals.belowMin++;
  });
  totals.totalItems = (balances || []).length;
  return totals;
}

// =====================================================
// STOCK MOVES
// =====================================================
export async function listStockMoves(empresaId: string, params?: ListParams): Promise<PaginatedResult> {
  const supabase = getClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const from = (page - 1) * pageSize;

  let q = supabase.from('inv_stock_moves')
    .select('*, source_warehouse:inv_warehouses!inv_stock_moves_source_warehouse_id_fkey(name), dest_warehouse:inv_warehouses!inv_stock_moves_dest_warehouse_id_fkey(name), source_location:inv_locations!inv_stock_moves_source_location_id_fkey(name, code), dest_location:inv_locations!inv_stock_moves_dest_location_id_fkey(name, code)', { count: 'exact' })
    .eq('empresa_id', empresaId);

  if (params?.search) q = q.ilike('reference', `%${params.search}%`);
  if (params?.move_type) q = q.eq('move_type', params.move_type);
  if (params?.status) q = q.eq('status', params.status);
  if (params?.warehouse_id) q = q.or(`source_warehouse_id.eq.${params.warehouse_id},dest_warehouse_id.eq.${params.warehouse_id}`);
  if (params?.date_from) q = q.gte('created_at', params.date_from);
  if (params?.date_to) q = q.lte('created_at', params.date_to);

  q = q.order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  const { data, count } = await q;
  return { data: data || [], total: count || 0 };
}

export async function getStockMove(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: move } = await supabase.from('inv_stock_moves').select('*').eq('id', id).single();
  if (!move) return { error: 'Movimento não encontrado' };
  const { data: lines } = await supabase.from('inv_stock_move_lines')
    .select('*, item:inv_items(name, sku, uom), lot:inv_lots(lot_number, serial_number), source_location:inv_locations!inv_stock_move_lines_source_location_id_fkey(name, code), dest_location:inv_locations!inv_stock_move_lines_dest_location_id_fkey(name, code)')
    .eq('move_id', id).order('created_at');
  return { data: { ...move, lines: lines || [] } };
}

export async function createStockMove(empresaId: string, dto: Record<string, unknown>, lines: Record<string, unknown>[]): Promise<ActionResult> {
  const supabase = getClient();
  const cleaned = {
    ...dto, empresa_id: empresaId,
    source_warehouse_id: cleanUuid(dto.source_warehouse_id),
    source_location_id: cleanUuid(dto.source_location_id),
    dest_warehouse_id: cleanUuid(dto.dest_warehouse_id),
    dest_location_id: cleanUuid(dto.dest_location_id),
    status: 'draft',
  };
  const { data: move, error } = await supabase.from('inv_stock_moves').insert(cleaned).select().single();
  if (error) return { error: error.message };

  for (const line of lines) {
    await supabase.from('inv_stock_move_lines').insert({
      ...line, empresa_id: empresaId, move_id: move.id,
      lot_id: cleanUuid(line.lot_id),
      source_location_id: cleanUuid(line.source_location_id) || cleaned.source_location_id,
      dest_location_id: cleanUuid(line.dest_location_id) || cleaned.dest_location_id,
      total_cost: ((line.qty as number) || 0) * ((line.unit_cost as number) || 0),
    });
  }
  await writeInvAudit(empresaId, 'inv_stock_moves', move.id, 'create', { after: move });
  return { data: move, message: 'Movimento criado' };
}

export async function confirmStockMove(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: move } = await supabase.from('inv_stock_moves').select('*').eq('id', id).single();
  if (!move) return { error: 'Movimento não encontrado' };
  if (move.status !== 'draft') return { error: 'Movimento não está em rascunho' };
  const { error } = await supabase.from('inv_stock_moves').update({ status: 'ready' }).eq('id', id);
  if (error) return { error: error.message };
  await writeInvAudit(move.empresa_id, 'inv_stock_moves', id, 'confirm');
  return { message: 'Movimento confirmado' };
}

export async function postStockMove(id: string): Promise<ActionResult> {
  const supabase = getClient();
  // Use RPC to call the Postgres function for atomic balance update
  const { error } = await supabase.rpc('inv_post_stock_move', { p_move_id: id });
  if (error) return { error: error.message };
  const { data: move } = await supabase.from('inv_stock_moves').select('empresa_id').eq('id', id).single();
  if (move) await writeInvAudit(move.empresa_id, 'inv_stock_moves', id, 'post');
  return { message: 'Movimento executado e saldos atualizados' };
}

export async function cancelStockMove(id: string, reason: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: move } = await supabase.from('inv_stock_moves').select('*').eq('id', id).single();
  if (!move) return { error: 'Não encontrado' };
  if (move.status === 'done') return { error: 'Movimento já executado não pode ser cancelado diretamente. Use estorno.' };
  if (move.status === 'canceled') return { error: 'Já cancelado' };
  const { error } = await supabase.from('inv_stock_moves')
    .update({ status: 'canceled', cancel_reason: reason, canceled_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  await writeInvAudit(move.empresa_id, 'inv_stock_moves', id, 'cancel', { reason });
  return { message: 'Movimento cancelado' };
}

// =====================================================
// OPERATIONS (convenience wrappers)
// =====================================================
export async function createOperation(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const lines = (dto.lines as Record<string, unknown>[]) || [];
  const moveDto = { ...dto };
  delete moveDto.lines;
  return createStockMove(empresaId, moveDto, lines);
}

export async function listOperations(empresaId: string, params?: ListParams): Promise<PaginatedResult> {
  const p = { ...params };
  if (!p.move_type) {
    // Only show operations (not adjustments/scrap)
  }
  return listStockMoves(empresaId, p);
}

// =====================================================
// ADJUSTMENTS
// =====================================================
export async function createAdjustment(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const qty = dto.qty as number;
  const moveType = qty >= 0 ? 'adjustment' : 'adjustment';
  const moveDto = {
    move_type: moveType,
    dest_warehouse_id: dto.warehouse_id,
    dest_location_id: cleanUuid(dto.location_id),
    source_warehouse_id: dto.warehouse_id,
    source_location_id: cleanUuid(dto.location_id),
    notes: `Ajuste: ${dto.reason}. ${dto.notes || ''}`,
    reference: `ADJ-${Date.now()}`,
  };
  const line = {
    item_id: dto.item_id,
    lot_id: cleanUuid(dto.lot_id),
    qty: Math.abs(qty),
    source_location_id: qty < 0 ? cleanUuid(dto.location_id) : null,
    dest_location_id: qty >= 0 ? cleanUuid(dto.location_id) : null,
  };

  // Create and auto-post
  const result = await createStockMove(empresaId, moveDto, [line]);
  if (result.error) return result;
  const postResult = await postStockMove((result.data as Record<string, unknown>).id as string);
  if (postResult.error) return postResult;
  return { data: result.data, message: 'Ajuste aplicado com sucesso' };
}

export async function listAdjustmentMoves(empresaId: string, params?: ListParams): Promise<PaginatedResult> {
  const result = await listStockMoves(empresaId, { ...params, move_type: 'adjustment' });
  const supabase = getClient();
  const enriched = await Promise.all((result.data as Record<string, unknown>[]).map(async (m) => {
    const { data: lines } = await supabase.from('inv_stock_move_lines')
      .select('qty, item:inv_items(name, sku)').eq('move_id', m.id).limit(1);
    const line = lines?.[0] as Record<string, unknown> | undefined;
    const item = line?.item as Record<string, unknown> | undefined;
    return {
      ...m,
      qty: line?.qty ?? 0,
      item_name: item?.name ?? item?.sku ?? '—',
      item_sku: item?.sku ?? '—',
    };
  }));
  return { data: enriched, total: result.total };
}

export async function reverseAdjustment(moveId: string, reason: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: move } = await supabase.from('inv_stock_moves').select('*').eq('id', moveId).single();
  if (!move) return { error: 'Movimento não encontrado' };
  if (move.status !== 'done') return { error: 'Somente movimentos executados podem ser estornados' };
  const { data: lines } = await supabase.from('inv_stock_move_lines').select('*').eq('move_id', moveId);

  // Create reverse move
  const reverseDto = {
    move_type: 'adjustment',
    source_warehouse_id: move.dest_warehouse_id,
    source_location_id: move.dest_location_id,
    dest_warehouse_id: move.source_warehouse_id,
    dest_location_id: move.source_location_id,
    notes: `Estorno do movimento ${move.reference || moveId}: ${reason}`,
    reference: `REV-${move.reference || moveId.substring(0, 8)}`,
  };
  const reverseLines = (lines || []).map((l: Record<string, unknown>) => ({
    item_id: l.item_id,
    lot_id: l.lot_id,
    qty: l.qty,
    source_location_id: l.dest_location_id,
    dest_location_id: l.source_location_id,
  }));

  const result = await createStockMove(move.empresa_id, reverseDto, reverseLines);
  if (result.error) return result;
  const postResult = await postStockMove((result.data as Record<string, unknown>).id as string);
  if (postResult.error) return postResult;
  await writeInvAudit(move.empresa_id, 'inv_stock_moves', moveId, 'reverse', { reason, reverse_move_id: (result.data as Record<string, unknown>).id });
  return { message: 'Estorno realizado' };
}

// =====================================================
// SCRAP ORDERS
// =====================================================
export async function listScrapOrders(empresaId: string, params?: ListParams): Promise<PaginatedResult> {
  const supabase = getClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const from = (page - 1) * pageSize;
  let q = supabase.from('inv_scrap_orders')
    .select('*, item:inv_items(name, sku), warehouse:inv_warehouses(name), lot:inv_lots(lot_number)', { count: 'exact' })
    .eq('empresa_id', empresaId);
  if (params?.status) q = q.eq('status', params.status);
  q = q.order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  const { data, count } = await q;
  return { data: data || [], total: count || 0 };
}

export async function createScrapOrder(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_scrap_orders')
    .insert({ ...dto, empresa_id: empresaId, lot_id: cleanUuid(dto.lot_id), location_id: cleanUuid(dto.location_id) })
    .select().single();
  if (error) return { error: error.message };
  await writeInvAudit(empresaId, 'inv_scrap_orders', data.id, 'create');
  return { data, message: 'Ordem de sucata criada' };
}

export async function executeScrapOrder(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: scrap } = await supabase.from('inv_scrap_orders').select('*').eq('id', id).single();
  if (!scrap) return { error: 'Não encontrado' };
  if (scrap.status === 'done') return { error: 'Já executada' };

  // Find scrap location
  const { data: scrapLoc } = await supabase.from('inv_locations')
    .select('id').eq('warehouse_id', scrap.warehouse_id).eq('location_type', 'scrap').single();

  const moveDto = {
    move_type: 'scrap',
    source_warehouse_id: scrap.warehouse_id,
    source_location_id: scrap.location_id,
    dest_warehouse_id: scrap.warehouse_id,
    dest_location_id: scrapLoc?.id || null,
    reference: `SCRAP-${scrap.reference || id.substring(0, 8)}`,
    notes: `Sucata: ${scrap.reason || ''}`,
    scrap_order_id: id,
  };
  const line = { item_id: scrap.item_id, lot_id: scrap.lot_id, qty: scrap.qty };
  const result = await createStockMove(scrap.empresa_id, moveDto, [line]);
  if (result.error) return result;
  const postResult = await postStockMove((result.data as Record<string, unknown>).id as string);
  if (postResult.error) return postResult;

  await supabase.from('inv_scrap_orders').update({
    status: 'done', move_id: (result.data as Record<string, unknown>).id, done_at: new Date().toISOString(),
  }).eq('id', id);
  await writeInvAudit(scrap.empresa_id, 'inv_scrap_orders', id, 'execute');
  return { message: 'Sucata executada' };
}

// =====================================================
// INVENTORY COUNTS
// =====================================================
export async function listCounts(empresaId: string, params?: ListParams): Promise<PaginatedResult> {
  const supabase = getClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const from = (page - 1) * pageSize;
  let q = supabase.from('inv_counts')
    .select('*, warehouse:inv_warehouses(name)', { count: 'exact' })
    .eq('empresa_id', empresaId);
  if (params?.status) q = q.eq('status', params.status);
  q = q.order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  const { data, count } = await q;
  return { data: data || [], total: count || 0 };
}

export async function createCount(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const ref = `CNT-${Date.now().toString(36).toUpperCase()}`;
  const { data: cnt, error } = await supabase.from('inv_counts')
    .insert({ ...dto, empresa_id: empresaId, location_id: cleanUuid(dto.location_id), reference: ref })
    .select().single();
  if (error) return { error: error.message };

  // Snapshot current balances as count lines
  let bq = supabase.from('inv_balances')
    .select('item_id, location_id, lot_id, on_hand')
    .eq('empresa_id', empresaId).eq('warehouse_id', dto.warehouse_id);
  if (dto.location_id) bq = bq.eq('location_id', dto.location_id);
  const { data: balances } = await bq;

  for (const b of (balances || [])) {
    await supabase.from('inv_count_lines').insert({
      empresa_id: empresaId, count_id: cnt.id,
      item_id: b.item_id, location_id: b.location_id, lot_id: b.lot_id,
      expected_qty: b.on_hand || 0,
    });
  }
  await writeInvAudit(empresaId, 'inv_counts', cnt.id, 'create');
  return { data: cnt, message: 'Sessão de contagem criada' };
}

export async function getCount(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: cnt } = await supabase.from('inv_counts').select('*, warehouse:inv_warehouses(name)').eq('id', id).single();
  if (!cnt) return { error: 'Não encontrado' };
  const { data: lines } = await supabase.from('inv_count_lines')
    .select('*, item:inv_items(name, sku, uom), lot:inv_lots(lot_number)')
    .eq('count_id', id).order('created_at');
  return { data: { ...cnt, lines: lines || [] } };
}

export async function updateCountLine(lineId: string, countedQty: number, notes?: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_count_lines')
    .update({ counted_qty: countedQty, status: 'counted', counted_at: new Date().toISOString(), notes })
    .eq('id', lineId).select().single();
  if (error) return { error: error.message };
  return { data, message: 'Contagem registrada' };
}

export async function approveCountLine(lineId: string, approve: boolean): Promise<ActionResult> {
  const supabase = getClient();
  const { error } = await supabase.from('inv_count_lines')
    .update({ status: approve ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', lineId);
  if (error) return { error: error.message };
  return { message: approve ? 'Aprovado' : 'Rejeitado' };
}

export async function submitCountForReview(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: cnt } = await supabase.from('inv_counts').select('*').eq('id', id).single();
  if (!cnt) return { error: 'Não encontrado' };
  if (!['open', 'in_progress'].includes(cnt.status)) return { error: 'Contagem já está em revisão ou finalizada' };
  const { data: lines } = await supabase.from('inv_count_lines').select('id').eq('count_id', id).eq('status', 'counted');
  for (const line of lines || []) {
    await supabase.from('inv_count_lines').update({ status: 'pending_review' }).eq('id', line.id);
  }
  const { error } = await supabase.from('inv_counts').update({ status: 'pending_review' }).eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Contagem enviada para revisão' };
}

export async function approveCount(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: cnt } = await supabase.from('inv_counts').select('*').eq('id', id).single();
  if (!cnt) return { error: 'Não encontrado' };
  if (cnt.status !== 'pending_review') return { error: 'Contagem não está aguardando revisão' };
  const { data: lines } = await supabase.from('inv_count_lines').select('id')
    .eq('count_id', id).in('status', ['pending_review', 'counted']);
  for (const line of lines || []) {
    await supabase.from('inv_count_lines')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', line.id);
  }
  const { error } = await supabase.from('inv_counts')
    .update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  await writeInvAudit(cnt.empresa_id, 'inv_counts', id, 'approve');
  return { message: 'Contagem aprovada' };
}

export async function postCount(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: cnt } = await supabase.from('inv_counts').select('*').eq('id', id).single();
  if (!cnt) return { error: 'Não encontrado' };
  const { data: lines } = await supabase.from('inv_count_lines')
    .select('*').eq('count_id', id).eq('status', 'approved').neq('diff_qty', 0);

  // Generate adjustment moves for each approved divergence
  for (const line of (lines || [])) {
    const diff = line.diff_qty || 0;
    if (diff === 0) continue;
    await createAdjustment(cnt.empresa_id, {
      item_id: line.item_id,
      warehouse_id: cnt.warehouse_id,
      location_id: line.location_id,
      lot_id: line.lot_id,
      qty: diff,
      reason: `Ajuste de contagem ${cnt.reference}`,
    });
    await supabase.from('inv_count_lines').update({ status: 'posted' }).eq('id', line.id);
  }

  await supabase.from('inv_counts').update({ status: 'posted', posted_at: new Date().toISOString() }).eq('id', id);
  await writeInvAudit(cnt.empresa_id, 'inv_counts', id, 'post');
  return { message: 'Contagem postada e ajustes aplicados' };
}

// =====================================================
// REORDERING RULES & REPLENISHMENT
// =====================================================
export async function listReorderRules(empresaId: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data } = await supabase.from('inv_reordering_rules')
    .select('*, item:inv_items(name, sku), warehouse:inv_warehouses(name)')
    .eq('empresa_id', empresaId).order('created_at', { ascending: false });
  return data || [];
}

export async function createReorderRule(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_reordering_rules')
    .insert({ ...dto, empresa_id: empresaId }).select().single();
  if (error) return { error: error.message };
  return { data, message: 'Regra criada' };
}

export async function updateReorderRule(id: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_reordering_rules').update(dto).eq('id', id).select().single();
  if (error) return { error: error.message };
  return { data, message: 'Regra atualizada' };
}

export async function deleteReorderRule(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { error } = await supabase.from('inv_reordering_rules').delete().eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Regra excluída' };
}

export async function generateReplenishmentSuggestions(empresaId: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: rules } = await supabase.from('inv_reordering_rules')
    .select('*, item:inv_items(name, sku)').eq('empresa_id', empresaId).eq('is_active', true);

  let created = 0;
  for (const rule of (rules || [])) {
    const { data: balances } = await supabase.from('inv_balances')
      .select('on_hand').eq('empresa_id', empresaId)
      .eq('item_id', rule.item_id).eq('warehouse_id', rule.warehouse_id);
    const totalOnHand = (balances || []).reduce((sum: number, b: Record<string, unknown>) => sum + ((b.on_hand as number) || 0), 0);

    if (totalOnHand < rule.min_qty) {
      const suggestedQty = (rule.reorder_qty || rule.max_qty) - totalOnHand;
      if (suggestedQty <= 0) continue;
      // Check if already has pending suggestion
      const { count } = await supabase.from('inv_replenishment_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId).eq('item_id', rule.item_id).eq('warehouse_id', rule.warehouse_id).eq('status', 'pending');
      if ((count || 0) > 0) continue;

      await supabase.from('inv_replenishment_suggestions').insert({
        empresa_id: empresaId, rule_id: rule.id, item_id: rule.item_id,
        warehouse_id: rule.warehouse_id, current_qty: totalOnHand,
        min_qty: rule.min_qty, suggested_qty: suggestedQty,
        suggestion_type: 'purchase',
      });
      created++;
    }
  }
  return { message: `${created} sugestão(ões) gerada(s)` };
}

export async function listReplenishmentSuggestions(empresaId: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data } = await supabase.from('inv_replenishment_suggestions')
    .select('*, item:inv_items(name, sku), warehouse:inv_warehouses(name), rule:inv_reordering_rules(min_qty, max_qty)')
    .eq('empresa_id', empresaId).order('created_at', { ascending: false });
  return data || [];
}

export async function approveReplenishment(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { error } = await supabase.from('inv_replenishment_suggestions')
    .update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Sugestão aprovada' };
}

export async function rejectReplenishment(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { error } = await supabase.from('inv_replenishment_suggestions')
    .update({ status: 'rejected' }).eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Sugestão rejeitada' };
}

// =====================================================
// PUTAWAY RULES
// =====================================================
export async function listPutawayRules(empresaId: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data } = await supabase.from('inv_putaway_rules')
    .select('*, warehouse:inv_warehouses(name), item:inv_items(name, sku), dest_location:inv_locations!inv_putaway_rules_dest_location_id_fkey(name, code)')
    .eq('empresa_id', empresaId).order('priority');
  return data || [];
}

export async function createPutawayRule(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_putaway_rules')
    .insert({ ...dto, empresa_id: empresaId, item_id: cleanUuid(dto.item_id) }).select().single();
  if (error) return { error: error.message };
  return { data, message: 'Regra de armazenagem criada' };
}

export async function deletePutawayRule(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { error } = await supabase.from('inv_putaway_rules').delete().eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Regra excluída' };
}

export async function suggestPutawayLocation(empresaId: string, itemId: string, warehouseId: string): Promise<string | null> {
  const supabase = getClient();
  // Check item-specific rule
  const { data: itemRule } = await supabase.from('inv_putaway_rules')
    .select('dest_location_id').eq('empresa_id', empresaId).eq('warehouse_id', warehouseId).eq('item_id', itemId)
    .eq('is_active', true).order('priority').limit(1).single();
  if (itemRule) return itemRule.dest_location_id;

  // Check category rule
  const { data: item } = await supabase.from('inv_items').select('category').eq('id', itemId).single();
  if (item?.category) {
    const { data: catRule } = await supabase.from('inv_putaway_rules')
      .select('dest_location_id').eq('empresa_id', empresaId).eq('warehouse_id', warehouseId).eq('category', item.category)
      .eq('is_active', true).order('priority').limit(1).single();
    if (catRule) return catRule.dest_location_id;
  }
  return null;
}

// =====================================================
// ROUTES (minimal)
// =====================================================
export async function listRoutes(empresaId: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data } = await supabase.from('inv_routes').select('*').eq('empresa_id', empresaId).order('name');
  return data || [];
}

export async function createRoute(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_routes').insert({ ...dto, empresa_id: empresaId }).select().single();
  if (error) return { error: error.message };
  return { data, message: 'Rota criada' };
}

export async function deleteRoute(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { error } = await supabase.from('inv_routes').delete().eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Rota excluída' };
}

export async function listRouteRules(routeId: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data } = await supabase.from('inv_route_rules')
    .select('*, source_location:inv_locations!inv_route_rules_source_location_id_fkey(name, code), dest_location:inv_locations!inv_route_rules_dest_location_id_fkey(name, code)')
    .eq('route_id', routeId).order('priority');
  return data || [];
}

export async function createRouteRule(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_route_rules')
    .insert({ ...dto, empresa_id: empresaId, source_location_id: cleanUuid(dto.source_location_id), dest_location_id: cleanUuid(dto.dest_location_id) })
    .select().single();
  if (error) return { error: error.message };
  return { data, message: 'Regra de rota criada' };
}

export async function deleteRouteRule(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { error } = await supabase.from('inv_route_rules').delete().eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Regra de rota excluída' };
}

// =====================================================
// VALUATION
// =====================================================
export async function getInventoryValuation(empresaId: string, warehouseId?: string) {
  const supabase = getClient();
  let q = supabase.from('inv_balances')
    .select('on_hand, item:inv_items(name, sku, standard_cost, costing_method, category), warehouse:inv_warehouses(name)')
    .eq('empresa_id', empresaId).gt('on_hand', 0);
  if (warehouseId) q = q.eq('warehouse_id', warehouseId);
  const { data } = await q;

  let totalValue = 0;
  const items = (data || []).map((b: Record<string, unknown>) => {
    const item = b.item as Record<string, unknown>;
    const val = ((b.on_hand as number) || 0) * ((item?.standard_cost as number) || 0);
    totalValue += val;
    return { ...b, value: val };
  });
  return { items, totalValue };
}

// =====================================================
// AUDIT & ATTACHMENTS (reuse pattern)
// =====================================================
export async function listInvAuditLogs(entityType: string, entityId: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data } = await supabase.from('inv_audit_logs')
    .select('*').eq('entity_type', entityType).eq('entity_id', entityId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function listInvAttachments(entityType: string, entityId: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data } = await supabase.from('inv_attachments')
    .select('*').eq('entity_type', entityType).eq('entity_id', entityId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createInvAttachment(empresaId: string, dto: Record<string, unknown>): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase.from('inv_attachments')
    .insert({ ...dto, empresa_id: empresaId }).select().single();
  if (error) return { error: error.message };
  return { data, message: 'Anexo adicionado' };
}

export async function deleteInvAttachment(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { error } = await supabase.from('inv_attachments').delete().eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Anexo removido' };
}
