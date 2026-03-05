'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAllowedModules } from '@/shared/hooks/useAllowedModules';
import { Loader2 } from 'lucide-react';

interface ModuleGuardProps {
  children: React.ReactNode;
  moduleKey?: string; // Optional: Enforce specific module check
}

export const ModuleGuard = ({ children, moduleKey }: ModuleGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { allowedModules, isLoading } = useAllowedModules();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    // Define module paths mapping
    const modulePaths: Record<string, string> = {
      'financeiro': '/dashboard/financeiro',
      'clientes': '/dashboard/clientes',
      'vendas': '/dashboard/vendas',
      // ... add other mappings
    };

    // If a specific module key is provided, check it
    if (moduleKey) {
      if (!allowedModules.includes(moduleKey)) {
        setIsAuthorized(false);
        router.push('/dashboard/unauthorized'); // Or just /dashboard
        return;
      }
    }

    // Otherwise, try to infer from path
    // This is a bit more complex as paths might be nested. 
    // Simple check: iterate keys and see if pathname starts with it.
    // BUT 'dashboard' module key matches '/dashboard', which is the root.
    // 'dashboard' key usually means "can access dashboard at all".

    // Let's rely on explicit wrapping for now in layout.tsx or page.tsx 
    // OR just let the sidebar handle UI and assume this component is used specifically for guarding.

    // If not using explicit key, we assume the parent checks logic or we just render children.
    // But the requirement is "block access by URL".

    // Strategy: 
    // Check if current path belongs to a restricted module.
    // If yes, check permission.

    const protectedRoutes = [
      { key: 'financeiro', path: '/dashboard/financeiro' },
      { key: 'clientes', path: '/dashboard/clientes' },
      { key: 'vendas', path: '/dashboard/vendas' },
      { key: 'pdv', path: '/dashboard/pdv' },
      { key: 'crm', path: '/dashboard/crm' },
      { key: 'rh', path: '/dashboard/rh' },
      { key: 'settings', path: '/dashboard/settings' },
      // ...
    ];

    const currentProtection = protectedRoutes.find(r => pathname.startsWith(r.path));

    if (currentProtection) {
      if (!allowedModules.includes(currentProtection.key)) {
        setIsAuthorized(false);
        // Prevent infinite redirect if dashboard itself is restricted (unlikely)
        if (pathname !== '/dashboard') {
          router.push('/dashboard');
        }
        return;
      }
    }

    setIsAuthorized(true);

  }, [isLoading, allowedModules, pathname, moduleKey, router]);

  if (isLoading || isAuthorized === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A101F]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isAuthorized === false) {
    return null; // or a "Not Authorized" component
  }

  return <>{children}</>;
};
