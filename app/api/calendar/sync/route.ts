import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { syncGCalEvents } from '@/lib/gcal'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, google_calendar_token')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'owner' || profile?.role === 'vp_operations'

  if (profile?.google_calendar_token) {
    try {
      await syncGCalEvents(user.id, profile.google_calendar_token, supabase)
    } catch (err) {
      console.error('[calendar/sync]', err)
    }
  }

  const apptQuery = supabase
    .from('appointments')
    .select('*, lead:leads(id, business_name, owner_name), rep:users(id, name)')
    .order('start_time', { ascending: true })

  if (!isAdmin) apptQuery.eq('rep_id', user.id)
  const { data: appointments } = await apptQuery

  return NextResponse.json({
    appointments: appointments ?? [],
    syncedAt: new Date().toISOString(),
  })
}
