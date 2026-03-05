import { useState, useCallback, useEffect } from 'react';
import { createLegacyTenantClient } from '@/shared/lib/supabase/client';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import toast from 'react-hot-toast';

export interface OkrCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'archived';
}

export interface Objective {
  id: string;
  title: string;
  description?: string;
  type: 'company' | 'team' | 'individual';
  owner_id: string;
  team_id?: string;
  cycle_id: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'completed';
  key_results?: KeyResult[];
  owner?: { nome: string; avatar_url?: string };
}

export interface KeyResult {
  id: string;
  title: string;
  start_value: number;
  target_value: number;
  current_value: number;
  unit: string;
  weight: number;
  objective_id: string;
}

export function useHrOkrs() {
  const [cycles, setCycles] = useState<OkrCycle[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
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
        .from('hr_okr_cycles')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('end_date', { ascending: false });

      if (cyclesError) throw cyclesError;
      setCycles(cyclesData || []);

      // Determine active cycle (first active or first item)
      const currentCycle = cyclesData?.find(c => c.status === 'active') || cyclesData?.[0];
      const cycleIdToLoad = activeCycleId || currentCycle?.id;

      if (cycleIdToLoad) {
        if (!activeCycleId) setActiveCycleId(cycleIdToLoad);

        // 2. Fetch Objectives & KRs for the cycle
        const { data: objData, error: objError } = await supabase
          .from('hr_objectives')
          .select(`
            *,
            key_results:hr_key_results(*),
            owner:hr_employees!owner_id(nome:full_name, avatar_url)
          `)
          .eq('empresa_id', empresaId)
          .eq('cycle_id', cycleIdToLoad)
          .order('created_at', { ascending: false });

        if (objError) throw objError;
        setObjectives((objData as any) || []);
      } else {
        setObjectives([]);
      }

    } catch (error: any) {
      console.error('Error fetching OKR data Full (Message):', error.message);
      console.error('Error fetching OKR data Full (Details):', error.details);
      console.error('Error fetching OKR data Full (Hint):', error.hint);
      console.error('Error fetching OKR data:', error);
      toast.error('Erro ao carregar OKRs.');
      setObjectives([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId, activeCycleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Actions ---

  const createCycle = async (data: Partial<OkrCycle>) => {
    try {
      const { error } = await supabase.from('hr_okr_cycles').insert({ ...data, empresa_id: empresaId });
      if (error) throw error;
      toast.success('Ciclo criado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar ciclo.');
      throw error;
    }
  };

  const createObjective = async (data: Partial<Objective>) => {
    try {
      const { error } = await supabase.from('hr_objectives').insert({ ...data, empresa_id: empresaId });
      if (error) throw error;
      toast.success('Objetivo criado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar objetivo.');
      throw error;
    }
  };

  const createKeyResult = async (data: Partial<KeyResult>) => {
    try {
      const { error } = await supabase.from('hr_key_results').insert({ ...data, empresa_id: empresaId });
      if (error) throw error;
      toast.success('KR criado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar KR.');
      throw error;
    }
  };

  const checkinKeyResult = async (krId: string, value: number, comment?: string) => {
    try {
      // 1. Create Check-in
      const { error: checkinError } = await supabase.from('hr_okr_checkins').insert({
        empresa_id: empresaId,
        key_result_id: krId,
        value,
        comment,
        // employee_id: current user... (need to get user)
      });
      if (checkinError) throw checkinError;

      // 2. Update KR current value
      const { error: matchError } = await supabase.from('hr_key_results')
        .update({ current_value: value })
        .eq('id', krId);

      if (matchError) throw matchError;

      toast.success('Check-in realizado!');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao realizar check-in.');
    }
  };

  return {
    cycles,
    objectives,
    activeCycleId,
    setActiveCycleId,
    loading,
    refresh: fetchData,
    createCycle,
    createObjective,
    createKeyResult,
    checkinKeyResult
  };
}
