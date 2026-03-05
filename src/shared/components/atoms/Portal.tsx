'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: ReactNode
}

/**
 * Portal component that renders children directly into document.body,
 * escaping any parent stacking context (z-index, transform, etc.).
 * This ensures modals, overlays, and toasts always appear above
 * the sidebar, header, and other fixed UI elements.
 */
export function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(children, document.body)
}
