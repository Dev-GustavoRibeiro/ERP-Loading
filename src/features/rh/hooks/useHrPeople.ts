import { useState, useCallback, useEffect } from 'react';
import { createLegacyTenantClient } from '@/shared/lib/supabase/client';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import toast from 'react-hot-toast';

export interface Employee {
  id: string;
  nome: string;
  email: string;
  cargo_id: string;
  departamento_id: string;
  manager_id?: string;
  data_admissao: string;
  ativo: boolean;
  cargo?: { title: string; level: string };
  departamento?: { name: string };
}

export interface Role {
  id: string;
  title: string;
  level: string;
  description?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
}

export function useHrPeople() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const empresaId = useEmpresaId();
  const supabase = createLegacyTenantClient();

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    try {
      setLoading(true);

      const [empResponse, roleResponse, teamResponse] = await Promise.all([
        supabase
          .from('hr_employees')
          .select('*, nome:full_name, cargo:hr_roles_levels(title, level), departamento:hr_teams(name)')
          .eq('empresa_id', empresaId)
          .order('full_name'),
        supabase
          .from('hr_roles_levels')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('title'),
        supabase
          .from('hr_teams')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('name')
      ]);

      if (empResponse.error) throw empResponse.error;
      if (roleResponse.error) throw roleResponse.error;
      if (teamResponse.error) throw teamResponse.error;

      setEmployees(empResponse.data || []);
      setRoles(roleResponse.data || []);
      setTeams(teamResponse.data || []);

    } catch (error) {
      console.error('Error fetching HR people data Full:', JSON.stringify(error, null, 2));
      console.error('Error fetching HR people data:', error);
      toast.error('Erro ao carregar dados de pessoas.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Employees ---
  const createEmployee = async (data: any) => {
    try {
      const dbData = {
        ...data,
        full_name: data.nome,
        empresa_id: empresaId
      };
      delete dbData.nome;

      const { error } = await supabase.from('hr_employees').insert(dbData);
      if (error) throw error;
      toast.success('Colaborador criado com sucesso!');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar colaborador.');
      throw error;
    }
  };

  const updateEmployee = async (id: string, data: any) => {
    try {
      const dbData = { ...data };
      if (data.nome) {
        dbData.full_name = data.nome;
        delete dbData.nome;
      }

      const { error } = await supabase.from('hr_employees').update(dbData).eq('id', id);
      if (error) throw error;
      toast.success('Colaborador atualizado!');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar colaborador.');
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm('Tem certeza? Isso pode afetar históricos.')) return;
    try {
      const { error } = await supabase.from('hr_employees').delete().eq('id', id);
      if (error) throw error;
      toast.success('Colaborador removido.');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover colaborador.');
    }
  };

  // --- Roles ---
  const createRole = async (data: any) => {
    try {
      const { error } = await supabase.from('hr_roles_levels').insert({
        ...data,
        empresa_id: empresaId
      });
      if (error) throw error;
      toast.success('Cargo criado!');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar cargo.');
      throw error;
    }
  };

  const updateRole = async (id: string, data: any) => {
    try {
      const { error } = await supabase.from('hr_roles_levels').update(data).eq('id', id);
      if (error) throw error;
      toast.success('Cargo atualizado!');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar cargo.');
      throw error;
    }
  };

  const deleteRole = async (id: string) => {
    if (!confirm('Tem certeza? Colaboradores vinculados podem ficar sem cargo.')) return;
    try {
      const { error } = await supabase.from('hr_roles_levels').delete().eq('id', id);
      if (error) throw error;
      toast.success('Cargo removido.');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover cargo.');
    }
  };

  // --- Teams ---
  const createTeam = async (data: any) => {
    try {
      const { error } = await supabase.from('hr_teams').insert({
        ...data,
        empresa_id: empresaId
      });
      if (error) throw error;
      toast.success('Departamento criado!');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar departamento.');
      throw error;
    }
  };

  const updateTeam = async (id: string, data: any) => {
    try {
      const { error } = await supabase.from('hr_teams').update(data).eq('id', id);
      if (error) throw error;
      toast.success('Departamento atualizado!');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar departamento.');
      throw error;
    }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Tem certeza? Colaboradores vinculados podem ficar sem departamento.')) return;
    try {
      const { error } = await supabase.from('hr_teams').delete().eq('id', id);
      if (error) throw error;
      toast.success('Departamento removido.');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover departamento.');
    }
  };


  return {
    employees,
    roles,
    teams,
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    createRole,
    updateRole,
    deleteRole,
    createTeam,
    updateTeam,
    deleteTeam,
    refresh: fetchData
  };
}
