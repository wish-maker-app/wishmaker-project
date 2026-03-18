/**
 * Toggle switch animé
 */
export default function Toggle({ checked, onChange, label = '' }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-all ${checked ? '' : 'bg-gray-200'}`}
        style={checked ? { background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)' } : {}}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
            checked ? 'left-6' : 'left-0.5'
          }`}
        />
      </div>
      {label && <span className="text-sm text-[#1A1A2E]">{label}</span>}
    </label>
  )
}
