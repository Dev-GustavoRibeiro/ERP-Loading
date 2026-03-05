'use client'

import React from 'react'
import { Toaster as ReactHotToaster, toast, Toast } from 'react-hot-toast'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/shared/lib/utils'

interface ZedToastProps {
  t: Toast
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
}

export const ZedToast: React.FC<ZedToastProps> = ({ t, type = 'info', title, message }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />
  }

  const borders = {
    success: 'border-emerald-500/20',
    error: 'border-red-500/20',
    warning: 'border-amber-500/20',
    info: 'border-blue-500/20'
  }

  const bgColors = {
    success: 'bg-emerald-500/10',
    error: 'bg-red-500/10',
    warning: 'bg-amber-500/10',
    info: 'bg-blue-500/10'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        "max-w-md w-full pointer-events-auto flex items-start gap-4 p-4 rounded-xl shadow-2xl backdrop-blur-xl border",
        "bg-[#0F172A]/95", // Dark background
        borders[type]
      )}
    >
      <div className={cn("p-2 rounded-lg", bgColors[type])}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white mb-1">
          {title}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          {message}
        </p>
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="text-slate-500 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

export const showToast = {
  success: (message: string, title: string = 'Sucesso') =>
    toast.custom((t) => <ZedToast t={t} type="success" title={title} message={message} />, { duration: 4000 }),

  error: (message: string, title: string = 'Erro') =>
    toast.custom((t) => <ZedToast t={t} type="error" title={title} message={message} />, { duration: 5000 }),

  warning: (message: string, title: string = 'Atenção') =>
    toast.custom((t) => <ZedToast t={t} type="warning" title={title} message={message} />, { duration: 5000 }),

  info: (message: string, title: string = 'Info') =>
    toast.custom((t) => <ZedToast t={t} type="info" title={title} message={message} />, { duration: 4000 }),
}

export const Toaster = () => {
  return (
    <ReactHotToaster
      position="top-right"
      containerStyle={{ zIndex: 90 }}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#333',
          color: '#fff',
        },
      }}
    />
  )
}
