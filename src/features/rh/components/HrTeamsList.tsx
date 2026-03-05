'use client';

import React from 'react';
import { DataTable, Button } from '@/shared/components/ui';
import { Team } from '../hooks/useHrPeople';
import { Edit, Trash2 } from 'lucide-react';

interface HrTeamsListProps {
  teams: Team[];
  loading: boolean;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
}

export function HrTeamsList({ teams, loading, onEdit, onDelete }: HrTeamsListProps) {
  const columns = [
    { key: 'name', header: 'Departamento' },
    { key: 'description', header: 'Descrição', render: (t: Team) => <span className="text-slate-400 text-xs truncate max-w-[200px] block">{t.description || '-'}</span> },
    {
      key: 'actions',
      header: 'Ações',
      width: '100px',
      render: (team: Team) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(team)}>
            <Edit size={14} className="text-blue-400" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(team.id)}>
            <Trash2 size={14} className="text-red-400" />
          </Button>
        </div>
      )
    }
  ];

  return <DataTable columns={columns} data={teams} isLoading={loading} emptyMessage="Nenhum departamento encontrado." />;
}
