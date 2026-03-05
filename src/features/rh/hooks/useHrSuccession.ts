import { useState, useCallback, useEffect } from 'react';
import { createLegacyTenantClient } from '@/shared/lib/supabase/client';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import toast from 'react-hot-toast';

export interface SuccessionPlan {
  id: string;
  role_id: string;
  incumbent_id: string; // Current holder
  status: 'active' | 'draft' | 'archived';
  role?: { title: string };
  incumbent?: { nome: string; avatar_url?: string };
  candidates?: SuccessionCandidate[];
}

export interface SuccessionCandidate {
  id: string;
  plan_id: string;
  employee_id: string;
  readiness: 'ready_now' | 'ready_1_year' | 'ready_2_years' | 'high_potential';
  notes: string;
  employee?: { nome: string; avatar_url?: string };
}

export interface NineBoxDatum {
  employee_id: string;
  performance: 'low' | 'medium' | 'high';
  potential: 'low' | 'medium' | 'high';
  employee?: { nome: string; avatar_url?: string; cargo?: string };
}

export function useHrSuccession() {
  const [plans, setPlans] = useState<SuccessionPlan[]>([]);
  const [nineBoxData, setNineBoxData] = useState<NineBoxDatum[]>([]);
  const [loading, setLoading] = useState(true);

  const empresaId = useEmpresaId();
  const supabase = createLegacyTenantClient();

  // Mocking 9-Box data until we have real calibration tables
  const fetchNineBox = async () => {
    // In real scenario, this comes from hr_review_calibrations
    // For now, we return empty or mock
    setNineBoxData([]);
  };

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('hr_succession_plans')
        .select(`
          *,
          role:hr_roles_levels!role_id(title),
          incumbent:hr_employees!current_holder_id(nome:full_name, avatar_url),
          candidates:hr_succession_candidates(
            *,
            employee:hr_employees(nome:full_name, avatar_url)
          )
        `)
        .eq('empresa_id', empresaId);

      if (error) throw error;

      const mappedPlans = (data || []).map((item: any) => ({
        ...item,
        incumbent_id: item.current_holder_id
      }));

      setPlans(mappedPlans);

      await fetchNineBox();

    } catch (error) {
      console.error('Error fetching Succession:', error);
      toast.error('Erro ao carregar Sucessão.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actions
  const createPlan = async (data: Partial<SuccessionPlan>) => {
    try {
      const dbData: any = {
        ...data,
        empresa_id: empresaId,
        current_holder_id: data.incumbent_id
      };
      delete dbData.incumbent_id;

      const { error } = await supabase.from('hr_succession_plans').insert(dbData);
      if (error) throw error;
      toast.success('Plano criado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar plano.');
      throw error;
    }
  };

  return {
    plans,
    nineBoxData,
    loading,
    refresh: fetchData,
    createPlan
  };
}
