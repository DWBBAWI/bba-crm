export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CalendarClient } from '@/components/calendar/CalendarClient'
import { syncGCalEvents } from '@/lib/gcal'

export default async function CalendarPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('role, name, google_calendar_token')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'owner' || profile?.role === 'vp_operations'

  // Sync Google Calendar events into the appointments table before querying.
  // Runs best-effort — a failure here never crashes the page.
  if (profile?.google_calendar_token) {
    try {
      await syncGCalEvents(user!.id, profile.google_calendar_token, supabase)
    } catch (err) {
      console.error('[gcal sync]', err)
    }
  }

  const apptQuery = supabase
    .from('appointments')
    .select('*, lead:leads(id, business_name, owner_name), rep:users(id, name)')
    .order('start_time', { ascending: true })

  if (!isAdmin) apptQuery.eq('rep_id', user!.id)
  const { data: appointments } = await apptQuery

  const { data: reps } = await supabase
    .from('users')
    .select('id, name, email')
    .order('name')

  return (
    <CalendarClient
      appointments={appointments || []}
      reps={reps || []}
      currentUser={{ id: user!.id, name: profile?.name || '' }}
      isAdmin={isAdmin}
      gcalConnected={!!profile?.google_calendar_token}
    />
  )
}
