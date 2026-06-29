'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase'

const TOKENS = ['[FirstName]', '[BusinessName]', '[RepName]', '[SystemName]']

const CAMPAIGN_TYPE_OPTIONS = [
  { value: 'cold_prospect',   label: 'Cold Prospect' },
  { value: 'warm_shift4',     label: 'Warm — Shift4' },
  { value: 'warm_stackably',  label: 'Warm — Stackably' },
  { value: 'warm_clover',     label: 'Warm — Clover' },
  { value: 'warm_dejavoo',    label: 'Warm — Dejavoo' },
  { value: 'warm_spoton',     label: 'Warm — Spot On' },
  { value: 'warm_basic',      label: 'Warm — Basic Terminal' },
  { value: 'onboarding',      label: 'Onboarding' },
  { value: 'renewal',         label: 'Renewal' },
  { value: 'reengagement',    label: 'Re-engagement' },
  { value: 'referral_ask',    label: 'Referral Ask' },
  { value: 'custom',          label: 'Custom' },
]

interface DraftStep {
  localId: string
  type: 'email' | 'sms'
  delay_days: number
  subject: string
  body: string
  expanded: boolean
}

interface CampaignCreateModalProps {
  open: boolean
  onClose: () => void
  onCreated: (campaign: any) => void
}

function makeDraftStep(expanded = true): DraftStep {
  return {
    localId: crypto.randomUUID(),
    type: 'email',
    delay_days: 0,
    subject: '',
    body: '',
    expanded,
  }
}

export function CampaignCreateModal({ open, onClose, onCreated }: CampaignCreateModalProps) {
  const supabase = createClient()
  const [page, setPage] = useState<1 | 2>(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [meta, setMeta] = useState({ name: '', type: 'cold_prospect', description: '' })
  const [steps, setSteps] = useState<DraftStep[]>([makeDraftStep()])

  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const subjectRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const lastFocusRef = useRef<{ stepId: string; field: 'subject' | 'body' } | null>(null)

  const handleClose = () => {
    setPage(1)
    setMeta({ name: '', type: 'cold_prospect', description: '' })
    setSteps([makeDraftStep()])
    setError('')
    onClose()
  }

  const updateStep = (localId: string, updates: Partial<DraftStep>) =>
    setSteps(prev => prev.map(s => s.localId === localId ? { ...s, ...updates } : s))

  const addStep = () =>
    setSteps(prev => [
      ...prev.map(s => ({ ...s, expanded: false })),
      makeDraftStep(true),
    ])

  const removeStep = (localId: string) =>
    setSteps(prev => prev.filter(s => s.localId !== localId))

  const insertToken = (token: string) => {
    const focus = lastFocusRef.current
    if (!focus) return

    if (focus.field === 'subject') {
      const el = subjectRefs.current[focus.stepId]
      if (!el) return
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      const next = el.value.slice(0, start) + token + el.value.slice(end)
      updateStep(focus.stepId, { subject: next })
      requestAnimationFrame(() => {
        el.setSelectionRange(start + token.length, start + token.length)
        el.focus()
      })
    } else {
      const el = bodyRefs.current[focus.stepId]
      if (!el) return
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      const next = el.value.slice(0, start) + token + el.value.slice(end)
      updateStep(focus.stepId, { body: next })
      requestAnimationFrame(() => {
        el.setSelectionRange(start + token.length, start + token.length)
        el.focus()
      })
    }
  }

  const handleCreate = async () => {
    if (!meta.name.trim()) { setError('Campaign name is required'); return }
    if (steps.length === 0) { setError('Add at least one step'); return }
    if (steps.some(s => !s.body.trim())) { setError('All steps need a body or message'); return }

    setSaving(true)
    setError('')
    try {
      const { data: campaign, error: campErr } = await supabase
        .from('campaigns')
        .insert({ name: meta.name.trim(), type: meta.type, description: meta.description.trim() || null })
        .select()
        .single()
      if (campErr) throw campErr

      const stepPayloads = steps.map((s, i) => ({
        campaign_id: campaign.id,
        step_number: i + 1,
        type: s.type,
        delay_days: s.delay_days,
        subject: s.type === 'email' ? (s.subject || null) : null,
        body: s.body,
      }))
      const { data: createdSteps, error: stepsErr } = await supabase
        .from('campaign_steps')
        .insert(stepPayloads)
        .select()
      if (stepsErr) throw stepsErr

      onCreated({ ...campaign, steps: createdSteps ?? [] })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create New Campaign" size="xl">
      {/* ── Page 1: Campaign metadata ── */}
      {page === 1 && (
        <div className="space-y-4">
          <Input
            label="Campaign Name"
            value={meta.name}
            onChange={e => setMeta(m => ({ ...m, name: e.target.value }))}
            placeholder="e.g. Cold Prospect Outreach"
            autoFocus
          />
          <Select
            label="Campaign Type"
            value={meta.type}
            onChange={e => setMeta(m => ({ ...m, type: e.target.value }))}
            options={CAMPAIGN_TYPE_OPTIONS}
          />
          <Textarea
            label="Description (optional)"
            value={meta.description}
            onChange={e => setMeta(m => ({ ...m, description: e.target.value }))}
            placeholder="What is this campaign for? Who receives it?"
            className="min-h-[80px]"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!meta.name.trim()}
              onClick={() => { setError(''); setPage(2) }}
            >
              Next: Add Steps →
            </Button>
          </div>
        </div>
      )}

      {/* ── Page 2: Step builder ── */}
      {page === 2 && (
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Building: <span className="text-white font-medium">{meta.name}</span>
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Insert token:</span>
              {TOKENS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => insertToken(t)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Step list */}
          <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
            {steps.map((step, i) => (
              <div key={step.localId} className="rounded-xl border border-white/[0.08] overflow-hidden">
                {/* Step header / collapse toggle */}
                <div
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors select-none"
                  onClick={() => updateStep(step.localId, { expanded: !step.expanded })}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                    step.type === 'sms' ? 'badge-green' : 'badge-blue'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium text-white flex-1 truncate">
                    {step.type === 'email' ? 'Email' : 'SMS'} — Day {step.delay_days}
                    {step.type === 'email' && step.subject && (
                      <span className="font-normal ml-2" style={{ color: 'var(--text-secondary)' }}>
                        · {step.subject}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removeStep(step.localId) }}
                    className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove step"
                  >
                    <Trash2 size={12} />
                  </button>
                  {step.expanded
                    ? <ChevronUp size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                    : <ChevronDown size={13} className="text-[var(--text-muted)] flex-shrink-0" />}
                </div>

                {step.expanded && (
                  <div className="px-3 pb-3 pt-2 space-y-3 border-t border-white/[0.06] bg-white/[0.01]">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Type toggle */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Type</label>
                        <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
                          {(['email', 'sms'] as const).map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => updateStep(step.localId, { type: t })}
                              className={`flex-1 py-2 text-sm font-medium transition-all ${
                                step.type === t
                                  ? 'bg-purple-600/30 text-purple-300'
                                  : 'text-[var(--text-secondary)] hover:bg-white/[0.04]'
                              }`}
                            >
                              {t === 'email' ? 'Email' : 'SMS'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input
                        label="Send on Day"
                        type="number"
                        min={0}
                        value={step.delay_days}
                        onChange={e => updateStep(step.localId, { delay_days: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    {step.type === 'email' && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Subject</label>
                        <input
                          ref={el => { subjectRefs.current[step.localId] = el }}
                          value={step.subject}
                          onChange={e => updateStep(step.localId, { subject: e.target.value })}
                          onFocus={() => { lastFocusRef.current = { stepId: step.localId, field: 'subject' } }}
                          placeholder="Subject line…"
                          className="h-9 w-full rounded-xl px-3 text-sm bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {step.type === 'email' ? 'Body' : 'Message'}
                      </label>
                      <textarea
                        ref={el => { bodyRefs.current[step.localId] = el }}
                        value={step.body}
                        onChange={e => updateStep(step.localId, { body: e.target.value })}
                        onFocus={() => { lastFocusRef.current = { stepId: step.localId, field: 'body' } }}
                        rows={6}
                        placeholder={
                          step.type === 'email'
                            ? 'Hi [FirstName],\n\n…'
                            : 'Hi [FirstName], this is [RepName]…'
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm resize-y bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all font-mono leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add step */}
          <button
            type="button"
            onClick={addStep}
            className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-sm text-[var(--text-secondary)] hover:border-purple-500/40 hover:text-white hover:bg-white/[0.03] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            Add Another Step
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <Button variant="ghost" size="sm" onClick={() => { setError(''); setPage(1) }}>
              ← Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              loading={saving}
              disabled={steps.length === 0}
            >
              Create Campaign
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
