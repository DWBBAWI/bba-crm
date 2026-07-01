import { createAdminClient } from './supabase-admin'

export const AVAILABLE_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '1:00 PM', '1:30 PM', '2:00 PM',
  '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM',
]

export const SLOT_MINUTES = 30

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

// slot format: "9:00 AM", "2:30 PM"
export function parseSlotTime(date: string, slot: string): Date {
  const [time, ampm] = slot.split(' ')
  const [h, m] = time.split(':').map(Number)
  let hour = h
  if (ampm === 'PM' && hour !== 12) hour += 12
  if (ampm === 'AM' && hour === 12) hour = 0
  return new Date(`${date}T${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
}

export function slotRange(date: string, slot: string): { start: Date; end: Date } {
  const start = parseSlotTime(date, slot)
  const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000)
  return { start, end }
}

// Resolves a rep by the same slug transform the booking page URL uses.
// Runs via the service-role client — public.users has no anon-readable
// policy (see migration 012), so a normal anon-scoped client can't read it.
export async function resolveRepBySlug(repSlug: string) {
  const { data: users } = await createAdminClient()
    .from('users')
    .select('id, name, google_calendar_token')
  return (users ?? []).find(u => slugify(u.name) === repSlug) ?? null
}

// Which of AVAILABLE_SLOTS overlap an existing (non-cancelled) appointment
// for this rep on this date. Runs via the service-role client — anon has no
// SELECT policy on appointments (it holds customer names/notes), so this
// stays server-side and only ever returns slot labels, never raw rows.
export async function getBookedSlots(repId: string, date: string): Promise<string[]> {
  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59.999`)

  const { data: appts } = await createAdminClient()
    .from('appointments')
    .select('start_time, end_time')
    .eq('rep_id', repId)
    .neq('status', 'cancelled')
    .lt('start_time', dayEnd.toISOString())
    .gt('end_time', dayStart.toISOString())

  const booked = new Set<string>()
  for (const slot of AVAILABLE_SLOTS) {
    const { start, end } = slotRange(date, slot)
    const overlaps = (appts ?? []).some(a => {
      const aStart = new Date(a.start_time)
      const aEnd = new Date(a.end_time)
      return aStart < end && aEnd > start
    })
    if (overlaps) booked.add(slot)
  }
  return Array.from(booked)
}

export async function isSlotAvailable(repId: string, date: string, slot: string): Promise<boolean> {
  const booked = await getBookedSlots(repId, date)
  return !booked.includes(slot)
}
