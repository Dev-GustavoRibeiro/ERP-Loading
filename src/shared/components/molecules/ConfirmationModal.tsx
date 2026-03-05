'use client'

import React from 'react'
import { Modal, Button } from '@/shared/components/ui'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/shared/lib'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  isLoading = false
}) => {
  const icons = {
    danger: <AlertCircle className="w-12 h-12 text-red-500 mb-4" />,
    warning: <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />,
    info: <Info className="w-12 h-12 text-blue-500 mb-4" />
  }

  // Map variant to Button variant
  const getButtonVariant = (v: string): 'primary' | 'secondary' | 'danger' | 'ghost' => {
    switch (v) {
      case 'danger': return 'danger'
      case 'warning': return 'primary' // Using primary as warning replacement if needed, or update Button component
      default: return 'primary'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      footer={
        <div className="flex justify-center gap-3 w-full pb-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={getButtonVariant(variant)}
            onClick={onConfirm}
            isLoading={isLoading}
            className={cn(variant === 'warning' && "bg-amber-600 hover:bg-amber-700")}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center p-4">
        {icons[variant]}
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400">{description}</p>
      </div>
    </Modal>
  )
}
