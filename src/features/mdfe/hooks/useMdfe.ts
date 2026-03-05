'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Mdfe } from '@/modules/fiscal/services/mdfeService';

export function useMdfe(empresaId: string | null | undefined) {
  const [mdfes, setMdfes] = useState<Mdfe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMdfes = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    try {
      const { mdfeService } = await import('@/modules/fiscal/services/mdfeService');
      const data = await mdfeService.listar(empresaId);
      setMdfes(data);
    } catch (err: any) {
      setError(err);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchMdfes();
  }, [fetchMdfes]);

  const createMdfe = async (dados: Partial<Mdfe>) => {
    if (!empresaId) return;
    setIsLoading(true);
    try {
      const { mdfeService } = await import('@/modules/fiscal/services/mdfeService');
      await mdfeService.criar({ ...dados, empresa_id: empresaId, status: 'digitacao' });
      await fetchMdfes();
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const transmitMdfe = async (id: string) => {
    setIsLoading(true);
    try {
      const { mdfeService } = await import('@/modules/fiscal/services/mdfeService');
      await mdfeService.transmitir(id);
      await fetchMdfes();
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const closeMdfe = async (id: string) => {
    setIsLoading(true);
    try {
      const { mdfeService } = await import('@/modules/fiscal/services/mdfeService');
      await mdfeService.encerrar(id);
      await fetchMdfes();
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mdfes,
    isLoading,
    error,
    createMdfe,
    transmitMdfe,
    closeMdfe,
    refetch: fetchMdfes
  };
}
