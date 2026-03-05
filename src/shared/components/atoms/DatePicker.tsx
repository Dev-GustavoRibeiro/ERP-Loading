'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, X } from 'lucide-react';
import { Portal } from './Portal';
import { cn } from '@/shared/lib/utils';

// Import base styles para variáveis CSS
import 'react-day-picker/style.css';

export interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
}

const INPUT_BASE = 'w-full px-4 py-2.5 bg-[#252d3d] border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors text-sm flex items-center gap-2';

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  disabled = false,
  error = false,
  className,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [innerDate, setInnerDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) setInnerDate(d);
    } else {
      setInnerDate(undefined);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const calendarHeight = 320;
      const showAbove = spaceBelow < calendarHeight && rect.top > spaceBelow;
      setPopoverStyle({
        position: 'fixed',
        left: rect.left,
        top: showAbove ? undefined : rect.bottom + 4,
        bottom: showAbove ? window.innerHeight - rect.top + 4 : undefined,
        width: Math.max(rect.width, 280),
      });
    }
  }, [isOpen]);

  const handleSelect = (date: Date | undefined) => {
    setInnerDate(date);
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
    } else {
      onChange('');
    }
  };

  const displayValue = innerDate ? format(innerDate, 'dd/MM/yyyy', { locale: ptBR }) : '';

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          INPUT_BASE,
          'text-left cursor-pointer',
          error ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10 focus:border-purple-500/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <span className={displayValue ? 'text-white' : 'text-slate-500'}>
          {displayValue || placeholder}
        </span>
      </button>

      {isOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setIsOpen(false)}
          />
          <div
            style={popoverStyle}
            className={cn(
              'z-[91] p-4 rounded-xl shadow-2xl min-w-[280px]',
              'bg-[#1a1f2e] border border-white/10'
            )}
          >
            <div className="rdp-zed">
              <DayPicker
                mode="single"
                selected={innerDate}
                onSelect={handleSelect}
                locale={ptBR}
                defaultMonth={innerDate || new Date()}
                disabled={{ after: new Date(2100, 0), before: new Date(1900, 0) }}
                className="border-0"
              />
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => { handleSelect(undefined); setIsOpen(false); }}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => handleSelect(new Date())}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Hoje
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};
