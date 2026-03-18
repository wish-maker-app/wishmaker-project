import { useState } from 'react'
import { cn } from '../../lib/utils'

/**
 * Input standard avec support icône + toggle password
 */
export default function Input({
  label = '',
  type = 'text',
  placeholder = '',
  value,
  onChange,
  onBlur,
  error = '',
  icon = null,
  iconRight = null,
  disabled = false,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-[#1A1A2E]">{label}</label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-4 text-[#8A8A9A]">{icon}</span>
        )}
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={cn(
            'w-full h-[52px] bg-[#F5F5F7] rounded-[14px] px-4 text-[#1A1A2E] text-sm outline-none',
            'focus:ring-1.5 focus:ring-[#5B6BF5] focus:border-[#5B6BF5] border border-transparent',
            'transition-all placeholder-[#8A8A9A]',
            icon ? 'pl-11' : '',
            (iconRight || isPassword) ? 'pr-11' : '',
            error ? 'border-red-400' : '',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
            className
          )}
          {...props}
        />
        {/* Toggle password */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 text-[#8A8A9A]"
          >
            {showPassword ? (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
        {iconRight && !isPassword && (
          <span className="absolute right-4 text-[#8A8A9A]">{iconRight}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}
