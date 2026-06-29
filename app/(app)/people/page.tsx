export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PeopleClient } from '@/components/people/PeopleClient'

export default async function PeoplePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'owner' || profile?.role === 'vp_operations'

  const { data: people, error: peopleError } = await supabase
    .from('people')
    .select('*, businesses(*)')
    .order('name')

  if (peopleError) console.error('[PeoplePage] fetch error:', peopleError)

  return (
    <PeopleClient
      people={people || []}
      currentUserId={user!.id}
      isAdmin={isAdmin}
    />
  )
}
