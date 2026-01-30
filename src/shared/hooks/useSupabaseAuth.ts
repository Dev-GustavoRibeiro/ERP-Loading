'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

/**
 * Traduz mensagens de erro do Supabase para português
 */
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

/**
 * Hook para gerenciar autenticação com Supabase
 */
export const useSupabaseAuth = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Verificar usuário atual
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      toast.success('Logout realizado com sucesso!');
      router.push('/login');
    } catch {
      toast.error('Erro ao fazer logout');
    }
  }, [router, supabase.auth]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Tratar erro sem logar no console
        const friendlyMessage = translateError(error);
        toast.error(friendlyMessage);
        throw new Error(friendlyMessage);
      }
      
      setUser(data.user);
      
      if (data.user) {
        toast.success('Login realizado com sucesso!');
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      // Não logar no console - erro já tratado acima
      throw error;
    }
  }, [supabase]);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<{ needsConfirmation: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      
      if (error) {
        const friendlyMessage = translateError(error);
        toast.error(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      // Verificar se precisa confirmar email
      // Se o usuário foi criado mas não está confirmado, data.user existe mas session é null
      if (data.user && !data.session) {
        setPendingConfirmation(true);
        return { needsConfirmation: true };
      }

      // Se já confirmou (desenvolvimento ou config sem confirmação)
      setUser(data.user);
      toast.success('Conta criada com sucesso!');
      window.location.href = '/dashboard';
      return { needsConfirmation: false };
    } catch (error: any) {
      throw error;
    }
  }, [supabase]);

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

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    try {
      // Verificar se temos um usuário autenticado
      if (!user?.id) {
        toast.error('Usuário não autenticado');
        return false;
      }

      // Chamar API route para excluir conta
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao excluir conta');
        return false;
      }

      // Limpar estado local
      setUser(null);
      
      toast.success('Conta excluída com sucesso!');
      
      // Redirecionar para login após um breve delay
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

