'use client';

import { useState, useCallback } from 'react';
import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';

export interface MediaUploadResult {
  url: string;
  path: string;
  type: 'image' | 'video' | 'audio';
  mimeType: string;
  size: number;
}

export interface UseMediaUploadReturn {
  uploadMedia: (file: File | Blob, customFileName?: string) => Promise<MediaUploadResult | null>;
  uploadFromDataUrl: (dataUrl: string, fileName: string, mimeType: string) => Promise<MediaUploadResult | null>;
  deleteMedia: (path: string) => Promise<boolean>;
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export const useMediaUpload = (): UseMediaUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSupabaseAuth();
  const supabase = createClient();

  const getMediaType = (mimeType: string): 'image' | 'video' | 'audio' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'image'; // default
  };

  const uploadMedia = useCallback(async (
    file: File | Blob, 
    customFileName?: string
  ): Promise<MediaUploadResult | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const mimeType = file.type || 'application/octet-stream';
      const mediaType = getMediaType(mimeType);
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const extension = mimeType.split('/')[1]?.split(';')[0] || 'bin';
      const fileName = customFileName || `${mediaType}_${timestamp}_${randomId}.${extension}`;
      
      // Path inclui userId para organização e RLS
      const filePath = `${user.id}/${fileName}`;
      
      setProgress(20);

      // Upload para Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: mimeType,
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(80);

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      setProgress(100);

      return {
        url: urlData.publicUrl,
        path: filePath,
        type: mediaType,
        mimeType,
        size: file.size,
      };

    } catch (err: any) {
      console.error('Erro no upload:', err);
      setError(err.message || 'Erro ao fazer upload');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [user, supabase]);

  const uploadFromDataUrl = useCallback(async (
    dataUrl: string,
    fileName: string,
    mimeType: string
  ): Promise<MediaUploadResult | null> => {
    try {
      // Converter data URL para Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return uploadMedia(blob, fileName);
    } catch (err: any) {
      console.error('Erro ao converter data URL:', err);
      setError('Erro ao processar arquivo');
      return null;
    }
  }, [uploadMedia]);

  const deleteMedia = useCallback(async (path: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    try {
      const { error: deleteError } = await supabase.storage
        .from('chat-media')
        .remove([path]);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    } catch (err: any) {
      console.error('Erro ao deletar:', err);
      setError(err.message || 'Erro ao deletar arquivo');
      return false;
    }
  }, [user, supabase]);

  return {
    uploadMedia,
    uploadFromDataUrl,
    deleteMedia,
    isUploading,
    progress,
    error,
  };
};

