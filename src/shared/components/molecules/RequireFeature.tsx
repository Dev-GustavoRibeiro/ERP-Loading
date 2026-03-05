'use client'

import React from 'react'
import { useUserModulePermissions } from '@/shared/hooks/useUserModulePermissions'
import { Lock } from 'lucide-react'

interface RequireFeatureProps {
  /** Key da feature (ex: 'inv_almoxarifado') */
  featureKey: string
  /** Conteúdo a exibir se o usuário tiver permissão */
  children: React.ReactNode
  /** Conteúdo alternativo se não tiver permissão (opcional) */
  fallback?: React.ReactNode
  /** Se true, esconde completamente ao invés de mostrar fallback */
  hide?: boolean
}

/**
 * Componente que controla a visibilidade de features granulares.
 *
 * Uso:
 * ```tsx
 * <RequireFeature featureKey="inv_almoxarifado">
 *   <AlmoxarifadoSection />
 * </RequireFeature>
 * ```
 *
 * Comportamento:
 * - Se o usuário NÃO tem permissões no ERP (admin/owner), mostra tudo
 * - Se o usuário tem permissões granulares e a feature está liberada, mostra
 * - Se a feature não está liberada, mostra fallback ou esconde
 */
export const RequireFeature: React.FC<RequireFeatureProps> = ({
  featureKey,
  children,
  fallback,
  hide = false,
}) => {
  const { permissions, hasFeature, isLoading } = useUserModulePermissions()

  // Enquanto carrega, não renderiza nada (evita flash)
  if (isLoading) return null

  // Se não tem permissões granulares configuradas (admin/owner), libera tudo
  if (!permissions || permissions.modulos.length === 0) {
    return <>{children}</>
  }

  // Verifica se a feature está liberada
  if (hasFeature(featureKey)) {
    return <>{children}</>
  }

  // Não tem permissão
  if (hide) return null

  if (fallback) return <>{fallback}</>

  // Fallback padrão
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 mb-3">
        <Lock className="h-6 w-6 text-slate-500" />
      </div>
      <p className="text-sm text-slate-500">
        Você não tem permissão para acessar este recurso.
      </p>
      <p className="text-xs text-slate-600 mt-1">
        Contate o administrador da empresa.
      </p>
    </div>
  )
}
