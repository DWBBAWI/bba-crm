export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SettingsClient } from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'owner' || profile?.role === 'vp_operations'

  const { data: allUsers } = isAdmin
    ? await supabase.from('users').select('*').order('name')
    : { data: null }

  return (
    <SettingsClient
      profile={profile}
      allUsers={allUsers || []}
      isAdmin={isAdmin}
    />
  )
}
