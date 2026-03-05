'use client'

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/atoms/Button"
import { Portal } from "@/shared/components/atoms/Portal"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: "sm" | "default" | "lg" | "xl" | "2xl" | "fullscreen"
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  className?: string
}

const sizeClasses = {
  sm: "max-w-sm",
  default: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  fullscreen: "max-w-none w-full h-full rounded-none",
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "default",
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
}) => {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "relative w-full",
              "bg-gradient-to-br from-[#0A101F]/98 to-[#111827]/98",
              "backdrop-blur-xl",
              "border border-white/15",
              "rounded-2xl",
              "shadow-2xl shadow-black/40",
              "overflow-hidden",
              sizeClasses[size],
              className
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="relative flex items-start justify-between p-4 sm:p-6 border-b border-white/10">
                {/* Decorative dots */}
                <div className="absolute top-3 right-14 flex space-x-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400/40 animate-pulse" />
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-400/40 animate-pulse" style={{ animationDelay: '0.6s' }} />
                </div>

                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 className="text-lg sm:text-xl font-bold text-gradient-zed pr-8">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-slate-400">
                      {description}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onClose}
                    className="shrink-0 hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto scrollbar-none">
              {children}
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/40 via-amber-500/40 to-slate-500/40" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  )
}

// Modal Footer helper component
interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalFooter: React.FC<ModalFooterProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 pt-4 mt-4 border-t border-white/10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Modal, ModalFooter }


