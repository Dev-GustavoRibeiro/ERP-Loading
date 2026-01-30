'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Sparkles,
  Rocket,
  Settings,
  Plus,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/shared/components/molecules/Card'
import { Button } from '@/shared/components/atoms/Button'
import { ZedLogo } from '@/shared/components/atoms/ZedLogo'
import { useSupabaseAuth } from '@/shared/hooks/useSupabaseAuth'

export default function DashboardPage() {
  const { user } = useSupabaseAuth()

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8",
          "bg-gradient-to-br from-[#0A101F]/95 to-[#111827]/90",
          "border border-white/10"
        )}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 sm:w-48 h-24 sm:h-48 bg-amber-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
            <ZedLogo size="lg" className="sm:hidden" />
            <ZedLogo size="xl" className="hidden sm:block" />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white">
                Olá, <span className="text-gradient-zed">{userName}</span>!
              </h1>
              <p className="mt-1 text-sm sm:text-base text-slate-400">
                Bem-vindo ao seu template. Comece a construir algo incrível!
              </p>
            </div>
          </div>
          
          <Link href="/dashboard/settings" className="w-full sm:w-auto">
            <Button variant="gold" rightIcon={<Settings className="h-4 w-4" />} className="w-full sm:w-auto">
              Configurações
            </Button>
          </Link>
        </div>

        {/* Accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/40 via-amber-500/40 to-slate-500/40" />
      </motion.div>

      {/* Template Info Cards */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Getting Started */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader icon={<Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />}>
              <CardTitle className="text-base sm:text-lg">Comece Aqui</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                Este é um template limpo com autenticação, design system e estrutura pronta para você criar seu próximo projeto.
              </p>
              <div className="space-y-2">
                <FeatureItem icon={Sparkles} text="Design System completo com Tailwind CSS" />
                <FeatureItem icon={Sparkles} text="Autenticação com Supabase" />
                <FeatureItem icon={Sparkles} text="Layout responsivo (Mobile/Desktop)" />
                <FeatureItem icon={Sparkles} text="Componentes reutilizáveis" />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm" leftIcon={<Plus className="h-3 w-3" />}>
                Criar novo módulo
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Placeholder Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader icon={<LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />}>
              <CardTitle className="text-base sm:text-lg">Seus Módulos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <PlaceholderCard 
                  title="Módulo 1" 
                  description="Adicione seu primeiro módulo aqui" 
                  color="blue"
                />
                <PlaceholderCard 
                  title="Módulo 2" 
                  description="Mais funcionalidades podem ser adicionadas" 
                  color="emerald"
                />
                <PlaceholderCard 
                  title="Módulo 3" 
                  description="Expanda conforme necessário" 
                  color="amber"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader icon={<Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />}>
            <CardTitle className="text-base sm:text-lg">Estatísticas (Placeholder)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatPlaceholder label="Total" value="0" color="blue" />
              <StatPlaceholder label="Ativos" value="0" color="emerald" />
              <StatPlaceholder label="Pendentes" value="0" color="amber" />
              <StatPlaceholder label="Concluídos" value="0" color="purple" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// Feature Item Component
interface FeatureItemProps {
  icon: React.ElementType
  text: string
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-4 w-4 text-emerald-400 shrink-0" />
    <span className="text-sm text-slate-300">{text}</span>
  </div>
)

// Placeholder Card Component
interface PlaceholderCardProps {
  title: string
  description: string
  color: 'blue' | 'emerald' | 'amber' | 'purple'
}

const colorClasses = {
  blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
  emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
  amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
  purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
}

const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ title, description, color }) => (
  <div className={cn(
    "p-4 rounded-xl border bg-gradient-to-br",
    colorClasses[color]
  )}>
    <h3 className="font-medium text-white">{title}</h3>
    <p className="text-xs text-slate-400 mt-1">{description}</p>
  </div>
)

// Stat Placeholder Component
interface StatPlaceholderProps {
  label: string
  value: string
  color: 'blue' | 'emerald' | 'amber' | 'purple'
}

const StatPlaceholder: React.FC<StatPlaceholderProps> = ({ label, value, color }) => (
  <div className={cn(
    "p-4 rounded-xl border bg-gradient-to-br text-center",
    colorClasses[color]
  )}>
    <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
    <p className="text-xs text-slate-400 mt-1">{label}</p>
  </div>
)
