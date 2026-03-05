'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/shared/components/organisms/Sidebar'
import { Header } from '@/shared/components/organisms/Header'

import { BackgroundGradient } from '@/shared/components/organisms/BackgroundGradient'
import { ZedAssistant } from '@/shared/components/organisms/ZedAssistant'
import { useEmpresaId } from '@/shared/hooks/useEmpresaId'
import { useResponsiveScreen } from '@/shared/hooks/useResponsiveScreen'
import { cn } from '@/shared/lib/utils'
import { ModuleGuard } from '@/shared/components/auth/ModuleGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const empresaId = useEmpresaId()
  const { isMobile, isSmallMobile } = useResponsiveScreen()

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  // Determinar título da página
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname.includes('/settings')) return 'Configurações'
    return 'Dashboard'
  }

  // Calcular margem do sidebar
  // Mobile: 0 (navbar fixa embaixo)
  // Desktop Aberto: 276px
  // Desktop Fechado: 86px
  const sidebarMargin = isMobile ? 0 : (sidebarOpen ? 276 : 86)

  return (
    <BackgroundGradient themeName="dark">
      <div className="min-h-screen bg-transparent">
        {/* Background Pattern - reduzido para não escurecer */}
        <div className="fixed inset-0 pattern-grid opacity-10 pointer-events-none" />
        <div className="fixed inset-0 gradient-zed-mesh opacity-15 pointer-events-none" />

        {/* Sidebar Única Responsiva */}
        <Sidebar
          isOpen={sidebarOpen}
          closeSidebar={closeSidebar}
          pathname={pathname}
        />

        {/* Main Content Area */}
        <div
          className={cn(
            "min-h-screen transition-all duration-200 ease-out",
          )}
          style={{
            marginLeft: isMobile ? '0px' : `${sidebarMargin}px`,
            paddingRight: isMobile ? '16px' : '8px',
            paddingTop: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 68px)' : '8px',
            paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 84px)' : '8px',
            paddingLeft: isMobile ? '16px' : '0px',
          }}
        >
          <div className="space-y-4">
            {/* Header Desktop (Hidden on Mobile) */}
            {!isMobile && (
              <Header
                toggleSidebar={toggleSidebar}
                isSidebarOpen={sidebarOpen}
                title={getPageTitle()}
              />
            )}

            {/* Page Content */}
            <main className="relative z-10">
              <ModuleGuard>
                {children}
              </ModuleGuard>
            </main>
          </div>
        </div>

        {/* ZED AI Assistant - Floating Button */}
        <ZedAssistant empresaId={empresaId} />
      </div>
    </BackgroundGradient>
  )
}
