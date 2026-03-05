'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/shared/components/ui'
import { Button } from '@/shared/components/atoms/Button'
import { cn } from '@/shared/lib/utils'
import {
  UserPlus,
  Mail,
  User,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Check,
  Package,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Download,
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

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// =====================================================
// Componente
// =====================================================

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const empresaId = useEmpresaId()

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cargo, setCargo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modules state
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>([])
  const [selectedModules, setSelectedModules] = useState<ModuleSelection[]>([])
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [isLoadingModules, setIsLoadingModules] = useState(false)

  // Fetch available modules when modal opens
  useEffect(() => {
    if (isOpen && empresaId) {
      setIsLoadingModules(true)
      getAvailableModulesWithFeatures(empresaId)
        .then(({ data }) => {
          setAvailableModules(data || [])
        })
        .catch((err) => {
          console.error('Erro ao buscar módulos:', err)
        })
        .finally(() => {
          setIsLoadingModules(false)
        })
    }
  }, [isOpen, empresaId])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('')
      setEmail('')
      setCargo('')
      setSelectedModules([])
      setExpandedModules([])
    }
  }, [isOpen])

  // Toggle module selection
  const toggleModule = useCallback((moduleKey: string, features: AvailableFeature[]) => {
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
  }, [])

  // Toggle expand/collapse module features
  const toggleExpand = useCallback((moduleKey: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((k) => k !== moduleKey)
        : [...prev, moduleKey]
    )
  }, [])

  // Toggle feature permission
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

  // Submit
  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      showToast.warning('Preencha nome e email do usuário')
      return
    }

    if (selectedModules.length === 0) {
      showToast.warning('Selecione pelo menos um módulo')
      return
    }

    if (!empresaId) {
      showToast.error('Empresa não selecionada')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/erp/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          empresa_id: empresaId,
          cargo: cargo.trim() || undefined,
          modulos: selectedModules,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        showToast.error(result.error || 'Erro ao criar usuário')
        return
      }

      showToast.success('Usuário criado com sucesso!')
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Usuário"
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
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Criar Usuário
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Dados do Usuário */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Dados do Usuário
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                <User className="inline h-3.5 w-3.5 mr-1.5 opacity-60" />
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg',
                  'bg-white/5 border border-white/10',
                  'text-white placeholder:text-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
                  'transition-all duration-200'
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                <Mail className="inline h-3.5 w-3.5 mr-1.5 opacity-60" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg',
                  'bg-white/5 border border-white/10',
                  'text-white placeholder:text-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
                  'transition-all duration-200'
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              <Briefcase className="inline h-3.5 w-3.5 mr-1.5 opacity-60" />
              Cargo (opcional)
            </label>
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex: Vendedor, Gerente, etc."
              className={cn(
                'w-full px-4 py-2.5 rounded-lg',
                'bg-white/5 border border-white/10',
                'text-white placeholder:text-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
                'transition-all duration-200'
              )}
            />
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-white/10" />

        {/* Módulos e Permissões */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            <Package className="inline h-3.5 w-3.5 mr-1.5 opacity-60" />
            Módulos e Permissões
          </h3>
          <p className="text-xs text-slate-500">
            Selecione os módulos e funcionalidades que este usuário terá acesso.
          </p>

          {isLoadingModules ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : availableModules.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Nenhum módulo disponível para esta empresa.
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-none">
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
                          {mod.features.length} funcionalidades
                        </span>
                      )}
                    </div>

                    {/* Features (expanded) */}
                    {selected && expanded && mod.features.length > 0 && (
                      <div className="border-t border-white/5 px-3 pb-3">
                        <div className="mt-2 space-y-1">
                          {/* Header */}
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

                          {/* Feature rows */}
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
