'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/shared/components/ui'
import { Button } from '@/shared/components/atoms/Button'
import { Avatar } from '@/shared/components/atoms/Avatar'
import { cn } from '@/shared/lib/utils'
import {
  Shield,
  ChevronDown,
  ChevronRight,
  Check,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Download,
  Save,
} from 'lucide-react'
import { useEmpresaId } from '@/shared/hooks/useEmpresaId'
import { getAvailableModulesWithFeatures } from '@/app/actions/userPermissions'
import { showToast } from '@/shared/components/molecules/Toast'

// =====================================================
// Tipos
// =====================================================

interface AvailableFeature {
  id: string
  key: string
  name: string
  description?: string
}

interface AvailableModule {
  id: string
  key: string
  name: string
  features: AvailableFeature[]
}

interface FeaturePermissions {
  feature_key: string
  pode_visualizar: boolean
  pode_criar: boolean
  pode_editar: boolean
  pode_excluir: boolean
  pode_exportar: boolean
}

interface ModuleSelection {
  module_key: string
  features: FeaturePermissions[]
}

interface UserData {
  id: string
  name: string
  email: string
  avatar_url?: string
  modulos: {
    module_key: string
    features: FeaturePermissions[]
  }[]
}

interface EditPermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: UserData | null
}

// =====================================================
// Componente
// =====================================================

export const EditPermissionsModal: React.FC<EditPermissionsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const empresaId = useEmpresaId()

  const [availableModules, setAvailableModules] = useState<AvailableModule[]>([])
  const [selectedModules, setSelectedModules] = useState<ModuleSelection[]>([])
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [isLoadingModules, setIsLoadingModules] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch available modules
  useEffect(() => {
    if (isOpen && empresaId) {
      setIsLoadingModules(true)
      getAvailableModulesWithFeatures(empresaId)
        .then(({ data }) => {
          setAvailableModules(data || [])
        })
        .finally(() => setIsLoadingModules(false))
    }
  }, [isOpen, empresaId])

  // Initialize selected modules from user data
  useEffect(() => {
    if (isOpen && user) {
      setSelectedModules(
        (user.modulos || []).map((m) => ({
          module_key: m.module_key,
          features: (m.features || []).map((f) => ({ ...f })),
        }))
      )
      setExpandedModules([])
    }
  }, [isOpen, user])

  // Toggle module selection
  const toggleModule = useCallback(
    (moduleKey: string, features: AvailableFeature[]) => {
      setSelectedModules((prev) => {
        const exists = prev.find((m) => m.module_key === moduleKey)
        if (exists) {
          return prev.filter((m) => m.module_key !== moduleKey)
        }
        return [
          ...prev,
          {
            module_key: moduleKey,
            features: features.map((f) => ({
              feature_key: f.key,
              pode_visualizar: true,
              pode_criar: false,
              pode_editar: false,
              pode_excluir: false,
              pode_exportar: false,
            })),
          },
        ]
      })
    },
    []
  )

  const toggleExpand = useCallback((moduleKey: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((k) => k !== moduleKey)
        : [...prev, moduleKey]
    )
  }, [])

  const toggleFeaturePermission = useCallback(
    (moduleKey: string, featureKey: string, permType: keyof FeaturePermissions) => {
      setSelectedModules((prev) =>
        prev.map((mod) => {
          if (mod.module_key !== moduleKey) return mod
          return {
            ...mod,
            features: (mod.features || []).map((feat) => {
              if (feat.feature_key !== featureKey) return feat
              return { ...feat, [permType]: !feat[permType] }
            }),
          }
        })
      )
    },
    []
  )

  const handleSubmit = async () => {
    if (!user || !empresaId) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/erp/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          empresa_id: empresaId,
          modulos: selectedModules,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        showToast.error(result.error || 'Erro ao atualizar permissões')
        return
      }

      showToast.success('Permissões atualizadas com sucesso!')
      onSuccess()
      onClose()
    } catch (error: any) {
      showToast.error(error.message || 'Erro inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isModuleSelected = (key: string) =>
    selectedModules.some((m) => m.module_key === key)

  if (!user) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Permissões"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Salvar Permissões
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* User info */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <Avatar
            src={user.avatar_url}
            fallback={user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
            size="lg"
          />
          <div>
            <h3 className="font-medium text-white">{user.name}</h3>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-white/10" />

        {/* Modules */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 opacity-60" />
            Módulos e Permissões
          </h3>

          {isLoadingModules ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-none">
              {availableModules.map((mod) => {
                const selected = isModuleSelected(mod.key)
                const expanded = expandedModules.includes(mod.key)

                return (
                  <div
                    key={mod.key}
                    className={cn(
                      'rounded-xl border transition-all duration-200',
                      selected
                        ? 'border-blue-500/30 bg-blue-500/5'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                    )}
                  >
                    {/* Module header */}
                    <div className="flex items-center gap-3 p-3">
                      <button
                        onClick={() => toggleModule(mod.key, mod.features)}
                        className={cn(
                          'h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-all',
                          selected
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-white/20 hover:border-white/40'
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </button>

                      <span className="flex-1 text-sm font-medium text-white">
                        {mod.name}
                      </span>

                      {selected && mod.features.length > 0 && (
                        <button
                          onClick={() => toggleExpand(mod.key)}
                          className="p-1 rounded-md hover:bg-white/10 text-slate-400 transition-colors"
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}

                      {selected && (
                        <span className="text-xs text-blue-400">
                          {mod.features.length} func.
                        </span>
                      )}
                    </div>

                    {/* Features */}
                    {selected && expanded && mod.features.length > 0 && (
                      <div className="border-t border-white/5 px-3 pb-3">
                        <div className="mt-2 space-y-1">
                          <div className="grid grid-cols-[1fr_repeat(5,_2.5rem)] gap-1 px-2 py-1">
                            <span className="text-[10px] text-slate-500 uppercase">
                              Funcionalidade
                            </span>
                            <span className="text-[10px] text-slate-500 text-center" title="Visualizar">
                              <Eye className="h-3 w-3 mx-auto" />
                            </span>
                            <span className="text-[10px] text-slate-500 text-center" title="Criar">
                              <Plus className="h-3 w-3 mx-auto" />
                            </span>
                            <span className="text-[10px] text-slate-500 text-center" title="Editar">
                              <Pencil className="h-3 w-3 mx-auto" />
                            </span>
                            <span className="text-[10px] text-slate-500 text-center" title="Excluir">
                              <Trash2 className="h-3 w-3 mx-auto" />
                            </span>
                            <span className="text-[10px] text-slate-500 text-center" title="Exportar">
                              <Download className="h-3 w-3 mx-auto" />
                            </span>
                          </div>

                          {mod.features.map((feat) => {
                            const modSelection = selectedModules.find(
                              (m) => m.module_key === mod.key
                            )
                            const featPerms = modSelection?.features.find(
                              (f) => f.feature_key === feat.key
                            )

                            return (
                              <div
                                key={feat.key}
                                className="grid grid-cols-[1fr_repeat(5,_2.5rem)] gap-1 px-2 py-1.5 rounded-lg hover:bg-white/5"
                              >
                                <span className="text-xs text-slate-300 truncate" title={feat.description}>
                                  {feat.name}
                                </span>
                                {(['pode_visualizar', 'pode_criar', 'pode_editar', 'pode_excluir', 'pode_exportar'] as const).map(
                                  (perm) => (
                                    <button
                                      key={perm}
                                      onClick={() =>
                                        toggleFeaturePermission(mod.key, feat.key, perm)
                                      }
                                      className={cn(
                                        'h-5 w-5 rounded border mx-auto flex items-center justify-center transition-all',
                                        featPerms?.[perm]
                                          ? 'bg-emerald-500/80 border-emerald-500 text-white'
                                          : 'border-white/15 hover:border-white/30'
                                      )}
                                    >
                                      {featPerms?.[perm] && (
                                        <Check className="h-2.5 w-2.5" />
                                      )}
                                    </button>
                                  )
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
