import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Verify the caller is an admin
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner' && profile?.role !== 'vp_operations') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, email, role } = await req.json()
  if (!name || !email || !role) {
    return NextResponse.json({ error: 'name, email, and role are required' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Invite creates the auth user immediately and sends the invite email
  const { data: authData, error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
  })
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insert the user profile row using the new auth user's ID
  const { data: newUser, error: dbError } = await admin
    .from('users')
    .insert({ id: authData.user.id, name, email, role, can_delete_leads: false })
    .select()
    .single()

  if (dbError) {
    // Best-effort cleanup: delete the auth user so the invite can be retried
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ user: newUser })
}
