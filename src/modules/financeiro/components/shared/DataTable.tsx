'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// =====================================================
// Types
// =====================================================

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ElementType;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  getRowId?: (row: T) => string;
}

// =====================================================
// Component
// =====================================================

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  emptyIcon: EmptyIcon = AlertCircle,
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  onSort,
  sortBy,
  sortOrder = 'asc',
  onRowClick,
  rowClassName,
  selectable = false,
  selectedIds,
  onSelectionChange,
  getRowId = (row: T) => (row as Record<string, unknown>).id as string,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  const handleSort = (key: string) => {
    if (!onSort) return;
    const newOrder = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(key, newOrder);
  };

  const toggleSelect = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    const allIds = data.map(getRowId);
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allIds));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <EmptyIcon className="w-12 h-12 text-slate-500 mb-4" />
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {selectable && (
                <th className="px-3 py-3 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      selectedIds && data.every(r => selectedIds.has(getRowId(r)))
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-white/20 hover:border-white/40'
                    )}
                  >
                    {selectedIds && data.every(r => selectedIds.has(getRowId(r))) && (
                      <ChevronDown className="w-3 h-3 text-white" />
                    )}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.sortable && 'cursor-pointer select-none hover:text-slate-200 transition-colors'
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                  onMouseEnter={() => col.sortable && setHoveredCol(col.key)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      <span className="inline-flex flex-col">
                        <ChevronUp className={cn(
                          'w-3 h-3 -mb-1',
                          sortBy === col.key && sortOrder === 'asc' ? 'text-purple-400' : 'text-slate-600'
                        )} />
                        <ChevronDown className={cn(
                          'w-3 h-3',
                          sortBy === col.key && sortOrder === 'desc' ? 'text-purple-400' : 'text-slate-600'
                        )} />
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {data.map((row, i) => {
                const rowId = getRowId(row);
                const isSelected = selectable && selectedIds?.has(rowId);

                return (
                  <motion.tr
                    key={rowId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.02 }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'border-b border-white/[0.03] last:border-0 transition-colors',
                      onRowClick && 'cursor-pointer',
                      isSelected
                        ? 'bg-purple-500/8'
                        : 'hover:bg-white/[0.02]',
                      rowClassName?.(row)
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(rowId); }}
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                            isSelected ? 'bg-purple-600 border-purple-600' : 'border-white/20 hover:border-white/40'
                          )}
                        >
                          {isSelected && <ChevronDown className="w-3 h-3 text-white" />}
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-sm',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        )}
                      >
                        {col.render
                          ? col.render(row, i)
                          : String((row as Record<string, unknown>)[col.key] ?? '-')}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Mostrando {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                    p === page
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:bg-white/5'
                  )}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
