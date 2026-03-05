'use client';

import React from 'react';
import { DataTable, Button, Badge } from '@/shared/components/ui';
import { Employee } from '../hooks/useHrPeople';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface HrPeopleListProps {
  employees: Employee[];
  loading: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
}

export function HrPeopleList({ employees, loading, onEdit, onDelete }: HrPeopleListProps) {
  const columns = [
    {
      key: 'nome',
      header: 'Nome',
      render: (emp: Employee) => (
        <div>
          <p className="font-medium text-white">{emp.nome}</p>
          <p className="text-xs text-slate-500">{emp.email}</p>
        </div>
      )
    },
    {
      key: 'cargo',
      header: 'Cargo',
      render: (emp: Employee) => (
        <div>
          <p className="text-slate-300">{emp.cargo?.title || '-'}</p>
          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-slate-400">
            {emp.cargo?.level || '-'}
          </span>
        </div>
      )
    },
    {
      key: 'departamento',
      header: 'Departamento',
      render: (emp: Employee) => <span className="text-slate-300">{emp.departamento?.name || '-'}</span>
    },
    {
      key: 'data_admissao',
      header: 'Admissão',
      render: (emp: Employee) => <span className="text-slate-400">{emp.data_admissao ? format(new Date(emp.data_admissao), 'dd/MM/yyyy') : '-'}</span>
    },
    {
      key: 'ativo',
      header: 'Status',
      render: (emp: Employee) => (
        <Badge variant={emp.ativo ? 'success' : 'default'}>
          {emp.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '100px',
      render: (emp: Employee) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEdit(emp); }}
            title="Editar"
          >
            <Edit size={14} className="text-blue-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(emp.id); }}
            title="Excluir"
          >
            <Trash2 size={14} className="text-red-400" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={employees}
      isLoading={loading}
      emptyMessage="Nenhum colaborador encontrado."
    />
  );
}
