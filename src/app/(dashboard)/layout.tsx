'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/shared/components/organisms/Sidebar'
import { Header } from '@/shared/components/organisms/Header'
import { BottomNav } from '@/shared/components/organisms/BottomNav'
import { MobileHeader } from '@/shared/components/organisms/MobileHeader'
import { BackgroundGradient } from '@/shared/components/organisms/BackgroundGradient'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  // Calcular margem do sidebar para desktop
  const sidebarMargin = sidebarOpen ? 276 : 86

  return (
    <BackgroundGradient themeName="dark">
      <div className="min-h-screen bg-transparent">
        {/* Background Pattern - reduzido para não escurecer */}
        <div className="fixed inset-0 pattern-grid opacity-10 pointer-events-none" />
        <div className="fixed inset-0 gradient-zed-mesh opacity-15 pointer-events-none" />

        {/* ====== MOBILE LAYOUT (< 768px) - APENAS CELULARES ====== */}
        <div className="md:hidden min-h-screen flex flex-col safe-area-top">
          {/* Header Mobile - logo centralizada e ações */}
          <MobileHeader />

          {/* Conteúdo Mobile - responsivo */}
          <main className="flex-1 px-3 sm:px-4 py-3 sm:py-4 pb-20 sm:pb-24 safe-area-left safe-area-right">
            <div className="max-w-4xl mx-auto">
              {children}
            </div>
          </main>

          {/* Bottom Navigation */}
          <BottomNav />
        </div>

        {/* ====== TABLET/DESKTOP LAYOUT (>= 768px) - TABLETS E DESKTOPS ====== */}
        <div className="hidden md:block">
          {/* Sidebar lateral */}
          <Sidebar
            isOpen={sidebarOpen}
            closeSidebar={closeSidebar}
            pathname={pathname}
          />

          {/* Conteúdo Desktop */}
          <div
            className="min-h-screen transition-all duration-200 ease-out"
            style={{
              marginLeft: `${sidebarMargin}px`,
              paddingRight: '8px',
              paddingTop: '8px',
              paddingBottom: '8px',
            }}
          >
            <div className="space-y-4">
              {/* Header Desktop */}
              <Header
                toggleSidebar={toggleSidebar}
                isSidebarOpen={sidebarOpen}
                title={getPageTitle()}
              />

              {/* Page Content */}
              <main className="relative z-10">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  )
}
