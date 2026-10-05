import React from 'react'
import { clsx } from 'clsx'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'secondary',
  size = 'sm',
  icon,
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none'

  const variantClasses = {
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm font-semibold',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white',
    outline: 'bg-transparent border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white',
  }

  const sizeClasses = {
    xs: 'text-xs px-2 py-1 gap-1',
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3 py-2 gap-2',
    lg: 'text-base px-4 py-2.5 gap-2.5',
  }

  return (
    <button
      className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
