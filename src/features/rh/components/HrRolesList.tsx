'use client';

import React from 'react';
import { DataTable, Button } from '@/shared/components/ui';
import { Role } from '../hooks/useHrPeople';
import { Edit, Trash2 } from 'lucide-react';

interface HrRolesListProps {
  roles: Role[];
  loading: boolean;
  onEdit: (role: Role) => void;
  onDelete: (id: string) => void;
}

export function HrRolesList({ roles, loading, onEdit, onDelete }: HrRolesListProps) {
  const columns = [
    { key: 'title', header: 'Cargo' },
    { key: 'level', header: 'Nível' },
    { key: 'description', header: 'Descrição', render: (r: Role) => <span className="text-slate-400 text-xs truncate max-w-[200px] block">{r.description || '-'}</span> },
    {
      key: 'actions',
      header: 'Ações',
      width: '100px',
      render: (role: Role) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(role)}>
            <Edit size={14} className="text-blue-400" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(role.id)}>
            <Trash2 size={14} className="text-red-400" />
          </Button>
        </div>
      )
    }
  ];

  return <DataTable columns={columns} data={roles} isLoading={loading} emptyMessage="Nenhum cargo encontrado." />;
}
