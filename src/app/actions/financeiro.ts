'use server';

import { getTenantClient } from '@/shared/lib/supabase/tenant.server';

// =====================================================
// Types (serializable for server actions)
// =====================================================

export interface FinanceiroListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  fornecedor_id?: string;
  cliente_id?: string;
  plano_conta_id?: string;
  centro_custo_id?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  data_emissao_inicio?: string;
  data_emissao_fim?: string;
  valor_min?: number;
  valor_max?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActionResult<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// =====================================================
// Helpers
// =====================================================

function getClient() {
  return getTenantClient('default');
}

function isTableError(error: { message: string } | null): boolean {
  if (!error) return false;
  const m = error.message;
  return (
    m.includes('Could not find the table') ||
    (m.includes('relation') && m.includes('does not exist')) ||
    m.includes('permission denied')
  );
}

function emptyPage<T>(page: number, pageSize: number): PaginatedResult<T> {
  return { data: [], total: 0, page, pageSize, totalPages: 0 };
}

async function writeAuditLog(
  empresaId: string,
  entityType: string,
  entityId: string,
  action: string,
  changes?: { before?: unknown; after?: unknown },
  metadata?: Record<string, unknown>
) {
  try {
    const supabase = getClient();
    await supabase.from('finance_audit_logs').insert({
      empresa_id: empresaId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      changes: changes || null,
      metadata: metadata || null,
    });
  } catch {
    // Audit log failure should not break the main operation
  }
}

// =====================================================
// Contas a Pagar
// =====================================================

export async function listContasPagar(
  empresaId: string,
  params?: FinanceiroListParams
): Promise<PaginatedResult<Record<string, unknown>>> {
  const supabase = getClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('contas_pagar')
    .select('*, fornecedor:fornecedores(id, razao_social)', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order(params?.sortBy || 'data_vencimento', { ascending: (params?.sortOrder || 'asc') === 'asc' })
    .range(offset, offset + pageSize - 1);

  if (params?.status) query = query.eq('status', params.status);
  if (params?.fornecedor_id) query = query.eq('fornecedor_id', params.fornecedor_id);
  if (params?.plano_conta_id) query = query.eq('plano_conta_id', params.plano_conta_id);
  if (params?.centro_custo_id) query = query.eq('centro_custo_id', params.centro_custo_id);
  if (params?.data_vencimento_inicio) query = query.gte('data_vencimento', params.data_vencimento_inicio);
  if (params?.data_vencimento_fim) query = query.lte('data_vencimento', params.data_vencimento_fim);
  if (params?.data_emissao_inicio) query = query.gte('data_emissao', params.data_emissao_inicio);
  if (params?.data_emissao_fim) query = query.lte('data_emissao', params.data_emissao_fim);
  if (params?.valor_min) query = query.gte('valor_original', params.valor_min);
  if (params?.valor_max) query = query.lte('valor_original', params.valor_max);
  if (params?.search) query = query.ilike('descricao', `%${params.search}%`);

  const { data, error, count } = await query;
  if (error) {
    if (isTableError(error)) return emptyPage(page, pageSize);
    throw new Error(error.message);
  }

  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getContaPagar(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('contas_pagar')
    .select('*, fornecedor:fornecedores(id, razao_social, cpf_cnpj), plano_conta:plano_contas(id, codigo, descricao), centro_custo:centros_custo(id, codigo, descricao)')
    .eq('id', id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function createContaPagar(
  empresaId: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();
  // Clean empty string UUIDs
  const cleaned = { ...dto };
  for (const key of ['fornecedor_id', 'plano_conta_id', 'centro_custo_id', 'forma_pagamento_id']) {
    if (cleaned[key] === '') delete cleaned[key];
  }

  const { data, error } = await supabase
    .from('contas_pagar')
    .insert({ ...cleaned, empresa_id: empresaId, status: 'aberta' })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog(empresaId, 'contas_pagar', data.id, 'create', { after: data });
  return { data, message: 'Conta a pagar criada com sucesso' };
}

export async function updateContaPagar(
  id: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();

  const { data: before } = await supabase.from('contas_pagar').select('*').eq('id', id).single();
  if (!before) return { error: 'Conta não encontrada' };

  // Prevent editing paid/canceled
  if (before.status === 'paga' || before.status === 'cancelada') {
    return { error: `Não é possível editar conta com status "${before.status}"` };
  }

  const cleaned = { ...dto, updated_at: new Date().toISOString() };
  for (const key of ['fornecedor_id', 'plano_conta_id', 'centro_custo_id', 'forma_pagamento_id']) {
    if (cleaned[key] === '') delete cleaned[key];
  }
  delete cleaned['id'];

  const { data, error } = await supabase
    .from('contas_pagar')
    .update(cleaned)
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog(before.empresa_id, 'contas_pagar', id, 'update', { before, after: data });
  return { data, message: 'Conta a pagar atualizada com sucesso' };
}

export async function deleteContaPagar(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: before } = await supabase.from('contas_pagar').select('*').eq('id', id).single();
  if (!before) return { error: 'Conta não encontrada' };

  if (before.status !== 'aberta' && before.status !== 'cancelada') {
    return { error: 'Só é possível excluir contas com status "aberta" ou "cancelada"' };
  }

  const { error } = await supabase.from('contas_pagar').delete().eq('id', id);
  if (error) return { error: error.message };

  await writeAuditLog(before.empresa_id, 'contas_pagar', id, 'delete', { before });
  return { message: 'Conta a pagar excluída com sucesso' };
}

export async function pagarConta(
  id: string,
  dto: {
    data_pagamento: string;
    valor_pago: number;
    conta_bancaria_id: string;
    valor_juros?: number;
    valor_multa?: number;
    valor_desconto?: number;
    forma_pagamento?: string;
    observacoes?: string;
  }
): Promise<ActionResult> {
  const supabase = getClient();

  const { data: conta, error: fetchError } = await supabase
    .from('contas_pagar')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !conta) return { error: 'Conta não encontrada' };
  if (conta.status === 'paga') return { error: 'Conta já está paga' };
  if (conta.status === 'cancelada') return { error: 'Conta cancelada não pode ser paga' };

  const valorTotal =
    conta.valor_original + (dto.valor_juros || 0) + (dto.valor_multa || 0) - (dto.valor_desconto || 0);
  const novoPago = (conta.valor_pago || 0) + dto.valor_pago;
  const novoStatus = novoPago >= valorTotal ? 'paga' : 'parcial';

  const { data, error } = await supabase
    .from('contas_pagar')
    .update({
      data_pagamento: dto.data_pagamento,
      valor_pago: novoPago,
      valor_juros: dto.valor_juros || conta.valor_juros,
      valor_multa: dto.valor_multa || conta.valor_multa,
      valor_desconto: dto.valor_desconto || conta.valor_desconto,
      conta_bancaria_id: dto.conta_bancaria_id,
      status: novoStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  // Register AP payment record
  await supabase.from('ap_payments').insert({
    empresa_id: conta.empresa_id,
    conta_pagar_id: id,
    conta_bancaria_id: dto.conta_bancaria_id,
    data_pagamento: dto.data_pagamento,
    valor_pago: dto.valor_pago,
    valor_juros: dto.valor_juros || 0,
    valor_multa: dto.valor_multa || 0,
    valor_desconto: dto.valor_desconto || 0,
    forma_pagamento: dto.forma_pagamento,
    observacoes: dto.observacoes,
  });

  // Register bank movement
  const { data: cb } = await supabase
    .from('contas_bancarias')
    .select('saldo_atual')
    .eq('id', dto.conta_bancaria_id)
    .single();

  await supabase.from('movimentacoes_bancarias').insert({
    empresa_id: conta.empresa_id,
    conta_bancaria_id: dto.conta_bancaria_id,
    tipo: 'debito',
    data_movimentacao: dto.data_pagamento,
    valor: dto.valor_pago,
    saldo_anterior: cb?.saldo_atual || 0,
    saldo_posterior: (cb?.saldo_atual || 0) - dto.valor_pago,
    conta_pagar_id: id,
    descricao: `Pagamento - ${conta.numero_documento || conta.descricao}`,
  });

  await supabase
    .from('contas_bancarias')
    .update({ saldo_atual: (cb?.saldo_atual || 0) - dto.valor_pago })
    .eq('id', dto.conta_bancaria_id);

  await writeAuditLog(conta.empresa_id, 'contas_pagar', id, 'pay', { before: conta, after: data }, { valor_pago: dto.valor_pago });
  return { data, message: 'Pagamento registrado com sucesso' };
}

export async function estornarPagamento(
  paymentId: string,
  motivo: string
): Promise<ActionResult> {
  const supabase = getClient();

  const { data: payment } = await supabase
    .from('ap_payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (!payment) return { error: 'Pagamento não encontrado' };
  if (payment.estornado) return { error: 'Pagamento já estornado' };

  // Mark payment as reversed
  await supabase.from('ap_payments').update({
    estornado: true,
    estorno_motivo: motivo,
    estorno_data: new Date().toISOString(),
  }).eq('id', paymentId);

  // Update conta_pagar
  const { data: conta } = await supabase.from('contas_pagar').select('*').eq('id', payment.conta_pagar_id).single();
  if (conta) {
    const novoValorPago = Math.max(0, (conta.valor_pago || 0) - payment.valor_pago);
    const novoStatus = novoValorPago <= 0 ? 'aberta' : 'parcial';

    await supabase.from('contas_pagar').update({
      valor_pago: novoValorPago,
      status: novoStatus,
      data_pagamento: novoStatus === 'aberta' ? null : conta.data_pagamento,
      updated_at: new Date().toISOString(),
    }).eq('id', payment.conta_pagar_id);

    // Reverse bank movement
    if (payment.conta_bancaria_id) {
      const { data: cb } = await supabase.from('contas_bancarias').select('saldo_atual').eq('id', payment.conta_bancaria_id).single();
      const novoSaldo = (cb?.saldo_atual || 0) + payment.valor_pago;

      await supabase.from('movimentacoes_bancarias').insert({
        empresa_id: conta.empresa_id,
        conta_bancaria_id: payment.conta_bancaria_id,
        tipo: 'credito',
        data_movimentacao: new Date().toISOString().split('T')[0],
        valor: payment.valor_pago,
        saldo_anterior: cb?.saldo_atual || 0,
        saldo_posterior: novoSaldo,
        descricao: `Estorno pagamento - ${conta.numero_documento || conta.descricao}`,
      });

      await supabase.from('contas_bancarias').update({ saldo_atual: novoSaldo }).eq('id', payment.conta_bancaria_id);
    }

    await writeAuditLog(conta.empresa_id, 'contas_pagar', conta.id, 'reverse', { before: conta }, { motivo, payment_id: paymentId });
  }

  return { message: 'Pagamento estornado com sucesso' };
}

// =====================================================
// Contas a Receber
// =====================================================

export async function listContasReceber(
  empresaId: string,
  params?: FinanceiroListParams
): Promise<PaginatedResult<Record<string, unknown>>> {
  const supabase = getClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('contas_receber')
    .select('*, cliente:clientes(id, nome)', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order(params?.sortBy || 'data_vencimento', { ascending: (params?.sortOrder || 'asc') === 'asc' })
    .range(offset, offset + pageSize - 1);

  if (params?.status) query = query.eq('status', params.status);
  if (params?.cliente_id) query = query.eq('cliente_id', params.cliente_id);
  if (params?.plano_conta_id) query = query.eq('plano_conta_id', params.plano_conta_id);
  if (params?.centro_custo_id) query = query.eq('centro_custo_id', params.centro_custo_id);
  if (params?.data_vencimento_inicio) query = query.gte('data_vencimento', params.data_vencimento_inicio);
  if (params?.data_vencimento_fim) query = query.lte('data_vencimento', params.data_vencimento_fim);
  if (params?.data_emissao_inicio) query = query.gte('data_emissao', params.data_emissao_inicio);
  if (params?.data_emissao_fim) query = query.lte('data_emissao', params.data_emissao_fim);
  if (params?.valor_min) query = query.gte('valor_original', params.valor_min);
  if (params?.valor_max) query = query.lte('valor_original', params.valor_max);
  if (params?.search) query = query.ilike('descricao', `%${params.search}%`);

  const { data, error, count } = await query;
  if (error) {
    if (isTableError(error)) return emptyPage(page, pageSize);
    throw new Error(error.message);
  }

  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getContaReceber(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('contas_receber')
    .select('*, cliente:clientes(id, nome, cpf_cnpj), plano_conta:plano_contas(id, codigo, descricao), centro_custo:centros_custo(id, codigo, descricao)')
    .eq('id', id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function createContaReceber(
  empresaId: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();
  const cleaned = { ...dto };
  for (const key of ['cliente_id', 'plano_conta_id', 'centro_custo_id', 'forma_pagamento_id']) {
    if (cleaned[key] === '') delete cleaned[key];
  }

  const { data, error } = await supabase
    .from('contas_receber')
    .insert({ ...cleaned, empresa_id: empresaId, status: 'aberta' })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog(empresaId, 'contas_receber', data.id, 'create', { after: data });
  return { data, message: 'Conta a receber criada com sucesso' };
}

export async function updateContaReceber(
  id: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();

  const { data: before } = await supabase.from('contas_receber').select('*').eq('id', id).single();
  if (!before) return { error: 'Conta não encontrada' };

  if (before.status === 'recebida' || before.status === 'cancelada') {
    return { error: `Não é possível editar conta com status "${before.status}"` };
  }

  const cleaned = { ...dto, updated_at: new Date().toISOString() };
  for (const key of ['cliente_id', 'plano_conta_id', 'centro_custo_id', 'forma_pagamento_id']) {
    if (cleaned[key] === '') delete cleaned[key];
  }
  delete cleaned['id'];

  const { data, error } = await supabase
    .from('contas_receber')
    .update(cleaned)
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog(before.empresa_id, 'contas_receber', id, 'update', { before, after: data });
  return { data, message: 'Conta a receber atualizada com sucesso' };
}

export async function deleteContaReceber(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: before } = await supabase.from('contas_receber').select('*').eq('id', id).single();
  if (!before) return { error: 'Conta não encontrada' };

  if (before.status !== 'aberta' && before.status !== 'cancelada') {
    return { error: 'Só é possível excluir contas com status "aberta" ou "cancelada"' };
  }

  const { error } = await supabase.from('contas_receber').delete().eq('id', id);
  if (error) return { error: error.message };

  await writeAuditLog(before.empresa_id, 'contas_receber', id, 'delete', { before });
  return { message: 'Conta a receber excluída com sucesso' };
}

export async function receberConta(
  id: string,
  dto: {
    data_recebimento: string;
    valor_recebido: number;
    conta_bancaria_id: string;
    valor_juros?: number;
    valor_multa?: number;
    valor_desconto?: number;
    forma_pagamento?: string;
    observacoes?: string;
  }
): Promise<ActionResult> {
  const supabase = getClient();

  const { data: conta, error: fetchError } = await supabase
    .from('contas_receber')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !conta) return { error: 'Conta não encontrada' };
  if (conta.status === 'recebida') return { error: 'Conta já está recebida' };
  if (conta.status === 'cancelada') return { error: 'Conta cancelada não pode ser recebida' };

  const valorTotal =
    conta.valor_original + (dto.valor_juros || 0) + (dto.valor_multa || 0) - (dto.valor_desconto || 0);
  const novoRecebido = (conta.valor_recebido || 0) + dto.valor_recebido;
  const novoStatus = novoRecebido >= valorTotal ? 'recebida' : 'parcial';

  const { data, error } = await supabase
    .from('contas_receber')
    .update({
      data_recebimento: dto.data_recebimento,
      valor_recebido: novoRecebido,
      valor_juros: dto.valor_juros || conta.valor_juros,
      valor_multa: dto.valor_multa || conta.valor_multa,
      valor_desconto: dto.valor_desconto || conta.valor_desconto,
      conta_bancaria_id: dto.conta_bancaria_id,
      status: novoStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  // Register AR receipt record
  await supabase.from('ar_receipts').insert({
    empresa_id: conta.empresa_id,
    conta_receber_id: id,
    conta_bancaria_id: dto.conta_bancaria_id,
    data_recebimento: dto.data_recebimento,
    valor_recebido: dto.valor_recebido,
    valor_juros: dto.valor_juros || 0,
    valor_multa: dto.valor_multa || 0,
    valor_desconto: dto.valor_desconto || 0,
    forma_pagamento: dto.forma_pagamento,
    observacoes: dto.observacoes,
  });

  // Register bank movement
  const { data: cb } = await supabase
    .from('contas_bancarias')
    .select('saldo_atual')
    .eq('id', dto.conta_bancaria_id)
    .single();

  await supabase.from('movimentacoes_bancarias').insert({
    empresa_id: conta.empresa_id,
    conta_bancaria_id: dto.conta_bancaria_id,
    tipo: 'credito',
    data_movimentacao: dto.data_recebimento,
    valor: dto.valor_recebido,
    saldo_anterior: cb?.saldo_atual || 0,
    saldo_posterior: (cb?.saldo_atual || 0) + dto.valor_recebido,
    conta_receber_id: id,
    descricao: `Recebimento - ${conta.numero_documento || conta.descricao}`,
  });

  await supabase
    .from('contas_bancarias')
    .update({ saldo_atual: (cb?.saldo_atual || 0) + dto.valor_recebido })
    .eq('id', dto.conta_bancaria_id);

  await writeAuditLog(conta.empresa_id, 'contas_receber', id, 'receive', { before: conta, after: data }, { valor_recebido: dto.valor_recebido });
  return { data, message: 'Recebimento registrado com sucesso' };
}

export async function estornarRecebimento(
  receiptId: string,
  motivo: string
): Promise<ActionResult> {
  const supabase = getClient();

  const { data: receipt } = await supabase
    .from('ar_receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (!receipt) return { error: 'Recebimento não encontrado' };
  if (receipt.estornado) return { error: 'Recebimento já estornado' };

  await supabase.from('ar_receipts').update({
    estornado: true,
    estorno_motivo: motivo,
    estorno_data: new Date().toISOString(),
  }).eq('id', receiptId);

  const { data: conta } = await supabase.from('contas_receber').select('*').eq('id', receipt.conta_receber_id).single();
  if (conta) {
    const novoRecebido = Math.max(0, (conta.valor_recebido || 0) - receipt.valor_recebido);
    const novoStatus = novoRecebido <= 0 ? 'aberta' : 'parcial';

    await supabase.from('contas_receber').update({
      valor_recebido: novoRecebido,
      status: novoStatus,
      data_recebimento: novoStatus === 'aberta' ? null : conta.data_recebimento,
      updated_at: new Date().toISOString(),
    }).eq('id', receipt.conta_receber_id);

    if (receipt.conta_bancaria_id) {
      const { data: cb } = await supabase.from('contas_bancarias').select('saldo_atual').eq('id', receipt.conta_bancaria_id).single();
      const novoSaldo = (cb?.saldo_atual || 0) - receipt.valor_recebido;

      await supabase.from('movimentacoes_bancarias').insert({
        empresa_id: conta.empresa_id,
        conta_bancaria_id: receipt.conta_bancaria_id,
        tipo: 'debito',
        data_movimentacao: new Date().toISOString().split('T')[0],
        valor: receipt.valor_recebido,
        saldo_anterior: cb?.saldo_atual || 0,
        saldo_posterior: novoSaldo,
        descricao: `Estorno recebimento - ${conta.numero_documento || conta.descricao}`,
      });

      await supabase.from('contas_bancarias').update({ saldo_atual: novoSaldo }).eq('id', receipt.conta_bancaria_id);
    }

    await writeAuditLog(conta.empresa_id, 'contas_receber', conta.id, 'reverse', { before: conta }, { motivo, receipt_id: receiptId });
  }

  return { message: 'Recebimento estornado com sucesso' };
}

// =====================================================
// Receipts/Payments History
// =====================================================

export async function listARReceipts(contaReceberId: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('ar_receipts')
    .select('*')
    .eq('conta_receber_id', contaReceberId)
    .order('created_at', { ascending: false });

  if (error) { if (isTableError(error)) return []; throw new Error(error.message); }
  return (data || []) as Record<string, unknown>[];
}

export async function listAPPayments(contaPagarId: string): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('ap_payments')
    .select('*')
    .eq('conta_pagar_id', contaPagarId)
    .order('created_at', { ascending: false });

  if (error) { if (isTableError(error)) return []; throw new Error(error.message); }
  return (data || []) as Record<string, unknown>[];
}

// =====================================================
// Contas Bancárias
// =====================================================

export async function listContasBancarias(
  empresaId: string
): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('contas_bancarias')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('banco_nome');

  if (error) {
    if (isTableError(error)) return [];
    throw new Error(error.message);
  }
  return (data || []) as Record<string, unknown>[];
}

export async function createContaBancaria(
  empresaId: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();
  const cleaned = { ...dto };
  if (cleaned['filial_id'] === '') delete cleaned['filial_id'];

  const { data, error } = await supabase
    .from('contas_bancarias')
    .insert({
      ...cleaned,
      empresa_id: empresaId,
      saldo_atual: (dto.saldo_inicial as number) || 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  await writeAuditLog(empresaId, 'contas_bancarias', data.id, 'create', { after: data });
  return { data, message: 'Conta bancária criada com sucesso' };
}

export async function updateContaBancaria(
  id: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();
  const { data: before } = await supabase.from('contas_bancarias').select('*').eq('id', id).single();
  if (!before) return { error: 'Conta bancária não encontrada' };

  const cleaned = { ...dto, updated_at: new Date().toISOString() };
  if (cleaned['filial_id'] === '') delete cleaned['filial_id'];
  delete cleaned['id'];

  const { data, error } = await supabase.from('contas_bancarias').update(cleaned).eq('id', id).select().single();
  if (error) return { error: error.message };

  await writeAuditLog(before.empresa_id, 'contas_bancarias', id, 'update', { before, after: data });
  return { data, message: 'Conta bancária atualizada com sucesso' };
}

// =====================================================
// Movimentações Bancárias
// =====================================================

export async function listMovimentacoesBancarias(
  empresaId: string,
  contaBancariaId?: string,
  params?: { page?: number; pageSize?: number; dataInicio?: string; dataFim?: string }
): Promise<PaginatedResult<Record<string, unknown>>> {
  const supabase = getClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 30;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('movimentacoes_bancarias')
    .select('*, conta_bancaria:contas_bancarias(id, banco_nome, agencia, conta)', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .order('data_movimentacao', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (contaBancariaId) query = query.eq('conta_bancaria_id', contaBancariaId);
  if (params?.dataInicio) query = query.gte('data_movimentacao', params.dataInicio);
  if (params?.dataFim) query = query.lte('data_movimentacao', params.dataFim);

  const { data, error, count } = await query;
  if (error) {
    if (isTableError(error)) return emptyPage(page, pageSize);
    throw new Error(error.message);
  }

  return {
    data: (data || []) as Record<string, unknown>[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function createMovimentacaoBancaria(
  empresaId: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();
  const cleaned = { ...dto };
  for (const key of ['plano_conta_id', 'centro_custo_id']) {
    if (cleaned[key] === '') delete cleaned[key];
  }

  const { data: cb } = await supabase
    .from('contas_bancarias')
    .select('saldo_atual')
    .eq('id', dto.conta_bancaria_id as string)
    .single();

  const saldoAnterior = cb?.saldo_atual || 0;
  const valor = dto.valor as number;
  const tipo = dto.tipo as string;
  const saldoPosterior = tipo === 'credito' ? saldoAnterior + valor : saldoAnterior - valor;

  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .insert({
      ...cleaned,
      empresa_id: empresaId,
      saldo_anterior: saldoAnterior,
      saldo_posterior: saldoPosterior,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase
    .from('contas_bancarias')
    .update({ saldo_atual: saldoPosterior })
    .eq('id', dto.conta_bancaria_id as string);

  await writeAuditLog(empresaId, 'movimentacoes_bancarias', data.id, 'create', { after: data });
  return { data, message: 'Movimentação registrada com sucesso' };
}

// =====================================================
// Plano de Contas
// =====================================================

export async function listPlanoContas(
  empresaId: string
): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('plano_contas')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('codigo');

  if (error) {
    if (isTableError(error)) return [];
    throw new Error(error.message);
  }
  return (data || []) as Record<string, unknown>[];
}

export async function createPlanoConta(
  empresaId: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();
  const codigo = dto.codigo as string;
  const nivel = codigo.split('.').length;
  const cleaned = { ...dto };
  if (cleaned['conta_pai_id'] === '') delete cleaned['conta_pai_id'];

  const { data, error } = await supabase
    .from('plano_contas')
    .insert({ ...cleaned, empresa_id: empresaId, nivel, ativo: true })
    .select()
    .single();

  if (error) return { error: error.message };
  await writeAuditLog(empresaId, 'plano_contas', data.id, 'create', { after: data });
  return { data, message: 'Plano de conta criado com sucesso' };
}

export async function updatePlanoConta(
  id: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();
  const { data: before } = await supabase.from('plano_contas').select('*').eq('id', id).single();
  if (!before) return { error: 'Conta contábil não encontrada' };

  const cleaned = { ...dto, updated_at: new Date().toISOString() };
  if (cleaned['conta_pai_id'] === '') delete cleaned['conta_pai_id'];
  delete cleaned['id'];
  if (cleaned.codigo) cleaned.nivel = (cleaned.codigo as string).split('.').length;

  const { data, error } = await supabase.from('plano_contas').update(cleaned).eq('id', id).select().single();
  if (error) return { error: error.message };

  await writeAuditLog(before.empresa_id, 'plano_contas', id, 'update', { before, after: data });
  return { data, message: 'Conta contábil atualizada com sucesso' };
}

export async function deletePlanoConta(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: before } = await supabase.from('plano_contas').select('*').eq('id', id).single();
  if (!before) return { error: 'Conta contábil não encontrada' };

  // Check for child accounts
  const { count: childCount } = await supabase.from('plano_contas').select('id', { count: 'exact', head: true }).eq('conta_pai_id', id);
  if (childCount && childCount > 0) return { error: 'Não é possível excluir conta com subcontas' };

  // Check for movements
  const { count: movCountCP } = await supabase.from('contas_pagar').select('id', { count: 'exact', head: true }).eq('plano_conta_id', id);
  const { count: movCountCR } = await supabase.from('contas_receber').select('id', { count: 'exact', head: true }).eq('plano_conta_id', id);
  if ((movCountCP || 0) + (movCountCR || 0) > 0) return { error: 'Não é possível excluir conta com movimentações' };

  const { error } = await supabase.from('plano_contas').delete().eq('id', id);
  if (error) return { error: error.message };

  await writeAuditLog(before.empresa_id, 'plano_contas', id, 'delete', { before });
  return { message: 'Conta contábil excluída com sucesso' };
}

// =====================================================
// Centros de Custo
// =====================================================

export async function listCentrosCusto(
  empresaId: string
): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('centros_custo')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('codigo');

  if (error) {
    if (isTableError(error)) return [];
    throw new Error(error.message);
  }
  return (data || []) as Record<string, unknown>[];
}

export async function createCentroCusto(
  empresaId: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();
  const cleaned = { ...dto };
  if (cleaned['centro_pai_id'] === '') delete cleaned['centro_pai_id'];

  const { data, error } = await supabase
    .from('centros_custo')
    .insert({ ...cleaned, empresa_id: empresaId, ativo: true })
    .select()
    .single();

  if (error) return { error: error.message };
  await writeAuditLog(empresaId, 'centros_custo', data.id, 'create', { after: data });
  return { data, message: 'Centro de custo criado com sucesso' };
}

export async function updateCentroCusto(
  id: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();
  const { data: before } = await supabase.from('centros_custo').select('*').eq('id', id).single();
  if (!before) return { error: 'Centro de custo não encontrado' };

  const cleaned = { ...dto, updated_at: new Date().toISOString() };
  if (cleaned['centro_pai_id'] === '') delete cleaned['centro_pai_id'];
  delete cleaned['id'];

  const { data, error } = await supabase.from('centros_custo').update(cleaned).eq('id', id).select().single();
  if (error) return { error: error.message };

  await writeAuditLog(before.empresa_id, 'centros_custo', id, 'update', { before, after: data });
  return { data, message: 'Centro de custo atualizado com sucesso' };
}

export async function deleteCentroCusto(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data: before } = await supabase.from('centros_custo').select('*').eq('id', id).single();
  if (!before) return { error: 'Centro de custo não encontrado' };

  const { count: movCountCP } = await supabase.from('contas_pagar').select('id', { count: 'exact', head: true }).eq('centro_custo_id', id);
  const { count: movCountCR } = await supabase.from('contas_receber').select('id', { count: 'exact', head: true }).eq('centro_custo_id', id);
  if ((movCountCP || 0) + (movCountCR || 0) > 0) return { error: 'Não é possível excluir centro de custo com movimentações' };

  const { error } = await supabase.from('centros_custo').update({ ativo: false, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };

  await writeAuditLog(before.empresa_id, 'centros_custo', id, 'delete', { before });
  return { message: 'Centro de custo desativado com sucesso' };
}

// =====================================================
// Fluxo de Caixa
// =====================================================

export async function listFluxoCaixa(
  empresaId: string,
  dataInicio: string,
  dataFim: string
): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('fluxo_caixa')
    .select('*')
    .eq('empresa_id', empresaId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data');

  if (error) {
    if (isTableError(error)) return [];
    throw new Error(error.message);
  }
  return (data || []) as Record<string, unknown>[];
}

export async function createFluxoCaixa(
  empresaId: string,
  dto: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = getClient();
  const cleaned = { ...dto };
  if (cleaned['conta_bancaria_id'] === '') delete cleaned['conta_bancaria_id'];

  const { data, error } = await supabase
    .from('fluxo_caixa')
    .insert({ ...cleaned, empresa_id: empresaId })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, message: 'Lançamento de fluxo de caixa criado' };
}

export async function getCashFlowProjection(
  empresaId: string,
  dataInicio: string,
  dataFim: string
): Promise<{
  previsto: { data: string; entradas: number; saidas: number; saldo: number }[];
  realizado: { data: string; entradas: number; saidas: number; saldo: number }[];
}> {
  const supabase = getClient();

  // Previsto: parcelas em aberto de AR/AP
  const [arResult, apResult, movResult] = await Promise.all([
    supabase.from('contas_receber').select('data_vencimento, valor_original, valor_recebido, status')
      .eq('empresa_id', empresaId).in('status', ['aberta', 'parcial'])
      .gte('data_vencimento', dataInicio).lte('data_vencimento', dataFim),
    supabase.from('contas_pagar').select('data_vencimento, valor_original, valor_pago, status')
      .eq('empresa_id', empresaId).in('status', ['aberta', 'parcial'])
      .gte('data_vencimento', dataInicio).lte('data_vencimento', dataFim),
    supabase.from('movimentacoes_bancarias').select('data_movimentacao, tipo, valor')
      .eq('empresa_id', empresaId)
      .gte('data_movimentacao', dataInicio).lte('data_movimentacao', dataFim),
  ]);

  // Group by date
  const previstoMap = new Map<string, { entradas: number; saidas: number }>();
  const realizadoMap = new Map<string, { entradas: number; saidas: number }>();

  (arResult.data || []).forEach(item => {
    const date = item.data_vencimento;
    const entry = previstoMap.get(date) || { entradas: 0, saidas: 0 };
    entry.entradas += (item.valor_original || 0) - (item.valor_recebido || 0);
    previstoMap.set(date, entry);
  });

  (apResult.data || []).forEach(item => {
    const date = item.data_vencimento;
    const entry = previstoMap.get(date) || { entradas: 0, saidas: 0 };
    entry.saidas += (item.valor_original || 0) - (item.valor_pago || 0);
    previstoMap.set(date, entry);
  });

  (movResult.data || []).forEach(item => {
    const date = item.data_movimentacao;
    const entry = realizadoMap.get(date) || { entradas: 0, saidas: 0 };
    if (item.tipo === 'credito') entry.entradas += item.valor || 0;
    else entry.saidas += item.valor || 0;
    realizadoMap.set(date, entry);
  });

  const sortedPrevisto = Array.from(previstoMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [data, { entradas, saidas }]) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].saldo : 0;
      acc.push({ data, entradas, saidas, saldo: prev + entradas - saidas });
      return acc;
    }, [] as { data: string; entradas: number; saidas: number; saldo: number }[]);

  const sortedRealizado = Array.from(realizadoMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [data, { entradas, saidas }]) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].saldo : 0;
      acc.push({ data, entradas, saidas, saldo: prev + entradas - saidas });
      return acc;
    }, [] as { data: string; entradas: number; saidas: number; saldo: number }[]);

  return { previsto: sortedPrevisto, realizado: sortedRealizado };
}

// =====================================================
// Resumo Financeiro
// =====================================================

export async function getResumoFinanceiro(
  empresaId: string,
  dataInicio: string,
  dataFim: string
): Promise<{
  total_pagar: number;
  total_receber: number;
  saldo_previsto: number;
  pago: number;
  recebido: number;
  vencidos_pagar: number;
  vencidos_receber: number;
  saldo_contas: number;
}> {
  const supabase = getClient();
  const hoje = new Date().toISOString().split('T')[0];

  const [pagarResult, receberResult, contasResult] = await Promise.all([
    supabase.from('contas_pagar').select('valor_original, valor_pago, status, data_vencimento')
      .eq('empresa_id', empresaId).gte('data_vencimento', dataInicio).lte('data_vencimento', dataFim),
    supabase.from('contas_receber').select('valor_original, valor_recebido, status, data_vencimento')
      .eq('empresa_id', empresaId).gte('data_vencimento', dataInicio).lte('data_vencimento', dataFim),
    supabase.from('contas_bancarias').select('saldo_atual').eq('empresa_id', empresaId).eq('ativo', true),
  ]);

  const pagar = pagarResult.error ? null : pagarResult.data;
  const receber = receberResult.error ? null : receberResult.data;
  const contas = contasResult.error ? null : contasResult.data;

  const totalPagar = pagar?.reduce((s, c) => s + ((c.valor_original || 0) - (c.valor_pago || 0)), 0) || 0;
  const totalReceber = receber?.reduce((s, c) => s + ((c.valor_original || 0) - (c.valor_recebido || 0)), 0) || 0;
  const pago = pagar?.filter((c) => c.status === 'paga').reduce((s, c) => s + (c.valor_original || 0), 0) || 0;
  const recebido = receber?.filter((c) => c.status === 'recebida').reduce((s, c) => s + (c.valor_original || 0), 0) || 0;
  const vencidosPagar = pagar
    ?.filter((c) => c.status !== 'paga' && c.status !== 'cancelada' && c.data_vencimento < hoje)
    .reduce((s, c) => s + ((c.valor_original || 0) - (c.valor_pago || 0)), 0) || 0;
  const vencidosReceber = receber
    ?.filter((c) => c.status !== 'recebida' && c.status !== 'cancelada' && c.data_vencimento < hoje)
    .reduce((s, c) => s + ((c.valor_original || 0) - (c.valor_recebido || 0)), 0) || 0;
  const saldoContas = contas?.reduce((s, c) => s + (c.saldo_atual || 0), 0) || 0;

  return { total_pagar: totalPagar, total_receber: totalReceber, saldo_previsto: totalReceber - totalPagar, pago, recebido, vencidos_pagar: vencidosPagar, vencidos_receber: vencidosReceber, saldo_contas: saldoContas };
}

// =====================================================
// Conciliação Bancária
// =====================================================

export async function listMovimentacoesNaoConciliadas(
  empresaId: string,
  contaBancariaId: string
): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('conta_bancaria_id', contaBancariaId)
    .eq('conciliado', false)
    .order('data_movimentacao', { ascending: false });

  if (error) { if (isTableError(error)) return []; throw new Error(error.message); }
  return (data || []) as Record<string, unknown>[];
}

export async function listBankTransactions(
  empresaId: string,
  contaBancariaId: string,
  params?: { reconciled?: boolean; dataInicio?: string; dataFim?: string }
): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  let query = supabase
    .from('bank_transactions')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('conta_bancaria_id', contaBancariaId)
    .order('data_transacao', { ascending: false });

  if (params?.reconciled !== undefined) query = query.eq('reconciled', params.reconciled);
  if (params?.dataInicio) query = query.gte('data_transacao', params.dataInicio);
  if (params?.dataFim) query = query.lte('data_transacao', params.dataFim);

  const { data, error } = await query;
  if (error) { if (isTableError(error)) return []; throw new Error(error.message); }
  return (data || []) as Record<string, unknown>[];
}

export async function importBankTransactions(
  empresaId: string,
  contaBancariaId: string,
  transactions: {
    data_transacao: string;
    descricao: string;
    valor: number;
    tipo: 'credito' | 'debito';
    referencia?: string;
    categoria?: string;
    saldo_extrato?: number;
  }[]
): Promise<ActionResult> {
  const supabase = getClient();
  const batchId = crypto.randomUUID();

  const rows = transactions.map((tx, i) => ({
    empresa_id: empresaId,
    conta_bancaria_id: contaBancariaId,
    ...tx,
    import_batch_id: batchId,
    linha_csv: i + 1,
  }));

  const { error } = await supabase.from('bank_transactions').insert(rows);
  if (error) return { error: error.message };

  await writeAuditLog(empresaId, 'bank_transactions', batchId, 'import', { after: { count: rows.length } });
  return { data: { batch_id: batchId, count: rows.length }, message: `${rows.length} transações importadas com sucesso` };
}

export async function conciliarMovimentacao(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .update({ conciliado: true, data_compensacao: new Date().toISOString().split('T')[0] })
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, message: 'Movimentação conciliada com sucesso' };
}

export async function conciliarEmLote(ids: string[]): Promise<ActionResult> {
  const supabase = getClient();
  const dataHoje = new Date().toISOString().split('T')[0];

  const results = await Promise.all(
    ids.map((id) =>
      supabase.from('movimentacoes_bancarias')
        .update({ conciliado: true, data_compensacao: dataHoje })
        .eq('id', id)
    )
  );

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) return { error: `${errors.length} movimentações não foram conciliadas` };
  return { message: `${ids.length} movimentações conciliadas com sucesso` };
}

// =====================================================
// Audit Logs
// =====================================================

export async function listAuditLogs(
  entityType: string,
  entityId: string
): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('finance_audit_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) { if (isTableError(error)) return []; throw new Error(error.message); }
  return (data || []) as Record<string, unknown>[];
}

// =====================================================
// Attachments
// =====================================================

export async function listAttachments(
  entityType: string,
  entityId: string
): Promise<Record<string, unknown>[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('finance_attachments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) { if (isTableError(error)) return []; throw new Error(error.message); }
  return (data || []) as Record<string, unknown>[];
}

export async function createAttachment(
  empresaId: string,
  dto: {
    entity_type: string;
    entity_id: string;
    file_name: string;
    file_url: string;
    file_size?: number;
    mime_type?: string;
    descricao?: string;
  }
): Promise<ActionResult> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('finance_attachments')
    .insert({ ...dto, empresa_id: empresaId })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, message: 'Anexo adicionado com sucesso' };
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  const supabase = getClient();
  const { error } = await supabase.from('finance_attachments').delete().eq('id', id);
  if (error) return { error: error.message };
  return { message: 'Anexo removido com sucesso' };
}
