import { useState, useCallback, useEffect } from 'react';
import { createLegacyTenantClient } from '@/shared/lib/supabase/client';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import toast from 'react-hot-toast';

export interface Feedback {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: 'praise' | 'constructive' | 'general';
  visibility: 'public' | 'private' | 'manager_only';
  status: 'pending' | 'approved' | 'rejected'; // For moderated feedback if needed
  created_at: string;
  sender?: { nome: string; avatar_url?: string };
  receiver?: { nome: string; avatar_url?: string };
}

export function useHrFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const empresaId = useEmpresaId();
  const supabase = createLegacyTenantClient();

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('hr_feedbacks')
        .select(`
          *,
          sender:hr_employees!giver_id(nome:full_name, avatar_url),
          receiver:hr_employees!receiver_id(nome:full_name, avatar_url)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map DB columns to our interface
      const mappedFeedbacks = (data || []).map((item: any) => ({
        ...item,
        sender_id: item.giver_id
      }));
      setFeedbacks(mappedFeedbacks);

    } catch (error) {
      console.error('Error fetching Feedback:', error);
      toast.error('Erro ao carregar Feedbacks.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actions
  const sendFeedback = async (data: Partial<Feedback>) => {
    try {
      // Map interface back to DB columns
      const dbData: any = {
        empresa_id: empresaId,
        content: data.content,
        type: data.type,
        visibility: data.visibility,
        receiver_id: data.receiver_id
      };

      if (data.sender_id) dbData.giver_id = data.sender_id;

      const { error } = await supabase.from('hr_feedbacks').insert(dbData);
      if (error) throw error;
      toast.success('Feedback enviado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao enviar feedback.');
      throw error;
    }
  };

  return {
    feedbacks,
    loading,
    refresh: fetchData,
    sendFeedback
  };
}
