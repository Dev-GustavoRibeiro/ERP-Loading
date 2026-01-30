'use client'

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/shared/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 transform-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(222,47%,6%)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: [
          "bg-gradient-to-r from-blue-500 to-blue-600",
          "text-white",
          "shadow-lg shadow-blue-500/25",
          "hover:from-blue-600 hover:to-blue-700",
          "hover:shadow-blue-500/40",
          "active:scale-[0.98]",
        ],
        secondary: [
          "bg-gradient-to-r from-slate-500/20 to-slate-600/20",
          "text-slate-200",
          "border border-slate-500/30",
          "hover:bg-slate-500/30",
          "hover:border-slate-400/40",
        ],
        gold: [
          "bg-gradient-to-r from-amber-500 to-yellow-500",
          "text-slate-900",
          "shadow-lg shadow-amber-500/25",
          "hover:from-amber-400 hover:to-yellow-400",
          "hover:shadow-amber-500/40",
          "active:scale-[0.98]",
        ],
        outline: [
          "border-2 border-blue-500/30",
          "bg-blue-500/5",
          "text-blue-300",
          "hover:bg-blue-500/15",
          "hover:border-blue-400/50",
        ],
        ghost: [
          "text-slate-300",
          "hover:bg-white/5",
          "hover:text-white",
        ],
        destructive: [
          "bg-gradient-to-r from-red-500 to-red-600",
          "text-white",
          "shadow-lg shadow-red-500/25",
          "hover:from-red-600 hover:to-red-700",
          "hover:shadow-red-500/40",
        ],
        success: [
          "bg-gradient-to-r from-emerald-500 to-green-500",
          "text-white",
          "shadow-lg shadow-emerald-500/25",
          "hover:from-emerald-600 hover:to-green-600",
        ],
        link: [
          "text-blue-400",
          "underline-offset-4 hover:underline",
          "hover:text-blue-300",
        ],
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-lg",
        sm: "h-8 px-3 text-sm",
        default: "h-10 px-5 text-sm",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg rounded-2xl",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-12 w-12 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref" | "children">,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    isLoading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          leftIcon
        ) : null}
        {children}
        {!isLoading && rightIcon}
      </motion.button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }


