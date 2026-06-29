'use client'

import { useState } from 'react'
import { CheckCircle, Mail } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'

interface InviteTeamModalProps {
  open: boolean
  onClose: () => void
  onInvite: (newUser: any) => void
}

const ROLE_OPTIONS = [
  { value: 'salesperson', label: 'Salesperson' },
  { value: 'vp_operations', label: 'VP Operations' },
  { value: 'owner', label: 'Owner' },
]

export function InviteTeamModal({ open, onClose, onInvite }: InviteTeamModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('salesperson')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState('')

  const reset = () => {
    setName('')
    setEmail('')
    setRole('salesperson')
    setError('')
    setSuccess(false)
    setInvitedEmail('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Invite failed')
      setInvitedEmail(email)
      setSuccess(true)
      onInvite(json.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Invite Team Member" size="sm">
      {success ? (
        <div className="py-4 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={22} className="text-green-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Invitation Sent</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            An invite email has been sent to <strong className="text-white">{invitedEmail}</strong>.
            They'll receive a link to set their password and access the CRM.
          </p>
          <Button variant="secondary" className="mt-6 w-full" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Jane Smith"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="jane@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Select
            label="Role"
            value={role}
            onChange={e => setRole(e.target.value)}
            options={ROLE_OPTIONS}
          />

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={<Mail size={14} />}
              disabled={!name.trim() || !email.trim()}
            >
              Send Invite
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
