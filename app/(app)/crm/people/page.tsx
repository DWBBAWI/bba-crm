export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PeopleAdminClient } from '@/components/people/PeopleAdminClient'

export default async function CRMPeoplePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'owner' || profile?.role === 'vp_operations'

  const [{ data: people }, { data: ownerLeads }] = await Promise.all([
    supabase
      .from('people')
      .select('*, businesses(id, business_name, industry, address, city, state, zip)')
      .order('name'),
    supabase
      .from('leads')
      .select('owner_id')
      .not('owner_id', 'is', null),
  ])

  const leadCountMap: Record<string, number> = {}
  for (const row of ownerLeads ?? []) {
    if (row.owner_id) leadCountMap[row.owner_id] = (leadCountMap[row.owner_id] || 0) + 1
  }

  const enriched = (people ?? []).map(p => ({
    ...p,
    leadCount: leadCountMap[p.id] || 0,
  }))

  return (
    <PeopleAdminClient
      people={enriched}
      isAdmin={isAdmin}
    />
  )
}
