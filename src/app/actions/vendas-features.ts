'use server';

import { getTenantClient } from '@/shared/lib/supabase/tenant.server';

function getClient() { return getTenantClient('default'); }

// Clean empty strings for UUID fields
function cleanUuid(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const s = val.trim();
  return s.length > 0 && s !== 'undefined' && s !== 'null' ? s : null;
}

// =====================================================
// ORÇAMENTOS (Quotes / Proposals)
// =====================================================

export interface OrcamentoRecord {
  id: string;
  numero: string;
  data_orcamento: string;
  data_validade: string | null;
  status: string;
  subtotal: number;
  desconto: number;
  frete: number;
  total: number;
  observacoes: string | null;
  observacoes_internas: string | null;
  created_at: string;
  cliente: { id: string; nome: string; cpf_cnpj?: string } | null;
  vendedor: { id: string; nome: string } | null;
  itens?: OrcamentoItemRecord[];
}

export interface OrcamentoItemRecord {
  id: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual: number;
  valor_total: number;
  produto?: { id: string; codigo: string; descricao: string } | null;
}

export async function listOrcamentos(empresaId: string, filters?: {
  search?: string; status?: string; date_from?: string; date_to?: string;
  page?: number; pageSize?: number;
}) {
  const sb = getClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let q = sb.from('orcamentos')
    .select(`
      id, numero, data_orcamento, data_validade, status, subtotal, desconto, frete, total,
      observacoes, observacoes_internas, created_at,
      cliente:clientes(id, nome, cpf_cnpj),
      vendedor:vendedores(id, nome)
    `, { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order('data_orcamento', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters?.search) q = q.or(`numero.ilike.%${filters.search}%`);
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters?.date_from) q = q.gte('data_orcamento', filters.date_from);
  if (filters?.date_to) q = q.lte('data_orcamento', filters.date_to);

  const { data, error, count } = await q;
  if (error) {
    console.warn('listOrcamentos:', error.message);
    return { data: [], total: 0, page, pageSize };
  }
  return { data: (data || []) as OrcamentoRecord[], total: count || 0, page, pageSize };
}

export async function getOrcamentoDetail(id: string) {
  const sb = getClient();
  const { data, error } = await sb.from('orcamentos')
    .select(`
      *,
      cliente:clientes(id, nome, cpf_cnpj, email, telefone),
      vendedor:vendedores(id, nome),
      itens:orcamento_itens(*, produto:produtos(id, codigo, descricao))
    `)
    .eq('id', id)
    .single();
  if (error) return null;
  return data as OrcamentoRecord & { itens: OrcamentoItemRecord[] };
}

export async function updateOrcamentoStatus(id: string, status: string) {
  const sb = getClient();
  const { error } = await sb.from('orcamentos')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function convertOrcamentoToPedido(id: string, empresaId: string) {
  const sb = getClient();

  // Get orçamento with items
  const orc = await getOrcamentoDetail(id);
  if (!orc) return { success: false, error: 'Orçamento não encontrado' };
  if (orc.status === 'convertido') return { success: false, error: 'Orçamento já foi convertido' };
  if (orc.status === 'cancelado') return { success: false, error: 'Orçamento cancelado não pode ser convertido' };

  // Generate next pedido number
  const { data: lastPedido } = await sb.from('pedidos_venda')
    .select('numero')
    .eq('empresa_id', empresaId)
    .order('numero', { ascending: false })
    .limit(1)
    .single();

  const nextNum = lastPedido ? String(parseInt(lastPedido.numero, 10) + 1).padStart(5, '0') : '00001';

  // Create pedido
  const { data: pedido, error: pedErr } = await sb.from('pedidos_venda')
    .insert({
      empresa_id: empresaId,
      numero: nextNum,
      orcamento_id: id,
      cliente_id: orc.cliente?.id,
      vendedor_id: orc.vendedor?.id,
      data_pedido: new Date().toISOString().split('T')[0],
      status: 'aberto',
      subtotal: orc.subtotal,
      desconto: orc.desconto,
      frete: orc.frete,
      total: orc.total,
      observacoes: orc.observacoes,
    })
    .select()
    .single();

  if (pedErr) return { success: false, error: pedErr.message };

  // Copy items
  if (orc.itens && orc.itens.length > 0) {
    const itensInsert = orc.itens.map(item => ({
      pedido_id: pedido.id,
      produto_id: item.produto?.id || null,
      descricao: item.descricao,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto_percentual: item.desconto_percentual || 0,
      valor_total: item.valor_total,
    }));
    await sb.from('pedido_venda_itens').insert(itensInsert);
  }

  // Update orçamento status
  await sb.from('orcamentos').update({ status: 'convertido', updated_at: new Date().toISOString() }).eq('id', id);

  return { success: true, pedidoNumero: nextNum };
}

// =====================================================
// COUPONS
// =====================================================

export async function listCoupons(empresaId: string, filters?: {
  search?: string; is_active?: string; discount_type?: string;
}) {
  const sb = getClient();
  let q = sb.from('coupons').select('*', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });

  if (filters?.search) q = q.ilike('code', `%${filters.search}%`);
  if (filters?.is_active && filters.is_active !== 'all') q = q.eq('is_active', filters.is_active === 'true');
  if (filters?.discount_type && filters.discount_type !== 'all') q = q.eq('discount_type', filters.discount_type);

  const { data, error, count } = await q;
  if (error) {
    console.warn('listCoupons:', error.message);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

export async function createCoupon(empresaId: string, dto: Record<string, unknown>) {
  const sb = getClient();
  // Check uniqueness
  const { data: existing } = await sb.from('coupons').select('id').eq('empresa_id', empresaId).eq('code', dto.code).single();
  if (existing) return { success: false, error: 'Código de cupom já existe' };

  const { data, error } = await sb.from('coupons').insert({ empresa_id: empresaId, ...dto }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateCoupon(id: string, dto: Record<string, unknown>) {
  const sb = getClient();
  const { data, error } = await sb.from('coupons').update(dto).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function toggleCoupon(id: string, is_active: boolean) {
  const sb = getClient();
  const { error } = await sb.from('coupons').update({ is_active }).eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function validateCoupon(empresaId: string, code: string, cartTotal: number, customerId?: string | null) {
  const sb = getClient();
  const { data: coupon, error } = await sb.from('coupons')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single();

  if (error || !coupon) return { valid: false, reason: 'Cupom não encontrado ou inativo' };

  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return { valid: false, reason: 'Cupom ainda não é válido' };
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return { valid: false, reason: 'Cupom expirado' };
  if (coupon.min_cart_total && cartTotal < coupon.min_cart_total) return { valid: false, reason: `Valor mínimo do carrinho: R$ ${coupon.min_cart_total.toFixed(2)}` };
  if (coupon.max_uses_total && coupon.current_uses >= coupon.max_uses_total) return { valid: false, reason: 'Cupom atingiu o limite de usos' };

  // Check per-customer limit
  if (coupon.max_uses_per_customer && customerId) {
    const { count } = await sb.from('coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('customer_id', customerId);
    if ((count || 0) >= coupon.max_uses_per_customer) return { valid: false, reason: 'Limite de uso por cliente atingido' };
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = cartTotal * (coupon.discount_value / 100);
    if (coupon.max_discount && discountAmount > coupon.max_discount) discountAmount = coupon.max_discount;
  } else {
    discountAmount = Math.min(coupon.discount_value, cartTotal);
  }

  return { valid: true, coupon, discountAmount: Math.round(discountAmount * 100) / 100 };
}

export async function redeemCoupon(empresaId: string, couponId: string, saleId: string, saleType: string, discountAmount: number, customerId?: string | null, userId?: string | null) {
  const sb = getClient();
  const { error: insError } = await sb.from('coupon_redemptions').insert({
    empresa_id: empresaId,
    coupon_id: couponId,
    sale_id: saleId,
    sale_type: saleType,
    customer_id: cleanUuid(customerId),
    user_id: cleanUuid(userId),
    discount_amount: discountAmount,
  });
  if (insError) return { success: false, error: insError.message };

  // Increment usage counter
  await sb.rpc('increment_coupon_uses', { coupon_uuid: couponId }).catch(() => {
    // Fallback: manual increment
    sb.from('coupons').select('current_uses').eq('id', couponId).single().then(({ data }) => {
      if (data) sb.from('coupons').update({ current_uses: (data.current_uses || 0) + 1 }).eq('id', couponId);
    });
  });

  return { success: true };
}

// =====================================================
// RETURNS
// =====================================================

export async function listReturns(empresaId: string, filters?: {
  search?: string; status?: string; return_type?: string; date_from?: string; date_to?: string;
}) {
  const sb = getClient();
  let q = sb.from('sales_returns').select('*', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });

  if (filters?.search) q = q.or(`sale_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters?.return_type && filters.return_type !== 'all') q = q.eq('return_type', filters.return_type);
  if (filters?.date_from) q = q.gte('created_at', filters.date_from);
  if (filters?.date_to) q = q.lte('created_at', filters.date_to + 'T23:59:59');

  const { data, error, count } = await q;
  if (error) {
    console.warn('listReturns:', error.message);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

export async function getReturnById(id: string) {
  const sb = getClient();
  const { data, error } = await sb.from('sales_returns').select('*, items:return_items(*)').eq('id', id).single();
  if (error) return null;
  return data;
}

export async function createReturn(empresaId: string, dto: Record<string, unknown>) {
  const sb = getClient();
  const items = dto.items as Array<Record<string, unknown>>;
  const totalRefund = items.reduce((acc: number, it) => acc + ((it.qty_returned as number) * (it.unit_price as number)), 0);

  const { data: ret, error } = await sb.from('sales_returns').insert({
    empresa_id: empresaId,
    sale_id: cleanUuid(dto.sale_id as string),
    sale_type: dto.sale_type || 'pdv',
    sale_number: dto.sale_number,
    return_type: dto.return_type,
    status: 'pending',
    reason: dto.reason,
    notes: dto.notes,
    total_refund: Math.round(totalRefund * 100) / 100,
    customer_id: cleanUuid(dto.customer_id as string),
    customer_name: dto.customer_name,
    created_by: cleanUuid(dto.created_by as string),
  }).select().single();
  if (error) return { success: false, error: error.message };

  // Insert items
  const itemInserts = items.map(it => ({
    return_id: ret.id,
    sale_item_id: cleanUuid(it.sale_item_id as string),
    produto_id: cleanUuid(it.produto_id as string),
    descricao: it.descricao,
    qty_sold: it.qty_sold,
    qty_returned: it.qty_returned,
    unit_price: it.unit_price,
    refund_amount: Math.round(((it.qty_returned as number) * (it.unit_price as number)) * 100) / 100,
    restock_flag: it.restock_flag || false,
  }));

  await sb.from('return_items').insert(itemInserts);

  return { success: true, data: ret };
}

export async function approveReturn(id: string, approvedBy?: string) {
  const sb = getClient();
  const { data, error } = await sb.from('sales_returns').update({
    status: 'approved',
    approved_by: cleanUuid(approvedBy),
    approved_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };

  // If store_credit type, create store credit
  if (data.return_type === 'store_credit' && data.customer_id) {
    await sb.from('store_credits').insert({
      empresa_id: data.empresa_id,
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      amount: data.total_refund,
      balance: data.total_refund,
      status: 'active',
      origin_return_id: data.id,
    });
  }

  return { success: true, data };
}

export async function completeReturn(id: string) {
  const sb = getClient();
  const { error } = await sb.from('sales_returns').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { success: false, error: error.message };

  // Reverse commission entries for this sale
  const ret = await getReturnById(id);
  if (ret?.sale_id) {
    const { data: entries } = await sb.from('commission_entries')
      .select('*')
      .eq('sale_id', ret.sale_id)
      .in('status', ['forecast', 'eligible']);

    if (entries && entries.length > 0) {
      for (const entry of entries) {
        await sb.from('commission_entries').update({ status: 'reversed', return_id: id }).eq('id', entry.id);
        // Deduct XP
        await sb.from('gamification_xp_ledger').insert({
          empresa_id: ret.empresa_id,
          user_id: entry.seller_id,
          source_type: 'return_deduction',
          source_id: id,
          xp: -Math.abs(Math.round(entry.commission_amount)),
          description: `Comissão estornada - Devolução #${ret.sale_number || id.slice(0, 8)}`,
        });
      }
    }
  }

  return { success: true };
}

export async function cancelReturn(id: string) {
  const sb = getClient();
  const { error } = await sb.from('sales_returns').update({
    status: 'cancelled', cancelled_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Search PDV sale by number
export async function searchPdvSale(empresaId: string, search: string) {
  const sb = getClient();
  const { data, error } = await sb.from('vendas_pdv')
    .select(`*, itens:venda_pdv_itens(*), pagamentos:venda_pdv_pagamentos(*)`)
    .eq('empresa_id', empresaId)
    .eq('status', 'finalizada')
    .or(`numero.ilike.%${search}%`)
    .order('data_venda', { ascending: false })
    .limit(10);
  if (error) return [];
  return data || [];
}

// =====================================================
// COMMISSION RULES
// =====================================================

export async function listCommissionRules(empresaId: string) {
  const sb = getClient();
  const { data, error } = await sb.from('commission_rules').select('*')
    .eq('empresa_id', empresaId)
    .order('priority', { ascending: false });
  if (error) {
    console.warn('listCommissionRules:', error.message);
    return [];
  }
  return data || [];
}

export async function createCommissionRule(empresaId: string, dto: Record<string, unknown>) {
  const sb = getClient();
  const { data, error } = await sb.from('commission_rules').insert({
    empresa_id: empresaId,
    name: dto.name,
    description: dto.description,
    seller_id: cleanUuid(dto.seller_id as string),
    category_id: cleanUuid(dto.category_id as string),
    product_id: cleanUuid(dto.product_id as string),
    channel: dto.channel || 'all',
    commission_type: dto.commission_type,
    commission_value: dto.commission_value,
    priority: dto.priority || 0,
    valid_from: dto.valid_from || null,
    valid_until: dto.valid_until || null,
    is_active: dto.is_active !== false,
  }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateCommissionRule(id: string, dto: Record<string, unknown>) {
  const sb = getClient();
  const clean = { ...dto };
  if ('seller_id' in clean) clean.seller_id = cleanUuid(clean.seller_id as string);
  if ('category_id' in clean) clean.category_id = cleanUuid(clean.category_id as string);
  if ('product_id' in clean) clean.product_id = cleanUuid(clean.product_id as string);
  const { data, error } = await sb.from('commission_rules').update(clean).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteCommissionRule(id: string) {
  const sb = getClient();
  // Check if any entries reference this rule
  const { count } = await sb.from('commission_entries').select('id', { count: 'exact', head: true }).eq('rule_id', id);
  if ((count || 0) > 0) return { success: false, error: 'Regra possui entradas de comissão associadas. Desative ao invés de excluir.' };
  const { error } = await sb.from('commission_rules').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// =====================================================
// COMMISSION ENTRIES & STATEMENTS
// =====================================================

export async function listCommissionEntries(empresaId: string, filters?: {
  seller_id?: string; period_key?: string; status?: string;
}) {
  const sb = getClient();
  let q = sb.from('commission_entries').select('*', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters?.seller_id) q = q.eq('seller_id', filters.seller_id);
  if (filters?.period_key) q = q.eq('period_key', filters.period_key);
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);

  const { data, error, count } = await q;
  if (error) {
    console.warn('listCommissionEntries:', error.message);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

export async function listCommissionStatements(empresaId: string, filters?: {
  seller_id?: string; period_key?: string; status?: string;
}) {
  const sb = getClient();
  let q = sb.from('commission_statements').select('*', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order('period_key', { ascending: false });

  if (filters?.seller_id) q = q.eq('seller_id', filters.seller_id);
  if (filters?.period_key) q = q.eq('period_key', filters.period_key);
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);

  const { data, error, count } = await q;
  if (error) {
    console.warn('listCommissionStatements:', error.message);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

export async function generateCommissionStatement(empresaId: string, sellerId: string, periodKey: string) {
  const sb = getClient();
  // Get seller info
  const { data: seller } = await sb.from('vendedores').select('nome').eq('id', sellerId).single();

  // Get entries for the period
  const { data: entries } = await sb.from('commission_entries')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('seller_id', sellerId)
    .eq('period_key', periodKey);

  const totalForecast = (entries || []).filter(e => e.status === 'forecast').reduce((acc, e) => acc + e.commission_amount, 0);
  const totalEligible = (entries || []).filter(e => e.status === 'eligible').reduce((acc, e) => acc + e.commission_amount, 0);
  const totalPaid = (entries || []).filter(e => e.status === 'paid').reduce((acc, e) => acc + e.commission_amount, 0);
  const totalReversed = (entries || []).filter(e => e.status === 'reversed').reduce((acc, e) => acc + e.commission_amount, 0);
  const totalSales = (entries || []).reduce((acc, e) => acc + e.sale_total, 0);

  const { data, error } = await sb.from('commission_statements').upsert({
    empresa_id: empresaId,
    seller_id: sellerId,
    seller_name: seller?.nome || 'Vendedor',
    period_key: periodKey,
    total_sales: totalSales,
    total_forecast: totalForecast,
    total_eligible: totalEligible,
    total_paid: totalPaid,
    total_reversed: totalReversed,
    status: 'open',
  }, { onConflict: 'empresa_id,seller_id,period_key' }).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function payCommissionStatement(id: string) {
  const sb = getClient();
  const { data: stmt, error: fetchErr } = await sb.from('commission_statements').select('*').eq('id', id).single();
  if (fetchErr || !stmt) return { success: false, error: 'Extrato não encontrado' };

  // Mark eligible entries as paid
  await sb.from('commission_entries')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('empresa_id', stmt.empresa_id)
    .eq('seller_id', stmt.seller_id)
    .eq('period_key', stmt.period_key)
    .eq('status', 'eligible');

  const { error } = await sb.from('commission_statements').update({
    status: 'paid', paid_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// =====================================================
// GAMIFICATION
// =====================================================

export async function listMissions(empresaId: string) {
  const sb = getClient();
  const { data, error } = await sb.from('gamification_missions').select('*')
    .eq('empresa_id', empresaId).order('created_at', { ascending: false });
  if (error) {
    console.warn('listMissions:', error.message);
    return [];
  }
  return data || [];
}

export async function createMission(empresaId: string, dto: Record<string, unknown>) {
  const sb = getClient();
  const { data, error } = await sb.from('gamification_missions').insert({
    empresa_id: empresaId, ...dto,
  }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateMission(id: string, dto: Record<string, unknown>) {
  const sb = getClient();
  const { data, error } = await sb.from('gamification_missions').update(dto).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function listBadges(empresaId: string) {
  const sb = getClient();
  const { data, error } = await sb.from('gamification_badges').select('*')
    .eq('empresa_id', empresaId).order('created_at', { ascending: false });
  if (error) {
    console.warn('listBadges:', error.message);
    return [];
  }
  return data || [];
}

export async function createBadge(empresaId: string, dto: Record<string, unknown>) {
  const sb = getClient();
  const { data, error } = await sb.from('gamification_badges').insert({
    empresa_id: empresaId, ...dto,
  }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getUserGamificationData(empresaId: string, userId: string) {
  const sb = getClient();

  // XP total
  const { data: xpData } = await sb.from('gamification_xp_ledger')
    .select('xp').eq('empresa_id', empresaId).eq('user_id', userId);
  const totalXp = (xpData || []).reduce((acc, r) => acc + (r.xp || 0), 0);

  // Level (every 100 XP = 1 level)
  const level = Math.max(1, Math.floor(totalXp / 100) + 1);

  // Active missions with progress
  const today = new Date();
  const dailyKey = today.toISOString().slice(0, 10);
  const weekNum = getISOWeek(today);
  const weeklyKey = `${today.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  const monthlyKey = today.toISOString().slice(0, 7);

  const { data: missions } = await sb.from('gamification_missions').select('*')
    .eq('empresa_id', empresaId).eq('is_active', true);

  const { data: progresses } = await sb.from('gamification_user_progress').select('*')
    .eq('empresa_id', empresaId).eq('user_id', userId);

  const missionsWithProgress = (missions || []).map(m => {
    const periodKey = m.period === 'daily' ? dailyKey : m.period === 'weekly' ? weeklyKey : monthlyKey;
    const p = (progresses || []).find(p => p.mission_id === m.id && p.period_key === periodKey);
    return {
      ...m,
      current_value: p?.current_value || 0,
      completed: p?.completed || false,
      period_key: periodKey,
    };
  });

  // User badges
  const { data: userBadges } = await sb.from('gamification_user_badges')
    .select('*, badge:gamification_badges(*)').eq('empresa_id', empresaId).eq('user_id', userId);

  // Streak: consecutive daily missions completed
  const { data: completedDaily } = await sb.from('gamification_user_progress')
    .select('period_key').eq('empresa_id', empresaId).eq('user_id', userId).eq('completed', true)
    .order('period_key', { ascending: false }).limit(60);

  let streak = 0;
  if (completedDaily && completedDaily.length > 0) {
    const keys = [...new Set(completedDaily.map(d => d.period_key))].sort().reverse();
    const todayStr = dailyKey;
    for (let i = 0; i < keys.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedKey = expected.toISOString().slice(0, 10);
      if (keys.includes(expectedKey) || (i === 0 && !keys.includes(todayStr))) {
        if (i === 0 && !keys.includes(todayStr)) continue;
        streak++;
      } else break;
    }
  }

  return { totalXp, level, streak, missions: missionsWithProgress, badges: userBadges || [] };
}

export async function getLeaderboard(empresaId: string, period: 'weekly' | 'monthly') {
  const sb = getClient();
  const today = new Date();
  let periodKey: string;

  if (period === 'weekly') {
    const weekNum = getISOWeek(today);
    periodKey = `${today.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  } else {
    periodKey = today.toISOString().slice(0, 7);
  }

  // Get XP entries for the period
  const startDate = period === 'weekly'
    ? getWeekStart(today).toISOString()
    : new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const { data: xpEntries } = await sb.from('gamification_xp_ledger')
    .select('user_id, xp')
    .eq('empresa_id', empresaId)
    .gte('created_at', startDate);

  if (!xpEntries || xpEntries.length === 0) return [];

  // Aggregate by user
  const userXp: Record<string, number> = {};
  xpEntries.forEach(e => { userXp[e.user_id] = (userXp[e.user_id] || 0) + e.xp; });

  // Get user names (from vendedores or admin_users)
  const userIds = Object.keys(userXp);
  const { data: sellers } = await sb.from('vendedores').select('id, nome').in('id', userIds);

  const leaderboard = Object.entries(userXp)
    .map(([userId, xp]) => ({
      user_id: userId,
      user_name: sellers?.find(s => s.id === userId)?.nome || userId.slice(0, 8),
      xp,
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 20);

  return leaderboard;
}

// =====================================================
// CONSOLIDATED SALES LISTING (PDV + Pedidos)
// =====================================================

export interface SaleRecord {
  id: string;
  tipo: 'pdv' | 'pedido';
  numero: string;
  data: string;
  cliente_nome: string | null;
  cliente_cpf: string | null;
  vendedor_nome: string | null;
  status: string;
  subtotal: number;
  desconto: number;
  total: number;
  forma_pagamento: string | null;
  itens_count: number;
}

export async function listAllSales(empresaId: string, filters?: {
  search?: string;
  tipo?: 'all' | 'pdv' | 'pedido';
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
}) {
  const sb = getClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 30;
  const offset = (page - 1) * pageSize;
  const tipo = filters?.tipo || 'all';

  const results: SaleRecord[] = [];
  let totalPdv = 0;
  let totalPedidos = 0;

  // --- PDV Sales ---
  if (tipo === 'all' || tipo === 'pdv') {
    let qPdv = sb.from('vendas_pdv')
      .select(`
        id, numero, data_venda, cliente_nome, cliente_cpf, status, subtotal, desconto, total,
        vendedor:vendedores(nome),
        pagamentos:venda_pdv_pagamentos(tipo),
        itens:venda_pdv_itens(id)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('data_venda', { ascending: false });

    if (filters?.search) {
      qPdv = qPdv.or(`numero.ilike.%${filters.search}%,cliente_nome.ilike.%${filters.search}%`);
    }
    if (filters?.status && filters.status !== 'all') {
      qPdv = qPdv.eq('status', filters.status);
    }
    if (filters?.date_from) qPdv = qPdv.gte('data_venda', filters.date_from);
    if (filters?.date_to) qPdv = qPdv.lte('data_venda', filters.date_to + 'T23:59:59');

    if (tipo === 'pdv') {
      qPdv = qPdv.range(offset, offset + pageSize - 1);
    }

    const { data: pdvData, error: pdvErr, count: pdvCount } = await qPdv;
    if (pdvErr) {
      console.warn('listAllSales PDV:', pdvErr.message);
    } else if (pdvData) {
      totalPdv = pdvCount || 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pdvData.forEach((v: any) => {
        const pagTipos = v.pagamentos?.map((p: { tipo: string }) => p.tipo) || [];
        const formaPag = pagTipos.length > 0 ? [...new Set(pagTipos)].join(', ') : null;
        results.push({
          id: v.id,
          tipo: 'pdv',
          numero: v.numero,
          data: v.data_venda,
          cliente_nome: v.cliente_nome,
          cliente_cpf: v.cliente_cpf,
          vendedor_nome: v.vendedor?.nome || null,
          status: v.status,
          subtotal: v.subtotal || 0,
          desconto: v.desconto || 0,
          total: v.total || 0,
          forma_pagamento: formaPag,
          itens_count: v.itens?.length || 0,
        });
      });
    }
  }

  // --- Pedidos de Venda ---
  if (tipo === 'all' || tipo === 'pedido') {
    let qPed = sb.from('pedidos_venda')
      .select(`
        id, numero, data_pedido, status, subtotal, desconto, total,
        cliente:clientes(nome, cpf_cnpj),
        vendedor:vendedores(nome),
        itens:pedido_venda_itens(id)
      `, { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('data_pedido', { ascending: false });

    if (filters?.search) {
      qPed = qPed.or(`numero.ilike.%${filters.search}%`);
    }
    if (filters?.status && filters.status !== 'all') {
      qPed = qPed.eq('status', filters.status);
    }
    if (filters?.date_from) qPed = qPed.gte('data_pedido', filters.date_from);
    if (filters?.date_to) qPed = qPed.lte('data_pedido', filters.date_to + 'T23:59:59');

    if (tipo === 'pedido') {
      qPed = qPed.range(offset, offset + pageSize - 1);
    }

    const { data: pedData, error: pedErr, count: pedCount } = await qPed;
    if (pedErr) {
      console.warn('listAllSales Pedidos:', pedErr.message);
    } else if (pedData) {
      totalPedidos = pedCount || 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pedData.forEach((v: any) => {
        results.push({
          id: v.id,
          tipo: 'pedido',
          numero: v.numero,
          data: v.data_pedido,
          cliente_nome: v.cliente?.nome || null,
          cliente_cpf: v.cliente?.cpf_cnpj || null,
          vendedor_nome: v.vendedor?.nome || null,
          status: v.status,
          subtotal: v.subtotal || 0,
          desconto: v.desconto || 0,
          total: v.total || 0,
          forma_pagamento: null,
          itens_count: v.itens?.length || 0,
        });
      });
    }
  }

  // Sort by date descending
  results.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Paginate combined
  const total = tipo === 'all' ? totalPdv + totalPedidos : tipo === 'pdv' ? totalPdv : totalPedidos;
  const paginated = tipo === 'all' ? results.slice(offset, offset + pageSize) : results;

  return {
    data: paginated,
    total,
    totalPdv,
    totalPedidos,
    page,
    pageSize,
  };
}

// Get PDV sale detail
export async function getPdvSaleDetail(id: string) {
  const sb = getClient();
  const { data, error } = await sb.from('vendas_pdv')
    .select(`
      *,
      vendedor:vendedores(nome),
      itens:venda_pdv_itens(*),
      pagamentos:venda_pdv_pagamentos(*)
    `)
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

// Get Pedido detail
export async function getPedidoDetail(id: string) {
  const sb = getClient();
  const { data, error } = await sb.from('pedidos_venda')
    .select(`
      *,
      cliente:clientes(id, nome, cpf_cnpj, email, telefone),
      vendedor:vendedores(id, nome, comissao_percentual),
      itens:pedido_venda_itens(*, produto:produtos(id, codigo, descricao))
    `)
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function listSellers(empresaId: string) {
  const sb = getClient();
  const { data, error } = await sb.from('vendedores').select('id, nome, comissao_percentual, ativo')
    .eq('empresa_id', empresaId).order('nome');
  if (error) return [];
  return data || [];
}

// =====================================================
// Helpers
// =====================================================

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
