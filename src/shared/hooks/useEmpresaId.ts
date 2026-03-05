'use client';

import { useState, useEffect } from 'react';

/**
 * Hook SSR-safe para obter o empresa_id do localStorage
 * Retorna null durante SSR e no primeiro render do cliente
 */
export const useEmpresaId = (): string | null => {
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    // Só executa no cliente
    const id = localStorage.getItem('empresa_id');
    setEmpresaId(id);
  }, []);

  return empresaId;
};

/**
 * Função para definir o empresa_id no localStorage
 */
export const setEmpresaId = (id: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('empresa_id', id);
  }
};

/**
 * Função para limpar o empresa_id do localStorage
 */
export const clearEmpresaId = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('empresa_id');
  }
};
