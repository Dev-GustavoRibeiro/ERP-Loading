'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LucideIcon, LayoutGrid } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// =====================================================
// Types
// =====================================================

export type AccentColor =
  | 'emerald' | 'blue' | 'purple' | 'amber' | 'cyan'
  | 'pink' | 'red' | 'orange' | 'violet' | 'indigo'
  | 'rose' | 'teal' | 'lime' | 'sky' | 'slate';

export interface StatCardData {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  color?: AccentColor;
  trend?: number;
  prefix?: string;
  /** Custom badge text (overrides trend %). Ex: "R$ 8.240" */
  badge?: string;
}

export interface ModuleCardData {
  icon: LucideIcon;
  label: string;
  description?: string;
  color?: AccentColor;
  href?: string;
  onClick?: () => void;
}

export interface ActionButtonData {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface PageTemplateProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  accentColor?: AccentColor;
  actionButtons?: ActionButtonData[];
  stats?: StatCardData[];
  modules?: {
    title: string;
    subtitle?: string;
    items: ModuleCardData[];
  };
  children?: React.ReactNode;
}

// =====================================================
// Color Utilities
// =====================================================

const colorMap: Record<AccentColor, {
  text: string;
  bg: string;
  bgSubtle: string;
  border: string;
  iconBg: string;
  line: string;
}> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500', bgSubtle: 'bg-emerald-500/10', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/12', line: 'via-emerald-500/25' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-500', bgSubtle: 'bg-blue-500/10', border: 'border-blue-500/20', iconBg: 'bg-blue-500/12', line: 'via-blue-500/25' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-500', bgSubtle: 'bg-purple-500/10', border: 'border-purple-500/20', iconBg: 'bg-purple-500/12', line: 'via-purple-500/25' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500', bgSubtle: 'bg-amber-500/10', border: 'border-amber-500/20', iconBg: 'bg-amber-500/12', line: 'via-amber-500/25' },
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500', bgSubtle: 'bg-cyan-500/10', border: 'border-cyan-500/20', iconBg: 'bg-cyan-500/12', line: 'via-cyan-500/25' },
  pink: { text: 'text-pink-400', bg: 'bg-pink-500', bgSubtle: 'bg-pink-500/10', border: 'border-pink-500/20', iconBg: 'bg-pink-500/12', line: 'via-pink-500/25' },
  red: { text: 'text-red-400', bg: 'bg-red-500', bgSubtle: 'bg-red-500/10', border: 'border-red-500/20', iconBg: 'bg-red-500/12', line: 'via-red-500/25' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500', bgSubtle: 'bg-orange-500/10', border: 'border-orange-500/20', iconBg: 'bg-orange-500/12', line: 'via-orange-500/25' },
  violet: { text: 'text-violet-400', bg: 'bg-violet-500', bgSubtle: 'bg-violet-500/10', border: 'border-violet-500/20', iconBg: 'bg-violet-500/12', line: 'via-violet-500/25' },
  indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500', bgSubtle: 'bg-indigo-500/10', border: 'border-indigo-500/20', iconBg: 'bg-indigo-500/12', line: 'via-indigo-500/25' },
  rose: { text: 'text-rose-400', bg: 'bg-rose-500', bgSubtle: 'bg-rose-500/10', border: 'border-rose-500/20', iconBg: 'bg-rose-500/12', line: 'via-rose-500/25' },
  teal: { text: 'text-teal-400', bg: 'bg-teal-500', bgSubtle: 'bg-teal-500/10', border: 'border-teal-500/20', iconBg: 'bg-teal-500/12', line: 'via-teal-500/25' },
  lime: { text: 'text-lime-400', bg: 'bg-lime-500', bgSubtle: 'bg-lime-500/10', border: 'border-lime-500/20', iconBg: 'bg-lime-500/12', line: 'via-lime-500/25' },
  sky: { text: 'text-sky-400', bg: 'bg-sky-500', bgSubtle: 'bg-sky-500/10', border: 'border-sky-500/20', iconBg: 'bg-sky-500/12', line: 'via-sky-500/25' },
  slate: { text: 'text-slate-400', bg: 'bg-slate-500', bgSubtle: 'bg-slate-500/10', border: 'border-slate-500/20', iconBg: 'bg-slate-500/12', line: 'via-slate-500/25' },
};

function getColor(color?: AccentColor) {
  return colorMap[color || 'blue'];
}

// =====================================================
// Stat Card — Clean flat design
// =====================================================

const StatCard: React.FC<StatCardData & { index: number }> = ({
  title, value, trend, badge, index
}) => {
  const hasBadge = trend !== undefined || !!badge;
  const isNegative = trend !== undefined && trend < 0;
  const badgeText = badge || (trend !== undefined ? `${trend >= 0 ? '+' : ''}${trend}%` : '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className={cn(
        "flex-1 min-w-[170px] p-5 rounded-2xl",
        "bg-[#111827] border border-white/[0.06]",
        "hover:border-white/[0.12] transition-all duration-300"
      )}
    >
      {/* Top row: title + trend badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 leading-none">{title}</span>
        {hasBadge && (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold leading-none",
            isNegative
              ? "bg-red-500/15 text-red-400"
              : "bg-emerald-500/15 text-emerald-400"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              isNegative ? "bg-red-400" : "bg-emerald-400"
            )} />
            {badgeText}
          </span>
        )}
      </div>

      {/* Value */}
      <p className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
        {value}
      </p>
    </motion.div>
  );
};

// =====================================================
// Module Card — Horizontal layout with icon + text
// =====================================================

const ModuleCard: React.FC<ModuleCardData & { index: number }> = ({
  icon: Icon, label, description, href, onClick, index
}) => {
  const Content = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
      className={cn(
        "flex items-start gap-4 p-5 rounded-2xl cursor-pointer",
        "bg-[#0f1724]/60 border border-white/[0.04]",
        "hover:bg-[#151f30]/80 hover:border-white/[0.08]",
        "transition-all duration-300 group h-full"
      )}
      onClick={!href ? onClick : undefined}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 p-2.5 rounded-xl",
        "bg-white/[0.05] group-hover:bg-white/[0.08]",
        "transition-all duration-300"
      )}>
        <Icon className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors duration-200" />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-bold text-white block leading-tight">{label}</span>
        {description && (
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );

  if (href) return <Link href={href} className="block h-full">{Content}</Link>;
  return Content;
};

// =====================================================
// Action Button
// =====================================================

const ActionButton: React.FC<ActionButtonData & { accentColor?: AccentColor }> = ({
  icon: Icon, label, onClick, variant = 'primary', accentColor = 'purple'
}) => {
  const c = getColor(accentColor);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl",
        "text-sm font-semibold transition-all duration-200",
        variant === 'primary'
          ? cn("border text-white hover:brightness-125", c.bgSubtle, c.border)
          : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06]"
      )}
    >
      <Icon className={cn("w-4 h-4", variant === 'primary' ? c.text : 'text-slate-400')} />
      <span>{label}</span>
    </button>
  );
};

// =====================================================
// Page Template
// =====================================================

export const PageTemplate: React.FC<PageTemplateProps> = ({
  title,
  subtitle,
  icon: PageIcon,
  accentColor = 'purple',
  actionButtons,
  stats,
  modules,
  children,
}) => {
  const c = getColor(accentColor);

  return (
    <div className="space-y-5">

      {/* ── Header Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl px-6 py-5 bg-[#111827] border border-white/[0.06]"
      >
        {/* Decorative dots (top-right) */}
        <div className="absolute top-5 right-5 flex gap-1.5 opacity-20">
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/25" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          </div>

          {actionButtons && actionButtons.length > 0 && (
            <div className="flex items-center gap-3">
              {actionButtons.map((btn, i) => (
                <ActionButton key={i} {...btn} accentColor={accentColor} />
              ))}

              {/* Refresh / page icon */}
              {PageIcon && (
                <div className={cn(
                  "p-2.5 rounded-xl border cursor-pointer transition-all duration-200",
                  "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06]"
                )}>
                  <PageIcon className={cn("w-5 h-5", c.text)} />
                </div>
              )}
            </div>
          )}

          {/* Page icon alone (no action buttons) */}
          {(!actionButtons || actionButtons.length === 0) && PageIcon && (
            <div className={cn(
              "p-2.5 rounded-xl border cursor-pointer transition-all duration-200",
              "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06]"
            )}>
              <PageIcon className={cn("w-5 h-5", c.text)} />
            </div>
          )}
        </div>

        {/* Subtle bottom accent line */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent to-transparent",
          c.line
        )} />
      </motion.div>

      {/* ── KPI Stats Row ── */}
      {stats && stats.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} index={i} />
          ))}
        </div>
      )}

      {/* ── Modules Section ── */}
      {modules && modules.items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="rounded-2xl p-6 bg-[#111827]/70 border border-white/[0.04]"
        >
          {/* Section title */}
          <div className="flex items-center gap-2.5 mb-5">
            <LayoutGrid className="w-4.5 h-4.5 text-slate-500" />
            <h2 className="text-base font-bold text-white">{modules.title}</h2>
          </div>

          {/* Module cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.items.map((mod, i) => (
              <ModuleCard key={i} {...mod} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Page-specific content ── */}
      {children}
    </div>
  );
};

export default PageTemplate;
