'use client';

import React from 'react';
import { cn } from '@/shared/lib/utils';
import { TypographyProps, TypographyVariant, TypographyColor } from '@/shared/types';

const variantStyles: Record<TypographyVariant, string> = {
  h1: 'text-4xl font-black tracking-tight',
  h2: 'text-3xl font-bold tracking-tight',
  h3: 'text-2xl font-bold',
  h4: 'text-xl font-semibold',
  large: 'text-lg font-medium',
  base: 'text-base',
  small: 'text-sm',
  caption: 'text-xs',
};

const colorStyles: Record<TypographyColor, string> = {
  default: 'text-slate-100',
  muted: 'text-slate-400',
  primary: 'text-blue-400',
  secondary: 'text-slate-300',
  white: 'text-white',
  error: 'text-red-400',
  success: 'text-emerald-400',
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'base',
  color = 'default',
  className,
  children,
}) => {
  const Component = variant.startsWith('h') ? (variant as 'h1' | 'h2' | 'h3' | 'h4') : 'p';

  return (
    <Component
      className={cn(
        variantStyles[variant],
        colorStyles[color],
        className
      )}
    >
      {children}
    </Component>
  );
};


