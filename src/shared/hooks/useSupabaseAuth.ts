'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminBrowserClient } from '@/shared/lib/supabase/admin.browser';
import { setEmpresaId, clearEmpresaId } from './useEmpresaId';
import type { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// =====================================================
// Tradutor de erros
// =====================================================

const translateError = (error: any): string => {
  const message = error?.message || error?.error_description || '';

  const translations: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'Email not confirmed': 'Por favor, confirme seu email antes de fazer login',
    'User already registered': 'Este email já está cadastrado',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
    'Unable to validate email address: invalid format': 'Formato de email inválido',
    'Signup requires a valid password': 'Senha inválida',
    'User not found': 'Usuário não encontrado',
    'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos',
    'For security purposes, you can only request this once every 60 seconds': 'Aguarde 60 segundos antes de tentar novamente',
  };

  return translations[message] || 'Ocorreu um erro. Tente novamente.';
};

// =====================================================
// Tipos do Bootstrap
// =====================================================

interface BootstrapMembership {
  id: string;
  empresa_id: string;
  tenant_slug: string;
  role: string;
  ativo: boolean;
}

interface BootstrapResponse {
  adminUser: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar_url: string | null;
  };
  memberships: BootstrapMembership[];
  defaultTenantSlug: string;
}

// =====================================================
// Hook de Autenticação
// =====================================================

/**
 * Hook para gerenciar autenticação com Supabase ADMIN.
 *
 * Todas as operações de auth (login, logout, signup) usam
 * EXCLUSIVAMENTE o projeto ADMIN Supabase.
 * NENHUMA operação de auth toca o banco do ERP/tenant.
 */
export const useSupabaseAuth = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const supabase = createAdminBrowserClient();

  useEffect(() => {
    // Verificar usuário atual (ADMIN)
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    // Escutar mudanças de autenticação (ADMIN)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // -------------------------------------------------
  // Logout
  // -------------------------------------------------
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      clearEmpresaId();
      toast.success('Logout realizado com sucesso!');
      router.push('/login');
    } catch {
      toast.error('Erro ao fazer logout');
    }
  }, [router, supabase.auth]);

  // -------------------------------------------------
  // Login (ADMIN auth) + Bootstrap de sessão
  // -------------------------------------------------
  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const friendlyMessage = translateError(error);
        toast.error(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      setUser(data.user);

      if (data.user) {
        // Buscar memberships via endpoint de bootstrap (server-side)
        try {
          const bootstrapRes = await fetch('/api/session/bootstrap');
          if (bootstrapRes.ok) {
            const bootstrap: BootstrapResponse = await bootstrapRes.json();

            if (bootstrap.memberships && bootstrap.memberships.length > 0) {
              // Verificar se já tem empresa selecionada
              const storedEmpresaId = localStorage.getItem('empresa_id');
              const validStored = bootstrap.memberships.find(
                (m) => m.empresa_id === storedEmpresaId && m.ativo
              );
              const firstActive = bootstrap.memberships.find((m) => m.ativo);

              const selected = validStored || firstActive;

              if (selected) {
                if (!storedEmpresaId || storedEmpresaId !== selected.empresa_id) {
                  setEmpresaId(selected.empresa_id);
                }
              }
            }
          }
        } catch (bootstrapError) {
          // Bootstrap falhou, mas login já aconteceu — continuar
          console.warn('[Auth] Bootstrap falhou:', bootstrapError);
        }

        toast.success('Login realizado com sucesso!');
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      throw error;
    }
  }, [supabase]);

  // -------------------------------------------------
  // Signup (Cria usuário APENAS no ADMIN auth)
  // NOTA: Após signup, o usuário NÃO tem acesso a nenhuma
  // empresa até ser vinculado por um admin via /api/admin/users.
  // -------------------------------------------------
  const signup = useCallback(async (
    email: string,
    password: string,
    name: string
  ): Promise<{ needsConfirmation: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        const friendlyMessage = translateError(error);
        toast.error(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      // Se precisa confirmar email
      if (data.user && !data.session) {
        setPendingConfirmation(true);
        return { needsConfirmation: true };
      }

      // Se já confirmou (dev ou config sem confirmação)
      setUser(data.user);
      toast.success('Conta criada com sucesso!');
      window.location.href = '/dashboard';
      return { needsConfirmation: false };
    } catch (error: any) {
      throw error;
    }
  }, [supabase]);

  // -------------------------------------------------
  // Reenviar email de confirmação
  // -------------------------------------------------
  const resendConfirmationEmail = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        const friendlyMessage = translateError(error);
        toast.error(friendlyMessage);
        return false;
      }

      toast.success('Email de confirmação reenviado!');
      return true;
    } catch {
      toast.error('Erro ao reenviar email');
      return false;
    }
  }, [supabase]);

  // -------------------------------------------------
  // Excluir conta (via API route que usa ADMIN client)
  // -------------------------------------------------
  const deleteAccount = useCallback(async (): Promise<boolean> => {
    try {
      if (!user?.id) {
        toast.error('Usuário não autenticado');
        return false;
      }

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao excluir conta');
        return false;
      }

      setUser(null);
      toast.success('Conta excluída com sucesso!');

      setTimeout(() => {
        router.push('/login');
      }, 1500);

      return true;
    } catch (error: any) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta. Tente novamente.');
      return false;
    }
  }, [user, router]);

  return {
    logout,
    login,
    signup,
    resendConfirmationEmail,
    deleteAccount,
    user,
    isLoading,
    isAuthenticated: !!user,
    pendingConfirmation,
  };
};
