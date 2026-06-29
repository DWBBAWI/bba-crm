import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'h-9 w-full rounded-xl px-3 text-sm',
            'bg-white/[0.04] border border-white/[0.08]',
            'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-purple-500/10',
            'transition-all duration-200',
            error && 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/10',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
        {hint && !error && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface SelectProps {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  className?: string
  disabled?: boolean
}

export function Select({ label, error, options, placeholder, value, onChange, className, disabled }: SelectProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <select
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        style={{
          background: '#1a1f2e',
          color: '#e2e8f8',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px',
          padding: '8px 12px',
          width: '100%',
          cursor: 'pointer',
          appearance: 'auto',
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full rounded-xl px-3 py-2 text-sm min-h-[100px] resize-y',
          'bg-white/[0.04] border border-white/[0.08]',
          'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
          'focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07]',
          'transition-all duration-200',
          error && 'border-red-500/50',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
