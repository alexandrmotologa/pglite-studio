import React from 'react'
import { clsx } from 'clsx'

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'cyan' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple'
  size?: 'xs' | 'sm'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'xs',
  className,
}) => {
  const variantStyles = {
    cyan: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60',
    indigo: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
    emerald: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
    slate: 'bg-slate-800/90 text-slate-300 border-slate-700/60',
  }

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 leading-none',
    sm: 'text-xs px-2 py-0.5 leading-tight',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center font-mono font-medium rounded border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}
