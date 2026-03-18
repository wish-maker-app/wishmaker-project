import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * Bouton réutilisable
 * variant: 'primary' | 'social' | 'ghost'
 */
export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  icon = null,
  className = '',
  ...props
}) {
  const base = 'w-full h-14 flex items-center justify-center gap-3 font-semibold text-base rounded-full transition-opacity'

  const variants = {
    primary: 'text-white',
    social: 'bg-white border border-[#E0E0E0] text-[#1A1A2E]',
    ghost: 'bg-transparent text-[#5B6BF5]',
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.97 }}
      className={cn(base, variants[variant], disabled || loading ? 'opacity-50' : '', className)}
      style={
        variant === 'primary'
          ? { background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)' }
          : {}
      }
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Chargement...
        </span>
      ) : children}
    </motion.button>
  )
}
