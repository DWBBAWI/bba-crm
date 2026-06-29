'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase'
import type { PersonWithBusinesses } from '@/components/people/PeopleDrawer'

interface PersonFormModalProps {
  open: boolean
  onClose: () => void
  onCreate: (person: PersonWithBusinesses) => void
}

export function PersonFormModal({ open, onClose, onCreate }: PersonFormModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!form.name.trim()) {
        setError('Name is required')
        setLoading(false)
        return
      }

      const { data, error: dbErr } = await supabase
        .from('people')
        .insert({
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
        })
        .select()
        .single()

      if (dbErr) throw dbErr

      onCreate({ ...data, phone: data.phone ?? null, email: data.email ?? null, businesses: [] })
      setForm({ name: '', phone: '', email: '' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create contact')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Contact" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          required
          autoFocus
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="+1 (555) 123-4567"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="john@example.com"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading}>Create Contact</Button>
        </div>
      </form>
    </Modal>
  )
}
