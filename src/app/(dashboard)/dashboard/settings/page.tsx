'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings,
  User,
  Shield,
  Bell,
  LogOut,
  Trash2,
  Users,
  UserPlus,
  Pencil,
  Package,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/molecules/Card'
import { Button } from '@/shared/components/atoms/Button'
import { Avatar } from '@/shared/components/atoms/Avatar'
import { useSupabaseAuth } from '@/shared/hooks/useSupabaseAuth'
import { useUserProfile } from '@/shared/hooks/useUserProfile'
import { useEmpresaId } from '@/shared/hooks/useEmpresaId'
import { CreateUserModal } from '@/shared/components/molecules/CreateUserModal'
import { EditPermissionsModal } from '@/shared/components/molecules/EditPermissionsModal'
import { ConfirmationModal } from '@/shared/components/molecules/ConfirmationModal'
import { showToast } from '@/shared/components/molecules/Toast'

// =====================================================
// Tipos
// =====================================================

interface UserModuleFeature {
  feature_key: string
  pode_visualizar: boolean
  pode_criar: boolean
  pode_editar: boolean
  pode_excluir: boolean
  pode_exportar: boolean
}

interface UserModuleData {
  module_key: string
  features: UserModuleFeature[]
}

interface ERPUser {
  id: string
  name: string
  email: string
  avatar_url?: string
  role?: string
  modulos: UserModuleData[]
  totalModulos: number
}

// =====================================================
// Tabs
// =====================================================

type TabId = 'perfil' | 'usuarios' | 'seguranca'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'perfil', label: 'Perfil', icon: <User className="h-4 w-4" /> },
  { id: 'usuarios', label: 'Usuários', icon: <Users className="h-4 w-4" /> },
  { id: 'seguranca', label: 'Segurança', icon: <Shield className="h-4 w-4" /> },
]

// =====================================================
// Página
// =====================================================

export default function SettingsPage() {
  const { logout, deleteAccount, user } = useSupabaseAuth()
  const { profile } = useUserProfile()
  const empresaId = useEmpresaId()
  const [activeTab, setActiveTab] = useState<TabId>('perfil')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Usuarios state
  const [usuarios, setUsuarios] = useState<ERPUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<ERPUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<ERPUser | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null)

  // Fetch usuarios
  const fetchUsuarios = useCallback(async () => {
    if (!empresaId) return

    setIsLoadingUsers(true)
    try {
      const response = await fetch(`/api/erp/usuarios?empresa_id=${empresaId}`)
      const result = await response.json()

      if (response.ok) {
        setUsuarios(result.data || [])
      } else {
        console.error('Erro ao buscar usuários:', result.error)
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [empresaId])

  useEffect(() => {
    if (activeTab === 'usuarios' && empresaId) {
      fetchUsuarios()
    }
  }, [activeTab, empresaId, fetchUsuarios])

  // Handlers
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

  const handleDeleteUser = async () => {
    if (!deletingUser || !empresaId) return

    setIsDeletingUser(true)
    try {
      const response = await fetch(
        `/api/erp/usuarios?user_id=${deletingUser.id}&empresa_id=${empresaId}`,
        { method: 'DELETE' }
      )
      const result = await response.json()

      if (response.ok) {
        showToast.success('Usuário removido com sucesso')
        fetchUsuarios()
      } else {
        showToast.error(result.error || 'Erro ao remover usuário')
      }
    } catch (error: any) {
      showToast.error(error.message || 'Erro inesperado')
    } finally {
      setIsDeletingUser(false)
      setDeletingUser(null)
    }
  }

  // Close menu on click outside
  useEffect(() => {
    const handleClick = () => setOpenMenuUserId(null)
    if (openMenuUserId) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [openMenuUserId])

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
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
        <p className="text-slate-400 mt-1">Gerencie sua conta, usuários e preferências</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* ================================ */}
        {/* TAB: Perfil */}
        {/* ================================ */}
        {activeTab === 'perfil' && (
          <>
            {/* Profile Card */}
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

            {/* Notifications Placeholder */}
            <Card>
              <CardHeader icon={<Bell className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />}>
                <CardTitle className="text-base sm:text-lg">Notificações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <Bell className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400 text-sm">Configurações de notificação (Em breve)</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ================================ */}
        {/* TAB: Usuários */}
        {/* ================================ */}
        {activeTab === 'usuarios' && (
          <Card>
            <CardHeader
              icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                >
                  Novo Usuário
                </Button>
              }
            >
              <CardTitle className="text-base sm:text-lg">Usuários da Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : usuarios.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400 text-sm">
                    Nenhum usuário cadastrado
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Clique em &quot;Novo Usuário&quot; para adicionar o primeiro
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {usuarios.map((usr) => (
                    <div
                      key={usr.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all"
                    >
                      <Avatar
                        src={usr.avatar_url}
                        fallback={usr.name?.charAt(0) || usr.email?.charAt(0) || 'U'}
                        size="default"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">
                          {usr.name}
                        </h4>
                        <p className="text-xs text-slate-400 truncate">{usr.email}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">
                          <Package className="h-3 w-3" />
                          {usr.totalModulos} módulo{usr.totalModulos !== 1 ? 's' : ''}
                        </span>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuUserId(
                                openMenuUserId === usr.id ? null : usr.id
                              )
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {openMenuUserId === usr.id && (
                            <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl bg-slate-800 border border-white/10 shadow-2xl py-1">
                              <button
                                onClick={() => {
                                  setEditingUser(usr)
                                  setOpenMenuUserId(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar Permissões
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingUser(usr)
                                  setOpenMenuUserId(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remover Usuário
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================================ */}
        {/* TAB: Segurança */}
        {/* ================================ */}
        {activeTab === 'seguranca' && (
          <>
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

            {/* Danger Zone */}
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
          </>
        )}
      </motion.div>

      {/* ================================ */}
      {/* Modais */}
      {/* ================================ */}

      {/* Criar Usuário */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchUsuarios}
      />

      {/* Editar Permissões */}
      <EditPermissionsModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={fetchUsuarios}
        user={editingUser}
      />

      {/* Confirmar Remoção */}
      <ConfirmationModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteUser}
        title="Remover Usuário"
        description={`Tem certeza que deseja remover ${deletingUser?.name || 'este usuário'} da empresa? Os módulos e permissões serão removidos.`}
        confirmText="Remover"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeletingUser}
      />
    </div>
  )
}
