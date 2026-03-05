import { useState, useCallback, useEffect } from 'react';
import { createLegacyTenantClient } from '@/shared/lib/supabase/client';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import toast from 'react-hot-toast';

export interface ReviewCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'closed';
}

export interface ReviewAssignment {
  id: string;
  cycle_id: string;
  reviewer_id: string;
  reviewee_id: string;
  template_id: string;
  status: 'pending' | 'in_progress' | 'submitted';
  type: 'self' | 'manager' | 'peer' | 'subordinate';
  reviewer?: { nome: string; avatar_url?: string };
  reviewee?: { nome: string; avatar_url?: string };
  cycle?: { name: string };
}

export interface ReviewTemplate {
  id: string;
  name: string;
  sections: any; // JSONB
}

export function useHrPerformance() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [templates, setTemplates] = useState<ReviewTemplate[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const empresaId = useEmpresaId();
  const supabase = createLegacyTenantClient();

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    try {
      setLoading(true);

      // 1. Fetch Cycles
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('hr_review_cycles')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('end_date', { ascending: false });

      if (cyclesError) throw cyclesError;
      setCycles(cyclesData || []);

      // 2. Fetch Templates
      const { data: tmplData, error: tmplError } = await supabase
        .from('hr_review_templates')
        .select('*')
        .eq('empresa_id', empresaId);

      if (tmplError) throw tmplError;
      setTemplates(tmplData || []);

      // Determine active cycle
      const currentCycle = cyclesData?.find(c => c.status === 'active') || cyclesData?.[0];
      const cycleIdToLoad = activeCycleId || currentCycle?.id;

      if (cycleIdToLoad) {
        if (!activeCycleId) setActiveCycleId(cycleIdToLoad);

        // 3. Fetch Assignments for the cycle
        const { data: assignData, error: assignError } = await supabase
          .from('hr_review_assignments')
          .select(`
            *,
            reviewer:hr_employees!reviewer_id(nome:full_name, avatar_url),
            reviewee:hr_employees!reviewee_id(nome:full_name, avatar_url),
            cycle:hr_review_cycles(name)
          `)
          .eq('empresa_id', empresaId)
          .eq('cycle_id', cycleIdToLoad);

        if (assignError) throw assignError;
        setAssignments((assignData as any) || []);
      } else {
        setAssignments([]);
      }

    } catch (error) {
      console.error('Error fetching Performance data:', error);
      toast.error('Erro ao carregar Avaliações.');
    } finally {
      setLoading(false);
    }
  }, [empresaId, activeCycleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actions
  const createCycle = async (data: Partial<ReviewCycle>) => {
    try {
      const { error } = await supabase.from('hr_review_cycles').insert({ ...data, empresa_id: empresaId });
      if (error) throw error;
      toast.success('Ciclo criado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar ciclo.');
    }
  };

  const createAssignment = async (data: Partial<ReviewAssignment>) => {
    try {
      const { error } = await supabase.from('hr_review_assignments').insert({ ...data, empresa_id: empresaId, status: 'pending' });
      if (error) throw error;
      toast.success('Avaliação atribuída!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atribuir avaliação.');
    }
  };

  return {
    cycles,
    assignments,
    templates,
    activeCycleId,
    setActiveCycleId,
    loading,
    refresh: fetchData,
    createCycle,
    createAssignment
  };
}
