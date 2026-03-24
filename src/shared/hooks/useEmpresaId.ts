'use client';

import { useState, useEffect } from 'react';

const EMPRESA_ID_KEY = 'empresa_id';

/**
 * Evento customizado disparado sempre que empresa_id muda no localStorage
 * (dentro da mesma aba). O evento nativo `storage` só dispara em outras abas.
 */
export const EMPRESA_ID_CHANGED_EVENT = 'empresa_id_changed';

/**
 * Hook SSR-safe para obter o empresa_id do localStorage.
 *
 * Reativo a mudanças feitas via setEmpresaId() na mesma aba
 * (usa evento customizado) e em outras abas (usa evento `storage`).
 */
export const useEmpresaId = (): string | null => {
  const [empresaId, setEmpresaIdState] = useState<string | null>(null);

  useEffect(() => {
    // Leitura inicial
    setEmpresaIdState(localStorage.getItem(EMPRESA_ID_KEY));

    // Reage a mudanças na mesma aba (via setEmpresaId / clearEmpresaId)
    const handleInternalChange = (e: Event) => {
      const custom = e as CustomEvent<string | null>;
      setEmpresaIdState(custom.detail);
    };

    // Reage a mudanças em outras abas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === EMPRESA_ID_KEY) {
        setEmpresaIdState(e.newValue);
      }
    };

    window.addEventListener(EMPRESA_ID_CHANGED_EVENT, handleInternalChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(EMPRESA_ID_CHANGED_EVENT, handleInternalChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return empresaId;
};

/**
 * Define o empresa_id no localStorage e notifica todos os hooks
 * useEmpresaId montados na mesma aba.
 */
export const setEmpresaId = (id: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(EMPRESA_ID_KEY, id);
    window.dispatchEvent(
      new CustomEvent(EMPRESA_ID_CHANGED_EVENT, { detail: id })
    );
  }
};

/**
 * Remove o empresa_id do localStorage e notifica todos os hooks
 * useEmpresaId montados na mesma aba.
 */
export const clearEmpresaId = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(EMPRESA_ID_KEY);
    window.dispatchEvent(
      new CustomEvent(EMPRESA_ID_CHANGED_EVENT, { detail: null })
    );
  }
};
