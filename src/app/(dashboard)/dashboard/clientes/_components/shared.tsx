'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/shared/components/atoms/Portal';
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// =====================================================
// Constants
// =====================================================

export const UF_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

export const DOCUMENT_TYPES = [
  { value: 'rg', label: 'RG', category: 'pessoal' },
  { value: 'cpf', label: 'CPF', category: 'pessoal' },
  { value: 'cnpj', label: 'Cartão CNPJ', category: 'pessoal' },
  { value: 'comprovante_endereco', label: 'Comprovante de Endereço', category: 'endereco' },
  { value: 'comprovante_renda', label: 'Comprovante de Renda', category: 'financeiro' },
  { value: 'contrato', label: 'Contrato', category: 'contrato' },
  { value: 'alvara', label: 'Alvará', category: 'fiscal' },
  { value: 'inscricao_estadual', label: 'Inscrição Estadual', category: 'fiscal' },
  { value: 'inscricao_municipal', label: 'Inscrição Municipal', category: 'fiscal' },
  { value: 'procuracao', label: 'Procuração', category: 'contrato' },
  { value: 'outro', label: 'Outro', category: 'outro' },
];

export const INTERACTION_TYPES = [
  { value: 'nota', label: 'Nota', color: 'blue', icon: '📝' },
  { value: 'ligacao', label: 'Ligação', color: 'green', icon: '📞' },
  { value: 'email', label: 'Email', color: 'purple', icon: '✉️' },
  { value: 'visita', label: 'Visita', color: 'amber', icon: '🏢' },
  { value: 'reuniao', label: 'Reunião', color: 'cyan', icon: '🤝' },
  { value: 'venda', label: 'Venda', color: 'emerald', icon: '💰' },
  { value: 'suporte', label: 'Suporte', color: 'red', icon: '🔧' },
  { value: 'whatsapp', label: 'WhatsApp', color: 'lime', icon: '💬' },
];

export const SEGMENT_PRESETS = [
  { id: 'ativos', label: 'Clientes Ativos', filter: { ativo: true }, color: 'emerald' },
  { id: 'inativos', label: 'Clientes Inativos', filter: { ativo: false }, color: 'red' },
  { id: 'pf', label: 'Pessoa Física', filter: { tipo_pessoa: 'F' }, color: 'blue' },
  { id: 'pj', label: 'Pessoa Jurídica', filter: { tipo_pessoa: 'J' }, color: 'purple' },
  { id: 'sem_email', label: 'Sem Email', filter: { sem_email: true }, color: 'amber' },
  { id: 'sem_telefone', label: 'Sem Telefone', filter: { sem_telefone: true }, color: 'orange' },
];

// =====================================================
// Formatting Utilities
// =====================================================

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatCPFCNPJ(value: string, tipo: 'F' | 'J'): string {
  return tipo === 'J' ? formatCNPJ(value) : formatCPF(value);
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mês(es) atrás`;
  return `${Math.floor(months / 12)} ano(s) atrás`;
}

export function cleanDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// =====================================================
// Validation Utilities
// =====================================================

export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(digits[10]);
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(digits[12]) !== digit1) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return parseInt(digits[13]) === digit2;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// =====================================================
// ViaCEP Integration
// =====================================================

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  erro?: boolean;
}

export async function fetchCEP(cep: string): Promise<ViaCEPResponse | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

// =====================================================
// CSV Export Utility
// =====================================================

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(';'),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(';') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(';')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// =====================================================
// Health Score Calculator
// =====================================================

export function calculateHealthScore(cliente: {
  email?: string | null;
  telefone?: string | null;
  celular?: string | null;
  cpf_cnpj?: string | null;
  cep?: string | null;
  cidade?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}): { score: number; level: 'excellent' | 'good' | 'fair' | 'poor'; label: string } {
  let score = 0;
  const max = 100;

  // Cadastro completo (50 pontos)
  if (cliente.email) score += 10;
  if (cliente.telefone || cliente.celular) score += 10;
  if (cliente.cpf_cnpj) score += 10;
  if (cliente.cep && cliente.cidade) score += 10;
  if (cliente.ativo) score += 10;

  // Dados atualizados recentemente (25 pontos)
  const daysSinceUpdate = Math.floor((Date.now() - new Date(cliente.updated_at).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceUpdate <= 30) score += 25;
  else if (daysSinceUpdate <= 90) score += 15;
  else if (daysSinceUpdate <= 180) score += 5;

  // Tempo como cliente (25 pontos)
  const daysSinceCreation = Math.floor((Date.now() - new Date(cliente.created_at).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceCreation >= 365) score += 25;
  else if (daysSinceCreation >= 180) score += 15;
  else if (daysSinceCreation >= 30) score += 10;
  else score += 5;

  const normalizedScore = Math.min(score, max);

  if (normalizedScore >= 80) return { score: normalizedScore, level: 'excellent', label: 'Excelente' };
  if (normalizedScore >= 60) return { score: normalizedScore, level: 'good', label: 'Bom' };
  if (normalizedScore >= 40) return { score: normalizedScore, level: 'fair', label: 'Regular' };
  return { score: normalizedScore, level: 'poor', label: 'Baixo' };
}

// =====================================================
// Shared UI Components
// =====================================================

export const ModalCliente: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={cn(
                'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full p-4',
                sizeClasses[size]
              )}
            >
              <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-bold text-white">{title}</h2>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-6 max-h-[75vh] overflow-y-auto scrollbar-none">
                  {children}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

// =====================================================
// Form Components
// =====================================================

interface FormInputProps {
  label: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  mask?: (value: string) => string;
  maxLength?: number;
  suffix?: React.ReactNode;
  className?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label, placeholder, type = 'text', value, onChange, required,
  error, disabled, mask, maxLength, suffix, className,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (mask) val = mask(val);
    onChange?.(val);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-xl text-sm',
            'placeholder-slate-500 focus:outline-none transition-all',
            type === 'date'
              ? (error
                  ? 'bg-[#1a2235] border border-red-500/50 text-white/90 hover:border-red-500/60 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/20'
                  : 'bg-[#1a2235] border border-white/[0.08] text-white/90 hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20')
              : cn(
                  'bg-[#252d3d] border text-white',
                  error
                    ? 'border-red-500/50 focus:border-red-500/80'
                    : 'border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20'
                ),
            disabled && 'opacity-50 cursor-not-allowed',
            suffix && 'pr-10'
          )}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

interface FormSelectProps {
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label, options, value, onChange, required, error, disabled, className,
}) => (
  <div className={cn('space-y-1.5', className)}>
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
className={cn(
            'w-full px-3.5 py-2.5 bg-[#1a2235] border border-white/[0.08] text-white/90 rounded-xl text-sm select-zed',
            'hover:border-white/20 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all',
            error
              ? 'border-red-500/50 focus:border-red-500/80'
              : '',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

interface FormTextareaProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  className?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label, placeholder, value, onChange, rows = 3, className,
}) => (
  <div className={cn('space-y-1.5', className)}>
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      rows={rows}
      className={cn(
        'w-full px-3.5 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white',
        'placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20',
        'resize-none transition-all duration-200'
      )}
    />
  </div>
);

// =====================================================
// Button Component
// =====================================================

interface FormButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
}

export const FormButton: React.FC<FormButtonProps> = ({
  children, variant = 'primary', onClick, disabled, loading, size = 'md', className, type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    className={cn(
      'flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
      size === 'sm' && 'px-3 py-1.5 text-xs',
      size === 'md' && 'px-4 py-2.5 text-sm',
      size === 'lg' && 'px-6 py-3 text-base',
      variant === 'primary' && 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20',
      variant === 'secondary' && 'bg-[#252d3d] hover:bg-[#2d3548] text-white border border-white/10',
      variant === 'danger' && 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20',
      variant === 'success' && 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20',
      variant === 'ghost' && 'hover:bg-white/5 text-slate-400 hover:text-white',
      className
    )}
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

// =====================================================
// Status Components
// =====================================================

export const StatusBadge: React.FC<{ active: boolean; size?: 'sm' | 'md' }> = ({
  active, size = 'sm',
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-semibold',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
      active
        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
        : 'bg-red-500/15 text-red-400 border border-red-500/20'
    )}
  >
    <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-emerald-400' : 'bg-red-400')} />
    {active ? 'Ativo' : 'Inativo'}
  </span>
);

export const TipoPessoaBadge: React.FC<{ tipo: 'F' | 'J' }> = ({ tipo }) => (
  <span
    className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
      tipo === 'J'
        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
        : 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
    )}
  >
    {tipo === 'J' ? 'PJ' : 'PF'}
  </span>
);

export const HealthScoreBadge: React.FC<{ score: number; level: string; label: string }> = ({
  score, level, label,
}) => {
  const colors = {
    excellent: 'text-emerald-400 bg-emerald-500/15',
    good: 'text-blue-400 bg-blue-500/15',
    fair: 'text-amber-400 bg-amber-500/15',
    poor: 'text-red-400 bg-red-500/15',
  };

  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl', colors[level as keyof typeof colors])}>
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${score} ${100 - score}`} className="opacity-100" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black">{score}</span>
      </div>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
};

// =====================================================
// Tab Navigation
// =====================================================

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export const TabNav: React.FC<{
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-1 p-1 bg-[#0d1117] rounded-xl border border-white/5 overflow-x-auto">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap',
          activeTab === tab.id
            ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        )}
      >
        {tab.icon}
        {tab.label}
        {tab.count !== undefined && (
          <span className={cn(
            'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
            activeTab === tab.id ? 'bg-purple-500/30 text-purple-200' : 'bg-white/10 text-slate-500'
          )}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// =====================================================
// Empty & Loading States
// =====================================================

export const LoadingState: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-3" />
    <p className="text-sm text-slate-400">{message || 'Carregando...'}</p>
  </div>
);

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  message: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}> = ({ icon, message, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon || <AlertCircle className="w-12 h-12 text-slate-600 mb-4" />}
    <p className="text-base font-semibold text-slate-300 mb-1">{message}</p>
    {description && <p className="text-sm text-slate-500 mb-4 max-w-sm">{description}</p>}
    {action && (
      <FormButton variant="secondary" onClick={action.onClick} size="sm">
        {action.label}
      </FormButton>
    )}
  </div>
);

// =====================================================
// Toast Notification
// =====================================================

export const Toast: React.FC<{
  show: boolean;
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}> = ({ show, type, message, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[100]"
        >
          <div className={cn(
            'flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl',
            type === 'success' && 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
            type === 'error' && 'bg-red-500/15 border-red-500/30 text-red-300',
            type === 'info' && 'bg-blue-500/15 border-blue-500/30 text-blue-300'
          )}>
            {type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 p-1 hover:bg-white/10 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =====================================================
// Section Divider
// =====================================================

export const SectionTitle: React.FC<{ title: string; description?: string; className?: string }> = ({
  title, description, className,
}) => (
  <div className={cn('mb-4', className)}>
    <h3 className="text-sm font-bold text-white">{title}</h3>
    {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
  </div>
);

// =====================================================
// Debounce Hook
// =====================================================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// =====================================================
// Error Handling Utilities
// =====================================================

export function isTableNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Could not find the table') ||
           error.message.includes('relation') && error.message.includes('does not exist');
  }
  return false;
}

export const TableNotConfigured: React.FC<{ entity?: string }> = ({ entity = 'dados' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-4">
      <AlertCircle className="w-8 h-8 text-amber-400" />
    </div>
    <p className="text-base font-semibold text-white mb-1">Banco de dados não configurado</p>
    <p className="text-sm text-slate-500 max-w-sm">
      A tabela de {entity} ainda não foi criada. Execute as migrações do Supabase para começar a usar este módulo.
    </p>
  </div>
);

// =====================================================
// Stepper Component (for wizard forms)
// =====================================================

interface StepperProps {
  steps: { label: string; icon?: React.ReactNode }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  allowClickPast?: boolean;
}

export const Stepper: React.FC<StepperProps> = ({
  steps, currentStep, onStepClick, allowClickPast = false,
}) => (
  <div className="flex items-center gap-1 w-full">
    {steps.map((step, i) => {
      const isCompleted = i < currentStep;
      const isCurrent = i === currentStep;
      const canClick = allowClickPast ? i <= currentStep : isCompleted;

      return (
        <React.Fragment key={i}>
          <button
            onClick={() => canClick && onStepClick?.(i)}
            disabled={!canClick}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
              'disabled:cursor-default',
              isCompleted && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
              isCurrent && 'bg-purple-500/20 text-purple-300 border border-purple-500/30 ring-1 ring-purple-500/20',
              !isCompleted && !isCurrent && 'text-slate-600 border border-white/5',
            )}
          >
            <span className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black',
              isCompleted && 'bg-emerald-500/30 text-emerald-300',
              isCurrent && 'bg-purple-500/30 text-purple-200',
              !isCompleted && !isCurrent && 'bg-white/5 text-slate-600',
            )}>
              {isCompleted ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
          {i < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-px min-w-[16px]',
              isCompleted ? 'bg-emerald-500/30' : 'bg-white/5'
            )} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);
