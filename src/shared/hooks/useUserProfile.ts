'use client';

import { useCallback, useEffect, useState } from 'react';
import { createAdminBrowserClient } from '@/shared/lib/supabase/admin.browser';
import toast from 'react-hot-toast';
import type { SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// Tipos
// =====================================================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  subscription_tier: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Hook de Perfil do Usuário
// =====================================================

/**
 * Hook para gerenciar o perfil do usuário.
 *
 * Lê e escreve na tabela `profiles` do ADMIN Supabase.
 * NUNCA acessa o banco do ERP/tenant.
 */
export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createAdminBrowserClient() as unknown as SupabaseClient;

  // Carregar perfil do ADMIN
  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', JSON.stringify(error, null, 2));
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, supabase.auth]);

  // Upload de foto de perfil (no ADMIN storage)
  const uploadAvatar = useCallback(async (file: File): Promise<boolean> => {
    if (!profile) {
      toast.error('Usuário não autenticado');
      return false;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG, WebP ou GIF.');
      return false;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Imagem muito grande. Máximo 5MB.');
      return false;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        toast.error('Erro ao fazer upload da imagem');
        return false;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Erro ao atualizar perfil:', updateError);
        toast.error('Erro ao atualizar perfil');
        return false;
      }

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Foto atualizada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload');
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [profile, supabase]);

  // Remover foto
  const removeAvatar = useCallback(async (): Promise<boolean> => {
    if (!profile) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id);

      if (error) {
        console.error('Erro ao remover foto:', error);
        toast.error('Erro ao remover foto');
        return false;
      }

      setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
      toast.success('Foto removida');
      return true;
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast.error('Erro ao remover foto');
      return false;
    }
  }, [profile, supabase]);

  // Atualizar nome
  const updateName = useCallback(async (name: string): Promise<boolean> => {
    if (!profile) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', profile.id);

      if (error) {
        console.error('Erro ao atualizar nome:', error);
        toast.error('Erro ao atualizar nome');
        return false;
      }

      setProfile(prev => prev ? { ...prev, name } : null);
      toast.success('Nome atualizado!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      toast.error('Erro ao atualizar nome');
      return false;
    }
  }, [profile, supabase]);

  return {
    profile,
    isLoading,
    isUploading,
    uploadAvatar,
    removeAvatar,
    updateName,
    refreshProfile: loadProfile,
  };
};
