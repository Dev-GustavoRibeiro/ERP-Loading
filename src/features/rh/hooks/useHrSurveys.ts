import { useState, useCallback, useEffect } from 'react';
import { createLegacyTenantClient } from '@/shared/lib/supabase/client';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import toast from 'react-hot-toast';

export interface Survey {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'closed';
  type: 'climate' | 'engagement' | 'specific';
  deadline: string;
  response_count?: number;
}

export function useHrSurveys() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  const empresaId = useEmpresaId();
  const supabase = createLegacyTenantClient();

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('hr_surveys')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map DB columns
      const mappedSurveys = (data || []).map((item: any) => ({
        ...item,
        deadline: item.end_date // Map end_date to deadline
      }));

      setSurveys(mappedSurveys);

    } catch (error) {
      console.error('Error fetching Surveys:', error);
      toast.error('Erro ao carregar Pesquisas.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actions
  const createSurvey = async (data: Partial<Survey>) => {
    try {
      const dbData: any = {
        ...data,
        empresa_id: empresaId,
        end_date: data.deadline // Map deadline to end_date
      };
      delete dbData.deadline; // remove from payload

      const { error } = await supabase.from('hr_surveys').insert(dbData);
      if (error) throw error;
      toast.success('Pesquisa criada!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar pesquisa.');
      throw error;
    }
  };

  return {
    surveys,
    loading,
    refresh: fetchData,
    createSurvey
  };
}
