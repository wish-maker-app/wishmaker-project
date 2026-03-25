export default function AccountTypeBadge({ type, size = 'sm' }) {
  const isPro = type === 'pro'

  const sizeClasses = size === 'lg'
    ? 'text-xs px-3 py-1'
    : 'text-[10px] px-2 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full ${sizeClasses}`}
      style={isPro
        ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
        : { background: '#F0F0F5', color: '#8A8A9A' }
      }
    >
      {isPro ? 'Pro' : 'Particulier'}
    </span>
  )
}
