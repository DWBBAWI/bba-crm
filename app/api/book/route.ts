import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createGCalEvent } from '@/lib/gcal'
import { resolveRepBySlug, slotRange, isSlotAvailable } from '@/lib/booking'

// Public endpoint — no auth required (booking pages are public).
// The anon INSERT policy on appointments (migration 006) permits this.

export async function POST(req: NextRequest) {
  const { repSlug, date, time, name, email, phone, businessName } = await req.json()

  if (!repSlug || !date || !time || !name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const rep = await resolveRepBySlug(repSlug)
  if (!rep) {
    return NextResponse.json({ error: 'Rep not found' }, { status: 404 })
  }

  // Re-check availability right before inserting. This closes the obvious
  // race window with a clean error message; the DB-level exclusion
  // constraint (migration 013) is what actually guarantees no double-booking
  // if two requests land at the same instant.
  if (!(await isSlotAvailable(rep.id, date, time))) {
    return NextResponse.json({ error: 'That time was just booked. Please pick another slot.' }, { status: 409 })
  }

  const { start: startTime, end: endTime } = slotRange(date, time)
  const title = `${businessName} — ${name}`
  const notes = `Booked via web\nName: ${name}\nEmail: ${email}\nPhone: ${phone ?? ''}\nBusiness: ${businessName}`

  const supabase = await createServerSupabaseClient()

  // 1. Insert into Supabase
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      rep_id:     rep.id,
      title,
      start_time: startTime.toISOString(),
      end_time:   endTime.toISOString(),
      notes,
      status:     'scheduled',
    })
    .select('id')
    .single()

  if (error) {
    // 23P01 = exclusion_violation — the overlap guard added in migration 013
    // caught a double-booking that slipped past the pre-check above.
    if (error.code === '23P01') {
      return NextResponse.json({ error: 'That time was just booked. Please pick another slot.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 2. Push to the rep's Google Calendar (best-effort)
  if (rep.google_calendar_token) {
    const googleEventId = await createGCalEvent(rep.google_calendar_token, {
      title,
      startTime:   startTime.toISOString(),
      endTime:     endTime.toISOString(),
      description: notes,
    })

    if (googleEventId) {
      // Back-fill the Google event ID so the next page-load sync can match it.
      // Anon has no UPDATE policy on appointments, so this needs the admin client.
      await createAdminClient()
        .from('appointments')
        .update({ google_event_id: googleEventId })
        .eq('id', data.id)
    } else {
      console.warn('[book] GCal push failed for appointment', data.id)
    }
  }

  return NextResponse.json({ success: true, appointmentId: data.id })
}
