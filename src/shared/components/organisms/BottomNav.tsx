'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import { cn } from '@/shared/lib';

// Itens principais da navegação (simplificado para template)
const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', color: 'blue' },
  { icon: Settings, label: 'Configurações', href: '/dashboard/settings', color: 'slate' },
];

const colorMap: Record<string, { active: string; icon: string; indicator: string; bg: string }> = {
  blue: { active: 'bg-blue-500/20', icon: 'text-blue-400', indicator: 'bg-blue-400', bg: 'bg-blue-500/10' },
  slate: { active: 'bg-slate-500/20', icon: 'text-slate-400', indicator: 'bg-slate-400', bg: 'bg-slate-500/10' },
};

export const BottomNav = () => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50',
      'md:hidden',
      'bg-gradient-to-t from-[#0A101F]/98 to-[#111827]/95',
      'border-t border-white/10',
      'backdrop-blur-xl',
      'safe-area-bottom'
    )}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around px-2 py-1.5 sm:py-2">
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            const colors = colorMap[item.color];

            return (
              <Link key={item.href} href={item.href} className="flex-1 max-w-[80px]">
                <motion.div
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-0.5 py-1.5 sm:py-2 px-2 rounded-xl mx-0.5',
                    'transition-all duration-200',
                    active ? colors.active : 'hover:bg-white/5'
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <item.icon
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                    className={cn(
                      'transition-colors duration-200',
                      active ? colors.icon : 'text-slate-400'
                    )}
                  />
                  <span className={cn(
                    'text-[10px] sm:text-xs font-medium transition-colors duration-200',
                    active ? 'text-white' : 'text-slate-500'
                  )}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className={cn(
                        'absolute -bottom-0.5 w-6 sm:w-8 h-0.5 rounded-full',
                        colors.indicator
                      )}
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
