import { useRef } from 'react'

/**
 * 4 champs OTP circulaires — auto-focus + backspace
 */
export default function OtpInput({ value = ['', '', '', ''], onChange, error = false }) {
  const inputs = useRef([])

  function handleChange(index, e) {
    const val = e.target.value.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[index] = val
    onChange(next)

    // Auto-focus suivant
    if (val && index < 3) {
      inputs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        const next = [...value]
        next[index - 1] = ''
        onChange(next)
        inputs.current[index - 1]?.focus()
      }
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      onChange(pasted.split(''))
      inputs.current[3]?.focus()
    }
    e.preventDefault()
  }

  return (
    <div className="flex gap-4 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
          className={[
            'w-16 h-16 rounded-full text-center text-2xl font-bold bg-white outline-none transition-all',
            'border-2',
            error
              ? 'border-red-400'
              : value[i]
              ? 'border-[#5B6BF5]'
              : 'border-[#E0E0E0] focus:border-[#5B6BF5]',
            'text-[#1A1A2E]',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
