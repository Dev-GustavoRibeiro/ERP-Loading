'use client';

import { useState, useEffect, useCallback } from 'react';
import { fiscalService } from '@/modules/fiscal/services/fiscalService';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import type { NotaFiscal } from '@/modules/fiscal/domain';
import type { FilterNfeValues } from './schemas';

// =====================================================
// NF-e Hooks
// =====================================================

/** Fetches paginated list of NFs with filters */
export function useNotasFiscais(filters: FilterNfeValues = {}) {
  const empresaId = useEmpresaId();
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotas = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const result = await fiscalService.listNotas(empresaId, {
        page,
        pageSize: 20,
        status: filters.status || undefined,
        data_inicio: filters.data_inicio || undefined,
        data_fim: filters.data_fim || undefined,
        search: filters.search || undefined,
        modelo: filters.tipo === 'nfe' ? '55' : filters.tipo === 'nfce' ? '65' : undefined,
      });
      setNotas(result.data as unknown as NotaFiscal[]);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('[useNotasFiscais] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, page, filters.status, filters.tipo, filters.data_inicio, filters.data_fim, filters.search]);

  useEffect(() => {
    fetchNotas();
  }, [fetchNotas]);

  return { notas, total, page, totalPages, loading, setPage, refetch: fetchNotas };
}

/** Fetches single NF by ID */
export function useNotaFiscal(id: string | null) {
  const [nota, setNota] = useState<NotaFiscal | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchNota = useCallback(async () => {
    if (!id) { setNota(null); return; }
    setLoading(true);
    try {
      const result = await fiscalService.getNotaById(id);
      setNota(result as unknown as NotaFiscal);
    } catch (err) {
      console.error('[useNotaFiscal] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchNota();
  }, [fetchNota]);

  return { nota, loading, refetch: fetchNota };
}

/** Fetches KPI stats for the fiscal dashboard */
export function useNfeStats() {
  const empresaId = useEmpresaId();
  const [stats, setStats] = useState({
    total: 0,
    autorizadas: 0,
    digitacao: 0,
    canceladas: 0,
    valorFaturado: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const result = await fiscalService.getStats(empresaId);
      if (result) setStats(result);
    } catch (err) {
      console.error('[useNfeStats] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
