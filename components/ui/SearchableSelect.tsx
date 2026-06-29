'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchableSelectProps {
  label?: string
  options: { value: string; label: string }[]
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  className?: string
  disabled?: boolean
  clearable?: boolean
}

export function SearchableSelect({
  label,
  options,
  placeholder = 'Select...',
  value,
  onChange,
  className,
  disabled,
  clearable = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  const selectedLabel = options.find(opt => opt.value === value)?.label

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setSearch('')
      setHighlightedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue)
    setIsOpen(false)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => (prev + 1) % filtered.length || 0)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => (prev - 1 + filtered.length) % filtered.length || filtered.length - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)} ref={containerRef}>
      {label && (
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full h-9 px-3 rounded-xl text-sm flex items-center justify-between"
          style={{
            background: '#1a1f2e',
            color: '#e2e8f8',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <span className={value ? 'text-white' : 'text-gray-600'}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            size={14}
            style={{ color: 'var(--text-muted)', transition: 'transform 0.2s' }}
            className={isOpen ? 'rotate-180' : ''}
          />
        </button>

        {isOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-xl border z-50 shadow-lg"
            style={{
              background: '#1a1f2e',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <div className="p-2 border-b border-white/[0.06]">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type to search..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setHighlightedIndex(0)
                }}
                onKeyDown={handleKeyDown}
                className="w-full h-8 px-2 rounded-lg text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e2e8f8',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-600">
                  No results found
                </div>
              ) : (
                filtered.map((opt, idx) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className="w-full text-left px-3 py-2 text-sm transition-colors"
                    style={{
                      background: idx === highlightedIndex ? 'rgba(124,58,237,0.2)' : 'transparent',
                      color: '#e2e8f8',
                    }}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
