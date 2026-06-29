'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  animate?: boolean
  delay?: number
}

export function GlassCard({ children, className, hover = false, onClick, animate = true, delay = 0 }: GlassCardProps) {
  const Component = animate ? motion.div : 'div'
  const animProps = animate ? {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
  } : {}

  return (
    <Component
      {...animProps}
      onClick={onClick}
      className={cn(
        'glass rounded-2xl p-6',
        hover && 'glass-hover cursor-pointer transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </Component>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  color = 'purple',
  delay = 0,
}: {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'purple' | 'blue' | 'green' | 'amber' | 'red'
  delay?: number
}) {
  const colors = {
    purple: { bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.2)', text: '#c084fc' },
    blue: { bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.2)', text: '#93c5fd' },
    green: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)', text: '#6ee7b7' },
    amber: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)', text: '#fcd34d' },
    red: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.2)', text: '#fca5a5' },
  }
  const c = colors[color]

  return (
    <GlassCard delay={delay} className="relative overflow-hidden">
      <div
        className="absolute inset-0 rounded-2xl opacity-30"
        style={{ background: `radial-gradient(circle at top right, ${c.bg}, transparent 60%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          {icon && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}
            >
              <span style={{ color: c.text }}>{icon}</span>
            </div>
          )}
        </div>
        <div className="text-3xl font-700 tracking-tight mb-1" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
          {value}
        </div>
        {sub && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-500 ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <span>{trend.value >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}% {trend.label}</span>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
