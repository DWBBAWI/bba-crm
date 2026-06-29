import { cn } from '@/lib/utils'

const COLORS: Record<string, { bg: string; text: string }> = {
  SB: { bg: 'rgba(124,58,237,0.2)', text: '#c084fc' },
  DW: { bg: 'rgba(37,99,235,0.2)', text: '#93c5fd' },
  H: { bg: 'rgba(16,185,129,0.2)', text: '#6ee7b7' },
}

interface AvatarProps {
  name: string
  initials?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  src?: string
}

export function Avatar({ name, initials, size = 'sm', className, src }: AvatarProps) {
  const abbr = initials || name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const color = COLORS[abbr] || { bg: 'rgba(107,114,128,0.2)', text: '#9ca3af' }

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold flex-shrink-0', sizes[size], className)}
      style={{ background: color.bg, color: color.text, border: `1px solid ${color.text}30` }}
      title={name}
    >
      {abbr}
    </div>
  )
}
