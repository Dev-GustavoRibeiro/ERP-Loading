'use server';

import { getTenantClient } from '@/shared/lib/supabase/tenant.server';

function getClient() { return getTenantClient('default'); }

function cleanUuid(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const s = val.trim();
  return s.length > 0 && s !== 'undefined' && s !== 'null' ? s : null;
}

// =====================================================
// PIPELINES & STAGES
// =====================================================

export async function listPipelines(empresaId: string) {
  const sb = getClient();
  const { data, error } = await sb
    .from('crm_pipelines')
    .select('*, stages:crm_pipeline_stages(id,name,sort_order,probability_default,color,is_won,is_lost)')
    .eq('empresa_id', empresaId)
    .eq('is_active', true)
    .order('created_at');

  if (error) { console.warn('listPipelines:', error.message); return []; }

  // Sort stages within each pipeline
  return (data || []).map((p: Record<string, unknown>) => ({
    ...p,
    stages: Array.isArray(p.stages)
      ? (p.stages as Record<string, unknown>[]).sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
      : [],
  }));
}

export async function createPipeline(empresaId: string, dto: { name: string; description?: string; is_default?: boolean }) {
  const sb = getClient();
  const { data, error } = await sb
    .from('crm_pipelines')
    .insert({ empresa_id: empresaId, ...dto })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updatePipeline(id: string, dto: { name?: string; description?: string; is_default?: boolean; is_active?: boolean }) {
  const sb = getClient();
  const { data, error } = await sb.from('crm_pipelines').update(dto).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createStage(empresaId: string, dto: {
  pipeline_id: string; name: string; sort_order: number;
  probability_default?: number; color?: string; is_won?: boolean; is_lost?: boolean;
}) {
  const sb = getClient();
  const { data, error } = await sb
    .from('crm_pipeline_stages')
    .insert({ empresa_id: empresaId, ...dto })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateStage(id: string, dto: {
  name?: string; sort_order?: number; probability_default?: number;
  color?: string; is_won?: boolean; is_lost?: boolean;
}) {
  const sb = getClient();
  const { data, error } = await sb.from('crm_pipeline_stages').update(dto).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteStage(id: string) {
  const sb = getClient();
  const { error } = await sb.from('crm_pipeline_stages').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// =====================================================
// LOSS REASONS
// =====================================================

export async function listLossReasons(empresaId: string) {
  const sb = getClient();
  const { data, error } = await sb
    .from('crm_loss_reasons')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) { console.warn('listLossReasons:', error.message); return []; }
  return data || [];
}

export async function createLossReason(empresaId: string, dto: { name: string; sort_order?: number }) {
  const sb = getClient();
  const { data, error } = await sb.from('crm_loss_reasons').insert({ empresa_id: empresaId, ...dto }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// =====================================================
// STAGE AUTOMATIONS
// =====================================================

export async function listStageAutomations(empresaId: string, stageId?: string) {
  const sb = getClient();
  let q = sb.from('crm_stage_automations').select('*').eq('empresa_id', empresaId);
  if (stageId) q = q.eq('stage_id', stageId);
  const { data, error } = await q.order('created_at');
  if (error) { console.warn('listStageAutomations:', error.message); return []; }
  return data || [];
}

export async function createStageAutomation(empresaId: string, dto: {
  stage_id: string; action_type: string; task_title?: string;
  task_description?: string; task_due_days?: number; is_active?: boolean;
}) {
  const sb = getClient();
  const { data, error } = await sb.from('crm_stage_automations').insert({ empresa_id: empresaId, ...dto }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteStageAutomation(id: string) {
  const sb = getClient();
  const { error } = await sb.from('crm_stage_automations').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// =====================================================
// LEADS
// =====================================================

export interface LeadRecord {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  cargo: string | null;
  origem: string;
  status: string;
  owner_id: string | null;
  valor_estimado: number;
  observacoes: string | null;
  next_activity_at: string | null;
  converted_at: string | null;
  converted_opportunity_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function listLeads(empresaId: string, filters?: {
  search?: string; status?: string; origem?: string; owner_id?: string;
  has_owner?: string; date_from?: string; date_to?: string;
  page?: number; pageSize?: number; sortBy?: string; sortOrder?: string;
}) {
  const sb = getClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let q = sb.from('crm_leads')
    .select('*', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .range(offset, offset + pageSize - 1);

  if (filters?.search) {
    q = q.or(`nome.ilike.%${filters.search}%,email.ilike.%${filters.search}%,telefone.ilike.%${filters.search}%,empresa.ilike.%${filters.search}%`);
  }
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters?.origem && filters.origem !== 'all') q = q.eq('origem', filters.origem);
  if (filters?.owner_id && filters.owner_id !== 'all') q = q.eq('owner_id', filters.owner_id);
  if (filters?.has_owner === 'without') q = q.is('owner_id', null);
  if (filters?.has_owner === 'with') q = q.not('owner_id', 'is', null);
  if (filters?.date_from) q = q.gte('created_at', filters.date_from);
  if (filters?.date_to) q = q.lte('created_at', filters.date_to + 'T23:59:59');

  const sortField = filters?.sortBy || 'created_at';
  const sortAsc = filters?.sortOrder === 'asc';
  q = q.order(sortField, { ascending: sortAsc });

  const { data, error, count } = await q;
  if (error) { console.warn('listLeads:', error.message); return { data: [], total: 0, page, pageSize }; }
  return { data: (data || []) as LeadRecord[], total: count || 0, page, pageSize };
}

export async function getLeadKPIs(empresaId: string) {
  const sb = getClient();
  const today = new Date().toISOString().split('T')[0];

  const [totalRes, novoHojeRes, semOwnerRes, convertidosRes] = await Promise.all([
    sb.from('crm_leads').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
    sb.from('crm_leads').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).gte('created_at', today),
    sb.from('crm_leads').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).is('owner_id', null),
    sb.from('crm_leads').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'convertido'),
  ]);

  return {
    total: totalRes.count || 0,
    novosHoje: novoHojeRes.count || 0,
    semOwner: semOwnerRes.count || 0,
    convertidos: convertidosRes.count || 0,
  };
}

export async function createLead(empresaId: string, dto: {
  nome: string; email?: string; telefone?: string; empresa?: string;
  cargo?: string; origem?: string; valor_estimado?: number;
  owner_id?: string; observacoes?: string;
}) {
  const sb = getClient();

  // Dedupe check
  if (dto.email) {
    const { data: dup } = await sb.from('crm_leads')
      .select('id,nome')
      .eq('empresa_id', empresaId)
      .eq('email', dto.email)
      .limit(1);
    if (dup && dup.length > 0) {
      return { success: false, error: `Já existe um lead com este e-mail: ${dup[0].nome}` };
    }
  }
  if (dto.telefone) {
    const cleaned = dto.telefone.replace(/\D/g, '');
    if (cleaned.length >= 8) {
      const { data: dup } = await sb.from('crm_leads')
        .select('id,nome')
      .eq('empresa_id', empresaId)
      .ilike('telefone', `%${cleaned.slice(-8)}%`)
        .limit(1);
      if (dup && dup.length > 0) {
        return { success: false, error: `Já existe um lead com telefone similar: ${dup[0].nome}` };
      }
    }
  }

  const insert = {
    empresa_id: empresaId,
    nome: dto.nome,
    email: dto.email || null,
    telefone: dto.telefone || null,
    empresa: dto.empresa || null,
    cargo: dto.cargo || null,
    origem: dto.origem || 'manual',
    valor_estimado: dto.valor_estimado || 0,
    owner_id: cleanUuid(dto.owner_id),
    observacoes: dto.observacoes || null,
  };

  const { data, error } = await sb.from('crm_leads').insert(insert).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateLead(id: string, dto: Record<string, unknown>) {
  const sb = getClient();
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined) {
      if (['owner_id'].includes(k)) clean[k] = cleanUuid(v);
      else clean[k] = v === '' ? null : v;
    }
  }
  const { data, error } = await sb.from('crm_leads').update(clean).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function convertLead(empresaId: string, dto: {
  lead_id: string; pipeline_id: string; stage_id: string;
  opportunity_title: string; opportunity_value?: number;
  opportunity_probability?: number; expected_close_date?: string;
}) {
  const sb = getClient();

  // 1) Create opportunity
  const oppInsert = {
    empresa_id: empresaId,
    title: dto.opportunity_title,
    pipeline_id: dto.pipeline_id,
    stage_id: dto.stage_id,
    value: dto.opportunity_value || 0,
    probability: dto.opportunity_probability || 0,
    expected_close_date: dto.expected_close_date || null,
    lead_id: dto.lead_id,
    status: 'open',
  };

  const { data: opp, error: oppErr } = await sb.from('crm_opportunities').insert(oppInsert).select().single();
  if (oppErr) return { success: false, error: oppErr.message };

  // 2) Update lead status
  await sb.from('crm_leads').update({
    status: 'convertido',
    converted_at: new Date().toISOString(),
    converted_opportunity_id: opp.id,
  }).eq('id', dto.lead_id);

  // 3) Run stage automations
  await runStageAutomations(empresaId, dto.stage_id, opp.id);

  return { success: true, data: opp };
}

export async function deleteLead(id: string) {
  const sb = getClient();
  const { error } = await sb.from('crm_leads').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// =====================================================
// OPPORTUNITIES
// =====================================================

export interface OpportunityRecord {
  id: string;
  title: string;
  pipeline_id: string;
  stage_id: string;
  value: number;
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  status: string;
  origin: string | null;
  owner_id: string | null;
  lead_id: string | null;
  cliente_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  loss_reason_id: string | null;
  loss_notes: string | null;
  won_notes: string | null;
  next_activity_at: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  stage?: { id: string; name: string; color: string; is_won: boolean; is_lost: boolean };
  pipeline?: { id: string; name: string };
  lead?: { id: string; nome: string } | null;
}

export async function listOpportunities(empresaId: string, filters?: {
  pipeline_id?: string; status?: string; owner_id?: string;
  search?: string; page?: number; pageSize?: number;
}) {
  const sb = getClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;
  const offset = (page - 1) * pageSize;

  let q = sb.from('crm_opportunities')
    .select(`
      *,
      stage:crm_pipeline_stages(id,name,color,is_won,is_lost),
      pipeline:crm_pipelines(id,name),
      lead:crm_leads(id,nome)
    `, { count: 'exact' })
    .eq('empresa_id', empresaId)
    .range(offset, offset + pageSize - 1)
    .order('created_at', { ascending: false });

  if (filters?.pipeline_id && filters.pipeline_id !== 'all') q = q.eq('pipeline_id', filters.pipeline_id);
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters?.owner_id && filters.owner_id !== 'all') q = q.eq('owner_id', filters.owner_id);
  if (filters?.search) q = q.or(`title.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`);

  const { data, error, count } = await q;
  if (error) { console.warn('listOpportunities:', error.message); return { data: [], total: 0, page, pageSize }; }
  return { data: (data || []) as OpportunityRecord[], total: count || 0, page, pageSize };
}

export async function getOpportunityKPIs(empresaId: string, pipelineId?: string) {
  const sb = getClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let baseQ = sb.from('crm_opportunities').select('id,value,probability,status').eq('empresa_id', empresaId);
  if (pipelineId && pipelineId !== 'all') baseQ = baseQ.eq('pipeline_id', pipelineId);

  const { data } = await baseQ;
  const rows = data || [];

  const open = rows.filter((r: Record<string, unknown>) => r.status === 'open');
  const totalFunnel = open.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.value as number) || 0), 0);
  const forecast = open.reduce((sum: number, r: Record<string, unknown>) => sum + (((r.value as number) || 0) * ((r.probability as number) || 0) / 100), 0);

  // Won/lost this month
  const [wonRes, lostRes] = await Promise.all([
    sb.from('crm_opportunities').select('id,value', { count: 'exact' }).eq('empresa_id', empresaId).eq('status', 'won').gte('actual_close_date', monthStart.split('T')[0]),
    sb.from('crm_opportunities').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'lost').gte('updated_at', monthStart),
  ]);

  const wonValue = (wonRes.data || []).reduce((sum: number, r: Record<string, unknown>) => sum + ((r.value as number) || 0), 0);

  return {
    totalFunnel: Math.round(totalFunnel),
    forecast: Math.round(forecast),
    wonThisMonth: wonRes.count || 0,
    wonValueThisMonth: Math.round(wonValue),
    lostThisMonth: lostRes.count || 0,
    openCount: open.length,
  };
}

export async function createOpportunity(empresaId: string, dto: {
  title: string; pipeline_id: string; stage_id: string; value?: number;
  probability?: number; expected_close_date?: string; origin?: string;
  owner_id?: string; lead_id?: string; cliente_id?: string;
  contact_name?: string; contact_email?: string; contact_phone?: string; observacoes?: string;
}) {
  const sb = getClient();
  const insert = {
    empresa_id: empresaId,
    title: dto.title,
    pipeline_id: dto.pipeline_id,
    stage_id: dto.stage_id,
    value: dto.value || 0,
    probability: dto.probability || 0,
    expected_close_date: dto.expected_close_date || null,
    origin: dto.origin || null,
    owner_id: cleanUuid(dto.owner_id),
    lead_id: cleanUuid(dto.lead_id),
    cliente_id: cleanUuid(dto.cliente_id),
    contact_name: dto.contact_name || null,
    contact_email: dto.contact_email || null,
    contact_phone: dto.contact_phone || null,
    observacoes: dto.observacoes || null,
    status: 'open',
  };

  const { data, error } = await sb.from('crm_opportunities').insert(insert).select().single();
  if (error) return { success: false, error: error.message };

  // Run automations for initial stage
  await runStageAutomations(empresaId, dto.stage_id, data.id);

  // Record stage history
  await sb.from('crm_opportunity_stage_history').insert({
    empresa_id: empresaId,
    opportunity_id: data.id,
    to_stage_id: dto.stage_id,
  });

  return { success: true, data };
}

export async function updateOpportunity(id: string, dto: Record<string, unknown>) {
  const sb = getClient();
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined) {
      if (['owner_id', 'lead_id', 'cliente_id', 'loss_reason_id'].includes(k)) clean[k] = cleanUuid(v);
      else clean[k] = v === '' ? null : v;
    }
  }
  const { data, error } = await sb.from('crm_opportunities').update(clean).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function moveOpportunityStage(empresaId: string, opportunityId: string, fromStageId: string, toStageId: string) {
  const sb = getClient();

  // Get stage info for probability
  const { data: stageData } = await sb.from('crm_pipeline_stages').select('probability_default').eq('id', toStageId).single();

  const updateData: Record<string, unknown> = { stage_id: toStageId };
  if (stageData?.probability_default !== undefined) {
    updateData.probability = stageData.probability_default;
  }

  const { error } = await sb.from('crm_opportunities').update(updateData).eq('id', opportunityId);
  if (error) return { success: false, error: error.message };

  // Record stage history
  await sb.from('crm_opportunity_stage_history').insert({
    empresa_id: empresaId,
    opportunity_id: opportunityId,
    from_stage_id: fromStageId,
    to_stage_id: toStageId,
  });

  // Run automations
  await runStageAutomations(empresaId, toStageId, opportunityId);

  return { success: true };
}

export async function winOpportunity(id: string, dto: { won_notes?: string; actual_close_date?: string }) {
  const sb = getClient();
  const { data, error } = await sb.from('crm_opportunities').update({
    status: 'won',
    won_notes: dto.won_notes || null,
    actual_close_date: dto.actual_close_date || new Date().toISOString().split('T')[0],
  }).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function loseOpportunity(id: string, dto: { loss_reason_id: string; loss_notes?: string; actual_close_date?: string }) {
  const sb = getClient();
  const { data, error } = await sb.from('crm_opportunities').update({
    status: 'lost',
    loss_reason_id: dto.loss_reason_id,
    loss_notes: dto.loss_notes || null,
    actual_close_date: dto.actual_close_date || new Date().toISOString().split('T')[0],
  }).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// =====================================================
// ACTIVITIES
// =====================================================

export interface ActivityRecord {
  id: string;
  type: string;
  title: string;
  description: string | null;
  due_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  priority: string;
  status: string;
  owner_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  is_automated: boolean;
  created_at: string;
  lead?: { id: string; nome: string } | null;
  opportunity?: { id: string; title: string } | null;
}

export async function listActivities(empresaId: string, filters?: {
  type?: string; status?: string; owner_id?: string;
  lead_id?: string; opportunity_id?: string;
  due_filter?: string; search?: string;
  page?: number; pageSize?: number;
}) {
  const sb = getClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 30;
  const offset = (page - 1) * pageSize;

  let q = sb.from('crm_activities')
    .select(`
      *,
      lead:crm_leads(id,nome),
      opportunity:crm_opportunities(id,title)
    `, { count: 'exact' })
    .eq('empresa_id', empresaId)
    .range(offset, offset + pageSize - 1);

  if (filters?.type && filters.type !== 'all') q = q.eq('type', filters.type);
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters?.owner_id && filters.owner_id !== 'all') q = q.eq('owner_id', filters.owner_id);
  if (filters?.lead_id) q = q.eq('lead_id', filters.lead_id);
  if (filters?.opportunity_id) q = q.eq('opportunity_id', filters.opportunity_id);
  if (filters?.search) q = q.ilike('title', `%${filters.search}%`);

  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  if (filters?.due_filter === 'today') {
    q = q.gte('due_at', today).lt('due_at', today + 'T23:59:59').eq('status', 'pending');
  } else if (filters?.due_filter === 'overdue') {
    q = q.lt('due_at', today).eq('status', 'pending');
  } else if (filters?.due_filter === 'week') {
    q = q.gte('due_at', today).lte('due_at', weekEnd + 'T23:59:59').eq('status', 'pending');
  }

  q = q.order('due_at', { ascending: true, nullsFirst: false });

  const { data, error, count } = await q;
  if (error) { console.warn('listActivities:', error.message); return { data: [], total: 0, page, pageSize }; }
  return { data: (data || []) as ActivityRecord[], total: count || 0, page, pageSize };
}

export async function getActivityKPIs(empresaId: string) {
  const sb = getClient();
  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const [todayRes, overdueRes, weekRes, completedRes] = await Promise.all([
    sb.from('crm_activities').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'pending').gte('due_at', today).lt('due_at', today + 'T23:59:59'),
    sb.from('crm_activities').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'pending').lt('due_at', today),
    sb.from('crm_activities').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'pending').gte('due_at', today).lte('due_at', weekEnd + 'T23:59:59'),
    sb.from('crm_activities').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'completed'),
  ]);

  return {
    today: todayRes.count || 0,
    overdue: overdueRes.count || 0,
    thisWeek: weekRes.count || 0,
    completed: completedRes.count || 0,
  };
}

export async function createActivity(empresaId: string, dto: {
  type: string; title: string; description?: string; due_at?: string;
  priority?: string; owner_id?: string; lead_id?: string; opportunity_id?: string;
  is_automated?: boolean;
}) {
  const sb = getClient();
  const insert = {
    empresa_id: empresaId,
    type: dto.type,
    title: dto.title,
    description: dto.description || null,
    due_at: dto.due_at || null,
    priority: dto.priority || 'normal',
    owner_id: cleanUuid(dto.owner_id),
    lead_id: cleanUuid(dto.lead_id),
    opportunity_id: cleanUuid(dto.opportunity_id),
    is_automated: dto.is_automated || false,
  };

  const { data, error } = await sb.from('crm_activities').insert(insert).select().single();
  if (error) return { success: false, error: error.message };

  // Update next_activity_at on lead/opportunity
  if (insert.due_at) {
    if (insert.lead_id) {
      await sb.from('crm_leads').update({ next_activity_at: insert.due_at }).eq('id', insert.lead_id);
    }
    if (insert.opportunity_id) {
      await sb.from('crm_opportunities').update({ next_activity_at: insert.due_at }).eq('id', insert.opportunity_id);
    }
  }

  return { success: true, data };
}

export async function updateActivity(id: string, dto: Record<string, unknown>) {
  const sb = getClient();
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined) {
      if (['owner_id', 'lead_id', 'opportunity_id'].includes(k)) clean[k] = cleanUuid(v);
      else clean[k] = v === '' ? null : v;
    }
  }
  const { data, error } = await sb.from('crm_activities').update(clean).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function completeActivity(id: string, empresaId: string) {
  const sb = getClient();
  const { data, error } = await sb.from('crm_activities').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', id).select().single();

  if (error) return { success: false, error: error.message };

  // Update next_activity_at with next pending activity
  const activity = data as ActivityRecord;
  if (activity.lead_id || activity.opportunity_id) {
    await updateNextActivity(empresaId, activity.lead_id || undefined, activity.opportunity_id || undefined);
  }

  return { success: true, data };
}

export async function cancelActivity(id: string) {
  const sb = getClient();
  const { data, error } = await sb.from('crm_activities').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// =====================================================
// HELPERS
// =====================================================

async function updateNextActivity(empresaId: string, leadId?: string, opportunityId?: string) {
  const sb = getClient();

  if (leadId) {
    const { data } = await sb.from('crm_activities')
      .select('due_at')
      .eq('lead_id', leadId)
      .eq('status', 'pending')
      .not('due_at', 'is', null)
      .order('due_at')
      .limit(1);
    const nextDate = data?.[0]?.due_at || null;
    await sb.from('crm_leads').update({ next_activity_at: nextDate }).eq('id', leadId);
  }

  if (opportunityId) {
    const { data } = await sb.from('crm_activities')
      .select('due_at')
      .eq('opportunity_id', opportunityId)
      .eq('status', 'pending')
      .not('due_at', 'is', null)
      .order('due_at')
      .limit(1);
    const nextDate = data?.[0]?.due_at || null;
    await sb.from('crm_opportunities').update({ next_activity_at: nextDate }).eq('id', opportunityId);
  }
}

async function runStageAutomations(empresaId: string, stageId: string, opportunityId: string) {
  const sb = getClient();
  const { data: automations } = await sb
    .from('crm_stage_automations')
    .select('*')
    .eq('stage_id', stageId)
    .eq('is_active', true);

  if (!automations || automations.length === 0) return;

  for (const auto of automations) {
    if (auto.action_type === 'create_task') {
      const dueAt = new Date(Date.now() + (auto.task_due_days || 1) * 86400000).toISOString();
      await sb.from('crm_activities').insert({
        empresa_id: empresaId,
        type: 'task',
        title: auto.task_title || 'Tarefa automática',
        description: auto.task_description || null,
        due_at: dueAt,
        priority: 'normal',
        opportunity_id: opportunityId,
        is_automated: true,
      });
    }
    // notify_owner is handled client-side via toast
  }
}

// =====================================================
// TAGS
// =====================================================

export async function listTags(empresaId: string) {
  const sb = getClient();
  const { data, error } = await sb.from('crm_tags').select('*').eq('empresa_id', empresaId).order('name');
  if (error) { console.warn('listTags:', error.message); return []; }
  return data || [];
}

export async function createTag(empresaId: string, dto: { name: string; color?: string }) {
  const sb = getClient();
  const { data, error } = await sb.from('crm_tags').insert({ empresa_id: empresaId, ...dto }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// =====================================================
// SELLERS (for owner selection)
// =====================================================

export async function listSellers(empresaId: string) {
  const sb = getClient();
  const { data, error } = await sb.from('vendedores').select('id,nome').eq('empresa_id', empresaId).order('nome');
  if (error) { console.warn('listSellers:', error.message); return []; }
  return data || [];
}
