'use client'

import { useState, useRef, useEffect } from 'react'
import { Trash2, ImageIcon, Upload, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase'

const TOKENS = ['[FirstName]', '[BusinessName]', '[RepName]', '[SystemName]']

interface Step {
  id: string
  campaign_id: string
  step_number: number
  type: 'email' | 'sms'
  delay_days: number
  subject?: string | null
  body: string
  header_image_url?: string | null
}

interface CampaignStepModalProps {
  open: boolean
  onClose: () => void
  campaignId: string
  step?: Step | null
  nextStepNumber?: number
  onSave: (step: Step) => void
  onDelete?: (stepId: string) => void
}

export function CampaignStepModal({
  open,
  onClose,
  campaignId,
  step,
  nextStepNumber = 1,
  onSave,
  onDelete,
}: CampaignStepModalProps) {
  const supabase = createClient()
  const isEdit = !!step

  const [form, setForm] = useState({
    type: (step?.type ?? 'email') as 'email' | 'sms',
    delay_days: step?.delay_days ?? 0,
    subject: step?.subject ?? '',
    body: step?.body ?? '',
    header_image_url: step?.header_image_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [uploadingHeader, setUploadingHeader] = useState(false)
  const [uploadingBodyImg, setUploadingBodyImg] = useState(false)

  // Refs for DOM access
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)
  const headerImgInputRef = useRef<HTMLInputElement>(null)
  const bodyImgInputRef = useRef<HTMLInputElement>(null)
  // Tracks which field (subject/body) was focused last, for token insertion
  const lastFocusRef = useRef<'subject' | 'body'>('body')
  // Saves body cursor position when textarea loses focus (before clicking Insert Image)
  const bodySelectionRef = useRef({ start: 0, end: 0 })

  useEffect(() => {
    if (open) {
      setForm({
        type: step?.type ?? 'email',
        delay_days: step?.delay_days ?? 0,
        subject: step?.subject ?? '',
        body: step?.body ?? '',
        header_image_url: step?.header_image_url ?? '',
      })
      setConfirmDelete(false)
      setError('')
    }
  }, [open, step])

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  // ── Token insertion ────────────────────────────────────────────────────────

  const insertToken = (token: string) => {
    if (lastFocusRef.current === 'subject') {
      const el = subjectRef.current
      if (!el) return
      const s = el.selectionStart ?? el.value.length
      const e = el.selectionEnd ?? el.value.length
      const next = el.value.slice(0, s) + token + el.value.slice(e)
      setForm(f => ({ ...f, subject: next }))
      requestAnimationFrame(() => {
        el.setSelectionRange(s + token.length, s + token.length)
        el.focus()
      })
    } else {
      const el = bodyRef.current
      if (!el) return
      const s = el.selectionStart ?? el.value.length
      const e = el.selectionEnd ?? el.value.length
      const next = el.value.slice(0, s) + token + el.value.slice(e)
      setForm(f => ({ ...f, body: next }))
      requestAnimationFrame(() => {
        el.setSelectionRange(s + token.length, s + token.length)
        el.focus()
      })
    }
  }

  // ── Image uploads ──────────────────────────────────────────────────────────

  const uploadImage = async (file: File, folder: 'headers' | 'body') => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('email-images')
      .upload(path, file, { upsert: false })
    if (upErr) throw upErr
    const { data: { publicUrl } } = supabase.storage.from('email-images').getPublicUrl(path)
    return publicUrl
  }

  const handleHeaderImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingHeader(true)
    setError('')
    try {
      const url = await uploadImage(file, 'headers')
      setForm(f => ({ ...f, header_image_url: url }))
    } catch {
      setError('Header image upload failed — check bucket exists and RLS policies.')
    } finally {
      setUploadingHeader(false)
    }
  }

  const handleBodyImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingBodyImg(true)
    setError('')
    try {
      const url = await uploadImage(file, 'body')
      const tag = `<img src="${url}" alt="" style="max-width:100%;height:auto;display:block;margin:12px 0;">`
      const { start, end } = bodySelectionRef.current
      setForm(f => {
        const next = f.body.slice(0, start) + '\n' + tag + '\n' + f.body.slice(end)
        return { ...f, body: next }
      })
      requestAnimationFrame(() => {
        const newPos = start + tag.length + 2
        bodyRef.current?.setSelectionRange(newPos, newPos)
        bodyRef.current?.focus()
      })
    } catch {
      setError('Body image upload failed — check bucket exists and RLS policies.')
    } finally {
      setUploadingBodyImg(false)
    }
  }

  // ── Save / Delete ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.body.trim()) { setError('Body / message is required'); return }
    setSaving(true)
    setError('')
    try {
      // Base payload — only columns that have always existed in campaign_steps
      const payload: Record<string, unknown> = {
        type: form.type,
        delay_days: Number(form.delay_days),
        subject: form.type === 'email' ? (form.subject || null) : null,
        body: form.body,
      }

      // header_image_url requires migration 004 to have been run.
      // Include it only when: (a) the existing step row already returned this field
      // (proving the column exists), or (b) the user just uploaded an image
      // (in which case omitting it would silently discard the upload).
      const columnExists = isEdit && step != null && 'header_image_url' in step
      if (form.type === 'email' && (columnExists || !!form.header_image_url)) {
        payload.header_image_url = form.header_image_url || null
      }

      if (isEdit) {
        // No .select() after UPDATE — avoids 406 from stale PostgREST schema cache
        // when header_image_url was recently added via ALTER TABLE.
        // Reconstruct the saved step from the existing row + applied payload.
        const { error: err } = await supabase
          .from('campaign_steps')
          .update(payload)
          .eq('id', step!.id)
        if (err) throw err
        onSave({ ...step!, ...payload } as Step)
      } else {
        // For INSERT we only need the server-generated id; all other fields are known.
        const { data, error: err } = await supabase
          .from('campaign_steps')
          .insert({ campaign_id: campaignId, step_number: nextStepNumber, ...payload })
          .select('id')
          .single()
        if (err) throw err
        onSave({
          id: data.id,
          campaign_id: campaignId,
          step_number: nextStepNumber,
          ...payload,
        } as Step)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      const { error: err } = await supabase.from('campaign_steps').delete().eq('id', step!.id)
      if (err) throw err
      onDelete?.(step!.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Step ${step?.step_number}` : 'Add New Step'}
      size="xl"
    >
      <div className="space-y-4">

        {/* Type toggle + delay */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Type</label>
            <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
              {(['email', 'sms'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 text-sm font-medium transition-all ${
                    form.type === t
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
            value={form.delay_days}
            onChange={e => set('delay_days', parseInt(e.target.value) || 0)}
            hint="Days after enrollment (0 = immediately)"
          />
        </div>

        {/* ── Email-only fields ── */}
        {form.type === 'email' && (
          <>
            {/* Subject */}
            <Input
              ref={subjectRef}
              label="Subject Line"
              value={form.subject}
              onChange={e => set('subject', e.target.value)}
              onFocus={() => { lastFocusRef.current = 'subject' }}
              placeholder="e.g. Quick question about your payment processing…"
            />

            {/* Header / banner image */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Email Header Image
                <span className="ml-1.5 font-normal" style={{ color: 'var(--text-muted)' }}>
                  — appears at the very top of the email (optional)
                </span>
              </label>

              <input
                ref={headerImgInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                className="hidden"
                onChange={handleHeaderImageChange}
              />

              {form.header_image_url ? (
                <div className="relative rounded-xl overflow-hidden border border-white/[0.08] group">
                  <img
                    src={form.header_image_url}
                    alt="Email header"
                    className="w-full max-h-36 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => headerImgInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, header_image_url: '' }))}
                      className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => headerImgInputRef.current?.click()}
                  disabled={uploadingHeader}
                  className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-white/20 hover:border-purple-500/40 hover:bg-white/[0.02] transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50"
                >
                  {uploadingHeader ? (
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ImageIcon size={22} />
                  )}
                  <span className="text-xs">{uploadingHeader ? 'Uploading…' : 'Click to upload header image'}</span>
                  <span className="text-[10px]">JPG, PNG, GIF, WebP · recommended 600×200 px</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* Body / message */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {form.type === 'email' ? 'Email Body' : 'SMS Message'}
              {form.type === 'email' && (
                <span className="ml-1.5 font-normal" style={{ color: 'var(--text-muted)' }}>
                  — supports plain text and &lt;img&gt; tags
                </span>
              )}
            </label>
            {form.type === 'email' && (
              <>
                <input
                  ref={bodyImgInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  className="hidden"
                  onChange={handleBodyImageChange}
                />
                <button
                  type="button"
                  onClick={() => bodyImgInputRef.current?.click()}
                  disabled={uploadingBodyImg}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-50"
                >
                  {uploadingBodyImg ? (
                    <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ImageIcon size={12} />
                  )}
                  {uploadingBodyImg ? 'Uploading…' : 'Insert Image'}
                </button>
              </>
            )}
          </div>
          <textarea
            ref={bodyRef}
            value={form.body}
            onChange={e => set('body', e.target.value)}
            onFocus={() => { lastFocusRef.current = 'body' }}
            onBlur={e => {
              bodySelectionRef.current = {
                start: e.target.selectionStart ?? e.target.value.length,
                end: e.target.selectionEnd ?? e.target.value.length,
              }
            }}
            rows={12}
            placeholder={
              form.type === 'email'
                ? 'Hi [FirstName],\n\nI wanted to reach out about [BusinessName]…'
                : 'Hi [FirstName], this is [RepName] from [SystemName]…'
            }
            className="w-full rounded-xl px-3 py-2.5 text-sm resize-y bg-white/[0.04] border border-white/[0.08] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all font-mono leading-relaxed"
          />
        </div>

        {/* Token helper */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Personalization tokens — click to insert at cursor:
          </p>
          <div className="flex flex-wrap gap-2">
            {TOKENS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => insertToken(t)}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <div>
            {isEdit && (
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={13} />}
                onClick={handleDelete}
                loading={deleting}
              >
                {confirmDelete ? 'Confirm Delete' : 'Delete Step'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              {isEdit ? 'Save Changes' : 'Add Step'}
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  )
}
