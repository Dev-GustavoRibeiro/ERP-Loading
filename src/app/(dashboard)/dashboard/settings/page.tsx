'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings,
  User,
  Shield,
  Bell,
  LogOut,
  Trash2,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/molecules/Card'
import { Button } from '@/shared/components/atoms/Button'
import { Avatar } from '@/shared/components/atoms/Avatar'
import { useSupabaseAuth } from '@/shared/hooks/useSupabaseAuth'
import { useUserProfile } from '@/shared/hooks/useUserProfile'

export default function SettingsPage() {
  const { logout, deleteAccount, user } = useSupabaseAuth()
  const { profile } = useUserProfile()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    const success = await deleteAccount()
    if (!success) {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
          <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
          Configurações
        </h1>
        <p className="text-slate-400 mt-1">Gerencie sua conta e preferências</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader icon={<User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />}>
            <CardTitle className="text-base sm:text-lg">Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar
                src={profile?.avatar_url || undefined}
                fallback={profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                size="lg"
                className="border-2 border-blue-400/30"
              />
              <div>
                <h3 className="font-medium text-white">
                  {profile?.name || user?.user_metadata?.name || 'Usuário'}
                </h3>
                <p className="text-sm text-slate-400">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader icon={<Shield className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />}>
            <CardTitle className="text-base sm:text-lg">Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="font-medium text-white">Autenticação</p>
                <p className="text-sm text-slate-400">Via Supabase Auth</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                Ativo
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader icon={<Bell className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />}>
            <CardTitle className="text-base sm:text-lg">Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <Bell className="h-12 w-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">Configurações de notificação (Placeholder)</p>
              <p className="text-slate-500 text-xs mt-1">Adicione suas próprias configurações aqui</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-red-500/20">
          <CardHeader icon={<Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />}>
            <CardTitle className="text-base sm:text-lg text-red-400">Zona de Perigo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logout */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="font-medium text-white">Sair da conta</p>
                <p className="text-sm text-slate-400">Encerrar sessão atual</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                Sair
              </Button>
            </div>

            {/* Delete Account */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <div>
                <p className="font-medium text-white">Excluir conta</p>
                <p className="text-sm text-slate-400">Esta ação não pode ser desfeita</p>
              </div>
              {!showDeleteConfirm ? (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Excluir
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteAccount}
                    isLoading={isDeleting}
                  >
                    Confirmar
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
