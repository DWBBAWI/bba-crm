import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createGCalEvent, deleteGCalEvent } from '@/lib/gcal'

// ── POST — create appointment ────────────────────────────────────────────────
// Called by CalendarClient when the logged-in user adds an appointment.
// 1. Inserts into Supabase (always).
// 2. Pushes to the rep's Google Calendar (best-effort; failure does not block).
// 3. If GCal returns an event ID, back-fills it onto the row.

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, start_time, end_time, notes, rep_id } = await req.json()
  if (!title || !start_time || !end_time || !rep_id) {
    return NextResponse.json({ error: 'title, start_time, end_time and rep_id are required' }, { status: 400 })
  }

  // 1. Insert into Supabase
  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({ title, start_time, end_time, notes: notes ?? null, rep_id, status: 'scheduled' })
    .select('*, lead:leads(id, business_name), rep:users(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // 2. Push to Google Calendar
  // Fetch the rep's token — works for the rep themselves (own profile RLS)
  // and for admins (admin-read-all-users RLS).
  const { data: repProfile, error: profileError } = await supabase
    .from('users')
    .select('google_calendar_token')
    .eq('id', rep_id)
    .single()

  console.log('[appointments POST] rep_id:', rep_id,
    'profile found:', !!repProfile,
    'profileError:', profileError?.message ?? null,
    'token present:', !!repProfile?.google_calendar_token,
    'token type:', typeof repProfile?.google_calendar_token)

  if (repProfile?.google_calendar_token) {
    console.log('[appointments POST] calling createGCalEvent for appt', appt.id)
    const googleEventId = await createGCalEvent(repProfile.google_calendar_token, {
      title,
      startTime:   start_time,
      endTime:     end_time,
      description: notes ?? undefined,
    })
    console.log('[appointments POST] createGCalEvent returned:', googleEventId)

    if (googleEventId) {
      // 3. Back-fill the Google event ID so future syncs can match it
      const { error: updateErr, data: updateData } = await supabase
        .from('appointments')
        .update({ google_event_id: googleEventId })
        .eq('id', appt.id)
        .select('id, google_event_id')
        .single()

      console.log('[appointments POST] UPDATE google_event_id result:',
        'updateData:', JSON.stringify(updateData),
        'updateErr:', updateErr?.message ?? null,
        'updateErrDetails:', updateErr?.details ?? null,
        'updateErrHint:', updateErr?.hint ?? null)

      if (!updateErr) {
        appt.google_event_id = googleEventId
      }
    } else {
      console.warn('[appointments POST] GCal push returned null for appt', appt.id)
    }
  } else {
    console.log('[appointments POST] skipping GCal push — no token for rep', rep_id)
  }

  return NextResponse.json({ success: true, appointment: appt })
}

// ── DELETE — remove appointment ──────────────────────────────────────────────
// 1. Reads the appointment to get google_event_id and rep_id.
// 2. Deletes from Supabase (RLS ensures the caller owns or admins the row).
// 3. Deletes from Google Calendar if the row had a google_event_id.

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // Fetch before deleting so we have the GCal event ID and the rep reference
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, rep_id, google_event_id')
    .eq('id', id)
    .single()

  if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  // Delete from Supabase — RLS will reject if the caller has no access
  const { error } = await supabase.from('appointments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Delete from Google Calendar (best-effort — never blocks the response)
  if (appt.google_event_id) {
    const { data: repProfile } = await supabase
      .from('users')
      .select('google_calendar_token')
      .eq('id', appt.rep_id)
      .single()

    if (repProfile?.google_calendar_token) {
      await deleteGCalEvent(repProfile.google_calendar_token, appt.google_event_id)
    }
  }

  return NextResponse.json({ success: true })
}
