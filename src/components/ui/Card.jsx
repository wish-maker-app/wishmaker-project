import { cn } from '../../lib/utils'

export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)]',
        onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : '',
        className
      )}
    >
      {children}
    </div>
  )
}
