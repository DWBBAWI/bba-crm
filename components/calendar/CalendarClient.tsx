'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths,
  formatDistanceToNow,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Clock, ExternalLink, CalendarDays, RefreshCw, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatDateTime } from '@/lib/utils'

interface CalendarClientProps {
  appointments: any[]
  reps: any[]
  currentUser: { id: string; name: string }
  isAdmin: boolean
  gcalConnected: boolean
}

// Timezone-safe day matching.
// For all-day events we stored the date component with T00:00:00Z which becomes
// the previous evening in negative-UTC timezones if parsed as a timestamp.
// Instead, compare the raw date strings directly.
function matchesDay(appt: any, day: Date): boolean {
  if (appt.is_all_day) {
    const apptDate = (appt.start_time as string).slice(0, 10) // "YYYY-MM-DD"
    return apptDate === format(day, 'yyyy-MM-dd')
  }
  return isSameDay(new Date(appt.start_time), day)
}

export function CalendarClient({
  appointments: initialAppts,
  reps,
  currentUser,
  isAdmin,
  gcalConnected,
}: CalendarClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [appointments, setAppointments] = useState(initialAppts)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [syncAge, setSyncAge] = useState('')
  const syncInFlight = useRef(false)

  const [form, setForm] = useState({
    title: '',
    start_time: '',
    end_time: '',
    notes: '',
    rep_id: currentUser.id,
  })

  const monthStart  = startOfMonth(currentMonth)
  const monthEnd    = endOfMonth(currentMonth)
  const calStart    = startOfWeek(monthStart)
  const calEnd      = endOfWeek(monthEnd)
  const calDays     = eachDayOfInterval({ start: calStart, end: calEnd })

  const getApptsForDay = (day: Date) => appointments.filter(a => matchesDay(a, day))
  const selectedDayAppts = selectedDay ? getApptsForDay(selectedDay) : []

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // datetime-local value ("2024-06-25T14:30") has no timezone marker.
      // If sent as-is, PostgreSQL stores it as UTC, shifting the time by the
      // user's UTC offset. new Date() in the browser treats the string as local
      // time, and toISOString() converts it to the correct UTC equivalent.
      const startISO = form.start_time ? new Date(form.start_time).toISOString() : ''
      const endISO   = form.end_time   ? new Date(form.end_time).toISOString()   : ''
      console.log('[add appt] local start:', form.start_time, '→ UTC ISO:', startISO)

      const res  = await fetch('/api/appointments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, start_time: startISO, end_time: endISO }),
      })
      const json = await res.json()
      if (json.appointment) setAppointments(prev => [...prev, json.appointment])
      setShowAddModal(false)
      setForm({ title: '', start_time: '', end_time: '', notes: '', rep_id: currentUser.id })
    } catch (err) {
      console.error('[add appt]', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    // First click arms the confirm button; second click fires the delete
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }

    setDeleting(true)
    try {
      const res = await fetch('/api/appointments', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      })
      if (res.ok) {
        setAppointments(prev => prev.filter(a => a.id !== id))
        setConfirmDeleteId(null)
      }
    } catch (err) {
      console.error('[delete appt]', err)
    } finally {
      setDeleting(false)
    }
  }

  const runSync = useCallback(async () => {
    if (!gcalConnected || syncInFlight.current) return
    syncInFlight.current = true
    setSyncing(true)
    try {
      const res = await fetch('/api/calendar/sync')
      if (res.ok) {
        const json = await res.json()
        setAppointments(json.appointments)
        setLastSyncedAt(new Date())
      }
    } catch (err) {
      console.error('[auto-sync]', err)
    } finally {
      setSyncing(false)
      syncInFlight.current = false
    }
  }, [gcalConnected])

  // Auto-sync on mount, then every 60 seconds
  useEffect(() => {
    if (!gcalConnected) return
    runSync()
    const id = setInterval(runSync, 60_000)
    return () => clearInterval(id)
  }, [gcalConnected, runSync])

  // Tick the "X ago" string every 15 seconds so it stays accurate
  useEffect(() => {
    if (!lastSyncedAt) return
    const tick = () => setSyncAge(formatDistanceToNow(lastSyncedAt, { addSuffix: true }))
    tick()
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [lastSyncedAt])

  const STATUS_COLOR: Record<string, string> = {
    scheduled: 'blue',
    completed:  'green',
    cancelled:  'red',
    no_show:    'amber',
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Appointments and scheduling"
        actions={
          <div className="flex items-center gap-3">
            {gcalConnected && (
              <div className="flex items-center gap-2">
                {syncAge && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Synced {syncAge}
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />}
                  onClick={runSync}
                  loading={syncing}
                >
                  Sync Now
                </Button>
              </div>
            )}
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowAddModal(true)}>
              Add Appointment
            </Button>
          </div>
        }
      />

      {/* Booking page quick-links */}
      <GlassCard animate delay={0.05} className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Booking Pages</h3>
          {gcalConnected && (
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <CalendarDays size={12} />
              Google Calendar synced
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {reps.map(rep => (
            <a
              key={rep.id}
              href={`/book/${rep.name.toLowerCase().replace(/\s+/g, '-')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl glass glass-hover text-sm text-[var(--text-secondary)] hover:text-white transition-all"
            >
              <Avatar name={rep.name} size="xs" />
              {rep.name}
              <ExternalLink size={12} className="opacity-50" />
            </a>
          ))}
        </div>
      </GlassCard>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <GlassCard animate delay={0.1} className="p-0 overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <button
                onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-base font-semibold text-white">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-white/[0.06]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div
                  key={d}
                  className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {calDays.map((day, i) => {
                const dayAppts     = getApptsForDay(day)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isSelected   = selectedDay ? isSameDay(day, selectedDay) : false
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[80px] p-1.5 border-b border-r border-white/[0.04] cursor-pointer transition-all ${
                      isSelected ? 'bg-purple-500/10' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday(day)
                        ? 'bg-purple-600 text-white'
                        : isCurrentMonth
                          ? 'text-white'
                          : 'text-[var(--text-muted)]'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 2).map(a => (
                        <div
                          key={a.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md truncate leading-tight ${
                            a.gcal_synced ? 'badge-blue' : 'badge-purple'
                          }`}
                        >
                          {a.is_all_day
                            ? a.title
                            : `${format(new Date(a.start_time), 'h:mma')} ${a.title}`
                          }
                        </div>
                      ))}
                      {dayAppts.length > 2 && (
                        <div className="text-[10px] text-[var(--text-muted)] px-1">
                          +{dayAppts.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {selectedDay && (
            <GlassCard animate delay={0.15}>
              <h3 className="text-sm font-semibold text-white mb-3">
                {format(selectedDay, 'EEEE, MMMM d')}
              </h3>
              {selectedDayAppts.length === 0 ? (
                <div className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  No appointments.{' '}
                  <button
                    className="text-purple-400 hover:underline"
                    onClick={() => setShowAddModal(true)}
                  >
                    Add one →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayAppts.map(a => (
                    <div key={a.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-sm font-medium text-white leading-tight">{a.title}</div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {a.gcal_synced && (
                            <span className="text-[10px] text-blue-400">GCal</span>
                          )}
                          <button
                            onClick={() => handleDeleteAppointment(a.id)}
                            disabled={deleting && confirmDeleteId === a.id}
                            title={confirmDeleteId === a.id ? 'Click again to confirm delete' : 'Delete appointment'}
                            className={`p-1 rounded transition-colors ${
                              confirmDeleteId === a.id
                                ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                                : 'text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            onBlur={() => setConfirmDeleteId(null)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {a.is_all_day ? (
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>All day</div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Clock size={11} />
                          {format(new Date(a.start_time), 'h:mm a')} – {format(new Date(a.end_time), 'h:mm a')}
                        </div>
                      )}

                      {a.lead && (
                        <div className="text-xs mt-1 text-purple-400">{a.lead.business_name}</div>
                      )}
                      {a.notes && !a.gcal_synced && (
                        <div className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                          {a.notes}
                        </div>
                      )}
                      <div className="mt-2">
                        <Badge variant={STATUS_COLOR[a.status] as any}>{a.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )}

          <GlassCard animate delay={0.2}>
            <h3 className="text-sm font-semibold text-white mb-3">Upcoming</h3>
            <div className="space-y-2">
              {appointments
                .filter(a => new Date(a.start_time) >= new Date() && a.status === 'scheduled')
                .slice(0, 8)
                .map(a => (
                  <div
                    key={a.id}
                    className="flex items-start gap-2 text-xs p-2 rounded-lg hover:bg-white/[0.03] transition-all"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      a.gcal_synced ? 'bg-blue-400' : 'bg-purple-400'
                    }`} />
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate">{a.title}</div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {a.is_all_day
                          ? `${(a.start_time as string).slice(0, 10)} · All day`
                          : formatDateTime(a.start_time)
                        }
                      </div>
                      {a.rep && (
                        <div style={{ color: 'var(--text-muted)' }}>{a.rep.name}</div>
                      )}
                    </div>
                  </div>
                ))
              }
              {appointments.filter(a => new Date(a.start_time) >= new Date()).length === 0 && (
                <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  No upcoming appointments
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Add appointment modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Appointment" size="md">
        <form onSubmit={handleAddAppointment} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            placeholder="Meeting with..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="datetime-local"
              value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              required
            />
            <Input
              label="End Time"
              type="datetime-local"
              value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              required
            />
          </div>
          {isAdmin && (
            <Select
              label="Rep"
              value={form.rep_id}
              onChange={e => setForm(f => ({ ...f, rep_id: e.target.value }))}
              options={reps.map(r => ({ value: r.id, label: r.name }))}
            />
          )}
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Meeting notes..."
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>Add Appointment</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
