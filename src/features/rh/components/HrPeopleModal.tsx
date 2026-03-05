'use client';

import React, { useState } from 'react';
import { Modal, Button, SearchInput, Tabs } from '@/shared/components/ui';
import { UserPlus, RefreshCw, Briefcase, Users, Layers, Plus } from 'lucide-react';
import { useHrPeople, Employee, Role, Team } from '../hooks/useHrPeople';
import { HrPeopleList } from './HrPeopleList';
import { HrRolesList } from './HrRolesList';
import { HrTeamsList } from './HrTeamsList';
import { HrEmployeeForm } from './HrEmployeeForm';
import { HrRoleForm } from './HrRoleForm';
import { HrTeamForm } from './HrTeamForm';
import { HrEmployeeFormData, HrRoleFormData, HrTeamFormData } from '../schemas';


interface HrPeopleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'employees' | 'roles' | 'teams';
}

type TabType = 'employees' | 'roles' | 'teams';

export function HrPeopleModal({ isOpen, onClose, initialTab = 'employees' }: HrPeopleModalProps) {
  const {
    employees, roles, teams, loading, refresh,
    createEmployee, updateEmployee, deleteEmployee,
    createRole, updateRole, deleteRole,
    createTeam, updateTeam, deleteTeam
  } = useHrPeople();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  // Form States
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);

  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);

  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | undefined>(undefined);

  // Filtering
  const filteredEmployees = employees.filter(emp =>
    emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cargo?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoles = roles.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers - Employee
  const handleNewEmployee = () => { setEditingEmployee(undefined); setIsEmployeeFormOpen(true); };
  const handleEditEmployee = (emp: Employee) => { setEditingEmployee(emp); setIsEmployeeFormOpen(true); };
  const handleSubmitEmployee = async (data: HrEmployeeFormData) => {
    if (editingEmployee) await updateEmployee(editingEmployee.id, data);
    else await createEmployee(data);
    setIsEmployeeFormOpen(false);
  };

  // Handlers - Role
  const handleNewRole = () => { setEditingRole(undefined); setIsRoleFormOpen(true); };
  const handleEditRole = (role: Role) => { setEditingRole(role); setIsRoleFormOpen(true); };
  const handleSubmitRole = async (data: HrRoleFormData) => {
    if (editingRole) await updateRole(editingRole.id, data);
    else await createRole(data);
    setIsRoleFormOpen(false);
  };

  // Handlers - Team
  const handleNewTeam = () => { setEditingTeam(undefined); setIsTeamFormOpen(true); };
  const handleEditTeam = (team: Team) => { setEditingTeam(team); setIsTeamFormOpen(true); };
  const handleSubmitTeam = async (data: HrTeamFormData) => {
    if (editingTeam) await updateTeam(editingTeam.id, data);
    else await createTeam(data);
    setIsTeamFormOpen(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Pessoas e Estrutura"
        size="full"
        footer={
          <div className="flex justify-between w-full items-center">
            <div className="text-xs text-slate-500">
              {activeTab === 'employees' && `Total: ${filteredEmployees.length} colaboradores`}
              {activeTab === 'roles' && `Total: ${filteredRoles.length} cargos`}
              {activeTab === 'teams' && `Total: ${filteredTeams.length} departamentos`}
            </div>
            <Button variant="secondary" onClick={onClose}>Voltar ao Menu RH</Button>
          </div>
        }
      >
        <div className="space-y-6 h-full flex flex-col">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Tabs
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as TabType)}
              tabs={[
                { id: 'employees', label: 'Colaboradores', icon: <Users size={16} />, count: employees.length },
                { id: 'roles', label: 'Cargos e Níveis', icon: <Briefcase size={16} />, count: roles.length },
                { id: 'teams', label: 'Departamentos', icon: <Layers size={16} />, count: teams.length },
              ]}
            />

            <div className="flex gap-2 w-full md:w-auto">
              <div className="flex-1 md:w-64">
                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar..." />
              </div>
              <Button variant="secondary" onClick={refresh} title="Atualizar">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </Button>

              {activeTab === 'employees' && (
                <Button variant="primary" onClick={handleNewEmployee}>
                  <UserPlus size={16} className="mr-2" /> Novo
                </Button>
              )}
              {activeTab === 'roles' && (
                <Button variant="primary" onClick={handleNewRole}>
                  <Plus size={16} className="mr-2" /> Novo Cargo
                </Button>
              )}
              {activeTab === 'teams' && (
                <Button variant="primary" onClick={handleNewTeam}>
                  <Plus size={16} className="mr-2" /> Novo Depto
                </Button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-white/5 rounded-lg border border-white/10 flex-1 overflow-hidden flex flex-col">
            {activeTab === 'employees' && (
              <HrPeopleList
                employees={filteredEmployees}
                loading={loading}
                onEdit={handleEditEmployee}
                onDelete={deleteEmployee}
              />
            )}
            {activeTab === 'roles' && (
              <HrRolesList
                roles={filteredRoles}
                loading={loading}
                onEdit={handleEditRole}
                onDelete={deleteRole}
              />
            )}
            {activeTab === 'teams' && (
              <HrTeamsList
                teams={filteredTeams}
                loading={loading}
                onEdit={handleEditTeam}
                onDelete={deleteTeam}
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Modals */}
      {isEmployeeFormOpen && (
        <HrEmployeeForm
          isOpen={isEmployeeFormOpen}
          onClose={() => setIsEmployeeFormOpen(false)}
          onSubmit={handleSubmitEmployee}
          defaultValues={editingEmployee ? {
            nome: editingEmployee.nome,
            email: editingEmployee.email,
            cargo_id: editingEmployee.cargo_id,
            departamento_id: editingEmployee.departamento_id,
            manager_id: editingEmployee.manager_id,
            data_admissao: editingEmployee.data_admissao,
            ativo: editingEmployee.ativo
          } : undefined}
          roles={roles}
          teams={teams}
          managers={employees.map(e => ({ id: e.id, nome: e.nome }))}
        />
      )}

      {isRoleFormOpen && (
        <HrRoleForm
          isOpen={isRoleFormOpen}
          onClose={() => setIsRoleFormOpen(false)}
          onSubmit={handleSubmitRole}
          defaultValues={editingRole}
        />
      )}

      {isTeamFormOpen && (
        <HrTeamForm
          isOpen={isTeamFormOpen}
          onClose={() => setIsTeamFormOpen(false)}
          onSubmit={handleSubmitTeam}
          defaultValues={editingTeam}
        />
      )}
    </>
  );
}
