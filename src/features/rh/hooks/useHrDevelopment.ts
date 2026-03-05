import { useState, useCallback, useEffect } from 'react';
import { createLegacyTenantClient } from '@/shared/lib/supabase/client';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import toast from 'react-hot-toast';

export interface DevelopmentPlan {
  id: string;
  employee_id: string;
  title: string;
  status: 'active' | 'completed' | 'archived';
  start_date?: string;
  end_date?: string;
  employee?: { nome: string; avatar_url?: string };
  goals?: DevelopmentGoal[];
}

export interface DevelopmentGoal {
  id: string;
  plan_id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  deadline: string;
}

export function useHrDevelopment() {
  const [plans, setPlans] = useState<DevelopmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const empresaId = useEmpresaId();
  const supabase = createLegacyTenantClient();

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('hr_development_plans')
        .select(`
          *,
          employee:hr_employees(nome:full_name, avatar_url),
          goals:hr_development_goals(*)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans((data as any) || []);

    } catch (error) {
      console.error('Error fetching PDI:', error);
      toast.error('Erro ao carregar PDIs.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actions
  const createPlan = async (data: Partial<DevelopmentPlan>) => {
    try {
      const { error } = await supabase.from('hr_development_plans').insert({ ...data, empresa_id: empresaId });
      if (error) throw error;
      toast.success('PDI criado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar PDI.');
      throw error;
    }
  };

  const createGoal = async (data: Partial<DevelopmentGoal>) => {
    try {
      const { error } = await supabase.from('hr_development_goals').insert({ ...data, empresa_id: empresaId });
      if (error) throw error;
      toast.success('Meta adicionada!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao adicionar meta.');
      throw error;
    }
  };

  return {
    plans,
    loading,
    refresh: fetchData,
    createPlan,
    createGoal
  };
}
