import { useState, useCallback, useEffect } from 'react';
import { createLegacyTenantClient } from '@/shared/lib/supabase/client';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import toast from 'react-hot-toast';

export interface OneOnOne {
  id: string;
  manager_id: string;
  employee_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  manager?: { nome: string; avatar_url?: string };
  employee?: { nome: string; avatar_url?: string };
  action_items?: ActionItem[];
}

export interface ActionItem {
  id: string;
  one_on_one_id: string;
  description: string;
  status: 'pending' | 'completed';
  assignee_id: string; // 'manager' | 'employee' ID
}

export function useHrOneOnOnes() {
  const [meetings, setMeetings] = useState<OneOnOne[]>([]);
  const [loading, setLoading] = useState(true);

  const empresaId = useEmpresaId();
  const supabase = createLegacyTenantClient();

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('hr_one_on_ones')
        .select(`
          *,
          manager:hr_employees!organizer_id(nome:full_name, avatar_url),
          employee:hr_employees!participant_id(nome:full_name, avatar_url),
          action_items:hr_one_on_one_actions(*)
        `)
        .eq('empresa_id', empresaId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      const mappedMeetings = (data || []).map((item: any) => ({
        ...item,
        manager_id: item.organizer_id,
        employee_id: item.participant_id,
        notes: item.shared_notes
      }));

      setMeetings(mappedMeetings);

    } catch (error) {
      console.error('Error fetching 1:1s:', error);
      toast.error('Erro ao carregar 1:1s.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actions
  const createMeeting = async (data: Partial<OneOnOne>) => {
    try {
      const dbData: any = {
        empresa_id: empresaId,
        organizer_id: data.manager_id,
        participant_id: data.employee_id,
        shared_notes: data.notes,
        scheduled_at: data.scheduled_at,
        status: data.status
      };

      const { error } = await supabase.from('hr_one_on_ones').insert(dbData);
      if (error) throw error;
      toast.success('1:1 Agendado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao agendar 1:1.');
      throw error;
    }
  };

  const completeMeeting = async (id: string, notes: string) => {
    try {
      const { error } = await supabase.from('hr_one_on_ones')
        .update({ status: 'completed', shared_notes: notes })
        .eq('id', id);
      if (error) throw error;
      toast.success('1:1 Concluído!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao concluir 1:1.');
    }
  };

  return {
    meetings,
    loading,
    refresh: fetchData,
    createMeeting,
    completeMeeting
  };
}
